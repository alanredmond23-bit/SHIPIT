'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Calendar,
  Clock,
  Zap,
  Bot,
  Mail,
  Link,
  Code,
  FileText,
  Globe,
  Folder,
  LayoutGrid,
  Link2,
  Bell,
  BellOff,
  RotateCcw,
  AlertCircle,
  Info,
} from 'lucide-react';
import type {
  CreateTaskInput,
  TaskType,
  TaskSchedule,
  TaskAction,
  TaskActionType,
  RetryPolicy,
  TaskNotification,
  CRON_PRESETS,
  ACTION_TYPES,
} from '@/types/tasks';

// ============================================================================
// Types
// ============================================================================

interface TaskCreatorProps {
  onClose: () => void;
  onCreate: (task: CreateTaskInput) => Promise<void>;
  initialData?: Partial<CreateTaskInput>;
  isEditing?: boolean;
}

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

// ============================================================================
// Constants
// ============================================================================

const WIZARD_STEPS: WizardStep[] = [
  { id: 'info', title: 'Basic Info', description: 'Name and type', icon: <Info className="w-5 h-5" /> },
  { id: 'schedule', title: 'Schedule', description: 'When to run', icon: <Calendar className="w-5 h-5" /> },
  { id: 'action', title: 'Action', description: 'What to do', icon: <Zap className="w-5 h-5" /> },
  { id: 'options', title: 'Options', description: 'Notifications & retry', icon: <Bell className="w-5 h-5" /> },
];

const CRON_PRESETS_LIST = [
  { label: 'Every minute', value: '* * * * *', description: 'Runs every minute' },
  { label: 'Every 5 minutes', value: '*/5 * * * *', description: 'Runs every 5 minutes' },
  { label: 'Every 15 minutes', value: '*/15 * * * *', description: 'Runs every 15 minutes' },
  { label: 'Every 30 minutes', value: '*/30 * * * *', description: 'Runs every 30 minutes' },
  { label: 'Every hour', value: '0 * * * *', description: 'Runs at the start of every hour' },
  { label: 'Every 6 hours', value: '0 */6 * * *', description: 'Runs every 6 hours' },
  { label: 'Every day at midnight', value: '0 0 * * *', description: 'Runs at 00:00 every day' },
  { label: 'Every day at 9 AM', value: '0 9 * * *', description: 'Runs at 09:00 every day' },
  { label: 'Every weekday at 9 AM', value: '0 9 * * 1-5', description: 'Runs at 09:00 Monday-Friday' },
  { label: 'Every Monday at 9 AM', value: '0 9 * * 1', description: 'Runs at 09:00 every Monday' },
  { label: 'First of every month', value: '0 0 1 * *', description: 'Runs at 00:00 on the 1st' },
];

const ACTION_TYPES_LIST = [
  { type: 'ai-prompt', label: 'AI Prompt', icon: Bot, description: 'Run AI prompt with Claude', category: 'ai' },
  { type: 'send-email', label: 'Send Email', icon: Mail, description: 'Send automated email', category: 'communication' },
  { type: 'webhook', label: 'Call Webhook', icon: Link, description: 'HTTP request to API', category: 'integration' },
  { type: 'run-code', label: 'Run Code', icon: Code, description: 'Execute Python/JS', category: 'automation' },
  { type: 'generate-report', label: 'Generate Report', icon: FileText, description: 'Create reports', category: 'data' },
  { type: 'web-scrape', label: 'Web Scrape', icon: Globe, description: 'Extract web data', category: 'data' },
  { type: 'file-operation', label: 'File Operation', icon: Folder, description: 'File actions', category: 'automation' },
  { type: 'google-workspace', label: 'Google Workspace', icon: LayoutGrid, description: 'Gmail, Drive, etc.', category: 'integration' },
  { type: 'chain', label: 'Task Chain', icon: Link2, description: 'Multiple tasks', category: 'automation' },
] as const;

// ============================================================================
// Step Indicator Component
// ============================================================================

