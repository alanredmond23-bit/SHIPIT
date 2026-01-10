'use client';

import React from 'react';

export interface ProgressBarProps {
  /** Progress value (0-100) */
  value?: number;
  /** Maximum value */
  max?: number;
  /** Whether the progress is indeterminate */
  indeterminate?: boolean;
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Color variant */
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'error';
  /** Show percentage label */
  showLabel?: boolean;
  /** Label position */
  labelPosition?: 'inside' | 'outside' | 'top';
  /** Custom label format */
  formatLabel?: (value: number, max: number) => string;
  /** Whether to animate value changes */
  animated?: boolean;
  /** Whether to show a glow effect */
  glow?: boolean;
  /** Whether to show stripes animation */
  striped?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Accessible label */
  'aria-label'?: string;
}

const sizeMap = {
  xs: { height: 'h-1', text: 'text-[10px]', padding: 'px-1' },
  sm: { height: 'h-2', text: 'text-xs', padding: 'px-1.5' },
  md: { height: 'h-3', text: 'text-xs', padding: 'px-2' },
  lg: { height: 'h-4', text: 'text-sm', padding: 'px-2.5' },
};

const variantMap = {
  default: {
    track: 'bg-[var(--bg-3)]',
    fill: 'bg-[var(--text-secondary)]',
    glow: 'shadow-none',
  },
  accent: {
    track: 'bg-[var(--accent-subtle)]',
    fill: 'bg-[var(--accent-400)]',
    glow: 'shadow-[0_0_10px_var(--accent-glow)]',
  },
  success: {
    track: 'bg-[var(--success-muted)]',
    fill: 'bg-[var(--success)]',
    glow: 'shadow-[0_0_10px_rgba(34,197,94,0.3)]',
  },
  warning: {
    track: 'bg-[var(--warning-muted)]',
    fill: 'bg-[var(--warning)]',
    glow: 'shadow-[0_0_10px_rgba(245,158,11,0.3)]',
  },
  error: {
    track: 'bg-[var(--error-muted)]',
    fill: 'bg-[var(--error)]',
    glow: 'shadow-[0_0_10px_rgba(239,68,68,0.3)]',
  },
};

