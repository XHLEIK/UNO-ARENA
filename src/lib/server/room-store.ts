// src/lib/server/room-store.ts
//
// Durable, server-authoritative room store.
// One JSONB snapshot per room in Supabase, guarded by optimistic concurrency
// (`store_version`). Falls back to a process-wide in-memory map when Supabase
// is not configured so local development still works.
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { broadcastRoomUpdated } from '@/lib/realtime/server';
import {
  createInitialGame,
  executePlayCard,
  executeDrawCard,
  executePassTurn,
  executeCallUno,
  executeCatchMissedUno,
  executeSelectColor,
  executeChallengeWildDrawFour,
  executeAcceptWildDrawFour,
  getPublicGameState,
  getPrivatePlayerState,
} from '@/lib/game-engine/engine';
import {
  DEFAULT_BOT_PROFILE,
  applyBotDecisionToState,
  getBotCatchTarget,
  getBotDecision,
} from '@/lib/game-engine/bot';
import {
  AuthoritativeGameState,
  AuthoritativePlayer,
  BotDifficulty,
  BotPersonality,
  BotProfile,
  RoomRulesConfig,
  ScoringMode,
  PublicGameState,
  PrivatePlayerState,
  GameCommand,
} from '@/types';

export interface RoomPlayerRecord {
  id: string;
  nickname: string;
  seatNumber: number;
  isReady: boolean;
  isConnected: boolean;
  isHost: boolean;
  isBot: boolean;
  botProfile?: BotProfile;
  sessionToken: string;
  reconnectTokenHash: string;
  lastSeenAt: number;
}

export interface RoomRecord {
  id: string;
  roomCode: string;
  hostPlayerId: string;
  status: 'LOBBY' | 'IN_GAME' | 'FINISHED';
  maxPlayers: number;
  rules: RoomRulesConfig;
  scoringMode: ScoringMode;
  targetScore: number;
  players: RoomPlayerRecord[];
  gameState?: AuthoritativeGameState;
  commandReceipts: Map<string, { resultingVersion: number; result: unknown }>;
  createdAt: number;
  expiresAt: number;
}

interface StoredRoomJson extends Omit<RoomRecord, 'commandReceipts'> {
  commandReceipts: [string, { resultingVersion: number; result: unknown }][];
}

interface LoadedRoom {
  room: RoomRecord;
  storeVersion: number;
}

export interface RoomDetails {
  room: {
    id: string;
    roomCode: string;
    status: string;
    maxPlayers: number;
    hostPlayerId: string;
    rules: RoomRulesConfig;
    scoringMode: ScoringMode;
  };
  players: Omit<RoomPlayerRecord, 'sessionToken' | 'reconnectTokenHash' | 'lastSeenAt'>[];
  gameState?: PublicGameState;
}

class RoomCodeTakenError extends Error {}

// Shared across route bundles inside one process. Supabase is the real source
// of truth when configured; this keeps `next dev` usable without env vars.
const globalForRooms = globalThis as typeof globalThis & {
  __unoArenaRooms?: Map<string, LoadedRoom>;
};
const memoryRooms =
  globalForRooms.__unoArenaRooms ?? (globalForRooms.__unoArenaRooms = new Map());

const ROOM_TTL_MS = 24 * 60 * 60 * 1000;
const COMPLETED_RETENTION_MS = 15 * 60 * 1000;
const MAX_RECEIPTS = 200;

