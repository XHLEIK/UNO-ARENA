'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  UnoCardRenderer,
  getCardLabel,
} from '@/components/card/UnoCardRenderer';
import { UnoCard } from '@/types';

interface DiscardCardStackProps {
  cards: UnoCard[];
  maxVisible?: number;
}

/** Alternating hand-thrown positions create the criss-cross stack. */
const BASE_LAYOUT = [
  { x: -11, y: 7, rotate: -13 },
  { x: 12, y: -6, rotate: 11 },
  { x: -8, y: -8, rotate: 9 },
  { x: 10, y: 8, rotate: -10 },
];

function cardHash(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function cardPlacement(id: string, index: number, total: number) {
  const hash = cardHash(id);
  const drift = ((hash % 11) - 5) * 0.55;
  const isTop = index === total - 1;

  if (isTop) {
    return {
      x: drift * 0.6,
      y: -1,
      rotate: drift * 0.8,
      scale: 1,
      zIndex: 60,
      isTop: true,
    };
  }

  const base = BASE_LAYOUT[index % BASE_LAYOUT.length];
  return {
    x: base.x + drift * 0.7,
    y: base.y + drift * 0.45,
    rotate: base.rotate + drift * 0.9,
    scale: 0.985,
    zIndex: index + 1,
    isTop: false,
  };
}

export const DiscardCardStack: React.FC<DiscardCardStackProps> = ({
  cards,
  maxVisible = 4,
}) => {
  const reduceMotion = useReducedMotion();
  const visibleCards = cards.slice(-maxVisible);

  return (
    <div className="discard-stack" data-discard-target="true" aria-hidden="true">
      {visibleCards.map((card, index) => {
        const { x, y, rotate, scale, zIndex, isTop } = cardPlacement(
          card.id,
          index,
          visibleCards.length
        );

        return (
          <motion.div
            key={card.id}
            className="discard-stack-card"
            data-top={isTop ? 'true' : undefined}
            style={{ zIndex }}
            initial={
              reduceMotion
                ? false
                : {
                    x: 18,
                    y: -34,
                    rotate: rotate - 20,
                    scale: 1.08,
                    opacity: 0,
                  }
            }
            animate={{ x, y, rotate, scale, opacity: isTop ? 1 : 0.82 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 26,
              mass: 0.7,
            }}
          >
            <UnoCardRenderer card={card} size="hand" />
          </motion.div>
        );
      })}
    </div>
  );
};

export function discardStackLabel(cards: UnoCard[]): string {
  const top = cards[cards.length - 1];
  return top ? getCardLabel(top) : 'empty discard pile';
}
