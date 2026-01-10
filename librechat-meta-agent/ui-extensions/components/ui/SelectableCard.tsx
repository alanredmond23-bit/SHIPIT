'use client';

import React from 'react';
import { Check } from 'lucide-react';

interface SelectableCardProps {
  /** Card title */
  title: string;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Optional metadata (e.g., date, category) */
  meta?: string;
  /** Whether the card is currently selected */
  selected?: boolean;
  /** Called when selection state changes */
  onSelect?: (selected: boolean) => void;
  /** Optional icon to display */
  icon?: React.ReactNode;
  /** Optional badge content */
  badge?: string;
  /** Card content */
  children?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Disable interaction */
  disabled?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * SelectableCard - A card component with checkbox-style selection
 *
 * Used for multi-select scenarios like document selection,
 * bulk actions, or preference picking.
 *
 * Features:
 * - Teal accent when selected
 * - Smooth transitions
 * - Accessible focus states
 * - Multiple size variants
 */
export function SelectableCard({
  title,
  subtitle,
  meta,
  selected = false,
  onSelect,
  icon,
  badge,
  children,
  className = '',
  disabled = false,
  size = 'md',
}: SelectableCardProps) {
  const handleClick = () => {
    if (!disabled && onSelect) {
      onSelect(!selected);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled && onSelect) {
      e.preventDefault();
      onSelect(!selected);
    }
  };

  const sizeStyles = {
    sm: {
      padding: 'p-4',
      titleSize: 'text-sm',
      checkSize: 'w-5 h-5',
      checkIconSize: 'w-3 h-3',
      gap: 'gap-3',
    },
    md: {
      padding: 'p-5',
      titleSize: 'text-base',
      checkSize: 'w-6 h-6',
      checkIconSize: 'w-3.5 h-3.5',
      gap: 'gap-4',
    },
    lg: {
      padding: 'p-6',
      titleSize: 'text-lg',
      checkSize: 'w-7 h-7',
      checkIconSize: 'w-4 h-4',
      gap: 'gap-5',
    },
  };

  const styles = sizeStyles[size];

  return (
    <div
      role="checkbox"
      aria-checked={selected}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        group relative
        bg-white border rounded-xl
        transition-all duration-200 ease-out
        ${styles.padding}
        ${selected
          ? 'border-teal-500 bg-teal-50/40 ring-1 ring-teal-500/20'
          : 'border-warm-200 hover:border-warm-300'
        }
        ${disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'cursor-pointer hover:shadow-soft'
        }
        focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2
        ${className}
      `}
    >
      {/* Selection indicator - positioned top right */}
      <div
        className={`
          absolute top-4 right-4
          ${styles.checkSize}
          rounded-full
          flex items-center justify-center
          transition-all duration-200
          ${selected
            ? 'bg-teal-500 text-white scale-100'
            : 'bg-warm-100 border border-warm-200 text-transparent group-hover:border-warm-300'
          }
        `}
        aria-hidden="true"
      >
        <Check className={`${styles.checkIconSize} ${selected ? 'opacity-100' : 'opacity-0'} transition-opacity`} />
      </div>

      {/* Badge */}
      {badge && (
        <span className="absolute top-4 left-4 px-2 py-0.5 text-xs font-medium bg-teal-100 text-teal-700 rounded-full">
          {badge}
        </span>
      )}

      {/* Content */}
      <div className={`flex ${styles.gap} pr-8`}>
        {/* Icon */}
        {icon && (
          <div
            className={`
              flex-shrink-0
              ${size === 'sm' ? 'w-10 h-10' : size === 'md' ? 'w-12 h-12' : 'w-14 h-14'}
              rounded-lg bg-warm-100
              flex items-center justify-center
              text-warm-600
              transition-colors duration-200
              ${selected ? 'bg-teal-100 text-teal-600' : ''}
            `}
          >
            {icon}
          </div>
        )}

        {/* Text content */}
        <div className="flex-1 min-w-0">
          {/* Meta label */}
          {meta && (
            <p className="text-xs font-medium text-warm-400 uppercase tracking-wide mb-1">
              {meta}
            </p>
          )}

          {/* Title */}
          <h3
            className={`
              font-medium text-warm-900 leading-snug
              ${styles.titleSize}
              ${selected ? 'text-teal-900' : ''}
            `}
          >
            {title}
          </h3>

          {/* Subtitle */}
          {subtitle && (
            <p className={`text-warm-500 mt-1 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
              {subtitle}
            </p>
          )}

          {/* Additional content */}
          {children && (
            <div className={`mt-3 ${size === 'sm' ? 'text-sm' : ''}`}>
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SelectableCard;
