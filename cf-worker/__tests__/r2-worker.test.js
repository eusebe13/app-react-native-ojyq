const worker = require("../r2-worker").default;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECRET = "test-secret";
const PUBLIC_URL = "https://cdn.example.com";

function makeEnv({ totalBytes = 0, kvFiles = [] } = {}) {
  const kvStore = new Map();
  kvStore.set("total_bytes", String(totalBytes));
  kvFiles.forEach(({ key, value }) => kvStore.set(key, value));

  return {
    UPLOAD_SECRET: SECRET,
    PUBLIC_URL,
    R2_BUCKET: {
      put: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    },
    STORAGE_KV: {
      get: jest.fn((key) => Promise.resolve(kvStore.get(key) ?? null)),
      put: jest.fn((key, value) => { kvStore.set(key, value); return Promise.resolve(); }),
      delete: jest.fn((key) => { kvStore.delete(key); return Promise.resolve(); }),
      list: jest.fn(({ prefix = "", cursor, limit = 1000 } = {}) => {
        const keys = [...kvStore.keys()]
          .filter((k) => k.startsWith(prefix))
          .slice(0, limit)
          .map((name) => ({ name }));
        return Promise.resolve({ keys, list_complete: true });
      }),
    },
  };
}

function makeRequest(method, pathname, { headers = {}, body } = {}) {
  const url = `https://worker.example.com${pathname}`;
  const init = { method, headers: new Headers(headers) };
  if (body !== undefined) init.body = body;
  return new Request(url, init);
}

function authHeaders() {
  return { Authorization: `Bearer ${SECRET}` };
}

// ─── CORS preflight ───────────────────────────────────────────────────────────
describe("OPTIONS preflight", () => {
  it("returns 200 with CORS headers without auth", async () => {
    const req = makeRequest("OPTIONS", "/upload");
    const res = await worker.fetch(req, makeEnv());
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

// ─── Auth gate ────────────────────────────────────────────────────────────────
describe("Auth", () => {
  it("returns 401 when Authorization header is missing", async () => {
    const req = makeRequest("POST", "/upload");
    const res = await worker.fetch(req, makeEnv());
    expect(res.status).toBe(401);
  });

  it("returns 401 when token is wrong", async () => {
    const req = makeRequest("POST", "/upload", {
      headers: { Authorization: "Bearer wrong-token" },
    });
    const res = await worker.fetch(req, makeEnv());
    expect(res.status).toBe(401);
  });
});

// ─── Not found ────────────────────────────────────────────────────────────────
describe("Unknown routes", () => {
  it("returns 404 for unknown path", async () => {
    const req = makeRequest("GET", "/unknown", { headers: authHeaders() });
    const res = await worker.fetch(req, makeEnv());
    expect(res.status).toBe(404);
  });
});

// ─── GET /usage ───────────────────────────────────────────────────────────────
describe("GET /usage", () => {
  it("returns bytes, gb, percent, cap_gb", async () => {
    const env = makeEnv({ totalBytes: 1_000_000_000 }); // 1 GB
    const req = makeRequest("GET", "/usage", { headers: authHeaders() });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.bytes).toBe(1_000_000_000);
    expect(body.gb).toBeCloseTo(1);
    expect(body.cap_gb).toBeCloseTo(10.74, 1);
  });

  it("returns 0 bytes when KV is empty", async () => {
    const env = makeEnv({ totalBytes: 0 });
    // Override KV.get to return null for total_bytes
    env.STORAGE_KV.get = jest.fn().mockResolvedValue(null);
    const req = makeRequest("GET", "/usage", { headers: authHeaders() });
    const res = await worker.fetch(req, env);
    const body = await res.json();
    expect(body.bytes).toBe(0);
  });
});

// ─── POST /upload ─────────────────────────────────────────────────────────────
describe("POST /upload", () => {
  it("returns 400 when X-R2-Path header is missing", async () => {
    const req = makeRequest("POST", "/upload", {
      headers: authHeaders(),
      body: new ArrayBuffer(8),
    });
    const res = await worker.fetch(req, makeEnv());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/X-R2-Path/);
  });

  it("uploads file to R2, records in KV, returns url and usage", async () => {
    const env = makeEnv();
    const fileContent = new Uint8Array([1, 2, 3, 4]).buffer;
    const req = makeRequest("POST", "/upload", {
      headers: { ...authHeaders(), "X-R2-Path": "chats/abc.jpg", "Content-Type": "image/jpeg" },
      body: fileContent,
    });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe(`${PUBLIC_URL}/chats/abc.jpg`);
    expect(body.path).toBe("chats/abc.jpg");
    expect(body.size).toBe(4);
    expect(env.R2_BUCKET.put).toHaveBeenCalledWith(
      "chats/abc.jpg",
      expect.any(ArrayBuffer),
      expect.objectContaining({ httpMetadata: { contentType: "image/jpeg" } })
    );
  });

  it("triggers FIFO cleanup when usage is at 95% capacity", async () => {
    const HARD_CAP = 10 * 1024 * 1024 * 1024;
    const nearCapBytes = Math.floor(HARD_CAP * 0.95); // exactly at trigger
    const oldFileKey = `file_${"0".repeat(16)}_aaaaaa`; // oldest possible key
    const env = makeEnv({
      totalBytes: nearCapBytes,
      kvFiles: [{ key: oldFileKey, value: JSON.stringify({ path: "old/file.jpg", size: 500_000_000 }) }],
    });
    const req = makeRequest("POST", "/upload", {
      headers: { ...authHeaders(), "X-R2-Path": "new/file.jpg" },
      body: new Uint8Array([1]).buffer,
    });
    await worker.fetch(req, env);
    // Cleanup should have deleted the old file from R2
    expect(env.R2_BUCKET.delete).toHaveBeenCalledWith("old/file.jpg");
  });
});

// ─── DELETE /file ─────────────────────────────────────────────────────────────
describe("DELETE /file", () => {
  it("returns 400 when path query param is missing", async () => {
    const req = makeRequest("DELETE", "/file", { headers: authHeaders() });
    const res = await worker.fetch(req, makeEnv());
    expect(res.status).toBe(400);
  });

  it("deletes file from R2 and removes KV record", async () => {
    const kvKey = `file_${"1".repeat(16)}_bbbbbb`;
    const env = makeEnv({
      totalBytes: 100,
      kvFiles: [{ key: kvKey, value: JSON.stringify({ path: "chats/old.jpg", size: 100 }) }],
    });
    const req = makeRequest("DELETE", "/file?path=chats/old.jpg", { headers: authHeaders() });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(env.R2_BUCKET.delete).toHaveBeenCalledWith("chats/old.jpg");
  });

  it("returns 500 when R2 delete throws", async () => {
    const env = makeEnv();
    env.R2_BUCKET.delete = jest.fn().mockRejectedValue(new Error("R2 error"));
    const req = makeRequest("DELETE", "/file?path=chats/ghost.jpg", { headers: authHeaders() });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(500);
  });
});
