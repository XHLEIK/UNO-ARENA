'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { PlayerAvatar } from '@/components/table/PlayerAvatar';
import { OpponentHand } from '@/components/table/OpponentHand';
import { SkipEffect } from '@/components/table/SkipEffect';
import { PlayerPublicInfo } from '@/types';

interface PlayerSeatProps {
  player: PlayerPublicInfo;
  isCurrentTurn: boolean;
  compact?: boolean;
  turnDeadline?: number;
  serverNow?: number;
  turnDurationMs?: number;
  isSkipped?: boolean;
  skipToken?: number;
}

export const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  isCurrentTurn,
  compact = false,
  turnDeadline,
  serverNow,
  turnDurationMs = 30_000,
  isSkipped = false,
  skipToken,
}) => {
  const lowHand = player.cardCount === 1;

  return (
    <motion.div
      className="seat-anchor"
      initial={{ opacity: 0, scale: 0.92, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        className="seat-chip"
        role="group"
        data-compact={compact ? 'true' : undefined}
        data-turn={isCurrentTurn ? 'true' : undefined}
        data-skip={isSkipped ? 'true' : undefined}
        data-disconnected={!player.isConnected ? 'true' : undefined}
        aria-label={`${player.nickname}, ${player.cardCount} cards${
          isCurrentTurn ? ', their turn' : ''
        }${player.unoDeclared ? ', UNO called' : ''}${
          isSkipped ? ', turn skipped' : ''
        }${!player.isConnected ? ', offline' : ''}`}
      >
        <div className="seat-figure">
          <OpponentHand
            cardCount={player.cardCount}
            playerId={player.id}
            compact={compact}
          />
          <PlayerAvatar
            nickname={player.nickname}
            isHost={player.isHost}
            isBot={player.isBot}
            isConnected={player.isConnected}
            isCurrentTurn={isCurrentTurn}
            seatNumber={player.seatNumber}
            size={compact ? 'sm' : 'md'}
            turnDeadline={turnDeadline}
            serverNow={serverNow}
            turnDurationMs={turnDurationMs}
            showTimerValue
          />
          <SkipEffect active={isSkipped} token={skipToken} />
        </div>

        <div className="seat-name">
          {isCurrentTurn && <span className="seat-turn-pip" />}
          <span title={player.nickname}>{player.nickname}</span>
          {player.isBot && <span className="seat-bot">BOT</span>}
        </div>

        <div className="seat-meta">
          <span className="seat-card-count" data-low={lowHand ? 'true' : undefined}>
            {player.cardCount}
          </span>
          <span>{player.cardCount === 1 ? 'card' : 'cards'}</span>
          {player.unoDeclared && <span className="seat-uno">UNO</span>}
          {!player.isConnected && <span className="seat-offline">OFFLINE</span>}
          {player.hasMissedUno && lowHand && player.isConnected && (
            <span className="seat-warning" title="Missed UNO call">
              <AlertTriangle className="h-2.5 w-2.5" strokeWidth={3} />
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};
