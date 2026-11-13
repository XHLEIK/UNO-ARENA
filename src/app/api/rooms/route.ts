// src/app/api/rooms/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createRoom } from '@/lib/server/room-store';
import { errorStatus } from '@/lib/server/http';

const CreateRoomSchema = z.object({
  nickname: z.string().min(1).max(32),
  maxPlayers: z.number().int().min(2).max(10).optional(),
  scoringMode: z.enum(['SINGLE_ROUND', 'CUMULATIVE']).optional(),
  targetScore: z.number().int().min(100).max(2000).optional(),
  botCount: z.number().int().min(0).max(9).optional(),
  botDifficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  botPersonality: z
    .enum(['STRATEGIST', 'AGGRESSOR', 'DEFENSIVE', 'UNPREDICTABLE', 'BALANCED'])
    .optional(),
  rules: z
    .object({
      stackingEnabled: z.boolean().optional(),
      turnTimerSeconds: z.number().int().min(10).max(120).optional(),
      botGracePeriodSeconds: z.number().int().min(10).max(120).optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  try {
    const parsed = CreateRoomSchema.parse(await req.json());
    const result = await createRoom(parsed);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create room' },
      { status: errorStatus(error?.message) }
    );
  }
}
