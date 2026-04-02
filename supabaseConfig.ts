/**
 * Supabase config — kept minimal.
 * Storage operations use direct REST fetch (see lib/uploadToSupabase.ts)
 * so the JS client is not needed for uploads.
 */
export const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const CHAT_BUCKET = "chat";
