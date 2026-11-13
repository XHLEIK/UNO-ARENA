'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FastForward } from 'lucide-react';
import { UnoCardRenderer } from '@/components/card/UnoCardRenderer';
import { buildDealSequence, OPENING_HAND_SIZE } from '@/lib/game/dealing';
import { PrivatePlayerState, PublicGameState } from '@/types';

export interface TablePoint {
  x: number;
  y: number;
}

interface GameStartSequenceProps {
  isOpen: boolean;
  publicState: PublicGameState;
  privateState: PrivatePlayerState | null;
  myPlayerId: string;
  seatPoints: Record<string, TablePoint>;
  onComplete: () => void;
}

const DEAL_STEP_MS = 46;
const FINISH_DELAY_MS = 360;
const VISIBLE_CARDS = 9;

export const GameStartSequence: React.FC<GameStartSequenceProps> = ({
  isOpen,
  publicState,
  privateState,
  myPlayerId,
  seatPoints,
  onComplete,
}) => {
  const reduceMotion = useReducedMotion();
  const [revealed, setRevealed] = useState(0);
  const finishedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const steps = useMemo(
    () => buildDealSequence(publicState, privateState, myPlayerId),
    [publicState, privateState, myPlayerId]
  );

  useEffect(() => {
    if (!isOpen) return;

    if (reduceMotion) {
      if (!finishedRef.current) {
        finishedRef.current = true;
        onCompleteRef.current();
      }
      return;
    }

    let completed = 0;
    let finishTimer: number | undefined;
    const interval = window.setInterval(() => {
      completed += 1;
      setRevealed(completed);
      if (completed >= steps.length) {
        window.clearInterval(interval);
        finishTimer = window.setTimeout(() => {
          if (!finishedRef.current) {
            finishedRef.current = true;
            onCompleteRef.current();
          }
        }, FINISH_DELAY_MS);
      }
    }, DEAL_STEP_MS);

    return () => {
      window.clearInterval(interval);
      if (finishTimer) window.clearTimeout(finishTimer);
    };
  }, [isOpen, reduceMotion, steps.length]);

  if (!isOpen) return null;

  const visibleSteps = steps.slice(
    Math.max(0, revealed - VISIBLE_CARDS),
    revealed
  );

  return (
    <motion.div
      className="deal-layer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div className="deal-caption" aria-live="polite">
        Dealing {OPENING_HAND_SIZE} cards · Round {publicState.roundNumber}
      </div>
      <button
        type="button"
        className="deal-skip icon-button"
        onClick={() => {
          if (!finishedRef.current) {
            finishedRef.current = true;
            onCompleteRef.current();
          }
        }}
        aria-label="Skip dealing animation"
        title="Skip deal"
      >
        <FastForward className="h-4 w-4" aria-hidden="true" />
      </button>

      <AnimatePresence>
        {visibleSteps.map((step) => {
          const target = seatPoints[step.playerId] ?? { x: 50, y: 24 };
          return (
            <motion.div
              key={step.id}
              className="pointer-events-none absolute"
              initial={{ left: '50%', top: '50%', opacity: 0 }}
              animate={{ left: `${target.x}%`, top: `${target.y}%`, opacity: 1 }}
              exit={{ opacity: 0, scale: 0.82 }}
              transition={{
                left: { duration: 0.34, ease: [0.16, 1, 0.3, 1] },
                top: { duration: 0.34, ease: [0.16, 1, 0.3, 1] },
                opacity: { duration: 0.14 },
              }}
              style={{ translate: '-50% -50%' }}
            >
              <motion.div
                className="deal-card"
                initial={{ scale: 0.36, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              >
                <UnoCardRenderer
                  card={step.card}
                  faceDown={step.faceDown}
                  size="hand"
                />
              </motion.div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
};
