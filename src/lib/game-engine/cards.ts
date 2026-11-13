// src/lib/game-engine/cards.ts
import { CardColor, UnoCard, CARD_COLORS } from '@/types';

/**
 * Creates the official 108-card Classic Mattel UNO deck.
 *
 * Exact breakdown:
 * - 4 zeros: 1 per color (4)
 * - 72 numbers 1-9: 2 copies per color (18 * 4 = 72)
 * - 8 Skips: 2 copies per color (8)
 * - 8 Reverses: 2 copies per color (8)
 * - 8 Draw Twos: 2 copies per color (8)
 * - 4 Wilds (4)
 * - 4 Wild Draw Fours (4)
 * Total: 4 + 72 + 8 + 8 + 8 + 4 + 4 = 108 cards.
 */
export function createClassicUnoDeck(): UnoCard[] {
  const deck: UnoCard[] = [];

  for (const color of CARD_COLORS) {
    const colorLower = color.toLowerCase();

    // 1 zero card per color
    deck.push({
      id: `c_${colorLower}_0_1`,
      color,
      type: 'NUMBER',
      value: 0,
      scoreValue: 0,
    });

    // 2 copies each of numbers 1-9
    for (let val = 1; val <= 9; val++) {
      for (let copy = 1; copy <= 2; copy++) {
        deck.push({
          id: `c_${colorLower}_${val}_${copy}`,
          color,
          type: 'NUMBER',
          value: val,
          scoreValue: val,
        });
      }
    }

    // 2 Skip cards per color
    for (let copy = 1; copy <= 2; copy++) {
      deck.push({
        id: `c_${colorLower}_skip_${copy}`,
        color,
        type: 'SKIP',
        value: null,
        scoreValue: 20,
      });
    }

    // 2 Reverse cards per color
    for (let copy = 1; copy <= 2; copy++) {
      deck.push({
        id: `c_${colorLower}_reverse_${copy}`,
        color,
        type: 'REVERSE',
        value: null,
        scoreValue: 20,
      });
    }

    // 2 Draw Two (+2) cards per color
    for (let copy = 1; copy <= 2; copy++) {
      deck.push({
        id: `c_${colorLower}_draw2_${copy}`,
        color,
        type: 'DRAW_TWO',
        value: null,
        scoreValue: 20,
      });
    }
  }

  // 4 Wild cards
  for (let copy = 1; copy <= 4; copy++) {
    deck.push({
      id: `c_wild_${copy}`,
      color: null,
      type: 'WILD',
      value: null,
      scoreValue: 50,
    });
  }

  // 4 Wild Draw Four cards
  for (let copy = 1; copy <= 4; copy++) {
    deck.push({
      id: `c_wild_draw4_${copy}`,
      color: null,
      type: 'WILD_DRAW_FOUR',
      value: null,
      scoreValue: 50,
    });
  }

  return deck;
}

/**
 * Deterministic PRNG using Mulberry32 for testing.
 */
function createMulberry32(seed: number): () => number {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates shuffle algorithm.
 */
export function shuffleDeck(deck: UnoCard[], seed?: number): UnoCard[] {
  const shuffled = [...deck];
  const rand = seed !== undefined ? createMulberry32(seed) : Math.random;

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }

  return shuffled;
}
