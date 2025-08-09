import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client configured for server-side usage.
 * Prefers the service role key (if available) to bypass RLS for trusted server routes.
 * Falls back to the anon key for local development when the service role key
 * is not configured.
 */
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
  }

  const apiKey = serviceRoleKey || anonKey;

  if (!apiKey) {
    throw new Error(
      "Missing SUPABASE keys. Configure SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return createSupabaseClient(supabaseUrl, apiKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}


