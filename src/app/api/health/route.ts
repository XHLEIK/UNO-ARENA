// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { getStorageMode } from '@/lib/server/room-store';

export async function GET() {
  const realtimeConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.SUPABASE_SERVICE_ROLE_KEY)
  );

  return NextResponse.json({
    status: 'ok',
    service: 'uno-arena',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    storage: getStorageMode(),
    realtime: realtimeConfigured ? 'supabase' : 'polling-only',
  });
}
