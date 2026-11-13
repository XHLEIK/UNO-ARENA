// src/lib/game-engine/engine.ts
import {
  AuthoritativePlayer,
  AuthoritativeGameState,
  CardColor,
  UnoCard,
  GamePhase,
  TurnDirection,
  PublicGameState,
  PrivatePlayerState,
  RoomRulesConfig,
  ScoringMode,
  BotProfile,
  CARD_COLORS,
} from '@/types';
import { createClassicUnoDeck, shuffleDeck } from './cards';
import { isCardPlayable, canPlayWildDrawFourLegally } from './validation';
import { calculateHandScore, calculateWinnerPoints } from './scoring';

/**
 * Asserts all core game engine invariants.
 */
export function assertGameStateInvariants(state: AuthoritativeGameState): void {
  const totalCardsInHands = state.players.reduce(
    (sum: number, p: AuthoritativePlayer) => sum + p.hand.length,
    0
  );
  const totalCards =
    totalCardsInHands + state.drawPile.length + state.discardPile.length;

  if (totalCards !== 108) {
    throw new Error(
      `Invariant violation: Total cards = ${totalCards}, expected exactly 108`
    );
  }

  // Card ID uniqueness check
  const cardIdSet = new Set<string>();
  for (const card of state.drawPile) {
    if (cardIdSet.has(card.id)) throw new Error(`Duplicate card ID: ${card.id}`);
    cardIdSet.add(card.id);
  }
  for (const card of state.discardPile) {
    if (cardIdSet.has(card.id)) throw new Error(`Duplicate card ID: ${card.id}`);
    cardIdSet.add(card.id);
  }
  for (const p of state.players) {
    for (const card of p.hand) {
      if (cardIdSet.has(card.id)) throw new Error(`Duplicate card ID: ${card.id}`);
      cardIdSet.add(card.id);
    }
  }

  if (state.discardPile.length === 0) {
    throw new Error('Invariant violation: Discard pile cannot be empty');
  }

  if (state.currentSeat < 0 || state.currentSeat >= state.players.length) {
    throw new Error(
      `Invariant violation: Invalid current seat ${state.currentSeat}`
    );
  }
}

/**
 * Reshuffles the discard pile into the draw pile if the draw pile is low.
 */
function replenishDrawPileIfNeeded(
  drawPile: UnoCard[],
  discardPile: UnoCard[],
  neededCards: number
): { drawPile: UnoCard[]; discardPile: UnoCard[] } {
  if (drawPile.length >= neededCards) {
    return { drawPile, discardPile };
  }

  // Keep top discard card
  const top = discardPile[discardPile.length - 1];
  const cardsToReshuffle = discardPile.slice(0, -1);

  if (cardsToReshuffle.length === 0) {
    // No cards to reshuffle (all in hands)
    return { drawPile, discardPile };
  }

  const reshuffled = shuffleDeck(cardsToReshuffle);
  return {
    drawPile: [...drawPile, ...reshuffled],
    discardPile: [top],
  };
}

/**
 * Advances seat index by given steps in the current direction.
 */
export function getNextSeat(
  currentSeat: number,
  playerCount: number,
  direction: TurnDirection,
  steps: number = 1
): number {
  const delta = direction * steps;
  let next = (currentSeat + delta) % playerCount;
  if (next < 0) next += playerCount;
  return next;
}

/**
 * Initializes a new game session with 2 to 10 players.
 */
