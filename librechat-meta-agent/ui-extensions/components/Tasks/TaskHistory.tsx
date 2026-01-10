'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Download,
  Copy,
  Filter,
  Calendar,
  DollarSign,
  Activity,
  Terminal,
  FileText,
  ExternalLink,
  Timer,
} from 'lucide-react';
import type { Task, TaskExecution, ExecutionStatus } from '@/types/tasks';
import { formatDuration, formatRelativeTime } from '@/hooks/useTasks';

// ============================================================================
// Types
// ============================================================================

interface TaskHistoryProps {
  task: Task;
  executions: TaskExecution[];
  loading?: boolean;
  onClose: () => void;
  onRetry?: (executionId: string) => void;
  onRefresh?: () => void;
}

interface ExecutionFilter {
  status?: ExecutionStatus[];
  dateRange?: { start: Date; end: Date };
  triggeredBy?: ('schedule' | 'manual' | 'trigger' | 'retry')[];
}

// ============================================================================
// Status Badge Component
// ============================================================================

const statusConfig: Record<ExecutionStatus, { bg: string; text: string; icon: React.ReactNode }> = {
  queued: { bg: 'bg-stone-100', text: 'text-stone-700', icon: <Clock className="w-3 h-3" /> },
  running: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Zap className="w-3 h-3 animate-pulse" /> },
  completed: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
  failed: { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle className="w-3 h-3" /> },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-700', icon: <AlertCircle className="w-3 h-3" /> },
  timeout: { bg: 'bg-orange-100', text: 'text-orange-700', icon: <Timer className="w-3 h-3" /> },
};

function StatusBadge({ status }: { status: ExecutionStatus }) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ============================================================================
// Statistics Card Component
// ============================================================================

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  color?: string;
}

