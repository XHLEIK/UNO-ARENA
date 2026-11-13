// src/lib/game-engine/__tests__/engine.test.ts
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createClassicUnoDeck, shuffleDeck } from '../cards';
import { isCardPlayable, canPlayWildDrawFourLegally } from '../validation';
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
  assertGameStateInvariants,
  getNextSeat,
  getPublicGameState,
} from '../engine';
import { UnoCard } from '@/types';

describe('1. Classic UNO 108-Card Inventory & Factory', () => {
  it('generates exactly 108 cards with unique IDs', () => {
    const deck = createClassicUnoDeck();
    expect(deck).toHaveLength(108);

    const ids = new Set(deck.map((c) => c.id));
    expect(ids.size).toBe(108);

    // 4 zeros (1 each of Red, Blue, Green, Yellow)
    const zeros = deck.filter((c) => c.type === 'NUMBER' && c.value === 0);
    expect(zeros).toHaveLength(4);

    // 72 numbers (1-9, 2 each per color = 18 * 4 = 72)
    const numbers = deck.filter(
      (c) => c.type === 'NUMBER' && c.value !== null && c.value >= 1 && c.value <= 9
    );
    expect(numbers).toHaveLength(72);

    // 8 Skips (2 per color)
    const skips = deck.filter((c) => c.type === 'SKIP');
    expect(skips).toHaveLength(8);

    // 8 Reverses (2 per color)
    const reverses = deck.filter((c) => c.type === 'REVERSE');
    expect(reverses).toHaveLength(8);

    // 8 Draw Twos (2 per color)
    const drawTwos = deck.filter((c) => c.type === 'DRAW_TWO');
    expect(drawTwos).toHaveLength(8);

    // 4 Wilds
    const wilds = deck.filter((c) => c.type === 'WILD');
    expect(wilds).toHaveLength(4);

    // 4 Wild Draw Fours
    const wildDrawFours = deck.filter((c) => c.type === 'WILD_DRAW_FOUR');
    expect(wildDrawFours).toHaveLength(4);

    // Total color counts: 25 each
    for (const color of ['RED', 'BLUE', 'GREEN', 'YELLOW'] as const) {
      const colorCards = deck.filter((c) => c.color === color);
      expect(colorCards).toHaveLength(25);
    }
  });

  it('preserves all cards during deterministic shuffle', () => {
    const deck = createClassicUnoDeck();
    const shuffled1 = shuffleDeck(deck, 42);
    const shuffled2 = shuffleDeck(deck, 42);

    expect(shuffled1).toHaveLength(108);
    expect(shuffled1.map((c) => c.id)).toEqual(shuffled2.map((c) => c.id));
  });
});

describe('2. Move Validation', () => {
  const blueFive: UnoCard = { id: 'b5', color: 'BLUE', type: 'NUMBER', value: 5, scoreValue: 5 };
  const redFive: UnoCard = { id: 'r5', color: 'RED', type: 'NUMBER', value: 5, scoreValue: 5 };
  const blueSkip: UnoCard = { id: 'bs', color: 'BLUE', type: 'SKIP', value: null, scoreValue: 20 };
  const redSkip: UnoCard = { id: 'rs', color: 'RED', type: 'SKIP', value: null, scoreValue: 20 };
  const yellowSeven: UnoCard = { id: 'y7', color: 'YELLOW', type: 'NUMBER', value: 7, scoreValue: 7 };
  const wildCard: UnoCard = { id: 'w1', color: null, type: 'WILD', value: null, scoreValue: 50 };
  const wildDrawFour: UnoCard = { id: 'wd4', color: null, type: 'WILD_DRAW_FOUR', value: null, scoreValue: 50 };

  it('validates matching color, matching number, and matching action symbol', () => {
    // Matching color
    expect(isCardPlayable(blueSkip, 'BLUE', blueFive)).toBe(true);
    // Matching number on different color
    expect(isCardPlayable(redFive, 'BLUE', blueFive)).toBe(true);
    // Matching action on different color
    expect(isCardPlayable(redSkip, 'BLUE', blueSkip)).toBe(true);
    // Wild is always playable
    expect(isCardPlayable(wildCard, 'BLUE', blueFive)).toBe(true);
    expect(isCardPlayable(wildDrawFour, 'BLUE', blueFive)).toBe(true);
    // Non-matching card
    expect(isCardPlayable(yellowSeven, 'BLUE', blueFive)).toBe(false);
  });

  it('validates Wild Draw Four challenge legality', () => {
    // If player holds BLUE cards, playing Wild Draw 4 on active BLUE is illegal
    expect(canPlayWildDrawFourLegally([blueFive, yellowSeven], 'BLUE')).toBe(false);
    // If player holds no BLUE cards, play is legal
    expect(canPlayWildDrawFourLegally([redFive, yellowSeven, wildCard], 'BLUE')).toBe(true);
  });
});

