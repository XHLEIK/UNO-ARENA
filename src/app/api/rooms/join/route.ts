// src/app/api/rooms/join/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { joinRoom } from '@/lib/server/room-store';
import { errorStatus } from '@/lib/server/http';

const JoinRoomSchema = z.object({
  roomCode: z.string().min(4).max(8),
  nickname: z.string().min(1).max(32),
});

export async function POST(req: Request) {
  try {
    const parsed = JoinRoomSchema.parse(await req.json());
    const result = await joinRoom(parsed);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to join room' },
      { status: errorStatus(error?.message) }
    );
  }
}
