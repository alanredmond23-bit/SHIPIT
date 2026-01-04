'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

export interface MobileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  showHandle?: boolean;
  snapPoints?: number[]; // Percentages of viewport height
  defaultSnapPoint?: number; // Index of snapPoints
  className?: string;
}

export function MobileSheet({
  isOpen,
  onClose,
  children,
  title,
  description,
  showHandle = true,
  snapPoints = [90, 50],
  defaultSnapPoint = 1,
  className = '',
}: MobileSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [snapPoint, setSnapPoint] = useState(defaultSnapPoint);
  const dragStartRef = useRef(0);

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Set initial snap point
      setSnapPoint(defaultSnapPoint);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, defaultSnapPoint]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleDragStart = (clientY: number) => {
    setIsDragging(true);
    setStartY(clientY);
    setCurrentY(clientY);
    dragStartRef.current = clientY;
  };

  const handleDragMove = (clientY: number) => {
    if (!isDragging) return;
    const deltaY = clientY - dragStartRef.current;
    // Only allow dragging down
    if (deltaY > 0) {
      setCurrentY(clientY);
    }
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const deltaY = currentY - startY;
    const threshold = window.innerHeight * 0.15; // 15% of viewport

    if (deltaY > threshold) {
      // Dragged down significantly - close or snap to next point
      if (snapPoint === snapPoints.length - 1) {
        onClose();
      } else {
        setSnapPoint(snapPoint + 1);
      }
    } else if (deltaY < -threshold) {
      // Dragged up significantly - snap to previous point
      if (snapPoint > 0) {
        setSnapPoint(snapPoint - 1);
      }
    }

    setStartY(0);
    setCurrentY(0);
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    handleDragStart(e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientY);
  };

  const handleMouseUp = () => {
    handleDragEnd();
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  if (!isOpen) return null;

  const currentSnapHeight = snapPoints[snapPoint];
  const dragOffset = isDragging ? Math.max(0, currentY - startY) : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="bottom-sheet-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={clsx(
          'bottom-sheet safe-bottom',
          isDragging && 'transition-none',
          !isDragging && 'transition-transform duration-300 ease-out',
          className
        )}
        style={{
          height: `${currentSnapHeight}vh`,
          transform: `translateY(${dragOffset}px)`,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'sheet-title' : undefined}
        aria-describedby={description ? 'sheet-description' : undefined}
      >
        {/* Drag Handle */}
        {showHandle && (
          <div
            className="flex justify-center py-3 cursor-grab active:cursor-grabbing touch-manipulation"
            onMouseDown={handleMouseDown}
            onMouseMove={isDragging ? handleMouseMove : undefined}
            onMouseUp={handleMouseUp}
            onMouseLeave={isDragging ? handleMouseUp : undefined}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="w-12 h-1.5 bg-stone-200 rounded-full" />
          </div>
        )}

        {/* Header */}
        {(title || description) && (
          <div className="px-6 pb-4 border-b border-stone-200">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {title && (
                  <h2
                    id="sheet-title"
                    className="text-lg sm:text-xl font-bold text-stone-900 mb-1"
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p
                    id="sheet-description"
                    className="text-sm text-stone-500"
                  >
                    {description}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="flex-shrink-0 p-2 hover:bg-stone-100 active:bg-stone-200 rounded-lg transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4">
          {children}
        </div>

        {/* Snap point indicators */}
        {snapPoints.length > 1 && (
          <div className="absolute top-3 right-6 flex gap-1">
            {snapPoints.map((_, index) => (
              <button
                key={index}
                onClick={() => setSnapPoint(index)}
                className={clsx(
                  'w-1.5 h-1.5 rounded-full transition-all touch-manipulation',
                  index === snapPoint ? 'bg-indigo-500 w-4' : 'bg-stone-200'
                )}
                aria-label={`Snap to ${snapPoints[index]}%`}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default MobileSheet;
