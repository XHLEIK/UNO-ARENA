'use client';

import React from 'react';
import { CardColor, UnoCard } from '@/types';

export interface UnoCardRendererProps {
  card?: UnoCard | null;
  faceDown?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hand';
  isPlayable?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
  rotation?: number;
}

const COLOR_CLASS: Record<CardColor, string> = {
  RED: 'card-tone-red',
  BLUE: 'card-tone-blue',
  GREEN: 'card-tone-green',
  YELLOW: 'card-tone-yellow',
};

const SIZE_MAP = {
  xs: { width: 'w-8', radius: 'rounded-[5px]' },
  sm: { width: 'w-12', radius: 'rounded-[7px]' },
  md: { width: 'w-20', radius: 'rounded-[10px]' },
  lg: { width: 'w-[104px]', radius: 'rounded-[12px]' },
  xl: { width: 'w-36', radius: 'rounded-[16px]' },
  hand: { width: 'w-full', radius: 'rounded-[10px]' },
} as const;

export const UnoCardRenderer: React.FC<UnoCardRendererProps> = ({
  card,
  faceDown = false,
  size = 'md',
  isPlayable = false,
  isSelected = false,
  onClick,
  className = '',
  rotation = 0,
}) => {
  const dimensions = SIZE_MAP[size];
  const interactive = Boolean(onClick);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  if (faceDown || !card) {
    return (
      <div
        onClick={onClick}
        onKeyDown={handleKeyDown}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label="Face-down UNO card"
        style={{ transform: rotation ? `rotate(${rotation}deg)` : undefined }}
        className={`uno-card bg-[#0d1420] ${dimensions.width} ${dimensions.radius} ${className}`}
      >
        <div className="card-back-grid" aria-hidden="true" />
        <div className="card-back-oval" aria-hidden="true">
          <span>UNO</span>
        </div>
        <div className="card-back-quad" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>
    );
  }

  const isWild = card.type === 'WILD' || card.type === 'WILD_DRAW_FOUR';
  const colorClass = card.color ? COLOR_CLASS[card.color] : '';

  return (
    <div
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={getCardLabel(card)}
      data-playable={isPlayable ? 'true' : undefined}
      data-selected={isSelected ? 'true' : undefined}
      style={{
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
      }}
      className={`uno-card ${dimensions.width} ${dimensions.radius} ${colorClass} ${className}`}
    >
      {isWild ? (
        <div className="card-wild-field" aria-hidden="true" />
      ) : (
        <div className={`absolute inset-0 ${colorClass}`} aria-hidden="true" />
      )}

      <div className="card-oval">
        {isWild && <span className="card-wild-ring" aria-hidden="true" />}
        <div className="card-symbol">{renderCentralSymbol(card)}</div>
      </div>

      <div className="card-corner card-corner-tl" aria-hidden="true">
        {renderCornerPip(card)}
      </div>
      <div className="card-corner card-corner-br" aria-hidden="true">
        {renderCornerPip(card)}
      </div>
      <span className="card-brand" aria-hidden="true">
        UNO
      </span>
    </div>
  );
};

function cardLabel(card: UnoCard): string {
  if (card.type === 'NUMBER') {
    return `${capitalize(card.color ?? '')} ${card.value}`;
  }
  if (card.type === 'WILD') return 'Wild card';
  if (card.type === 'WILD_DRAW_FOUR') return 'Wild Draw Four';
  return `${capitalize(card.color ?? '')} ${card.type.replaceAll('_', ' ').toLowerCase()}`;
}

export function getCardLabel(card: UnoCard): string {
  return cardLabel(card);
}

function capitalize(value: string): string {
  return value ? value.charAt(0) + value.slice(1).toLowerCase() : '';
}

function renderCornerPip(card: UnoCard): React.ReactNode {
  switch (card.type) {
    case 'NUMBER':
      return card.value;
    case 'SKIP':
      return (
        <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" />
          <path d="m5.5 5.5 13 13" />
        </svg>
      );
    case 'REVERSE':
      return (
        <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 7h10l-3-3M17 17H7l3 3" />
          <path d="M17 7v4M7 17v-4" />
        </svg>
      );
    case 'DRAW_TWO':
      return '+2';
    case 'WILD':
      return 'W';
    case 'WILD_DRAW_FOUR':
      return '+4';
  }
}

function renderCentralSymbol(card: UnoCard): React.ReactNode {
  switch (card.type) {
    case 'NUMBER':
      return <span className="card-number">{card.value}</span>;

    case 'SKIP':
      return (
        <svg
          viewBox="0 0 24 24"
          className="card-symbol-icon"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.4"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="m5.5 5.5 13 13" />
        </svg>
      );

    case 'REVERSE':
      return (
        <svg
          viewBox="0 0 24 24"
          className="card-symbol-icon"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 8h11l-3.5-3.5M19 16H8l3.5 3.5" />
          <path d="M19 5v6M5 19v-6" />
        </svg>
      );

    case 'DRAW_TWO':
      return <span className="card-action-label">+2</span>;

    case 'WILD':
      return (
        <span className="card-wild-disc">
          <span>W</span>
        </span>
      );

    case 'WILD_DRAW_FOUR':
      return (
        <span className="card-wild-disc" data-draw-four="true">
          <span>+4</span>
        </span>
      );
  }
}
