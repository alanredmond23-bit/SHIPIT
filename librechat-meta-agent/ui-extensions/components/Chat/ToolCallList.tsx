'use client';

import { useMemo } from 'react';
import {
  Wrench,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';
import { ToolCall, ToolCallData, ToolStatus } from './ToolCall';

// ============================================================================
// Types
// ============================================================================

interface ToolCallListProps {
  tools: ToolCallData[];
  showTimeline?: boolean;
  expandFirst?: boolean;
  className?: string;
}

// ============================================================================
// Summary Stats Component
// ============================================================================

function ToolCallSummary({ tools }: { tools: ToolCallData[] }) {
  const stats = useMemo(() => {
    const counts: Record<ToolStatus, number> = {
      pending: 0,
      running: 0,
      success: 0,
      error: 0,
    };

    let totalDuration = 0;

    tools.forEach((tool) => {
      counts[tool.status]++;
      if (tool.duration) {
        totalDuration += tool.duration;
      }
    });

    return { counts, totalDuration };
  }, [tools]);

  if (tools.length === 0) return null;

  return (
    <div className="flex items-center gap-4 px-4 py-2.5 bg-stone-50 dark:bg-stone-800/50 rounded-lg mb-3">
      <div className="flex items-center gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-300">
        <Wrench className="w-4 h-4 text-stone-400" />
        <span>{tools.length} tool{tools.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="flex-1" />

      {/* Status counts */}
      {stats.counts.success > 0 && (
        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>{stats.counts.success}</span>
        </div>
      )}
      {stats.counts.error > 0 && (
        <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
          <XCircle className="w-3.5 h-3.5" />
          <span>{stats.counts.error}</span>
        </div>
      )}
      {stats.counts.running > 0 && (
        <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>{stats.counts.running}</span>
        </div>
      )}

      {/* Total duration */}
      {stats.totalDuration > 0 && (
        <div className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
          <Clock className="w-3.5 h-3.5" />
          <span>
            {stats.totalDuration < 1000
              ? `${stats.totalDuration}ms`
              : `${(stats.totalDuration / 1000).toFixed(1)}s`}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Timeline Connector Component
// ============================================================================

function TimelineConnector({
  status,
  isLast,
}: {
  status: ToolStatus;
  isLast: boolean;
}) {
  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'running':
        return 'bg-blue-500';
      default:
        return 'bg-stone-400';
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Dot */}
      <div
        className={clsx(
          'w-3 h-3 rounded-full border-2 border-white dark:border-stone-900 shadow-sm z-10',
          getStatusColor()
        )}
      />
      {/* Line */}
      {!isLast && (
        <div className="w-0.5 flex-1 min-h-[24px] bg-stone-200 dark:bg-stone-700 -mt-1" />
      )}
    </div>
  );
}

// ============================================================================
// Main ToolCallList Component
// ============================================================================

export function ToolCallList({
  tools,
  showTimeline = true,
  expandFirst = true,
  className,
}: ToolCallListProps) {
  // Sort tools by start time if available, otherwise by order
  const sortedTools = useMemo(() => {
    return [...tools].sort((a, b) => {
      if (a.startTime && b.startTime) {
        return a.startTime - b.startTime;
      }
      return 0;
    });
  }, [tools]);

  if (tools.length === 0) {
    return null;
  }

  return (
    <div className={clsx('space-y-3', className)}>
      {/* Summary */}
      <ToolCallSummary tools={tools} />

      {/* Tool List */}
      <div className={clsx(showTimeline && 'relative')}>
        {sortedTools.map((tool, index) => (
          <div
            key={tool.id}
            className={clsx('relative flex gap-3', index < sortedTools.length - 1 && 'mb-3')}
          >
            {/* Timeline */}
            {showTimeline && (
              <TimelineConnector
                status={tool.status}
                isLast={index === sortedTools.length - 1}
              />
            )}

            {/* Tool Card */}
            <div className="flex-1">
              <ToolCall
                tool={tool}
                defaultExpanded={expandFirst && index === 0}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ToolCallList;