interface StepIndicatorProps {
  steps: WizardStep[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

function StepIndicator({ steps, currentStep, onStepClick }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <button
            onClick={() => onStepClick?.(index)}
            disabled={index > currentStep}
            className={`
              flex flex-col items-center flex-1 relative
              ${index <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed'}
            `}
          >
            <div
              className={`
                w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all
                ${index < currentStep
                  ? 'bg-teal-500 text-white'
                  : index === currentStep
                    ? 'bg-teal-500 text-white ring-4 ring-teal-100'
                    : 'bg-gray-200 text-gray-500'
                }
              `}
            >
              {index < currentStep ? <Check className="w-5 h-5" /> : step.icon}
            </div>
            <div className="mt-2 text-center">
              <div className={`text-sm font-medium ${index <= currentStep ? 'text-gray-900' : 'text-gray-500'}`}>
                {step.title}
              </div>
              <div className="text-xs text-gray-500 hidden sm:block">{step.description}</div>
            </div>
          </button>

          {index < steps.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-2 ${index < currentStep ? 'bg-teal-500' : 'bg-gray-200'}`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ============================================================================
// Basic Info Step
// ============================================================================

interface BasicInfoStepProps {
  data: Partial<CreateTaskInput>;
  onChange: (data: Partial<CreateTaskInput>) => void;
}

function BasicInfoStep({ data, onChange }: BasicInfoStepProps) {
  const taskTypes: { value: TaskType; label: string; description: string; icon: React.ReactNode }[] = [
    { value: 'one-time', label: 'One-time', description: 'Run once at specific time', icon: <Clock className="w-5 h-5" /> },
    { value: 'recurring', label: 'Recurring', description: 'Run on a schedule', icon: <RotateCcw className="w-5 h-5" /> },
    { value: 'trigger', label: 'Trigger', description: 'Run on event', icon: <Zap className="w-5 h-5" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Task Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Task Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.name || ''}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          placeholder="e.g., Daily Report Generation"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={data.description || ''}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          placeholder="Describe what this task does..."
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition resize-none"
        />
      </div>

      {/* Task Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Task Type <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-3">
          {taskTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => onChange({ ...data, type: type.value })}
              className={`
                p-4 border-2 rounded-lg text-left transition
                ${data.type === type.value
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <div className={`mb-2 ${data.type === type.value ? 'text-teal-600' : 'text-gray-500'}`}>
                {type.icon}
              </div>
              <div className="font-medium text-gray-900">{type.label}</div>
              <div className="text-xs text-gray-600 mt-1">{type.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags
        </label>
        <input
          type="text"
          value={data.tags?.join(', ') || ''}
          onChange={(e) => onChange({ 
            ...data, 
            tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) 
          })}
          placeholder="Enter tags separated by commas"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
        />
      </div>

      {/* Priority */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Priority
        </label>
        <select
          value={data.priority || 'normal'}
          onChange={(e) => onChange({ ...data, priority: e.target.value as any })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>
    </div>
  );
}

// ============================================================================
// Schedule Step
// ============================================================================

interface ScheduleStepProps {
  data: Partial<CreateTaskInput>;
  onChange: (data: Partial<CreateTaskInput>) => void;
}

function ScheduleStep({ data, onChange }: ScheduleStepProps) {
  const [cronInput, setCronInput] = useState((data.schedule as any)?.expression || '');

  const updateSchedule = (schedule: TaskSchedule) => {
    onChange({ ...data, schedule });
  };

  if (data.type === 'trigger') {
    return (
      <div className="space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-800">Trigger-based Task</h4>
            <p className="text-sm text-amber-700 mt-1">
              This task will run when triggered by an external event, webhook, or email.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trigger Type
          </label>
          <select
            value={data.trigger?.type || 'webhook'}
            onChange={(e) => onChange({
              ...data,
              trigger: { type: e.target.value as any, config: {} },
            })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
          >
            <option value="webhook">Webhook</option>
            <option value="email">Email</option>
            <option value="event">Event</option>
            <option value="file-change">File Change</option>
          </select>
        </div>

        {data.trigger?.type === 'webhook' && (
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">Webhook URL will be generated after task creation:</p>
            <div className="bg-white border border-gray-200 rounded px-3 py-2 font-mono text-sm text-gray-500">
              https://api.example.com/tasks/webhooks/&lt;task-id&gt;
            </div>
          </div>
        )}
      </div>
    );
  }

  if (data.type === 'one-time') {
    return (
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Run Date & Time <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={(data.schedule as any)?.runAt 
              ? new Date((data.schedule as any).runAt).toISOString().slice(0, 16) 
              : ''}
            onChange={(e) => updateSchedule({
              type: 'one-time',
              runAt: new Date(e.target.value),
            })}
            min={new Date().toISOString().slice(0, 16)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Timezone
          </label>
          <select
            value={(data.schedule as any)?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
            onChange={(e) => updateSchedule({
              ...(data.schedule as any),
              type: 'one-time',
              timezone: e.target.value,
            })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
          >
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="UTC">UTC</option>
            <option value="Europe/London">London (GMT/BST)</option>
            <option value="Europe/Paris">Paris (CET)</option>
            <option value="Asia/Tokyo">Tokyo (JST)</option>
          </select>
        </div>
      </div>
    );
  }

  // Recurring type
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cron Expression <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={cronInput}
          onChange={(e) => {
            setCronInput(e.target.value);
            updateSchedule({
              type: 'cron',
              expression: e.target.value,
            });
          }}
          placeholder="* * * * *"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition font-mono"
        />
        <p className="text-xs text-gray-500 mt-2">
          Format: minute hour day month weekday
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Quick Presets
        </label>
        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
          {CRON_PRESETS_LIST.map((preset) => (
            <button
              key={preset.value}
              onClick={() => {
                setCronInput(preset.value);
                updateSchedule({ type: 'cron', expression: preset.value });
              }}
              className={`
                px-3 py-2 text-sm border rounded-lg text-left transition
                ${cronInput === preset.value
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              <div className="font-medium text-gray-900">{preset.label}</div>
              <div className="text-xs text-gray-500 font-mono">{preset.value}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Timezone
        </label>
        <select
          value={(data.schedule as any)?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
          onChange={(e) => updateSchedule({
            ...(data.schedule as any),
            type: 'cron',
            timezone: e.target.value,
          })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
        >
          <option value="America/New_York">Eastern Time (ET)</option>
          <option value="America/Chicago">Central Time (CT)</option>
          <option value="America/Denver">Mountain Time (MT)</option>
          <option value="America/Los_Angeles">Pacific Time (PT)</option>
          <option value="UTC">UTC</option>
          <option value="Europe/London">London (GMT/BST)</option>
          <option value="Europe/Paris">Paris (CET)</option>
          <option value="Asia/Tokyo">Tokyo (JST)</option>
        </select>
      </div>
    </div>
  );
}

// ============================================================================
// Action Step
// ============================================================================

interface ActionStepProps {
  data: Partial<CreateTaskInput>;
  onChange: (data: Partial<CreateTaskInput>) => void;
}

function ActionStep({ data, onChange }: ActionStepProps) {
  const updateAction = (action: TaskAction) => {
    onChange({ ...data, action });
  };

  const actionType = data.action?.type || 'ai-prompt';

  return (
    <div className="space-y-6">
      {/* Action Type Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Action Type <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-3">
          {ACTION_TYPES_LIST.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.type}
                onClick={() => updateAction({ type: type.type } as any)}
                className={`
                  p-4 border-2 rounded-lg text-left transition
                  ${actionType === type.type
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <Icon className={`w-6 h-6 mb-2 ${actionType === type.type ? 'text-teal-600' : 'text-gray-500'}`} />
                <div className="font-medium text-gray-900 text-sm">{type.label}</div>
                <div className="text-xs text-gray-500 mt-1">{type.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Configuration */}
      <div className="border-t border-gray-200 pt-6">
        {actionType === 'ai-prompt' && (
          <AIPromptConfig
            action={data.action as any}
            onChange={updateAction}
          />
        )}

        {actionType === 'send-email' && (
          <EmailConfig
            action={data.action as any}
            onChange={updateAction}
          />
        )}

        {actionType === 'webhook' && (
          <WebhookConfig
            action={data.action as any}
            onChange={updateAction}
          />
        )}

        {actionType === 'run-code' && (
          <CodeConfig
            action={data.action as any}
            onChange={updateAction}
          />
        )}

        {actionType === 'generate-report' && (
          <ReportConfig
            action={data.action as any}
            onChange={updateAction}
          />
        )}

        {actionType === 'web-scrape' && (
          <ScrapeConfig
            action={data.action as any}
            onChange={updateAction}
          />
        )}
      </div>
    </div>
  );
}

// Action Configuration Components
function AIPromptConfig({ action, onChange }: { action: any; onChange: (a: any) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Prompt <span className="text-red-500">*</span>
        </label>
        <textarea
          value={action?.prompt || ''}
          onChange={(e) => onChange({ ...action, type: 'ai-prompt', prompt: e.target.value })}
          placeholder="Enter your prompt for Claude..."
          rows={6}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition font-mono text-sm resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Model
          </label>
          <select
            value={action?.model || 'claude-3-opus'}
            onChange={(e) => onChange({ ...action, type: 'ai-prompt', model: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
          >
            <option value="claude-3-opus">Claude 3 Opus</option>
            <option value="claude-3-sonnet">Claude 3 Sonnet</option>
            <option value="claude-3-haiku">Claude 3 Haiku</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Persona
          </label>
          <select
            value={action?.persona || ''}
            onChange={(e) => onChange({ ...action, type: 'ai-prompt', persona: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
          >
            <option value="">Default</option>
            <option value="analyst">Data Analyst</option>
            <option value="writer">Content Writer</option>
            <option value="coder">Code Assistant</option>
            <option value="researcher">Researcher</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          System Prompt (Optional)
        </label>
        <textarea
          value={action?.systemPrompt || ''}
          onChange={(e) => onChange({ ...action, type: 'ai-prompt', systemPrompt: e.target.value })}
          placeholder="Custom system prompt..."
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition text-sm resize-none"
        />
      </div>
    </div>
  );
}

function EmailConfig({ action, onChange }: { action: any; onChange: (a: any) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          To <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          value={action?.to || ''}
          onChange={(e) => onChange({ ...action, type: 'send-email', to: e.target.value })}
          placeholder="recipient@example.com"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Subject <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={action?.subject || ''}
          onChange={(e) => onChange({ ...action, type: 'send-email', subject: e.target.value })}
          placeholder="Email subject"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Body <span className="text-red-500">*</span>
        </label>
        <textarea
          value={action?.body || ''}
          onChange={(e) => onChange({ ...action, type: 'send-email', body: e.target.value })}
          placeholder="Email body..."
          rows={6}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition resize-none"
        />
      </div>
    </div>
  );
}

function WebhookConfig({ action, onChange }: { action: any; onChange: (a: any) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          URL <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          value={action?.url || ''}
          onChange={(e) => onChange({ ...action, type: 'webhook', url: e.target.value })}
          placeholder="https://api.example.com/webhook"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Method
        </label>
        <select
          value={action?.method || 'POST'}
          onChange={(e) => onChange({ ...action, type: 'webhook', method: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Body (JSON)
        </label>
        <textarea
          value={action?.body ? JSON.stringify(action.body, null, 2) : ''}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              onChange({ ...action, type: 'webhook', body: parsed });
            } catch {
              // Invalid JSON, keep the text
            }
          }}
          placeholder='{ "key": "value" }'
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition font-mono text-sm resize-none"
        />
      </div>
    </div>
  );
}

function CodeConfig({ action, onChange }: { action: any; onChange: (a: any) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Language
        </label>
        <select
          value={action?.language || 'python'}
          onChange={(e) => onChange({ ...action, type: 'run-code', language: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
        >
          <option value="python">Python</option>
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Code <span className="text-red-500">*</span>
        </label>
        <textarea
          value={action?.code || ''}
          onChange={(e) => onChange({ ...action, type: 'run-code', code: e.target.value })}
          placeholder="# Your code here..."
          rows={10}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition font-mono text-sm resize-none"
        />
      </div>
    </div>
  );
}

function ReportConfig({ action, onChange }: { action: any; onChange: (a: any) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Report Type
        </label>
        <select
          value={action?.reportType || 'summary'}
          onChange={(e) => onChange({ ...action, type: 'generate-report', reportType: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
        >
          <option value="summary">Summary</option>
          <option value="detailed">Detailed</option>
          <option value="analytics">Analytics</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Output Format
        </label>
        <select
          value={action?.format || 'pdf'}
          onChange={(e) => onChange({ ...action, type: 'generate-report', format: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
        >
          <option value="pdf">PDF</option>
          <option value="html">HTML</option>
          <option value="markdown">Markdown</option>
          <option value="json">JSON</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Data Source
        </label>
        <input
          type="text"
          value={action?.dataSource || ''}
          onChange={(e) => onChange({ ...action, type: 'generate-report', dataSource: e.target.value })}
          placeholder="e.g., /data/analytics or API endpoint"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
        />
      </div>
    </div>
  );
}

function ScrapeConfig({ action, onChange }: { action: any; onChange: (a: any) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          URL <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          value={action?.url || ''}
          onChange={(e) => onChange({ ...action, type: 'web-scrape', url: e.target.value })}
          placeholder="https://example.com/page"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          CSS Selector (Optional)
        </label>
        <input
          type="text"
          value={action?.selector || ''}
          onChange={(e) => onChange({ ...action, type: 'web-scrape', selector: e.target.value })}
          placeholder=".article-content, #main-text"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition font-mono text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Extract Type
        </label>
        <select
          value={action?.extractType || 'text'}
          onChange={(e) => onChange({ ...action, type: 'web-scrape', extractType: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
        >
          <option value="text">Text</option>
          <option value="html">HTML</option>
          <option value="links">Links</option>
          <option value="images">Images</option>
          <option value="structured">Structured Data</option>
        </select>
      </div>
    </div>
  );
}

// ============================================================================
// Options Step
// ============================================================================

interface OptionsStepProps {
  data: Partial<CreateTaskInput>;
  onChange: (data: Partial<CreateTaskInput>) => void;
}

function OptionsStep({ data, onChange }: OptionsStepProps) {
  const toggleRetryPolicy = (enabled: boolean) => {
    onChange({
      ...data,
      retryPolicy: enabled ? { maxRetries: 3, backoffMs: 60000 } : undefined,
    });
  };

  const toggleNotification = (enabled: boolean) => {
    onChange({
      ...data,
      notification: enabled
        ? { onSuccess: false, onFailure: true, channels: ['email'] }
        : undefined,
    });
  };

  return (
    <div className="space-y-8">
      {/* Retry Policy */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              Retry on Failure
            </h4>
            <p className="text-sm text-gray-600">Automatically retry the task if it fails</p>
          </div>
          <button
            onClick={() => toggleRetryPolicy(!data.retryPolicy)}
            className={`
              relative w-12 h-6 rounded-full transition
              ${data.retryPolicy ? 'bg-teal-500' : 'bg-gray-200'}
            `}
          >
            <span
              className={`
                absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform
                ${data.retryPolicy ? 'translate-x-7' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        {data.retryPolicy && (
          <div className="ml-7 space-y-4 bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Retries
                </label>
                <input
                  type="number"
                  value={data.retryPolicy.maxRetries}
                  onChange={(e) => onChange({
                    ...data,
                    retryPolicy: { ...data.retryPolicy!, maxRetries: parseInt(e.target.value) || 1 },
                  })}
                  min="1"
                  max="10"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Backoff (seconds)
                </label>
                <input
                  type="number"
                  value={(data.retryPolicy.backoffMs || 60000) / 1000}
                  onChange={(e) => onChange({
                    ...data,
                    retryPolicy: { ...data.retryPolicy!, backoffMs: (parseInt(e.target.value) || 60) * 1000 },
                  })}
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
            </h4>
            <p className="text-sm text-gray-600">Get notified about task execution</p>
          </div>
          <button
            onClick={() => toggleNotification(!data.notification)}
            className={`
              relative w-12 h-6 rounded-full transition
              ${data.notification ? 'bg-teal-500' : 'bg-gray-200'}
            `}
          >
            <span
              className={`
                absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform
                ${data.notification ? 'translate-x-7' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        {data.notification && (
          <div className="ml-7 space-y-4 bg-gray-50 rounded-lg p-4">
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.notification.onSuccess}
                  onChange={(e) => onChange({
                    ...data,
                    notification: { ...data.notification!, onSuccess: e.target.checked },
                  })}
                  className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                />
                <span className="text-sm text-gray-700">Notify on success</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.notification.onFailure}
                  onChange={(e) => onChange({
                    ...data,
                    notification: { ...data.notification!, onFailure: e.target.checked },
                  })}
                  className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                />
                <span className="text-sm text-gray-700">Notify on failure</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notification Channels
              </label>
              <div className="flex flex-wrap gap-2">
                {(['email', 'push', 'slack', 'webhook'] as const).map(channel => (
                  <button
                    key={channel}
                    onClick={() => {
                      const channels = data.notification!.channels || [];
                      const newChannels = channels.includes(channel)
                        ? channels.filter(c => c !== channel)
                        : [...channels, channel];
                      onChange({
                        ...data,
                        notification: { ...data.notification!, channels: newChannels },
                      });
                    }}
                    className={`
                      px-3 py-1.5 text-sm rounded-full border transition capitalize
                      ${data.notification!.channels?.includes(channel)
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-gray-300 text-gray-600 hover:border-gray-400'
                      }
                    `}
                  >
                    {channel}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Timeout */}
      <div>
        <h4 className="font-medium text-gray-900 flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5" />
          Timeout
        </h4>
        <div className="ml-7">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maximum execution time (seconds)
          </label>
          <input
            type="number"
            value={(data.timeout || 300000) / 1000}
            onChange={(e) => onChange({
              ...data,
              timeout: (parseInt(e.target.value) || 300) * 1000,
            })}
            min="1"
            className="w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
          />
          <p className="text-xs text-gray-500 mt-1">
            Task will be cancelled if it exceeds this duration
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function TaskCreator({
  onClose,
  onCreate,
  initialData,
  isEditing = false,
}: TaskCreatorProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [taskData, setTaskData] = useState<Partial<CreateTaskInput>>({
    name: '',
    type: 'one-time',
    action: { type: 'ai-prompt', prompt: '' },
    priority: 'normal',
    ...initialData,
  });

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 0: // Basic Info
        return taskData.name && taskData.type;
      case 1: // Schedule
        if (taskData.type === 'trigger') return true;
        if (taskData.type === 'one-time') return (taskData.schedule as any)?.runAt;
        if (taskData.type === 'recurring') return (taskData.schedule as any)?.expression;
        return false;
      case 2: // Action
        if (!taskData.action?.type) return false;
        if (taskData.action.type === 'ai-prompt') return (taskData.action as any).prompt;
        if (taskData.action.type === 'send-email') {
          const action = taskData.action as any;
          return action.to && action.subject && action.body;
        }
        if (taskData.action.type === 'webhook') return (taskData.action as any).url;
        if (taskData.action.type === 'run-code') return (taskData.action as any).code;
        return true;
      case 3: // Options
        return true;
      default:
        return false;
    }
  }, [currentStep, taskData]);

  const handleNext = () => {
    if (canProceed && currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!canProceed) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onCreate(taskData as CreateTaskInput);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isEditing ? 'Edit Task' : 'Create Task'}
            </h2>
            <p className="text-sm text-gray-600">
              {WIZARD_STEPS[currentStep].description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <StepIndicator
            steps={WIZARD_STEPS}
            currentStep={currentStep}
            onStepClick={(step) => step < currentStep && setCurrentStep(step)}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-red-800">Error</h4>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {currentStep === 0 && (
            <BasicInfoStep data={taskData} onChange={setTaskData} />
          )}
          {currentStep === 1 && (
            <ScheduleStep data={taskData} onChange={setTaskData} />
          )}
          {currentStep === 2 && (
            <ActionStep data={taskData} onChange={setTaskData} />
          )}
          {currentStep === 3 && (
            <OptionsStep data={taskData} onChange={setTaskData} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={currentStep === 0 ? onClose : handleBack}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            {currentStep === 0 ? 'Cancel' : 'Back'}
          </button>

          {currentStep < WIZARD_STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed}
              className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canProceed || isSubmitting}
              className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {isEditing ? 'Save Changes' : 'Create Task'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default TaskCreator;