export function getStorageMode(): 'postgres' | 'memory' {
  return supabaseAdmin() ? 'postgres' : 'memory';
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function encodeRoom(room: RoomRecord): StoredRoomJson {
  const { commandReceipts, ...rest } = room;
  return {
    ...rest,
    commandReceipts: Array.from(commandReceipts.entries()),
  };
}

function decodeRoom(json: StoredRoomJson): RoomRecord {
  return {
    ...json,
    commandReceipts: new Map(json.commandReceipts ?? []),
  };
}

function cloneRoom(room: RoomRecord): RoomRecord {
  return decodeRoom(encodeRoom(room));
}

function isExpired(expiresAt: string | number): boolean {
  return new Date(expiresAt).getTime() < Date.now();
}

async function loadRoomById(roomId: string): Promise<LoadedRoom | null> {
  const db = supabaseAdmin();

  if (!db) {
    const entry = memoryRooms.get(roomId);
    if (!entry) return null;
    if (entry.room.expiresAt < Date.now()) {
      memoryRooms.delete(roomId);
      return null;
    }
    return { room: cloneRoom(entry.room), storeVersion: entry.storeVersion };
  }

  const { data, error } = await db
    .from('rooms')
    .select('record, store_version, expires_at')
    .eq('id', roomId)
    .maybeSingle();

  if (error) throw new Error(`Room store unavailable: ${error.message}`);
  if (!data) return null;

  const row = data as unknown as {
    record: StoredRoomJson;
    store_version: number;
    expires_at: string;
  };

  if (isExpired(row.expires_at)) {
    await db.from('rooms').delete().eq('id', roomId);
    return null;
  }

  return { room: decodeRoom(row.record), storeVersion: Number(row.store_version) };
}

async function loadRoomByCode(roomCode: string): Promise<LoadedRoom | null> {
  const code = roomCode.toUpperCase().trim();
  const db = supabaseAdmin();

  if (!db) {
    for (const entry of memoryRooms.values()) {
      if (entry.room.roomCode === code) {
        if (entry.room.expiresAt < Date.now()) {
          memoryRooms.delete(entry.room.id);
          return null;
        }
        return { room: cloneRoom(entry.room), storeVersion: entry.storeVersion };
      }
    }
    return null;
  }

  const { data, error } = await db
    .from('rooms')
    .select('record, store_version, expires_at')
    .eq('room_code', code)
    .maybeSingle();

  if (error) throw new Error(`Room store unavailable: ${error.message}`);
  if (!data) return null;

  const row = data as unknown as {
    record: StoredRoomJson;
    store_version: number;
    expires_at: string;
  };

  if (isExpired(row.expires_at)) {
    await db.from('rooms').delete().eq('room_code', code);
    return null;
  }

  return { room: decodeRoom(row.record), storeVersion: Number(row.store_version) };
}

async function insertRoom(room: RoomRecord): Promise<void> {
  const db = supabaseAdmin();

  if (!db) {
    for (const entry of memoryRooms.values()) {
      if (entry.room.roomCode === room.roomCode) throw new RoomCodeTakenError();
    }
    memoryRooms.set(room.id, { room: cloneRoom(room), storeVersion: 1 });
    return;
  }

  const { error } = await db.from('rooms').insert({
    id: room.id,
    room_code: room.roomCode,
    status: room.status,
    store_version: 1,
    record: encodeRoom(room),
    expires_at: new Date(room.expiresAt).toISOString(),
  });

  if (error) {
    if (error.code === '23505') throw new RoomCodeTakenError();
    throw new Error(`Room store unavailable: ${error.message}`);
  }
}

async function saveRoom(room: RoomRecord, expectedVersion: number): Promise<boolean> {
  const db = supabaseAdmin();

  if (!db) {
    const current = memoryRooms.get(room.id);
    if (!current || current.storeVersion !== expectedVersion) return false;
    memoryRooms.set(room.id, {
      room: cloneRoom(room),
      storeVersion: expectedVersion + 1,
    });
    return true;
  }

  const { data, error } = await db
    .from('rooms')
    .update({
      status: room.status,
      store_version: expectedVersion + 1,
      record: encodeRoom(room),
      expires_at: new Date(room.expiresAt).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', room.id)
    .eq('store_version', expectedVersion)
    .select('id');

  if (error) throw new Error(`Room store unavailable: ${error.message}`);
  return Boolean(data && data.length > 0);
}

async function mutateRoom<T>(
  roomId: string,
  fn: (room: RoomRecord) => { result: T; changed: boolean }
): Promise<{ result: T; room: RoomRecord; changed: boolean }> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const loaded = await loadRoomById(roomId);
    if (!loaded) throw new Error('Room not found');

    const outcome = fn(loaded.room);
    if (!outcome.changed) {
      return { result: outcome.result, room: loaded.room, changed: false };
    }
    if (await saveRoom(loaded.room, loaded.storeVersion)) {
      return { result: outcome.result, room: loaded.room, changed: true };
    }
  }
  throw new Error('Room is busy; please retry');
}

function authenticate(
  room: RoomRecord,
  playerId: string,
  sessionToken: string
): RoomPlayerRecord {
  const player = room.players.find((p) => p.id === playerId);
  if (!player || !sessionToken || player.sessionToken !== sessionToken) {
    throw new Error('Unauthorized: invalid session token');
  }
  return player;
}

function syncConnectivity(room: RoomRecord): void {
  if (!room.gameState) return;
  for (const gamePlayer of room.gameState.players) {
    const roomPlayer = room.players.find((p) => p.id === gamePlayer.id);
    if (roomPlayer) {
      gamePlayer.isConnected = roomPlayer.isConnected;
      gamePlayer.isReady = roomPlayer.isReady;
      gamePlayer.isHost = roomPlayer.isHost;
      gamePlayer.isBot = roomPlayer.isBot;
      gamePlayer.botProfile = roomPlayer.botProfile;
      gamePlayer.isBotControlled = !roomPlayer.isBot && !roomPlayer.isConnected;
    }
  }
}

function pruneReceipts(room: RoomRecord): void {
  while (room.commandReceipts.size > MAX_RECEIPTS) {
    const oldest = room.commandReceipts.keys().next().value;
    if (oldest === undefined) break;
    room.commandReceipts.delete(oldest);
  }
}

function applyBotDecision(
  room: RoomRecord,
  playerId: string,
  decision: Parameters<typeof applyBotDecisionToState>[2]
): boolean {
  const state = room.gameState;
  if (!state) return false;

  try {
    room.gameState = applyBotDecisionToState(state, playerId, decision);
    syncConnectivity(room);
    return true;
  } catch (error) {
    console.error('Bot move rejected:', error);
    return false;
  }
}

function runBotTurns(room: RoomRecord): boolean {
  let changed = false;

  for (let guard = 0; guard < 200; guard++) {
    const state = room.gameState;
    if (!state) break;
    if (state.phase === 'ROUND_FINISHED' || state.phase === 'MATCH_FINISHED') break;

    // Catch a missed UNO before the next action. The catch probability roll is
    // deterministic per state version, so a failed roll cannot loop.
    const missed = state.players.find(
      (p) => p.hand.length === 1 && p.hasMissedUno && !p.unoDeclared
    );
    if (missed) {
      const catcher = state.players.find((p) => p.isBot && p.id !== missed.id);
      if (catcher) {
        const target = getBotCatchTarget(
          state,
          catcher.id,
          catcher.botProfile ?? DEFAULT_BOT_PROFILE
        );
        if (
          target &&
          applyBotDecision(room, catcher.id, {
            action: 'CATCH_UNO',
            targetPlayerId: target,
          })
        ) {
          changed = true;
          continue;
        }
      }
    }

    let actor: AuthoritativeGameState['players'][number] | undefined;
    if (state.phase === 'WILD_COLOR_SELECTION') {
      actor = state.players.find(
        (p) => p.id === state.pendingWildSelection?.playerId
      );
    } else if (state.phase === 'WILD_FOUR_CHALLENGE') {
      actor = state.players.find(
        (p) => p.id === state.pendingChallenge?.challengerPlayerId
      );
    } else {
      actor = state.players[state.currentSeat];
    }

    if (!actor) break;
    // Connected humans act for themselves; disconnected humans are covered by
    // the same bot engine until they reconnect.
    if (!actor.isBot && actor.isConnected) break;

    const profile = actor.botProfile ?? DEFAULT_BOT_PROFILE;
    const decision = getBotDecision(state, actor.id, profile);
    if (applyBotDecision(room, actor.id, decision)) {
      changed = true;
      continue;
    }

    // Safe fallback: draw/pass when possible, then stop rather than freezing
    // the game in an endless maintenance loop.
    let fallback: Parameters<typeof applyBotDecisionToState>[2] | null = null;
    if (state.phase === 'ACTIVE_TURN' && state.currentPlayerId === actor.id) {
      fallback = { action: 'DRAW_CARD' };
    } else if (state.phase === 'DRAW_DECISION' && state.currentPlayerId === actor.id) {
      fallback = { action: 'PASS_TURN' };
    } else if (
      state.phase === 'WILD_COLOR_SELECTION' &&
      state.pendingWildSelection?.playerId === actor.id
    ) {
      fallback = { action: 'SELECT_COLOR', chosenColor: 'RED' };
    } else if (
      state.phase === 'WILD_FOUR_CHALLENGE' &&
      state.pendingChallenge?.challengerPlayerId === actor.id
    ) {
      fallback = { action: 'ACCEPT_CHALLENGE' };
    }
    if (fallback && applyBotDecision(room, actor.id, fallback)) {
      changed = true;
      continue;
    }
    break;
  }

  return changed;
}

/** Marks completed rooms EXPIRING with a short, configurable retention. */
function applyLifecycle(room: RoomRecord): boolean {
  if (room.gameState?.phase !== 'MATCH_FINISHED') return false;
  if (room.status === 'FINISHED') return false;
  room.status = 'FINISHED';
  room.expiresAt = Date.now() + COMPLETED_RETENTION_MS;
  return true;
}

/**
 * Reaps silent players, enforces the turn timer, and keeps bot turns moving.
 * Returns true when anything changed and needs persisting.
 */
function maintainRoom(
  room: RoomRecord,
  viewer?: { playerId: string; sessionToken: string }
): boolean {
  const now = Date.now();
  let changed = false;

  if (viewer) {
    const me = room.players.find((p) => p.id === viewer.playerId);
    if (me && me.sessionToken === viewer.sessionToken) {
      // Heartbeat at most every ~5s so a live player is never reaped, without
      // writing the row on every poll.
      if (!me.isConnected || now - me.lastSeenAt > 5000) {
        changed = true;
      }
      me.isConnected = true;
      me.lastSeenAt = now;
    }
  }

  const graceMs = Math.max(10, room.rules.botGracePeriodSeconds) * 1000;
  for (const player of room.players) {
    if (player.isBot || !player.isConnected) continue;
    if (viewer && player.id === viewer.playerId) continue;
    if (now - player.lastSeenAt > graceMs) {
      player.isConnected = false;
      changed = true;
    }
  }

  const host = room.players.find((p) => p.id === room.hostPlayerId);
  if (host && !host.isConnected) {
    const nextHost = room.players.find((p) => p.isConnected && !p.isBot);
    if (nextHost) {
      host.isHost = false;
      nextHost.isHost = true;
      room.hostPlayerId = nextHost.id;
      changed = true;
    }
  }

  if (changed) syncConnectivity(room);
  if (runBotTurns(room)) changed = true;

  const state = room.gameState;
  if (state) {
    let actor: AuthoritativePlayer | undefined = state.players[state.currentSeat];
    if (state.phase === 'WILD_COLOR_SELECTION') {
      actor = state.players.find(
        (p) => p.id === state.pendingWildSelection?.playerId
      );
    } else if (state.phase === 'WILD_FOUR_CHALLENGE') {
      actor = state.players.find(
        (p) => p.id === state.pendingChallenge?.challengerPlayerId
      );
    }
    const activePhase =
      state.phase === 'ACTIVE_TURN' ||
      state.phase === 'DRAW_DECISION' ||
      state.phase === 'WILD_COLOR_SELECTION' ||
      state.phase === 'WILD_FOUR_CHALLENGE';

    if (activePhase && actor && !actor.isBot && actor.isConnected) {
      const idleMs = now - (state.lastAction?.timestamp ?? now);
      if (idleMs > room.rules.turnTimerSeconds * 1000) {
        const decision = getBotDecision(
          state,
          actor.id,
          actor.botProfile ?? DEFAULT_BOT_PROFILE
        );
        if (applyBotDecision(room, actor.id, decision)) {
          changed = true;
          if (runBotTurns(room)) changed = true;
        }
      }
    }
  }

  if (applyLifecycle(room)) changed = true;
  return changed;
}

function buildDetails(room: RoomRecord): RoomDetails {
  return {
    room: {
      id: room.id,
      roomCode: room.roomCode,
      status: room.status,
      maxPlayers: room.maxPlayers,
      hostPlayerId: room.hostPlayerId,
      rules: room.rules,
      scoringMode: room.scoringMode,
    },
    players: room.players.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      seatNumber: p.seatNumber,
      isReady: p.isReady,
      isConnected: p.isConnected,
      isHost: p.isHost,
      isBot: p.isBot,
      botProfile: p.botProfile,
    })),
    gameState: room.gameState ? getPublicGameState(room.gameState) : undefined,
  };
}

