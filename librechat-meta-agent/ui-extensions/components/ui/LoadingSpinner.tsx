'use client';

import React from 'react';

export interface LoadingSpinnerProps {
  /** Size of the spinner */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Color variant */
  variant?: 'default' | 'accent' | 'white' | 'muted';
  /** Optional label for accessibility */
  label?: string;
  /** Additional CSS classes */
  className?: string;
  /** Show label text below spinner */
  showLabel?: boolean;
}

const sizeMap = {
  xs: { spinner: 'w-3 h-3', border: 'border', text: 'text-xs' },
  sm: { spinner: 'w-4 h-4', border: 'border-2', text: 'text-xs' },
  md: { spinner: 'w-6 h-6', border: 'border-2', text: 'text-sm' },
  lg: { spinner: 'w-8 h-8', border: 'border-2', text: 'text-base' },
  xl: { spinner: 'w-12 h-12', border: 'border-[3px]', text: 'text-base' },
};

const variantMap = {
  default: 'border-[var(--border-strong)] border-t-[var(--text-primary)]',
  accent: 'border-[var(--accent-subtle)] border-t-[var(--accent-400)]',
  white: 'border-white/20 border-t-white',
  muted: 'border-[var(--border-default)] border-t-[var(--text-muted)]',
};

export function LoadingSpinner({
  size = 'md',
  variant = 'accent',
  label = 'Loading...',
  className = '',
  showLabel = false,
}: LoadingSpinnerProps) {
  const sizeClasses = sizeMap[size];
  const variantClasses = variantMap[variant];

  return (
    <div
      role="status"
      aria-label={label}
      className={`inline-flex flex-col items-center justify-center gap-2 ${className}`}
    >
      <div
        className={`
          ${sizeClasses.spinner}
          ${sizeClasses.border}
          ${variantClasses}
          rounded-full
          animate-spin
        `}
        aria-hidden="true"
      />
      {showLabel && (
        <span className={`${sizeClasses.text} text-[var(--text-muted)]`}>
          {label}
        </span>
      )}
      <span className="sr-only">{label}</span>
    </div>
  );
}

// Dot spinner variant
export interface DotSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'accent';
  className?: string;
}

export function DotSpinner({
  size = 'md',
  variant = 'accent',
  className = '',
}: DotSpinnerProps) {
  const dotSizeMap = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  };

  const dotColorMap = {
    default: 'bg-[var(--text-muted)]',
    accent: 'bg-[var(--accent-400)]',
  };

  const dotClass = `${dotSizeMap[size]} ${dotColorMap[variant]} rounded-full`;

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`inline-flex items-center gap-1 ${className}`}
    >
      <div className={`${dotClass} animate-bounce`} style={{ animationDelay: '0ms' }} />
      <div className={`${dotClass} animate-bounce`} style={{ animationDelay: '150ms' }} />
      <div className={`${dotClass} animate-bounce`} style={{ animationDelay: '300ms' }} />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// Pulse spinner variant
export interface PulseSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PulseSpinner({
  size = 'md',
  className = '',
}: PulseSpinnerProps) {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`relative inline-flex items-center justify-center ${className}`}
    >
      <div
        className={`
          ${sizeMap[size]}
          rounded-full
          bg-[var(--accent-400)]
          animate-ping
          absolute
          opacity-75
        `}
      />
      <div
        className={`
          ${sizeMap[size]}
          rounded-full
          bg-[var(--accent-400)]
          relative
        `}
      />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// Ring spinner variant (teal glow effect)
export interface RingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function RingSpinner({
  size = 'md',
  className = '',
}: RingSpinnerProps) {
  const sizeMap = {
    sm: { outer: 'w-6 h-6', inner: 'w-3 h-3' },
    md: { outer: 'w-10 h-10', inner: 'w-5 h-5' },
    lg: { outer: 'w-14 h-14', inner: 'w-7 h-7' },
  };

  const sizes = sizeMap[size];

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`relative inline-flex items-center justify-center ${className}`}
    >
      {/* Outer ring with glow */}
      <div
        className={`
          ${sizes.outer}
          rounded-full
          border-2
          border-[var(--accent-subtle)]
          border-t-[var(--accent-400)]
          animate-spin
          shadow-[0_0_15px_var(--accent-glow)]
        `}
      />
      {/* Inner dot */}
      <div
        className={`
          ${sizes.inner}
          absolute
          rounded-full
          bg-[var(--accent-400)]
          animate-pulse
        `}
      />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export default LoadingSpinner;
