'use client';

import React from 'react';
import { Crown } from 'lucide-react';
import { PlayerTimerRing } from '@/components/table/PlayerTimerRing';

interface PlayerAvatarProps {
  nickname: string;
  isHost?: boolean;
  isBot?: boolean;
  isConnected?: boolean;
  isCurrentTurn?: boolean;
  seatNumber?: number;
  size?: 'sm' | 'md' | 'lg';
  turnDeadline?: number;
  serverNow?: number;
  turnDurationMs?: number;
  showTimerValue?: boolean;
}

const SEAT_COLORS = [
  '#e43b44',
  '#1d7fce',
  '#2f9f4d',
  '#d7a900',
  '#8b6bd6',
  '#c94c91',
  '#5d70d6',
  '#d4872c',
];

function initials(nickname: string): string {
  const parts = nickname.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  nickname,
  isHost = false,
  isConnected = true,
  isCurrentTurn = false,
  seatNumber = 0,
  size = 'md',
  turnDeadline,
  serverNow,
  turnDurationMs = 30_000,
  showTimerValue = false,
}) => {
  const color = SEAT_COLORS[seatNumber % SEAT_COLORS.length];
  const sizeClass =
    size === 'sm'
      ? 'avatar-size-sm'
      : size === 'lg'
        ? 'avatar-size-lg'
        : 'avatar-size-md';

  return (
    <div className="avatar-wrap" aria-hidden="true">
      <div
        className={`avatar ${sizeClass}`}
        data-turn={isCurrentTurn ? 'true' : undefined}
        data-connected={isConnected ? 'true' : 'false'}
        style={{
          background: isConnected
            ? `linear-gradient(145deg, ${color}, color-mix(in srgb, ${color} 62%, #05090f))`
            : 'linear-gradient(145deg, #3a4655, #18212c)',
        }}
      >
        <span className="avatar-gloss" />
        <span className="avatar-initials">{initials(nickname)}</span>
      </div>
      {isCurrentTurn && turnDeadline && (
        <PlayerTimerRing
          deadline={turnDeadline}
          serverNow={serverNow}
          durationMs={turnDurationMs}
          showValue={showTimerValue}
        />
      )}
      <span
        className="avatar-status"
        data-offline={!isConnected ? 'true' : undefined}
      />
      {isHost && (
        <span className="avatar-host" title="Host">
          <Crown className="h-2 w-2" strokeWidth={3} />
        </span>
      )}
    </div>
  );
};