export function ProgressBar({
  value = 0,
  max = 100,
  indeterminate = false,
  size = 'md',
  variant = 'accent',
  showLabel = false,
  labelPosition = 'outside',
  formatLabel,
  animated = true,
  glow = false,
  striped = false,
  className = '',
  'aria-label': ariaLabel,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const sizeClasses = sizeMap[size];
  const variantClasses = variantMap[variant];

  const defaultFormatLabel = (val: number, maxVal: number) => {
    return `${Math.round((val / maxVal) * 100)}%`;
  };

  const label = formatLabel
    ? formatLabel(value, max)
    : defaultFormatLabel(value, max);

  const canShowInsideLabel = size === 'lg' && labelPosition === 'inside';

  return (
    <div className={`w-full ${className}`}>
      {/* Top label */}
      {showLabel && labelPosition === 'top' && (
        <div className="flex justify-between items-center mb-1">
          <span className={`${sizeClasses.text} text-[var(--text-muted)]`}>
            Progress
          </span>
          <span className={`${sizeClasses.text} text-[var(--text-primary)] font-medium`}>
            {label}
          </span>
        </div>
      )}

      <div className="flex items-center gap-3">
        {/* Progress track */}
        <div
          className={`
            flex-1
            ${sizeClasses.height}
            ${variantClasses.track}
            rounded-full
            overflow-hidden
          `}
          role="progressbar"
          aria-valuenow={indeterminate ? undefined : value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={ariaLabel || `Progress: ${label}`}
        >
          {/* Progress fill */}
          <div
            className={`
              h-full
              ${variantClasses.fill}
              ${glow ? variantClasses.glow : ''}
              ${animated && !indeterminate ? 'transition-all duration-300 ease-out' : ''}
              ${indeterminate ? 'animate-[progressIndeterminate_1.5s_ease-in-out_infinite]' : ''}
              ${striped ? 'bg-gradient-to-r from-transparent via-white/10 to-transparent bg-[length:20px_100%] animate-[shimmer_1s_linear_infinite]' : ''}
              rounded-full
              relative
            `}
            style={{
              width: indeterminate ? '50%' : `${percentage}%`,
            }}
          >
            {/* Inside label */}
            {showLabel && canShowInsideLabel && percentage > 15 && (
              <span
                className={`
                  absolute
                  inset-0
                  flex
                  items-center
                  justify-end
                  ${sizeClasses.padding}
                  ${sizeClasses.text}
                  text-white
                  font-medium
                `}
              >
                {label}
              </span>
            )}
          </div>
        </div>

        {/* Outside label */}
        {showLabel && labelPosition === 'outside' && (
          <span
            className={`
              ${sizeClasses.text}
              text-[var(--text-primary)]
              font-medium
              min-w-[3rem]
              text-right
            `}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

// Step progress variant
export interface StepProgressProps {
  /** Current step (0-indexed) */
  currentStep: number;
  /** Total number of steps */
  totalSteps: number;
  /** Step labels */
  labels?: string[];
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show step numbers */
  showNumbers?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function StepProgress({
  currentStep,
  totalSteps,
  labels,
  size = 'md',
  showNumbers = true,
  className = '',
}: StepProgressProps) {
  const stepSizeMap = {
    sm: { dot: 'w-6 h-6 text-xs', line: 'h-0.5', text: 'text-xs' },
    md: { dot: 'w-8 h-8 text-sm', line: 'h-1', text: 'text-sm' },
    lg: { dot: 'w-10 h-10 text-base', line: 'h-1.5', text: 'text-base' },
  };

  const sizeClasses = stepSizeMap[size];

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isLast = index === totalSteps - 1;

          return (
            <React.Fragment key={index}>
              {/* Step dot */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    ${sizeClasses.dot}
                    rounded-full
                    flex
                    items-center
                    justify-center
                    font-medium
                    transition-all
                    duration-200
                    ${
                      isCompleted
                        ? 'bg-[var(--accent-400)] text-white'
                        : isCurrent
                        ? 'bg-[var(--accent-subtle)] text-[var(--accent-400)] ring-2 ring-[var(--accent-400)]'
                        : 'bg-[var(--bg-3)] text-[var(--text-muted)]'
                    }
                  `}
                >
                  {showNumbers ? (
                    isCompleted ? (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      index + 1
                    )
                  ) : null}
                </div>

                {/* Step label */}
                {labels && labels[index] && (
                  <span
                    className={`
                      ${sizeClasses.text}
                      mt-2
                      text-center
                      max-w-[80px]
                      truncate
                      ${
                        isCompleted || isCurrent
                          ? 'text-[var(--text-primary)]'
                          : 'text-[var(--text-muted)]'
                      }
                    `}
                  >
                    {labels[index]}
                  </span>
                )}
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={`
                    flex-1
                    ${sizeClasses.line}
                    mx-2
                    rounded-full
                    ${isCompleted ? 'bg-[var(--accent-400)]' : 'bg-[var(--bg-3)]'}
                    transition-colors
                    duration-200
                  `}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// Circular progress variant
export interface CircularProgressProps {
  /** Progress value (0-100) */
  value?: number;
  /** Size in pixels */
  size?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Whether to show the value */
  showValue?: boolean;
  /** Color variant */
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'error';
  /** Additional CSS classes */
  className?: string;
}

export function CircularProgress({
  value = 0,
  size = 64,
  strokeWidth = 4,
  showValue = true,
  variant = 'accent',
  className = '',
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min(100, Math.max(0, value));
  const offset = circumference - (percentage / 100) * circumference;

  const colorMap = {
    default: 'stroke-[var(--text-secondary)]',
    accent: 'stroke-[var(--accent-400)]',
    success: 'stroke-[var(--success)]',
    warning: 'stroke-[var(--warning)]',
    error: 'stroke-[var(--error)]',
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        {/* Background track */}
        <circle
          className="stroke-[var(--bg-3)]"
          fill="none"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress arc */}
        <circle
          className={`${colorMap[variant]} transition-all duration-300 ease-out`}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  );
}

export default ProgressBar;
