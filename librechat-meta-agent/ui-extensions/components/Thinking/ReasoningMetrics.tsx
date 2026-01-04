'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  RotateCcw,
  Lightbulb,
  Clock,
  TrendingUp,
  Brain,
  Sparkles,
  BarChart3,
  Target,
  Activity,
} from 'lucide-react';
import clsx from 'clsx';

// ============================================================================
// Types
// ============================================================================

export interface ReasoningMetricsProps {
  inflectionCount: number;
  reflectionCount: number;
  turnCount: number;
  thinkingDuration: number; // in milliseconds
  confidence: number; // 0-100
  thinkingTokens?: number;
  outputTokens?: number;
  isThinking?: boolean;
  variant?: 'default' | 'compact' | 'detailed' | 'minimal';
  showLabels?: boolean;
  className?: string;
}

// ============================================================================
// Animated Counter Hook
// ============================================================================

function useAnimatedCounter(value: number, duration: number = 300): number {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (value !== prevValueRef.current) {
      const start = displayValue;
      const end = value;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(Math.round(start + (end - start) * easeOut));

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
      prevValueRef.current = value;
    }
  }, [value, displayValue, duration]);

  return displayValue;
}

// ============================================================================
// Metric Item Component
// ============================================================================

interface MetricItemProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  animate?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  suffix?: string;
}

