'use client';

/**
 * BranchNavigator Component
 * Displays branch navigation UI with indicators, arrows, and tree preview
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  GitBranch,
  GitFork,
  GitMerge,
  ChevronDown,
  Check,
  Clock,
  MessageSquare,
} from 'lucide-react';
import clsx from 'clsx';
import type {
  ConversationBranch,
  BranchPoint,
  BranchNavigationState,
  BranchNodeVisual,
  BranchConnection,
} from '@/types/branching';

// ============================================================================
// Types
// ============================================================================

interface BranchNavigatorProps {
  /** Current navigation state */
  navigationState: BranchNavigationState;
  /** Handler for switching branches */
  onBranchSwitch: (branchId: string) => void;
  /** Handler for navigating to next branch at a point */
  onNextBranch?: (messageId: string) => void;
  /** Handler for navigating to previous branch at a point */
  onPreviousBranch?: (messageId: string) => void;
  /** Whether the navigator is in compact mode */
  compact?: boolean;
  /** Additional class names */
  className?: string;
}

interface BranchIndicatorProps {
  /** Branch point information */
  branchPoint: BranchPoint;
  /** Handler for next branch */
  onNext: () => void;
  /** Handler for previous branch */
  onPrevious: () => void;
  /** Whether this is the active branch point */
  isActive?: boolean;
  /** Compact mode */
  compact?: boolean;
}

interface BranchTreePreviewProps {
  /** All branches */
  branches: ConversationBranch[];
  /** Currently active branch ID */
  activeBranchId: string | null;
  /** Handler for selecting a branch */
  onSelect: (branchId: string) => void;
  /** Whether the preview is open */
  isOpen: boolean;
  /** Handler to close the preview */
  onClose: () => void;
}

// ============================================================================
// BranchIndicator Component
// ============================================================================

