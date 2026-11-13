'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Clock3, ShieldQuestion } from 'lucide-react';
import { Button } from '@/components/ui';
import { CardColor } from '@/types';

interface DrawFourChallengePanelProps {
  isOpen: boolean;
  challengedNickname: string;
  previousColor: CardColor;
  timeLimitMs: number;
  startedAt: number;
  onChallenge: () => void;
  onAccept: () => void;
}

const COLOR_HEX: Record<CardColor, string> = {
  RED: '#e43b44',
  BLUE: '#1d7fce',
  GREEN: '#2f9f4d',
  YELLOW: '#ffd23f',
};

export const DrawFourChallengePanel: React.FC<DrawFourChallengePanelProps> = ({
  isOpen,
  challengedNickname,
  previousColor,
  timeLimitMs,
  startedAt,
  onChallenge,
  onAccept,
}) => {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    if (!isOpen) return;
    const tick = () => setNow(Date.now());
    const initial = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, 120);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [isOpen, startedAt]);

  const remainingMs = Math.max(0, timeLimitMs - (now - startedAt));
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const progress =
    timeLimitMs > 0 ? Math.max(0, Math.min(1, remainingMs / timeLimitMs)) : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="decision-panel"
          role="dialog"
          aria-labelledby="challenge-title"
          aria-describedby="challenge-copy"
        >
          <div className="decision-heading">
            <div>
              <h3 id="challenge-title" className="decision-title">
                Challenge the Wild Draw Four?
              </h3>
              <p id="challenge-copy" className="decision-copy">
                <strong className="text-white">{challengedNickname}</strong> played
                a Wild Draw Four on{' '}
                <span
                  className="inline-block h-2 w-2 rounded-full align-middle"
                  style={{ backgroundColor: COLOR_HEX[previousColor] }}
                  aria-hidden="true"
                />{' '}
                {previousColor.toLowerCase()}.
              </p>
            </div>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#ffb02e]/30 bg-[#ffb02e]/10 text-[#ffd58a]" aria-hidden="true">
              <ShieldQuestion className="h-4 w-4" />
            </span>
          </div>

          <div className="challenge-actions">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onAccept}
              className="w-full"
            >
              Accept +4
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={onChallenge}
              className="w-full"
            >
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              Challenge
            </Button>
          </div>

          <div className="challenge-timer" aria-hidden="true">
            <span style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2 text-[9px] text-ink-dim">
            <span>If the play was legal, a failed challenge costs 6 cards.</span>
            <span className="inline-flex shrink-0 items-center gap-1 font-mono font-bold text-ink-muted">
              <Clock3 className="h-3 w-3" aria-hidden="true" />
              {remainingSeconds}s
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
