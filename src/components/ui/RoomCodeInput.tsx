'use client';

import React, { useRef, useState } from 'react';

interface RoomCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
}

export const RoomCodeInput: React.FC<RoomCodeInputProps> = ({
  value,
  onChange,
  length = 6,
  disabled = false,
}) => {
  const [chars, setChars] = useState<string[]>(() =>
    Array.from({ length }, (_, index) => value.toUpperCase()[index] ?? '')
  );
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const commit = (next: string[]) => {
    setChars(next);
    onChange(next.join(''));
  };

  const update = (index: number, raw: string) => {
    const char = raw.replace(/[^a-zA-Z0-9]/g, '').slice(-1).toUpperCase();
    const next = [...chars];
    next[index] = char;
    commit(next);
    if (char && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (chars[index]) {
        const next = [...chars];
        next[index] = '';
        commit(next);
      } else if (index > 0) {
        const next = [...chars];
        next[index - 1] = '';
        commit(next);
        inputsRef.current[index - 1]?.focus();
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      inputsRef.current[index - 1]?.focus();
    } else if (event.key === 'ArrowRight' && index < length - 1) {
      event.preventDefault();
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData
      .getData('text')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    if (!pasted) return;
    event.preventDefault();
    const next = Array<string>(length).fill('');
    pasted
      .split('')
      .slice(0, length)
      .forEach((char, index) => {
        next[index] = char;
      });
    commit(next);
    inputsRef.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
      {chars.map((char, index) => (
        <input
          key={index}
          ref={(node) => {
            inputsRef.current[index] = node;
          }}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={1}
          value={char}
          disabled={disabled}
          onChange={(event) => update(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          aria-label={`Room code character ${index + 1}`}
          className="h-13 w-10 rounded-xl border border-white/10 bg-black/25 text-center font-mono text-xl font-bold uppercase tracking-[0.12em] text-white outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/15 disabled:opacity-50 sm:h-14 sm:w-12 sm:text-2xl"
        />
      ))}
    </div>
  );
};
