import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only Supabase client using the SECRET key (bypasses RLS).
// Import this only from server code (route handlers, server components, server actions) —
// the key has no NEXT_PUBLIC_ prefix, so it is never sent to the browser.
let client: SupabaseClient | undefined;

export function supabaseServer(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in the project-root .env");
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
