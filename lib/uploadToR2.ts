/**
 * Cloudflare R2 — file uploads via the OJYQ R2 Worker.
 *
 * Sends raw ArrayBuffer as the request body (no FormData) to avoid the
 * React Native Blob/FormData serialization bug. The R2 object path is
 * passed via the X-R2-Path header.
 *
 * On native, local file URIs are read via expo-file-system (base64 → buffer).
 * On web, fetch(uri).arrayBuffer() is used directly.
 */

import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

const WORKER_URL    = (process.env.EXPO_PUBLIC_R2_WORKER_URL ?? "").replace(/\/$/, "");
const UPLOAD_SECRET = process.env.EXPO_PUBLIC_R2_UPLOAD_SECRET ?? "";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/**
 * Read a local URI as an ArrayBuffer.
 * Native uses expo-file-system (no RN fetch+blob issues).
 * Web uses fetch().arrayBuffer() (standard, works fine in browsers).
 */
async function readUriAsBuffer(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === "web") {
    const r = await fetch(uri);
    return r.arrayBuffer();
  }
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64ToArrayBuffer(base64);
}

// ─── Core uploader ────────────────────────────────────────────────────────────

async function uploadBuffer(
  buffer: ArrayBuffer,
  path: string,
  contentType: string,
): Promise<string> {
  const response = await fetch(`${WORKER_URL}/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPLOAD_SECRET}`,
      "Content-Type": contentType,
      "X-R2-Path": path,
    },
    body: buffer,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => response.status.toString());
    throw new Error(`R2 upload failed (${response.status}): ${body}`);
  }

  const { url } = await response.json();
  return url as string;
}

// ─── Delete (called when a message is deleted) ────────────────────────────────

export async function deleteFromR2(path: string): Promise<void> {
  const response = await fetch(
    `${WORKER_URL}/file?path=${encodeURIComponent(path)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${UPLOAD_SECRET}` },
    },
  );
  if (!response.ok) {
    const body = await response.text().catch(() => response.status.toString());
    throw new Error(`R2 delete failed (${response.status}): ${body}`);
  }
}

// ─── Audio ────────────────────────────────────────────────────────────────────

/**
 * Upload audio from a local URI (native recording via expo-audio).
 * Avoids the fetch(uri).blob() → FormData path that breaks in React Native.
 */
export async function uploadAudioUri(
  uri: string,
  channelId: string,
  ext: "m4a" | "webm",
): Promise<string> {
  const buffer = await readUriAsBuffer(uri);
  const contentType = ext === "m4a" ? "audio/mp4" : "audio/webm";
  return uploadBuffer(buffer, `voice/${channelId}/${Date.now()}.${ext}`, contentType);
}

/**
 * Upload audio from a Blob (web MediaRecorder output).
 */
export async function uploadAudio(
  blob: Blob,
  channelId: string,
  ext: "m4a" | "webm",
): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const contentType = ext === "m4a" ? "audio/mp4" : "audio/webm";
  return uploadBuffer(buffer, `voice/${channelId}/${Date.now()}.${ext}`, contentType);
}

// ─── Images ───────────────────────────────────────────────────────────────────

/** Upload from a base64 data-URI or plain base64 string. */
export async function uploadImageBase64(
  base64OrDataUri: string,
  channelId: string,
): Promise<string> {
  const raw = base64OrDataUri.includes(",")
    ? base64OrDataUri.split(",")[1]!
    : base64OrDataUri;
  const buffer = base64ToArrayBuffer(raw);
  return uploadBuffer(buffer, `images/${channelId}/${Date.now()}.jpg`, "image/jpeg");
}

/** Upload from a local file URI (native camera / image picker result). */
export async function uploadImageUri(uri: string, channelId: string): Promise<string> {
  const buffer = await readUriAsBuffer(uri);
  return uploadBuffer(buffer, `images/${channelId}/${Date.now()}.jpg`, "image/jpeg");
}

// ─── Videos ───────────────────────────────────────────────────────────────────

/**
 * Upload video by streaming directly from disk via FileSystem.uploadAsync.
 * Unlike readUriAsBuffer, this never loads the file into memory, so it works
 * for large files (100MB+) without crashing.
 */
export async function uploadVideoUri(uri: string, channelId: string): Promise<string> {
  if (Platform.OS === "web") {
    const buffer = await (await fetch(uri)).arrayBuffer();
    return uploadBuffer(buffer, `videos/${channelId}/${Date.now()}.mp4`, "video/mp4");
  }
  const path = `videos/${channelId}/${Date.now()}.mp4`;
  const result = await FileSystem.uploadAsync(`${WORKER_URL}/upload`, uri, {
    httpMethod: "POST",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      Authorization: `Bearer ${UPLOAD_SECRET}`,
      "Content-Type": "video/mp4",
      "X-R2-Path": path,
    },
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`R2 upload failed (${result.status}): ${result.body}`);
  }
  const { url } = JSON.parse(result.body);
  return url as string;
}

// ─── Documents ────────────────────────────────────────────────────────────────

export async function uploadDocument(
  uri: string,
  fileName: string,
  channelId: string,
  mimeType = "application/octet-stream",
): Promise<string> {
  const buffer = await readUriAsBuffer(uri);
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return uploadBuffer(buffer, `files/${channelId}/${Date.now()}_${safe}`, mimeType);
}

// ─── Usage (for admin dashboard) ─────────────────────────────────────────────

export async function getStorageUsage(): Promise<{
  bytes: number;
  gb: number;
  percent: number;
  cap_gb: number;
}> {
  const response = await fetch(`${WORKER_URL}/usage`, {
    headers: { Authorization: `Bearer ${UPLOAD_SECRET}` },
  });
  if (!response.ok) throw new Error("Failed to fetch storage usage");
  return response.json();
}