describe('3. Game Setup & Initial Dealing', () => {
  it('deals 7 cards to each of 4 players and sets valid starter discard', () => {
    const game = createInitialGame({
      roomId: 'room_1',
      gameSessionId: 'session_1',
      players: [
        { id: 'p1', nickname: 'Alice', isHost: true },
        { id: 'p2', nickname: 'Bob', isHost: false },
        { id: 'p3', nickname: 'Charlie', isHost: false },
        { id: 'p4', nickname: 'Diana', isHost: false },
      ],
      rules: { stackingEnabled: false, turnTimerSeconds: 30, botGracePeriodSeconds: 30, targetScore: 500 },
      scoringMode: 'SINGLE_ROUND',
      seed: 12345,
    });

    expect(game.players).toHaveLength(4);
    for (const p of game.players) {
      expect(p.hand).toHaveLength(7);
    }
    expect(game.discardPile).toHaveLength(1);
    expect(game.drawPile.length).toBe(108 - 28 - 1); // 79
    expect(game.topDiscard.type).not.toBe('WILD_DRAW_FOUR');
    assertGameStateInvariants(game);
  });

  it('serializes only the four most recent discard cards', () => {
    const game = createInitialGame({
      roomId: 'room_public',
      gameSessionId: 'session_public',
      players: [
        { id: 'p1', nickname: 'Alice', isHost: true },
        { id: 'p2', nickname: 'Bob', isHost: false },
      ],
      rules: { stackingEnabled: false, turnTimerSeconds: 30, botGracePeriodSeconds: 30, targetScore: 500 },
      scoringMode: 'SINGLE_ROUND',
      seed: 12345,
    });

    const extra = game.drawPile.splice(0, 3);
    game.discardPile.push(...extra);
    game.topDiscard = extra[extra.length - 1];

    const publicState = getPublicGameState(game);
    expect(publicState.recentDiscard).toHaveLength(4);
    expect(publicState.recentDiscard?.map((card) => card.id)).toEqual(
      game.discardPile.slice(-4).map((card) => card.id)
    );
    expect(publicState.recentDiscard?.at(-1)?.id).toBe(game.topDiscard.id);
    expect(publicState.discardPileCount).toBe(4);
  });

  it('serializes a turn deadline only for a connected human actor', () => {
    const game = createInitialGame({
      roomId: 'room_timer',
      gameSessionId: 'session_timer',
      players: [
        { id: 'p1', nickname: 'Alice', isHost: true },
        { id: 'p2', nickname: 'Bob', isHost: false },
      ],
      rules: { stackingEnabled: false, turnTimerSeconds: 30, botGracePeriodSeconds: 30, targetScore: 500 },
      scoringMode: 'SINGLE_ROUND',
      seed: 12345,
    });
    game.currentSeat = 0;
    game.currentPlayerId = 'p1';
    game.phase = 'ACTIVE_TURN';
    game.players[0].isConnected = true;
    game.lastAction = {
      type: 'TEST',
      playerId: 'p1',
      message: '',
      timestamp: 1_000,
    };

    const publicState = getPublicGameState(game);
    expect(publicState.turnTimerSeconds).toBe(30);
    expect(publicState.turnDeadline).toBe(31_000);
    expect(publicState.serverNow).toBeTypeOf('number');

    game.players[0].isBot = true;
    expect(getPublicGameState(game).turnDeadline).toBeUndefined();

    game.players[0].isBot = false;
    game.players[0].isConnected = false;
    expect(getPublicGameState(game).turnDeadline).toBeUndefined();
  });

  it('handles 2-player Reverse as Skip', () => {
    expect(getNextSeat(0, 2, 1, 2)).toBe(0); // Player 0 goes again
  });
});