export function createInitialGame(params: {
  roomId: string;
  gameSessionId: string;
  players: {
    id: string;
    nickname: string;
    isHost: boolean;
    isBot?: boolean;
    botProfile?: BotProfile;
  }[];
  rules: RoomRulesConfig;
  scoringMode: ScoringMode;
  seed?: number;
  roundNumber?: number;
  startingScores?: Record<string, number>;
}): AuthoritativeGameState {
  const { roomId, gameSessionId, players: initialPlayers, rules, scoringMode, seed } =
    params;

  if (initialPlayers.length < 2 || initialPlayers.length > 10) {
    throw new Error('UNO requires between 2 and 10 players');
  }

  const rawDeck = createClassicUnoDeck();
  const shuffledDeck = shuffleDeck(rawDeck, seed);

  let drawPile = [...shuffledDeck];
  const discardPile: UnoCard[] = [];

  // Deal 7 cards to each player
  const players: AuthoritativePlayer[] = initialPlayers.map((p, idx) => {
    const hand = drawPile.splice(0, 7);
    return {
      id: p.id,
      nickname: p.nickname,
      seatNumber: idx,
      hand,
      unoDeclared: false,
      hasMissedUno: false,
      roundScore: 0,
      totalScore: params.startingScores?.[p.id] ?? 0,
      isConnected: true,
      isReady: true,
      isHost: p.isHost,
      isBot: p.isBot ?? false,
      botProfile: p.botProfile,
      isBotControlled: false,
    };
  });

  // Flip top card for Discard Pile (Wild Draw 4 is illegal as starter card per official rules)
  let topCardIndex = 0;
  while (drawPile[topCardIndex].type === 'WILD_DRAW_FOUR') {
    topCardIndex++;
    if (topCardIndex >= drawPile.length) {
      topCardIndex = 0;
      drawPile = shuffleDeck(drawPile);
    }
  }

  const [topDiscard] = drawPile.splice(topCardIndex, 1);
  discardPile.push(topDiscard);

  let currentSeat = 0;
  let direction: TurnDirection = 1;
  let activeColor: CardColor = topDiscard.color ?? 'RED';
  let phase: GamePhase = 'ACTIVE_TURN';

  // Apply Starter Card Rules (Mattel Classic UNO)
  if (topDiscard.type === 'SKIP') {
    currentSeat = getNextSeat(0, players.length, direction, 1);
  } else if (topDiscard.type === 'REVERSE') {
    direction = -1;
    if (players.length === 2) {
      // In 2-player UNO, Reverse acts like Skip
      currentSeat = 0;
    } else {
      currentSeat = getNextSeat(0, players.length, direction, 1);
    }
  } else if (topDiscard.type === 'DRAW_TWO') {
    const targetPlayer = players[0];
    const drawn = drawPile.splice(0, 2);
    targetPlayer.hand.push(...drawn);
    currentSeat = getNextSeat(0, players.length, direction, 1);
  } else if (topDiscard.type === 'WILD') {
    // Starter Wild: Player 0 chooses color
    activeColor = 'RED'; // Temporary default until chosen
  }

  const state: AuthoritativeGameState = {
    roomId,
    gameSessionId,
    version: 1,
    phase,
    currentPlayerId: players[currentSeat].id,
    currentSeat,
    direction,
    activeColor,
    topDiscard,
    drawPile,
    discardPile,
    players,
    rules,
    scoringMode,
    pendingStackCount: 0,
    drawnCardId: null,
    lastAction: {
      type: 'GAME_STARTED',
      playerId: 'system',
      message: `Game started with top card ${topDiscard.color ?? ''} ${topDiscard.type}`,
      card: topDiscard,
      timestamp: Date.now(),
    },
    roundNumber: params.roundNumber ?? 1,
  };

  assertGameStateInvariants(state);
  return state;
}

/**
 * Handles playing a card.
 */
