/**
 * Cloudflare Worker — R2 upload proxy with server-side storage monitoring.
 *
 * All storage tracking and FIFO cleanup happen here, with direct R2 access.
 * The client just POSTs a file and gets a URL back.
 *
 * ── Required bindings (wrangler.toml) ──────────────────────────────────────
 *   [[r2_buckets]]
 *   binding  = "R2_BUCKET"
 *   bucket_name = "ojyq-chat"
 *
 *   [[kv_namespaces]]
 *   binding    = "STORAGE_KV"
 *   id         = "<your-kv-namespace-id>"
 *
 *   [vars]
 *   PUBLIC_URL = "https://pub-XXXXXXXX.r2.dev"   # R2 public bucket URL
 *
 *   # Set secrets via CLI — never commit values:
 *   #   wrangler secret put UPLOAD_SECRET
 *
 * ── KV schema ───────────────────────────────────────────────────────────────
 *   "total_bytes"               → number (total bytes stored in R2)
 *   "file_<ms>_<rand>"         → JSON { path, size }   (one entry per file)
 *
 *   Keys are prefixed with "file_" and a zero-padded 16-digit timestamp so
 *   alphabetical KV listing == chronological order (FIFO).
 *
 * ── Routes ──────────────────────────────────────────────────────────────────
 *   POST   /upload        FormData(file, path) → { url, path, size, usage }
 *   DELETE /file?path=… → { ok }
 *   GET    /usage         → { bytes, gb, percent }
 */

// ─── Config ──────────────────────────────────────────────────────────────────

const HARD_CAP_BYTES     = 10 * 1024 * 1024 * 1024; // 10 GB
const CLEANUP_TRIGGER    = 0.95;                     // start cleanup at 95 %
const CLEANUP_TARGET     = 0.80;                     // clean down to 80 %
const TRIGGER_BYTES      = HARD_CAP_BYTES * CLEANUP_TRIGGER;
const TARGET_BYTES       = HARD_CAP_BYTES * CLEANUP_TARGET;

const FILE_KEY_PREFIX    = "file_";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-R2-Path",
};

// ─── KV helpers ───────────────────────────────────────────────────────────────

/** Generate a time-sortable KV key for a file entry. */
function makeFileKey() {
  const ts = Date.now().toString().padStart(16, "0");
  const rand = Math.random().toString(36).slice(2, 8);
  return `${FILE_KEY_PREFIX}${ts}_${rand}`;
}

async function getTotalBytes(kv) {
  const val = await kv.get("total_bytes");
  return val ? Number(val) : 0;
}

async function setTotalBytes(kv, bytes) {
  await kv.put("total_bytes", String(Math.max(0, bytes)));
}

async function recordFile(kv, path, size) {
  const key = makeFileKey();
  await kv.put(key, JSON.stringify({ path, size }));
  const current = await getTotalBytes(kv);
  await setTotalBytes(kv, current + size);
}

async function deleteFileRecord(kv, kvKey, size) {
  await kv.delete(kvKey);
  const current = await getTotalBytes(kv);
  await setTotalBytes(kv, current - size);
}

/** Find the KV key for a given R2 path (needed for manual deletions). */
async function findKvKeyForPath(kv, path) {
  let cursor;
  do {
    const result = await kv.list({ prefix: FILE_KEY_PREFIX, cursor, limit: 1000 });
    for (const { name } of result.keys) {
      const raw = await kv.get(name);
      if (raw) {
        const rec = JSON.parse(raw);
        if (rec.path === path) return { key: name, size: rec.size };
      }
    }
    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor);
  return null;
}

// ─── FIFO cleanup ─────────────────────────────────────────────────────────────

/**
 * Delete the oldest R2 files until total bytes drop below TARGET_BYTES.
 * Runs entirely server-side with direct R2 + KV access.
 */
