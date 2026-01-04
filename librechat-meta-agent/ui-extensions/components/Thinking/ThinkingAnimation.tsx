'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Brain,
  ChevronDown,
  ChevronUp,
  Zap,
  RotateCcw,
  Lightbulb,
  TrendingUp,
  Clock,
  Sparkles,
} from 'lucide-react';
import clsx from 'clsx';

// ============================================================================
// Types
// ============================================================================

export interface Thought {
  type: 'turn' | 'reflection' | 'conclusion';
  content: string;
  timestamp: number;
}

export interface ThinkingState {
  isThinking: boolean;
  progress: number; // 0-100
  inflectionCount: number;
  reflectionCount: number;
  turnCount: number;
  thinkingTokens: number;
  outputTokens?: number;
  confidence: number; // 0-100
  thoughts: Thought[];
  estimatedCompletion?: number; // seconds remaining
  startTime?: number;
}

export interface ThinkingAnimationProps {
  state: ThinkingState;
  onExpand?: () => void;
  onCollapse?: () => void;
  className?: string;
  compact?: boolean;
}

// ============================================================================
// Brain Animation Component
// ============================================================================

function AnimatedBrain({ isThinking }: { isThinking: boolean }) {
  return (
    <div className="relative">
      {/* Outer glow rings */}
      {isThinking && (
        <>
          <div className="absolute inset-0 -m-2 rounded-full bg-teal-500/20 animate-ping" />
          <div
            className="absolute inset-0 -m-1 rounded-full bg-teal-400/30"
            style={{
              animation: 'pulse-ring 2s ease-in-out infinite',
              animationDelay: '0.5s',
            }}
          />
        </>
      )}

      {/* Brain icon container */}
      <div
        className={clsx(
          'relative p-3 rounded-xl transition-all duration-300',
          isThinking
            ? 'bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/30'
            : 'bg-stone-200'
        )}
      >
        <Brain
          className={clsx(
            'w-6 h-6 transition-colors duration-300',
            isThinking ? 'text-white' : 'text-stone-500'
          )}
          style={{
            animation: isThinking ? 'brain-pulse 1.5s ease-in-out infinite' : 'none',
          }}
        />

        {/* Neural activity dots */}
        {isThinking && (
          <div className="absolute inset-0 overflow-hidden rounded-xl">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white/60 rounded-full"
                style={{
                  left: `${20 + Math.random() * 60}%`,
                  top: `${20 + Math.random() * 60}%`,
                  animation: `neuron-fire 0.8s ease-out infinite`,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Progress Bar Component
// ============================================================================

function ProgressBar({
  progress,
  isThinking,
  estimatedSeconds,
}: {
  progress: number;
  isThinking: boolean;
  estimatedSeconds?: number;
}) {
  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-stone-500">
          {isThinking ? 'Thinking...' : progress >= 100 ? 'Complete' : 'Ready'}
        </span>
        {estimatedSeconds !== undefined && estimatedSeconds > 0 && isThinking && (
          <span className="text-xs text-stone-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />~{estimatedSeconds}s remaining
          </span>
        )}
      </div>
      <div className="h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-500 ease-out',
            isThinking
              ? 'bg-gradient-to-r from-teal-400 via-teal-500 to-teal-400 bg-[length:200%_100%]'
              : progress >= 100
              ? 'bg-green-500'
              : 'bg-stone-300'
          )}
          style={{
            width: `${Math.min(progress, 100)}%`,
            animation: isThinking ? 'shimmer 2s linear infinite' : 'none',
          }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Confidence Meter Component
// ============================================================================

function ConfidenceMeter({ confidence }: { confidence: number }) {
  const getConfidenceColor = (value: number) => {
    if (value >= 80) return 'text-green-500';
    if (value >= 60) return 'text-teal-500';
    if (value >= 40) return 'text-yellow-500';
    return 'text-orange-500';
  };

  const getConfidenceLabel = (value: number) => {
    if (value >= 80) return 'High';
    if (value >= 60) return 'Good';
    if (value >= 40) return 'Medium';
    return 'Low';
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-12 h-12">
        {/* Background circle */}
        <svg className="w-full h-full -rotate-90">
          <circle
            cx="24"
            cy="24"
            r="20"
            strokeWidth="4"
            stroke="currentColor"
            fill="none"
            className="text-stone-200 dark:text-stone-700"
          />
          <circle
            cx="24"
            cy="24"
            r="20"
            strokeWidth="4"
            stroke="currentColor"
            fill="none"
            className={getConfidenceColor(confidence)}
            strokeLinecap="round"
            strokeDasharray={`${(confidence / 100) * 125.6} 125.6`}
            style={{
              transition: 'stroke-dasharray 0.5s ease-out',
            }}
          />
        </svg>
        {/* Percentage text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={clsx('text-xs font-bold', getConfidenceColor(confidence))}>
            {Math.round(confidence)}%
          </span>
        </div>
      </div>
      <span className="text-xs text-stone-500 mt-1">{getConfidenceLabel(confidence)}</span>
    </div>
  );
}

// ============================================================================
// Metric Counter Component
// ============================================================================

function MetricCounter({
  icon: Icon,
  label,
  value,
  color,
  animate,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  animate?: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (value !== prevValueRef.current) {
      // Animate the counter
      const start = displayValue;
      const end = value;
      const duration = 300;
      const startTime = performance.now();

      const animateValue = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out
        const easeOut = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(Math.round(start + (end - start) * easeOut));

        if (progress < 1) {
          requestAnimationFrame(animateValue);
        }
      };

      requestAnimationFrame(animateValue);
      prevValueRef.current = value;
    }
  }, [value, displayValue]);

  return (
    <div
      className={clsx(
        'flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300',
        `bg-${color}-50 dark:bg-${color}-900/20`
      )}
      style={{
        animation: animate && value > prevValueRef.current ? 'counter-pop 0.3s ease-out' : 'none',
      }}
    >
      <Icon className={clsx('w-4 h-4', `text-${color}-500`)} />
      <div className="flex flex-col">
        <span className={clsx('text-sm font-bold', `text-${color}-600 dark:text-${color}-400`)}>
          {displayValue}
        </span>
        <span className="text-xs text-stone-500">{label}</span>
      </div>
    </div>
  );
}

// ============================================================================
// Token Usage Component
// ============================================================================

function TokenUsage({
  thinkingTokens,
  outputTokens,
}: {
  thinkingTokens: number;
  outputTokens?: number;
}) {
  const formatTokens = (tokens: number) => {
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}k`;
    }
    return tokens.toString();
  };

  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="flex items-center gap-1.5 px-2 py-1 bg-teal-50 dark:bg-teal-900/20 rounded">
        <Brain className="w-3 h-3 text-teal-500" />
        <span className="text-teal-600 dark:text-teal-400 font-medium">
          {formatTokens(thinkingTokens)}
        </span>
        <span className="text-stone-400">thinking</span>
      </div>
      {outputTokens !== undefined && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 dark:bg-purple-900/20 rounded">
          <Sparkles className="w-3 h-3 text-purple-500" />
          <span className="text-purple-600 dark:text-purple-400 font-medium">
            {formatTokens(outputTokens)}
          </span>
          <span className="text-stone-400">output</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main ThinkingAnimation Component
// ============================================================================

export default function ThinkingAnimation({
  state,
  onExpand,
  onCollapse,
  className,
  compact = false,
}: ThinkingAnimationProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Timer for elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (state.isThinking && state.startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - state.startTime!) / 1000));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state.isThinking, state.startTime]);

  const handleToggleExpand = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    if (newExpanded && onExpand) {
      onExpand();
    } else if (!newExpanded && onCollapse) {
      onCollapse();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  if (compact) {
    return (
      <div
        className={clsx(
          'flex items-center gap-3 p-3 rounded-xl border transition-all duration-300',
          state.isThinking
            ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800'
            : 'bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700',
          className
        )}
      >
        <AnimatedBrain isThinking={state.isThinking} />
        <div className="flex-1 min-w-0">
          <ProgressBar
            progress={state.progress}
            isThinking={state.isThinking}
            estimatedSeconds={state.estimatedCompletion}
          />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-stone-500">{state.turnCount} turns</span>
          <ConfidenceMeter confidence={state.confidence} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'rounded-2xl border transition-all duration-300 overflow-hidden',
        state.isThinking
          ? 'bg-gradient-to-br from-teal-50 to-white dark:from-teal-900/20 dark:to-stone-900 border-teal-200 dark:border-teal-800 shadow-lg shadow-teal-500/10'
          : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700',
        className
      )}
    >
      {/* Main Header */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
        onClick={handleToggleExpand}
      >
        <AnimatedBrain isThinking={state.isThinking} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-stone-900 dark:text-stone-100">
              {state.isThinking ? 'AI is Thinking...' : 'Thinking Complete'}
            </h3>
            {state.isThinking && elapsedTime > 0 && (
              <span className="text-xs text-stone-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(elapsedTime)}
              </span>
            )}
          </div>
          <ProgressBar
            progress={state.progress}
            isThinking={state.isThinking}
            estimatedSeconds={state.estimatedCompletion}
          />
        </div>

        <ConfidenceMeter confidence={state.confidence} />

        <button
          className="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-stone-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-stone-500" />
          )}
        </button>
      </div>

      {/* Metrics Bar */}
      <div className="px-4 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <MetricCounter
            icon={Zap}
            label="Inflections"
            value={state.inflectionCount}
            color="yellow"
            animate={state.isThinking}
          />
          <MetricCounter
            icon={RotateCcw}
            label="Reflections"
            value={state.reflectionCount}
            color="purple"
            animate={state.isThinking}
          />
          <MetricCounter
            icon={Lightbulb}
            label="Turns"
            value={state.turnCount}
            color="teal"
            animate={state.isThinking}
          />
          <div className="flex-1" />
          <TokenUsage thinkingTokens={state.thinkingTokens} outputTokens={state.outputTokens} />
        </div>
      </div>

      {/* Expandable Thought Stream */}
      {isExpanded && (
        <div className="border-t border-stone-200 dark:border-stone-700">
          <div className="p-4 max-h-80 overflow-y-auto">
            {state.thoughts.length === 0 ? (
              <div className="text-center py-8 text-stone-400">
                <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Waiting for thoughts...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {state.thoughts.map((thought, idx) => (
                  <ThoughtBubble key={idx} thought={thought} index={idx} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes pulse-ring {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.1;
          }
        }

        @keyframes brain-pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        @keyframes neuron-fire {
          0% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            opacity: 1;
            transform: scale(1.5);
          }
          100% {
            opacity: 0;
            transform: scale(0);
          }
        }

        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        @keyframes counter-pop {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes slide-in {
          0% {
            opacity: 0;
            transform: translateX(-20px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Thought Bubble Sub-component
// ============================================================================

function ThoughtBubble({ thought, index }: { thought: Thought; index: number }) {
  const getTypeStyles = (type: Thought['type']) => {
    switch (type) {
      case 'turn':
        return {
          bg: 'bg-stone-100 dark:bg-stone-800',
          border: 'border-stone-200 dark:border-stone-700',
          icon: Lightbulb,
          iconColor: 'text-teal-500',
          label: 'Turn',
        };
      case 'reflection':
        return {
          bg: 'bg-purple-50 dark:bg-purple-900/20',
          border: 'border-purple-200 dark:border-purple-800',
          icon: RotateCcw,
          iconColor: 'text-purple-500',
          label: 'Reflection',
        };
      case 'conclusion':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800',
          icon: TrendingUp,
          iconColor: 'text-green-500',
          label: 'Conclusion',
        };
    }
  };

  const styles = getTypeStyles(thought.type);
  const Icon = styles.icon;

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div
      className={clsx(
        'p-3 rounded-xl border transition-all duration-300',
        styles.bg,
        styles.border
      )}
      style={{
        animation: `slide-in 0.3s ease-out ${index * 0.05}s both`,
      }}
    >
      <div className="flex items-start gap-3">
        <div className={clsx('p-1.5 rounded-lg', styles.bg)}>
          <Icon className={clsx('w-4 h-4', styles.iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={clsx('text-xs font-semibold uppercase tracking-wider', styles.iconColor)}>
              {styles.label}
            </span>
            <span className="text-xs text-stone-400">{formatTimestamp(thought.timestamp)}</span>
          </div>
          <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
            {thought.content}
          </p>
        </div>
      </div>
    </div>
  );
}
