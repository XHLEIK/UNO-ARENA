'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CardColor, TurnDirection } from '@/types';

interface ReverseEffectProps {
  active: boolean;
  token?: number;
  direction: TurnDirection;
  color?: CardColor;
}

const COLOR_HEX: Record<CardColor, string> = {
  RED: '#ff5d6c',
  BLUE: '#78b7ff',
  GREEN: '#63e6a0',
  YELLOW: '#ffd23f',
};

/** Two stacked UNO reverse arrows: the sweep draws in the new direction. */
const ArrowPath: React.FC<{
  d: string;
  tip: string;
  delay: number;
  reduceMotion: boolean;
}> = ({ d, tip, delay, reduceMotion }) => (
  <>
    <motion.path
      className="reverse-arrow"
      d={d}
      initial={{ pathLength: reduceMotion ? 1 : 0, opacity: 0.2 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.5, delay, ease: [0.22, 0.9, 0.24, 1] }}
    />
    <motion.path
      className="reverse-tip"
      d={tip}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.22, delay: delay + 0.4 }}
      style={{ transformOrigin: 'center' }}
    />
  </>
);

export const ReverseEffect: React.FC<ReverseEffectProps> = ({
  active,
  token,
  direction,
  color,
}) => {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    const show = window.setTimeout(() => setVisible(true), 300);
    const hide = window.setTimeout(() => setVisible(false), 1_900);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [active, token]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={token ?? 'reverse'}
          className="reverse-effect"
          data-direction={direction === 1 ? 'clockwise' : 'counter'}
          style={
            {
              '--reverse-color': COLOR_HEX[color ?? 'BLUE'],
            } as React.CSSProperties
          }
          initial={{ opacity: 0, scale: 0.82, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.06, y: -6 }}
          transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
          aria-hidden="true"
        >
          <span className="reverse-wash" />
          <svg
            viewBox="0 0 140 140"
            fill="none"
            className="reverse-arrows"
            data-flip={direction === -1 ? 'true' : undefined}
          >
            <path
              className="reverse-orbit"
              d="M70 12a58 58 0 1 1 0 116 58 58 0 0 1 0-116"
            />
            <ArrowPath
              d="M28 52c8-15 24-25 42-24 10 .5 19 4.6 26 11.5"
              tip="M87 31l10 8.5-11 7.5"
              delay={0.05}
              reduceMotion={Boolean(reduceMotion)}
            />
            <ArrowPath
              d="M112 88c-8 15-24 25-42 24-10-.5-19-4.6-26-11.5"
              tip="M53 109l-10-8.5 11-7.5"
              delay={0.24}
              reduceMotion={Boolean(reduceMotion)}
            />
          </svg>
          <span className="reverse-effect-label">Reverse</span>
          <span className="reverse-effect-sub">
            {direction === 1 ? 'Clockwise' : 'Counter-clockwise'}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
