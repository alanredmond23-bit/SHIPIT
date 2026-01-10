'use client';

import { useState, useCallback } from 'react';
import {
  X,
  Plus,
  Server,
  Link2,
  Key,
  Terminal,
  AlertCircle,
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import clsx from 'clsx';

// ============================================================================
// Types
// ============================================================================

interface MCPAddServerProps {
  onClose: () => void;
  onAdd: (config: NewServerConfig) => void;
}

interface NewServerConfig {
  name: string;
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  category: string;
  description?: string;
}

interface EnvVariable {
  key: string;
  value: string;
}

type ConnectionType = 'stdio' | 'http' | 'websocket';

// ============================================================================
// MCPAddServer Component
// ============================================================================

export function MCPAddServer({ onClose, onAdd }: MCPAddServerProps) {
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('utility');
  const [connectionType, setConnectionType] = useState<ConnectionType>('stdio');

  // Connection details
  const [url, setUrl] = useState('');
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState('');
  const [envVariables, setEnvVariables] = useState<EnvVariable[]>([]);

  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Categories
  const categories = [
    { value: 'productivity', label: 'Productivity' },
    { value: 'development', label: 'Development' },
    { value: 'data', label: 'Data' },
    { value: 'communication', label: 'Communication' },
    { value: 'ai', label: 'AI' },
    { value: 'utility', label: 'Utility' },
  ];

  // Add environment variable
  const addEnvVariable = useCallback(() => {
    setEnvVariables((prev) => [...prev, { key: '', value: '' }]);
  }, []);

  // Update environment variable
  const updateEnvVariable = useCallback((index: number, field: 'key' | 'value', value: string) => {
    setEnvVariables((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  }, []);

  // Remove environment variable
  const removeEnvVariable = useCallback((index: number) => {
    setEnvVariables((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Validate form
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (connectionType === 'stdio') {
      if (!command.trim()) {
        newErrors.command = 'Command is required for stdio connection';
      }
    } else {
      if (!url.trim()) {
        newErrors.url = 'URL is required';
      } else if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('ws://') && !url.startsWith('wss://')) {
        newErrors.url = 'Invalid URL format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, connectionType, command, url]);

  // Test connection
  const testConnection = async () => {
    if (!validate()) return;

    setIsTesting(true);
    setTestResult(null);
    setTestError(null);

    try {
      // Simulate connection test
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Randomly succeed or fail for demo
      if (Math.random() > 0.3) {
        setTestResult('success');
      } else {
        throw new Error('Connection refused: Unable to reach server');
      }
    } catch (err) {
      setTestResult('error');
      setTestError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setIsTesting(false);
    }
  };

  // Handle submit
  const handleSubmit = () => {
    if (!validate()) return;

    const config: NewServerConfig = {
      name: name.trim(),
      description: description.trim() || undefined,
      category,
    };

    if (connectionType === 'stdio') {
      config.command = command.trim();
      config.args = args
        .split(/\s+/)
        .filter(Boolean)
        .map((arg) => arg.trim());
    } else {
      config.url = url.trim();
    }

    if (envVariables.length > 0) {
      config.env = envVariables.reduce((acc, { key, value }) => {
        if (key.trim()) {
          acc[key.trim()] = value;
        }
        return acc;
      }, {} as Record<string, string>);
    }

    onAdd(config);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg bg-white rounded-2xl shadow-2xl z-50 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-100 rounded-xl">
              <Plus className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-900">Add MCP Server</h2>
              <p className="text-sm text-stone-500 mt-0.5">Configure a new server connection</p>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Server Name */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Server Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., My MCP Server"
                className={clsx(
                  'w-full pl-10 pr-4 py-2.5 border rounded-xl text-stone-900 placeholder:text-stone-400',
                  'focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500',
                  errors.name ? 'border-red-300 bg-red-50' : 'border-stone-200'
                )}
              />
            </div>
            {errors.name && (
              <p className="text-xs text-red-600 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this server do?"
              rows={2}
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Connection Type */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Connection Type
            </label>
            <div className="flex gap-2">
              {(['stdio', 'http', 'websocket'] as ConnectionType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setConnectionType(type)}
                  className={clsx(
                    'flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors capitalize',
                    connectionType === type
                      ? 'bg-teal-100 text-teal-700 border-2 border-teal-300'
                      : 'bg-stone-100 text-stone-600 border-2 border-transparent hover:bg-stone-200'
                  )}
                >
                  {type === 'stdio' ? 'STDIO' : type}
                </button>
              ))}
            </div>
          </div>

          {/* Connection Details */}
          {connectionType === 'stdio' ? (
            <>
              {/* Command */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Command <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    placeholder="e.g., npx"
                    className={clsx(
                      'w-full pl-10 pr-4 py-2.5 border rounded-xl text-stone-900 placeholder:text-stone-400 font-mono text-sm',
                      'focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500',
                      errors.command ? 'border-red-300 bg-red-50' : 'border-stone-200'
                    )}
                  />
                </div>
                {errors.command && (
                  <p className="text-xs text-red-600 mt-1">{errors.command}</p>
                )}
              </div>

              {/* Arguments */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Arguments
                </label>
                <input
                  type="text"
                  value={args}
                  onChange={(e) => setArgs(e.target.value)}
                  placeholder="e.g., -y @modelcontextprotocol/server-filesystem /path"
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                />
                <p className="text-xs text-stone-400 mt-1">Space-separated arguments</p>
              </div>
            </>
          ) : (
            /* URL */
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Server URL <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={connectionType === 'websocket' ? 'wss://...' : 'https://...'}
                  className={clsx(
                    'w-full pl-10 pr-4 py-2.5 border rounded-xl text-stone-900 placeholder:text-stone-400 font-mono text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500',
                    errors.url ? 'border-red-300 bg-red-50' : 'border-stone-200'
                  )}
                />
              </div>
              {errors.url && (
                <p className="text-xs text-red-600 mt-1">{errors.url}</p>
              )}
            </div>
          )}

          {/* Advanced Options */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700"
            >
              {showAdvanced ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              Advanced Options
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4 p-4 bg-stone-50 rounded-xl">
                {/* Environment Variables */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-stone-700 flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      Environment Variables
                    </label>
                    <button
                      type="button"
                      onClick={addEnvVariable}
                      className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Variable
                    </button>
                  </div>

                  {envVariables.length === 0 ? (
                    <p className="text-xs text-stone-400 text-center py-3">
                      No environment variables configured
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {envVariables.map((env, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={env.key}
                            onChange={(e) => updateEnvVariable(index, 'key', e.target.value)}
                            placeholder="KEY"
                            className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-stone-900 placeholder:text-stone-400 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                          />
                          <span className="text-stone-400">=</span>
                          <input
                            type="password"
                            value={env.value}
                            onChange={(e) => updateEnvVariable(index, 'value', e.target.value)}
                            placeholder="value"
                            className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-stone-900 placeholder:text-stone-400 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                          />
                          <button
                            type="button"
                            onClick={() => removeEnvVariable(index)}
                            className="p-2 hover:bg-red-50 rounded-lg text-stone-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Test Result */}
          {testResult && (
            <div
              className={clsx(
                'flex items-center gap-3 p-4 rounded-xl',
                testResult === 'success'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              )}
            >
              {testResult === 'success' ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div>
                    <div className="font-medium text-green-700">Connection successful</div>
                    <div className="text-xs text-green-600 mt-0.5">Server is reachable</div>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <div>
                    <div className="font-medium text-red-700">Connection failed</div>
                    <div className="text-xs text-red-600 mt-0.5">{testError}</div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-stone-200 bg-stone-50">
          <button
            onClick={testConnection}
            disabled={isTesting}
            className="flex items-center gap-2 px-4 py-2 border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-100 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4" />
                Test Connection
              </>
            )}
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-stone-600 hover:text-stone-800 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Server
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default MCPAddServer;
