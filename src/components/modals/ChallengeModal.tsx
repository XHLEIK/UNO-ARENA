// src/components/modals/ChallengeModal.tsx
'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';

interface ChallengeModalProps {
  isOpen: boolean;
  challengedNickname: string;
  previousColor: string;
  onAccept: () => void;
  onChallenge: () => void;
}

export const ChallengeModal: React.FC<ChallengeModalProps> = ({
  isOpen,
  challengedNickname,
  previousColor,
  onAccept,
  onChallenge,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="w-full max-w-md p-6 rounded-3xl bg-neutral-900 border border-white/20 shadow-2xl text-center"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-black text-white mb-2">
              Wild Draw Four Played!
            </h3>
            <p className="text-sm text-neutral-300 mb-6 leading-relaxed">
              <span className="font-bold text-yellow-400">{challengedNickname}</span> played a Wild Draw Four. Under official rules, this play is only legal if they held <span className="font-bold text-red-400">no cards matching {previousColor}</span>.
            </p>

            <div className="space-y-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onChallenge}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 text-white font-black tracking-wide text-base shadow-lg shadow-red-600/40 border border-white/20 flex items-center justify-center gap-2"
              >
                <ShieldAlert className="w-5 h-5" />
                <span>Challenge Play!</span>
              </motion.button>
              <p className="text-xs text-neutral-400">
                If illegal: They draw 4 cards! If legal: You draw 6 cards.
              </p>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onAccept}
                className="w-full py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-sm border border-neutral-700 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-neutral-400" />
                <span>Accept (+4 Cards)</span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