export function executePlayCard(
  state: AuthoritativeGameState,
  playerId: string,
  cardId: string,
  chosenColor?: CardColor,
  callUno?: boolean
): AuthoritativeGameState {
  if (state.phase !== 'ACTIVE_TURN' && state.phase !== 'DRAW_DECISION') {
    throw new Error(`Cannot play card in phase ${state.phase}`);
  }

  if (state.currentPlayerId !== playerId) {
    throw new Error('Not your turn to play');
  }

  const player = state.players[state.currentSeat];
  const cardIndex = player.hand.findIndex((c: UnoCard) => c.id === cardId);
  if (cardIndex === -1) {
    throw new Error('Card not found in player hand');
  }

  // If in DRAW_DECISION, must play the card that was drawn
  if (state.phase === 'DRAW_DECISION' && state.drawnCardId && state.drawnCardId !== cardId) {
    throw new Error('You may only play the card you just drawn or pass');
  }

  const card = player.hand[cardIndex];

  // House rule: while a +2 stack is pending, only another +2 may be played.
  const mustStack =
    state.rules.stackingEnabled && (state.pendingStackCount ?? 0) > 0;
  if (mustStack && card.type !== 'DRAW_TWO') {
    throw new Error(
      `You must stack a +2 or draw ${state.pendingStackCount} cards`
    );
  }

  if (!isCardPlayable(card, state.activeColor, state.topDiscard)) {
    throw new Error(
      `Card ${card.color ?? ''} ${card.type} cannot be played on ${state.activeColor} ${state.topDiscard.type}`
    );
  }

  // Clone state
  const newState: AuthoritativeGameState = JSON.parse(JSON.stringify(state));
  const newPlayer = newState.players[newState.currentSeat];

  // Record if play was legal for Wild Draw 4 challenge
  const wasWildDrawFourLegal =
    card.type === 'WILD_DRAW_FOUR'
      ? canPlayWildDrawFourLegally(newPlayer.hand, newState.activeColor)
      : true;

  // Remove card from hand and place on discard pile
  newPlayer.hand.splice(cardIndex, 1);
  newState.discardPile.push(card);
  newState.topDiscard = card;
  newState.drawnCardId = null;

  // UNO checking: if entering 1 card state
  if (newPlayer.hand.length === 1) {
    if (callUno) {
      newPlayer.unoDeclared = true;
      newPlayer.hasMissedUno = false;
    } else {
      newPlayer.unoDeclared = false;
      newPlayer.hasMissedUno = true; // Catch window opened!
    }
  } else {
    newPlayer.unoDeclared = false;
    newPlayer.hasMissedUno = false;
  }

  // Clear previous player catch window when this player took action
  for (let i = 0; i < newState.players.length; i++) {
    if (i !== newState.currentSeat) {
      newState.players[i].hasMissedUno = false;
    }
  }

  // Check Round Win condition
  if (newPlayer.hand.length === 0) {
    return handleRoundVictory(newState, newPlayer.id);
  }

  let skippedPlayerId: string | undefined;

  // Process Card Action Effects
  if (card.type === 'NUMBER') {
    newState.activeColor = card.color!;
    newState.currentSeat = getNextSeat(
      newState.currentSeat,
      newState.players.length,
      newState.direction,
      1
    );
    newState.currentPlayerId = newState.players[newState.currentSeat].id;
    newState.phase = 'ACTIVE_TURN';
  } else if (card.type === 'SKIP') {
    newState.activeColor = card.color!;
    const skippedSeat = getNextSeat(
      newState.currentSeat,
      newState.players.length,
      newState.direction,
      1
    );
    skippedPlayerId = newState.players[skippedSeat].id;
    newState.currentSeat = getNextSeat(
      newState.currentSeat,
      newState.players.length,
      newState.direction,
      2
    );
    newState.currentPlayerId = newState.players[newState.currentSeat].id;
    newState.phase = 'ACTIVE_TURN';
  } else if (card.type === 'REVERSE') {
    newState.activeColor = card.color!;
    newState.direction = (newState.direction * -1) as TurnDirection;

    if (newState.players.length === 2) {
      // In 2-player UNO, Reverse functions as Skip
      const skippedSeat = getNextSeat(
        newState.currentSeat,
        newState.players.length,
        newState.direction,
        1
      );
      skippedPlayerId = newState.players[skippedSeat].id;
      newState.currentSeat = getNextSeat(
        newState.currentSeat,
        newState.players.length,
        newState.direction,
        2
      );
    } else {
      newState.currentSeat = getNextSeat(
        newState.currentSeat,
        newState.players.length,
        newState.direction,
        1
      );
    }
    newState.currentPlayerId = newState.players[newState.currentSeat].id;
    newState.phase = 'ACTIVE_TURN';
  } else if (card.type === 'DRAW_TWO') {
    newState.activeColor = card.color!;
    const nextSeat = getNextSeat(
      newState.currentSeat,
      newState.players.length,
      newState.direction,
      1
    );

    if (newState.rules.stackingEnabled) {
      // +2 stacks: the next player must stack another +2 or draw the whole pile.
      newState.pendingStackCount = (newState.pendingStackCount ?? 0) + 2;
    } else {
      const victim = newState.players[nextSeat];
      const replenished = replenishDrawPileIfNeeded(
        newState.drawPile,
        newState.discardPile,
        2
      );
      newState.drawPile = replenished.drawPile;
      newState.discardPile = replenished.discardPile;

      const drawn = newState.drawPile.splice(0, 2);
      victim.hand.push(...drawn);
      victim.unoDeclared = false;
      victim.hasMissedUno = false;
      newState.pendingStackCount = 0;
    }

    // Victim is skipped without stacking; with stacking they get a response turn.
    newState.currentSeat = newState.rules.stackingEnabled
      ? nextSeat
      : getNextSeat(
          nextSeat,
          newState.players.length,
          newState.direction,
          1
        );
    newState.currentPlayerId = newState.players[newState.currentSeat].id;
    newState.phase = 'ACTIVE_TURN';
  } else if (card.type === 'WILD') {
    if (chosenColor && CARD_COLORS.includes(chosenColor)) {
      newState.activeColor = chosenColor;
      newState.currentSeat = getNextSeat(
        newState.currentSeat,
        newState.players.length,
        newState.direction,
        1
      );
      newState.currentPlayerId = newState.players[newState.currentSeat].id;
      newState.phase = 'ACTIVE_TURN';
    } else {
      newState.phase = 'WILD_COLOR_SELECTION';
      newState.pendingWildSelection = {
        playerId,
        isDrawFour: false,
        startedAt: Date.now(),
      };
    }
  } else if (card.type === 'WILD_DRAW_FOUR') {
    const nextSeat = getNextSeat(
      newState.currentSeat,
      newState.players.length,
      newState.direction,
      1
    );
    const challenger = newState.players[nextSeat];

    if (chosenColor && CARD_COLORS.includes(chosenColor)) {
      newState.activeColor = chosenColor;
    }

    newState.phase = 'WILD_FOUR_CHALLENGE';
    newState.pendingChallenge = {
      challengedPlayerId: playerId,
      challengerPlayerId: challenger.id,
      previousColor: state.activeColor,
      timeLimitMs: 15000,
      startedAt: Date.now(),
      wasLegal: wasWildDrawFourLegal,
    };
  }

  newState.version += 1;
  newState.lastAction = {
    type: 'CARD_PLAYED',
    playerId,
    message: `${newPlayer.nickname} played ${card.color ?? ''} ${card.type}`,
    card,
    timestamp: Date.now(),
    skippedPlayerId,
  };

  assertGameStateInvariants(newState);
  return newState;
}

