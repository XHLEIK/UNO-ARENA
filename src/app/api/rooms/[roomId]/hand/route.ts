// src/app/api/rooms/[roomId]/hand/route.ts
import { NextResponse } from 'next/server';
import { getPlayerHand } from '@/lib/server/room-store';
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

    if (!playerId || !sessionToken) {
      return NextResponse.json(
        { error: 'Missing playerId or sessionToken query parameter' },
        { status: 400 }
      );
    }

    const hand = await getPlayerHand(roomId, playerId, sessionToken);
    return NextResponse.json(hand, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch player hand' },
      { status: errorStatus(error?.message) }
    );
  }
}
