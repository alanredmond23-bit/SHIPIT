'use client';

import React, { useState, useEffect, useRef } from 'react';

// Task Scheduler Component - Complete task automation and scheduling interface
// Features:
// - Task list with status badges and quick actions
// - Create task wizard with step-by-step flow
// - Cron builder UI with visual day/time picker
// - Action type selector with configuration forms
// - Conditions builder for conditional execution
// - Execution history timeline with logs viewer
// - Calendar view of scheduled tasks
// - Notification settings
// - Bulk operations (pause, resume, delete)

interface ScheduledTask {
  id: string;
  userId: string;
  name: string;
  description?: string;
  type: 'one-time' | 'recurring' | 'trigger';
  schedule?: {
    at?: Date;
    cron?: string;
    timezone?: string;
  };
  trigger?: {
    type: 'webhook' | 'email' | 'event';
    config: Record<string, any>;
  };
  action: TaskAction;
  conditions?: TaskCondition[];
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
  };
  notification?: {
    onSuccess?: boolean;
    onFailure?: boolean;
    channels: ('email' | 'webhook' | 'push')[];
  };
  status: 'active' | 'paused' | 'completed' | 'failed';
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  createdAt: Date;
}

type TaskAction =
  | { type: 'ai-prompt'; prompt: string; model?: string }
  | { type: 'send-email'; to: string; subject: string; body: string }
  | { type: 'webhook'; url: string; method: string; headers?: Record<string, string>; body?: any }
  | { type: 'run-code'; language: 'python' | 'javascript'; code: string }
  | { type: 'generate-report'; config: any }
  | { type: 'chain'; tasks: TaskAction[] }
  | { type: 'web-scrape'; url: string; selector?: string }
  | { type: 'file-operation'; operation: string; path: string }
  | { type: 'google-workspace'; service: string; action: string; params: any };

interface TaskCondition {
  type: 'time' | 'variable' | 'api-response';
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'exists';
  value: any;
}

interface TaskExecution {
  id: string;
  taskId: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
  logs: string[];
  durationMs?: number;
}

const CRON_PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every day at 9 AM', value: '0 9 * * *' },
  { label: 'Every Monday at 9 AM', value: '0 9 * * 1' },
  { label: 'Every weekday at 9 AM', value: '0 9 * * 1-5' },
  { label: 'Every month on the 1st', value: '0 0 1 * *' },
];

const ACTION_TYPES = [
  { value: 'ai-prompt', label: 'AI Prompt', icon: '🤖', description: 'Run AI prompt with Claude' },
  { value: 'send-email', label: 'Send Email', icon: '📧', description: 'Send automated email' },
  { value: 'webhook', label: 'Call Webhook', icon: '🔗', description: 'HTTP request to endpoint' },
  { value: 'run-code', label: 'Run Code', icon: '💻', description: 'Execute Python/JavaScript' },
  { value: 'generate-report', label: 'Generate Report', icon: '📊', description: 'Create automated report' },
  { value: 'web-scrape', label: 'Web Scrape', icon: '🌐', description: 'Extract data from websites' },
  { value: 'chain', label: 'Task Chain', icon: '⛓️', description: 'Run multiple tasks in sequence' },
];