/**
 * Handles drawing a card.
 */
export function executeDrawCard(
  state: AuthoritativeGameState,
  playerId: string
): AuthoritativeGameState {
  if (state.phase !== 'ACTIVE_TURN') {
    throw new Error(`Cannot draw card in phase ${state.phase}`);
  }

  if (state.currentPlayerId !== playerId) {
    throw new Error('Not your turn to draw');
  }

  const newState: AuthoritativeGameState = JSON.parse(JSON.stringify(state));
  const player = newState.players[newState.currentSeat];

  // +2 stack response: drawing takes the whole pending pile and ends the turn.
  if (newState.rules.stackingEnabled && (newState.pendingStackCount ?? 0) > 0) {
    const pending = newState.pendingStackCount!;
    const replenished = replenishDrawPileIfNeeded(
      newState.drawPile,
      newState.discardPile,
      pending
    );
    newState.drawPile = replenished.drawPile;
    newState.discardPile = replenished.discardPile;

    const drawn = newState.drawPile.splice(0, pending);
    player.hand.push(...drawn);
    player.unoDeclared = false;
    player.hasMissedUno = false;
    newState.pendingStackCount = 0;
    for (const p of newState.players) p.hasMissedUno = false;

    newState.currentSeat = getNextSeat(
      newState.currentSeat,
      newState.players.length,
      newState.direction,
      1
    );
    newState.currentPlayerId = newState.players[newState.currentSeat].id;
    newState.phase = 'ACTIVE_TURN';
    newState.drawnCardId = null;
    newState.version += 1;
    newState.lastAction = {
      type: 'STACKING_APPLIED',
      playerId,
      message: `${player.nickname} drew ${drawn.length} stacked cards`,
      timestamp: Date.now(),
    };

    assertGameStateInvariants(newState);
    return newState;
  }

  // Replenish draw pile if needed
  const replenished = replenishDrawPileIfNeeded(
    newState.drawPile,
    newState.discardPile,
    1
  );
  newState.drawPile = replenished.drawPile;
  newState.discardPile = replenished.discardPile;

  if (newState.drawPile.length === 0) {
    // If no cards left in deck or discard, pass turn gracefully
    newState.currentSeat = getNextSeat(
      newState.currentSeat,
      newState.players.length,
      newState.direction,
      1
    );
    newState.currentPlayerId = newState.players[newState.currentSeat].id;
    newState.version += 1;
    return newState;
  }

  const [drawnCard] = newState.drawPile.splice(0, 1);
  player.hand.push(drawnCard);
  player.unoDeclared = false;
  player.hasMissedUno = false;
  // Drawing ends any outstanding missed-UNO catch window.
  for (const p of newState.players) p.hasMissedUno = false;

  // Check if drawn card is immediately playable
  if (isCardPlayable(drawnCard, newState.activeColor, newState.topDiscard)) {
    newState.phase = 'DRAW_DECISION';
    newState.drawnCardId = drawnCard.id;
  } else {
    // Not playable: turn ends immediately
    newState.phase = 'ACTIVE_TURN';
    newState.drawnCardId = null;
    newState.currentSeat = getNextSeat(
      newState.currentSeat,
      newState.players.length,
      newState.direction,
      1
    );
    newState.currentPlayerId = newState.players[newState.currentSeat].id;
  }

  newState.version += 1;
  newState.lastAction = {
    type: 'CARD_DRAWN',
    playerId,
    message: `${player.nickname} drew a card`,
    timestamp: Date.now(),
  };

  assertGameStateInvariants(newState);
  return newState;
}