/**
 * Creates a room. `botCount` seeds ready bots so practice starts in one call.
 */
export async function createRoom(params: {
  nickname: string;
  maxPlayers?: number;
  rules?: Partial<RoomRulesConfig>;
  scoringMode?: ScoringMode;
  targetScore?: number;
  botCount?: number;
  botDifficulty?: BotDifficulty;
  botPersonality?: BotPersonality;
}): Promise<{
  room: {
    id: string;
    roomCode: string;
    hostPlayerId: string;
    status: string;
    maxPlayers: number;
    rules: RoomRulesConfig;
  };
  player: { id: string; nickname: string; seatNumber: number; isHost: boolean };
  sessionToken: string;
  reconnectToken: string;
}> {
  const maxPlayers = Math.min(Math.max(params.maxPlayers ?? 10, 2), 10);
  const botCount = Math.min(Math.max(params.botCount ?? 0, 0), maxPlayers - 1);
  const fullRules: RoomRulesConfig = {
    stackingEnabled: params.rules?.stackingEnabled ?? false,
    turnTimerSeconds: params.rules?.turnTimerSeconds ?? 30,
    botGracePeriodSeconds: params.rules?.botGracePeriodSeconds ?? 30,
    targetScore: params.targetScore ?? params.rules?.targetScore ?? 500,
  };
  const targetScore = fullRules.targetScore;

  const playerId = crypto.randomUUID();
  const sessionToken = crypto.randomBytes(24).toString('hex');
  const reconnectToken = crypto.randomBytes(32).toString('hex');
  const reconnectTokenHash = hashToken(reconnectToken);

  const botPool = [
    'Bot Sparky',
    'Bot Nova',
    'Bot Turbo',
    'Bot Comet',
    'Bot Pixel',
    'Bot Zeta',
    'Bot Echo',
    'Bot Rogue',
    'Bot Glitch',
  ];
  const personalityPool: BotPersonality[] = [
    'STRATEGIST',
    'AGGRESSOR',
    'DEFENSIVE',
    'UNPREDICTABLE',
    'BALANCED',
  ];
  const difficulty = params.botDifficulty ?? 'MEDIUM';

  const players: RoomPlayerRecord[] = [
    {
      id: playerId,
      nickname: params.nickname.trim() || 'Player 1',
      seatNumber: 0,
      isReady: true,
      isConnected: true,
      isHost: true,
      isBot: false,
      sessionToken,
      reconnectTokenHash,
      lastSeenAt: Date.now(),
    },
  ];

  for (let i = 0; i < botCount; i++) {
    players.push({
      id: crypto.randomUUID(),
      nickname: botPool[i % botPool.length],
      seatNumber: i + 1,
      isReady: true,
      isConnected: true,
      isHost: false,
      isBot: true,
      botProfile: {
        difficulty,
        personality:
          i === 0 && params.botPersonality
            ? params.botPersonality
            : personalityPool[i % personalityPool.length],
      },
      sessionToken: crypto.randomBytes(24).toString('hex'),
      reconnectTokenHash: crypto.randomBytes(32).toString('hex'),
      lastSeenAt: Date.now(),
    });
  }

  const base = {
    hostPlayerId: playerId,
    status: 'LOBBY' as const,
    maxPlayers,
    rules: fullRules,
    scoringMode: params.scoringMode ?? 'SINGLE_ROUND',
    targetScore,
    players,
    commandReceipts: new Map(),
    createdAt: Date.now(),
    expiresAt: Date.now() + ROOM_TTL_MS,
  };

  for (let attempt = 0; attempt < 8; attempt++) {
    const room: RoomRecord = {
      ...base,
      id: crypto.randomUUID(),
      roomCode: generateRoomCode(),
    };

    try {
      await insertRoom(room);
      void broadcastRoomUpdated(room.id);

      return {
        room: {
          id: room.id,
          roomCode: room.roomCode,
          hostPlayerId: room.hostPlayerId,
          status: room.status,
          maxPlayers: room.maxPlayers,
          rules: room.rules,
        },
        player: {
          id: playerId,
          nickname: players[0].nickname,
          seatNumber: 0,
          isHost: true,
        },
        sessionToken,
        reconnectToken,
      };
    } catch (error) {
      if (error instanceof RoomCodeTakenError) continue;
      throw error;
    }
  }

  throw new Error('Could not allocate a room code; please retry');
}

