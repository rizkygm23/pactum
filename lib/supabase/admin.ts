import { createClient } from "@supabase/supabase-js";

/**
 * Supabase admin client using SERVICE_ROLE_KEY.
 * Bypasses RLS — use ONLY in server-side API routes for operations
 * that need cross-user access (e.g., API key lookup by hash, usage inserts).
 *
 * NEVER expose this client or the SERVICE_ROLE_KEY to the browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
