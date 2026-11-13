// src/app/api/rooms/[roomId]/start/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { startGame } from '@/lib/server/room-store';
import { errorStatus } from '@/lib/server/http';

const StartSchema = z.object({
  playerId: z.string().uuid(),
  sessionToken: z.string().min(16),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const { playerId, sessionToken } = StartSchema.parse(await req.json());

    const publicGameState = await startGame(roomId, playerId, sessionToken);
    return NextResponse.json(
      { success: true, gameState: publicGameState },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to start game' },
      { status: errorStatus(error?.message) }
    );
  }
}