export async function joinRoom(params: {
  roomCode: string;
  nickname: string;
}): Promise<{
  room: { id: string; roomCode: string; status: string };
  player: { id: string; nickname: string; seatNumber: number; isHost: boolean };
  sessionToken: string;
  reconnectToken: string;
}> {
  const loaded = await loadRoomByCode(params.roomCode);
  if (!loaded) throw new Error('Room not found. Please check your room code.');

  const nickname = params.nickname.trim();
  const playerId = crypto.randomUUID();
  const sessionToken = crypto.randomBytes(24).toString('hex');
  const reconnectToken = crypto.randomBytes(32).toString('hex');

  const outcome = await mutateRoom(loaded.room.id, (room) => {
    if (room.status !== 'LOBBY') {
      throw new Error('Game already in progress or finished');
    }
    if (room.players.length >= room.maxPlayers) {
      throw new Error('Room is full (max players reached)');
    }
    if (
      room.players.some(
        (p) => p.nickname.toLowerCase() === (nickname || '').toLowerCase()
      )
    ) {
      throw new Error('That nickname is already in this room');
    }

    const usedSeats = new Set(room.players.map((p) => p.seatNumber));
    let seatNumber = 0;
    while (usedSeats.has(seatNumber)) seatNumber++;

    room.players.push({
      id: playerId,
      nickname: nickname || `Player ${seatNumber + 1}`,
      seatNumber,
      isReady: false,
      isConnected: true,
      isHost: false,
      isBot: false,
      sessionToken,
      reconnectTokenHash: hashToken(reconnectToken),
      lastSeenAt: Date.now(),
    });

    return {
      result: {
        room: { id: room.id, roomCode: room.roomCode, status: room.status },
        player: {
          id: playerId,
          nickname: room.players[room.players.length - 1].nickname,
          seatNumber,
          isHost: false,
        },
        sessionToken,
        reconnectToken,
      },
      changed: true,
    };
  });

  void broadcastRoomUpdated(loaded.room.id);
  return outcome.result;
}

