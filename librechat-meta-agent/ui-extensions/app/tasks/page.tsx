'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { UnifiedNav, MainContent } from '@/components/Navigation/UnifiedNav';
import {
  Plus,
  Calendar,
  List,
  Search,
  Filter,
  ChevronDown,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  Tag,
  BarChart3,
} from 'lucide-react';
import { TaskList } from '@/components/Tasks/TaskList';
import { TaskCalendar } from '@/components/Tasks/TaskCalendar';
import { TaskCreator } from '@/components/Tasks/TaskCreator';
import { TaskHistory } from '@/components/Tasks/TaskHistory';
import { useTasks, useTaskExecutions, useTaskStatistics } from '@/hooks/useTasks';
import type { Task, TaskStatus, TaskType, TaskSort, TaskSortField, SortDirection } from '@/types/tasks';

// ============================================================================
// Filter Types
// ============================================================================

type ViewMode = 'list' | 'calendar';

interface FilterState {
  status: TaskStatus | 'all';
  type: TaskType | 'all';
  search: string;
  tags: string[];
}

// ============================================================================
// Filter Bar Component
// ============================================================================

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  sort: TaskSort;
  onSortChange: (sort: TaskSort) => void;
  onClear: () => void;
  taskCount: number;
}

function FilterBar({ filters, onFilterChange, sort, onSortChange, onClear, taskCount }: FilterBarProps) {
  const [showSortMenu, setShowSortMenu] = useState(false);

  const statusOptions: { value: TaskStatus | 'all'; label: string; color: string }[] = [
    { value: 'all', label: 'All Statuses', color: 'bg-gray-100 text-gray-700' },
    { value: 'active', label: 'Active', color: 'bg-emerald-100 text-emerald-700' },
    { value: 'paused', label: 'Paused', color: 'bg-amber-100 text-amber-700' },
    { value: 'running', label: 'Running', color: 'bg-blue-100 text-blue-700' },
    { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-700' },
    { value: 'failed', label: 'Failed', color: 'bg-red-100 text-red-700' },
    { value: 'pending', label: 'Pending', color: 'bg-stone-100 text-stone-700' },
  ];

  const typeOptions: { value: TaskType | 'all'; label: string }[] = [
    { value: 'all', label: 'All Types' },
    { value: 'one-time', label: 'One-time' },
    { value: 'recurring', label: 'Recurring' },
    { value: 'trigger', label: 'Trigger' },
  ];

  const sortOptions: { value: TaskSortField; label: string }[] = [
    { value: 'createdAt', label: 'Created Date' },
    { value: 'updatedAt', label: 'Updated Date' },
    { value: 'name', label: 'Name' },
    { value: 'nextRun', label: 'Next Run' },
    { value: 'lastRun', label: 'Last Run' },
    { value: 'runCount', label: 'Run Count' },
  ];

  const hasActiveFilters = filters.status !== 'all' || filters.type !== 'all' || filters.search || filters.tags.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-b border-gray-200 bg-gray-50">
      {/* Search */}
      <div className="relative flex-1 min-w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
          placeholder="Search tasks..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition text-sm"
        />
        {filters.search && (
          <button
            onClick={() => onFilterChange({ ...filters, search: '' })}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Status filter */}
      <select
        value={filters.status}
        onChange={(e) => onFilterChange({ ...filters, status: e.target.value as any })}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition text-sm bg-white"
      >
        {statusOptions.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>

      {/* Type filter */}
      <select
        value={filters.type}
        onChange={(e) => onFilterChange({ ...filters, type: e.target.value as any })}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition text-sm bg-white"
      >
        {typeOptions.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>

      {/* Sort */}
      <div className="relative">
        <button
          onClick={() => setShowSortMenu(!showSortMenu)}
          className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
        >
          <ArrowUpDown className="w-4 h-4" />
          Sort
          <ChevronDown className="w-4 h-4" />
        </button>

        {showSortMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
              {sortOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => {
                    onSortChange({
                      field: option.value,
                      direction: sort.field === option.value && sort.direction === 'desc' ? 'asc' : 'desc',
                    });
                    setShowSortMenu(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                    sort.field === option.value ? 'text-teal-600 bg-teal-50' : 'text-gray-700'
                  }`}
                >
                  {option.label}
                  {sort.field === option.value && (
                    <span className="text-xs">{sort.direction === 'asc' ? 'A-Z' : 'Z-A'}</span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <button
          onClick={onClear}
          className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1"
        >
          <X className="w-4 h-4" />
          Clear
        </button>
      )}

      {/* Task count */}
      <span className="text-sm text-gray-600 ml-auto">
        {taskCount} task{taskCount !== 1 ? 's' : ''}
      </span>
    </div>
  );
}

// ============================================================================
// Bulk Actions Bar Component
// ============================================================================

interface BulkActionsBarProps {
  selectedCount: number;
  onPause: () => void;
  onResume: () => void;
  onDelete: () => void;
  onRun: () => void;
  onClearSelection: () => void;
}

function BulkActionsBar({
  selectedCount,
  onPause,
  onResume,
  onDelete,
  onRun,
  onClearSelection,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white rounded-full shadow-xl px-6 py-3 flex items-center gap-4 z-30">
      <span className="font-medium">{selectedCount} selected</span>
      
      <div className="w-px h-6 bg-gray-700" />

      <button
        onClick={onRun}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-gray-800 transition text-sm"
      >
        <Play className="w-4 h-4" />
        Run
      </button>

      <button
        onClick={onPause}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-gray-800 transition text-sm"
      >
        <Pause className="w-4 h-4" />
        Pause
      </button>

      <button
        onClick={onResume}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-gray-800 transition text-sm"
      >
        <Activity className="w-4 h-4" />
        Resume
      </button>

      <div className="w-px h-6 bg-gray-700" />

      <button
        onClick={onDelete}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-red-600 transition text-sm text-red-400 hover:text-white"
      >
        <Trash2 className="w-4 h-4" />
        Delete
      </button>

      <button
        onClick={onClearSelection}
        className="p-1.5 rounded-full hover:bg-gray-800 transition ml-2"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ============================================================================
// Statistics Panel Component
// ============================================================================

interface StatisticsPanelProps {
  statistics: {
    totalTasks: number;
    activeTasks: number;
    pausedTasks: number;
    completedTasks: number;
    failedTasks: number;
    successRate: number;
  } | null;
}

function StatisticsPanel({ statistics }: StatisticsPanelProps) {
  if (!statistics) return null;

  return (
    <div className="grid grid-cols-6 gap-4 px-6 py-4 border-b border-gray-200 bg-white">
      <div className="text-center">
        <div className="text-2xl font-bold text-gray-900">{statistics.totalTasks}</div>
        <div className="text-xs text-gray-600">Total Tasks</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-emerald-600">{statistics.activeTasks}</div>
        <div className="text-xs text-gray-600">Active</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-amber-600">{statistics.pausedTasks}</div>
        <div className="text-xs text-gray-600">Paused</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-green-600">{statistics.completedTasks}</div>
        <div className="text-xs text-gray-600">Completed</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-red-600">{statistics.failedTasks}</div>
        <div className="text-xs text-gray-600">Failed</div>
      </div>
      <div className="text-center">
        <div className={`text-2xl font-bold ${statistics.successRate >= 90 ? 'text-green-600' : statistics.successRate >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
          {statistics.successRate}%
        </div>
        <div className="text-xs text-gray-600">Success Rate</div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Tasks Page Component
// ============================================================================

export default function TasksPage() {
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showCreator, setShowCreator] = useState(false);
  const [selectedTaskForHistory, setSelectedTaskForHistory] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showStats, setShowStats] = useState(false);

  // Filters
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    type: 'all',
    search: '',
    tags: [],
  });

  const [sort, setSort] = useState<TaskSort>({
    field: 'createdAt',
    direction: 'desc',
  });

  // Hooks
  const {
    tasks,
    loading,
    error,
    selectedTasks,
    toggleTaskSelection,
    selectAllTasks,
    clearSelection,
    createTask,
    updateTask,
    deleteTask,
    pauseTask,
    resumeTask,
    runTask,
    bulkOperation,
    refresh,
    setFilters: setApiFilters,
    setSort: setApiSort,
  } = useTasks({ autoLoad: true });

  const { statistics } = useTaskStatistics();
  
  const {
    executions,
    loading: executionsLoading,
    loadExecutions,
    retryExecution,
  } = useTaskExecutions(selectedTaskForHistory?.id || null, { autoLoad: !!selectedTaskForHistory });

  // Filter tasks locally for immediate feedback
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Status filter
      if (filters.status !== 'all' && task.status !== filters.status) {
        return false;
      }
      // Type filter
      if (filters.type !== 'all' && task.type !== filters.type) {
        return false;
      }
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matches = 
          task.name.toLowerCase().includes(searchLower) ||
          task.description?.toLowerCase().includes(searchLower) ||
          task.tags?.some(tag => tag.toLowerCase().includes(searchLower));
        if (!matches) return false;
      }
      // Tag filter
      if (filters.tags.length > 0) {
        const hasAllTags = filters.tags.every(tag => task.tags?.includes(tag));
        if (!hasAllTags) return false;
      }
      return true;
    }).sort((a, b) => {
      const aValue = a[sort.field as keyof Task];
      const bValue = b[sort.field as keyof Task];
      
      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;
      
      if (aValue instanceof Date && bValue instanceof Date) {
        return sort.direction === 'asc' 
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sort.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sort.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });
  }, [tasks, filters, sort]);

  // Handlers
  const handleCreateTask = async (taskData: any) => {
    await createTask(taskData);
    setShowCreator(false);
  };

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setShowCreator(true);
  }, []);

  const handleUpdateTask = async (taskData: any) => {
    if (editingTask) {
      await updateTask({ ...taskData, id: editingTask.id });
      setEditingTask(null);
      setShowCreator(false);
    }
  };

  const handleDeleteTask = useCallback(async (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      await deleteTask(taskId);
    }
  }, [deleteTask]);

  const handleDuplicateTask = useCallback((task: Task) => {
    setEditingTask(null);
    setShowCreator(true);
    // The creator will be pre-filled with task data but as a new task
  }, []);

  const handleViewHistory = useCallback((task: Task) => {
    setSelectedTaskForHistory(task);
  }, []);

  const handleBulkPause = useCallback(async () => {
    await bulkOperation('pause');
  }, [bulkOperation]);

  const handleBulkResume = useCallback(async () => {
    await bulkOperation('resume');
  }, [bulkOperation]);

  const handleBulkDelete = useCallback(async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedTasks.size} tasks? This action cannot be undone.`)) {
      await bulkOperation('delete');
    }
  }, [bulkOperation, selectedTasks.size]);

  const handleBulkRun = useCallback(async () => {
    await bulkOperation('run');
  }, [bulkOperation]);

  const clearFilters = useCallback(() => {
    setFilters({
      status: 'all',
      type: 'all',
      search: '',
      tags: [],
    });
  }, []);

  const handleCloseHistory = useCallback(() => {
    setSelectedTaskForHistory(null);
  }, []);

  const handleCloseCreator = useCallback(() => {
    setShowCreator(false);
    setEditingTask(null);
  }, []);

  return (
    <>
      <UnifiedNav />
      <MainContent>
        <div className="h-[calc(100vh-3.5rem)] lg:h-screen flex flex-col bg-gray-50">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Task Scheduler</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Automate tasks with scheduling, triggers, and workflows
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Statistics toggle */}
                <button
                  onClick={() => setShowStats(!showStats)}
                  className={`p-2 rounded-lg transition ${
                    showStats ? 'bg-teal-100 text-teal-600' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Toggle statistics"
                >
                  <BarChart3 className="w-5 h-5" />
                </button>

                {/* Refresh */}
                <button
                  onClick={() => refresh()}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                  title="Refresh"
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>

                {/* View switcher */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${
                      viewMode === 'list'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <List className="w-4 h-4" />
                    List
                  </button>
                  <button
                    onClick={() => setViewMode('calendar')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${
                      viewMode === 'calendar'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    Calendar
                  </button>
                </div>

                {/* Create button */}
                <button
                  onClick={() => { setEditingTask(null); setShowCreator(true); }}
                  className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition font-medium flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create Task
                </button>
              </div>
            </div>
          </div>

          {/* Statistics Panel */}
          {showStats && (
            <StatisticsPanel
              statistics={statistics ? {
                totalTasks: statistics.totalTasks,
                activeTasks: statistics.activeTasks,
                pausedTasks: statistics.pausedTasks,
                completedTasks: statistics.completedTasks,
                failedTasks: statistics.failedTasks,
                successRate: statistics.successRate,
              } : null}
            />
          )}

          {/* Filter Bar */}
          <FilterBar
            filters={filters}
            onFilterChange={setFilters}
            sort={sort}
            onSortChange={setSort}
            onClear={clearFilters}
            taskCount={filteredTasks.length}
          />

          {/* Error banner */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mx-6 mt-4">
              <div className="flex items-center">
                <XCircle className="w-5 h-5 text-red-500 mr-3" />
                <span className="text-red-800 text-sm">{error}</span>
                <button
                  onClick={() => refresh()}
                  className="ml-auto text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Main content */}
          <div className="flex-1 overflow-hidden">
            {viewMode === 'list' ? (
              <div className="h-full overflow-y-auto px-6 py-4">
                <TaskList
                  tasks={filteredTasks}
                  loading={loading}
                  selectedTasks={selectedTasks}
                  onToggleSelect={toggleTaskSelection}
                  onSelectAll={selectAllTasks}
                  onClearSelection={clearSelection}
                  onRun={runTask}
                  onPause={pauseTask}
                  onResume={resumeTask}
                  onEdit={handleEditTask}
                  onDelete={handleDeleteTask}
                  onDuplicate={handleDuplicateTask}
                  onViewHistory={handleViewHistory}
                  emptyMessage={
                    filters.status !== 'all' || filters.type !== 'all' || filters.search
                      ? 'No tasks match your filters'
                      : 'No tasks yet'
                  }
                  emptyAction={
                    !filters.search && filters.status === 'all' && filters.type === 'all' && (
                      <button
                        onClick={() => setShowCreator(true)}
                        className="px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition font-medium"
                      >
                        Create Your First Task
                      </button>
                    )
                  }
                />
              </div>
            ) : (
              <div className="h-full p-6">
                <TaskCalendar
                  tasks={filteredTasks}
                  onTaskClick={handleViewHistory}
                  onRunTask={runTask}
                />
              </div>
            )}
          </div>

          {/* Bulk Actions Bar */}
          <BulkActionsBar
            selectedCount={selectedTasks.size}
            onPause={handleBulkPause}
            onResume={handleBulkResume}
            onDelete={handleBulkDelete}
            onRun={handleBulkRun}
            onClearSelection={clearSelection}
          />
        </div>
      </MainContent>

      {/* Task Creator Modal */}
      {showCreator && (
        <TaskCreator
          onClose={handleCloseCreator}
          onCreate={editingTask ? handleUpdateTask : handleCreateTask}
          initialData={editingTask || undefined}
          isEditing={!!editingTask}
        />
      )}

      {/* Task History Modal */}
      {selectedTaskForHistory && (
        <TaskHistory
          task={selectedTaskForHistory}
          executions={executions}
          loading={executionsLoading}
          onClose={handleCloseHistory}
          onRetry={retryExecution}
          onRefresh={() => loadExecutions()}
        />
      )}
    </>
  );
}
