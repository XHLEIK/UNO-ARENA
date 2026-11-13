'use client';

import React, { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  ArrowRight,
  Crown,
  LogOut,
  RotateCcw,
  Trophy,
} from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import { PlayerPublicInfo, ScoringMode } from '@/types';

interface RoundSummaryModalProps {
  isOpen: boolean;
  isHost: boolean;
  winnerNickname: string;
  isMatchOver: boolean;
  scoringMode: ScoringMode;
  targetScore: number;
  players: PlayerPublicInfo[];
  onNextRound: () => void;
  onLeaveRoom: () => void;
}

export const RoundSummaryModal: React.FC<RoundSummaryModalProps> = ({
  isOpen,
  isHost,
  winnerNickname,
  isMatchOver,
  scoringMode,
  targetScore,
  players,
  onNextRound,
  onLeaveRoom,
}) => {
  const reduceMotion = useReducedMotion();
  const orderedPlayers = [...players].sort(
    (a, b) => b.totalScore - a.totalScore || a.seatNumber - b.seatNumber
  );

  useEffect(() => {
    if (!isOpen || reduceMotion) return;
    confetti({
      particleCount: 90,
      spread: 72,
      origin: { y: 0.62 },
      colors: ['#ffd23f', '#e43b44', '#1d7fce', '#2f9f4d', '#f5f1e8'],
      disableForReducedMotion: true,
    });
  }, [isOpen, reduceMotion]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="summary-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="summary-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="summary-panel"
            initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="summary-kicker">
                  {isMatchOver ? 'Final table' : 'Round complete'}
                </span>
                <h2 id="summary-title" className="summary-title">
                  {isMatchOver ? 'Match won.' : 'Round won.'}
                </h2>
                <p className="summary-winner">
                  <Crown className="mr-1 inline h-4 w-4" aria-hidden="true" />
                  {winnerNickname}
                </p>
              </div>
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent">
                <Trophy className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>

            <div className="summary-scores">
              <div className="summary-score-row">
                <span>Player</span>
                <span>Round</span>
                <span>Total{scoringMode === 'CUMULATIVE' ? ` / ${targetScore}` : ''}</span>
              </div>
              {orderedPlayers.map((player) => (
                <div key={player.id} className="summary-score-row">
                  <strong className="flex min-w-0 items-center gap-2">
                    <span className="truncate">{player.nickname}</span>
                    {player.nickname === winnerNickname && (
                      <Badge variant="accent">Winner</Badge>
                    )}
                  </strong>
                  <span className="score-plus">+{player.roundScore}</span>
                  <span className="score-total">{player.totalScore}</span>
                </div>
              ))}
            </div>

            <div className="summary-actions">
              {isHost ? (
                <Button
                  type="button"
                  size="lg"
                  autoFocus
                  onClick={onNextRound}
                  className="w-full"
                >
                  {isMatchOver ? (
                    <>
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      Play again
                    </>
                  ) : (
                    <>
                      Next round
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex min-h-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] px-4 text-center text-xs font-semibold text-ink-muted">
                  Waiting for the host
                </div>
              )}
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={onLeaveRoom}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Leave
              </Button>
            </div>

            {scoringMode === 'SINGLE_ROUND' && (
              <p className="mt-3 text-center text-[10px] text-ink-dim">
                Single-round match · {players.length}{' '}
                {players.length === 1 ? 'player' : 'players'} at the table
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
