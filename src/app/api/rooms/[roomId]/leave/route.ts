// src/app/api/rooms/[roomId]/leave/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { leaveRoom } from '@/lib/server/room-store';
import { errorStatus } from '@/lib/server/http';

const LeaveSchema = z.object({
  playerId: z.string().uuid(),
  sessionToken: z.string().min(16),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const { playerId, sessionToken } = LeaveSchema.parse(await req.json());

    await leaveRoom(roomId, playerId, sessionToken);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to leave room' },
      { status: errorStatus(error?.message) }
    );
  }
}