/**
 * Handles passing turn after drawing a card.
 */
export function executePassTurn(
  state: AuthoritativeGameState,
  playerId: string
): AuthoritativeGameState {
  if (state.phase !== 'DRAW_DECISION') {
    throw new Error('Can only pass after drawing a card');
  }

  if (state.currentPlayerId !== playerId) {
    throw new Error('Not your turn to pass');
  }

  const newState: AuthoritativeGameState = JSON.parse(JSON.stringify(state));
  newState.phase = 'ACTIVE_TURN';
  newState.drawnCardId = null;
  for (const p of newState.players) p.hasMissedUno = false;
  newState.currentSeat = getNextSeat(
    newState.currentSeat,
    newState.players.length,
    newState.direction,
    1
  );
  newState.currentPlayerId = newState.players[newState.currentSeat].id;
  newState.version += 1;

  newState.lastAction = {
    type: 'PASS_TURN',
    playerId,
    message: `${newState.players[state.currentSeat].nickname} passed their turn`,
    timestamp: Date.now(),
  };

  assertGameStateInvariants(newState);
  return newState;
}

/**
 * Handles calling UNO.
 */
export function executeCallUno(
  state: AuthoritativeGameState,
  playerId: string
): AuthoritativeGameState {
  const player = state.players.find((p: AuthoritativePlayer) => p.id === playerId);
  if (!player) throw new Error('Player not found');
  if (player.hand.length > 2) {
    throw new Error('You can only call UNO with 1 or 2 cards left');
  }
  if (player.unoDeclared) {
    throw new Error('UNO already declared');
  }

  const newState: AuthoritativeGameState = JSON.parse(JSON.stringify(state));
  const newPlayer = newState.players.find((p: AuthoritativePlayer) => p.id === playerId)!;

  newPlayer.unoDeclared = true;
  newPlayer.hasMissedUno = false;
  newState.version += 1;

  newState.lastAction = {
    type: 'UNO_DECLARED',
    playerId,
    message: `🎉 ${newPlayer.nickname} declared UNO!`,
    timestamp: Date.now(),
  };

  return newState;
}

/**
 * Catches an opponent who failed to declare UNO when entering a 1-card hand.
 * Penalty: target draws 2 cards!
 */
