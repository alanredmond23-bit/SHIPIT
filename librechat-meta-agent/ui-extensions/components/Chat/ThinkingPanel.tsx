'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Brain,
  ChevronDown,
  ChevronUp,
  Clock,
  Hash,
  Eye,
  EyeOff,
  Copy,
  Check,
} from 'lucide-react';
import clsx from 'clsx';
import { ThinkingBlock } from './ThinkingBlock';
import type { ThinkingPanelProps, ThinkingBlock as ThinkingBlockType } from '@/types/thinking';

/**
 * ThinkingPanel Component
 *
 * A collapsible panel that displays Claude's extended thinking with:
 * - Real-time streaming of thinking tokens
 * - Live timer showing thinking duration
 * - Token count display
 * - Show/Hide thinking toggle button
 * - Smooth expand/collapse animation
 * - Auto-scroll to latest content
 * - Copy all thinking button
 */
export function ThinkingPanel({
  thinkingBlocks,
  isThinking,
  thinkingStartTime,
  currentTokenCount,
  defaultExpanded = false,
  maxHeight = '400px',
  onToggle,
  className,
}: ThinkingPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [copied, setCopied] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer effect for thinking duration
  useEffect(() => {
    if (isThinking && thinkingStartTime) {
      // Start timer
      timerRef.current = setInterval(() => {
        setElapsedTime(Date.now() - thinkingStartTime.getTime());
      }, 100);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    } else if (!isThinking && timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, [isThinking, thinkingStartTime]);

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (isExpanded && isThinking && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [thinkingBlocks, isExpanded, isThinking]);

  // Reset timer when thinking stops
  useEffect(() => {
    if (!isThinking && !thinkingStartTime) {
      setElapsedTime(0);
    }
  }, [isThinking, thinkingStartTime]);

  const handleToggle = useCallback(() => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    onToggle?.(newState);
  }, [isExpanded, onToggle]);

  const handleCopyAll = useCallback(async () => {
    const allContent = thinkingBlocks.map((block) => block.content).join('\n\n---\n\n');
    try {
      await navigator.clipboard.writeText(allContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy all thinking content:', err);
    }
  }, [thinkingBlocks]);

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(0);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const totalTokens = thinkingBlocks.reduce((sum, block) => sum + block.tokenCount, 0) + (isThinking ? currentTokenCount : 0);

  // Don't render if no thinking content
  if (thinkingBlocks.length === 0 && !isThinking) {
    return null;
  }

  return (
    <div
      className={clsx(
        'rounded-xl border overflow-hidden transition-all duration-300',
        'bg-stone-50 dark:bg-stone-900/50',
        'border-stone-200 dark:border-stone-700',
        isThinking && 'ring-2 ring-teal-500/20',
        className
      )}
    >
      {/* Header - Always visible */}
      <button
        onClick={handleToggle}
        className={clsx(
          'w-full flex items-center justify-between px-4 py-3',
          'bg-stone-100 dark:bg-stone-800/80',
          'hover:bg-stone-150 dark:hover:bg-stone-800',
          'transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:ring-inset'
        )}
      >
        <div className="flex items-center gap-3">
          {/* Brain icon with animation when thinking */}
          <div
            className={clsx(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              'bg-teal-500/15 text-teal-600 dark:text-teal-400',
              isThinking && 'animate-pulse'
            )}
          >
            <Brain className="w-4 h-4" />
          </div>

          {/* Title */}
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-medium text-stone-800 dark:text-stone-200">
                Extended Thinking
              </span>
              {isThinking && (
                <span className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400">
                  <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-ping" />
                  Active
                </span>
              )}
            </div>

            {/* Stats line */}
            <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
              {/* Timer */}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {isThinking
                  ? `Thinking for ${formatDuration(elapsedTime)}...`
                  : thinkingBlocks.length > 0
                  ? `Thought for ${formatDuration(thinkingBlocks[thinkingBlocks.length - 1]?.durationMs || elapsedTime)}`
                  : 'Ready'}
              </span>

              {/* Token count */}
              {totalTokens > 0 && (
                <span className="flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  {totalTokens.toLocaleString()} thinking tokens
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* Copy all button (only when expanded and has content) */}
          {isExpanded && thinkingBlocks.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopyAll();
              }}
              className={clsx(
                'p-2 rounded-lg transition-colors duration-200',
                'hover:bg-stone-200 dark:hover:bg-stone-700',
                'text-stone-500 dark:text-stone-400'
              )}
              title="Copy all thinking"
              aria-label="Copy all thinking"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Toggle button with label */}
          <div className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
            {isExpanded ? (
              <>
                <EyeOff className="w-4 h-4" />
                <span className="hidden sm:inline">Hide thinking</span>
                <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">Show thinking</span>
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </div>
        </div>
      </button>

      {/* Expandable content */}
      <div
        className={clsx(
          'transition-all duration-300 ease-in-out overflow-hidden',
          isExpanded ? 'opacity-100' : 'opacity-0 max-h-0'
        )}
        style={{
          maxHeight: isExpanded ? maxHeight : '0px',
        }}
      >
        <div
          ref={scrollContainerRef}
          className="overflow-y-auto p-4 space-y-3"
          style={{ maxHeight: `calc(${maxHeight} - 1rem)` }}
        >
          {/* Thinking blocks */}
          {thinkingBlocks.map((block, index) => (
            <ThinkingBlock
              key={block.id}
              block={block}
              isStreaming={isThinking && index === thinkingBlocks.length - 1}
            />
          ))}

          {/* Thinking indicator when no blocks yet */}
          {isThinking && thinkingBlocks.length === 0 && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-stone-100 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-teal-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <span className="text-sm text-stone-500 dark:text-stone-400">
                Claude is thinking...
              </span>
            </div>
          )}

          {/* Empty state when no thinking happened */}
          {!isThinking && thinkingBlocks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-stone-400">
              <Brain className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No thinking process recorded</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ThinkingPanel;