export async function getRoomDetails(
  roomId: string,
  viewer?: { playerId: string; sessionToken: string }
): Promise<RoomDetails> {
  const outcome = await mutateRoom(roomId, (room) => {
    const changed = maintainRoom(room, viewer);
    return { result: buildDetails(room), changed };
  });

  return outcome.result;
}

export async function togglePlayerReady(
  roomId: string,
  playerId: string,
  sessionToken: string,
  isReady: boolean
): Promise<void> {
  const outcome = await mutateRoom(roomId, (room) => {
    const player = authenticate(room, playerId, sessionToken);
    if (room.status !== 'LOBBY') throw new Error('The game has already started');
    player.isReady = isReady;
    syncConnectivity(room);
    return { result: undefined, changed: true };
  });
  if (outcome.changed) void broadcastRoomUpdated(roomId);
}

/**
 * Starts a match, deals the next round, or restarts a finished match.
 * Round 2+ carries totals forward; a finished match resets them.
 */
export async function startGame(
  roomId: string,
  playerId: string,
  sessionToken: string
): Promise<PublicGameState> {
  const outcome = await mutateRoom(roomId, (room) => {
    const host = authenticate(room, playerId, sessionToken);
    if (room.hostPlayerId !== host.id) {
      throw new Error('Only the host can start the game');
    }
    if (room.players.length < 2) {
      throw new Error('At least 2 players are required to start UNO');
    }

    const existing = room.gameState;
    if (existing && existing.phase !== 'ROUND_FINISHED' && existing.phase !== 'MATCH_FINISHED') {
      throw new Error('Game already in progress');
    }

    const nextRound = existing?.phase === 'ROUND_FINISHED';
    const startingScores = nextRound
      ? Object.fromEntries(existing!.players.map((p) => [p.id, p.totalScore]))
      : {};
    const roundNumber = nextRound ? existing!.roundNumber + 1 : 1;

    room.gameState = createInitialGame({
      roomId: room.id,
      gameSessionId: crypto.randomUUID(),
      players: room.players.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        isHost: p.isHost,
        isBot: p.isBot,
        botProfile: p.botProfile,
      })),
      rules: room.rules,
      scoringMode: room.scoringMode,
      roundNumber,
      startingScores,
    });
    room.status = 'IN_GAME';
    room.expiresAt = Date.now() + ROOM_TTL_MS;
    syncConnectivity(room);
    runBotTurns(room);
    applyLifecycle(room);

    return { result: getPublicGameState(room.gameState), changed: true };
  });

  if (outcome.changed) void broadcastRoomUpdated(roomId);
  return outcome.result;
}

