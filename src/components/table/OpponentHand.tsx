'use client';

import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

interface OpponentHandProps {
  cardCount: number;
  playerId: string;
  compact?: boolean;
}

function playerSeed(playerId: string): number {
  let hash = 0;
  for (let i = 0; i < playerId.length; i += 1) {
    hash = (hash * 31 + playerId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Crisp card back at 19–24px wide; SVG keeps the logo inside the oval. */
const MiniCardBack: React.FC = () => (
  <svg
    className="fan-card-face"
    viewBox="0 0 44 62"
    preserveAspectRatio="none"
    focusable="false"
  >
    <rect
      x="0.8"
      y="0.8"
      width="42.4"
      height="60.4"
      rx="5.5"
      fill="#10151c"
      stroke="rgba(255,255,255,0.72)"
      strokeWidth="1.5"
    />
    <rect
      x="3.6"
      y="3.6"
      width="36.8"
      height="54.8"
      rx="3.2"
      fill="none"
      stroke="rgba(255,255,255,0.2)"
      strokeWidth="0.8"
    />
    <path
      d="M4 58 40 4"
      stroke="rgba(255,255,255,0.07)"
      strokeWidth="11"
    />
    <g transform="rotate(-8 22 31)">
      <ellipse
        cx="22"
        cy="31"
        rx="14.2"
        ry="18"
        fill="#d43440"
        stroke="rgba(255,255,255,0.92)"
        strokeWidth="1"
      />
      <ellipse
        cx="22"
        cy="31"
        rx="10.8"
        ry="14.2"
        fill="none"
        stroke="rgba(255,255,255,0.34)"
        strokeWidth="0.6"
      />
      <text
        x="22"
        y="34.6"
        textAnchor="middle"
        fill="#ffffff"
        fontFamily="Outfit, sans-serif"
        fontSize="10.5"
        fontWeight="900"
        fontStyle="italic"
        letterSpacing="-0.9"
      >
        UNO
      </text>
    </g>
    <path d="M6 6h15" stroke="rgba(255,255,255,0.3)" strokeWidth="0.9" />
  </svg>
);

export const OpponentHand: React.FC<OpponentHandProps> = ({
  cardCount,
  playerId,
  compact = false,
}) => {
  const reduceMotion = useReducedMotion();
  const count = Math.max(0, cardCount);
  const cardWidth = compact ? 24 : 31;
  const cardHeight = Math.round(cardWidth * 1.42);
  const maxSpread = compact ? 86 : 112;
  const step =
    count > 1
      ? Math.max(
          1.3,
          Math.min(cardWidth * 0.46, (maxSpread - cardWidth) / (count - 1))
        )
      : 0;
  const totalWidth = cardWidth + step * Math.max(0, count - 1);
  const center = (count - 1) / 2;
  const maxRotation = Math.min(compact ? 22 : 27, 8 + count * 2.2);
  const arcLift = compact ? 8 : 11;
  const seed = playerSeed(playerId);

  return (
    <motion.div
      className="opponent-fan"
      data-count={count}
      data-compact={compact ? 'true' : undefined}
      aria-hidden="true"
      initial={false}
      animate={{ width: totalWidth }}
      transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <AnimatePresence initial={false}>
        {Array.from({ length: count }).map((_, index) => {
          const normalized = center === 0 ? 0 : (index - center) / center;
          const jitter = (((seed + index * 17) % 5) - 2) * 0.5;
          const rotation = normalized * maxRotation + jitter;
          const lift = Math.abs(normalized) ** 1.35 * arcLift;
          const zIndex = Math.max(
            1,
            40 - Math.round(Math.abs(index - center) * 2)
          );

          return (
            <motion.span
              key={index}
              className="opponent-fan-card"
              style={{ width: cardWidth, height: cardHeight, zIndex }}
              initial={
                reduceMotion
                  ? false
                  : {
                      opacity: 0,
                      scale: 0.58,
                      x: index * step,
                      y: -16,
                      rotate: rotation * 0.4,
                    }
              }
              animate={{
                opacity: 1,
                scale: 1,
                x: index * step,
                y: -lift,
                rotate: rotation,
              }}
              exit={{
                opacity: 0,
                scale: 0.6,
                y: -lift - 12,
                transition: { duration: 0.18 },
              }}
              transition={{
                type: 'spring',
                stiffness: 420,
                damping: 32,
                mass: 0.55,
              }}
            >
              <MiniCardBack />
            </motion.span>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
};
