'use client';

import React, { useState } from 'react';
import { RotateCw, Smartphone } from 'lucide-react';

/**
 * Shown only in portrait on small screens. The game locks itself to landscape
 * when the browser allows it; this overlay covers browsers that refuse.
 */
export const RotateDeviceOverlay: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="rotate-overlay" role="status" aria-live="polite">
      <span className="rotate-overlay-brand">UNO ARENA</span>
      <span className="rotate-overlay-device" aria-hidden="true">
        <Smartphone className="rotate-overlay-phone" strokeWidth={1.6} />
        <RotateCw className="rotate-overlay-arrow" strokeWidth={2.4} />
      </span>
      <strong className="rotate-overlay-title">Rotate your device</strong>
      <p className="rotate-overlay-copy">
        The table is built for landscape. Turn your phone sideways for the full
        hand, seats, and timers.
      </p>
      <button
        type="button"
        className="rotate-overlay-dismiss"
        onClick={() => setDismissed(true)}
      >
        Continue in portrait
      </button>
    </div>
  );
};
