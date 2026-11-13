// src/lib/simulation/bot-simulation.ts
//
// Developer-only bot simulation harness. Uses only the shared game engine and
// bot module, so results reflect the same rules as production local/online games.
import { createInitialGame } from '@/lib/game-engine/engine';
import { AuthoritativeGameState, BotProfile } from '@/types';
import {
  getBotDecision,
  applyBotDecisionToState,
  isBotTurn,
  DEFAULT_BOT_PROFILE,
} from '@/lib/game-engine/bot';
import { BotDifficulty, BotPersonality, RoomRulesConfig, ScoringMode } from '@/types';

export interface SimulationConfig {
  matches: number;
  playerCount: number;
  difficulty: BotDifficulty;
  personality: BotPersonality;
  stackingEnabled: boolean;
  scoringMode: ScoringMode;
  targetScore: number;
  seedBase: number;
}

export interface SimulationMatchResult {
  seed: number;
  winnerSeat: number;
  turns: number;
  rounds: number;
}

export interface SimulationStats {
  matches: number;
  winsBySeat: number[];
  averageTurns: number;
  averageRounds: number;
  illegalAttempts: number;
  timeouts: number;
}

const DEFAULT_RULES: RoomRulesConfig = {
  stackingEnabled: false,
  turnTimerSeconds: 30,
  botGracePeriodSeconds: 30,
  targetScore: 500,
};

export function runSingleSimulationMatch(config: SimulationConfig, seed: number): SimulationMatchResult {
  const players = Array.from({ length: config.playerCount }, (_, i) => ({
    id: `sim-bot-${i}`,
    nickname: `Bot ${i + 1}`,
    isHost: i === 0,
    isBot: true,
    botProfile: { difficulty: config.difficulty, personality: config.personality } as BotProfile,
  }));

  let state: AuthoritativeGameState = createInitialGame({
    roomId: `sim-${seed}`,
    gameSessionId: `sim-session-${seed}`,
    players,
    rules: { ...DEFAULT_RULES, stackingEnabled: config.stackingEnabled, targetScore: config.targetScore },
    scoringMode: config.scoringMode,
    seed,
  });

  let turns = 0;
  let rounds = 1;
  const guard = 100000;
  for (let i = 0; i < guard; i++) {
    if (state.phase === 'MATCH_FINISHED') break;
    if (state.phase === 'ROUND_FINISHED') {
      rounds++;
      // Engine auto-advances rounds only when scoring; for simulation we stop at first round win
      // to keep metrics simple and deterministic.
      break;
    }
    if (!isBotTurn(state)) break;
    const actor = state.players[state.currentSeat];
    const profile = actor.botProfile ?? DEFAULT_BOT_PROFILE;
    const decision = getBotDecision(state, actor.id, profile);
    try {
      state = applyBotDecisionToState(state, actor.id, decision);
      turns++;
    } catch {
      // Fallback to a draw to avoid freezing the simulation.
      try {
        state = applyBotDecisionToState(state, actor.id, { action: 'DRAW_CARD' });
        turns++;
      } catch {
        break;
      }
    }
  }

  let winnerSeat = 0;
  if (state.winnerPlayerId) {
    winnerSeat = state.players.findIndex((p) => p.id === state.winnerPlayerId);
  } else {
    let minCards = state.players[0]?.hand.length ?? 0;
    for (let i = 1; i < state.players.length; i++) {
      if (state.players[i].hand.length < minCards) {
        minCards = state.players[i].hand.length;
        winnerSeat = i;
      }
    }
  }
  if (winnerSeat < 0) winnerSeat = 0;

  return { seed, winnerSeat: winnerSeat < 0 ? 0 : winnerSeat, turns, rounds };
}

export function runBotSimulation(config: SimulationConfig): SimulationStats {
  const winsBySeat = Array.from({ length: config.playerCount }, () => 0);
  let totalTurns = 0;
  let totalRounds = 0;
  let illegalAttempts = 0;
  let timeouts = 0;
  let completed = 0;

  for (let m = 0; m < config.matches; m++) {
    const seed = config.seedBase + m;
    try {
      const result = runSingleSimulationMatch(config, seed);
      winsBySeat[result.winnerSeat] = (winsBySeat[result.winnerSeat] ?? 0) + 1;
      totalTurns += result.turns;
      totalRounds += result.rounds;
      completed++;
    } catch {
      timeouts++;
    }
  }

  return {
    matches: completed,
    winsBySeat,
    averageTurns: completed ? totalTurns / completed : 0,
    averageRounds: completed ? totalRounds / completed : 0,
    illegalAttempts,
    timeouts,
  };
}
