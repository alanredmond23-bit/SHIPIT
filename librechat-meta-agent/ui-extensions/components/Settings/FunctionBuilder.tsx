'use client';

import React, { useState, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Play,
  Save,
  Code,
  Webhook,
  Server,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Check,
  X,
  Loader2,
  Copy,
  GripVertical,
  Settings,
  FileJson,
  Zap,
  ArrowRight,
  Terminal,
  RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';

/**
 * FunctionBuilder - Visual builder for custom agent functions
 *
 * Features:
 * - Visual schema builder
 * - Parameter type selector (string, number, boolean, array, object)
 * - Required/optional toggles
 * - Description fields
 * - Handler type selector (webhook, code, mcp)
 * - Test function panel with input/output
 */

// Parameter types
type ParameterType = 'string' | 'number' | 'boolean' | 'array' | 'object';

interface FunctionParameter {
  id: string;
  name: string;
  type: ParameterType;
  description: string;
  required: boolean;
  default?: any;
  enum?: string[];
  items?: { type: ParameterType };
  properties?: FunctionParameter[];
}

interface FunctionDefinition {
  name: string;
  description: string;
  parameters: FunctionParameter[];
  handler: {
    type: 'webhook' | 'code' | 'mcp';
    config: {
      url?: string;
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      headers?: Record<string, string>;
      code?: string;
      mcpServer?: string;
      mcpTool?: string;
    };
  };
}

interface TestResult {
  success: boolean;
  output: any;
  duration: number;
  error?: string;
}

interface FunctionBuilderProps {
  initialFunction?: FunctionDefinition;
  onSave?: (fn: FunctionDefinition) => Promise<void>;
  onTest?: (fn: FunctionDefinition, input: Record<string, any>) => Promise<TestResult>;
  availableMCPs?: { id: string; name: string; tools: string[] }[];
}

// Default function definition
const DEFAULT_FUNCTION: FunctionDefinition = {
  name: '',
  description: '',
  parameters: [],
  handler: {
    type: 'webhook',
    config: {
      url: '',
      method: 'POST',
      headers: {},
    },
  },
};

// Parameter type options
const PARAMETER_TYPES: { value: ParameterType; label: string; description: string }[] = [
  { value: 'string', label: 'String', description: 'Text value' },
  { value: 'number', label: 'Number', description: 'Numeric value' },
  { value: 'boolean', label: 'Boolean', description: 'True or false' },
  { value: 'array', label: 'Array', description: 'List of items' },
  { value: 'object', label: 'Object', description: 'Nested properties' },
];

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

export default function FunctionBuilder({
  initialFunction = DEFAULT_FUNCTION,
  onSave,
  onTest,
  availableMCPs = [],
}: FunctionBuilderProps) {
  // State
  const [fn, setFn] = useState<FunctionDefinition>(initialFunction);
  const [expandedParams, setExpandedParams] = useState<Set<string>>(new Set());
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [testInput, setTestInput] = useState<Record<string, any>>({});
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  // Update function field
  const updateFn = (updates: Partial<FunctionDefinition>) => {
    setFn((prev) => ({ ...prev, ...updates }));
  };

  // Update handler config
  const updateHandlerConfig = (updates: Partial<FunctionDefinition['handler']['config']>) => {
    setFn((prev) => ({
      ...prev,
      handler: {
        ...prev.handler,
        config: { ...prev.handler.config, ...updates },
      },
    }));
  };

  // Add parameter
  const addParameter = (parentId?: string) => {
    const newParam: FunctionParameter = {
      id: generateId(),
      name: '',
      type: 'string',
      description: '',
      required: false,
    };

    if (parentId) {
      // Add as nested property
      setFn((prev) => ({
        ...prev,
        parameters: prev.parameters.map((p) => {
          if (p.id === parentId) {
            return {
              ...p,
              properties: [...(p.properties || []), newParam],
            };
          }
          return p;
        }),
      }));
    } else {
      // Add as top-level parameter
      setFn((prev) => ({
        ...prev,
        parameters: [...prev.parameters, newParam],
      }));
    }

    // Auto-expand new parameter
    setExpandedParams((prev) => new Set(prev).add(newParam.id));
  };

  // Update parameter
  const updateParameter = (
    paramId: string,
    updates: Partial<FunctionParameter>,
    parentId?: string
  ) => {
    setFn((prev) => ({
      ...prev,
      parameters: prev.parameters.map((p) => {
        if (parentId) {
          if (p.id === parentId) {
            return {
              ...p,
              properties: (p.properties || []).map((nested) =>
                nested.id === paramId ? { ...nested, ...updates } : nested
              ),
            };
          }
          return p;
        }
        return p.id === paramId ? { ...p, ...updates } : p;
      }),
    }));
  };

  // Remove parameter
  const removeParameter = (paramId: string, parentId?: string) => {
    setFn((prev) => ({
      ...prev,
      parameters: parentId
        ? prev.parameters.map((p) =>
            p.id === parentId
              ? { ...p, properties: (p.properties || []).filter((np) => np.id !== paramId) }
              : p
          )
        : prev.parameters.filter((p) => p.id !== paramId),
    }));
  };

  // Toggle parameter expansion
  const toggleExpanded = (paramId: string) => {
    setExpandedParams((prev) => {
      const next = new Set(prev);
      if (next.has(paramId)) {
        next.delete(paramId);
      } else {
        next.add(paramId);
      }
      return next;
    });
  };

  // Validate function
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fn.name.trim()) {
      newErrors.name = 'Function name is required';
    } else if (!/^[a-z_][a-z0-9_]*$/i.test(fn.name)) {
      newErrors.name = 'Name must start with letter/underscore and contain only alphanumeric/underscore';
    }

    if (!fn.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (fn.handler.type === 'webhook' && !fn.handler.config.url?.trim()) {
      newErrors.url = 'Webhook URL is required';
    }

    if (fn.handler.type === 'code' && !fn.handler.config.code?.trim()) {
      newErrors.code = 'Handler code is required';
    }

    if (fn.handler.type === 'mcp') {
      if (!fn.handler.config.mcpServer) {
        newErrors.mcpServer = 'MCP server is required';
      }
      if (!fn.handler.config.mcpTool) {
        newErrors.mcpTool = 'MCP tool is required';
      }
    }

    // Validate parameters
    fn.parameters.forEach((param) => {
      if (!param.name.trim()) {
        newErrors[`param_${param.id}_name`] = 'Parameter name is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      await onSave?.(fn);
    } finally {
      setSaving(false);
    }
  };

  // Handle test
  const handleTest = async () => {
    if (!validate()) return;

    setTesting(true);
    setTestResult(null);
    try {
      const result = await onTest?.(fn, testInput);
      setTestResult(result || { success: true, output: { message: 'Test completed' }, duration: 100 });
    } catch (e: any) {
      setTestResult({
        success: false,
        output: null,
        duration: 0,
        error: e.message || 'Test failed',
      });
    } finally {
      setTesting(false);
    }
  };

  // Generate schema JSON
  const generateSchema = () => {
    const buildParamSchema = (param: FunctionParameter): any => {
      const schema: any = {
        type: param.type,
        description: param.description,
      };

      if (param.default !== undefined) {
        schema.default = param.default;
      }

      if (param.enum?.length) {
        schema.enum = param.enum;
      }

      if (param.type === 'array' && param.items) {
        schema.items = { type: param.items.type };
      }

      if (param.type === 'object' && param.properties?.length) {
        schema.properties = {};
        const required: string[] = [];
        param.properties.forEach((p) => {
          schema.properties[p.name] = buildParamSchema(p);
          if (p.required) required.push(p.name);
        });
        if (required.length) schema.required = required;
      }

      return schema;
    };

    const schema = {
      name: fn.name,
      description: fn.description,
      parameters: {
        type: 'object',
        properties: {} as Record<string, any>,
        required: [] as string[],
      },
    };

    fn.parameters.forEach((param) => {
      schema.parameters.properties[param.name] = buildParamSchema(param);
      if (param.required) {
        schema.parameters.required.push(param.name);
      }
    });

    return schema;
  };

  // Copy schema to clipboard
  const handleCopySchema = async () => {
    const schema = generateSchema();
    await navigator.clipboard.writeText(JSON.stringify(schema, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Render parameter card
  const renderParameter = (param: FunctionParameter, parentId?: string, depth = 0) => {
    const isExpanded = expandedParams.has(param.id);
    const nameError = errors[`param_${param.id}_name`];

    return (
      <div
        key={param.id}
        className={clsx(
          'border rounded-lg overflow-hidden',
          depth > 0 ? 'border-warm-200 bg-warm-50/50' : 'border-warm-200 bg-white'
        )}
      >
        {/* Parameter Header */}
        <div className="flex items-center gap-3 p-3 bg-warm-50/50">
          <button className="cursor-grab text-warm-400 hover:text-warm-600">
            <GripVertical className="w-4 h-4" />
          </button>

          <button
            onClick={() => toggleExpanded(param.id)}
            className="p-1 rounded hover:bg-warm-200 text-warm-500 transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          <input
            type="text"
            value={param.name}
            onChange={(e) => updateParameter(param.id, { name: e.target.value }, parentId)}
            placeholder="parameter_name"
            className={clsx(
              'flex-1 px-3 py-1.5 rounded-lg border bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors',
              nameError ? 'border-error' : 'border-warm-200'
            )}
          />

          <select
            value={param.type}
            onChange={(e) =>
              updateParameter(param.id, { type: e.target.value as ParameterType }, parentId)
            }
            className="px-3 py-1.5 rounded-lg border border-warm-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            {PARAMETER_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={param.required}
              onChange={(e) =>
                updateParameter(param.id, { required: e.target.checked }, parentId)
              }
              className="w-4 h-4 rounded border-warm-300 text-teal-500 focus:ring-teal-500"
            />
            <span className="text-sm text-warm-600">Required</span>
          </label>

          <button
            onClick={() => removeParameter(param.id, parentId)}
            className="p-1.5 rounded-lg hover:bg-red-100 text-warm-400 hover:text-error transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Parameter Details */}
        {isExpanded && (
          <div className="p-4 space-y-4 border-t border-warm-100">
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-warm-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={param.description}
                onChange={(e) =>
                  updateParameter(param.id, { description: e.target.value }, parentId)
                }
                placeholder="Describe what this parameter does..."
                className="w-full px-3 py-2 rounded-lg border border-warm-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            {/* Default Value */}
            {param.type !== 'object' && (
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-1">
                  Default Value
                </label>
                <input
                  type={param.type === 'number' ? 'number' : 'text'}
                  value={param.default ?? ''}
                  onChange={(e) =>
                    updateParameter(
                      param.id,
                      {
                        default:
                          param.type === 'number'
                            ? parseFloat(e.target.value) || undefined
                            : param.type === 'boolean'
                            ? e.target.value === 'true'
                            : e.target.value || undefined,
                      },
                      parentId
                    )
                  }
                  placeholder={param.type === 'boolean' ? 'true or false' : 'Optional default value'}
                  className="w-full px-3 py-2 rounded-lg border border-warm-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
            )}

            {/* Enum Values (for string type) */}
            {param.type === 'string' && (
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-1">
                  Allowed Values (optional)
                </label>
                <input
                  type="text"
                  value={param.enum?.join(', ') ?? ''}
                  onChange={(e) =>
                    updateParameter(
                      param.id,
                      {
                        enum: e.target.value
                          ? e.target.value.split(',').map((s) => s.trim())
                          : undefined,
                      },
                      parentId
                    )
                  }
                  placeholder="value1, value2, value3"
                  className="w-full px-3 py-2 rounded-lg border border-warm-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
                <p className="text-xs text-warm-500 mt-1">Comma-separated list of allowed values</p>
              </div>
            )}

            {/* Array Items Type */}
            {param.type === 'array' && (
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-1">
                  Array Item Type
                </label>
                <select
                  value={param.items?.type ?? 'string'}
                  onChange={(e) =>
                    updateParameter(
                      param.id,
                      { items: { type: e.target.value as ParameterType } },
                      parentId
                    )
                  }
                  className="w-full px-3 py-2 rounded-lg border border-warm-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  {PARAMETER_TYPES.filter((t) => t.value !== 'object').map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Object Properties */}
            {param.type === 'object' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-warm-700">
                    Nested Properties
                  </label>
                  <button
                    onClick={() => addParameter(param.id)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-warm-100 hover:bg-warm-200 text-warm-700 text-sm transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Property
                  </button>
                </div>
                {param.properties && param.properties.length > 0 ? (
                  <div className="space-y-2 pl-4">
                    {param.properties.map((nested) =>
                      renderParameter(nested, param.id, depth + 1)
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-warm-500 italic">No nested properties defined</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-warm-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-warm-200 bg-warm-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-teal-100">
            <Zap className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-warm-900">Function Builder</h2>
            <p className="text-sm text-warm-500">Create custom agent functions</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopySchema}
            className={clsx(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              copied
                ? 'bg-success text-white'
                : 'bg-warm-100 hover:bg-warm-200 text-warm-700'
            )}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Schema'}
          </button>
          <button
            onClick={() => setShowTestPanel(!showTestPanel)}
            className={clsx(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              showTestPanel
                ? 'bg-teal-500 text-white'
                : 'bg-warm-100 hover:bg-warm-200 text-warm-700'
            )}
          >
            <Play className="w-4 h-4" />
            Test
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Builder */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-warm-900 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Basic Information
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-1">
                  Function Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={fn.name}
                  onChange={(e) => updateFn({ name: e.target.value })}
                  placeholder="get_weather"
                  className={clsx(
                    'w-full px-4 py-2.5 rounded-lg border bg-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors',
                    errors.name ? 'border-error' : 'border-warm-200'
                  )}
                />
                {errors.name && (
                  <p className="text-xs text-error mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-warm-700 mb-1">
                  Description <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={fn.description}
                  onChange={(e) => updateFn({ description: e.target.value })}
                  placeholder="Get current weather for a location"
                  className={clsx(
                    'w-full px-4 py-2.5 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors',
                    errors.description ? 'border-error' : 'border-warm-200'
                  )}
                />
                {errors.description && (
                  <p className="text-xs text-error mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Parameters */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-warm-900 flex items-center gap-2">
                <FileJson className="w-4 h-4" />
                Parameters
              </h3>
              <button
                onClick={() => addParameter()}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-100 hover:bg-teal-200 text-teal-700 text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Parameter
              </button>
            </div>

            {fn.parameters.length > 0 ? (
              <div className="space-y-3">
                {fn.parameters.map((param) => renderParameter(param))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-warm-200 rounded-lg p-8 text-center">
                <FileJson className="w-10 h-10 text-warm-300 mx-auto mb-3" />
                <p className="text-sm text-warm-500 mb-3">No parameters defined</p>
                <button
                  onClick={() => addParameter()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add First Parameter
                </button>
              </div>
            )}
          </div>

          {/* Handler */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-warm-900 flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              Handler Configuration
            </h3>

            {/* Handler Type Selector */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { type: 'webhook', icon: Webhook, label: 'Webhook', description: 'HTTP endpoint' },
                { type: 'code', icon: Code, label: 'Code', description: 'JavaScript handler' },
                { type: 'mcp', icon: Server, label: 'MCP', description: 'MCP server tool' },
              ].map(({ type, icon: Icon, label, description }) => (
                <button
                  key={type}
                  onClick={() =>
                    setFn((prev) => ({
                      ...prev,
                      handler: { ...prev.handler, type: type as any },
                    }))
                  }
                  className={clsx(
                    'flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-all',
                    fn.handler.type === type
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-warm-200 hover:border-warm-300'
                  )}
                >
                  <div
                    className={clsx(
                      'p-2 rounded-lg',
                      fn.handler.type === type ? 'bg-teal-100' : 'bg-warm-100'
                    )}
                  >
                    <Icon
                      className={clsx(
                        'w-5 h-5',
                        fn.handler.type === type ? 'text-teal-600' : 'text-warm-500'
                      )}
                    />
                  </div>
                  <div>
                    <p className="font-medium text-warm-900">{label}</p>
                    <p className="text-xs text-warm-500">{description}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Handler Config */}
            <div className="p-4 rounded-lg border border-warm-200 bg-warm-50/50 space-y-4">
              {fn.handler.type === 'webhook' && (
                <>
                  <div className="flex gap-3">
                    <select
                      value={fn.handler.config.method ?? 'POST'}
                      onChange={(e) =>
                        updateHandlerConfig({ method: e.target.value as any })
                      }
                      className="px-3 py-2.5 rounded-lg border border-warm-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    >
                      {['GET', 'POST', 'PUT', 'DELETE'].map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <input
                      type="url"
                      value={fn.handler.config.url ?? ''}
                      onChange={(e) => updateHandlerConfig({ url: e.target.value })}
                      placeholder="https://api.example.com/webhook"
                      className={clsx(
                        'flex-1 px-4 py-2.5 rounded-lg border bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors',
                        errors.url ? 'border-error' : 'border-warm-200'
                      )}
                    />
                  </div>
                  {errors.url && (
                    <p className="text-xs text-error flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.url}
                    </p>
                  )}
                </>
              )}

              {fn.handler.type === 'code' && (
                <>
                  <textarea
                    value={fn.handler.config.code ?? ''}
                    onChange={(e) => updateHandlerConfig({ code: e.target.value })}
                    placeholder={`async function handler(params) {
  // Your handler code here
  return { result: params };
}`}
                    rows={10}
                    className={clsx(
                      'w-full px-4 py-3 rounded-lg border bg-white font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors',
                      errors.code ? 'border-error' : 'border-warm-200'
                    )}
                  />
                  {errors.code && (
                    <p className="text-xs text-error flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.code}
                    </p>
                  )}
                </>
              )}

              {fn.handler.type === 'mcp' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-warm-700 mb-1">
                      MCP Server <span className="text-error">*</span>
                    </label>
                    <select
                      value={fn.handler.config.mcpServer ?? ''}
                      onChange={(e) =>
                        updateHandlerConfig({ mcpServer: e.target.value, mcpTool: '' })
                      }
                      className={clsx(
                        'w-full px-4 py-2.5 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500',
                        errors.mcpServer ? 'border-error' : 'border-warm-200'
                      )}
                    >
                      <option value="">Select MCP server...</option>
                      {availableMCPs.map((mcp) => (
                        <option key={mcp.id} value={mcp.id}>
                          {mcp.name}
                        </option>
                      ))}
                    </select>
                    {errors.mcpServer && (
                      <p className="text-xs text-error mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.mcpServer}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-warm-700 mb-1">
                      MCP Tool <span className="text-error">*</span>
                    </label>
                    <select
                      value={fn.handler.config.mcpTool ?? ''}
                      onChange={(e) => updateHandlerConfig({ mcpTool: e.target.value })}
                      disabled={!fn.handler.config.mcpServer}
                      className={clsx(
                        'w-full px-4 py-2.5 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500',
                        errors.mcpTool ? 'border-error' : 'border-warm-200',
                        !fn.handler.config.mcpServer && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <option value="">Select tool...</option>
                      {availableMCPs
                        .find((m) => m.id === fn.handler.config.mcpServer)
                        ?.tools.map((tool) => (
                          <option key={tool} value={tool}>
                            {tool}
                          </option>
                        ))}
                    </select>
                    {errors.mcpTool && (
                      <p className="text-xs text-error mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.mcpTool}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Test Panel */}
        {showTestPanel && (
          <div className="w-96 border-l border-warm-200 flex flex-col bg-warm-50/50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-warm-200">
              <h3 className="font-medium text-warm-900">Test Function</h3>
              <button
                onClick={() => setShowTestPanel(false)}
                className="p-1 rounded hover:bg-warm-200 text-warm-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Input */}
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-2">
                  Input Parameters
                </label>
                <textarea
                  value={JSON.stringify(testInput, null, 2)}
                  onChange={(e) => {
                    try {
                      setTestInput(JSON.parse(e.target.value));
                    } catch {}
                  }}
                  placeholder="{}"
                  rows={8}
                  className="w-full px-4 py-3 rounded-lg border border-warm-200 bg-white font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              {/* Run Button */}
              <button
                onClick={handleTest}
                disabled={testing}
                className={clsx(
                  'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  testing
                    ? 'bg-warm-200 text-warm-400 cursor-not-allowed'
                    : 'bg-teal-500 hover:bg-teal-600 text-white'
                )}
              >
                {testing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Run Test
                  </>
                )}
              </button>

              {/* Output */}
              {testResult && (
                <div
                  className={clsx(
                    'p-4 rounded-lg border',
                    testResult.success
                      ? 'bg-success/10 border-success/20'
                      : 'bg-error/10 border-error/20'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {testResult.success ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-error" />
                    )}
                    <span
                      className={clsx(
                        'font-medium text-sm',
                        testResult.success ? 'text-success' : 'text-error'
                      )}
                    >
                      {testResult.success ? 'Success' : 'Failed'}
                    </span>
                    <span className="text-xs text-warm-500 ml-auto">
                      {testResult.duration}ms
                    </span>
                  </div>
                  <pre className="text-xs font-mono bg-warm-900 text-warm-100 rounded p-3 overflow-x-auto">
                    {testResult.error ||
                      JSON.stringify(testResult.output, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-warm-200 bg-warm-50/50">
        <button
          onClick={handleSave}
          disabled={saving}
          className={clsx(
            'flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors',
            saving
              ? 'bg-teal-400 text-white cursor-not-allowed'
              : 'bg-teal-500 hover:bg-teal-600 text-white'
          )}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Function
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export { FunctionBuilder };
export type { FunctionBuilderProps, FunctionDefinition, FunctionParameter, TestResult };
