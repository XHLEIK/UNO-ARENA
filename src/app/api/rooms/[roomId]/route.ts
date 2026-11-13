// src/app/api/rooms/[roomId]/route.ts
import { NextResponse } from 'next/server';
import { getRoomDetails } from '@/lib/server/room-store';
import { errorStatus } from '@/lib/server/http';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get('playerId');
    const sessionToken = searchParams.get('sessionToken');

    const viewer =
      playerId && sessionToken ? { playerId, sessionToken } : undefined;
    const details = await getRoomDetails(roomId, viewer);
    return NextResponse.json(details, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Room not found' },
      { status: errorStatus(error?.message) }
    );
  }
}
