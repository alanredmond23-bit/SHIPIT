'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  X,
  Play,
  Loader2,
  Copy,
  Check,
  Clock,
  AlertCircle,
  CheckCircle,
  Code2,
  FileJson,
  Wrench,
  ChevronDown,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import clsx from 'clsx';
import type { MCPServerWithTools, MCPTool } from '@/hooks/useMCPServers';

// ============================================================================
// Types
// ============================================================================

interface MCPToolTesterProps {
  tool: MCPTool;
  server: MCPServerWithTools;
  onClose: () => void;
}

interface FieldConfig {
  name: string;
  type: string;
  description?: string;
  required: boolean;
  default?: unknown;
  enum?: string[];
  items?: { type: string };
}

interface ExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  duration: number;
  timestamp: Date;
}

// ============================================================================
// JSON Schema Parser
// ============================================================================

function parseJsonSchema(schema: Record<string, unknown>): FieldConfig[] {
  const properties = (schema.properties || {}) as Record<string, Record<string, unknown>>;
  const required = (schema.required || []) as string[];

  return Object.entries(properties).map(([name, prop]) => ({
    name,
    type: prop.type as string || 'string',
    description: prop.description as string | undefined,
    required: required.includes(name),
    default: prop.default,
    enum: prop.enum as string[] | undefined,
    items: prop.items as { type: string } | undefined,
  }));
}

// ============================================================================
// Form Field Component
// ============================================================================

function FormField({
  field,
  value,
  onChange,
}: {
  field: FieldConfig;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const renderInput = () => {
    // Enum/Select field
    if (field.enum) {
      return (
        <select
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
        >
          <option value="">Select...</option>
          {field.enum.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    // Boolean field
    if (field.type === 'boolean') {
      return (
        <button
          type="button"
          onClick={() => onChange(!value)}
          className={clsx(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            value
              ? 'bg-teal-100 text-teal-700'
              : 'bg-stone-100 text-stone-600'
          )}
        >
          {value ? 'true' : 'false'}
        </button>
      );
    }

    // Number field
    if (field.type === 'number' || field.type === 'integer') {
      return (
        <input
          type="number"
          value={value as number || ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
          placeholder={field.default !== undefined ? String(field.default) : ''}
          className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
        />
      );
    }

    // Array field
    if (field.type === 'array') {
      return (
        <textarea
          value={Array.isArray(value) ? JSON.stringify(value, null, 2) : '[]'}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value));
            } catch {
              // Keep the raw string if not valid JSON
            }
          }}
          placeholder="[]"
          rows={3}
          className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 font-mono text-sm"
        />
      );
    }

    // Object field
    if (field.type === 'object') {
      return (
        <textarea
          value={typeof value === 'object' ? JSON.stringify(value, null, 2) : '{}'}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value));
            } catch {
              // Keep the raw string if not valid JSON
            }
          }}
          placeholder="{}"
          rows={4}
          className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 font-mono text-sm"
        />
      );
    }

    // Default: string field
    return (
      <input
        type="text"
        value={String(value || '')}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder={field.default !== undefined ? String(field.default) : ''}
        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
      />
    );
  };

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2">
        <span className="text-sm font-medium text-stone-700">{field.name}</span>
        {field.required && (
          <span className="text-xs text-red-500 font-medium">*</span>
        )}
        <span className="text-xs text-stone-400 font-mono">{field.type}</span>
      </label>
      {field.description && (
        <p className="text-xs text-stone-500">{field.description}</p>
      )}
      {renderInput()}
    </div>
  );
}

// ============================================================================
// Result Display Component
// ============================================================================

