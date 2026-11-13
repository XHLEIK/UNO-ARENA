// src/lib/game-engine/bot.ts
//
// Pure strategic bot engine. It only reads the bot's own hand plus public game
// data. Online and local games both call this module, so bot rules cannot drift.
import {
  AuthoritativeGameState,
  BotDifficulty,
  BotPersonality,
  BotProfile,
  CardColor,
  UnoCard,
} from '@/types';
import { canPlayWildDrawFourLegally, isCardPlayable } from './validation';
import {
  executeAcceptWildDrawFour,
  executeCatchMissedUno,
  executeChallengeWildDrawFour,
  executeDrawCard,
  executePassTurn,
  executePlayCard,
  executeSelectColor,
} from './engine';

export type BotActionType =
  | 'PLAY_CARD'
  | 'DRAW_CARD'
  | 'PASS_TURN'
  | 'SELECT_COLOR'
  | 'ACCEPT_CHALLENGE'
  | 'CHALLENGE'
  | 'CATCH_UNO';

export interface BotDecision {
  action: BotActionType;
  cardId?: string;
  chosenColor?: CardColor;
  callUno?: boolean;
  targetPlayerId?: string;
  decisionId?: string;
  expectedVersion?: number;
  score?: number;
  profile?: BotProfile;
}

export const DEFAULT_BOT_PROFILE: BotProfile = {
  difficulty: 'MEDIUM',
  personality: 'BALANCED',
};

const DIFFICULTY_WEIGHT: Record<BotDifficulty, number> = {
  EASY: 0.35,
  MEDIUM: 0.7,
  HARD: 1,
};

const PERSONALITY_WEIGHTS: Record<
  BotPersonality,
  {
    aggression: number;
    riskTolerance: number;
    wildConservation: number;
    opponentAwareness: number;
    endgameFocus: number;
    challengeTendency: number;
    unpredictability: number;
  }
> = {
  STRATEGIST: {
    aggression: 0.45,
    riskTolerance: 0.35,
    wildConservation: 0.9,
    opponentAwareness: 0.9,
    endgameFocus: 0.9,
    challengeTendency: 0.75,
    unpredictability: 0.1,
  },
  AGGRESSOR: {
    aggression: 1,
    riskTolerance: 0.8,
    wildConservation: 0.3,
    opponentAwareness: 0.65,
    endgameFocus: 0.7,
    challengeTendency: 0.5,
    unpredictability: 0.25,
  },
  DEFENSIVE: {
    aggression: 0.25,
    riskTolerance: 0.15,
    wildConservation: 0.95,
    opponentAwareness: 0.7,
    endgameFocus: 0.85,
    challengeTendency: 0.2,
    unpredictability: 0.1,
  },
  UNPREDICTABLE: {
    aggression: 0.6,
    riskTolerance: 0.55,
    wildConservation: 0.5,
    opponentAwareness: 0.45,
    endgameFocus: 0.5,
    challengeTendency: 0.55,
    unpredictability: 0.95,
  },
  BALANCED: {
    aggression: 0.55,
    riskTolerance: 0.45,
    wildConservation: 0.65,
    opponentAwareness: 0.7,
    endgameFocus: 0.7,
    challengeTendency: 0.45,
    unpredictability: 0.15,
  },
};

interface BotObservation {
  botId: string;
  seatNumber: number;
  hand: UnoCard[];
  players: {
    id: string;
    seatNumber: number;
    cardCount: number;
    isBot: boolean;
    totalScore: number;
  }[];
  activeColor: CardColor;
  topDiscard: UnoCard;
  direction: 1 | -1;
  drawPileCount: number;
  phase: AuthoritativeGameState['phase'];
  currentPlayerId: string;
  pendingStackCount: number;
  stackingEnabled: boolean;
  targetScore: number;
  lastAction?: AuthoritativeGameState['lastAction'];
}

