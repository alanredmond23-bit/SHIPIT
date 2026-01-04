'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Eye,
  EyeOff,
  AlertCircle,
  Check,
  Loader2,
  Settings,
  TestTube,
  Clock,
  Database,
  Zap,
  RefreshCw,
  Info,
  ExternalLink,
} from 'lucide-react';
import clsx from 'clsx';
import type { MCPServer, MCPConfigField } from './mcpServersData';

/**
 * MCPConfigModal - Configuration modal for MCP servers
 *
 * Features:
 * - API key input (with show/hide toggle)
 * - Rate limit settings
 * - Cache settings (enable, TTL)
 * - Timeout configuration
 * - Test connection button
 */

interface MCPConfigModalProps {
  server: MCPServer;
  isOpen: boolean;
  onClose: () => void;
  onSave: (serverId: string, config: Record<string, any>) => Promise<void>;
  onTest: (serverId: string, config: Record<string, any>) => Promise<{ success: boolean; message: string }>;
  initialConfig?: Record<string, any>;
}

interface AdvancedSettings {
  rateLimit: {
    enabled: boolean;
    requestsPerMinute: number;
  };
  cache: {
    enabled: boolean;
    ttlSeconds: number;
  };
  timeout: {
    connectTimeoutMs: number;
    requestTimeoutMs: number;
  };
  retry: {
    enabled: boolean;
    maxRetries: number;
    backoffMs: number;
  };
}

const DEFAULT_ADVANCED_SETTINGS: AdvancedSettings = {
  rateLimit: {
    enabled: true,
    requestsPerMinute: 60,
  },
  cache: {
    enabled: true,
    ttlSeconds: 300,
  },
  timeout: {
    connectTimeoutMs: 5000,
    requestTimeoutMs: 30000,
  },
  retry: {
    enabled: true,
    maxRetries: 3,
    backoffMs: 1000,
  },
};