/**
 * Applies an authenticated, idempotent, version-checked command.
 */
export async function executeCommand(
  roomId: string,
  playerId: string,
  sessionToken: string,
  command: GameCommand
): Promise<{ publicState: PublicGameState; privateState: PrivatePlayerState }> {
  const outcome = await mutateRoom(roomId, (room) => {
    authenticate(room, playerId, sessionToken);
    const state = room.gameState;
    if (!state) throw new Error('Room or active game not found');

    if (room.commandReceipts.has(command.commandId)) {
      return {
        result: {
          publicState: getPublicGameState(state),
          privateState: getPrivatePlayerState(state, playerId),
        },
        changed: false,
      };
    }

    if (command.expectedVersion !== state.version) {
      throw new Error(
        `Version conflict: expected version ${command.expectedVersion}, but current game version is ${state.version}`
      );
    }

    let nextState: AuthoritativeGameState;

    switch (command.type) {
      case 'PLAY_CARD':
        nextState = executePlayCard(
          state,
          playerId,
          command.payload.cardId,
          command.payload.chosenColor,
          command.payload.callUno
        );
        break;

      case 'DRAW_CARD':
        nextState = executeDrawCard(state, playerId);
        break;

      case 'PASS_TURN':
        nextState = executePassTurn(state, playerId);
        break;

      case 'CALL_UNO':
        nextState = executeCallUno(state, playerId);
        break;

      case 'CATCH_MISSED_UNO':
        nextState = executeCatchMissedUno(
          state,
          playerId,
          command.payload.targetPlayerId
        );
        break;

      case 'SELECT_COLOR':
        nextState = executeSelectColor(state, playerId, command.payload.color);
        break;

      case 'CHALLENGE_WILD_DRAW_FOUR':
        nextState = executeChallengeWildDrawFour(state, playerId);
        break;

      case 'ACCEPT_WILD_DRAW_FOUR':
        nextState = executeAcceptWildDrawFour(state, playerId);
        break;

      default:
        throw new Error(`Unknown command type: ${(command as { type: string }).type}`);
    }

    room.gameState = nextState;
    syncConnectivity(room);
    room.commandReceipts.set(command.commandId, {
      resultingVersion: nextState.version,
      result: { success: true },
    });
    pruneReceipts(room);
    runBotTurns(room);
    applyLifecycle(room);

    return {
      result: {
        publicState: getPublicGameState(room.gameState),
        privateState: getPrivatePlayerState(room.gameState, playerId),
      },
      changed: true,
    };
  });

  if (outcome.changed) void broadcastRoomUpdated(roomId);
  return outcome.result;
}

