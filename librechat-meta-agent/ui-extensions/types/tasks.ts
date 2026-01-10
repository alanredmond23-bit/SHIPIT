// Task Scheduler Types
// Comprehensive type definitions for task scheduling, execution, and history

// ============================================================================
// Schedule Types
// ============================================================================

export type TaskScheduleType = 'one-time' | 'recurring' | 'cron';

export interface OneTimeSchedule {
  type: 'one-time';
  runAt: Date;
  timezone?: string;
}

export interface RecurringSchedule {
  type: 'recurring';
  interval: 'hourly' | 'daily' | 'weekly' | 'monthly';
  time?: string; // HH:mm format
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  timezone?: string;
}

export interface CronSchedule {
  type: 'cron';
  expression: string; // Standard cron format: minute hour day month weekday
  timezone?: string;
}

export type TaskSchedule = OneTimeSchedule | RecurringSchedule | CronSchedule;

// ============================================================================
// Action Types
// ============================================================================

export type TaskActionType = 
  | 'ai-prompt'
  | 'send-email'
  | 'webhook'
  | 'run-code'
  | 'generate-report'
  | 'web-scrape'
  | 'file-operation'
  | 'google-workspace'
  | 'chain';

export interface AIPromptAction {
  type: 'ai-prompt';
  prompt: string;
  model?: string;
  persona?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface SendEmailAction {
  type: 'send-email';
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  body: string;
  isHtml?: boolean;
  attachments?: string[];
}

export interface WebhookAction {
  type: 'webhook';
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

export interface RunCodeAction {
  type: 'run-code';
  language: 'python' | 'javascript' | 'typescript';
  code: string;
  dependencies?: string[];
  environment?: Record<string, string>;
}

export interface GenerateReportAction {
  type: 'generate-report';
  reportType: 'summary' | 'detailed' | 'analytics';
  dataSource: string;
  format: 'pdf' | 'html' | 'markdown' | 'json';
  template?: string;
}

export interface WebScrapeAction {
  type: 'web-scrape';
  url: string;
  selector?: string;
  extractType: 'text' | 'html' | 'links' | 'images' | 'structured';
  waitForSelector?: string;
  javascript?: boolean;
}

export interface FileOperationAction {
  type: 'file-operation';
  operation: 'read' | 'write' | 'append' | 'delete' | 'copy' | 'move';
  sourcePath: string;
  destinationPath?: string;
  content?: string;
}

export interface GoogleWorkspaceAction {
  type: 'google-workspace';
  service: 'gmail' | 'calendar' | 'drive' | 'sheets' | 'docs';
  action: string;
  params: Record<string, any>;
}

export interface ChainAction {
  type: 'chain';
  tasks: TaskAction[];
  continueOnError?: boolean;
}

export type TaskAction =
  | AIPromptAction
  | SendEmailAction
  | WebhookAction
  | RunCodeAction
  | GenerateReportAction
  | WebScrapeAction
  | FileOperationAction
  | GoogleWorkspaceAction
  | ChainAction;

// ============================================================================
// Condition Types
// ============================================================================

export interface TaskCondition {
  id: string;
  type: 'time' | 'variable' | 'api-response' | 'previous-result';
  field?: string;
  operator: 'equals' | 'not-equals' | 'contains' | 'not-contains' | 'greater' | 'less' | 'exists' | 'not-exists';
  value: any;
}

// ============================================================================
// Notification Types
// ============================================================================

export type NotificationChannel = 'email' | 'webhook' | 'push' | 'slack' | 'sms';

export interface TaskNotification {
  onSuccess: boolean;
  onFailure: boolean;
  onStart?: boolean;
  channels: NotificationChannel[];
  recipients?: string[];
  webhookUrl?: string;
  slackChannel?: string;
}

// ============================================================================
// Retry Policy
// ============================================================================

export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  backoffMultiplier?: number;
  maxBackoffMs?: number;
  retryOn?: ('timeout' | 'error' | 'rate-limit')[];
}

// ============================================================================
// Task Status
// ============================================================================

export type TaskStatus = 'pending' | 'active' | 'paused' | 'running' | 'completed' | 'failed' | 'cancelled';

export const TaskStatusColors: Record<TaskStatus, { bg: string; text: string; border: string }> = {
  pending: { bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-300' },
  active: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
  paused: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  running: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  completed: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  failed: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
};

// ============================================================================
// Task Type
// ============================================================================

export type TaskType = 'one-time' | 'recurring' | 'trigger' | 'chain';

// ============================================================================
// Main Task Interface
// ============================================================================

export interface Task {
  id: string;
  userId: string;
  name: string;
  description?: string;
  type: TaskType;
  
  // Scheduling
  schedule?: TaskSchedule;
  trigger?: {
    type: 'webhook' | 'email' | 'event' | 'file-change';
    config: Record<string, any>;
  };
  
  // Action
  action: TaskAction;
  
  // Conditions
  conditions?: TaskCondition[];
  
  // Policies
  retryPolicy?: RetryPolicy;
  timeout?: number; // milliseconds
  
  // Notifications
  notification?: TaskNotification;
  
  // Status tracking
  status: TaskStatus;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  successCount: number;
  failureCount: number;
  
  // Cost tracking
  totalCost?: number;
  avgCostPerRun?: number;
  
  // Metadata
  tags?: string[];
  category?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  pausedAt?: Date;
}

// ============================================================================
// Task Execution Types
// ============================================================================

export type ExecutionStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';

export const ExecutionStatusColors: Record<ExecutionStatus, { bg: string; text: string; border: string }> = {
  queued: { bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-300' },
  running: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  completed: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  failed: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  timeout: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
};

export interface TaskExecution {
  id: string;
  taskId: string;
  taskName: string;
  
  // Status
  status: ExecutionStatus;
  triggeredBy: 'schedule' | 'manual' | 'trigger' | 'retry';
  
  // Timing
  queuedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  
  // Results
  result?: any;
  output?: string;
  error?: string;
  errorStack?: string;
  
  // Logs
  logs: ExecutionLog[];
  
  // Cost
  cost?: number;
  tokensUsed?: number;
  
  // Retry info
  retryAttempt?: number;
  maxRetries?: number;
  
  // Metadata
  metadata?: Record<string, any>;
}

export interface ExecutionLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

// ============================================================================
// Task Creation/Update Types
// ============================================================================

export interface CreateTaskInput {
  name: string;
  description?: string;
  type: TaskType;
  schedule?: TaskSchedule;
  trigger?: Task['trigger'];
  action: TaskAction;
  conditions?: TaskCondition[];
  retryPolicy?: RetryPolicy;
  timeout?: number;
  notification?: TaskNotification;
  tags?: string[];
  category?: string;
  priority?: Task['priority'];
}

export interface UpdateTaskInput {
  id: string;
  name?: string;
  description?: string;
  schedule?: TaskSchedule;
  trigger?: Task['trigger'];
  action?: TaskAction;
  conditions?: TaskCondition[];
  retryPolicy?: RetryPolicy;
  timeout?: number;
  notification?: TaskNotification;
  status?: TaskStatus;
  tags?: string[];
  category?: string;
  priority?: Task['priority'];
}

// ============================================================================
// Filter and Sort Types
// ============================================================================

export type TaskSortField = 'name' | 'createdAt' | 'updatedAt' | 'lastRun' | 'nextRun' | 'runCount' | 'status';
export type SortDirection = 'asc' | 'desc';

export interface TaskFilters {
  status?: TaskStatus | TaskStatus[];
  type?: TaskType | TaskType[];
  search?: string;
  tags?: string[];
  category?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  hasErrors?: boolean;
}

export interface TaskSort {
  field: TaskSortField;
  direction: SortDirection;
}

// ============================================================================
// Calendar Types
// ============================================================================

export type CalendarView = 'month' | 'week' | 'day';

export interface CalendarTask {
  id: string;
  taskId: string;
  name: string;
  type: TaskType;
  status: TaskStatus;
  scheduledAt: Date;
  duration?: number; // estimated duration in minutes
  color?: string;
}

// ============================================================================
// Bulk Operation Types
// ============================================================================

export type BulkOperation = 'pause' | 'resume' | 'delete' | 'run' | 'tag' | 'category';

export interface BulkOperationResult {
  succeeded: string[];
  failed: Array<{ id: string; error: string }>;
}

// ============================================================================
// Statistics Types
// ============================================================================

export interface TaskStatistics {
  totalTasks: number;
  activeTasks: number;
  pausedTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalExecutions: number;
  successRate: number;
  avgExecutionTime: number;
  totalCost: number;
  tasksThisWeek: number;
  executionsThisWeek: number;
}

// ============================================================================
// Cron Helpers
// ============================================================================

export interface CronPreset {
  label: string;
  value: string;
  description: string;
}

export const CRON_PRESETS: CronPreset[] = [
  { label: 'Every minute', value: '* * * * *', description: 'Runs every minute' },
  { label: 'Every 5 minutes', value: '*/5 * * * *', description: 'Runs every 5 minutes' },
  { label: 'Every 15 minutes', value: '*/15 * * * *', description: 'Runs every 15 minutes' },
  { label: 'Every 30 minutes', value: '*/30 * * * *', description: 'Runs every 30 minutes' },
  { label: 'Every hour', value: '0 * * * *', description: 'Runs at the start of every hour' },
  { label: 'Every 6 hours', value: '0 */6 * * *', description: 'Runs every 6 hours' },
  { label: 'Every day at midnight', value: '0 0 * * *', description: 'Runs at 00:00 every day' },
  { label: 'Every day at 9 AM', value: '0 9 * * *', description: 'Runs at 09:00 every day' },
  { label: 'Every day at 6 PM', value: '0 18 * * *', description: 'Runs at 18:00 every day' },
  { label: 'Every weekday at 9 AM', value: '0 9 * * 1-5', description: 'Runs at 09:00 Monday through Friday' },
  { label: 'Every Monday at 9 AM', value: '0 9 * * 1', description: 'Runs at 09:00 every Monday' },
  { label: 'Every Sunday at midnight', value: '0 0 * * 0', description: 'Runs at 00:00 every Sunday' },
  { label: 'First of every month', value: '0 0 1 * *', description: 'Runs at 00:00 on the 1st of every month' },
  { label: 'Every quarter', value: '0 0 1 */3 *', description: 'Runs at 00:00 on the 1st of Jan, Apr, Jul, Oct' },
];

// ============================================================================
// Action Type Helpers
// ============================================================================

export interface ActionTypeInfo {
  type: TaskActionType;
  label: string;
  icon: string;
  description: string;
  category: 'ai' | 'communication' | 'automation' | 'data' | 'integration';
}

export const ACTION_TYPES: ActionTypeInfo[] = [
  { type: 'ai-prompt', label: 'AI Prompt', icon: 'bot', description: 'Run AI prompt with Claude or other models', category: 'ai' },
  { type: 'send-email', label: 'Send Email', icon: 'mail', description: 'Send automated email messages', category: 'communication' },
  { type: 'webhook', label: 'Call Webhook', icon: 'link', description: 'Make HTTP requests to external APIs', category: 'integration' },
  { type: 'run-code', label: 'Run Code', icon: 'code', description: 'Execute Python or JavaScript code', category: 'automation' },
  { type: 'generate-report', label: 'Generate Report', icon: 'file-text', description: 'Create automated reports', category: 'data' },
  { type: 'web-scrape', label: 'Web Scrape', icon: 'globe', description: 'Extract data from websites', category: 'data' },
  { type: 'file-operation', label: 'File Operation', icon: 'folder', description: 'Read, write, or manipulate files', category: 'automation' },
  { type: 'google-workspace', label: 'Google Workspace', icon: 'layout-grid', description: 'Gmail, Calendar, Drive, Sheets, Docs', category: 'integration' },
  { type: 'chain', label: 'Task Chain', icon: 'link-2', description: 'Run multiple tasks in sequence', category: 'automation' },
];