function MetricItem({
  icon: Icon,
  label,
  value,
  color,
  animate = false,
  showLabel = true,
  size = 'md',
  suffix,
}: MetricItemProps) {
  const numericValue = typeof value === 'number' ? value : 0;
  const displayValue = useAnimatedCounter(numericValue);

  const sizeClasses = {
    sm: {
      container: 'px-2 py-1.5',
      icon: 'w-3.5 h-3.5',
      value: 'text-sm',
      label: 'text-xs',
    },
    md: {
      container: 'px-3 py-2',
      icon: 'w-4 h-4',
      value: 'text-base',
      label: 'text-xs',
    },
    lg: {
      container: 'px-4 py-3',
      icon: 'w-5 h-5',
      value: 'text-lg',
      label: 'text-sm',
    },
  };

  const sizes = sizeClasses[size];

  const colorClasses: Record<string, { bg: string; text: string; iconBg: string }> = {
    yellow: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      text: 'text-yellow-600 dark:text-yellow-400',
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/40',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      text: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-100 dark:bg-purple-900/40',
    },
    teal: {
      bg: 'bg-teal-50 dark:bg-teal-900/20',
      text: 'text-teal-600 dark:text-teal-400',
      iconBg: 'bg-teal-100 dark:bg-teal-900/40',
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      text: 'text-green-600 dark:text-green-400',
      iconBg: 'bg-green-100 dark:bg-green-900/40',
    },
    orange: {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      text: 'text-orange-600 dark:text-orange-400',
      iconBg: 'bg-orange-100 dark:bg-orange-900/40',
    },
  };

  const colors = colorClasses[color] || colorClasses.teal;

  return (
    <div
      className={clsx(
        'flex items-center gap-2 rounded-lg transition-all duration-200',
        sizes.container,
        colors.bg,
        animate && 'animate-metric-pop'
      )}
    >
      <div className={clsx('p-1 rounded-md', colors.iconBg)}>
        <Icon className={clsx(sizes.icon, colors.text)} />
      </div>
      <div className="flex flex-col">
        <span className={clsx('font-bold leading-none', sizes.value, colors.text)}>
          {typeof value === 'number' ? displayValue : value}
          {suffix && <span className="text-xs font-normal opacity-70">{suffix}</span>}
        </span>
        {showLabel && (
          <span className={clsx('text-stone-500 dark:text-stone-400', sizes.label)}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Confidence Meter Component
// ============================================================================

interface ConfidenceMeterProps {
  confidence: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
}

function ConfidenceMeter({
  confidence,
  size = 'md',
  showLabel = true,
  animated = true,
}: ConfidenceMeterProps) {
  const displayValue = useAnimatedCounter(confidence);

  const getColor = (value: number) => {
    if (value >= 80) return { stroke: 'stroke-green-500', text: 'text-green-500' };
    if (value >= 60) return { stroke: 'stroke-teal-500', text: 'text-teal-500' };
    if (value >= 40) return { stroke: 'stroke-yellow-500', text: 'text-yellow-500' };
    return { stroke: 'stroke-orange-500', text: 'text-orange-500' };
  };

  const colors = getColor(confidence);

  const sizeConfig = {
    sm: { container: 'w-10 h-10', text: 'text-xs', strokeWidth: 3, radius: 16 },
    md: { container: 'w-14 h-14', text: 'text-sm', strokeWidth: 4, radius: 22 },
    lg: { container: 'w-20 h-20', text: 'text-base', strokeWidth: 5, radius: 32 },
  };

  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * config.radius;
  const offset = circumference - (confidence / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className={clsx('relative', config.container)}>
        <svg className="w-full h-full -rotate-90">
          {/* Background circle */}
          <circle
            cx="50%"
            cy="50%"
            r={config.radius}
            strokeWidth={config.strokeWidth}
            stroke="currentColor"
            fill="none"
            className="text-stone-200 dark:text-stone-700"
          />
          {/* Progress circle */}
          <circle
            cx="50%"
            cy="50%"
            r={config.radius}
            strokeWidth={config.strokeWidth}
            stroke="currentColor"
            fill="none"
            className={clsx(colors.stroke, 'transition-all duration-500')}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={animated ? offset : circumference - (displayValue / 100) * circumference}
          />
        </svg>
        {/* Percentage */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={clsx('font-bold', config.text, colors.text)}>
            {displayValue}%
          </span>
        </div>
      </div>
      {showLabel && (
        <span className="text-xs text-stone-500 dark:text-stone-400 mt-1">
          Confidence
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Duration Display Component
// ============================================================================

interface DurationDisplayProps {
  duration: number; // milliseconds
  isActive?: boolean;
  size?: 'sm' | 'md';
}

function DurationDisplay({ duration, isActive = false, size = 'md' }: DurationDisplayProps) {
  const [currentDuration, setCurrentDuration] = useState(duration);

  useEffect(() => {
    if (isActive) {
      const interval = setInterval(() => {
        setCurrentDuration((prev) => prev + 100);
      }, 100);
      return () => clearInterval(interval);
    } else {
      setCurrentDuration(duration);
    }
  }, [isActive, duration]);

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm';

  return (
    <div
      className={clsx(
        'flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20',
        sizeClasses
      )}
    >
      <Clock
        className={clsx(
          'text-blue-500',
          size === 'sm' ? 'w-3 h-3' : 'w-4 h-4',
          isActive && 'animate-pulse'
        )}
      />
      <span className="font-medium text-blue-600 dark:text-blue-400">
        {formatDuration(currentDuration)}
      </span>
    </div>
  );
}

// ============================================================================
// Token Usage Bar Component
// ============================================================================

interface TokenUsageBarProps {
  thinkingTokens: number;
  outputTokens?: number;
  maxTokens?: number;
}

function TokenUsageBar({
  thinkingTokens,
  outputTokens = 0,
  maxTokens = 100000,
}: TokenUsageBarProps) {
  const totalTokens = thinkingTokens + outputTokens;
  const thinkingPercent = (thinkingTokens / maxTokens) * 100;
  const outputPercent = (outputTokens / maxTokens) * 100;

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
    return tokens.toString();
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1 text-xs">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-teal-600 dark:text-teal-400">
            <Brain className="w-3 h-3" />
            {formatTokens(thinkingTokens)} thinking
          </span>
          {outputTokens > 0 && (
            <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-3 h-3" />
              {formatTokens(outputTokens)} output
            </span>
          )}
        </div>
        <span className="text-stone-400">{formatTokens(totalTokens)} total</span>
      </div>
      <div className="h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
        <div className="h-full flex">
          <div
            className="bg-teal-500 transition-all duration-500"
            style={{ width: `${Math.min(thinkingPercent, 100)}%` }}
          />
          <div
            className="bg-purple-500 transition-all duration-500"
            style={{ width: `${Math.min(outputPercent, 100 - thinkingPercent)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main ReasoningMetrics Component
// ============================================================================

export default function ReasoningMetrics({
  inflectionCount,
  reflectionCount,
  turnCount,
  thinkingDuration,
  confidence,
  thinkingTokens = 0,
  outputTokens = 0,
  isThinking = false,
  variant = 'default',
  showLabels = true,
  className,
}: ReasoningMetricsProps) {
  // Minimal variant - just icons with values
  if (variant === 'minimal') {
    return (
      <div className={clsx('flex items-center gap-2', className)}>
        <div className="flex items-center gap-1 text-yellow-500">
          <Zap className="w-4 h-4" />
          <span className="text-sm font-medium">{inflectionCount}</span>
        </div>
        <div className="flex items-center gap-1 text-purple-500">
          <RotateCcw className="w-4 h-4" />
          <span className="text-sm font-medium">{reflectionCount}</span>
        </div>
        <div className="flex items-center gap-1 text-teal-500">
          <Lightbulb className="w-4 h-4" />
          <span className="text-sm font-medium">{turnCount}</span>
        </div>
        <div className="w-px h-4 bg-stone-300 dark:bg-stone-600" />
        <div className={clsx(
          'flex items-center gap-1 text-sm font-medium',
          confidence >= 80 ? 'text-green-500' :
          confidence >= 60 ? 'text-teal-500' :
          confidence >= 40 ? 'text-yellow-500' : 'text-orange-500'
        )}>
          <Target className="w-4 h-4" />
          {confidence}%
        </div>
      </div>
    );
  }

  // Compact variant - horizontal row
  if (variant === 'compact') {
    return (
      <div
        className={clsx(
          'flex flex-wrap items-center gap-2 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700',
          className
        )}
      >
        <MetricItem
          icon={Zap}
          label="Inflections"
          value={inflectionCount}
          color="yellow"
          size="sm"
          showLabel={showLabels}
          animate={isThinking}
        />
        <MetricItem
          icon={RotateCcw}
          label="Reflections"
          value={reflectionCount}
          color="purple"
          size="sm"
          showLabel={showLabels}
          animate={isThinking}
        />
        <MetricItem
          icon={Lightbulb}
          label="Turns"
          value={turnCount}
          color="teal"
          size="sm"
          showLabel={showLabels}
          animate={isThinking}
        />
        <div className="w-px h-8 bg-stone-300 dark:bg-stone-600" />
        <DurationDisplay duration={thinkingDuration} isActive={isThinking} size="sm" />
        <ConfidenceMeter confidence={confidence} size="sm" showLabel={false} />
      </div>
    );
  }

  // Detailed variant - full stats panel
  if (variant === 'detailed') {
    return (
      <div
        className={clsx(
          'p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-sm',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-stone-900 dark:text-stone-100">
                Reasoning Metrics
              </h4>
              <p className="text-xs text-stone-500">Real-time thinking analysis</p>
            </div>
          </div>
          {isThinking && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-teal-100 dark:bg-teal-900/30 rounded-full">
              <Activity className="w-3 h-3 text-teal-500 animate-pulse" />
              <span className="text-xs font-medium text-teal-600 dark:text-teal-400">
                Active
              </span>
            </div>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <MetricItem
            icon={Zap}
            label="Inflections"
            value={inflectionCount}
            color="yellow"
            size="lg"
            animate={isThinking}
          />
          <MetricItem
            icon={RotateCcw}
            label="Reflections"
            value={reflectionCount}
            color="purple"
            size="lg"
            animate={isThinking}
          />
          <MetricItem
            icon={Lightbulb}
            label="Turns"
            value={turnCount}
            color="teal"
            size="lg"
            animate={isThinking}
          />
          <div className="flex items-center justify-center">
            <ConfidenceMeter confidence={confidence} size="lg" />
          </div>
        </div>

        {/* Duration */}
        <div className="flex items-center justify-between mb-4 p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-stone-500" />
            <span className="text-sm text-stone-600 dark:text-stone-400">
              Thinking Duration
            </span>
          </div>
          <DurationDisplay duration={thinkingDuration} isActive={isThinking} />
        </div>

        {/* Token Usage */}
        {(thinkingTokens > 0 || outputTokens > 0) && (
          <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-stone-500" />
              <span className="text-sm text-stone-600 dark:text-stone-400">
                Token Usage
              </span>
            </div>
            <TokenUsageBar
              thinkingTokens={thinkingTokens}
              outputTokens={outputTokens}
            />
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={clsx(
        'p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700',
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <MetricItem
          icon={Zap}
          label="Inflections"
          value={inflectionCount}
          color="yellow"
          showLabel={showLabels}
          animate={isThinking}
        />
        <MetricItem
          icon={RotateCcw}
          label="Reflections"
          value={reflectionCount}
          color="purple"
          showLabel={showLabels}
          animate={isThinking}
        />
        <MetricItem
          icon={Lightbulb}
          label="Turns"
          value={turnCount}
          color="teal"
          showLabel={showLabels}
          animate={isThinking}
        />

        <div className="flex-1" />

        <DurationDisplay duration={thinkingDuration} isActive={isThinking} />
        <ConfidenceMeter confidence={confidence} size="md" showLabel={showLabels} />
      </div>

      {/* Token usage (if provided) */}
      {(thinkingTokens > 0 || outputTokens > 0) && (
        <div className="mt-3 pt-3 border-t border-stone-200 dark:border-stone-700">
          <TokenUsageBar thinkingTokens={thinkingTokens} outputTokens={outputTokens} />
        </div>
      )}

      {/* Styles */}
      <style jsx>{`
        @keyframes metric-pop {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
          }
        }

        .animate-metric-pop {
          animation: metric-pop 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
