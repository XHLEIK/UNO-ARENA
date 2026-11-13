'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

interface SkipEffectProps {
  active: boolean;
  token?: number;
}

export const SkipEffect: React.FC<SkipEffectProps> = ({ active, token }) => {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(active);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const id = window.setTimeout(() => setVisible(false), 1_350);
    return () => window.clearTimeout(id);
  }, [active, token]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={token ?? 'skip'}
          className="skip-effect"
          initial={
            reduceMotion
              ? { opacity: 0 }
              : { opacity: 0, y: -16, scale: 0.6, rotate: -8 }
          }
          animate={
            reduceMotion
              ? { opacity: 1 }
              : {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  rotate: [0, -4, 3, 0],
                }
          }
          exit={{ opacity: 0, y: -10, scale: 0.9 }}
          transition={{
            type: 'spring',
            stiffness: 420,
            damping: 24,
            rotate: { duration: 0.7, ease: 'easeInOut' },
          }}
          aria-hidden="true"
        >
          <span className="skip-effect-badge">
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="8.5" />
              <path d="M6 6 18 18" />
            </svg>
            <span className="skip-effect-text">Skipped</span>
          </span>
          <span className="skip-effect-arrow" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
