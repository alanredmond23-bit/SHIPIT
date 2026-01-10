'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  Task,
  TaskExecution,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilters,
  TaskSort,
  TaskStatus,
  BulkOperation,
  BulkOperationResult,
  TaskStatistics,
  CalendarTask,
} from '@/types/tasks';

// ============================================================================
// API Response Types
// ============================================================================

interface ApiResponse<T> {
  data: T;
  error?: { message: string; code?: string };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// ============================================================================
// Hook Options
// ============================================================================

interface UseTasksOptions {
  autoLoad?: boolean;
  pollingInterval?: number; // in milliseconds, 0 to disable
  filters?: TaskFilters;
  sort?: TaskSort;
  limit?: number;
}

// ============================================================================
// Hook State
// ============================================================================

interface TasksState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

interface ExecutionsState {
  executions: TaskExecution[];
  loading: boolean;
  error: string | null;
}

// ============================================================================
// Main Hook
// ============================================================================

export function useTasks(options: UseTasksOptions = {}) {
  const {
    autoLoad = true,
    pollingInterval = 0,
    filters: initialFilters,
    sort: initialSort = { field: 'createdAt', direction: 'desc' },
    limit = 50,
  } = options;

  // State
  const [state, setState] = useState<TasksState>({
    tasks: [],
    loading: false,
    error: null,
    pagination: { page: 1, limit, total: 0, hasMore: false },
  });

  const [filters, setFilters] = useState<TaskFilters>(initialFilters || {});
  const [sort, setSort] = useState<TaskSort>(initialSort);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  // Refs for polling
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // ============================================================================
  // API Helpers
  // ============================================================================

  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      statuses.forEach(s => params.append('status', s));
    }
    
    if (filters.type) {
      const types = Array.isArray(filters.type) ? filters.type : [filters.type];
      types.forEach(t => params.append('type', t));
    }
    
    if (filters.search) {
      params.append('search', filters.search);
    }
    
    if (filters.tags?.length) {
      filters.tags.forEach(tag => params.append('tags', tag));
    }
    
    if (filters.category) {
      params.append('category', filters.category);
    }
    
    if (filters.hasErrors !== undefined) {
      params.append('hasErrors', String(filters.hasErrors));
    }
    
    if (sort) {
      params.append('sortBy', sort.field);
      params.append('sortDir', sort.direction);
    }
    
    params.append('limit', String(state.pagination.limit));
    params.append('page', String(state.pagination.page));
    