export default function MCPConfigModal({
  server,
  isOpen,
  onClose,
  onSave,
  onTest,
  initialConfig = {},
}: MCPConfigModalProps) {
  const [config, setConfig] = useState<Record<string, any>>(initialConfig);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>(
    initialConfig.advanced || DEFAULT_ADVANCED_SETTINGS
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset state when modal opens/closes or server changes
  useEffect(() => {
    if (isOpen) {
      setConfig(initialConfig);
      setAdvancedSettings(initialConfig.advanced || DEFAULT_ADVANCED_SETTINGS);
      setErrors({});
      setTestResult(null);
      setShowSecrets({});
    }
  }, [isOpen, server.id, initialConfig]);

  // Validate required fields
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    server.configFields?.forEach((field) => {
      if (field.required && !config[field.key]?.trim()) {
        newErrors[field.key] = `${field.label} is required`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input change
  const handleChange = (key: string, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
    setTestResult(null);
  };

  // Handle save
  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      await onSave(server.id, {
        ...config,
        advanced: advancedSettings,
      });
      onClose();
    } catch (e: any) {
      setErrors((prev) => ({
        ...prev,
        _form: e.message || 'Failed to save configuration',
      }));
    } finally {
      setSaving(false);
    }
  };

  // Handle test connection
  const handleTest = async () => {
    if (!validate()) return;

    setTesting(true);
    setTestResult(null);
    try {
      const result = await onTest(server.id, {
        ...config,
        advanced: advancedSettings,
      });
      setTestResult(result);
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e.message || 'Connection test failed',
      });
    } finally {
      setTesting(false);
    }
  };

  // Toggle secret visibility
  const toggleSecretVisibility = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Render field based on type
  const renderField = (field: MCPConfigField) => {
    const value = config[field.key] ?? field.default ?? '';
    const error = errors[field.key];
    const isSecret = field.type === 'password';
    const showValue = showSecrets[field.key];

    return (
      <div key={field.key} className="space-y-1.5">
        <label className="flex items-center gap-1 text-sm font-medium text-warm-700">
          {field.label}
          {field.required && <span className="text-error">*</span>}
          {field.description && (
            <span className="ml-1 group relative">
              <Info className="w-3.5 h-3.5 text-warm-400 cursor-help" />
              <span className="absolute left-0 bottom-full mb-1 hidden group-hover:block w-48 p-2 text-xs bg-warm-900 text-warm-100 rounded-lg shadow-lg z-10">
                {field.description}
              </span>
            </span>
          )}
        </label>

        {field.type === 'select' ? (
          <select
            value={value}
            onChange={(e) => handleChange(field.key, e.target.value)}
            className={clsx(
              'w-full px-4 py-2.5 rounded-lg border bg-white text-warm-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors',
              error ? 'border-error' : 'border-warm-200'
            )}
          >
            <option value="">Select...</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : field.type === 'boolean' ? (
          <button
            type="button"
            onClick={() => handleChange(field.key, !value)}
            className={clsx(
              'relative w-12 h-6 rounded-full transition-colors',
              value ? 'bg-teal-500' : 'bg-warm-300'
            )}
          >
            <div
              className={clsx(
                'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform',
                value ? 'translate-x-7' : 'translate-x-1'
              )}
            />
          </button>
        ) : field.type === 'number' ? (
          <input
            type="number"
            value={value}
            onChange={(e) => handleChange(field.key, parseInt(e.target.value) || 0)}
            placeholder={field.placeholder}
            className={clsx(
              'w-full px-4 py-2.5 rounded-lg border bg-white text-warm-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors',
              error ? 'border-error' : 'border-warm-200'
            )}
          />
        ) : (
          <div className="relative">
            <input
              type={isSecret && !showValue ? 'password' : 'text'}
              value={value}
              onChange={(e) => handleChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className={clsx(
                'w-full px-4 py-2.5 rounded-lg border bg-white text-warm-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors',
                isSecret && 'pr-10 font-mono',
                error ? 'border-error' : 'border-warm-200'
              )}
            />
            {isSecret && (
              <button
                type="button"
                onClick={() => toggleSecretVisibility(field.key)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-warm-100 text-warm-500 transition-colors"
              >
                {showValue ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        )}

        {error && (
          <p className="text-xs text-error flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {error}
          </p>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[90vh] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-warm-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center font-bold text-teal-700">
              {server.icon}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-warm-900">
                Configure {server.name}
              </h2>
              <p className="text-sm text-warm-500">Version {server.version}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-warm-100 text-warm-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Form Error */}
          {errors._form && (
            <div className="mb-6 p-4 rounded-lg bg-error/10 border border-error/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-error">Configuration Error</p>
                <p className="text-sm text-warm-600 mt-1">{errors._form}</p>
              </div>
            </div>
          )}

          {/* Config Fields */}
          <div className="space-y-4">
            {server.configFields?.map(renderField)}
          </div>

          {/* Test Result */}
          {testResult && (
            <div
              className={clsx(
                'mt-6 p-4 rounded-lg border flex items-start gap-3',
                testResult.success
                  ? 'bg-success/10 border-success/20'
                  : 'bg-error/10 border-error/20'
              )}
            >
              {testResult.success ? (
                <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p
                  className={clsx(
                    'font-medium',
                    testResult.success ? 'text-success' : 'text-error'
                  )}
                >
                  {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                </p>
                <p className="text-sm text-warm-600 mt-1">{testResult.message}</p>
              </div>
            </div>
          )}

          {/* Advanced Settings */}
          <div className="mt-6 pt-6 border-t border-warm-100">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-medium text-warm-700 hover:text-warm-900 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Advanced Settings
              <span
                className={clsx(
                  'transform transition-transform',
                  showAdvanced && 'rotate-180'
                )}
              >
                &#9662;
              </span>
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-6">
                {/* Rate Limiting */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-warm-500" />
                    <span className="text-sm font-medium text-warm-700">Rate Limiting</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={advancedSettings.rateLimit.enabled}
                        onChange={(e) =>
                          setAdvancedSettings((prev) => ({
                            ...prev,
                            rateLimit: { ...prev.rateLimit, enabled: e.target.checked },
                          }))
                        }
                        className="w-4 h-4 rounded border-warm-300 text-teal-500 focus:ring-teal-500"
                      />
                      <span className="text-sm text-warm-600">Enabled</span>
                    </label>
                    {advancedSettings.rateLimit.enabled && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={advancedSettings.rateLimit.requestsPerMinute}
                          onChange={(e) =>
                            setAdvancedSettings((prev) => ({
                              ...prev,
                              rateLimit: {
                                ...prev.rateLimit,
                                requestsPerMinute: parseInt(e.target.value) || 60,
                              },
                            }))
                          }
                          className="w-20 px-3 py-1.5 rounded-lg border border-warm-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        />
                        <span className="text-sm text-warm-500">req/min</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Caching */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-warm-500" />
                    <span className="text-sm font-medium text-warm-700">Response Caching</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={advancedSettings.cache.enabled}
                        onChange={(e) =>
                          setAdvancedSettings((prev) => ({
                            ...prev,
                            cache: { ...prev.cache, enabled: e.target.checked },
                          }))
                        }
                        className="w-4 h-4 rounded border-warm-300 text-teal-500 focus:ring-teal-500"
                      />
                      <span className="text-sm text-warm-600">Enabled</span>
                    </label>
                    {advancedSettings.cache.enabled && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={advancedSettings.cache.ttlSeconds}
                          onChange={(e) =>
                            setAdvancedSettings((prev) => ({
                              ...prev,
                              cache: {
                                ...prev.cache,
                                ttlSeconds: parseInt(e.target.value) || 300,
                              },
                            }))
                          }
                          className="w-20 px-3 py-1.5 rounded-lg border border-warm-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        />
                        <span className="text-sm text-warm-500">seconds TTL</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeouts */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-warm-500" />
                    <span className="text-sm font-medium text-warm-700">Timeouts</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-warm-500 mb-1 block">Connect Timeout</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={advancedSettings.timeout.connectTimeoutMs}
                          onChange={(e) =>
                            setAdvancedSettings((prev) => ({
                              ...prev,
                              timeout: {
                                ...prev.timeout,
                                connectTimeoutMs: parseInt(e.target.value) || 5000,
                              },
                            }))
                          }
                          className="w-full px-3 py-1.5 rounded-lg border border-warm-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        />
                        <span className="text-xs text-warm-400">ms</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-warm-500 mb-1 block">Request Timeout</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={advancedSettings.timeout.requestTimeoutMs}
                          onChange={(e) =>
                            setAdvancedSettings((prev) => ({
                              ...prev,
                              timeout: {
                                ...prev.timeout,
                                requestTimeoutMs: parseInt(e.target.value) || 30000,
                              },
                            }))
                          }
                          className="w-full px-3 py-1.5 rounded-lg border border-warm-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        />
                        <span className="text-xs text-warm-400">ms</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Retry */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-warm-500" />
                    <span className="text-sm font-medium text-warm-700">Retry Policy</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={advancedSettings.retry.enabled}
                        onChange={(e) =>
                          setAdvancedSettings((prev) => ({
                            ...prev,
                            retry: { ...prev.retry, enabled: e.target.checked },
                          }))
                        }
                        className="w-4 h-4 rounded border-warm-300 text-teal-500 focus:ring-teal-500"
                      />
                      <span className="text-sm text-warm-600">Enabled</span>
                    </label>
                    {advancedSettings.retry.enabled && (
                      <>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={advancedSettings.retry.maxRetries}
                            onChange={(e) =>
                              setAdvancedSettings((prev) => ({
                                ...prev,
                                retry: {
                                  ...prev.retry,
                                  maxRetries: parseInt(e.target.value) || 3,
                                },
                              }))
                            }
                            min="1"
                            max="10"
                            className="w-16 px-3 py-1.5 rounded-lg border border-warm-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                          />
                          <span className="text-sm text-warm-500">retries</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={advancedSettings.retry.backoffMs}
                            onChange={(e) =>
                              setAdvancedSettings((prev) => ({
                                ...prev,
                                retry: {
                                  ...prev.retry,
                                  backoffMs: parseInt(e.target.value) || 1000,
                                },
                              }))
                            }
                            step="100"
                            className="w-20 px-3 py-1.5 rounded-lg border border-warm-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                          />
                          <span className="text-sm text-warm-500">ms backoff</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Documentation Link */}
          {server.documentation && (
            <div className="mt-6 pt-6 border-t border-warm-100">
              <a
                href={server.documentation}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View Documentation
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-warm-100 bg-warm-50/50">
          <button
            onClick={handleTest}
            disabled={testing}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              testing
                ? 'bg-warm-200 text-warm-400 cursor-not-allowed'
                : 'bg-white border border-warm-200 text-warm-700 hover:bg-warm-100'
            )}
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <TestTube className="w-4 h-4" />
                Test Connection
              </>
            )}
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-warm-600 hover:bg-warm-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
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
                  Save Configuration
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { MCPConfigModal };
export type { MCPConfigModalProps, AdvancedSettings };
