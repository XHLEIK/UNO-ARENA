// src/app/api/rooms/[roomId]/reconnect/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { reconnectPlayer } from '@/lib/server/room-store';
import { errorStatus } from '@/lib/server/http';

const ReconnectSchema = z.object({
  reconnectToken: z.string().min(16),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const { reconnectToken } = ReconnectSchema.parse(await req.json());

    const result = await reconnectPlayer(roomId, reconnectToken);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Reconnection failed' },
      { status: errorStatus(error?.message) }
    );
  }
}