    return params.toString();
  }, [filters, sort, state.pagination.limit, state.pagination.page]);

  // ============================================================================
  // Load Tasks
  // ============================================================================

  const loadTasks = useCallback(async (page = 1) => {
    if (!mountedRef.current) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const params = buildQueryParams();
      const response = await fetch(`/api/tasks?${params}`);
      const data: ApiResponse<Task[]> = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to load tasks');
      }

      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          tasks: data.data,
          loading: false,
          pagination: data.pagination || prev.pagination,
        }));
      }
    } catch (error: any) {
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
      }
    }
  }, [buildQueryParams]);

  // ============================================================================
  // Create Task
  // ============================================================================

  const createTask = useCallback(async (input: CreateTaskInput): Promise<Task | null> => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const data: ApiResponse<Task> = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create task');
      }

      // Add new task to list
      setState(prev => ({
        ...prev,
        tasks: [data.data, ...prev.tasks],
        pagination: { ...prev.pagination, total: prev.pagination.total + 1 },
      }));

      return data.data;
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      return null;
    }
  }, []);

  // ============================================================================
  // Update Task
  // ============================================================================

  const updateTask = useCallback(async (input: UpdateTaskInput): Promise<Task | null> => {
    try {
      const response = await fetch(`/api/tasks/${input.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const data: ApiResponse<Task> = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to update task');
      }

      // Update task in list
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t.id === input.id ? data.data : t),
      }));

      return data.data;
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      return null;
    }
  }, []);

  // ============================================================================
  // Delete Task
  // ============================================================================

  const deleteTask = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to delete task');
      }

      // Remove task from list
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.filter(t => t.id !== taskId),
        pagination: { ...prev.pagination, total: prev.pagination.total - 1 },
      }));

      // Remove from selection
      setSelectedTasks(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });

      return true;
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      return false;
    }
  }, []);

  // ============================================================================
  // Task Actions
  // ============================================================================

  const pauseTask = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/pause`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to pause task');
      }

      // Update task status in list
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => 
          t.id === taskId ? { ...t, status: 'paused' as TaskStatus, pausedAt: new Date() } : t
        ),
      }));

      return true;
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      return false;
    }
  }, []);

  const resumeTask = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/resume`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to resume task');
      }

      // Update task status in list
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => 
          t.id === taskId ? { ...t, status: 'active' as TaskStatus, pausedAt: undefined } : t
        ),
      }));

      return true;
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      return false;
    }
  }, []);

  const runTask = useCallback(async (taskId: string): Promise<TaskExecution | null> => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/run`, {
        method: 'POST',
      });

      const data: ApiResponse<TaskExecution> = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to run task');
      }

      // Update task in list with new run info
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => 
          t.id === taskId 
            ? { ...t, lastRun: new Date(), runCount: t.runCount + 1 } 
            : t
        ),
      }));

      return data.data;
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      return null;
    }
  }, []);

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  const bulkOperation = useCallback(async (
    operation: BulkOperation,
    taskIds?: string[]
  ): Promise<BulkOperationResult> => {
    const ids = taskIds || Array.from(selectedTasks);
    
    if (ids.length === 0) {
      return { succeeded: [], failed: [] };
    }

    try {
      const response = await fetch('/api/tasks/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation, taskIds: ids }),
      });

      const data: ApiResponse<BulkOperationResult> = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to perform bulk operation');
      }

      // Refresh tasks after bulk operation
      await loadTasks();

      // Clear selection after successful operation
      if (data.data.succeeded.length > 0) {
        setSelectedTasks(new Set());
      }

      return data.data;
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      return { succeeded: [], failed: ids.map(id => ({ id, error: error.message })) };
    }
  }, [selectedTasks, loadTasks]);

  // ============================================================================
  // Selection
  // ============================================================================

  const toggleTaskSelection = useCallback((taskId: string) => {
    setSelectedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const selectAllTasks = useCallback(() => {
    setSelectedTasks(new Set(state.tasks.map(t => t.id)));
  }, [state.tasks]);

  const clearSelection = useCallback(() => {
    setSelectedTasks(new Set());
  }, []);

  // ============================================================================
  // Pagination
  // ============================================================================

  const goToPage = useCallback((page: number) => {
    setState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, page },
    }));
  }, []);

  const nextPage = useCallback(() => {
    if (state.pagination.hasMore) {
      goToPage(state.pagination.page + 1);
    }
  }, [state.pagination.hasMore, state.pagination.page, goToPage]);

  const prevPage = useCallback(() => {
    if (state.pagination.page > 1) {
      goToPage(state.pagination.page - 1);
    }
  }, [state.pagination.page, goToPage]);

  // ============================================================================
  // Lifecycle
  // ============================================================================

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    
    if (autoLoad) {
      loadTasks();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [autoLoad]); // Only run on mount

  // Reload when filters/sort/page change
  useEffect(() => {
    if (autoLoad) {
      loadTasks();
    }
  }, [filters, sort, state.pagination.page, autoLoad, loadTasks]);

  // Polling
  useEffect(() => {
    if (pollingInterval > 0) {
      pollingRef.current = setInterval(() => {
        loadTasks();
      }, pollingInterval);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [pollingInterval, loadTasks]);

  // ============================================================================
  // Clear Error
  // ============================================================================

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    tasks: state.tasks,
    loading: state.loading,
    error: state.error,
    pagination: state.pagination,
    
    // Filters & Sort
    filters,
    setFilters,
    sort,
    setSort,
    
    // Selection
    selectedTasks,
    toggleTaskSelection,
    selectAllTasks,
    clearSelection,
    
    // Actions
    loadTasks,
    createTask,
    updateTask,
    deleteTask,
    pauseTask,
    resumeTask,
    runTask,
    bulkOperation,
    
    // Pagination
    goToPage,
    nextPage,
    prevPage,
    
    // Utility
    clearError,
    refresh: loadTasks,
  };
}

// ============================================================================
// Task Executions Hook
// ============================================================================

