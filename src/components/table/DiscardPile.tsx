'use client';

import React from 'react';
import { Layers3 } from 'lucide-react';
import { DiscardCardStack } from '@/components/table/DiscardCardStack';
import { getCardLabel } from '@/components/card/UnoCardRenderer';
import { CardColor, UnoCard } from '@/types';

interface DiscardPileProps {
  topCard: UnoCard;
  count: number;
  recentCards?: UnoCard[];
  pendingStack?: number;
  activeColor: CardColor;
}

const COLOR_HEX: Record<CardColor, string> = {
  RED: '#e43b44',
  BLUE: '#1d7fce',
  GREEN: '#2f9f4d',
  YELLOW: '#ffd23f',
};

export const DiscardPile: React.FC<DiscardPileProps> = ({
  topCard,
  count,
  recentCards,
  pendingStack,
  activeColor,
}) => {
  const cards = recentCards && recentCards.length > 0 ? recentCards : [topCard];
  const activeHex = COLOR_HEX[activeColor];
  const stackCount = pendingStack ?? 0;

  return (
    <div
      className="pile-unit"
      role="group"
      aria-label={`Discard pile. Top card: ${getCardLabel(topCard)}. Active color: ${activeColor.toLowerCase()}. ${count} cards discarded.`}
    >
      <div className="relative">
        <div className="pile-card-wrap">
          <div
            className="discard-top-glow"
            style={{ background: activeHex }}
            aria-hidden="true"
          />
          <DiscardCardStack cards={cards} maxVisible={4} />
          <span className="pile-count" aria-hidden="true">
            {count}
          </span>
        </div>
        {stackCount > 0 && (
          <span
            className="absolute -right-3 -top-3 z-20 inline-flex items-center gap-1 rounded-full border border-[#ffb02e]/45 bg-[#2b1b06] px-2 py-1 font-mono text-[9px] font-bold text-[#ffd58a] shadow-lg"
            title={`${stackCount} stacked cards pending`}
          >
            <Layers3 className="h-2.5 w-2.5" aria-hidden="true" />
            +{stackCount}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <span
          className="active-color-badge"
          style={{ '--active-color': activeHex } as React.CSSProperties}
        >
          <span className="active-color-dot" aria-hidden="true" />
          <span className="active-color-copy">
            <span className="active-color-kicker">Active color</span>
            <span className="active-color-name">{activeColor}</span>
          </span>
        </span>
        <span className="pile-label">Discard pile</span>
      </div>
    </div>
  );
};