export async function getPlayerHand(
  roomId: string,
  playerId: string,
  sessionToken: string
): Promise<PrivatePlayerState> {
  const loaded = await loadRoomById(roomId);
  if (!loaded || !loaded.room.gameState) {
    throw new Error('Room or active game not found');
  }
  authenticate(loaded.room, playerId, sessionToken);
  return getPrivatePlayerState(loaded.room.gameState, playerId);
}

export async function reconnectPlayer(
  roomId: string,
  reconnectToken: string
): Promise<{
  player: { id: string; nickname: string; seatNumber: number };
  sessionToken: string;
  reconnectToken: string;
  publicState?: PublicGameState;
  privateState?: PrivatePlayerState;
}> {
  const tokenHash = hashToken(reconnectToken);
  const nextReconnectToken = crypto.randomBytes(32).toString('hex');

  const outcome = await mutateRoom(roomId, (room) => {
    const player = room.players.find((p) => p.reconnectTokenHash === tokenHash);
    if (!player) throw new Error('Invalid reconnect token');

    // Rotate on every successful reconnect so a leaked old token is useless.
    player.reconnectTokenHash = hashToken(nextReconnectToken);
    player.isConnected = true;
    player.lastSeenAt = Date.now();
    syncConnectivity(room);
    runBotTurns(room);
    applyLifecycle(room);

    return {
      result: {
        player: {
          id: player.id,
          nickname: player.nickname,
          seatNumber: player.seatNumber,
        },
        sessionToken: player.sessionToken,
        reconnectToken: nextReconnectToken,
        publicState: room.gameState ? getPublicGameState(room.gameState) : undefined,
        privateState: room.gameState
          ? getPrivatePlayerState(room.gameState, player.id)
          : undefined,
      },
      changed: true,
    };
  });

  void broadcastRoomUpdated(roomId);
  return outcome.result;
}

