// src/types/index.ts

export type CardColor = 'RED' | 'BLUE' | 'GREEN' | 'YELLOW';
export const CARD_COLORS: CardColor[] = ['RED', 'BLUE', 'GREEN', 'YELLOW'];

export type CardType =
  | 'NUMBER'
  | 'SKIP'
  | 'REVERSE'
  | 'DRAW_TWO'
  | 'WILD'
  | 'WILD_DRAW_FOUR';

export interface UnoCard {
  id: string; // Unique physical identifier, e.g. "c_red_7_1"
  color: CardColor | null; // null for Wild and Wild Draw Four before selection
  type: CardType;
  value: number | null; // 0-9 for NUMBER, null otherwise
  scoreValue: number; // 0-9 for numbers, 20 for skip/reverse/draw2, 50 for wild/wildDraw4
}

export type GamePhase =
  | 'WAITING_FOR_PLAYERS'
  | 'LOBBY'
  | 'STARTING'
  | 'ACTIVE_TURN'
  | 'DRAW_DECISION'
  | 'UNO_CATCH_WINDOW'
  | 'WILD_COLOR_SELECTION'
  | 'WILD_FOUR_CHALLENGE'
  | 'ROUND_FINISHED'
  | 'MATCH_FINISHED'
  | 'PAUSED'
  | 'RECOVERING';

export type TurnDirection = 1 | -1; // 1: Clockwise, -1: Counter-Clockwise
export type ScoringMode = 'SINGLE_ROUND' | 'CUMULATIVE';

export type BotDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type BotPersonality =
  | 'STRATEGIST'
  | 'AGGRESSOR'
  | 'DEFENSIVE'
  | 'UNPREDICTABLE'
  | 'BALANCED';

export interface BotProfile {
  difficulty: BotDifficulty;
  personality: BotPersonality;
}

export interface RoomRulesConfig {
  stackingEnabled: boolean;
  turnTimerSeconds: number;
  botGracePeriodSeconds: number;
  targetScore: number;
}

export interface AuthoritativePlayer {
  id: string;
  nickname: string;
  seatNumber: number;
  hand: UnoCard[];
  unoDeclared: boolean;
  hasMissedUno: boolean;
  roundScore: number;
  totalScore: number;
  isConnected: boolean;
  isReady: boolean;
  isHost: boolean;
  isBot: boolean;
  botProfile?: BotProfile;
  isBotControlled?: boolean;
}

export interface AuthoritativeGameState {
  roomId: string;
  gameSessionId: string;
  version: number;
  phase: GamePhase;
  currentPlayerId: string;
  currentSeat: number;
  direction: TurnDirection;
  activeColor: CardColor;
  topDiscard: UnoCard;
  drawPile: UnoCard[];
  discardPile: UnoCard[];
  players: AuthoritativePlayer[];
  rules: RoomRulesConfig;
  scoringMode: ScoringMode;
  pendingChallenge?: {
    challengedPlayerId: string;
    challengerPlayerId: string;
    previousColor: CardColor;
    timeLimitMs: number;
    startedAt: number;
    wasLegal: boolean;
  };
  pendingWildSelection?: {
    playerId: string;
    isDrawFour: boolean;
    startedAt: number;
  };
  pendingStackCount?: number;
  drawnCardId?: string | null;
  lastAction?: {
    type: string;
    playerId: string;
    message: string;
    card?: UnoCard;
    timestamp: number;
    /** Authoritative result of a Skip (or two-player Reverse). */
    skippedPlayerId?: string;
  };
  roundNumber: number;
  winnerPlayerId?: string;
  matchWinnerId?: string;
}

export interface PlayerPublicInfo {
  id: string;
  nickname: string;
  seatNumber: number;
  cardCount: number;
  isConnected: boolean;
  isReady: boolean;
  isHost: boolean;
  isBot: boolean;
  botProfile?: BotProfile;
  isBotControlled?: boolean;
  unoDeclared: boolean;
  hasMissedUno: boolean;
  roundScore: number;
  totalScore: number;
}

export interface PendingChallengeState {
  challengedPlayerId: string;
  challengerPlayerId: string;
  previousColor: CardColor;
  timeLimitMs: number;
  startedAt: number;
}

export interface PendingWildSelectionState {
  playerId: string;
  isDrawFour: boolean;
  startedAt: number;
}

