// src/components/modals/WildColorModal.tsx
'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardColor } from '@/types';

interface WildColorModalProps {
  isOpen: boolean;
  onSelectColor: (color: CardColor) => void;
}

const COLORS: { color: CardColor; label: string; bg: string; hover: string }[] = [
  { color: 'RED', label: 'Red', bg: 'bg-[#EA323C]', hover: 'hover:bg-red-700' },
  { color: 'BLUE', label: 'Blue', bg: 'bg-[#008AD8]', hover: 'hover:bg-blue-700' },
  { color: 'YELLOW', label: 'Yellow', bg: 'bg-[#FFD500] text-black', hover: 'hover:bg-yellow-500' },
  { color: 'GREEN', label: 'Green', bg: 'bg-[#2FA84F]', hover: 'hover:bg-green-700' },
];

export const WildColorModal: React.FC<WildColorModalProps> = ({
  isOpen,
  onSelectColor,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="w-full max-w-sm p-6 rounded-3xl bg-neutral-900 border border-white/20 shadow-2xl text-center"
          >
            <h3 className="text-2xl font-black text-white tracking-wide mb-2">
              Choose Active Color
            </h3>
            <p className="text-sm text-neutral-400 mb-6">
              Select the color for subsequent cards to match
            </p>

            <div className="grid grid-cols-2 gap-4">
              {COLORS.map((item) => (
                <motion.button
                  key={item.color}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onSelectColor(item.color)}
                  className={`h-24 rounded-2xl font-black text-xl tracking-wider shadow-lg flex items-center justify-center border-2 border-white/40 transition-all ${item.bg} ${item.hover} ${
                    item.color === 'YELLOW' ? 'text-black' : 'text-white'
                  }`}
                >
                  {item.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