function StatCard({ label, value, icon, trend, color = 'text-gray-900' }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-gray-400">{icon}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {trend && (
        <div className={`text-xs mt-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {trend.isPositive ? '+' : ''}{trend.value}% from last period
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Log Viewer Component
// ============================================================================

interface LogViewerProps {
  logs: TaskExecution['logs'];
  className?: string;
}

function LogViewer({ logs, className = '' }: LogViewerProps) {
  const levelColors = {
    debug: 'text-gray-400',
    info: 'text-blue-400',
    warn: 'text-amber-400',
    error: 'text-red-400',
  };

  const levelIcons = {
    debug: '[DEBUG]',
    info: '[INFO]',
    warn: '[WARN]',
    error: '[ERROR]',
  };

  return (
    <div className={`bg-gray-900 rounded-lg p-4 font-mono text-xs overflow-auto ${className}`}>
      {logs.length === 0 ? (
        <div className="text-gray-500">No logs available</div>
      ) : (
        logs.map((log, index) => (
          <div key={index} className="flex gap-3 mb-1 last:mb-0">
            <span className="text-gray-500 flex-shrink-0">
              {new Date(log.timestamp).toLocaleTimeString()}
            </span>
            <span className={`flex-shrink-0 ${levelColors[log.level]}`}>
              {levelIcons[log.level]}
            </span>
            <span className="text-gray-200 break-all">{log.message}</span>
          </div>
        ))
      )}
    </div>
  );
}

// ============================================================================
// Execution Timeline Component
// ============================================================================

interface ExecutionTimelineProps {
  executions: TaskExecution[];
  selectedId?: string;
  onSelect: (execution: TaskExecution) => void;
}

function ExecutionTimeline({ executions, selectedId, onSelect }: ExecutionTimelineProps) {
  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

      {/* Execution items */}
      <div className="space-y-4">
        {executions.map((execution, index) => {
          const config = statusConfig[execution.status];
          const isSelected = selectedId === execution.id;

          return (
            <div
              key={execution.id}
              onClick={() => onSelect(execution)}
              className={`
                relative pl-10 pr-4 py-3 rounded-lg cursor-pointer transition
                ${isSelected
                  ? 'bg-teal-50 border-2 border-teal-500'
                  : 'hover:bg-gray-50 border-2 border-transparent'
                }
              `}
            >
              {/* Timeline dot */}
              <div
                className={`
                  absolute left-2.5 top-4 w-3 h-3 rounded-full ring-4 ring-white
                  ${config.bg.replace('100', '500')}
                `}
              />

              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={execution.status} />
                    <span className="text-xs text-gray-500 capitalize">
                      {execution.triggeredBy}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {execution.startedAt
                      ? new Date(execution.startedAt).toLocaleString()
                      : 'Queued'}
                  </div>
                </div>

                <div className="text-right">
                  {execution.durationMs && (
                    <div className="text-sm font-medium text-gray-900">
                      {formatDuration(execution.durationMs)}
                    </div>
                  )}
                  {execution.cost && execution.cost > 0 && (
                    <div className="text-xs text-amber-600">
                      ${execution.cost.toFixed(4)}
                    </div>
                  )}
                </div>
              </div>

              {execution.error && (
                <div className="mt-2 text-xs text-red-600 line-clamp-1">
                  {execution.error}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Execution Detail Component
// ============================================================================

interface ExecutionDetailProps {
  execution: TaskExecution;
  onRetry?: (executionId: string) => void;
}

function ExecutionDetail({ execution, onRetry }: ExecutionDetailProps) {
  const [activeTab, setActiveTab] = useState<'logs' | 'output' | 'error'>('logs');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // TODO: Show toast notification
  };

  const downloadLogs = () => {
    const logText = execution.logs
      .map(log => `[${new Date(log.timestamp).toISOString()}] [${log.level.toUpperCase()}] ${log.message}`)
      .join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `execution-${execution.id}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">Execution Details</h3>
          <p className="text-sm text-gray-600">ID: {execution.id}</p>
        </div>
        <div className="flex items-center gap-2">
          {execution.status === 'failed' && onRetry && (
            <button
              onClick={() => onRetry(execution.id)}
              className="px-3 py-1.5 text-sm bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              Retry
            </button>
          )}
          <button
            onClick={downloadLogs}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            title="Download logs"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">Status</div>
          <StatusBadge status={execution.status} />
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">Duration</div>
          <div className="font-medium text-gray-900">
            {execution.durationMs ? formatDuration(execution.durationMs) : '-'}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">Triggered By</div>
          <div className="font-medium text-gray-900 capitalize">{execution.triggeredBy}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">Cost</div>
          <div className="font-medium text-amber-600">
            {execution.cost ? `$${execution.cost.toFixed(4)}` : '-'}
          </div>
        </div>
      </div>

      {/* Timestamps */}
      <div className="flex gap-6 text-sm text-gray-600 mb-4">
        <div>
          <span className="font-medium">Queued:</span>{' '}
          {new Date(execution.queuedAt).toLocaleString()}
        </div>
        {execution.startedAt && (
          <div>
            <span className="font-medium">Started:</span>{' '}
            {new Date(execution.startedAt).toLocaleString()}
          </div>
        )}
        {execution.completedAt && (
          <div>
            <span className="font-medium">Completed:</span>{' '}
            {new Date(execution.completedAt).toLocaleString()}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px ${
            activeTab === 'logs'
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Terminal className="w-4 h-4 inline mr-1.5" />
          Logs ({execution.logs.length})
        </button>
        <button
          onClick={() => setActiveTab('output')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px ${
            activeTab === 'output'
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <FileText className="w-4 h-4 inline mr-1.5" />
          Output
        </button>
        {execution.error && (
          <button
            onClick={() => setActiveTab('error')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px ${
              activeTab === 'error'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-red-500 hover:text-red-700'
            }`}
          >
            <AlertCircle className="w-4 h-4 inline mr-1.5" />
            Error
          </button>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'logs' && (
          <LogViewer logs={execution.logs} className="h-full max-h-80" />
        )}

        {activeTab === 'output' && (
          <div className="h-full max-h-80 overflow-auto">
            {execution.result ? (
              <div className="relative">
                <button
                  onClick={() => copyToClipboard(JSON.stringify(execution.result, null, 2))}
                  className="absolute top-2 right-2 p-1.5 bg-gray-700 hover:bg-gray-600 rounded transition"
                  title="Copy to clipboard"
                >
                  <Copy className="w-3.5 h-3.5 text-gray-300" />
                </button>
                <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-auto">
                  {typeof execution.result === 'string'
                    ? execution.result
                    : JSON.stringify(execution.result, null, 2)}
                </pre>
              </div>
            ) : execution.output ? (
              <div className="relative">
                <button
                  onClick={() => copyToClipboard(execution.output!)}
                  className="absolute top-2 right-2 p-1.5 bg-gray-700 hover:bg-gray-600 rounded transition"
                  title="Copy to clipboard"
                >
                  <Copy className="w-3.5 h-3.5 text-gray-300" />
                </button>
                <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-auto whitespace-pre-wrap">
                  {execution.output}
                </pre>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No output available
              </div>
            )}
          </div>
        )}

        {activeTab === 'error' && execution.error && (
          <div className="h-full max-h-80 overflow-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-red-800 mb-2">Error Message</h4>
              <p className="text-sm text-red-700">{execution.error}</p>
            </div>

            {execution.errorStack && (
              <div className="relative">
                <button
                  onClick={() => copyToClipboard(execution.errorStack!)}
                  className="absolute top-2 right-2 p-1.5 bg-gray-700 hover:bg-gray-600 rounded transition"
                  title="Copy to clipboard"
                >
                  <Copy className="w-3.5 h-3.5 text-gray-300" />
                </button>
                <pre className="bg-gray-900 text-red-400 rounded-lg p-4 text-xs overflow-auto whitespace-pre-wrap">
                  {execution.errorStack}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Retry info */}
      {execution.retryAttempt !== undefined && (
        <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600">
          Retry attempt {execution.retryAttempt} of {execution.maxRetries}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Task History Component
// ============================================================================

export function TaskHistory({
  task,
  executions,
  loading = false,
  onClose,
  onRetry,
  onRefresh,
}: TaskHistoryProps) {
  const [selectedExecution, setSelectedExecution] = useState<TaskExecution | null>(
    executions[0] || null
  );
  const [filters, setFilters] = useState<ExecutionFilter>({});
  const [showFilters, setShowFilters] = useState(false);

  // Filter executions
  const filteredExecutions = useMemo(() => {
    return executions.filter(execution => {
      if (filters.status?.length && !filters.status.includes(execution.status)) {
        return false;
      }
      if (filters.triggeredBy?.length && !filters.triggeredBy.includes(execution.triggeredBy)) {
        return false;
      }
      if (filters.dateRange) {
        const executionDate = new Date(execution.queuedAt);
        if (executionDate < filters.dateRange.start || executionDate > filters.dateRange.end) {
          return false;
        }
      }
      return true;
    });
  }, [executions, filters]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = executions.length;
    const completed = executions.filter(e => e.status === 'completed').length;
    const failed = executions.filter(e => e.status === 'failed').length;
    const totalDuration = executions.reduce((sum, e) => sum + (e.durationMs || 0), 0);
    const totalCost = executions.reduce((sum, e) => sum + (e.cost || 0), 0);

    return {
      total,
      completed,
      failed,
      successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      avgDuration: total > 0 ? Math.round(totalDuration / total) : 0,
      totalCost,
    };
  }, [executions]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{task.name}</h2>
            <p className="text-sm text-gray-600">Execution History</p>
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                title="Refresh"
              >
                <RotateCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition ${
                showFilters ? 'bg-teal-100 text-teal-600' : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Filters"
            >
              <Filter className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-5 gap-4">
            <StatCard
              label="Total Executions"
              value={stats.total}
              icon={<Activity className="w-4 h-4" />}
            />
            <StatCard
              label="Success Rate"
              value={`${stats.successRate}%`}
              icon={<CheckCircle className="w-4 h-4" />}
              color={stats.successRate >= 90 ? 'text-green-600' : stats.successRate >= 70 ? 'text-amber-600' : 'text-red-600'}
            />
            <StatCard
              label="Completed"
              value={stats.completed}
              icon={<CheckCircle className="w-4 h-4" />}
              color="text-green-600"
            />
            <StatCard
              label="Failed"
              value={stats.failed}
              icon={<XCircle className="w-4 h-4" />}
              color="text-red-600"
            />
            <StatCard
              label="Total Cost"
              value={`$${stats.totalCost.toFixed(4)}`}
              icon={<DollarSign className="w-4 h-4" />}
              color="text-amber-600"
            />
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-6">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <div className="flex gap-2">
                  {(['completed', 'failed', 'running', 'queued'] as ExecutionStatus[]).map(status => (
                    <button
                      key={status}
                      onClick={() => {
                        const current = filters.status || [];
                        setFilters({
                          ...filters,
                          status: current.includes(status)
                            ? current.filter(s => s !== status)
                            : [...current, status],
                        });
                      }}
                      className={`
                        px-2 py-1 text-xs rounded-full border transition capitalize
                        ${filters.status?.includes(status)
                          ? 'border-teal-500 bg-teal-50 text-teal-700'
                          : 'border-gray-300 text-gray-600 hover:border-gray-400'
                        }
                      `}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Triggered By</label>
                <div className="flex gap-2">
                  {(['schedule', 'manual', 'trigger', 'retry'] as const).map(trigger => (
                    <button
                      key={trigger}
                      onClick={() => {
                        const current = filters.triggeredBy || [];
                        setFilters({
                          ...filters,
                          triggeredBy: current.includes(trigger)
                            ? current.filter(t => t !== trigger)
                            : [...current, trigger],
                        });
                      }}
                      className={`
                        px-2 py-1 text-xs rounded-full border transition capitalize
                        ${filters.triggeredBy?.includes(trigger)
                          ? 'border-teal-500 bg-teal-50 text-teal-700'
                          : 'border-gray-300 text-gray-600 hover:border-gray-400'
                        }
                      `}
                    >
                      {trigger}
                    </button>
                  ))}
                </div>
              </div>

              {(filters.status?.length || filters.triggeredBy?.length) && (
                <button
                  onClick={() => setFilters({})}
                  className="text-xs text-teal-600 hover:text-teal-700"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Timeline */}
          <div className="w-80 border-r border-gray-200 overflow-y-auto p-4 bg-gray-50">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-teal-500 rounded-full animate-spin" />
                <p className="mt-3 text-gray-600 text-sm">Loading history...</p>
              </div>
            ) : filteredExecutions.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">No executions found</p>
                {(filters.status?.length || filters.triggeredBy?.length) && (
                  <button
                    onClick={() => setFilters({})}
                    className="text-sm text-teal-600 hover:text-teal-700 mt-2"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <ExecutionTimeline
                executions={filteredExecutions}
                selectedId={selectedExecution?.id}
                onSelect={setSelectedExecution}
              />
            )}
          </div>

          {/* Detail panel */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedExecution ? (
              <ExecutionDetail
                execution={selectedExecution}
                onRetry={onRetry}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <FileText className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Execution Selected</h3>
                <p className="text-gray-600">Select an execution from the timeline to view details</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Showing {filteredExecutions.length} of {executions.length} executions
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default TaskHistory;
