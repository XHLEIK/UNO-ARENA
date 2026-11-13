// src/lib/local/local-game.ts
//
// Browser-only game session. It has no Supabase, network, React or server
// dependency. The shared engine remains the single authority for UNO rules.
import {
  AuthoritativeGameState,
  BotDifficulty,
  BotPersonality,
  BotProfile,
  CardColor,
  PrivatePlayerState,
  PublicGameState,
  RoomRulesConfig,
  ScoringMode,
} from '@/types';
import {
  createInitialGame,
  executeAcceptWildDrawFour,
  executeCallUno,
  executeCatchMissedUno,
  executeChallengeWildDrawFour,
  executeDrawCard,
  executePassTurn,
  executePlayCard,
  executeSelectColor,
  getPrivatePlayerState,
  getPublicGameState,
} from '@/lib/game-engine/engine';
import {
  DEFAULT_BOT_PROFILE,
  applyBotDecisionToState,
  getBotCatchTarget,
  getBotDecision,
  getBotTurnDelay,
} from '@/lib/game-engine/bot';

export interface LocalGameOptions {
  nickname: string;
  botCount?: number;
  difficulty?: BotDifficulty;
  personality?: BotPersonality;
  rules?: Partial<RoomRulesConfig>;
  scoringMode?: ScoringMode;
  targetScore?: number;
  seed?: number;
  /** Test/automation override; omit for the cosmetic human-like delay range. */
  botDelayMs?: number;
}

export interface LocalGameSnapshot {
  publicState: PublicGameState;
  privateState: PrivatePlayerState;
}

const LOCAL_ROOM_ID = 'local';
const LOCAL_HUMAN_ID = 'local-human';
const BOT_NAMES = ['Nova', 'Sparky', 'Turbo', 'Pixel', 'Zeta', 'Echo', 'Comet'];
const PERSONALITIES: BotPersonality[] = [
  'STRATEGIST',
  'AGGRESSOR',
  'DEFENSIVE',
  'UNPREDICTABLE',
  'BALANCED',
];

function botProfile(
  difficulty: BotDifficulty,
  personality: BotPersonality
): BotProfile {
  return { difficulty, personality };
}

export class LocalGameController {
  private state: AuthoritativeGameState;
  private readonly humanId = LOCAL_HUMAN_ID;
  private readonly options: Required<
    Pick<LocalGameOptions, 'nickname' | 'difficulty' | 'personality' | 'scoringMode' | 'targetScore'>
  > &
    LocalGameOptions;
  private readonly listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private catchAttemptedVersion = -1;
  private lastError: string | null = null;

  constructor(options: LocalGameOptions) {
    this.options = {
      nickname: options.nickname.trim() || 'Player 1',
      difficulty: options.difficulty ?? 'MEDIUM',
      personality: options.personality ?? 'BALANCED',
      scoringMode: options.scoringMode ?? 'SINGLE_ROUND',
      targetScore: options.targetScore ?? 500,
      botCount: options.botCount,
      rules: options.rules,
      seed: options.seed,
      botDelayMs: options.botDelayMs,
    };

    const botCount = Math.max(1, Math.min(options.botCount ?? 3, 9));
    const players = [
      {
        id: this.humanId,
        nickname: this.options.nickname,
        isHost: true,
        isBot: false,
      },
      ...Array.from({ length: botCount }, (_, index) => ({
        id: `local-bot-${index + 1}`,
        nickname: `Bot ${BOT_NAMES[index % BOT_NAMES.length]}`,
        isHost: false,
        isBot: true,
        botProfile: botProfile(
          this.options.difficulty,
          index === 0 ? this.options.personality : PERSONALITIES[index % PERSONALITIES.length]
        ),
      })),
    ];

    this.state = createInitialGame({
      roomId: LOCAL_ROOM_ID,
      gameSessionId: `local-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`,
      players,
      rules: {
        stackingEnabled: options.rules?.stackingEnabled ?? false,
        turnTimerSeconds: options.rules?.turnTimerSeconds ?? 30,
        botGracePeriodSeconds: options.rules?.botGracePeriodSeconds ?? 30,
        targetScore: this.options.targetScore,
      },
      scoringMode: this.options.scoringMode,
      seed: options.seed,
    });
  }

  getSnapshot(): LocalGameSnapshot {
    return {
      publicState: getPublicGameState(this.state),
      privateState: getPrivatePlayerState(this.state, this.humanId),
    };
  }

