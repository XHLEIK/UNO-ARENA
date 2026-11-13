// src/lib/game-engine/validation.ts
import { CardColor, UnoCard } from '@/types';

/**
 * Checks if a card is legally playable on top of the current discard card and active color.
 */
export function isCardPlayable(
  card: UnoCard,
  activeColor: CardColor,
  topDiscard: UnoCard
): boolean {
  // Wild & Wild Draw Four can always be placed on the discard pile
  if (card.type === 'WILD' || card.type === 'WILD_DRAW_FOUR') {
    return true;
  }

  // Matches active color
  if (card.color === activeColor) {
    return true;
  }

  // Number card matching face value
  if (
    card.type === 'NUMBER' &&
    topDiscard.type === 'NUMBER' &&
    card.value !== null &&
    card.value === topDiscard.value
  ) {
    return true;
  }

  // Action card matching symbol/type (e.g. Blue Skip on Red Skip)
  if (card.type !== 'NUMBER' && card.type === topDiscard.type) {
    return true;
  }

  return false;
}

/**
 * Under official Mattel rules, a Wild Draw Four is legal if and only if
 * the player does NOT possess any card in hand that matches the current active color.
 */
export function canPlayWildDrawFourLegally(
  hand: UnoCard[],
  activeColor: CardColor
): boolean {
  return !hand.some((card) => card.color === activeColor);
}