function BranchIndicator({
  branchPoint,
  onNext,
  onPrevious,
  isActive = false,
  compact = false,
}: BranchIndicatorProps) {
  const currentIndex = branchPoint.selectedIndex + 1;
  const total = branchPoint.totalBranches;

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-1 rounded-lg border transition-all duration-200',
        isActive
          ? 'bg-teal-50 dark:bg-teal-900/30 border-teal-200 dark:border-teal-800'
          : 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700',
        compact ? 'px-1.5 py-0.5' : 'px-2 py-1'
      )}
    >
      {/* Previous button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPrevious();
        }}
        disabled={total <= 1}
        className={clsx(
          'p-0.5 rounded transition-colors',
          total > 1
            ? 'hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-400'
            : 'text-stone-300 dark:text-stone-600 cursor-not-allowed'
        )}
        aria-label="Previous branch"
      >
        <ChevronLeft className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
      </button>

      {/* Branch count indicator */}
      <div className="flex items-center gap-1">
        <GitFork
          className={clsx(
            isActive ? 'text-teal-500' : 'text-stone-400 dark:text-stone-500',
            compact ? 'w-3 h-3' : 'w-4 h-4'
          )}
        />
        <span
          className={clsx(
            'font-medium tabular-nums',
            isActive
              ? 'text-teal-700 dark:text-teal-300'
              : 'text-stone-600 dark:text-stone-400',
            compact ? 'text-xs' : 'text-sm'
          )}
        >
          {currentIndex}/{total}
        </span>
      </div>

      {/* Next button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
        disabled={total <= 1}
        className={clsx(
          'p-0.5 rounded transition-colors',
          total > 1
            ? 'hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-400'
            : 'text-stone-300 dark:text-stone-600 cursor-not-allowed'
        )}
        aria-label="Next branch"
      >
        <ChevronRight className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
      </button>
    </div>
  );
}

// ============================================================================
// BranchTreePreview Component
// ============================================================================

function BranchTreePreview({
  branches,
  activeBranchId,
  onSelect,
  isOpen,
  onClose,
}: BranchTreePreviewProps) {
  if (!isOpen) return null;

  // Sort branches by creation time
  const sortedBranches = useMemo(() => {
    return [...branches].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
  }, [branches]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Preview panel */}
      <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-stone-900 rounded-xl shadow-2xl border border-stone-200 dark:border-stone-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
        {/* Header */}
        <div className="px-4 py-3 border-b border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-teal-500" />
            <h3 className="font-semibold text-stone-900 dark:text-white text-sm">
              Conversation Branches
            </h3>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            {branches.length} branch{branches.length !== 1 ? 'es' : ''} in this conversation
          </p>
        </div>

        {/* Branch list */}
        <div className="max-h-64 overflow-y-auto py-2">
          {sortedBranches.map((branch, index) => {
            const isActive = branch.id === activeBranchId;
            const isMain = branch.name === 'Main' || branch.id === 'main';

            return (
              <button
                key={branch.id}
                onClick={() => {
                  onSelect(branch.id);
                  onClose();
                }}
                className={clsx(
                  'w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors',
                  isActive
                    ? 'bg-teal-50 dark:bg-teal-900/30'
                    : 'hover:bg-stone-50 dark:hover:bg-stone-800'
                )}
              >
                {/* Branch indicator line */}
                <div className="flex flex-col items-center pt-1">
                  <div
                    className={clsx(
                      'w-2.5 h-2.5 rounded-full border-2',
                      isActive
                        ? 'bg-teal-500 border-teal-500'
                        : isMain
                        ? 'bg-stone-400 border-stone-400'
                        : 'bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-600'
                    )}
                  />
                  {index < sortedBranches.length - 1 && (
                    <div className="w-0.5 h-8 bg-stone-200 dark:bg-stone-700 mt-1" />
                  )}
                </div>

                {/* Branch info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={clsx(
                        'font-medium text-sm truncate',
                        isActive
                          ? 'text-teal-700 dark:text-teal-300'
                          : 'text-stone-700 dark:text-stone-300'
                      )}
                    >
                      {branch.name}
                    </span>
                    {isActive && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 rounded">
                        Active
                      </span>
                    )}
                    {isMain && !isActive && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded">
                        Main
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-xs text-stone-500 dark:text-stone-400">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {branch.messageIds.length} messages
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(branch.createdAt)}
                    </span>
                  </div>

                  {branch.description && (
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-1 truncate">
                      {branch.description}
                    </p>
                  )}
                </div>

                {/* Active indicator */}
                {isActive && (
                  <Check className="w-4 h-4 text-teal-500 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ============================================================================
// Main Component
// ============================================================================

export function BranchNavigator({
  navigationState,
  onBranchSwitch,
  onNextBranch,
  onPreviousBranch,
  compact = false,
  className,
}: BranchNavigatorProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const { branches, activeBranchId, branchPoints } = navigationState;

  // Find the active branch info
  const activeBranch = useMemo(() => {
    return branches.find((b) => b.id === activeBranchId);
  }, [branches, activeBranchId]);

  // Calculate total branch count
  const totalBranches = branches.length;

  // If there are no branches or only main, don't show navigator
  if (totalBranches <= 1 && branchPoints.length === 0) {
    return null;
  }

  return (
    <div className={clsx('relative', className)}>
      {/* Main navigator button */}
      <button
        onClick={() => setIsPreviewOpen(!isPreviewOpen)}
        className={clsx(
          'flex items-center gap-2 rounded-lg border transition-all duration-200',
          isPreviewOpen
            ? 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-600'
            : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 hover:border-teal-500',
          compact ? 'px-2 py-1' : 'px-3 py-1.5'
        )}
      >
        <GitBranch
          className={clsx(
            'text-teal-500',
            compact ? 'w-3.5 h-3.5' : 'w-4 h-4'
          )}
        />

        <span
          className={clsx(
            'font-medium text-stone-700 dark:text-stone-300',
            compact ? 'text-xs' : 'text-sm'
          )}
        >
          {activeBranch?.name || 'Main'}
        </span>

        {totalBranches > 1 && (
          <span
            className={clsx(
              'px-1.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 font-medium',
              compact ? 'text-[10px]' : 'text-xs'
            )}
          >
            {totalBranches}
          </span>
        )}

        <ChevronDown
          className={clsx(
            'text-stone-400 transition-transform',
            isPreviewOpen && 'rotate-180',
            compact ? 'w-3 h-3' : 'w-4 h-4'
          )}
        />
      </button>

      {/* Tree preview dropdown */}
      <BranchTreePreview
        branches={branches}
        activeBranchId={activeBranchId}
        onSelect={onBranchSwitch}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
}

// ============================================================================
// Inline Branch Indicator (for messages)
// ============================================================================

interface InlineBranchIndicatorProps {
  /** Branch point for this message */
  branchPoint: BranchPoint | null;
  /** Handler for next branch */
  onNext?: () => void;
  /** Handler for previous branch */
  onPrevious?: () => void;
  /** Compact mode */
  compact?: boolean;
}

export function InlineBranchIndicator({
  branchPoint,
  onNext,
  onPrevious,
  compact = false,
}: InlineBranchIndicatorProps) {
  if (!branchPoint || branchPoint.totalBranches <= 1) {
    return null;
  }

  return (
    <BranchIndicator
      branchPoint={branchPoint}
      onNext={onNext || (() => {})}
      onPrevious={onPrevious || (() => {})}
      compact={compact}
    />
  );
}

export default BranchNavigator;
