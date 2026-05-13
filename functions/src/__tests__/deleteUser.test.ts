// ─── Mock setup (hoisted before imports) ────────────────────────────────────

jest.mock("firebase-functions", () => ({
  https: {
    onCall: jest.fn((handler: Function) => handler),
    HttpsError: class HttpsError extends Error {
      code: string;
      constructor(code: string, message: string) {
        super(message);
        this.code = code;
        this.name = "HttpsError";
      }
    },
  },
}));

const mockGet = jest.fn();
const mockDelete = jest.fn().mockResolvedValue(undefined);
const mockDeleteUser = jest.fn().mockResolvedValue(undefined);

const mockDocRef = jest.fn().mockReturnValue({
  get: mockGet,
  delete: mockDelete,
});

const mockCollectionRef = jest.fn().mockReturnValue({
  doc: mockDocRef,
});

jest.mock("firebase-admin", () => ({
  firestore: jest.fn(() => ({ collection: mockCollectionRef })),
  auth: jest.fn(() => ({ deleteUser: mockDeleteUser })),
  initializeApp: jest.fn(),
}));

// ─── Imports (after mocks) ───────────────────────────────────────────────────
import { deleteUser } from "../deleteUser";
import * as functions from "firebase-functions";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const { HttpsError } = (functions as any).https;

function makeContext(uid?: string) {
  return uid ? { auth: { uid } } : { auth: null };
}

// ─── deleteUser ──────────────────────────────────────────────────────────────
describe("deleteUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDelete.mockResolvedValue(undefined);
    mockDeleteUser.mockResolvedValue(undefined);
  });

  it("throws unauthenticated when no auth context", async () => {
    await expect((deleteUser as any)({}, makeContext())).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("throws permission-denied when caller doc does not exist", async () => {
    mockGet.mockResolvedValueOnce({ exists: false, data: () => ({}) });
    await expect(
      (deleteUser as any)({ uid: "target-uid" }, makeContext("caller-uid"))
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("throws permission-denied when caller role is not authorized", async () => {
    mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ role: "Membre" }) });
    await expect(
      (deleteUser as any)({ uid: "target-uid" }, makeContext("caller-uid"))
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("throws permission-denied when caller role is undefined", async () => {
    mockGet.mockResolvedValueOnce({ exists: true, data: () => ({}) });
    await expect(
      (deleteUser as any)({ uid: "target-uid" }, makeContext("caller-uid"))
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("throws invalid-argument when uid is missing", async () => {
    mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ role: "Président" }) });
    await expect(
      (deleteUser as any)({}, makeContext("caller-uid"))
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("throws invalid-argument when uid is not a string", async () => {
    mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ role: "Président" }) });
    await expect(
      (deleteUser as any)({ uid: 123 }, makeContext("caller-uid"))
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("throws permission-denied when target is Administrateur", async () => {
    mockGet
      .mockResolvedValueOnce({ exists: true, data: () => ({ role: "Président" }) })
      .mockResolvedValueOnce({ exists: true, data: () => ({ role: "Administrateur" }) });
    await expect(
      (deleteUser as any)({ uid: "target-uid" }, makeContext("caller-uid"))
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("deletes user from Auth and Firestore and returns success (Président)", async () => {
    mockGet
      .mockResolvedValueOnce({ exists: true, data: () => ({ role: "Président" }) })
      .mockResolvedValueOnce({ exists: true, data: () => ({ role: "Membre" }) });
    const result = await (deleteUser as any)({ uid: "target-uid" }, makeContext("caller-uid"));
    expect(mockDeleteUser).toHaveBeenCalledWith("target-uid");
    expect(mockDelete).toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it("deletes user when caller is Administrateur", async () => {
    mockGet
      .mockResolvedValueOnce({ exists: true, data: () => ({ role: "Administrateur" }) })
      .mockResolvedValueOnce({ exists: true, data: () => ({ role: "Membre" }) });
    const result = await (deleteUser as any)({ uid: "target-uid" }, makeContext("caller-uid"));
    expect(result).toEqual({ success: true });
  });

  it("deletes user when caller is Vice-Président", async () => {
    mockGet
      .mockResolvedValueOnce({ exists: true, data: () => ({ role: "Vice-Président" }) })
      .mockResolvedValueOnce({ exists: true, data: () => ({ role: "Membre" }) });
    const result = await (deleteUser as any)({ uid: "target-uid" }, makeContext("caller-uid"));
    expect(result).toEqual({ success: true });
  });
});
