'use client';

import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, Check, Flame } from 'lucide-react';

interface UnoButtonProps {
  canCallUno: boolean;
  unoDeclared: boolean;
  onCallUno: () => void;
  catchTargetPlayerId?: string | null;
  catchTargetNickname?: string | null;
  onCatchUno?: (targetPlayerId: string) => void;
}

export const UnoButton: React.FC<UnoButtonProps> = ({
  canCallUno,
  unoDeclared,
  onCallUno,
  catchTargetPlayerId,
  catchTargetNickname,
  onCatchUno,
}) => {
  const reduceMotion = useReducedMotion();
  const canCatch = Boolean(catchTargetPlayerId && onCatchUno);
  const armed = canCallUno && !unoDeclared;
  const state = unoDeclared ? 'declared' : armed ? 'armed' : 'idle';
  const caption = unoDeclared
    ? 'UNO CALLED'
    : armed
      ? 'GUARD OPEN'
      : 'GUARD LOCKED';

  return (
    <div className="uno-control">
      <AnimatePresence>
        {canCatch && catchTargetPlayerId && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.92, x: 8 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.92 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onCatchUno?.(catchTargetPlayerId)}
            className="uno-catch"
            aria-label={`Catch ${catchTargetNickname ?? 'opponent'} for missing UNO`}
          >
            <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
            Catch {catchTargetNickname ?? 'opponent'}
          </motion.button>
        )}
      </AnimatePresence>

      <motion.div
        className="uno-device"
        data-state={state}
        animate={{ opacity: armed || unoDeclared ? 1 : 0.82 }}
        transition={{ duration: reduceMotion ? 0 : 0.25 }}
      >
        <div className="uno-device-shell">
          <span className="uno-device-screw uno-device-screw-a" />
          <span className="uno-device-screw uno-device-screw-b" />
          <span className="uno-led" data-armed={armed ? 'true' : undefined} />
          <span className="uno-led uno-led-small" data-armed={armed ? 'true' : undefined} />

          <div className="uno-button-well">
            <motion.button
              type="button"
              className="uno-activation"
              disabled={!armed}
              onClick={onCallUno}
              whileHover={armed && !reduceMotion ? { scale: 1.05 } : undefined}
              whileTap={armed && !reduceMotion ? { scale: 0.9, y: 1 } : undefined}
              transition={{ type: 'spring', stiffness: 520, damping: 24 }}
              aria-label={
                unoDeclared
                  ? 'UNO has been called'
                  : armed
                    ? 'Call UNO'
                    : 'UNO guard is locked until you have two cards on your turn'
              }
            >
              {unoDeclared ? (
                <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
              ) : (
                <Flame className="h-4 w-4" strokeWidth={2.6} aria-hidden="true" />
              )}
              <span>{unoDeclared ? 'SET' : 'UNO'}</span>
            </motion.button>
          </div>

          <motion.div
            className="uno-cover"
            animate={{ rotateX: armed ? -112 : 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 260, damping: 24 }
            }
            style={{ transformOrigin: '50% 0%', transformStyle: 'preserve-3d' }}
            aria-hidden="true"
          >
            <span className="uno-cover-stripe" />
            <span className="uno-cover-label">UNO</span>
            <span className="uno-cover-hint">{armed ? 'OPEN' : 'LOCKED'}</span>
          </motion.div>

          <span className="uno-device-caption">{caption}</span>
        </div>
      </motion.div>
    </div>
  );
};
