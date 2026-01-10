'use client';

import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreHorizontal,
  Edit2,
  Copy,
  ExternalLink,
  Activity,
  Zap,
} from 'lucide-react';
import type { Task, TaskExecution, TaskStatus, TaskStatusColors as StatusColors } from '@/types/tasks';
import { formatRelativeTime, formatDuration, parseCronExpression } from '@/hooks/useTasks';

// ============================================================================
// Status Badge Component
// ============================================================================

interface StatusBadgeProps {
  status: TaskStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<TaskStatus, { bg: string; text: string; icon: React.ReactNode }> = {
  pending: { bg: 'bg-stone-100', text: 'text-stone-700', icon: <Clock className="w-3 h-3" /> },
  active: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <Activity className="w-3 h-3" /> },
  paused: { bg: 'bg-amber-100', text: 'text-amber-700', icon: <Pause className="w-3 h-3" /> },
  running: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Zap className="w-3 h-3 animate-pulse" /> },
  completed: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
  failed: { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle className="w-3 h-3" /> },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-700', icon: <AlertCircle className="w-3 h-3" /> },
};

function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = statusConfig[status];
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${config.bg} ${config.text} ${sizeClasses}`}>
      {config.icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ============================================================================
// Progress Bar Component
// ============================================================================

interface ProgressBarProps {
  progress: number; // 0-100
  status: 'running' | 'completed' | 'failed';
}

function ProgressBar({ progress, status }: ProgressBarProps) {
  const colorClasses = {
    running: 'bg-blue-500',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
  };

  return (
    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
      <div
        className={`h-full transition-all duration-300 ${colorClasses[status]} ${status === 'running' ? 'animate-pulse' : ''}`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// ============================================================================
// Task Card Component
// ============================================================================

interface TaskCardProps {
  task: Task;
  selected?: boolean;
  onSelect?: () => void;
  onRun?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onViewHistory?: () => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
  recentExecutions?: TaskExecution[];
}

export function TaskCard({
  task,
  selected = false,
  onSelect,
  onRun,
  onPause,
  onResume,
  onEdit,
  onDelete,
  onDuplicate,
  onViewHistory,
  expanded = false,
  onToggleExpand,
  recentExecutions = [],
}: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const borderColorClass = {
    pending: 'border-l-stone-400',
    active: 'border-l-emerald-500',
    paused: 'border-l-amber-500',
    running: 'border-l-blue-500',
    completed: 'border-l-green-500',
    failed: 'border-l-red-500',
    cancelled: 'border-l-gray-400',
  }[task.status];

  const getScheduleDisplay = () => {
    if (task.type === 'one-time' && task.schedule?.type === 'one-time') {
      return `Scheduled for ${new Date(task.schedule.runAt).toLocaleString()}`;
    }
    if (task.type === 'recurring' && task.schedule?.type === 'cron') {
      return parseCronExpression(task.schedule.expression);
    }
    if (task.type === 'trigger') {
      return `Triggered by ${task.trigger?.type || 'event'}`;
    }
    return 'No schedule';
  };

  const getActionIcon = () => {
    const iconMap: Record<string, string> = {
      'ai-prompt': '&#129302;', // Robot emoji as fallback
      'send-email': '&#128231;',
      'webhook': '&#128279;',
      'run-code': '&#128187;',
      'generate-report': '&#128200;',
      'web-scrape': '&#127760;',
      'file-operation': '&#128193;',
      'google-workspace': '&#128187;',
      'chain': '&#9875;',
    };
    return iconMap[task.action.type] || '&#9881;';
  };

  return (
    <div
      className={`
        bg-white rounded-lg border border-l-4 ${borderColorClass}
        transition-all duration-200 hover:shadow-md
        ${selected ? 'ring-2 ring-teal-500 ring-offset-2' : ''}
      `}
    >
      {/* Main content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Checkbox + Info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {onSelect && (
              <input
                type="checkbox"
                checked={selected}
                onChange={onSelect}
                className="mt-1 w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
              />
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 truncate">{task.name}</h3>
                <StatusBadge status={task.status} />
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {task.type}
                </span>
              </div>

              {task.description && (
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{task.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {getScheduleDisplay()}
                </span>

                {task.nextRun && task.status === 'active' && (
                  <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                    <Clock className="w-3 h-3" />
                    Next: {formatRelativeTime(new Date(task.nextRun))}
                  </span>
                )}

                {task.lastRun && (
                  <span className="inline-flex items-center gap-1">
                    Last run: {formatRelativeTime(new Date(task.lastRun))}
                  </span>
                )}

                <span>
                  Runs: {task.runCount} ({task.successCount} success, {task.failureCount} failed)
                </span>

                {task.totalCost && task.totalCost > 0 && (
                  <span className="text-amber-600">
                    Cost: ${task.totalCost.toFixed(4)}
                  </span>
                )}
              </div>

              {/* Tags */}
              {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {task.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
            {/* Quick actions */}
            {task.status === 'active' && onPause && (
              <button
                onClick={onPause}
                className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                title="Pause task"
              >
                <Pause className="w-4 h-4" />
              </button>
            )}

            {task.status === 'paused' && onResume && (
              <button
                onClick={onResume}
                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                title="Resume task"
              >
                <Play className="w-4 h-4" />
              </button>
            )}

            {onRun && (task.status === 'active' || task.status === 'paused') && (
              <button
                onClick={onRun}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                title="Run now"
              >
                <Zap className="w-4 h-4" />
              </button>
            )}

            {onViewHistory && (
              <button
                onClick={onViewHistory}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                title="View history"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            {/* More menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    {onEdit && (
                      <button
                        onClick={() => { onEdit(); setShowMenu(false); }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit task
                      </button>
                    )}
                    {onDuplicate && (
                      <button
                        onClick={() => { onDuplicate(); setShowMenu(false); }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Duplicate
                      </button>
                    )}
                    {onViewHistory && (
                      <button
                        onClick={() => { onViewHistory(); setShowMenu(false); }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View history
                      </button>
                    )}
                    <hr className="my-1" />
                    {onDelete && (
                      <button
                        onClick={() => { onDelete(); setShowMenu(false); }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Expand toggle */}
            {onToggleExpand && (
              <button
                onClick={onToggleExpand}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Running progress bar */}
        {task.status === 'running' && (
          <div className="mt-3">
            <ProgressBar progress={50} status="running" />
            <p className="text-xs text-blue-600 mt-1 animate-pulse">Running...</p>
          </div>
        )}
      </div>

      {/* Expanded execution history */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Executions</h4>
          
          {recentExecutions.length === 0 ? (
            <p className="text-sm text-gray-500">No executions yet</p>
          ) : (
            <div className="space-y-2">
              {recentExecutions.slice(0, 5).map(execution => (
                <ExecutionRow key={execution.id} execution={execution} />
              ))}

              {recentExecutions.length > 5 && (
                <button
                  onClick={onViewHistory}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                >
                  View all {recentExecutions.length} executions
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Execution Row Component
// ============================================================================

interface ExecutionRowProps {
  execution: TaskExecution;
  onClick?: () => void;
}

function ExecutionRow({ execution, onClick }: ExecutionRowProps) {
  const statusConfig = {
    queued: { bg: 'bg-stone-100', text: 'text-stone-700', icon: <Clock className="w-3 h-3" /> },
    running: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Zap className="w-3 h-3 animate-pulse" /> },
    completed: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
    failed: { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle className="w-3 h-3" /> },
    cancelled: { bg: 'bg-gray-100', text: 'text-gray-700', icon: <AlertCircle className="w-3 h-3" /> },
    timeout: { bg: 'bg-orange-100', text: 'text-orange-700', icon: <Clock className="w-3 h-3" /> },
  };

  const config = statusConfig[execution.status];

  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between p-2 rounded-lg bg-white border border-gray-200 ${onClick ? 'cursor-pointer hover:border-gray-300' : ''}`}
    >
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
          {config.icon}
          {execution.status}
        </span>
        <span className="text-sm text-gray-600">
          {execution.startedAt ? new Date(execution.startedAt).toLocaleString() : 'Queued'}
        </span>
        <span className="text-xs text-gray-500">
          via {execution.triggeredBy}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500">
        {execution.durationMs && (
          <span>{formatDuration(execution.durationMs)}</span>
        )}
        {execution.cost && execution.cost > 0 && (
          <span className="text-amber-600">${execution.cost.toFixed(4)}</span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Task List Component
// ============================================================================

interface TaskListProps {
  tasks: Task[];
  loading?: boolean;
  selectedTasks?: Set<string>;
  onToggleSelect?: (taskId: string) => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  onRun?: (taskId: string) => void;
  onPause?: (taskId: string) => void;
  onResume?: (taskId: string) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onDuplicate?: (task: Task) => void;
  onViewHistory?: (task: Task) => void;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
}

export function TaskList({
  tasks,
  loading = false,
  selectedTasks = new Set(),
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onRun,
  onPause,
  onResume,
  onEdit,
  onDelete,
  onDuplicate,
  onViewHistory,
  emptyMessage = 'No tasks found',
  emptyAction,
}: TaskListProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const toggleExpand = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-teal-500 rounded-full animate-spin" />
        <p className="mt-3 text-gray-600">Loading tasks...</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Calendar className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">{emptyMessage}</h3>
        <p className="text-gray-600 mb-4">Create your first task to get started with automation</p>
        {emptyAction}
      </div>
    );
  }

  const allSelected = selectedTasks.size === tasks.length;

  return (
    <div className="space-y-3">
      {/* Selection header */}
      {onToggleSelect && tasks.length > 0 && (
        <div className="flex items-center gap-3 px-1">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => allSelected ? onClearSelection?.() : onSelectAll?.()}
            className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
          />
          <span className="text-sm text-gray-600">
            {selectedTasks.size > 0
              ? `${selectedTasks.size} of ${tasks.length} selected`
              : `${tasks.length} tasks`}
          </span>
        </div>
      )}

      {/* Task cards */}
      {tasks.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          selected={selectedTasks.has(task.id)}
          onSelect={onToggleSelect ? () => onToggleSelect(task.id) : undefined}
          onRun={onRun ? () => onRun(task.id) : undefined}
          onPause={onPause ? () => onPause(task.id) : undefined}
          onResume={onResume ? () => onResume(task.id) : undefined}
          onEdit={onEdit ? () => onEdit(task) : undefined}
          onDelete={onDelete ? () => onDelete(task.id) : undefined}
          onDuplicate={onDuplicate ? () => onDuplicate(task) : undefined}
          onViewHistory={onViewHistory ? () => onViewHistory(task) : undefined}
          expanded={expandedTasks.has(task.id)}
          onToggleExpand={() => toggleExpand(task.id)}
        />
      ))}
    </div>
  );
}

export default TaskList;
