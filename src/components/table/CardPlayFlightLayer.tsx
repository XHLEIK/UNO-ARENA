'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { UnoCardRenderer } from '@/components/card/UnoCardRenderer';
import { PublicGameState } from '@/types';

export interface LocalCardOrigin {
  cardId: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

interface CardPlayFlightLayerProps {
  lastAction?: PublicGameState['lastAction'];
  myPlayerId: string;
  stageRef: React.RefObject<HTMLDivElement | null>;
  localOriginRef: React.MutableRefObject<LocalCardOrigin | null>;
}

interface Flight {
  key: string;
  card: NonNullable<PublicGameState['lastAction']>['card'];
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  width: number;
  height: number;
  endScale: number;
  rotate: number;
}

function findSeatRect(
  stage: HTMLElement,
  playerId: string
): DOMRect | null {
  const seats = stage.querySelectorAll<HTMLElement>('[data-seat-player-id]');
  for (const seat of seats) {
    if (seat.dataset.seatPlayerId === playerId) {
      return seat.getBoundingClientRect();
    }
  }
  return null;
}

function actionKey(
  action: NonNullable<PublicGameState['lastAction']>
): string {
  return `${action.timestamp}:${action.playerId}:${action.card?.id ?? ''}`;
}

export const CardPlayFlightLayer: React.FC<CardPlayFlightLayerProps> = ({
  lastAction,
  myPlayerId,
  stageRef,
  localOriginRef,
}) => {
  const reduceMotion = useReducedMotion();
  const [flights, setFlights] = useState<Flight[]>([]);
  const lastKeyRef = useRef<string | null>(
    lastAction?.type === 'CARD_PLAYED' && lastAction.card
      ? actionKey(lastAction)
      : null
  );

  useEffect(() => {
    if (
      reduceMotion ||
      !lastAction ||
      lastAction.type !== 'CARD_PLAYED' ||
      !lastAction.card
    ) {
      return;
    }

    const key = actionKey(lastAction);
    if (lastKeyRef.current === key) return;

    const stage = stageRef.current;
    const target = stage?.querySelector<HTMLElement>('[data-discard-target]');
    if (!stage || !target) return;

    lastKeyRef.current = key;

    const targetRect = target.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const isLocal = lastAction.playerId === myPlayerId;

    let sourceRect: DOMRect | null = null;
    if (isLocal && localOriginRef.current?.cardId === lastAction.card.id) {
      const origin = localOriginRef.current;
      sourceRect = new DOMRect(
        origin.left,
        origin.top,
        origin.width,
        origin.height
      );
    }
    sourceRect ??= findSeatRect(stage, lastAction.playerId);

    // A player who left before the update has no seat anymore.
    if (!sourceRect) {
      sourceRect = new DOMRect(
        stageRect.left + stageRect.width / 2,
        stageRect.bottom - 18,
        1,
        1
      );
    }
    if (isLocal) localOriginRef.current = null;

    const targetWidth = Math.min(Math.max(targetRect.width, 42), 104);
    const width = isLocal
      ? Math.min(Math.max(sourceRect.width, targetWidth), 112)
      : targetWidth;

    setFlights((current) => [
      ...current.slice(-2),
      {
        key,
        card: lastAction.card,
        fromX: sourceRect.left + sourceRect.width / 2,
        fromY: sourceRect.top + sourceRect.height / 2,
        toX: targetRect.left + targetRect.width / 2,
        toY: targetRect.top + targetRect.height / 2,
        width,
        height: width * 1.4,
        endScale: targetWidth / width,
        rotate: Math.max(-10, Math.min(10, (targetRect.left - sourceRect.left) * 0.02)),
      },
    ]);
  }, [lastAction, myPlayerId, reduceMotion, stageRef, localOriginRef]);

  return (
    <div className="card-flight-layer" aria-hidden="true">
      {flights.map((flight) => (
        <motion.div
          key={flight.key}
          className="card-flight-card"
          style={{
            width: flight.width,
            height: flight.height,
          }}
          initial={{
            x: flight.fromX - flight.width / 2,
            y: flight.fromY - flight.height / 2,
            rotate: flight.rotate,
            scale: 0.96,
            opacity: 0,
          }}
          animate={{
            x: flight.toX - flight.width / 2,
            y: flight.toY - flight.height / 2,
            rotate: 0,
            scale: flight.endScale,
            opacity: 1,
          }}
          transition={{
            duration: 0.52,
            ease: [0.16, 1, 0.3, 1],
          }}
          onAnimationComplete={() => {
            setFlights((current) =>
              current.filter((item) => item.key !== flight.key)
            );
          }}
        >
          {flight.card && (
            <UnoCardRenderer card={flight.card} size="hand" />
          )}
        </motion.div>
      ))}
    </div>
  );
};