export function executeCatchMissedUno(
  state: AuthoritativeGameState,
  catcherPlayerId: string,
  targetPlayerId: string
): AuthoritativeGameState {
  const targetPlayer = state.players.find((p: AuthoritativePlayer) => p.id === targetPlayerId);
  if (!targetPlayer) throw new Error('Target player not found');

  if (targetPlayer.hand.length !== 1) {
    throw new Error('Player does not have exactly 1 card');
  }

  if (targetPlayer.unoDeclared) {
    throw new Error('Player already declared UNO');
  }

  if (!targetPlayer.hasMissedUno) {
    throw new Error('Catch window has expired');
  }

  if (catcherPlayerId === targetPlayerId) {
    throw new Error('You cannot catch yourself');
  }

  const newState: AuthoritativeGameState = JSON.parse(JSON.stringify(state));
  const newTarget = newState.players.find((p: AuthoritativePlayer) => p.id === targetPlayerId)!;
  const catcher = newState.players.find((p: AuthoritativePlayer) => p.id === catcherPlayerId);

  // Replenish draw pile if needed
  const replenished = replenishDrawPileIfNeeded(
    newState.drawPile,
    newState.discardPile,
    2
  );
  newState.drawPile = replenished.drawPile;
  newState.discardPile = replenished.discardPile;

  const penaltyCards = newState.drawPile.splice(0, 2);
  newTarget.hand.push(...penaltyCards);
  newTarget.hasMissedUno = false;
  newTarget.unoDeclared = false;
  newState.version += 1;

  newState.lastAction = {
    type: 'UNO_CAUGHT',
    playerId: catcherPlayerId,
    message: `🚨 ${catcher?.nickname ?? 'An opponent'} caught ${newTarget.nickname} without calling UNO! (+2 cards)`,
    timestamp: Date.now(),
  };

  assertGameStateInvariants(newState);
  return newState;
}

/**
 * Handles selecting active color for Wild / Wild Draw Four.
 */
export function executeSelectColor(
  state: AuthoritativeGameState,
  playerId: string,
  color: CardColor
): AuthoritativeGameState {
  if (state.phase !== 'WILD_COLOR_SELECTION') {
    throw new Error(`Cannot select color in phase ${state.phase}`);
  }

  if (state.pendingWildSelection?.playerId !== playerId) {
    throw new Error('Not authorized to select color');
  }

  if (!CARD_COLORS.includes(color)) {
    throw new Error('Invalid card color');
  }

  const newState: AuthoritativeGameState = JSON.parse(JSON.stringify(state));
  newState.activeColor = color;
  newState.phase = 'ACTIVE_TURN';
  newState.pendingWildSelection = undefined;
  for (const p of newState.players) p.hasMissedUno = false;

  newState.currentSeat = getNextSeat(
    newState.currentSeat,
    newState.players.length,
    newState.direction,
    1
  );
  newState.currentPlayerId = newState.players[newState.currentSeat].id;
  newState.version += 1;

  newState.lastAction = {
    type: 'WILD_COLOR_SELECTED',
    playerId,
    message: `${newState.players[state.currentSeat].nickname} chose color ${color}`,
    timestamp: Date.now(),
  };

  assertGameStateInvariants(newState);
  return newState;
}

/**
 * Resolves a Wild Draw Four Challenge.
 */
export function executeChallengeWildDrawFour(
  state: AuthoritativeGameState,
  challengerPlayerId: string
): AuthoritativeGameState {
  if (state.phase !== 'WILD_FOUR_CHALLENGE' || !state.pendingChallenge) {
    throw new Error('No active challenge');
  }

  if (state.pendingChallenge.challengerPlayerId !== challengerPlayerId) {
    throw new Error('Only the next player may challenge');
  }

  const newState: AuthoritativeGameState = JSON.parse(JSON.stringify(state));
  const challenged = newState.players.find(
    (p: AuthoritativePlayer) => p.id === state.pendingChallenge!.challengedPlayerId
  )!;
  const challenger = newState.players.find(
    (p: AuthoritativePlayer) => p.id === challengerPlayerId
  )!;

  const wasIllegal = !state.pendingChallenge.wasLegal;

  if (wasIllegal) {
    // Challenge SUCCESSFUL: Challenged player was bluffing!
    // Challenged player draws 4 cards. Challenger draws 0 and continues turn.
    const replenished = replenishDrawPileIfNeeded(
      newState.drawPile,
      newState.discardPile,
      4
    );
    newState.drawPile = replenished.drawPile;
    newState.discardPile = replenished.discardPile;

    const penalty = newState.drawPile.splice(0, 4);
    challenged.hand.push(...penalty);
    challenged.unoDeclared = false;

    // Challenger keeps turn
    newState.currentSeat = challenger.seatNumber;
    newState.currentPlayerId = challenger.id;
    newState.phase = 'ACTIVE_TURN';

    newState.lastAction = {
      type: 'WILD_FOUR_CHALLENGE_RESOLVED',
      playerId: challengerPlayerId,
      message: `🎯 Challenge SUCCESSFUL! ${challenged.nickname} had matching cards and draws 4 cards!`,
      timestamp: Date.now(),
    };
  } else {
    // Challenge FAILED: Play was legal!
    // Challenger draws 6 cards (4 + 2 penalty) and loses their turn.
    const replenished = replenishDrawPileIfNeeded(
      newState.drawPile,
      newState.discardPile,
      6
    );
    newState.drawPile = replenished.drawPile;
    newState.discardPile = replenished.discardPile;

    const penalty = newState.drawPile.splice(0, 6);
    challenger.hand.push(...penalty);
    challenger.unoDeclared = false;

    // Challenger loses turn
    newState.currentSeat = getNextSeat(
      challenger.seatNumber,
      newState.players.length,
      newState.direction,
      1
    );
    newState.currentPlayerId = newState.players[newState.currentSeat].id;
    newState.phase = 'ACTIVE_TURN';

    newState.lastAction = {
      type: 'WILD_FOUR_CHALLENGE_RESOLVED',
      playerId: challengerPlayerId,
      message: `❌ Challenge FAILED! ${challenged.nickname}'s play was legal. ${challenger.nickname} draws 6 cards!`,
      timestamp: Date.now(),
    };
  }

  newState.pendingChallenge = undefined;
  newState.version += 1;
  assertGameStateInvariants(newState);
  return newState;
}

