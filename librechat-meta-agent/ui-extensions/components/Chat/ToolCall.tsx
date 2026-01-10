'use client';

import { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  Copy,
  Check,
  Search,
  FileText,
  Globe,
  Code2,
  Database,
  Terminal,
  FolderOpen,
  Edit3,
  Wrench,
  Zap,
  Brain,
  Image,
  MessageSquare,
  Calculator,
  Cpu,
} from 'lucide-react';
import clsx from 'clsx';

// ============================================================================
// Types
// ============================================================================

export type ToolStatus = 'pending' | 'running' | 'success' | 'error';

export interface ToolCallData {
  id: string;
  name: string;
  type?: string;
  status: ToolStatus;
  inputs: Record<string, any>;
  outputs?: Record<string, any> | string | null;
  error?: string;
  startTime?: number;
  endTime?: number;
  duration?: number;
}

interface ToolCallProps {
  tool: ToolCallData;
  defaultExpanded?: boolean;
  className?: string;
}

// ============================================================================
// Tool Icon Mapping
// ============================================================================

const TOOL_ICONS: Record<string, { icon: typeof Search; color: string }> = {
  // Search/Research tools
  web_search: { icon: Globe, color: 'text-blue-500' },
  search: { icon: Search, color: 'text-blue-500' },
  brave_search: { icon: Globe, color: 'text-orange-500' },
  google_search: { icon: Globe, color: 'text-blue-500' },

  // File tools
  read: { icon: FileText, color: 'text-teal-500' },
  read_file: { icon: FileText, color: 'text-teal-500' },
  write: { icon: Edit3, color: 'text-purple-500' },
  write_file: { icon: Edit3, color: 'text-purple-500' },
  edit: { icon: Edit3, color: 'text-purple-500' },
  edit_file: { icon: Edit3, color: 'text-purple-500' },
  glob: { icon: FolderOpen, color: 'text-amber-500' },
  grep: { icon: Search, color: 'text-green-500' },

  // Code tools
  code: { icon: Code2, color: 'text-green-500' },
  code_executor: { icon: Code2, color: 'text-green-500' },
  code_interpreter: { icon: Code2, color: 'text-green-500' },
  bash: { icon: Terminal, color: 'text-stone-500' },
  terminal: { icon: Terminal, color: 'text-stone-500' },

  // Database tools
  database: { icon: Database, color: 'text-indigo-500' },
  sql: { icon: Database, color: 'text-indigo-500' },
  supabase: { icon: Database, color: 'text-emerald-500' },

  // AI tools
  thinking: { icon: Brain, color: 'text-purple-500' },
  reasoning: { icon: Brain, color: 'text-purple-500' },

  // Image tools
  image_gen: { icon: Image, color: 'text-pink-500' },
  create_image: { icon: Image, color: 'text-pink-500' },

  // Math tools
  calculator: { icon: Calculator, color: 'text-cyan-500' },
  math: { icon: Calculator, color: 'text-cyan-500' },

  // Computer use
  computer: { icon: Cpu, color: 'text-orange-500' },
  computer_use: { icon: Cpu, color: 'text-orange-500' },

  // Chat/MCP tools
  mcp: { icon: Zap, color: 'text-amber-500' },
  message: { icon: MessageSquare, color: 'text-blue-500' },

  // Default
  default: { icon: Wrench, color: 'text-stone-500' },
};

function getToolIcon(toolName: string): { icon: typeof Search; color: string } {
  const normalizedName = toolName.toLowerCase().replace(/[_-]/g, '_');

  // Check for exact match
  if (TOOL_ICONS[normalizedName]) {
    return TOOL_ICONS[normalizedName];
  }

  // Check for partial matches
  for (const [key, value] of Object.entries(TOOL_ICONS)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return value;
    }
  }

  // Check for MCP tools (usually prefixed with mcp__)
  if (normalizedName.startsWith('mcp__')) {
    return TOOL_ICONS.mcp;
  }

  return TOOL_ICONS.default;
}

// ============================================================================
// Status Badge Component
// ============================================================================

function StatusBadge({ status }: { status: ToolStatus }) {
  const configs: Record<ToolStatus, { icon: typeof Clock; label: string; className: string; animate?: boolean }> = {
    pending: {
      icon: Clock,
      label: 'Pending',
      className: 'bg-stone-100 text-stone-500 border-stone-200',
    },
    running: {
      icon: Loader2,
      label: 'Running',
      className: 'bg-blue-50 text-blue-600 border-blue-200',
      animate: true,
    },
    success: {
      icon: CheckCircle,
      label: 'Success',
      className: 'bg-green-50 text-green-600 border-green-200',
    },
    error: {
      icon: XCircle,
      label: 'Error',
      className: 'bg-red-50 text-red-600 border-red-200',
    },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border',
        config.className
      )}
    >
      <Icon
        className={clsx(
          'w-3.5 h-3.5',
          config.animate && 'animate-spin'
        )}
      />
      {config.label}
    </span>
  );
}

