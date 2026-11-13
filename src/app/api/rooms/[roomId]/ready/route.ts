// src/app/api/rooms/[roomId]/ready/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { togglePlayerReady } from '@/lib/server/room-store';
import { errorStatus } from '@/lib/server/http';

const ReadySchema = z.object({
  playerId: z.string().uuid(),
  sessionToken: z.string().min(16),
  isReady: z.boolean(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const { playerId, sessionToken, isReady } = ReadySchema.parse(await req.json());

    await togglePlayerReady(roomId, playerId, sessionToken, isReady);
    return NextResponse.json({ success: true, isReady }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update ready status' },
      { status: errorStatus(error?.message) }
    );
  }
}
