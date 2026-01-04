'use client';

import React, { useRef, useEffect, useState } from 'react';
import { CursorPosition } from '../../lib/realtime/use-realtime';

/**
 * Props for CursorOverlay component
 */
export interface CursorOverlayProps {
  cursors: CursorPosition[];
  containerRef?: React.RefObject<HTMLElement>;
  showLabels?: boolean;
  className?: string;
}

/**
 * Get color for cursor based on userId
 */
function getCursorColor(userId: string): string {
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#6366f1', // indigo
    '#f59e0b', // orange
    '#14b8a6', // teal
    '#06b6d4', // cyan
    '#f43f5e', // rose
    '#7c3aed', // violet
  ];

  // Generate consistent color index from userId
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

/**
 * Single cursor component
 */
function Cursor({
  cursor,
  showLabel,
}: {
  cursor: CursorPosition & { name?: string };
  showLabel: boolean;
}) {
  const color = cursor.color || getCursorColor(cursor.userId);
  const name = cursor.name || cursor.userId.slice(0, 8);

  return (
    <div
      className="absolute pointer-events-none transition-all duration-75 ease-out z-50"
      style={{
        left: `${cursor.x}px`,
        top: `${cursor.y}px`,
        transform: 'translate(-2px, -2px)',
      }}
    >
      {/* Cursor SVG */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-lg"
      >
        <path
          d="M5.65376 12.3673L5 5L12.3673 5.65376C12.7239 5.68938 13.0609 5.83111 13.3366 6.06073L19.6528 11.6477C20.2177 12.1511 20.2177 13.0163 19.6528 13.5196L14.5196 18.6528C14.0163 19.2177 13.1511 19.2177 12.6477 18.6528L7.06073 12.3366C6.83111 12.0609 6.68938 11.7239 6.65376 11.3673L5.65376 12.3673Z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Label */}
      {showLabel && (
        <div
          className="absolute left-6 top-0 px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap shadow-lg"
          style={{ backgroundColor: color }}
        >
          {name}
        </div>
      )}
    </div>
  );
}

/**
 * CursorOverlay Component
 *
 * Displays collaborative cursors from other users.
 * Cursors are positioned absolutely within the container.
 */
export function CursorOverlay({
  cursors,
  containerRef,
  showLabels = true,
  className = '',
}: CursorOverlayProps) {
  const [containerBounds, setContainerBounds] = useState<DOMRect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Update container bounds on mount and resize
  useEffect(() => {
    const updateBounds = () => {
      if (containerRef?.current) {
        setContainerBounds(containerRef.current.getBoundingClientRect());
      } else if (overlayRef.current?.parentElement) {
        setContainerBounds(overlayRef.current.parentElement.getBoundingClientRect());
      }
    };

    updateBounds();

    window.addEventListener('resize', updateBounds);
    window.addEventListener('scroll', updateBounds, true);

    return () => {
      window.removeEventListener('resize', updateBounds);
      window.removeEventListener('scroll', updateBounds, true);
    };
  }, [containerRef]);

  if (cursors.length === 0) {
    return null;
  }

  return (
    <div
      ref={overlayRef}
      className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}
      style={{ zIndex: 9999 }}
    >
      {cursors.map((cursor) => (
        <Cursor
          key={cursor.clientId}
          cursor={cursor}
          showLabel={showLabels}
        />
      ))}
    </div>
  );
}

/**
 * Hook for tracking mouse position and sending cursor updates
 */
export function useCursorTracking(
  containerRef: React.RefObject<HTMLElement>,
  onCursorMove: (x: number, y: number) => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    let rafId: number | null = null;
    let lastX = 0;
    let lastY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        const bounds = container.getBoundingClientRect();
        const x = e.clientX - bounds.left;
        const y = e.clientY - bounds.top;

        // Only send if cursor is within container
        if (x >= 0 && x <= bounds.width && y >= 0 && y <= bounds.height) {
          // Only update if position changed significantly (debounce small movements)
          if (Math.abs(x - lastX) > 2 || Math.abs(y - lastY) > 2) {
            lastX = x;
            lastY = y;
            onCursorMove(x, y);
          }
        }
      });
    };

    container.addEventListener('mousemove', handleMouseMove);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [containerRef, onCursorMove, enabled]);
}

/**
 * CursorCollaboration Component
 *
 * Complete cursor collaboration component with tracking and overlay.
 * Use this for an all-in-one solution.
 */
export function CursorCollaboration({
  cursors,
  onCursorMove,
  showLabels = true,
  trackCursor = true,
  className = '',
  children,
}: {
  cursors: CursorPosition[];
  onCursorMove: (x: number, y: number) => void;
  showLabels?: boolean;
  trackCursor?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Track cursor movements
  useCursorTracking(containerRef, onCursorMove, trackCursor);

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
    >
      {children}

      <CursorOverlay
        cursors={cursors}
        containerRef={containerRef}
        showLabels={showLabels}
      />
    </div>
  );
}

export default CursorOverlay;
