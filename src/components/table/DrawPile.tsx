'use client';

import React from 'react';
import { UnoCardRenderer } from '@/components/card/UnoCardRenderer';

interface DrawPileProps {
  count: number;
  onDraw: () => void;
  isMyTurn: boolean;
  canDraw: boolean;
  phase: string;
}

export const DrawPile: React.FC<DrawPileProps> = ({
  count,
  onDraw,
  isMyTurn,
  canDraw,
  phase,
}) => {
  const disabled = !isMyTurn || phase !== 'ACTIVE_TURN' || !canDraw;
  const label = disabled
    ? count === 0
      ? 'Draw pile empty'
      : 'Draw pile — wait for your turn'
    : `Draw a card — ${count} cards remaining`;

  return (
    <div className="pile-unit">
      <button
        type="button"
        className="draw-pile-button"
        onClick={onDraw}
        disabled={disabled}
        data-ready={disabled ? undefined : 'true'}
        aria-label={label}
        title={label}
      >
        <div className={`pile-card-wrap ${count === 0 ? 'is-ghost' : ''}`}>
          <div className="draw-pile-stack">
            <UnoCardRenderer faceDown size="hand" />
          </div>
          <span className="pile-count">{count}</span>
        </div>
      </button>
      <span className="pile-label">Draw pile</span>
    </div>
  );
};
