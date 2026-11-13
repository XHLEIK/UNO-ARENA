'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2 } from 'lucide-react';

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/* -------------------------------------------------------------------------- */
/* Brand                                                                      */
/* -------------------------------------------------------------------------- */

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand">
      <span className="brand-mark" aria-hidden="true">
        <span>UNO</span>
      </span>
      <span className="brand-word">
        UNO <em>ARENA</em>
      </span>
      {!compact && <span className="brand-tag">Private table<br />Real-time play</span>}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Button                                                                     */
/* -------------------------------------------------------------------------- */

const BUTTON_VARIANTS = {
  primary:
    'bg-accent text-[#171205] shadow-[0_14px_34px_-16px_rgba(255,210,63,0.8)] hover:bg-[#ffdc68] active:bg-[#f0bf1b]',
  secondary:
    'border border-white/12 bg-white/[0.055] text-white hover:border-white/20 hover:bg-white/[0.09] active:bg-white/[0.12]',
  ghost:
    'text-ink-muted hover:bg-white/[0.06] hover:text-white active:bg-white/[0.1]',
  danger:
    'bg-[#e43b44] text-white shadow-[0_14px_34px_-16px_rgba(228,59,68,0.75)] hover:bg-[#ed5058] active:bg-[#ca2f38]',
  success:
    'bg-[#2f9f4d] text-white shadow-[0_14px_34px_-16px_rgba(47,159,77,0.7)] hover:bg-[#38b75a] active:bg-[#278541]',
} as const;