async function runFifoCleanup(r2, kv, currentTotal) {
  console.log(`[r2-worker] FIFO cleanup — usage: ${(currentTotal / 1e9).toFixed(2)} GB`);

  let remaining = currentTotal;
  let cursor;

  outer: do {
    const listed = await kv.list({ prefix: FILE_KEY_PREFIX, cursor, limit: 100 });

    for (const { name } of listed.keys) {
      if (remaining <= TARGET_BYTES) break outer;

      const raw = await kv.get(name);
      if (!raw) continue;

      const { path, size } = JSON.parse(raw);

      try {
        await r2.delete(path);
      } catch (err) {
        // Object may already be gone — still clean up KV record
        console.warn(`[r2-worker] R2 delete failed for ${path}:`, err);
      }

      await deleteFileRecord(kv, name, size);
      remaining -= size;

      console.log(
        `[r2-worker] Deleted ${path} (${(size / 1e6).toFixed(1)} MB) — ${(remaining / 1e9).toFixed(2)} GB remaining`,
      );
    }

    cursor = listed.list_complete ? undefined : listed.cursor;
  } while (cursor && remaining > TARGET_BYTES);

  console.log(`[r2-worker] Cleanup done — ${(remaining / 1e9).toFixed(2)} GB`);
}

// ─── Request handlers ─────────────────────────────────────────────────────────

async function handleUpload(request, env) {
  const path = request.headers.get("X-R2-Path");
  const contentType = request.headers.get("Content-Type") || "application/octet-stream";

  if (!path) {
    return Response.json({ error: "Missing X-R2-Path header" }, { status: 400, headers: CORS });
  }

  const arrayBuffer = await request.arrayBuffer();
  const size = arrayBuffer.byteLength;

  // 1. Check storage — run cleanup if at 95 %
  const currentTotal = await getTotalBytes(env.STORAGE_KV);
  if (currentTotal + size >= TRIGGER_BYTES) {
    await runFifoCleanup(env.R2_BUCKET, env.STORAGE_KV, currentTotal);
  }

  // 2. Upload to R2
  await env.R2_BUCKET.put(path, arrayBuffer, {
    httpMetadata: { contentType },
  });

  // 3. Record in KV
  await recordFile(env.STORAGE_KV, path, size);

  const newTotal = await getTotalBytes(env.STORAGE_KV);
  const url = `${env.PUBLIC_URL}/${path}`;

  return Response.json(
    {
      url,
      path,
      size,
      usage: {
        bytes: newTotal,
        gb: newTotal / 1e9,
        percent: (newTotal / HARD_CAP_BYTES) * 100,
      },
    },
    { headers: CORS },
  );
}

async function handleDelete(request, env) {
  const path = new URL(request.url).searchParams.get("path");
  if (!path) {
    return Response.json({ error: "Missing path" }, { status: 400, headers: CORS });
  }

  // Delete from R2
  try {
    await env.R2_BUCKET.delete(path);
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500, headers: CORS });
  }

  // Remove KV record and adjust total
  const found = await findKvKeyForPath(env.STORAGE_KV, path);
  if (found) {
    await deleteFileRecord(env.STORAGE_KV, found.key, found.size);
  }

  return Response.json({ ok: true }, { headers: CORS });
}

async function handleUsage(env) {
  const bytes = await getTotalBytes(env.STORAGE_KV);
  return Response.json(
    {
      bytes,
      gb: bytes / 1e9,
      percent: (bytes / HARD_CAP_BYTES) * 100,
      cap_gb: HARD_CAP_BYTES / 1e9,
    },
    { headers: CORS },
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    // Auth
    const auth = request.headers.get("Authorization") ?? "";
    if (auth !== `Bearer ${env.UPLOAD_SECRET}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
    }

    const { pathname } = new URL(request.url);

    if (request.method === "POST"   && pathname === "/upload") return handleUpload(request, env);
    if (request.method === "DELETE" && pathname === "/file")   return handleDelete(request, env);
    if (request.method === "GET"    && pathname === "/usage")  return handleUsage(env);

    return new Response("Not found", { status: 404, headers: CORS });
  },
};
