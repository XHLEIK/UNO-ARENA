'use client';

import React from 'react';
import { LogOut, Volume2, VolumeX } from 'lucide-react';
import { Badge } from '@/components/ui';

interface GameHeaderProps {
  roundNumber: number;
  isHost: boolean;
  isLocalMode: boolean;
  isMuted: boolean;
  onToggleSound: () => void;
  onLeaveRoom: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  roundNumber,
  isHost,
  isLocalMode,
  isMuted,
  onToggleSound,
  onLeaveRoom,
}) => {
  return (
    <header className="game-header safe-top">
      <span className="round-pill">Round {roundNumber}</span>
      {isHost && <Badge variant="accent">Host</Badge>}
      <button
        type="button"
        onClick={onToggleSound}
        className="icon-button"
        title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
        aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
      >
        {isMuted ? (
          <VolumeX className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Volume2 className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
      <button
        type="button"
        onClick={onLeaveRoom}
        className="icon-button"
        title={isLocalMode ? 'Leave practice' : 'Leave table'}
        aria-label={isLocalMode ? 'Leave practice' : 'Leave table'}
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
      </button>
    </header>
  );
};