const BUTTON_SIZES = {
  sm: 'h-8 rounded-lg px-3 text-[11px]',
  md: 'h-10 rounded-[11px] px-4 text-xs',
  lg: 'h-12 rounded-xl px-5 text-sm',
} as const;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: keyof typeof BUTTON_SIZES;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cx(
        'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-bold tracking-[-0.01em] transition-all duration-150 disabled:pointer-events-none disabled:opacity-45',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Input                                                                      */
/* -------------------------------------------------------------------------- */

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({
  label,
  error,
  hint,
  id,
  className,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = `${inputId}-description`;
  const hasDescription = Boolean(error || hint);

  return (
    <label className="grid gap-1.5 text-left" htmlFor={inputId}>
      {label && (
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-dim">
          {label}
        </span>
      )}
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={hasDescription ? descriptionId : undefined}
        className={cx(
          'h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3.5 text-sm font-medium text-white outline-none transition placeholder:text-ink-dim/70 focus:border-accent/60 focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-[#e43b44]/70 focus:border-[#e43b44] focus:ring-[#e43b44]/15',
          className
        )}
        {...props}
      />
      {hasDescription && (
        <span
          id={descriptionId}
          className={cx(
            'text-[10px] leading-relaxed',
            error ? 'text-[#ff8b94]' : 'text-ink-dim'
          )}
        >
          {error || hint}
        </span>
      )}
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/* Select                                                                     */
/* -------------------------------------------------------------------------- */

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface SelectProps {
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  hint,
  disabled = false,
  id,
  className,
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const rootRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  useEffect(() => {
    if (!open) return;

    const handleOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, [open]);

  const openMenu = (initialIndex = selectedIndex) => {
    setActiveIndex(initialIndex);
    setOpen(true);
    window.setTimeout(() => optionRefs.current[initialIndex]?.focus(), 0);
  };

  const select = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };

  const handleOptionKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex = (index + direction + options.length) % options.length;
      setActiveIndex(nextIndex);
      optionRefs.current[nextIndex]?.focus();
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const nextIndex = event.key === 'Home' ? 0 : options.length - 1;
      setActiveIndex(nextIndex);
      optionRefs.current[nextIndex]?.focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  const selected = options.find((option) => option.value === value);

  return (
    <div className={cx('grid gap-1.5 text-left', className)}>
      {label && (
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-dim">
          {label}
        </span>
      )}
      <div className="relative" ref={rootRef}>
        <button
          id={selectId}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${selectId}-listbox`}
          aria-haspopup="listbox"
          disabled={disabled}
          onClick={() => {
            if (open) {
              setOpen(false);
            } else {
              openMenu();
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              openMenu(
                event.key === 'ArrowUp' ? options.length - 1 : selectedIndex
              );
            }
          }}
          className={cx(
            'flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3.5 text-left text-sm font-semibold outline-none transition',
            'hover:border-white/20 focus:border-accent/60 focus:ring-2 focus:ring-accent/15',
            open && 'border-accent/50 ring-2 ring-accent/10',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          <span className={selected ? 'text-white' : 'text-ink-dim/70'}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronDown
            className={cx(
              'h-4 w-4 shrink-0 text-ink-dim transition-transform duration-150',
              open && 'rotate-180 text-accent'
            )}
            aria-hidden="true"
          />
        </button>

        {open && (
          <div
            id={`${selectId}-listbox`}
            role="listbox"
            aria-labelledby={selectId}
            className="absolute left-0 right-0 z-[60] mt-2 max-h-64 overflow-y-auto rounded-xl border border-white/12 bg-[#0b141e] p-1.5 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.95)]"
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  ref={(node) => {
                    optionRefs.current[index] = node;
                  }}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => select(option.value)}
                  onKeyDown={(event) => handleOptionKeyDown(event, index)}
                  className={cx(
                    'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                    index === activeIndex
                      ? 'bg-white/[0.075]'
                      : 'hover:bg-white/[0.055]'
                  )}
                >
                  <span className="min-w-0">
                    <span
                      className={cx(
                        'block truncate text-xs font-semibold',
                        isSelected ? 'text-accent' : 'text-white'
                      )}
                    >
                      {option.label}
                    </span>
                    {option.description && (
                      <span className="mt-0.5 block text-[10px] leading-snug text-ink-dim">
                        {option.description}
                      </span>
                    )}
                  </span>
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {hint && <span className="text-[10px] leading-relaxed text-ink-dim">{hint}</span>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Switch                                                                     */
/* -------------------------------------------------------------------------- */

export interface SwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  disabled?: boolean;
}

export function Switch({
  label,
  checked,
  onChange,
  description,
  disabled = false,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'flex w-full items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5 text-left transition',
        'hover:border-white/15 hover:bg-white/[0.045]',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <span className="min-w-0">
        <span className="block text-[11px] font-bold text-white">{label}</span>
        {description && (
          <span className="mt-0.5 block text-[10px] leading-snug text-ink-dim">
            {description}
          </span>
        )}
      </span>
      <span
        aria-hidden="true"
        className={cx(
          'relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-150',
          checked
            ? 'border-accent/50 bg-accent'
            : 'border-white/15 bg-white/[0.08]'
        )}
      >
        <span
          className={cx(
            'absolute top-[3px] h-4 w-4 rounded-full shadow-sm transition-transform duration-150',
            checked
              ? 'translate-x-[23px] bg-[#171205]'
              : 'translate-x-[3px] bg-white/80'
          )}
        />
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Segmented control                                                          */
/* -------------------------------------------------------------------------- */

export interface SegmentOption<T extends string> {
  value: T;
  label: React.ReactNode;
  hint?: string;
}

export interface SegmentedControlProps<T extends string> {
  label?: string;
  ariaLabel: string;
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  columns?: number;
  disabled?: boolean;
}

export function SegmentedControl<T extends string>({
  label,
  ariaLabel,
  value,
  options,
  onChange,
  columns,
  disabled = false,
}: SegmentedControlProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (index + direction + options.length) % options.length;
    onChange(options[nextIndex].value);
    refs.current[nextIndex]?.focus();
  };

  return (
    <div className="grid gap-1.5 text-left">
      {label && (
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-dim">
          {label}
        </span>
      )}
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        className="grid gap-1 rounded-xl border border-white/[0.08] bg-black/20 p-1"
        style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}
      >
        {options.map((option, index) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              ref={(node) => {
                refs.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cx(
                'flex min-h-9 flex-col items-center justify-center rounded-lg px-2 py-1.5 text-center transition',
                selected
                  ? 'bg-accent text-[#171205] shadow-[0_6px_16px_-8px_rgba(255,210,63,0.8)]'
                  : 'text-ink-muted hover:bg-white/[0.06] hover:text-white',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              <span className="text-[11px] font-bold leading-tight">{option.label}</span>
              {option.hint && (
                <span
                  className={cx(
                    'mt-0.5 text-[8px] font-semibold uppercase tracking-[0.06em]',
                    selected ? 'text-[#171205]/65' : 'text-ink-dim'
                  )}
                >
                  {option.hint}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Card / Badge                                                               */
/* -------------------------------------------------------------------------- */

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  padding = 'md',
  className,
  children,
  ...props
}: CardProps) {
  const paddingClass = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  }[padding];

  return (
    <div
      className={cx(
        'rounded-2xl border border-white/[0.08] bg-white/[0.03]',
        paddingClass,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'accent' | 'success' | 'danger' | 'info';
}

export function Badge({
  variant = 'neutral',
  className,
  children,
  ...props
}: BadgeProps) {
  const variants = {
    neutral: 'border-white/12 bg-white/[0.055] text-ink-muted',
    accent: 'border-accent/30 bg-accent/10 text-accent',
    success: 'border-[#4ade80]/30 bg-[#4ade80]/10 text-[#75e69b]',
    danger: 'border-[#e43b44]/35 bg-[#e43b44]/10 text-[#ff8b94]',
    info: 'border-[#78b7ff]/30 bg-[#78b7ff]/10 text-[#9dcaff]',
  } as const;

  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.08em]',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
