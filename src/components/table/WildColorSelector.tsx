'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Droplet } from 'lucide-react';
import { CardColor } from '@/types';

interface WildColorSelectorProps {
  isOpen: boolean;
  onSelectColor: (color: CardColor) => void;
}

const COLORS: Array<{
  color: CardColor;
  label: string;
  hex: string;
  ink: string;
}> = [
  { color: 'RED', label: 'Red', hex: '#e43b44', ink: '#ffffff' },
  { color: 'BLUE', label: 'Blue', hex: '#1d7fce', ink: '#ffffff' },
  { color: 'GREEN', label: 'Green', hex: '#2f9f4d', ink: '#ffffff' },
  { color: 'YELLOW', label: 'Yellow', hex: '#ffd23f', ink: '#2a1e00' },
];

export const WildColorSelector: React.FC<WildColorSelectorProps> = ({
  isOpen,
  onSelectColor,
}) => {
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
          aria-labelledby="wild-color-title"
          aria-describedby="wild-color-copy"
        >
          <div className="decision-heading">
            <div>
              <h3 id="wild-color-title" className="decision-title">
                Choose your color
              </h3>
              <p id="wild-color-copy" className="decision-copy">
                Your wild card needs a color before play continues.
              </p>
            </div>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-accent" aria-hidden="true">
              <Droplet className="h-4 w-4" />
            </span>
          </div>

          <div className="color-choices" role="group" aria-label="Wild color">
            {COLORS.map((choice, index) => (
              <button
                key={choice.color}
                type="button"
                autoFocus={index === 0}
                onClick={() => onSelectColor(choice.color)}
                className="color-choice"
                style={{ backgroundColor: choice.hex, color: choice.ink }}
                aria-label={`Choose ${choice.label}`}
              >
                <span
                  className="h-4 w-4 rounded-full border border-current/30 bg-white/20"
                  aria-hidden="true"
                />
                <span>{choice.label}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
