/**
 * Supabase Storage — direct REST API uploads.
 *
 * We intentionally bypass @supabase/supabase-js for storage operations because
 * the JS client uses an internal fetch adapter that fails in React Native with
 * "Network request failed". Direct fetch calls use RN's native networking layer
 * and work on both native and web without any polyfills.
 */

const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const CHAT_BUCKET = "chat";

// ─── Core uploader ────────────────────────────────────────────────────────────

async function uploadBlob(
  blob: Blob,
  path: string,
  contentType: string,
  bucket = CHAT_BUCKET,
): Promise<string> {
  const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": contentType,
      "x-upsert": "false",
    },
    body: blob,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => response.status.toString());
    throw new Error(`Supabase upload failed (${response.status}): ${body}`);
  }

  // Public URL is deterministic — no extra network call needed
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

// ─── Audio ────────────────────────────────────────────────────────────────────

/**
 * Upload an audio Blob (m4a on native, webm on web).
 */
export async function uploadAudio(
  blob: Blob,
  channelId: string,
  ext: "m4a" | "webm",
): Promise<string> {
  const contentType = ext === "m4a" ? "audio/mp4" : "audio/webm";
  const path = `voice/${channelId}/${Date.now()}.${ext}`;
  return uploadBlob(blob, path, contentType);
}

// ─── Images ───────────────────────────────────────────────────────────────────

/**
 * Upload from a base64 data-URI or plain base64 string.
 * Replaces raw base64 stored directly in Firestore (avoids 1 MB doc limit).
 */
export async function uploadImageBase64(
  base64OrDataUri: string,
  channelId: string,
): Promise<string> {
  const raw = base64OrDataUri.includes(",")
    ? base64OrDataUri.split(",")[1]!
    : base64OrDataUri;

  const byteChars = atob(raw);
  const byteArr = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteArr[i] = byteChars.charCodeAt(i);
  }
  const blob = new Blob([byteArr], { type: "image/jpeg" });
  const path = `images/${channelId}/${Date.now()}.jpg`;
  return uploadBlob(blob, path, "image/jpeg");
}

/**
 * Upload from a local file URI (native camera result).
 */
export async function uploadImageUri(uri: string, channelId: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const path = `images/${channelId}/${Date.now()}.jpg`;
  return uploadBlob(blob, path, "image/jpeg");
}

// ─── Documents ────────────────────────────────────────────────────────────────

/**
 * Upload a document from a local file URI.
 */
export async function uploadDocument(
  uri: string,
  fileName: string,
  channelId: string,
  mimeType = "application/octet-stream",
): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `files/${channelId}/${Date.now()}_${safe}`;
  return uploadBlob(blob, path, mimeType);
}