interface Candidate {
  decision: BotDecision;
  score: number;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRandom(seed: string): () => number {
  let s = hashString(seed) | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Builds a deliberately public view of the game. Opponent hands never enter
 * the observation object, so a bot cannot accidentally reason from them.
 */
function buildObservation(
  state: AuthoritativeGameState,
  botPlayerId: string
): BotObservation | null {
  const self = state.players.find((p) => p.id === botPlayerId);
  if (!self) return null;

  return {
    botId: self.id,
    seatNumber: self.seatNumber,
    hand: self.hand,
    players: state.players.map((p) => ({
      id: p.id,
      seatNumber: p.seatNumber,
      cardCount: p.hand.length,
      isBot: p.isBot,
      totalScore: p.totalScore,
    })),
    activeColor: state.activeColor,
    topDiscard: state.topDiscard,
    direction: state.direction,
    drawPileCount: state.drawPile.length,
    phase: state.phase,
    currentPlayerId: state.currentPlayerId,
    pendingStackCount: state.pendingStackCount ?? 0,
    stackingEnabled: state.rules.stackingEnabled,
    targetScore: state.rules.targetScore,
    lastAction: state.lastAction,
  };
}

function nextOpponent(obs: BotObservation): BotObservation['players'][number] | undefined {
  if (obs.players.length < 2) return undefined;
  const nextSeat =
    (obs.seatNumber + obs.direction + obs.players.length) % obs.players.length;
  return obs.players.find((p) => p.seatNumber === nextSeat);
}

function colorCounts(hand: UnoCard[]): Record<CardColor, number> {
  const counts: Record<CardColor, number> = {
    RED: 0,
    BLUE: 0,
    GREEN: 0,
    YELLOW: 0,
  };
  for (const card of hand) {
    if (card.color) counts[card.color]++;
  }
  return counts;
}

function chooseBestColor(
  hand: UnoCard[],
  profile: BotProfile,
  random: () => number
): CardColor {
  const counts = colorCounts(hand);
  const order = (Object.keys(counts) as CardColor[]).sort(
    (a, b) => counts[b] - counts[a]
  );
  const weights = PERSONALITY_WEIGHTS[profile.personality];

  if (profile.difficulty === 'EASY' || random() < weights.unpredictability * 0.25) {
    const top = order.slice(0, 2);
    return top[Math.floor(random() * top.length)];
  }
  return order[0];
}

function shouldCallUno(
  handLength: number,
  profile: BotProfile,
  random: () => number
): boolean {
  if (handLength !== 2) return false;
  const missChance =
    profile.difficulty === 'EASY' ? 0.18 : profile.difficulty === 'MEDIUM' ? 0.06 : 0;
  return random() >= missChance;
}

function actionScore(
  card: UnoCard,
  obs: BotObservation,
  profile: BotProfile,
  chosenColor: CardColor | undefined,
  random: () => number
): number {
  const weights = PERSONALITY_WEIGHTS[profile.personality];
  const difficulty = DIFFICULTY_WEIGHT[profile.difficulty];
  const remaining = obs.hand.filter((c) => c.id !== card.id);
  const next = nextOpponent(obs);
  const nextLow = next ? clamp(3 - next.cardCount, 0, 3) : 0;
  const selfLow = clamp(4 - obs.hand.length, 0, 4);
  const remainingColors = colorCounts(remaining);
  const chosen = chosenColor ?? card.color ?? obs.activeColor;
  const chosenCount = remainingColors[chosen] ?? 0;

  let score = 0;

  // Winning the round is always the strongest consideration.
  if (remaining.length === 0) score += 1000;
  else if (remaining.length === 1) score += 110 + weights.endgameFocus * 30;

  // Keep a flexible, playable hand. Matching the chosen color is valuable.
  score += chosenCount * 5;
  score += (remaining.length > 0 ? 8 : 0);

  // Playing a card that is already in the active color keeps pressure on.
  if (card.color === obs.activeColor) score += 7;

  // Action cards are worth more when the next player is close to winning.
  if (card.type === 'DRAW_TWO') {
    score += 13 + weights.aggression * 16 + nextLow * (18 + weights.aggression * 18);
    if (obs.stackingEnabled && obs.pendingStackCount > 0) score += 50;
  } else if (card.type === 'SKIP') {
    score += 9 + weights.aggression * 11 + nextLow * (14 + weights.aggression * 14);
  } else if (card.type === 'REVERSE') {
    score += 5 + weights.aggression * 8;
    if (obs.players.length === 2) score += 18 + nextLow * 8;
  } else if (card.type === 'WILD' || card.type === 'WILD_DRAW_FOUR') {
    const wildCost = card.type === 'WILD_DRAW_FOUR' ? 24 : 16;
    score -= wildCost * weights.wildConservation + (1 - weights.riskTolerance) * 5;
    if (card.type === 'WILD_DRAW_FOUR') {
      score += 8;
      if (!canPlayWildDrawFourLegally(remaining, obs.activeColor)) {
        // This is a bluff under official rules. Low-risk bots avoid it.
        score -= (1 - weights.riskTolerance) * 34;
      }
    }
  } else {
    // Prefer shedding low-value number cards, but do not dump a useful color.
    score += Math.max(0, 6 - (card.scoreValue ?? 0) * 0.2);
  }

  // Endgame pressure: attack the next player when they are close to winning.
  if (next && next.cardCount <= 2 && card.type !== 'NUMBER') {
    score += weights.opponentAwareness * weights.endgameFocus * 32;
  }
  if (selfLow > 0) score += selfLow * weights.endgameFocus * 8;

  // Preserve Wilds until they are needed, especially with a healthy hand.
  if ((card.type === 'WILD' || card.type === 'WILD_DRAW_FOUR') && obs.hand.length > 4) {
    score -= weights.wildConservation * 10;
  }

  // Prefer playing a color we can continue with after this card.
  if (card.color && remainingColors[card.color] === 0 && remaining.length > 1) {
    score -= 3;
  }

  // Easier bots are intentionally imperfect but still legal.
  if (profile.difficulty === 'EASY') {
    score *= 0.65;
    score += random() * 36;
  } else {
    score += random() * weights.unpredictability * 12;
  }

  score += difficulty * 2;
  return score;
}

function decideChallenge(
  obs: BotObservation,
  profile: BotProfile,
  random: () => number
): BotDecision {
  const weights = PERSONALITY_WEIGHTS[profile.personality];
  const challenged = obs.lastAction?.playerId
    ? obs.players.find((p) => p.id === obs.lastAction!.playerId)
    : undefined;

  // Public-only estimate. We never inspect the challenged player's hand.
  let illegalProbability = 0.24 + weights.challengeTendency * 0.22;
  if (challenged && challenged.cardCount <= 2) illegalProbability += 0.08;
  if (obs.drawPileCount < 12) illegalProbability -= 0.05;
  if (profile.difficulty === 'EASY') illegalProbability *= 0.7;
  if (profile.difficulty === 'HARD') illegalProbability += 0.08;
  illegalProbability = clamp(illegalProbability, 0.05, 0.85);

  // Challenge expected value: accepting costs 4; a failed challenge costs 6,
  // a successful one costs 0 and keeps the turn. Compare the expected penalty.
  const challengeCost = 6 * (1 - illegalProbability);
  const acceptCost = 4;
  const challengeWorthIt =
    challengeCost + (1 - illegalProbability) * 1.5 < acceptCost ||
    random() < weights.challengeTendency * 0.12;

  return {
    action: challengeWorthIt ? 'CHALLENGE' : 'ACCEPT_CHALLENGE',
    expectedVersion: undefined,
  };
}

/**
 * Returns one legal, deterministic decision for a bot. The cosmetic delay is
 * deliberately not part of this function; schedulers own timing.
 */
export function getBotDecision(
  state: AuthoritativeGameState,
  botPlayerId: string,
  profile: BotProfile = DEFAULT_BOT_PROFILE
): BotDecision {
  const obs = buildObservation(state, botPlayerId);
  if (!obs) return { action: 'PASS_TURN' };

  const random = createRandom(
    `${state.gameSessionId}:${state.version}:${botPlayerId}:${profile.difficulty}:${profile.personality}`
  );
  const base = (decision: BotDecision): BotDecision => ({
    ...decision,
    decisionId: `${state.gameSessionId}:${state.version}:${botPlayerId}`,
    expectedVersion: state.version,
    profile,
  });

  if (obs.phase === 'WILD_COLOR_SELECTION') {
    if (state.pendingWildSelection?.playerId === botPlayerId) {
      return base({
        action: 'SELECT_COLOR',
        chosenColor: chooseBestColor(obs.hand, profile, random),
      });
    }
    return base({ action: 'PASS_TURN' });
  }

  if (obs.phase === 'WILD_FOUR_CHALLENGE') {
    if (state.pendingChallenge?.challengerPlayerId === botPlayerId) {
      return base(decideChallenge(obs, profile, random));
    }
    return base({ action: 'PASS_TURN' });
  }

  if (obs.phase === 'DRAW_DECISION' && obs.currentPlayerId === botPlayerId) {
    const drawnCard = obs.hand.find((card) => card.id === state.drawnCardId);
    if (
      drawnCard &&
      isCardPlayable(drawnCard, obs.activeColor, obs.topDiscard)
    ) {
      const chosenColor =
        drawnCard.type === 'WILD' || drawnCard.type === 'WILD_DRAW_FOUR'
          ? chooseBestColor(
              obs.hand.filter((c) => c.id !== drawnCard.id),
              profile,
              random
            )
          : undefined;
      return base({
        action: 'PLAY_CARD',
        cardId: drawnCard.id,
        chosenColor,
        callUno: shouldCallUno(obs.hand.length, profile, random),
      });
    }
    return base({ action: 'PASS_TURN' });
  }

  if (obs.phase !== 'ACTIVE_TURN' || obs.currentPlayerId !== botPlayerId) {
    return base({ action: 'PASS_TURN' });
  }

  const mustStack = obs.stackingEnabled && obs.pendingStackCount > 0;
  const playable = obs.hand.filter(
    (card) =>
      isCardPlayable(card, obs.activeColor, obs.topDiscard) &&
      (!mustStack || card.type === 'DRAW_TWO')
  );

  if (playable.length === 0) {
    return base({ action: 'DRAW_CARD' });
  }

  const candidates: Candidate[] = playable.map((card) => {
    const chosenColor =
      card.type === 'WILD' || card.type === 'WILD_DRAW_FOUR'
        ? chooseBestColor(
            obs.hand.filter((c) => c.id !== card.id),
            profile,
            random
          )
        : undefined;
    return {
      score: actionScore(card, obs, profile, chosenColor, random),
      decision: {
        action: 'PLAY_CARD',
        cardId: card.id,
        chosenColor,
        callUno: shouldCallUno(obs.hand.length, profile, random),
      },
    };
  });

  candidates.sort((a, b) => b.score - a.score);
  let selected: Candidate;

  if (profile.difficulty === 'EASY' && random() < 0.55) {
    selected = candidates[Math.floor(random() * candidates.length)];
  } else if (
    profile.personality === 'UNPREDICTABLE' &&
    random() < 0.28 &&
    candidates.length > 1
  ) {
    selected = candidates[Math.floor(random() * Math.min(3, candidates.length))];
  } else {
    selected = candidates[0];
  }

  return base({ ...selected.decision, score: Number(selected.score.toFixed(2)) });
}

/**
 * Bots may catch a missed UNO outside their own turn. The decision uses only
 * public flags and is deterministic for a given state and catcher.
 */
export function getBotCatchTarget(
  state: AuthoritativeGameState,
  catcherPlayerId: string,
  profile: BotProfile = DEFAULT_BOT_PROFILE
): string | null {
  const targets = state.players.filter(
    (p) => p.id !== catcherPlayerId && p.hand.length === 1 && p.hasMissedUno && !p.unoDeclared
  );
  if (targets.length === 0) return null;

  const target = targets[0];
  const chance =
    profile.difficulty === 'HARD' ? 0.92 : profile.difficulty === 'MEDIUM' ? 0.72 : 0.38;
  const random = createRandom(
    `catch:${state.gameSessionId}:${state.version}:${catcherPlayerId}:${target.id}`
  );
  return random() < chance ? target.id : null;
}

/** Applies a bot decision through the same pure engine used by humans. */
export function applyBotDecisionToState(
  state: AuthoritativeGameState,
  playerId: string,
  decision: BotDecision
): AuthoritativeGameState {
  switch (decision.action) {
    case 'PLAY_CARD':
      if (!decision.cardId) throw new Error('Bot chose PLAY_CARD without a card');
      return executePlayCard(
        state,
        playerId,
        decision.cardId,
        decision.chosenColor,
        decision.callUno
      );
    case 'DRAW_CARD':
      return executeDrawCard(state, playerId);
    case 'PASS_TURN':
      if (state.phase !== 'DRAW_DECISION') {
        throw new Error('Bot may only pass after drawing');
      }
      return executePassTurn(state, playerId);
    case 'SELECT_COLOR':
      if (!decision.chosenColor) throw new Error('Bot chose no color');
      return executeSelectColor(state, playerId, decision.chosenColor);
    case 'ACCEPT_CHALLENGE':
      return executeAcceptWildDrawFour(state, playerId);
    case 'CHALLENGE':
      return executeChallengeWildDrawFour(state, playerId);
    case 'CATCH_UNO':
      if (!decision.targetPlayerId) throw new Error('Bot chose no catch target');
      return executeCatchMissedUno(state, playerId, decision.targetPlayerId);
    default:
      throw new Error(`Unsupported bot action: ${(decision as BotDecision).action}`);
  }
}

/** Cosmetic thinking delay. Never used for game correctness. */
export function getBotTurnDelay(
  profile: BotProfile,
  random: () => number = Math.random
): number {
  const ranges: Record<BotDifficulty, [number, number]> = {
    EASY: [400, 1000],
    MEDIUM: [600, 1400],
    HARD: [800, 1800],
  };
  const [min, max] = ranges[profile.difficulty];
  return Math.round(min + random() * (max - min));
}

/** Small helper for UI labels and deterministic test setup. */
export function describeBot(profile: BotProfile): string {
  return `${profile.difficulty} ${profile.personality}`;
}

/** Public state projection used by the local controller. */
export function isBotTurn(state: AuthoritativeGameState): boolean {
  if (state.phase === 'WILD_COLOR_SELECTION') {
    return Boolean(
      state.pendingWildSelection &&
        state.players.find((p) => p.id === state.pendingWildSelection!.playerId)?.isBot
    );
  }
  if (state.phase === 'WILD_FOUR_CHALLENGE') {
    return Boolean(
      state.pendingChallenge &&
        state.players.find((p) => p.id === state.pendingChallenge!.challengerPlayerId)?.isBot
    );
  }
  return Boolean(state.players[state.currentSeat]?.isBot);
}

/** Exported for replay/testing without exposing it in normal UI. */
export function getPublicBotObservation(
  state: AuthoritativeGameState,
  botPlayerId: string
): Omit<BotObservation, 'hand' | 'topDiscard'> & {
  topDiscardType: string;
  handSize: number;
} | null {
  const obs = buildObservation(state, botPlayerId);
  if (!obs) return null;
  const { hand, topDiscard, ...publicObs } = obs;
  return {
    ...publicObs,
    handSize: hand.length,
    topDiscardType: `${topDiscard.color ?? 'WILD'} ${topDiscard.type}`,
  };
}

export type { BotObservation };
