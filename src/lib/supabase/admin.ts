// src/lib/supabase/admin.ts
// Server-only Supabase client using the service-role key. Never import from a client component.
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cached: { key: string; client: SupabaseClient } | null = null;

export function supabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) return null;
  if (!cached || cached.key !== key) {
    cached = {
      key,
      client: createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      }),
    };
  }
  return cached.client;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(supabaseAdmin());
}