describe('4. Turn Progression & Card Actions', () => {
  const createTestGame = (playerCount = 3) => {
    return createInitialGame({
      roomId: 'room_test',
      gameSessionId: 'session_test',
      players: Array.from({ length: playerCount }, (_, i) => ({
        id: `p${i + 1}`,
        nickname: `Player ${i + 1}`,
        isHost: i === 0,
      })),
      rules: { stackingEnabled: false, turnTimerSeconds: 30, botGracePeriodSeconds: 30, targetScore: 500 },
      scoringMode: 'SINGLE_ROUND',
      seed: 999,
    });
  };

  it('executes Skip card correctly', () => {
    const game = createTestGame(3);
    const p1 = game.players[0];
    const skipIndex = game.drawPile.findIndex((c: UnoCard) => c.type === 'SKIP');
    const [realSkip] = game.drawPile.splice(skipIndex, 1);
    const [replaced] = p1.hand.splice(0, 1, realSkip);
    game.drawPile.push(replaced);

    game.activeColor = realSkip.color!;
    game.topDiscard.color = realSkip.color;

    const nextState = executePlayCard(game, 'p1', realSkip.id);
    // In a 3-player game, p1 skips p2 -> p3's turn
    expect(nextState.currentPlayerId).toBe('p3');
    expect(nextState.lastAction?.skippedPlayerId).toBe('p2');
    expect(nextState.activeColor).toBe(realSkip.color);
    assertGameStateInvariants(nextState);
  });

  it('serializes the skipped player for two-player Reverse', () => {
    const game = createTestGame(2);
    game.currentSeat = 0;
    game.currentPlayerId = 'p1';
    game.phase = 'ACTIVE_TURN';
    game.direction = 1;

    const p1 = game.players[0];
    const reverseIndex = game.drawPile.findIndex(
      (c: UnoCard) => c.type === 'REVERSE'
    );
    const [reverse] = game.drawPile.splice(reverseIndex, 1);
    const [replaced] = p1.hand.splice(0, 1, reverse);
    game.drawPile.push(replaced);

    game.activeColor = reverse.color!;
    game.topDiscard.color = reverse.color;

    const nextState = executePlayCard(game, 'p1', reverse.id);
    expect(nextState.direction).toBe(-1);
    expect(nextState.currentPlayerId).toBe('p1');
    expect(nextState.lastAction?.skippedPlayerId).toBe('p2');
    assertGameStateInvariants(nextState);
  });

  it('executes Draw Two card correctly', () => {
    const game = createTestGame(3);
    const p1 = game.players[0];
    const p2 = game.players[1];
    const initialP2HandSize = p2.hand.length;

    const d2Index = game.drawPile.findIndex((c: UnoCard) => c.type === 'DRAW_TWO');
    const [realD2] = game.drawPile.splice(d2Index, 1);
    const [replaced] = p1.hand.splice(0, 1, realD2);
    game.drawPile.push(replaced);

    game.activeColor = realD2.color!;
    game.topDiscard.color = realD2.color;

    const nextState = executePlayCard(game, 'p1', realD2.id);
    // p2 draws 2 cards and is skipped -> p3's turn
    expect(nextState.players[1].hand.length).toBe(initialP2HandSize + 2);
    expect(nextState.currentPlayerId).toBe('p3');
    assertGameStateInvariants(nextState);
  });
});