/**
 * Accepts Wild Draw Four without challenge (+4 cards and loses turn).
 */
export function executeAcceptWildDrawFour(
  state: AuthoritativeGameState,
  acceptingPlayerId: string
): AuthoritativeGameState {
  if (state.phase !== 'WILD_FOUR_CHALLENGE' || !state.pendingChallenge) {
    throw new Error('No active challenge');
  }

  if (state.pendingChallenge.challengerPlayerId !== acceptingPlayerId) {
    throw new Error('Only the target player can accept');
  }

  const newState: AuthoritativeGameState = JSON.parse(JSON.stringify(state));
  const victim = newState.players.find((p: AuthoritativePlayer) => p.id === acceptingPlayerId)!;

  const replenished = replenishDrawPileIfNeeded(
    newState.drawPile,
    newState.discardPile,
    4
  );
  newState.drawPile = replenished.drawPile;
  newState.discardPile = replenished.discardPile;

  const drawn = newState.drawPile.splice(0, 4);
  victim.hand.push(...drawn);
  victim.unoDeclared = false;

  // Victim's turn is skipped
  newState.currentSeat = getNextSeat(
    victim.seatNumber,
    newState.players.length,
    newState.direction,
    1
  );
  newState.currentPlayerId = newState.players[newState.currentSeat].id;
  newState.phase = 'ACTIVE_TURN';
  newState.pendingChallenge = undefined;
  newState.version += 1;

  newState.lastAction = {
    type: 'WILD_FOUR_CHALLENGE_RESOLVED',
    playerId: acceptingPlayerId,
    message: `${victim.nickname} accepted +4 cards`,
    timestamp: Date.now(),
  };

  assertGameStateInvariants(newState);
  return newState;
}

/**
 * Handles round completion and score tallying.
 */
function handleRoundVictory(
  state: AuthoritativeGameState,
  winnerId: string
): AuthoritativeGameState {
  const winner = state.players.find((p: AuthoritativePlayer) => p.id === winnerId)!;
  const points = calculateWinnerPoints(
    winnerId,
    new Map(state.players.map((p: AuthoritativePlayer) => [p.id, p.hand]))
  );

  winner.roundScore = points;
  winner.totalScore += points;

  state.winnerPlayerId = winnerId;

  if (state.scoringMode === 'SINGLE_ROUND') {
    state.phase = 'MATCH_FINISHED';
    state.matchWinnerId = winnerId;
  } else {
    // Cumulative Mode B
    if (winner.totalScore >= state.rules.targetScore) {
      state.phase = 'MATCH_FINISHED';
      state.matchWinnerId = winnerId;
    } else {
      state.phase = 'ROUND_FINISHED';
    }
  }

  state.lastAction = {
    type: state.phase === 'MATCH_FINISHED' ? 'MATCH_FINISHED' : 'ROUND_FINISHED',
    playerId: winnerId,
    message: `🏆 ${winner.nickname} won the ${state.phase === 'MATCH_FINISHED' ? 'Match' : 'Round'} with +${points} points!`,
    timestamp: Date.now(),
  };

  return state;
}

