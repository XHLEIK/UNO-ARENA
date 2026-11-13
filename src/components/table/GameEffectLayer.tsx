'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Flame,
  Layers3,
  Plus,
  Sparkles,
  Zap,
} from 'lucide-react';
import { UnoCard } from '@/types';

interface GameEffectLayerProps {
  lastAction?: {
    type: string;
    playerId: string;
    message: string;
    card?: UnoCard;
    timestamp: number;
  } | null;
  playerNicknames: Record<string, string>;
  pendingStack?: number;
}

interface TableNotification {
  key: number;
  label: string;
  description: string;
  color: string;
  icon: React.ElementType;
}

const MAX_QUEUE = 4;
const DWELL_MS = 3_200;

function resolveNotification(
  lastAction: NonNullable<GameEffectLayerProps['lastAction']>,
  nickname: string,
  pendingStack: number
): TableNotification | null {
  const card = lastAction.card;

  if (lastAction.type === 'STACKING_APPLIED') {
    const amount = lastAction.message.match(/drew (\d+) stacked/)?.[1] ?? '2';
    return {
      key: lastAction.timestamp,
      label: `+${amount}`,
      description: `${nickname} passed the stack`,
      color: '#ffb02e',
      icon: Layers3,
    };
  }

  if (lastAction.type === 'UNO_CAUGHT') {
    return {
      key: lastAction.timestamp,
      label: 'Caught!',
      description: 'Missed UNO · +2 penalty',
      color: '#ffb02e',
      icon: AlertTriangle,
    };
  }

  if (lastAction.type === 'UNO_DECLARED') {
    return {
      key: lastAction.timestamp,
      label: 'UNO!',
      description: `${nickname} called UNO`,
      color: '#63e6a0',
      icon: Flame,
    };
  }

  if (lastAction.type === 'WILD_FOUR_CHALLENGE_RESOLVED') {
    const success = /SUCCESSFUL/i.test(lastAction.message);
    return {
      key: lastAction.timestamp,
      label: success ? 'Challenge won' : 'Challenge lost',
      description: success ? 'Wild Draw Four was illegal' : 'Wild Draw Four was legal',
      color: success ? '#4ade80' : '#ff5d6c',
      icon: AlertTriangle,
    };
  }

  if (!card) return null;

  switch (card.type) {
    case 'SKIP':
    case 'REVERSE':
      // Dedicated effects own these; a second generic badge would duplicate them.
      return null;
    case 'DRAW_TWO':
      return {
        key: lastAction.timestamp,
        label: `+${Math.max(pendingStack, 2)}`,
        description: `${nickname} played Draw Two`,
        color: '#ff5d6c',
        icon: Plus,
      };
    case 'WILD':
      return {
        key: lastAction.timestamp,
        label: 'Wild',
        description: `${nickname} changed the color`,
        color: '#ffd23f',
        icon: Sparkles,
      };
    case 'WILD_DRAW_FOUR':
      return {
        key: lastAction.timestamp,
        label: '+4',
        description: `${nickname} played Wild Draw Four`,
        color: '#ffb02e',
        icon: Zap,
      };
    default:
      return null;
  }
}

export const GameEffectLayer: React.FC<GameEffectLayerProps> = ({
  lastAction,
  playerNicknames,
  pendingStack = 0,
}) => {
  const [feed, setFeed] = useState<TableNotification[]>([]);
  const seenRef = useRef<number | null>(null);
  const current = feed[0] ?? null;

  useEffect(() => {
    if (!lastAction) return;
    if (seenRef.current === lastAction.timestamp) return;
    seenRef.current = lastAction.timestamp;

    const nickname = playerNicknames[lastAction.playerId] ?? 'Player';
    const next = resolveNotification(lastAction, nickname, pendingStack);
    if (!next) return;

    setFeed((previous) =>
      [...previous, next].slice(-MAX_QUEUE)
    );
  }, [lastAction, playerNicknames, pendingStack]);

  useEffect(() => {
    if (!current) return;
    const id = window.setTimeout(() => {
      setFeed((previous) => previous.slice(1));
    }, DWELL_MS);
    return () => window.clearTimeout(id);
  }, [current]);

  return (
    <div className="game-notifications" aria-live="polite" aria-atomic="true">
      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={current.key}
            className="game-notification"
            style={
              { '--notification-color': current.color } as React.CSSProperties
            }
            initial={{ opacity: 0, y: 12, scale: 0.9, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, scale: 0.96, filter: 'blur(4px)' }}
            transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.7 }}
          >
            <span className="game-notification-icon">
              <current.icon
                className="h-4 w-4"
                strokeWidth={2.6}
                aria-hidden="true"
              />
            </span>
            <span className="game-notification-copy">
              <span className="game-notification-label">{current.label}</span>
              <span className="game-notification-text">{current.description}</span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