export interface PublicGameState {
  roomId: string;
  gameSessionId: string;
  version: number;
  phase: GamePhase;
  currentPlayerId: string;
  currentSeat: number;
  direction: TurnDirection;
  activeColor: CardColor;
  topDiscard: UnoCard;
  drawPileCount: number;
  discardPileCount: number;
  recentDiscard?: UnoCard[];
  players: PlayerPublicInfo[];
  pendingChallenge?: PendingChallengeState;
  pendingWildSelection?: PendingWildSelectionState;
  pendingStackCount?: number;
  lastAction?: {
    type: string;
    playerId: string;
    message: string;
    card?: UnoCard;
    timestamp: number;
    /** Authoritative result of a Skip (or two-player Reverse). */
    skippedPlayerId?: string;
  };
  roundNumber: number;
  scoringMode: ScoringMode;
  targetScore: number;
  turnTimerSeconds: number;
  /** Server clock deadline for the active human actor, when one is enforced. */
  turnDeadline?: number;
  /** Server clock at serialization, used to keep the countdown honest. */
  serverNow?: number;
  winnerPlayerId?: string;
  matchWinnerId?: string;
}

export interface PlayableCard extends UnoCard {
  isPlayable: boolean;
}

export interface PrivatePlayerState {
  playerId: string;
  hand: PlayableCard[];
  unoDeclared: boolean;
  canCallUno: boolean;
  canDraw: boolean;
  canPass: boolean;
  isCurrentTurn: boolean;
  drawnCardId?: string | null;
}

export type GameCommandType =
  | 'CREATE_ROOM'
  | 'JOIN_ROOM'
  | 'LEAVE_ROOM'
  | 'PLAYER_READY'
  | 'START_GAME'
  | 'PLAY_CARD'
  | 'DRAW_CARD'
  | 'PASS_TURN'
  | 'CALL_UNO'
  | 'CATCH_MISSED_UNO'
  | 'SELECT_COLOR'
  | 'CHALLENGE_WILD_DRAW_FOUR'
  | 'ACCEPT_WILD_DRAW_FOUR'
  | 'RECONNECT_PLAYER'
  | 'REQUEST_GAME_STATE';

export interface BaseCommand<TType extends GameCommandType, TPayload> {
  commandId: string;
  roomId: string;
  playerId: string;
  expectedVersion: number;
  type: TType;
  payload: TPayload;
}

export type PlayCardCommand = BaseCommand<
  'PLAY_CARD',
  {
    cardId: string;
    callUno?: boolean;
    chosenColor?: CardColor;
  }
>;

export type DrawCardCommand = BaseCommand<'DRAW_CARD', Record<string, never>>;
export type PassTurnCommand = BaseCommand<'PASS_TURN', Record<string, never>>;
export type CallUnoCommand = BaseCommand<'CALL_UNO', Record<string, never>>;
export type CatchMissedUnoCommand = BaseCommand<
  'CATCH_MISSED_UNO',
  {
    targetPlayerId: string;
  }
>;

export type SelectColorCommand = BaseCommand<
  'SELECT_COLOR',
  {
    color: CardColor;
  }
>;

export type ChallengeWildDrawFourCommand = BaseCommand<
  'CHALLENGE_WILD_DRAW_FOUR',
  Record<string, never>
>;

export type AcceptWildDrawFourCommand = BaseCommand<
  'ACCEPT_WILD_DRAW_FOUR',
  Record<string, never>
>;

export type GameCommand =
  | PlayCardCommand
  | DrawCardCommand
  | PassTurnCommand
  | CallUnoCommand
  | CatchMissedUnoCommand
  | SelectColorCommand
  | ChallengeWildDrawFourCommand
  | AcceptWildDrawFourCommand;

export type RealtimeEventType =
  | 'ROOM_PLAYER_JOINED'
  | 'ROOM_PLAYER_LEFT'
  | 'ROOM_PLAYER_READY'
  | 'GAME_STARTED'
  | 'TURN_CHANGED'
  | 'CARD_PLAYED'
  | 'CARD_DRAWN'
  | 'UNO_DECLARED'
  | 'UNO_MISSED'
  | 'UNO_CAUGHT'
  | 'WILD_COLOR_SELECTED'
  | 'WILD_FOUR_CHALLENGE_STARTED'
  | 'WILD_FOUR_CHALLENGE_RESOLVED'
  | 'STACKING_APPLIED'
  | 'ROUND_FINISHED'
  | 'MATCH_FINISHED'
  | 'PLAYER_RECONNECTED'
  | 'PLAYER_DISCONNECTED'
  | 'GAME_STATE_RECOVERED';

export interface RealtimeEvent<TPayload = any> {
  eventId: string;
  roomId: string;
  gameSessionId: string;
  gameVersion: number;
  sequenceNumber: number;
  timestamp: string;
  type: RealtimeEventType;
  payload: TPayload;
}
