'use client';

import React, { useState, useRef, useCallback } from 'react';
import clsx from 'clsx';

export interface SwipeAction {
  label: string;
  icon?: React.ReactNode;
  color: 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'gray';
  onAction: () => void;
}

export interface SwipeableCardProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number; // Percentage of card width to trigger action
  className?: string;
  disabled?: boolean;
}

const colorClasses: Record<SwipeAction['color'], string> = {
  red: 'bg-red-600 text-white',
  blue: 'bg-blue-600 text-white',
  green: 'bg-green-600 text-white',
  yellow: 'bg-yellow-600 text-white',
  purple: 'bg-purple-600 text-white',
  gray: 'bg-slate-600 text-white',
};

export function SwipeableCard({
  children,
  leftActions = [],
  rightActions = [],
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  className = '',
  disabled = false,
}: SwipeableCardProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const startXRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const [actionTriggered, setActionTriggered] = useState(false);

  const maxSwipeDistance = 200; // Maximum pixels to swipe

  const reset = useCallback(() => {
    setOffsetX(0);
    setIsSwiping(false);
    setSwipeDirection(null);
    setActionTriggered(false);
  }, []);

  const handleSwipeStart = (clientX: number) => {
    if (disabled || actionTriggered) return;
    setIsSwiping(true);
    startXRef.current = clientX;
  };

  const handleSwipeMove = (clientX: number) => {
    if (!isSwiping || disabled || actionTriggered) return;

    const deltaX = clientX - startXRef.current;
    const direction = deltaX > 0 ? 'right' : 'left';

    // Only allow swipe if there are actions in that direction
    if ((direction === 'left' && rightActions.length === 0) ||
        (direction === 'right' && leftActions.length === 0)) {
      return;
    }

    setSwipeDirection(direction);

    // Limit swipe distance
    const limitedDelta = Math.max(-maxSwipeDistance, Math.min(maxSwipeDistance, deltaX));
    setOffsetX(limitedDelta);
  };

  const handleSwipeEnd = () => {
    if (!isSwiping || disabled || actionTriggered) return;
    setIsSwiping(false);

    const cardWidth = cardRef.current?.offsetWidth || 0;
    const swipeThreshold = (cardWidth * threshold) / 100;
    const absOffset = Math.abs(offsetX);

    // Check if threshold is met
    if (absOffset >= swipeThreshold) {
      setActionTriggered(true);

      if (swipeDirection === 'left' && rightActions.length > 0) {
        // Trigger first right action
        rightActions[0].onAction();
        if (onSwipeLeft) onSwipeLeft();
      } else if (swipeDirection === 'right' && leftActions.length > 0) {
        // Trigger first left action
        leftActions[0].onAction();
        if (onSwipeRight) onSwipeRight();
      }

      // Animate card off screen
      const direction = swipeDirection === 'left' ? -1 : 1;
      setOffsetX(direction * (cardWidth + 100));

      // Reset after animation
      setTimeout(reset, 300);
    } else {
      // Reset to original position
      reset();
    }
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    handleSwipeStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleSwipeMove(e.clientX);
  };

  const handleMouseUp = () => {
    handleSwipeEnd();
  };

  const handleMouseLeave = () => {
    if (isSwiping) {
      handleSwipeEnd();
    }
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleSwipeStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleSwipeMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleSwipeEnd();
  };

  // Render actions
  const renderActions = (actions: SwipeAction[], side: 'left' | 'right') => {
    if (actions.length === 0) return null;

    return (
      <div
        className={clsx(
          'absolute top-0 bottom-0 flex items-stretch',
          side === 'left' ? 'left-0' : 'right-0'
        )}
      >
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              action.onAction();
              reset();
            }}
            className={clsx(
              'flex flex-col items-center justify-center gap-1 px-6 font-medium transition-opacity touch-manipulation min-w-[80px]',
              colorClasses[action.color],
              isSwiping ? 'opacity-100' : 'opacity-0'
            )}
            style={{
              transition: 'opacity 0.2s',
            }}
          >
            {action.icon && <span className="text-xl">{action.icon}</span>}
            <span className="text-xs">{action.label}</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className={clsx('relative overflow-hidden', className)}>
      {/* Left Actions */}
      {renderActions(leftActions, 'left')}

      {/* Right Actions */}
      {renderActions(rightActions, 'right')}

      {/* Card */}
      <div
        ref={cardRef}
        className={clsx(
          'swipeable-card relative bg-slate-900',
          isSwiping && 'swiping',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={isSwiping ? handleMouseMove : undefined}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>

      {/* Swipe Hint */}
      {!isSwiping && !actionTriggered && (leftActions.length > 0 || rightActions.length > 0) && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="flex items-center gap-2 px-2 py-1 bg-slate-800/80 backdrop-blur-sm rounded-full text-[10px] text-slate-400">
            {leftActions.length > 0 && <span>← Swipe</span>}
            {leftActions.length > 0 && rightActions.length > 0 && <span>•</span>}
            {rightActions.length > 0 && <span>Swipe →</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export default SwipeableCard;