describe('5. Wild Draw Four Challenges', () => {
  it('penalizes challenged player 4 cards if challenge succeeds (illegal play)', () => {
    const game = createInitialGame({
      roomId: 'room_c',
      gameSessionId: 'sess_c',
      players: [
        { id: 'p1', nickname: 'Alice', isHost: true },
        { id: 'p2', nickname: 'Bob', isHost: false },
      ],
      rules: { stackingEnabled: false, turnTimerSeconds: 30, botGracePeriodSeconds: 30, targetScore: 500 },
      scoringMode: 'SINGLE_ROUND',
      seed: 777,
    });

    game.currentSeat = 0;
    game.currentPlayerId = 'p1';

    // Find a Wild Draw 4 from deck
    const wd4Idx = game.drawPile.findIndex((c: UnoCard) => c.type === 'WILD_DRAW_FOUR');
    const [wd4] = game.drawPile.splice(wd4Idx, 1);
    const [p1OldCard] = game.players[0].hand.splice(0, 1, wd4);
    game.drawPile.push(p1OldCard);

    // Make sure p1 holds a card matching active color (making play illegal)
    const activeColor = game.players[0].hand.find((c: UnoCard) => c.color !== null)?.color ?? 'RED';
    game.activeColor = activeColor;
    game.topDiscard.color = activeColor;

    const p1CardCountBefore = game.players[0].hand.length;
    const stateAfterPlay = executePlayCard(game, 'p1', wd4.id, 'BLUE');
    expect(stateAfterPlay.phase).toBe('WILD_FOUR_CHALLENGE');

    // Bob challenges Alice
    const stateAfterChallenge = executeChallengeWildDrawFour(stateAfterPlay, 'p2');
    // Alice held activeColor card, so challenge succeeded! Alice draws 4 cards
    expect(stateAfterChallenge.players[0].hand.length).toBe(p1CardCountBefore - 1 + 4);
    expect(stateAfterChallenge.currentPlayerId).toBe('p2');
    assertGameStateInvariants(stateAfterChallenge);
  });

  it('penalizes challenger 6 cards if challenge fails (legal play)', () => {
    const game = createInitialGame({
      roomId: 'room_c2',
      gameSessionId: 'sess_c2',
      players: [
        { id: 'p1', nickname: 'Alice', isHost: true },
        { id: 'p2', nickname: 'Bob', isHost: false },
      ],
      rules: { stackingEnabled: false, turnTimerSeconds: 30, botGracePeriodSeconds: 30, targetScore: 500 },
      scoringMode: 'SINGLE_ROUND',
      seed: 888,
    });

    game.currentSeat = 0;
    game.currentPlayerId = 'p1';

    // Put a Wild Draw 4 in p1's hand
    const wd4Idx = game.drawPile.findIndex((c: UnoCard) => c.type === 'WILD_DRAW_FOUR');
    const [wd4] = game.drawPile.splice(wd4Idx, 1);
    const [p1Old] = game.players[0].hand.splice(0, 1, wd4);
    game.drawPile.push(p1Old);

    // Swap all other cards in p1's hand to RED cards from draw pile
    for (let i = 1; i < game.players[0].hand.length; i++) {
      const redIdx = game.drawPile.findIndex((c: UnoCard) => c.color === 'RED');
      if (redIdx !== -1) {
        const [redCard] = game.drawPile.splice(redIdx, 1);
        const [old] = game.players[0].hand.splice(i, 1, redCard);
        game.drawPile.push(old);
      }
    }

    // Set activeColor to YELLOW (p1 holds only RED cards + wd4, so p1 has zero YELLOW cards -> play is LEGAL!)
    game.activeColor = 'YELLOW';
    game.topDiscard.color = 'YELLOW';

    const initialBobCards = game.players[1].hand.length;
    const stateAfterPlay = executePlayCard(game, 'p1', wd4.id, 'RED');

    // Bob challenges Alice
    const stateAfterChallenge = executeChallengeWildDrawFour(stateAfterPlay, 'p2');
    // Challenge failed: Bob draws 6 cards (4 + 2 penalty)
    expect(stateAfterChallenge.players[1].hand.length).toBe(initialBobCards + 6);
    assertGameStateInvariants(stateAfterChallenge);
  });
});

describe('6. UNO Declaration & Catch Penalties', () => {
  it('allows opponents to catch a missed UNO and inflicts 2-card penalty', () => {
    const game = createInitialGame({
      roomId: 'room_uno',
      gameSessionId: 'sess_uno',
      players: [
        { id: 'p1', nickname: 'Alice', isHost: true },
        { id: 'p2', nickname: 'Bob', isHost: false },
      ],
      rules: { stackingEnabled: false, turnTimerSeconds: 30, botGracePeriodSeconds: 30, targetScore: 500 },
      scoringMode: 'SINGLE_ROUND',
      seed: 111,
    });

    game.currentSeat = 0;
    game.currentPlayerId = 'p1';

    // Move cards from Alice to draw pile so Alice has exactly 2 cards
    while (game.players[0].hand.length > 2) {
      const removed = game.players[0].hand.pop()!;
      game.drawPile.push(removed);
    }

    // Make sure Alice's first card is playable
    const cardToPlay = game.players[0].hand[0];
    if (cardToPlay.color) {
      game.activeColor = cardToPlay.color;
      game.topDiscard.color = cardToPlay.color;
    }

    const stateAfterPlay = executePlayCard(game, 'p1', cardToPlay.id, undefined, false);
    expect(stateAfterPlay.players[0].hand).toHaveLength(1);
    expect(stateAfterPlay.players[0].hasMissedUno).toBe(true);

    // Bob catches Alice!
    const stateAfterCatch = executeCatchMissedUno(stateAfterPlay, 'p2', 'p1');
    // Alice penalized with 2 cards
    expect(stateAfterCatch.players[0].hand).toHaveLength(3);
    expect(stateAfterCatch.players[0].hasMissedUno).toBe(false);
    assertGameStateInvariants(stateAfterCatch);
  });
});

