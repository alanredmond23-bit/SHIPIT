'use client';

import React from 'react';
import { LoadingSpinner, RingSpinner } from './LoadingSpinner';

export interface LoadingOverlayProps {
  /** Whether the overlay is visible */
  isLoading?: boolean;
  /** Text to display below the spinner */
  text?: string;
  /** Secondary text (smaller, muted) */
  subtext?: string;
  /** Spinner variant */
  variant?: 'spinner' | 'ring' | 'dots';
  /** Size of the loading indicator */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to blur the background */
  blur?: boolean;
  /** Background opacity (0-100) */
  opacity?: number;
  /** Whether the overlay is fullscreen or fits parent */
  fullscreen?: boolean;
  /** Whether to show the teal glow effect */
  glow?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Children to overlay */
  children?: React.ReactNode;
}

export function LoadingOverlay({
  isLoading = true,
  text,
  subtext,
  variant = 'ring',
  size = 'md',
  blur = true,
  opacity = 80,
  fullscreen = false,
  glow = true,
  className = '',
  children,
}: LoadingOverlayProps) {
  if (!isLoading) {
    return <>{children}</>;
  }

  const spinnerSizeMap = {
    sm: 'sm' as const,
    md: 'md' as const,
    lg: 'lg' as const,
  };

  const renderSpinner = () => {
    switch (variant) {
      case 'ring':
        return <RingSpinner size={spinnerSizeMap[size]} />;
      case 'dots':
        return (
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`
                  ${size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'}
                  rounded-full
                  bg-[var(--accent-400)]
                  animate-bounce
                `}
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        );
      default:
        return (
          <LoadingSpinner
            size={spinnerSizeMap[size]}
            variant="accent"
          />
        );
    }
  };

  const overlayClasses = `
    ${fullscreen ? 'fixed inset-0' : 'absolute inset-0'}
    z-50
    flex
    flex-col
    items-center
    justify-center
    gap-4
    ${blur ? 'backdrop-blur-sm' : ''}
    transition-opacity
    duration-200
    ${className}
  `;

  const bgOpacity = Math.min(100, Math.max(0, opacity));

  return (
    <div className="relative">
      {children}
      <div
        className={overlayClasses}
        style={{
          backgroundColor: `rgba(var(--bg-0-rgb, 11, 15, 16), ${bgOpacity / 100})`,
        }}
        role="alert"
        aria-busy="true"
        aria-live="polite"
      >
        {/* Glow background effect */}
        {glow && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            aria-hidden="true"
          >
            <div
              className={`
                ${size === 'sm' ? 'w-24 h-24' : size === 'lg' ? 'w-48 h-48' : 'w-32 h-32'}
                rounded-full
                bg-[var(--accent-400)]
                opacity-10
                blur-3xl
                animate-pulse
              `}
            />
          </div>
        )}

        {/* Loading indicator */}
        <div className="relative z-10">
          {renderSpinner()}
        </div>

        {/* Text content */}
        {(text || subtext) && (
          <div className="relative z-10 text-center max-w-xs">
            {text && (
              <p className="text-[var(--text-primary)] font-medium">
                {text}
              </p>
            )}
            {subtext && (
              <p className="text-sm text-[var(--text-muted)] mt-1">
                {subtext}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Inline loading state (for buttons, inputs, etc.)
export interface InlineLoadingProps {
  isLoading?: boolean;
  text?: string;
  className?: string;
}

export function InlineLoading({
  isLoading = true,
  text = 'Loading...',
  className = '',
}: InlineLoadingProps) {
  if (!isLoading) return null;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <LoadingSpinner size="xs" variant="accent" />
      <span className="text-sm text-[var(--text-muted)]">{text}</span>
    </div>
  );
}

// Page-level loading state
export interface PageLoadingProps {
  text?: string;
  subtext?: string;
  showLogo?: boolean;
}

export function PageLoading({
  text = 'Loading...',
  subtext,
  showLogo = false,
}: PageLoadingProps) {
  return (
    <div className="fixed inset-0 bg-[var(--bg-0)] flex flex-col items-center justify-center z-50">
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-64 rounded-full bg-[var(--accent-400)] opacity-5 blur-3xl animate-pulse" />
      </div>

      {/* Logo placeholder */}
      {showLogo && (
        <div className="mb-8">
          <div className="w-16 h-16 rounded-xl bg-[var(--accent-400)] flex items-center justify-center animate-pulse">
            <span className="text-white font-bold text-2xl">M</span>
          </div>
        </div>
      )}

      {/* Spinner */}
      <RingSpinner size="lg" />

      {/* Text */}
      <div className="mt-6 text-center">
        <p className="text-[var(--text-primary)] font-medium text-lg">{text}</p>
        {subtext && (
          <p className="text-sm text-[var(--text-muted)] mt-2">{subtext}</p>
        )}
      </div>
    </div>
  );
}

// Skeleton overlay for content loading
export interface ContentLoadingProps {
  isLoading?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function ContentLoading({
  isLoading = true,
  children,
  className = '',
}: ContentLoadingProps) {
  return (
    <div className={`relative ${className}`}>
      <div
        className={`
          transition-opacity
          duration-300
          ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}
        `}
      >
        {children}
      </div>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner size="md" variant="accent" />
        </div>
      )}
    </div>
  );
}

export default LoadingOverlay;