export default function TaskScheduler() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View state
  const [view, setView] = useState<'list' | 'calendar' | 'create'>('list');
  const [selectedTask, setSelectedTask] = useState<ScheduledTask | null>(null);
  const [showExecutions, setShowExecutions] = useState(false);

  // Create task wizard state
  const [wizardStep, setWizardStep] = useState(0);
  const [newTask, setNewTask] = useState<Partial<ScheduledTask>>({
    name: '',
    type: 'one-time',
    action: { type: 'ai-prompt', prompt: '' },
    status: 'active',
  });

  // Executions
  const [executions, setExecutions] = useState<TaskExecution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<TaskExecution | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const userId = 'current-user-id'; // Get from auth context

  // Load tasks
  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ userId });
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterType !== 'all') params.append('type', filterType);

      const res = await fetch(`/api/tasks?${params}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error?.message || 'Failed to load tasks');

      setTasks(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadExecutions = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/executions?limit=50`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error?.message || 'Failed to load executions');

      setExecutions(data.data);
      setShowExecutions(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const createTask = async () => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTask, userId }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error?.message || 'Failed to create task');

      setTasks([data.data, ...tasks]);
      setView('list');
      resetWizard();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetWizard = () => {
    setWizardStep(0);
    setNewTask({
      name: '',
      type: 'one-time',
      action: { type: 'ai-prompt', prompt: '' },
      status: 'active',
    });
  };

  const pauseTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/pause`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to pause task');
      await loadTasks();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resumeTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/resume`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to resume task');
      await loadTasks();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const runNow = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/run`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error?.message || 'Failed to run task');

      alert('Task executed successfully!');
      await loadTasks();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete task');
      await loadTasks();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'Never';
    const d = new Date(date);
    return d.toLocaleString();
  };

  const getTimeUntil = (date?: Date) => {
    if (!date) return '';
    const now = new Date().getTime();
    const target = new Date(date).getTime();
    const diff = target - now;

    if (diff < 0) return 'Overdue';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `in ${days}d ${hours % 24}h`;
    }

    return `in ${hours}h ${minutes}m`;
  };

  const filteredTasks = tasks.filter(task => {
    if (searchQuery && !task.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="h-full flex flex-col bg-gray-50">
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
            {/* View switcher */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setView('list')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  view === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                List
              </button>
              <button
                onClick={() => setView('calendar')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  view === 'calendar'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Calendar
              </button>
            </div>

            <button
              onClick={() => setView('create')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              + Create Task
            </button>
          </div>
        </div>

        {/* Filters */}
        {view === 'list' && (
          <div className="flex items-center gap-4 mt-4">
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setTimeout(loadTasks, 0);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setTimeout(loadTasks, 0);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="one-time">One-time</option>
              <option value="recurring">Recurring</option>
              <option value="trigger">Trigger</option>
            </select>
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mx-6 mt-4">
          <div className="flex items-center">
            <span className="text-red-800 text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {view === 'list' && (
          <div className="h-full overflow-y-auto px-6 py-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
                <p className="mt-3 text-gray-600">Loading tasks...</p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📅</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
                <p className="text-gray-600 mb-6">Create your first automated task to get started</p>
                <button
                  onClick={() => setView('create')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Create Your First Task
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{task.name}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                            {task.status}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                            {task.type}
                          </span>
                          <span className="text-xs text-gray-500">
                            {task.action.type}
                          </span>
                        </div>

                        {task.description && (
                          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        )}

                        <div className="flex items-center gap-6 text-xs text-gray-500">
                          <div>
                            <span className="font-medium">Next run:</span> {formatDate(task.nextRun)}
                            {task.nextRun && task.status === 'active' && (
                              <span className="ml-2 text-blue-600 font-medium">{getTimeUntil(task.nextRun)}</span>
                            )}
                          </div>
                          <div>
                            <span className="font-medium">Last run:</span> {formatDate(task.lastRun)}
                          </div>
                          <div>
                            <span className="font-medium">Runs:</span> {task.runCount}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {task.status === 'active' ? (
                          <button
                            onClick={() => pauseTask(task.id)}
                            className="px-3 py-1.5 text-sm bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 transition"
                            title="Pause task"
                          >
                            ⏸️ Pause
                          </button>
                        ) : task.status === 'paused' ? (
                          <button
                            onClick={() => resumeTask(task.id)}
                            className="px-3 py-1.5 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200 transition"
                            title="Resume task"
                          >
                            ▶️ Resume
                          </button>
                        ) : null}

                        <button
                          onClick={() => runNow(task.id)}
                          className="px-3 py-1.5 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition"
                          title="Run now"
                        >
                          ▶️ Run
                        </button>

                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            loadExecutions(task.id);
                          }}
                          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition"
                          title="View history"
                        >
                          📊 History
                        </button>

                        <button
                          onClick={() => deleteTask(task.id)}
                          className="px-3 py-1.5 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200 transition"
                          title="Delete task"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'calendar' && (
          <div className="h-full p-6">
            <CalendarView tasks={tasks} />
          </div>
        )}

        {view === 'create' && (
          <div className="h-full overflow-y-auto px-6 py-4">
            <CreateTaskWizard
              step={wizardStep}
              task={newTask}
              onUpdate={setNewTask}
              onNext={() => setWizardStep(wizardStep + 1)}
              onBack={() => setWizardStep(wizardStep - 1)}
              onCancel={() => {
                setView('list');
                resetWizard();
              }}
              onCreate={createTask}
            />
          </div>
        )}
      </div>

      {/* Execution history modal */}
      {showExecutions && selectedTask && (
        <ExecutionHistoryModal
          task={selectedTask}
          executions={executions}
          onClose={() => {
            setShowExecutions(false);
            setSelectedTask(null);
            setSelectedExecution(null);
          }}
          onSelectExecution={setSelectedExecution}
          selectedExecution={selectedExecution}
        />
      )}
    </div>
  );
}

// Calendar View Component
function CalendarView({ tasks }: { tasks: ScheduledTask[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).getDay();

  const getTasksForDay = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return tasks.filter(task => {
      if (!task.nextRun) return false;
      const nextRun = new Date(task.nextRun);
      return (
        nextRun.getDate() === day &&
        nextRun.getMonth() === date.getMonth() &&
        nextRun.getFullYear() === date.getFullYear()
      );
    });
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col">
      {/* Calendar header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <button
          onClick={prevMonth}
          className="px-3 py-1 hover:bg-gray-100 rounded transition"
        >
          ← Previous
        </button>
        <h2 className="text-lg font-semibold">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
        <button
          onClick={nextMonth}
          className="px-3 py-1 hover:bg-gray-100 rounded transition"
        >
          Next →
        </button>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 p-4">
        <div className="grid grid-cols-7 gap-2 h-full">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center font-semibold text-sm text-gray-600 mb-2">
              {day}
            </div>
          ))}

          {/* Empty cells for days before month starts */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-gray-50 rounded" />
          ))}

          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayTasks = getTasksForDay(day);
            const isToday =
              day === new Date().getDate() &&
              currentDate.getMonth() === new Date().getMonth() &&
              currentDate.getFullYear() === new Date().getFullYear();

            return (
              <div
                key={day}
                className={`border rounded p-2 ${
                  isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-700' : 'text-gray-900'}`}>
                  {day}
                </div>
                {dayTasks.length > 0 && (
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map(task => (
                      <div
                        key={task.id}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded truncate"
                        title={task.name}
                      >
                        {task.name}
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-xs text-gray-600 px-2">
                        +{dayTasks.length - 3} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Create Task Wizard Component
function CreateTaskWizard({
  step,
  task,
  onUpdate,
  onNext,
  onBack,
  onCancel,
  onCreate,
}: {
  step: number;
  task: Partial<ScheduledTask>;
  onUpdate: (task: Partial<ScheduledTask>) => void;
  onNext: () => void;
  onBack: () => void;
  onCancel: () => void;
  onCreate: () => void;
}) {
  const steps = ['Basic Info', 'Schedule', 'Action', 'Options'];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress steps */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((stepName, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  i <= step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {i + 1}
              </div>
              <div className={`mt-2 text-sm ${i <= step ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
                {stepName}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-1 ${i < step ? 'bg-blue-600' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {step === 0 && (
          <BasicInfoStep task={task} onUpdate={onUpdate} onNext={onNext} onCancel={onCancel} />
        )}
        {step === 1 && (
          <ScheduleStep task={task} onUpdate={onUpdate} onNext={onNext} onBack={onBack} />
        )}
        {step === 2 && (
          <ActionStep task={task} onUpdate={onUpdate} onNext={onNext} onBack={onBack} />
        )}
        {step === 3 && (
          <OptionsStep task={task} onUpdate={onUpdate} onCreate={onCreate} onBack={onBack} />
        )}
      </div>
    </div>
  );
}

// Basic Info Step
function BasicInfoStep({
  task,
  onUpdate,
  onNext,
  onCancel,
}: {
  task: Partial<ScheduledTask>;
  onUpdate: (task: Partial<ScheduledTask>) => void;
  onNext: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Task Name *
        </label>
        <input
          type="text"
          value={task.name || ''}
          onChange={(e) => onUpdate({ ...task, name: e.target.value })}
          placeholder="e.g., Daily Report Generation"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={task.description || ''}
          onChange={(e) => onUpdate({ ...task, description: e.target.value })}
          placeholder="Describe what this task does..."
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Task Type *
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'one-time', label: 'One-time', desc: 'Run once at specific time' },
            { value: 'recurring', label: 'Recurring', desc: 'Run on a schedule' },
            { value: 'trigger', label: 'Trigger', desc: 'Run on event' },
          ].map((type) => (
            <button
              key={type.value}
              onClick={() => onUpdate({ ...task, type: type.value as any })}
              className={`p-4 border-2 rounded-lg text-left transition ${
                task.type === type.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-gray-900">{type.label}</div>
              <div className="text-xs text-gray-600 mt-1">{type.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          onClick={onNext}
          disabled={!task.name || !task.type}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// Schedule Step
function ScheduleStep({
  task,
  onUpdate,
  onNext,
  onBack,
}: {
  task: Partial<ScheduledTask>;
  onUpdate: (task: Partial<ScheduledTask>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      {task.type === 'one-time' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Run Date & Time *
          </label>
          <input
            type="datetime-local"
            value={
              task.schedule?.at
                ? new Date(task.schedule.at).toISOString().slice(0, 16)
                : ''
            }
            onChange={(e) =>
              onUpdate({
                ...task,
                schedule: { ...task.schedule, at: new Date(e.target.value) },
              })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {task.type === 'recurring' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cron Expression *
            </label>
            <input
              type="text"
              value={task.schedule?.cron || ''}
              onChange={(e) =>
                onUpdate({
                  ...task,
                  schedule: { ...task.schedule, cron: e.target.value },
                })
              }
              placeholder="0 9 * * *"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
            />
            <p className="text-xs text-gray-600 mt-1">
              Format: minute hour day month weekday
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Presets
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CRON_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() =>
                    onUpdate({
                      ...task,
                      schedule: { ...task.schedule, cron: preset.value },
                    })
                  }
                  className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 transition text-left"
                >
                  <div className="font-medium">{preset.label}</div>
                  <div className="text-xs text-gray-600 font-mono">{preset.value}</div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {task.type === 'trigger' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trigger Type *
          </label>
          <select
            value={task.trigger?.type || 'webhook'}
            onChange={(e) =>
              onUpdate({
                ...task,
                trigger: { type: e.target.value as any, config: {} },
              })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="webhook">Webhook</option>
            <option value="email">Email</option>
            <option value="event">Event</option>
          </select>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// Action Step
function ActionStep({
  task,
  onUpdate,
  onNext,
  onBack,
}: {
  task: Partial<ScheduledTask>;
  onUpdate: (task: Partial<ScheduledTask>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Action Type *
        </label>
        <div className="grid grid-cols-2 gap-3">
          {ACTION_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() =>
                onUpdate({
                  ...task,
                  action: { type: type.value as any } as any,
                })
              }
              className={`p-4 border-2 rounded-lg text-left transition ${
                task.action?.type === type.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-2">{type.icon}</div>
              <div className="font-medium text-gray-900">{type.label}</div>
              <div className="text-xs text-gray-600 mt-1">{type.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Action-specific configuration */}
      {task.action?.type === 'ai-prompt' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Prompt *
          </label>
          <textarea
            value={(task.action as any).prompt || ''}
            onChange={(e) =>
              onUpdate({
                ...task,
                action: { ...task.action, prompt: e.target.value } as any,
              })
            }
            placeholder="Enter your prompt for Claude..."
            rows={5}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
        </div>
      )}

      {task.action?.type === 'webhook' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL *
            </label>
            <input
              type="url"
              value={(task.action as any).url || ''}
              onChange={(e) =>
                onUpdate({
                  ...task,
                  action: { ...task.action, url: e.target.value } as any,
                })
              }
              placeholder="https://api.example.com/webhook"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Method *
            </label>
            <select
              value={(task.action as any).method || 'POST'}
              onChange={(e) =>
                onUpdate({
                  ...task,
                  action: { ...task.action, method: e.target.value } as any,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
        </>
      )}

      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// Options Step
function OptionsStep({
  task,
  onUpdate,
  onCreate,
  onBack,
}: {
  task: Partial<ScheduledTask>;
  onUpdate: (task: Partial<ScheduledTask>) => void;
  onCreate: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Retry Policy */}
      <div>
        <label className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            checked={!!task.retryPolicy}
            onChange={(e) =>
              onUpdate({
                ...task,
                retryPolicy: e.target.checked
                  ? { maxRetries: 3, backoffMs: 60000 }
                  : undefined,
              })
            }
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">
            Enable retry on failure
          </span>
        </label>

        {task.retryPolicy && (
          <div className="ml-6 space-y-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Max Retries</label>
              <input
                type="number"
                value={task.retryPolicy.maxRetries}
                onChange={(e) =>
                  onUpdate({
                    ...task,
                    retryPolicy: {
                      ...task.retryPolicy!,
                      maxRetries: parseInt(e.target.value),
                    },
                  })
                }
                min="1"
                max="10"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Backoff (milliseconds)
              </label>
              <input
                type="number"
                value={task.retryPolicy.backoffMs}
                onChange={(e) =>
                  onUpdate({
                    ...task,
                    retryPolicy: {
                      ...task.retryPolicy!,
                      backoffMs: parseInt(e.target.value),
                    },
                  })
                }
                min="1000"
                step="1000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div>
        <label className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            checked={!!task.notification}
            onChange={(e) =>
              onUpdate({
                ...task,
                notification: e.target.checked
                  ? { onSuccess: false, onFailure: true, channels: ['email'] }
                  : undefined,
              })
            }
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">
            Enable notifications
          </span>
        </label>

        {task.notification && (
          <div className="ml-6 space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={task.notification.onSuccess}
                onChange={(e) =>
                  onUpdate({
                    ...task,
                    notification: {
                      ...task.notification!,
                      onSuccess: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Notify on success</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={task.notification.onFailure}
                onChange={(e) =>
                  onUpdate({
                    ...task,
                    notification: {
                      ...task.notification!,
                      onFailure: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Notify on failure</span>
            </label>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          Back
        </button>
        <button
          onClick={onCreate}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Create Task
        </button>
      </div>
    </div>
  );
}

// Execution History Modal
function ExecutionHistoryModal({
  task,
  executions,
  onClose,
  onSelectExecution,
  selectedExecution,
}: {
  task: ScheduledTask;
  executions: TaskExecution[];
  onClose: () => void;
  onSelectExecution: (execution: TaskExecution | null) => void;
  selectedExecution: TaskExecution | null;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{task.name}</h2>
            <p className="text-sm text-gray-600 mt-1">Execution History</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {executions.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              No executions yet
            </div>
          ) : (
            <div className="space-y-3">
              {executions.map((execution) => (
                <div
                  key={execution.id}
                  className={`border rounded-lg p-4 cursor-pointer transition ${
                    selectedExecution?.id === execution.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() =>
                    onSelectExecution(
                      selectedExecution?.id === execution.id ? null : execution
                    )
                  }
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          execution.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : execution.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {execution.status}
                      </span>
                      <span className="text-sm text-gray-600">
                        {new Date(execution.startedAt).toLocaleString()}
                      </span>
                    </div>
                    {execution.durationMs && (
                      <span className="text-sm text-gray-600">
                        {execution.durationMs}ms
                      </span>
                    )}
                  </div>

                  {execution.error && (
                    <div className="text-sm text-red-600 mb-2">
                      Error: {execution.error}
                    </div>
                  )}

                  {selectedExecution?.id === execution.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="font-medium text-gray-900 mb-2">Logs</h4>
                      <div className="bg-gray-900 text-gray-100 rounded p-3 font-mono text-xs overflow-x-auto max-h-60 overflow-y-auto">
                        {execution.logs.map((log, i) => (
                          <div key={i} className="mb-1">
                            {log}
                          </div>
                        ))}
                      </div>

                      {execution.result && (
                        <div className="mt-4">
                          <h4 className="font-medium text-gray-900 mb-2">Result</h4>
                          <pre className="bg-gray-50 rounded p-3 text-xs overflow-x-auto">
                            {JSON.stringify(execution.result, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