describe('7. +2 Stacking House Rule', () => {
  const createStackingGame = () =>
    createInitialGame({
      roomId: 'room_stack',
      gameSessionId: 'sess_stack',
      players: [
        { id: 'p1', nickname: 'Alice', isHost: true },
        { id: 'p2', nickname: 'Bob', isHost: false },
        { id: 'p3', nickname: 'Charlie', isHost: false },
      ],
      rules: {
        stackingEnabled: true,
        turnTimerSeconds: 30,
        botGracePeriodSeconds: 30,
        targetScore: 500,
      },
      scoringMode: 'SINGLE_ROUND',
      seed: 4242,
    });

  // Swap a card of the requested type/color into a player's hand.
  const injectCard = (
    game: ReturnType<typeof createInitialGame>,
    playerIndex: number,
    type: UnoCard['type'],
    color?: UnoCard['color'],
    excludeId?: string
  ): UnoCard => {
    const matches = (c: UnoCard) =>
      c.type === type && (!color || c.color === color) && c.id !== excludeId;

    let card: UnoCard | undefined;
    let sourceIndex = -1;

    const drawIndex = game.drawPile.findIndex(matches);
    if (drawIndex !== -1) {
      card = game.drawPile.splice(drawIndex, 1)[0];
    } else {
      for (let i = 0; i < game.players.length; i++) {
        const handIndex = game.players[i].hand.findIndex(matches);
        if (handIndex !== -1) {
          card = game.players[i].hand.splice(handIndex, 1)[0];
          sourceIndex = i;
          break;
        }
      }
    }

    if (!card) throw new Error(`No ${color ?? 'any'} ${type} left in play`);
    if (sourceIndex === playerIndex) return card;

    const [old] = game.players[playerIndex].hand.splice(0, 1, card);
    game.drawPile.push(old);
    return card;
  };

  const removeType = (
    game: ReturnType<typeof createInitialGame>,
    playerIndex: number,
    type: UnoCard['type']
  ) => {
    const hand = game.players[playerIndex].hand;
    for (let i = hand.length - 1; i >= 0; i--) {
      if (hand[i].type === type) {
        const [card] = hand.splice(i, 1);
        game.drawPile.push(card);
      }
    }
  };

  it('rejects a non-+2 card while a stack is pending and accepts the draw', () => {
    const game = createStackingGame();
    removeType(game, 1, 'DRAW_TWO');
    const redTwo = injectCard(game, 0, 'DRAW_TWO', 'RED');
    game.activeColor = 'RED';
    game.topDiscard.color = 'RED';

    const afterFirst = executePlayCard(game, 'p1', redTwo.id);
    expect(afterFirst.pendingStackCount).toBe(2);
    expect(afterFirst.currentPlayerId).toBe('p2');

    let p2Red = afterFirst.players[1].hand.find(
      (c) => c.color === 'RED' && c.type !== 'DRAW_TWO'
    );
    if (!p2Red) {
      p2Red = injectCard(afterFirst, 1, 'NUMBER', 'RED');
    }

    expect(() => executePlayCard(afterFirst, 'p2', p2Red!.id)).toThrow(/must stack/i);

    const before = afterFirst.players[1].hand.length;
    const afterDraw = executeDrawCard(afterFirst, 'p2');
    expect(afterDraw.pendingStackCount).toBe(0);
    expect(afterDraw.players[1].hand.length).toBe(before + 2);
    expect(afterDraw.currentPlayerId).toBe('p3');
    assertGameStateInvariants(afterDraw);
  });

  it('accumulates +2s and makes the next player draw the whole pile', () => {
    const game = createStackingGame();
    removeType(game, 2, 'DRAW_TWO');
    const first = injectCard(game, 0, 'DRAW_TWO', 'RED');
    const second = injectCard(game, 1, 'DRAW_TWO', 'RED', first.id);
    game.activeColor = 'RED';
    game.topDiscard.color = 'RED';

    const afterFirst = executePlayCard(game, 'p1', first.id);
    const afterSecond = executePlayCard(afterFirst, 'p2', second.id);
    expect(afterSecond.pendingStackCount).toBe(4);
    expect(afterSecond.currentPlayerId).toBe('p3');

    const before = afterSecond.players[2].hand.length;
    const afterDraw = executeDrawCard(afterSecond, 'p3');
    expect(afterDraw.players[2].hand.length).toBe(before + 4);
    expect(afterDraw.pendingStackCount).toBe(0);
    expect(afterDraw.currentPlayerId).toBe('p1');
    assertGameStateInvariants(afterDraw);
  });
});

