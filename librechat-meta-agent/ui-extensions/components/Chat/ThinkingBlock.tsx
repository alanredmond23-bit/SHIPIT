'use client';

import React, { useState, useCallback } from 'react';
import { Copy, Check, Clock, Hash } from 'lucide-react';
import clsx from 'clsx';
import type { ThinkingBlockProps } from '@/types/thinking';

/**
 * ThinkingBlock Component
 *
 * Renders an individual thinking block with:
 * - Monospace text display
 * - Copy button
 * - Timestamp display
 * - Token count
 * - Streaming cursor animation
 */
export function ThinkingBlock({
  block,
  isStreaming = false,
  onCopy,
  className,
}: ThinkingBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(block.content);
      setCopied(true);
      onCopy?.(block.content);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy thinking content:', err);
    }
  }, [block.content, onCopy]);

  const formatTimestamp = (date: Date): string => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  return (
    <div
      className={clsx(
        'relative group rounded-lg border transition-all duration-200',
        'bg-stone-100 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700',
        isStreaming && 'ring-1 ring-teal-500/30',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-stone-200 dark:border-stone-700">
        <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
          {/* Timestamp */}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTimestamp(block.timestamp)}
          </span>

          {/* Token count */}
          <span className="flex items-center gap-1">
            <Hash className="w-3 h-3" />
            {block.tokenCount.toLocaleString()} tokens
          </span>

          {/* Duration */}
          {block.durationMs > 0 && (
            <span className="text-teal-600 dark:text-teal-400">
              {formatDuration(block.durationMs)}
            </span>
          )}

          {/* Streaming indicator */}
          {isStreaming && (
            <span className="flex items-center gap-1 text-teal-500">
              <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse" />
              Streaming
            </span>
          )}
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className={clsx(
            'p-1.5 rounded-md transition-all duration-200',
            'opacity-0 group-hover:opacity-100 focus:opacity-100',
            'hover:bg-stone-200 dark:hover:bg-stone-700',
            'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
          )}
          title="Copy thinking content"
          aria-label="Copy thinking content"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-3 overflow-x-auto">
        <pre
          className={clsx(
            'text-sm font-mono whitespace-pre-wrap break-words leading-relaxed',
            'text-stone-700 dark:text-stone-300'
          )}
        >
          {block.content}
          {/* Streaming cursor */}
          {isStreaming && (
            <span className="inline-block w-2 h-4 ml-0.5 bg-teal-500 animate-blink" />
          )}
        </pre>
      </div>

      {/* Custom animation styles */}
      <style jsx>{`
        @keyframes blink {
          0%, 50% {
            opacity: 1;
          }
          51%, 100% {
            opacity: 0;
          }
        }
        .animate-blink {
          animation: blink 1s step-end infinite;
        }
      `}</style>
    </div>
  );
}

export default ThinkingBlock;
