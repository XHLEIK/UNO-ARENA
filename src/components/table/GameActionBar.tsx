'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Hand } from 'lucide-react';
import { UnoButton } from '@/components/controls/UnoButton';
import { GamePhase } from '@/types';

interface GameActionBarProps {
  phase: GamePhase;
  isMyTurn: boolean;
  canCallUno: boolean;
  unoDeclared: boolean;
  canPass: boolean;
  canDraw: boolean;
  catchTargetPlayerId: string | null;
  catchTargetNickname: string;
  onCallUno: () => void;
  onCatchUno: (targetPlayerId: string) => void;
  onPassTurn: () => void;
  onDraw: () => void;
}

export const GameActionBar: React.FC<GameActionBarProps> = ({
  phase,
  isMyTurn,
  canCallUno,
  unoDeclared,
  canPass,
  canDraw,
  catchTargetPlayerId,
  catchTargetNickname,
  onCallUno,
  onCatchUno,
  onPassTurn,
  onDraw,
}) => {
  const showDraw = isMyTurn && phase === 'ACTIVE_TURN' && canDraw;
  const showPass = isMyTurn && phase === 'DRAW_DECISION' && canPass;

  return (
    <div className="hand-action-row">
      <AnimatePresence mode="popLayout">
        {showDraw && (
          <motion.button
            key="draw"
            type="button"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            onClick={onDraw}
            className="hand-action-button"
            aria-label="Draw a card"
          >
            <Hand className="h-3.5 w-3.5 text-accent" strokeWidth={2.3} aria-hidden="true" />
            Draw
          </motion.button>
        )}

        {showPass && (
          <motion.button
            key="pass"
            type="button"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            onClick={onPassTurn}
            className="hand-action-button"
            aria-label="Pass turn"
          >
            Pass
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </motion.button>
        )}
      </AnimatePresence>

      <UnoButton
        canCallUno={canCallUno}
        unoDeclared={unoDeclared}
        onCallUno={onCallUno}
        catchTargetPlayerId={catchTargetPlayerId}
        catchTargetNickname={catchTargetNickname}
        onCatchUno={onCatchUno}
      />
    </div>
  );
};
