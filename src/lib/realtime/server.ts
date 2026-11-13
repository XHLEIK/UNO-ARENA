// src/lib/realtime/server.ts
// Best-effort fan-out to Supabase Realtime. Clients also poll, so a failed
// broadcast only delays an update instead of losing it.

export async function broadcastRoomUpdated(roomId: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) return;

  try {
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        messages: [
          {
            topic: `uno:room:${roomId}`,
            event: 'room-updated',
            payload: { roomId },
          },
        ],
      }),
      cache: 'no-store',
    });
  } catch {
    // Realtime is an optimization; polling remains the fallback.
  }
}