/**
 * Marks a player disconnected, transfers host if needed, and lets bots cover
 * their turn. Called by the Leave button and by page unload.
 */
export async function leaveRoom(
  roomId: string,
  playerId: string,
  sessionToken: string
): Promise<void> {
  const outcome = await mutateRoom(roomId, (room) => {
    const player = authenticate(room, playerId, sessionToken);
    player.isConnected = false;
    player.lastSeenAt = 0;

    if (room.hostPlayerId === player.id) {
      const nextHost =
        room.players.find((p) => p.isConnected && !p.isBot && p.id !== player.id) ??
        room.players.find((p) => p.id !== player.id);
      if (nextHost) {
        player.isHost = false;
        nextHost.isHost = true;
        room.hostPlayerId = nextHost.id;
      }
    }

    syncConnectivity(room);
    runBotTurns(room);
    applyLifecycle(room);
    return { result: undefined, changed: true };
  });

  if (outcome.changed) void broadcastRoomUpdated(roomId);
}

/**
 * Deletes expired lobby/completed room rows only. Active IN_GAME rooms are
 * deliberately excluded even if their TTL has elapsed, so a live match can
 * never be deleted by a cleanup pass.
 */
export async function cleanupExpiredRooms(
  limit: number = 50
): Promise<{ deleted: number }> {
  const db = supabaseAdmin();
  const now = Date.now();

  if (!db) {
    let deleted = 0;
    for (const [id, entry] of memoryRooms) {
      if (deleted >= limit) break;
      if (entry.room.expiresAt < now && entry.room.status !== 'IN_GAME') {
        memoryRooms.delete(id);
        deleted++;
      }
    }
    return { deleted };
  }

  const { data, error } = await db
    .from('rooms')
    .select('id')
    .lt('expires_at', new Date(now).toISOString())
    .neq('status', 'IN_GAME')
    .limit(limit);

  if (error) throw new Error(`Room cleanup unavailable: ${error.message}`);
  const ids = (data ?? []).map((row) => row.id as string);
  if (ids.length === 0) return { deleted: 0 };

  const { error: deleteError } = await db
    .from('rooms')
    .delete()
    .in('id', ids)
    .neq('status', 'IN_GAME');
  if (deleteError) {
    throw new Error(`Room cleanup unavailable: ${deleteError.message}`);
  }
  return { deleted: ids.length };
}
