'use client';

import React from 'react';
import { TypingUser } from '../../lib/realtime/use-realtime';

/**
 * Props for TypingIndicator component
 */
export interface TypingIndicatorProps {
  typingUsers: TypingUser[];
  maxNamesToShow?: number;
  variant?: 'default' | 'compact' | 'dots-only';
  className?: string;
}

/**
 * Animated dots component
 */
function AnimatedDots({ className = '' }: { className?: string }) {
  return (
    <div className={`flex space-x-1 ${className}`}>
      <div
        className="w-2 h-2 bg-current rounded-full animate-bounce"
        style={{ animationDelay: '0ms' }}
      />
      <div
        className="w-2 h-2 bg-current rounded-full animate-bounce"
        style={{ animationDelay: '150ms' }}
      />
      <div
        className="w-2 h-2 bg-current rounded-full animate-bounce"
        style={{ animationDelay: '300ms' }}
      />
    </div>
  );
}

/**
 * Format typing users text
 */
function formatTypingText(names: string[], totalCount: number, maxNames: number): string {
  if (totalCount === 0) return '';

  const displayNames = names.slice(0, maxNames);
  const remaining = totalCount - displayNames.length;

  if (displayNames.length === 0) {
    return `${totalCount} ${totalCount === 1 ? 'person is' : 'people are'} typing`;
  }

  let text = '';

  if (displayNames.length === 1) {
    text = displayNames[0];
  } else if (displayNames.length === 2) {
    text = `${displayNames[0]} and ${displayNames[1]}`;
  } else {
    const lastIndex = displayNames.length - 1;
    text = `${displayNames.slice(0, lastIndex).join(', ')}, and ${displayNames[lastIndex]}`;
  }

  if (remaining > 0) {
    text += ` and ${remaining} ${remaining === 1 ? 'other' : 'others'}`;
  }

  text += ` ${displayNames.length === 1 && remaining === 0 ? 'is' : 'are'} typing`;

  return text;
}

/**
 * TypingIndicator Component
 *
 * Displays who is currently typing with an animated indicator.
 */
export function TypingIndicator({
  typingUsers,
  maxNamesToShow = 3,
  variant = 'default',
  className = '',
}: TypingIndicatorProps) {
  if (typingUsers.length === 0) {
    return null;
  }

  const names = typingUsers.map((user) => user.name || user.userId.slice(0, 8));

  // Dots only variant
  if (variant === 'dots-only') {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <AnimatedDots className="text-gray-500" />
      </div>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-2 text-sm text-gray-600 ${className}`}>
        <AnimatedDots className="text-gray-400" />
        <span>{typingUsers.length}</span>
      </div>
    );
  }

  // Default variant with full text
  const typingText = formatTypingText(names, typingUsers.length, maxNamesToShow);

  return (
    <div className={`flex items-center gap-2 text-sm text-gray-600 ${className}`}>
      <AnimatedDots className="text-gray-400" />
      <span className="animate-pulse">{typingText}</span>
    </div>
  );
}

/**
 * TypingBubble Component
 *
 * Chat-style typing indicator bubble (like iMessage).
 */
export function TypingBubble({
  userName,
  className = '',
}: {
  userName?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-2 ${className}`}>
      {userName && (
        <div className="text-xs text-gray-500 mt-2">{userName}</div>
      )}

      <div className="bg-gray-200 rounded-2xl px-4 py-3">
        <div className="flex space-x-1">
          <div
            className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
            style={{ animationDelay: '0ms', animationDuration: '1.4s' }}
          />
          <div
            className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
            style={{ animationDelay: '200ms', animationDuration: '1.4s' }}
          />
          <div
            className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
            style={{ animationDelay: '400ms', animationDuration: '1.4s' }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * TypingBadge Component
 *
 * Small badge showing typing count.
 */
export function TypingBadge({
  count,
  className = '',
}: {
  count: number;
  className?: string;
}) {
  if (count === 0) return null;

  return (
    <div
      className={`
        inline-flex items-center justify-center
        min-w-[20px] h-5 px-1.5
        bg-blue-500 text-white text-xs font-medium
        rounded-full
        ${className}
      `}
    >
      {count}
    </div>
  );
}

/**
 * TypingPulse Component
 *
 * Minimalist pulsing dot indicator.
 */
export function TypingPulse({
  isTyping,
  className = '',
}: {
  isTyping: boolean;
  className?: string;
}) {
  if (!isTyping) return null;

  return (
    <div
      className={`
        w-2 h-2 bg-blue-500 rounded-full
        animate-pulse
        ${className}
      `}
      aria-label="Typing"
    />
  );
}

/**
 * InlineTypingIndicator Component
 *
 * Inline text-based typing indicator for use in headers or lists.
 */
export function InlineTypingIndicator({
  typingUsers,
  className = '',
}: {
  typingUsers: TypingUser[];
  className?: string;
}) {
  if (typingUsers.length === 0) return null;

  const names = typingUsers.map((user) => user.name || user.userId.slice(0, 8));
  const text = formatTypingText(names, typingUsers.length, 2);

  return (
    <span className={`text-xs text-gray-500 italic ${className}`}>
      {text}...
    </span>
  );
}

/**
 * Hook for managing typing state
 */
export function useTypingState(
  onStartTyping: () => void,
  onStopTyping: () => void,
  timeout: number = 3000
) {
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = React.useRef(false);

  const startTyping = React.useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onStartTyping();
    }

    // Reset timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        onStopTyping();
      }
    }, timeout);
  }, [onStartTyping, onStopTyping, timeout]);

  const stopTyping = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (isTypingRef.current) {
      isTypingRef.current = false;
      onStopTyping();
    }
  }, [onStopTyping]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { startTyping, stopTyping };
}

export default TypingIndicator;
