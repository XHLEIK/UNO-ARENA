// src/app/api/maintenance/cleanup/route.ts
import { NextResponse } from 'next/server';
import { cleanupExpiredRooms } from '@/lib/server/room-store';

/**
 * Intended for an external scheduler. Active IN_GAME rooms are never deleted.
 * Require a secret so an unauthenticated request cannot churn room history.
 */
export async function POST(req: Request) {
  const secret = process.env.CLEANUP_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'Cleanup is not configured (CLEANUP_SECRET missing)' },
      { status: 503 }
    );
  }
  if (req.headers.get('x-cleanup-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const limit = Number(new URL(req.url).searchParams.get('limit') ?? 50);
    const result = await cleanupExpiredRooms(
      Number.isFinite(limit) ? Math.min(Math.max(Math.floor(limit), 1), 200) : 50
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Cleanup failed' },
      { status: 500 }
    );
  }
}