function ResultDisplay({ result }: { result: ExecutionResult }) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const resultString = useMemo(() => {
    if (result.error) return result.error;
    return JSON.stringify(result.data, null, 2);
  }, [result]);

  const copyResult = async () => {
    await navigator.clipboard.writeText(resultString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {result.success ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Success</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Error</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-stone-400 text-xs">
            <Clock className="w-3.5 h-3.5" />
            {result.duration}ms
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyResult}
            className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors"
            title="Copy result"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4 text-stone-400" />
            )}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-stone-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-stone-400" />
            )}
          </button>
        </div>
      </div>

      {/* Result Content */}
      {isExpanded && (
        <div
          className={clsx(
            'rounded-xl border overflow-hidden',
            result.success
              ? 'bg-stone-50 border-stone-200'
              : 'bg-red-50 border-red-200'
          )}
        >
          <div className="flex items-center gap-2 px-4 py-2 border-b border-stone-200 bg-white/50">
            {result.success ? (
              <Code2 className="w-4 h-4 text-stone-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">
              {result.success ? 'Output' : 'Error'}
            </span>
          </div>
          <pre
            className={clsx(
              'p-4 text-sm font-mono overflow-x-auto max-h-80',
              result.success ? 'text-stone-700' : 'text-red-700'
            )}
          >
            {resultString}
          </pre>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MCPToolTester Component
// ============================================================================

export function MCPToolTester({ tool, server, onClose }: MCPToolTesterProps) {
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [showSchema, setShowSchema] = useState(false);

  // Parse input schema
  const fields = useMemo(() => {
    if (!tool.inputSchema) return [];
    return parseJsonSchema(tool.inputSchema);
  }, [tool.inputSchema]);

  // Handle field change
  const handleFieldChange = useCallback((name: string, value: unknown) => {
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  // Reset form
  const resetForm = useCallback(() => {
    setFormValues({});
    setResult(null);
  }, []);

  // Execute tool
  const executeTool = async () => {
    setIsExecuting(true);
    const startTime = Date.now();

    try {
      // Simulate tool execution
      // In production, this would call the actual MCP server
      await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));

      // Simulate a response
      const mockResponse = {
        toolName: tool.name,
        input: formValues,
        output: {
          message: `Successfully executed ${tool.name}`,
          timestamp: new Date().toISOString(),
          // Add some mock data based on tool type
          ...(tool.name.includes('search') && {
            results: [
              { title: 'Result 1', url: 'https://example.com/1' },
              { title: 'Result 2', url: 'https://example.com/2' },
            ],
          }),
          ...(tool.name.includes('read') && {
            content: 'File contents would appear here...',
          }),
        },
      };

      setResult({
        success: true,
        data: mockResponse,
        duration: Date.now() - startTime,
        timestamp: new Date(),
      });
    } catch (err) {
      setResult({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error occurred',
        duration: Date.now() - startTime,
        timestamp: new Date(),
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Check if form is valid
  const isFormValid = useMemo(() => {
    return fields
      .filter((f) => f.required)
      .every((f) => formValues[f.name] !== undefined && formValues[f.name] !== '');
  }, [fields, formValues]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-xl bg-white rounded-2xl shadow-2xl z-[60] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-stone-200">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-teal-100 rounded-xl">
              <Wrench className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-900">Test Tool</h2>
              <p className="text-sm text-stone-500 mt-0.5">{tool.name}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Tool Description */}
          <div className="mb-6">
            <p className="text-sm text-stone-600">{tool.description}</p>
            <div className="flex items-center gap-2 mt-2 text-xs text-stone-400">
              <span>Server: {server.name}</span>
              {server.status === 'running' ? (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="w-3 h-3" />
                  Connected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-600">
                  <AlertCircle className="w-3 h-3" />
                  Not connected
                </span>
              )}
            </div>
          </div>

          {/* Schema Toggle */}
          <button
            onClick={() => setShowSchema(!showSchema)}
            className="flex items-center gap-2 mb-4 text-sm text-stone-500 hover:text-stone-700"
          >
            {showSchema ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <FileJson className="w-4 h-4" />
            <span>View Input Schema</span>
          </button>

          {showSchema && tool.inputSchema && (
            <div className="mb-6 bg-stone-50 rounded-xl p-4">
              <pre className="text-xs font-mono text-stone-700 overflow-x-auto">
                {JSON.stringify(tool.inputSchema, null, 2)}
              </pre>
            </div>
          )}

          {/* Input Form */}
          {fields.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-stone-700">Input Parameters</h3>
                <button
                  onClick={resetForm}
                  className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-700"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              </div>

              {fields.map((field) => (
                <FormField
                  key={field.name}
                  field={field}
                  value={formValues[field.name]}
                  onChange={(value) => handleFieldChange(field.name, value)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-stone-50 rounded-xl">
              <FileJson className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <p className="text-stone-500 text-sm">No input parameters required</p>
            </div>
          )}

          {/* Result */}
          {result && <ResultDisplay result={result} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-stone-200 bg-stone-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-stone-600 hover:text-stone-800 text-sm font-medium transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={executeTool}
            disabled={isExecuting || !isFormValid || server.status !== 'running'}
            className={clsx(
              'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-colors',
              isExecuting || !isFormValid || server.status !== 'running'
                ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                : 'bg-teal-500 text-white hover:bg-teal-600'
            )}
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Execute
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

export default MCPToolTester;
