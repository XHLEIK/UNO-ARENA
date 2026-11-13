// src/lib/realtime/client.ts
'use client';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/**
 * Subscribes to a room's broadcast channel. Returns an unsubscribe function.
 * Falls back to a no-op when Supabase env vars are not configured.
 */
export function subscribeToRoom(roomId: string, onUpdate: () => void): () => void {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return () => {};

  client ??= createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const channel = client
    .channel(`uno:room:${roomId}`)
    .on('broadcast', { event: 'room-updated' }, () => onUpdate())
    .subscribe();

  return () => {
    void client?.removeChannel(channel);
  };
}
