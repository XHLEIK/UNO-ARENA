// src/app/api/rooms/[roomId]/actions/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { executeCommand } from '@/lib/server/room-store';
import { errorStatus } from '@/lib/server/http';
import { GameCommand } from '@/types';

const ActionSchema = z.object({
  commandId: z.string().uuid(),
  playerId: z.string().uuid(),
  sessionToken: z.string().min(16),
  expectedVersion: z.number().int().nonnegative(),
  type: z.enum([
    'PLAY_CARD',
    'DRAW_CARD',
    'PASS_TURN',
    'CALL_UNO',
    'CATCH_MISSED_UNO',
    'SELECT_COLOR',
    'CHALLENGE_WILD_DRAW_FOUR',
    'ACCEPT_WILD_DRAW_FOUR',
  ]),
  payload: z.record(z.string(), z.any()),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const body = ActionSchema.parse(await req.json());
    const command = body as unknown as GameCommand;

    const result = await executeCommand(
      roomId,
      command.playerId,
      body.sessionToken,
      command
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Action failed' },
      { status: errorStatus(error?.message) }
    );
  }
}
