'use client';

import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  UnoCardRenderer,
  getCardLabel,
} from '@/components/card/UnoCardRenderer';
import { PlayableCard } from '@/types';

interface PlayerHandProps {
  hand: PlayableCard[];
  drawnCardId?: string | null;
  selectedCardId: string | null;
  isMyTurn: boolean;
  onCardClick: (card: PlayableCard) => void;
}

export const PlayerHand: React.FC<PlayerHandProps> = ({
  hand,
  drawnCardId,
  selectedCardId,
  isMyTurn,
  onCardClick,
}) => {
  const reduceMotion = useReducedMotion();
  const totalCards = hand.length;

  const overlap = useMemo(() => {
    if (totalCards <= 6) return -0.06;
    if (totalCards <= 9) return -0.18;
    if (totalCards <= 12) return -0.3;
    if (totalCards <= 16) return -0.42;
    if (totalCards <= 20) return -0.5;
    return -0.58;
  }, [totalCards]);

  if (totalCards === 0) {
    return <div className="hand-empty">No cards left in hand.</div>;
  }

  return (
    <div
      className="hand-scroller"
      role="group"
      data-my-turn={isMyTurn ? 'true' : undefined}
      aria-label={`Your hand, ${totalCards} ${totalCards === 1 ? 'card' : 'cards'}`}
    >
      <div
        className="hand-row"
        data-count={totalCards}
        style={{ '--hand-overlap': overlap } as React.CSSProperties}
      >
        {hand.map((card, index) => {
          const playable = isMyTurn && card.isPlayable;
          const selected = selectedCardId === card.id;
          const drawn = drawnCardId === card.id;
          const center = (totalCards - 1) / 2;
          const normalized = center === 0 ? 0 : (index - center) / center;
          const fan =
            totalCards <= 12 && !reduceMotion
              ? normalized * Math.min(5.5, 2 + totalCards * 0.4)
              : 0;
          const lift = selected ? -28 : drawn ? -14 : playable ? -8 : 0;

          return (
            <motion.button
              key={card.id}
              type="button"
              className="hand-card"
              data-hand-card-id={card.id}
              data-selected={selected ? 'true' : undefined}
              data-drawn={drawn ? 'true' : undefined}
              data-playable={playable ? 'true' : undefined}
              style={{ zIndex: index + 10 }}
              disabled={!playable}
              aria-label={`${getCardLabel(card)}${
                playable ? ', playable' : ', not playable'
              }`}
              aria-pressed={selected}
              onClick={() => onCardClick(card)}
              initial={false}
              animate={{
                y: lift,
                rotate: fan,
                scale: selected ? 1.045 : 1,
              }}
              whileHover={
                playable && !reduceMotion
                  ? { y: -24, rotate: fan * 0.45, scale: 1.04 }
                  : undefined
              }
              whileFocus={
                playable && !reduceMotion
                  ? { y: -24, rotate: fan * 0.45, scale: 1.04 }
                  : undefined
              }
              whileTap={playable && !reduceMotion ? { y: -12, scale: 0.99 } : undefined}
              transition={{
                type: 'spring',
                stiffness: 420,
                damping: 32,
                mass: 0.7,
              }}
            >
              <UnoCardRenderer
                card={card}
                size="hand"
                isPlayable={playable}
                isSelected={selected}
              />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