export function useTaskExecutions(taskId: string | null, options: { limit?: number; autoLoad?: boolean } = {}) {
  const { limit = 50, autoLoad = true } = options;

  const [state, setState] = useState<ExecutionsState>({
    executions: [],
    loading: false,
    error: null,
  });

  const loadExecutions = useCallback(async () => {
    if (!taskId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(`/api/tasks/${taskId}/executions?limit=${limit}`);
      const data: ApiResponse<TaskExecution[]> = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to load executions');
      }

      setState(prev => ({
        ...prev,
        executions: data.data,
        loading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
    }
  }, [taskId, limit]);

  const retryExecution = useCallback(async (executionId: string): Promise<TaskExecution | null> => {
    try {
      const response = await fetch(`/api/tasks/executions/${executionId}/retry`, {
        method: 'POST',
      });

      const data: ApiResponse<TaskExecution> = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to retry execution');
      }

      // Refresh executions
      await loadExecutions();

      return data.data;
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      return null;
    }
  }, [loadExecutions]);

  useEffect(() => {
    if (autoLoad && taskId) {
      loadExecutions();
    }
  }, [taskId, autoLoad, loadExecutions]);

  return {
    executions: state.executions,
    loading: state.loading,
    error: state.error,
    loadExecutions,
    retryExecution,
    refresh: loadExecutions,
  };
}

// ============================================================================
// Task Statistics Hook
// ============================================================================

export function useTaskStatistics() {
  const [statistics, setStatistics] = useState<TaskStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatistics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tasks/statistics');
      const data: ApiResponse<TaskStatistics> = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to load statistics');
      }

      setStatistics(data.data);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  return {
    statistics,
    loading,
    error,
    refresh: loadStatistics,
  };
}

// ============================================================================
// Calendar Tasks Hook
// ============================================================================

export function useCalendarTasks(dateRange: { start: Date; end: Date }) {
  const [calendarTasks, setCalendarTasks] = useState<CalendarTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCalendarTasks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
      });

      const response = await fetch(`/api/tasks/calendar?${params}`);
      const data: ApiResponse<CalendarTask[]> = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to load calendar tasks');
      }

      setCalendarTasks(data.data);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [dateRange.start, dateRange.end]);

  const rescheduleTask = useCallback(async (taskId: string, newDate: Date): Promise<boolean> => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: newDate.toISOString() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to reschedule task');
      }

      // Refresh calendar tasks
      await loadCalendarTasks();

      return true;
    } catch (error: any) {
      setError(error.message);
      return false;
    }
  }, [loadCalendarTasks]);

  useEffect(() => {
    loadCalendarTasks();
  }, [loadCalendarTasks]);

  return {
    calendarTasks,
    loading,
    error,
    rescheduleTask,
    refresh: loadCalendarTasks,
  };
}

// ============================================================================
// Schedule Parser Helpers
// ============================================================================

export function parseCronExpression(cron: string): string {
  const parts = cron.split(' ');
  if (parts.length !== 5) return 'Invalid cron expression';

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Simple human-readable parsing
  if (cron === '* * * * *') return 'Every minute';
  if (cron === '*/5 * * * *') return 'Every 5 minutes';
  if (cron === '*/15 * * * *') return 'Every 15 minutes';
  if (cron === '*/30 * * * *') return 'Every 30 minutes';
  if (cron === '0 * * * *') return 'Every hour';
  if (cron === '0 */6 * * *') return 'Every 6 hours';
  if (cron.match(/^0 \d+ \* \* \*$/)) return `Every day at ${hour}:00`;
  if (cron.match(/^0 \d+ \* \* 1-5$/)) return `Weekdays at ${hour}:00`;
  if (cron.match(/^0 \d+ \* \* \d$/)) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `Every ${days[parseInt(dayOfWeek)]} at ${hour}:00`;
  }
  if (cron.match(/^0 0 1 \* \*$/)) return 'First of every month';

  return `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`;
}

export function getNextRunTime(cron: string): Date | null {
  // Simplified next run calculation
  // In production, use a library like cron-parser
  const now = new Date();
  const parts = cron.split(' ');
  if (parts.length !== 5) return null;

  const [minute, hour] = parts;

  if (minute === '*' && hour === '*') {
    // Every minute
    return new Date(now.getTime() + 60000);
  }

  if (minute.startsWith('*/')) {
    const interval = parseInt(minute.slice(2));
    const nextMinute = Math.ceil(now.getMinutes() / interval) * interval;
    const next = new Date(now);
    next.setMinutes(nextMinute, 0, 0);
    if (next <= now) next.setMinutes(next.getMinutes() + interval);
    return next;
  }

  if (hour !== '*' && minute !== '*') {
    const next = new Date(now);
    next.setHours(parseInt(hour), parseInt(minute), 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next;
  }

  return null;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const absDiff = Math.abs(diff);
  const isPast = diff < 0;

  if (absDiff < 60000) {
    return isPast ? 'just now' : 'in a moment';
  }

  if (absDiff < 3600000) {
    const minutes = Math.floor(absDiff / 60000);
    return isPast ? `${minutes}m ago` : `in ${minutes}m`;
  }

  if (absDiff < 86400000) {
    const hours = Math.floor(absDiff / 3600000);
    return isPast ? `${hours}h ago` : `in ${hours}h`;
  }

  const days = Math.floor(absDiff / 86400000);
  return isPast ? `${days}d ago` : `in ${days}d`;
}

export default useTasks;