// ============================================================================
// Duration Timer Component
// ============================================================================

function DurationTimer({
  startTime,
  endTime,
  isRunning,
}: {
  startTime?: number;
  endTime?: number;
  isRunning: boolean;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) return;

    if (endTime) {
      setElapsed(endTime - startTime);
      return;
    }

    if (isRunning) {
      const interval = setInterval(() => {
        setElapsed(Date.now() - startTime);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [startTime, endTime, isRunning]);

  if (!startTime) return null;

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  return (
    <span className="inline-flex items-center gap-1 text-xs text-stone-400">
      <Clock className="w-3 h-3" />
      {formatDuration(elapsed)}
    </span>
  );
}

// ============================================================================
// Main ToolCall Component
// ============================================================================

export function ToolCall({ tool, defaultExpanded = false, className }: ToolCallProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  const { icon: ToolIcon, color: iconColor } = getToolIcon(tool.name);
  const isRunning = tool.status === 'running';

  const copyToolData = async () => {
    const data = {
      name: tool.name,
      inputs: tool.inputs,
      outputs: tool.outputs,
      error: tool.error,
      duration: tool.duration,
    };
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Format tool name for display
  const displayName = tool.name
    .replace(/^mcp__\w+__/, '') // Remove MCP prefix
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <div
      className={clsx(
        'border rounded-xl bg-white dark:bg-stone-800 overflow-hidden transition-all duration-200',
        tool.status === 'error'
          ? 'border-red-200 dark:border-red-800'
          : tool.status === 'success'
          ? 'border-green-200 dark:border-green-800'
          : tool.status === 'running'
          ? 'border-blue-200 dark:border-blue-800'
          : 'border-stone-200 dark:border-stone-700',
        isExpanded && 'shadow-sm',
        className
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors"
      >
        {/* Expand/Collapse Icon */}
        <span className="text-stone-400">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </span>

        {/* Tool Icon */}
        <div
          className={clsx(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            tool.status === 'running'
              ? 'bg-blue-100 dark:bg-blue-900/30'
              : 'bg-stone-100 dark:bg-stone-700'
          )}
        >
          <ToolIcon
            className={clsx(
              'w-4 h-4',
              tool.status === 'running' ? 'text-blue-500' : iconColor
            )}
          />
        </div>

        {/* Tool Name */}
        <div className="flex-1 text-left">
          <span className="font-medium text-stone-900 dark:text-white text-sm">
            {displayName}
          </span>
        </div>

        {/* Duration */}
        <DurationTimer
          startTime={tool.startTime}
          endTime={tool.endTime}
          isRunning={isRunning}
        />

        {/* Status Badge */}
        <StatusBadge status={tool.status} />
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-stone-200 dark:border-stone-700">
          {/* Inputs Section */}
          <div className="p-4 border-b border-stone-100 dark:border-stone-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                Inputs
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  copyToolData();
                }}
                className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors"
                title="Copy tool data"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-stone-400" />
                )}
              </button>
            </div>
            <div className="bg-stone-50 dark:bg-stone-900/50 rounded-lg p-3 overflow-x-auto">
              <pre className="text-xs font-mono text-stone-700 dark:text-stone-300 whitespace-pre-wrap break-words">
                {JSON.stringify(tool.inputs, null, 2)}
              </pre>
            </div>
          </div>

          {/* Output/Error Section */}
          {(tool.outputs !== undefined || tool.error) && (
            <div className="p-4">
              <span
                className={clsx(
                  'text-xs font-medium uppercase tracking-wide',
                  tool.error ? 'text-red-500' : 'text-stone-500'
                )}
              >
                {tool.error ? 'Error' : 'Output'}
              </span>
              <div
                className={clsx(
                  'mt-2 rounded-lg p-3 overflow-x-auto',
                  tool.error
                    ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    : 'bg-stone-50 dark:bg-stone-900/50'
                )}
              >
                <pre
                  className={clsx(
                    'text-xs font-mono whitespace-pre-wrap break-words',
                    tool.error
                      ? 'text-red-700 dark:text-red-300'
                      : 'text-stone-700 dark:text-stone-300'
                  )}
                >
                  {tool.error ||
                    (typeof tool.outputs === 'string'
                      ? tool.outputs
                      : JSON.stringify(tool.outputs, null, 2))}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ToolCall;