describe('8. UNO Call & Catch Window', () => {
  const createUnoGame = () =>
    createInitialGame({
      roomId: 'room_uno_window',
      gameSessionId: 'sess_uno_window',
      players: [
        { id: 'p1', nickname: 'Alice', isHost: true },
        { id: 'p2', nickname: 'Bob', isHost: false },
        { id: 'p3', nickname: 'Charlie', isHost: false },
      ],
      rules: {
        stackingEnabled: false,
        turnTimerSeconds: 30,
        botGracePeriodSeconds: 30,
        targetScore: 500,
      },
      scoringMode: 'SINGLE_ROUND',
      seed: 5150,
    });

  it('only allows UNO calls with one or two cards left', () => {
    const game = createUnoGame();
    while (game.players[0].hand.length > 3) {
      game.drawPile.push(game.players[0].hand.pop()!);
    }

    expect(() => executeCallUno(game, 'p1')).toThrow(/1 or 2 cards/i);

    game.drawPile.push(game.players[0].hand.pop()!);
    const called = executeCallUno(game, 'p1');
    expect(called.players[0].hand).toHaveLength(2);
    expect(called.players[0].unoDeclared).toBe(true);
    expect(() => executeCallUno(called, 'p1')).toThrow(/already declared/i);
  });

  it('rejects self-catch and closes the window after the next draw', () => {
    const game = createUnoGame();
    game.currentSeat = 0;
    game.currentPlayerId = 'p1';

    while (game.players[0].hand.length > 2) {
      game.drawPile.push(game.players[0].hand.pop()!);
    }
    const cardToPlay = game.players[0].hand[0];
    if (cardToPlay.color) {
      game.activeColor = cardToPlay.color;
      game.topDiscard.color = cardToPlay.color;
    }

    const afterPlay = executePlayCard(game, 'p1', cardToPlay.id, undefined, false);
    expect(afterPlay.players[0].hasMissedUno).toBe(true);
    expect(() => executeCatchMissedUno(afterPlay, 'p1', 'p1')).toThrow(/yourself/i);

    const afterDraw = executeDrawCard(afterPlay, 'p2');
    expect(afterDraw.players[0].hasMissedUno).toBe(false);
    expect(() => executeCatchMissedUno(afterDraw, 'p3', 'p1')).toThrow(/expired/i);
  });
});

describe('9. Property-Based Testing with fast-check', () => {
  it('strictly preserves the 108 card conservation invariant across random valid action sequences', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100000 }), (seed) => {
        const game = createInitialGame({
          roomId: 'room_fc',
          gameSessionId: 'sess_fc',
          players: [
            { id: 'p1', nickname: 'Player 1', isHost: true },
            { id: 'p2', nickname: 'Player 2', isHost: false },
            { id: 'p3', nickname: 'Player 3', isHost: false },
          ],
          rules: { stackingEnabled: false, turnTimerSeconds: 30, botGracePeriodSeconds: 30, targetScore: 500 },
          scoringMode: 'SINGLE_ROUND',
          seed,
        });

        assertGameStateInvariants(game);

        // Perform 5 simulated turns
        let current = game;
        for (let step = 0; step < 5; step++) {
          if (current.phase === 'MATCH_FINISHED' || current.phase === 'ROUND_FINISHED') break;

          const player = current.players[current.currentSeat];
          const playable = player.hand.find((c: UnoCard) =>
            isCardPlayable(c, current.activeColor, current.topDiscard)
          );

          if (current.phase === 'ACTIVE_TURN') {
            if (playable) {
              current = executePlayCard(
                current,
                player.id,
                playable.id,
                'RED',
                player.hand.length === 2
              );
            } else {
              current = executeDrawCard(current, player.id);
            }
          } else if (current.phase === 'DRAW_DECISION') {
            current = executePassTurn(current, player.id);
          } else if (current.phase === 'WILD_COLOR_SELECTION') {
            current = executeSelectColor(current, current.pendingWildSelection!.playerId, 'BLUE');
          } else if (current.phase === 'WILD_FOUR_CHALLENGE') {
            current = executeAcceptWildDrawFour(current, current.pendingChallenge!.challengerPlayerId);
          }

          assertGameStateInvariants(current);
        }
      }),
      { numRuns: 50 }
    );
  });
});