function getTimedActor(state: AuthoritativeGameState): AuthoritativePlayer | undefined {
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
 * Serializes public game state (strictly omitting private card information).
 */
export function getPublicGameState(
  state: AuthoritativeGameState
): PublicGameState {
  const timedActor = getTimedActor(state);
  const activeSince = state.lastAction?.timestamp;
  const hasTurnDeadline = Boolean(
    timedActor &&
      !timedActor.isBot &&
      timedActor.isConnected &&
      activeSince !== undefined
  );
  const serverNow = hasTurnDeadline ? Date.now() : undefined;

  return {
    roomId: state.roomId,
    gameSessionId: state.gameSessionId,
    version: state.version,
    phase: state.phase,
    currentPlayerId: state.currentPlayerId,
    currentSeat: state.currentSeat,
    direction: state.direction,
    activeColor: state.activeColor,
    topDiscard: state.topDiscard,
    drawPileCount: state.drawPile.length,
    discardPileCount: state.discardPile.length,
    recentDiscard: state.discardPile.slice(-4),
    players: state.players.map((p: AuthoritativePlayer) => ({
      id: p.id,
      nickname: p.nickname,
      seatNumber: p.seatNumber,
      cardCount: p.hand.length,
      isConnected: p.isConnected,
      isReady: p.isReady,
      isHost: p.isHost,
      isBot: p.isBot,
      botProfile: p.botProfile,
      isBotControlled: p.isBotControlled,
      unoDeclared: p.unoDeclared,
      hasMissedUno: p.hasMissedUno,
      roundScore: p.roundScore,
      totalScore: p.totalScore,
    })),
    pendingChallenge: state.pendingChallenge
      ? {
          challengedPlayerId: state.pendingChallenge.challengedPlayerId,
          challengerPlayerId: state.pendingChallenge.challengerPlayerId,
          previousColor: state.pendingChallenge.previousColor,
          timeLimitMs: state.pendingChallenge.timeLimitMs,
          startedAt: state.pendingChallenge.startedAt,
        }
      : undefined,
    pendingWildSelection: state.pendingWildSelection,
    pendingStackCount: state.pendingStackCount,
    lastAction: state.lastAction,
    roundNumber: state.roundNumber,
    scoringMode: state.scoringMode,
    targetScore: state.rules.targetScore,
    turnTimerSeconds: state.rules.turnTimerSeconds,
    turnDeadline: hasTurnDeadline
      ? activeSince! + state.rules.turnTimerSeconds * 1000
      : undefined,
    serverNow,
    winnerPlayerId: state.winnerPlayerId,
    matchWinnerId: state.matchWinnerId,
  };
}

/**
 * Serializes private player state (hand with playability flags).
 */
export function getPrivatePlayerState(
  state: AuthoritativeGameState,
  playerId: string
): PrivatePlayerState {
  const player = state.players.find((p: AuthoritativePlayer) => p.id === playerId);
  if (!player) {
    throw new Error('Player not found in game session');
  }

  const isCurrentTurn = state.currentPlayerId === playerId;
  const isDrawPhase = state.phase === 'DRAW_DECISION';

  const handWithPlayable = player.hand.map((card: UnoCard) => {
    let isPlayable = false;
    if (isCurrentTurn) {
      if (isDrawPhase) {
        isPlayable = card.id === state.drawnCardId;
      } else if (state.phase === 'ACTIVE_TURN') {
        isPlayable = isCardPlayable(card, state.activeColor, state.topDiscard);
      }
    }
    return {
      ...card,
      isPlayable,
    };
  });

  return {
    playerId,
    hand: handWithPlayable,
    unoDeclared: player.unoDeclared,
    canCallUno: isCurrentTurn && player.hand.length === 2,
    canDraw: isCurrentTurn && state.phase === 'ACTIVE_TURN',
    canPass: isCurrentTurn && isDrawPhase,
    isCurrentTurn,
    drawnCardId: state.drawnCardId,
  };
}
