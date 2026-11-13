// src/lib/game-engine/scoring.ts
import { UnoCard } from '@/types';

/**
 * Calculates the score value of a set of cards:
 * - Number cards: face value (0-9)
 * - Skip, Reverse, Draw Two: 20 points
 * - Wild, Wild Draw Four: 50 points
 */
export function calculateHandScore(hand: UnoCard[]): number {
  return hand.reduce((total, card) => total + card.scoreValue, 0);
}

/**
 * Calculates points awarded to the round winner from opponents' hands.
 */
export function calculateWinnerPoints(
  winnerId: string,
  playerHands: Map<string, UnoCard[]> | Record<string, UnoCard[]>
): number {
  let points = 0;
  const entries =
    playerHands instanceof Map
      ? Array.from(playerHands.entries())
      : Object.entries(playerHands);

  for (const [playerId, hand] of entries) {
    if (playerId !== winnerId) {
      points += calculateHandScore(hand);
    }
  }

  return points;
}
