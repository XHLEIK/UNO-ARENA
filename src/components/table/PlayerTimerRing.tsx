'use client';

import React, { useEffect, useRef, useState } from 'react';

interface PlayerTimerRingProps {
  deadline?: number;
  serverNow?: number;
  durationMs: number;
  showValue?: boolean;
}

const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const PlayerTimerRing: React.FC<PlayerTimerRingProps> = ({
  deadline,
  serverNow,
  durationMs,
  showValue = false,
}) => {
  const offsetRef = useRef(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (typeof serverNow !== 'number') return;
    offsetRef.current = serverNow - Date.now();
    setNow(Date.now());
  }, [serverNow, deadline]);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [deadline]);

  if (!deadline || durationMs <= 0) return null;

  const remaining = Math.max(0, deadline - (now + offsetRef.current));
  const ratio = Math.min(1, remaining / durationMs);
  const urgent = remaining <= Math.min(5_000, durationMs * 0.25);
  const expired = remaining <= 0;

  return (
    <span
      className="avatar-timer-ring"
      data-urgent={urgent ? 'true' : undefined}
      data-expired={expired ? 'true' : undefined}
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 48">
        <circle className="avatar-timer-track" cx="24" cy="24" r={RADIUS} />
        <circle
          className="avatar-timer-progress"
          cx="24"
          cy="24"
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
        />
      </svg>
      {showValue && (
        <span className="avatar-timer-value">
          {Math.ceil(remaining / 1000)}
        </span>
      )}
    </span>
  );
};