  getLastError(): string | null {
    return this.lastError;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Starts the local bot scheduler. Safe to call more than once. */
  start(): void {
    if (this.destroyed) return;
    this.schedule();
  }

  playCard(cardId: string, chosenColor?: CardColor, callUno?: boolean): void {
    this.humanAction((state) =>
      executePlayCard(state, this.humanId, cardId, chosenColor, callUno)
    );
  }

  drawCard(): void {
    this.humanAction((state) => executeDrawCard(state, this.humanId));
  }

  passTurn(): void {
    this.humanAction((state) => executePassTurn(state, this.humanId));
  }

  callUno(): void {
    this.humanAction((state) => executeCallUno(state, this.humanId));
  }

  catchUno(targetPlayerId: string): void {
    this.humanAction((state) =>
      executeCatchMissedUno(state, this.humanId, targetPlayerId)
    );
  }

  selectColor(color: CardColor): void {
    this.humanAction((state) => executeSelectColor(state, this.humanId, color));
  }

  challenge(): void {
    this.humanAction((state) => executeChallengeWildDrawFour(state, this.humanId));
  }

  acceptChallenge(): void {
    this.humanAction((state) => executeAcceptWildDrawFour(state, this.humanId));
  }

  /** Starts the next round or a fresh match after the summary screen. */
  nextRound(): void {
    if (this.destroyed) return;
    const isRound = this.state.phase === 'ROUND_FINISHED';
    const isMatch = this.state.phase === 'MATCH_FINISHED';
    if (!isRound && !isMatch) return;

    const startingScores = isRound
      ? Object.fromEntries(this.state.players.map((p) => [p.id, p.totalScore]))
      : {};
    this.state = createInitialGame({
      roomId: LOCAL_ROOM_ID,
      gameSessionId: `local-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`,
      players: this.state.players.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        isHost: p.isHost,
        isBot: p.isBot,
        botProfile: p.botProfile,
      })),
      rules: this.state.rules,
      scoringMode: this.state.scoringMode,
      roundNumber: isRound ? this.state.roundNumber + 1 : 1,
      startingScores,
      seed: Math.floor(Math.random() * 0xffffffff),
    });
    this.catchAttemptedVersion = -1;
    this.emit();
    this.schedule();
  }

  /** Clears timers and listeners; no card data is retained after this call. */
  destroy(): void {
    this.destroyed = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.listeners.clear();
  }

  private humanAction(
    action: (state: AuthoritativeGameState) => AuthoritativeGameState
  ): void {
    if (this.destroyed) return;
    try {
      this.state = action(this.state);
      this.lastError = null;
      this.catchAttemptedVersion = -1;
      this.emit();
      this.schedule();
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Move rejected';
      this.emit();
    }
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  /**
   * The player who currently owns a timed decision. Mirrors the engine's
   * `getTimedActor` so the local clock matches the deadline the UI renders.
   */
  private timedActor():
    | AuthoritativeGameState['players'][number]
    | undefined {
    const state = this.state;
    if (state.phase === 'WILD_COLOR_SELECTION') {
      return state.players.find(
        (p) => p.id === state.pendingWildSelection?.playerId
      );
    }
    if (state.phase === 'WILD_FOUR_CHALLENGE') {
      return state.players.find(
        (p) => p.id === state.pendingChallenge?.challengerPlayerId
      );
    }
    if (state.phase === 'ACTIVE_TURN' || state.phase === 'DRAW_DECISION') {
      return state.players[state.currentSeat];
    }
    return undefined;
  }

  /**
   * When the human owns a decision and the turn clock runs out, the local
   * controller autoplays once. The returned `version` makes the timer safe
   * against intervening state changes.
   */
  private humanTimeoutDue(): { delay: number; version: number } | null {
    if (this.destroyed || this.state.rules.turnTimerSeconds <= 0) return null;
    const actor = this.timedActor();
    if (!actor || actor.isBot || actor.id !== this.humanId) return null;

    const startedAt =
      this.state.phase === 'WILD_FOUR_CHALLENGE'
        ? this.state.pendingChallenge?.startedAt ??
          this.state.lastAction?.timestamp
        : this.state.lastAction?.timestamp;
    if (startedAt === undefined) return null;

    return {
      delay: Math.max(
        0,
        startedAt + this.state.rules.turnTimerSeconds * 1000 - Date.now()
      ),
      version: this.state.version,
    };
  }

  private botForCurrentAction(): {
    playerId: string;
    profile: BotProfile;
    kind: 'turn' | 'catch';
    targetPlayerId?: string;
  } | null {
    if (
      this.state.phase === 'ROUND_FINISHED' ||
      this.state.phase === 'MATCH_FINISHED'
    ) {
      return null;
    }

    // A bot may catch a missed UNO even when it is not their turn. Attempt the
    // catch only once per state version so a failed probability roll cannot
    // create a scheduling loop.
    if (
      this.catchAttemptedVersion !== this.state.version &&
      this.state.phase !== 'WILD_FOUR_CHALLENGE' &&
      this.state.phase !== 'WILD_COLOR_SELECTION'
    ) {
      const missed = this.state.players.find(
        (p) => p.hand.length === 1 && p.hasMissedUno && !p.unoDeclared
      );
      if (missed) {
        this.catchAttemptedVersion = this.state.version;
        const catcher = this.state.players.find(
          (p) => p.isBot && p.id !== missed.id
        );
        if (catcher) {
          const target = getBotCatchTarget(
            this.state,
            catcher.id,
            catcher.botProfile ?? DEFAULT_BOT_PROFILE
          );
          if (target) {
            return {
              playerId: catcher.id,
              profile: catcher.botProfile ?? DEFAULT_BOT_PROFILE,
              kind: 'catch',
              targetPlayerId: target,
            };
          }
        }
      }
    }

    let actor: AuthoritativeGameState['players'][number] | undefined;
    if (this.state.phase === 'WILD_COLOR_SELECTION') {
      actor = this.state.players.find(
        (p) => p.id === this.state.pendingWildSelection?.playerId
      );
    } else if (this.state.phase === 'WILD_FOUR_CHALLENGE') {
      actor = this.state.players.find(
        (p) => p.id === this.state.pendingChallenge?.challengerPlayerId
      );
    } else {
      actor = this.state.players[this.state.currentSeat];
    }

    if (!actor?.isBot) return null;
    return {
      playerId: actor.id,
      profile: actor.botProfile ?? DEFAULT_BOT_PROFILE,
      kind: 'turn',
    };
  }

  private schedule(): void {
    if (this.destroyed) return;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const bot = this.botForCurrentAction();
    const humanTimeout = bot ? null : this.humanTimeoutDue();
    if (!bot && !humanTimeout) return;

    const version = this.state.version;
    const actorId = bot ? bot.playerId : this.humanId;
    const profile = bot ? bot.profile : DEFAULT_BOT_PROFILE;
    const isCatch = bot?.kind === 'catch';
    const delay = bot
      ? this.options.botDelayMs !== undefined
        ? this.options.botDelayMs
        : getBotTurnDelay(bot.profile)
      : humanTimeout!.delay;

    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.destroyed || this.state.version !== version) return;

      // Verify the same actor still owns the action when the timer fires.
      if (bot) {
        const current = this.botForCurrentAction();
        if (
          !current ||
          current.playerId !== bot.playerId ||
          current.kind !== bot.kind ||
          current.targetPlayerId !== bot.targetPlayerId
        ) {
          this.schedule();
          return;
        }
      } else if (!this.humanTimeoutDue()) {
        this.schedule();
        return;
      }

      try {
        let next: AuthoritativeGameState;
        if (isCatch && bot) {
          next = executeCatchMissedUno(
            this.state,
            bot.playerId,
            bot.targetPlayerId!
          );
        } else {
          // The engine's own decision logic plays a legal card, draws when
          // nothing is playable, passes after a draw, picks a color and
          // resolves a challenge, so a timeout can never wedge the game.
          const decision = getBotDecision(this.state, actorId, profile);
          next = applyBotDecisionToState(this.state, actorId, decision);
        }
        this.state = next;
        this.lastError = null;
        this.catchAttemptedVersion = -1;
        this.emit();
        this.schedule();
      } catch (error) {
        // A bot must never freeze the game. Try one legal fallback, then stop
        // and surface the error instead of looping forever.
        this.lastError =
          error instanceof Error ? error.message : 'Bot decision rejected';
        try {
          let fallback: AuthoritativeGameState | null = null;
          if (this.state.phase === 'ACTIVE_TURN' && this.state.currentPlayerId === actorId) {
            fallback = executeDrawCard(this.state, actorId);
          } else if (
            this.state.phase === 'DRAW_DECISION' &&
            this.state.currentPlayerId === actorId
          ) {
            fallback = executePassTurn(this.state, actorId);
          } else if (
            this.state.phase === 'WILD_COLOR_SELECTION' &&
            this.state.pendingWildSelection?.playerId === actorId
          ) {
            fallback = executeSelectColor(this.state, actorId, 'RED');
          } else if (
            this.state.phase === 'WILD_FOUR_CHALLENGE' &&
            this.state.pendingChallenge?.challengerPlayerId === actorId
          ) {
            fallback = executeAcceptWildDrawFour(this.state, actorId);
          }
          if (fallback) {
            this.state = fallback;
            this.emit();
            this.schedule();
          } else {
            this.emit();
          }
        } catch {
          this.emit();
        }
      }
    }, Math.max(0, delay));
  }
}
