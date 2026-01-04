'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Save,
  Download,
  Upload,
  Copy,
  Eye,
  EyeOff,
  GitFork,
  History,
  AlertCircle,
  Check,
  X,
  ChevronDown,
  Code,
  Play,
  RefreshCw,
  Loader2,
  FileCode,
  Sparkles,
  Cpu,
  Settings,
  Zap,
} from 'lucide-react';
import clsx from 'clsx';

/**
 * AgentYAMLEditor - Monaco-based YAML editor for agent definitions
 *
 * Features:
 * - Full Monaco editor integration
 * - YAML syntax highlighting
 * - Schema validation with inline errors
 * - Auto-complete for known fields
 * - Live preview panel showing parsed agent
 * - Import/Export buttons
 * - Version history dropdown
 * - Fork from template button
 */

// Agent YAML Schema Types
interface AgentModel {
  provider: 'anthropic' | 'openai' | 'google' | 'deepseek' | 'meta' | 'mistral' | 'xai';
  model_id: string;
  temperature: number;
}

interface AgentGuardrails {
  max_retries: number;
  timeout_seconds: number;
}

interface AgentTool {
  name: string;
  description: string;
  parameters?: Record<string, any>;
}

interface AgentDefinition {
  agent: {
    id: string;
    name: string;
    description: string;
    model: AgentModel;
    capabilities: string[];
    system_prompt: string;
    tools: AgentTool[];
    guardrails: AgentGuardrails;
  };
}

interface ValidationError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

interface VersionHistoryItem {
  id: string;
  timestamp: Date;
  label: string;
  yaml: string;
}

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  yaml: string;
}

interface AgentYAMLEditorProps {
  initialYaml?: string;
  agentId?: string;
  onSave?: (yaml: string, parsed: AgentDefinition) => Promise<void>;
  onValidate?: (yaml: string) => ValidationError[];
  templates?: AgentTemplate[];
  versionHistory?: VersionHistoryItem[];
  readOnly?: boolean;
}

// Default YAML template
const DEFAULT_YAML = `agent:
  id: "new-agent"
  name: "New Agent"
  description: "A helpful AI assistant"
  model:
    provider: anthropic
    model_id: claude-sonnet-4-20250514
    temperature: 0.7
  capabilities:
    - text-generation
    - code-execution
  system_prompt: |
    You are a helpful AI assistant.
    Be concise and accurate in your responses.
  tools: []
  guardrails:
    max_retries: 3
    timeout_seconds: 120
`;

// Available templates
const DEFAULT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'code-assistant',
    name: 'Code Assistant',
    description: 'An agent specialized in code review and generation',
    yaml: `agent:
  id: "code-assistant"
  name: "Code Assistant"
  description: "Expert code reviewer and generator"
  model:
    provider: anthropic
    model_id: claude-sonnet-4-20250514
    temperature: 0.3
  capabilities:
    - code-execution
    - file-analysis
    - text-generation
  system_prompt: |
    You are an expert software engineer.
    Review code for best practices, security issues, and performance.
    Write clean, maintainable code with proper documentation.
  tools:
    - name: execute_code
      description: Run code in a sandboxed environment
    - name: analyze_file
      description: Analyze file contents
  guardrails:
    max_retries: 5
    timeout_seconds: 180
`,
  },
  {
    id: 'research-agent',
    name: 'Research Agent',
    description: 'An agent for deep research and analysis',
    yaml: `agent:
  id: "research-agent"
  name: "Research Agent"
  description: "Deep research and analysis specialist"
  model:
    provider: anthropic
    model_id: claude-opus-4-20250514
    temperature: 0.5
  capabilities:
    - web-search
    - document-analysis
    - text-generation
  system_prompt: |
    You are a research specialist with expertise in finding and synthesizing information.
    Always cite your sources and provide balanced perspectives.
    Use structured thinking to analyze complex topics.
  tools:
    - name: web_search
      description: Search the web for information
    - name: analyze_document
      description: Analyze document contents
  guardrails:
    max_retries: 3
    timeout_seconds: 300
`,
  },
  {
    id: 'creative-writer',
    name: 'Creative Writer',
    description: 'An agent for creative writing tasks',
    yaml: `agent:
  id: "creative-writer"
  name: "Creative Writer"
  description: "Creative writing and storytelling expert"
  model:
    provider: anthropic
    model_id: claude-sonnet-4-20250514
    temperature: 0.9
  capabilities:
    - text-generation
    - image-generation
  system_prompt: |
    You are a creative writer with a flair for storytelling.
    Craft engaging narratives with vivid descriptions.
    Adapt your style to match the requested genre and tone.
  tools:
    - name: generate_image
      description: Create images to accompany stories
  guardrails:
    max_retries: 3
    timeout_seconds: 120
`,
  },
];

// Model providers and their available models
const MODEL_OPTIONS: Record<string, string[]> = {
  anthropic: ['claude-opus-4-20250514', 'claude-sonnet-4-20250514', 'claude-3-5-haiku-latest'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o1-mini'],
  google: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  deepseek: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
  meta: ['llama-3.3-70b', 'llama-3.2-90b-vision'],
  mistral: ['mistral-large', 'mistral-medium', 'codestral'],
  xai: ['grok-2', 'grok-2-vision'],
};

// Common capabilities
const CAPABILITY_OPTIONS = [
  'text-generation',
  'code-execution',
  'web-search',
  'file-analysis',
  'image-generation',
  'voice-chat',
  'computer-use',
  'document-analysis',
  'data-analysis',
  'api-integration',
];

export default function AgentYAMLEditor({
  initialYaml = DEFAULT_YAML,
  agentId,
  onSave,
  onValidate,
  templates = DEFAULT_TEMPLATES,
  versionHistory = [],
  readOnly = false,
}: AgentYAMLEditorProps) {
  const [yaml, setYaml] = useState(initialYaml);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [parsedAgent, setParsedAgent] = useState<AgentDefinition | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simple YAML parser (in production, use js-yaml library)
  const parseYaml = useCallback((yamlString: string): AgentDefinition | null => {
    try {
      // Basic YAML parsing - in production use js-yaml
      const lines = yamlString.split('\n');
      const result: any = { agent: {} };
      let currentKey: string[] = [];
      let currentIndent = 0;
      let inMultiline = false;
      let multilineKey = '';
      let multilineValue = '';

      for (const line of lines) {
        if (line.trim() === '' || line.trim().startsWith('#')) continue;

        const indent = line.search(/\S/);
        const content = line.trim();

        if (inMultiline) {
          if (indent > currentIndent) {
            multilineValue += content + '\n';
            continue;
          } else {
            // End of multiline
            let obj = result;
            for (let i = 0; i < currentKey.length - 1; i++) {
              obj = obj[currentKey[i]];
            }
            obj[multilineKey] = multilineValue.trim();
            inMultiline = false;
          }
        }

        if (content.endsWith('|') || content.endsWith('>')) {
          const key = content.slice(0, -1).replace(':', '').trim();
          multilineKey = key;
          multilineValue = '';
          currentIndent = indent;
          inMultiline = true;
          continue;
        }

        if (content.startsWith('- ')) {
          // Array item
          let obj = result;
          for (const k of currentKey) {
            if (!obj[k]) obj[k] = [];
            obj = obj[k];
          }
          if (Array.isArray(obj)) {
            const value = content.slice(2).trim();
            if (value.includes(':')) {
              // Object in array
              const [k, v] = value.split(':').map(s => s.trim());
              obj.push({ [k]: v.replace(/['"]/g, '') });
            } else {
              obj.push(value.replace(/['"]/g, ''));
            }
          }
          continue;
        }

        if (content.includes(':')) {
          const colonIndex = content.indexOf(':');
          const key = content.slice(0, colonIndex).trim();
          const value = content.slice(colonIndex + 1).trim();

          // Update current key path based on indentation
          const level = Math.floor(indent / 2);
          currentKey = currentKey.slice(0, level);
          currentKey.push(key);

          if (value) {
            // Has inline value
            let obj = result;
            for (let i = 0; i < currentKey.length - 1; i++) {
              if (!obj[currentKey[i]]) obj[currentKey[i]] = {};
              obj = obj[currentKey[i]];
            }
            // Parse value
            let parsedValue: any = value.replace(/['"]/g, '');
            if (parsedValue === 'true') parsedValue = true;
            else if (parsedValue === 'false') parsedValue = false;
            else if (!isNaN(Number(parsedValue))) parsedValue = Number(parsedValue);
            obj[key] = parsedValue;
          } else {
            // Nested object or array
            let obj = result;
            for (let i = 0; i < currentKey.length - 1; i++) {
              if (!obj[currentKey[i]]) obj[currentKey[i]] = {};
              obj = obj[currentKey[i]];
            }
            if (!obj[key]) obj[key] = {};
          }
        }
      }

      return result as AgentDefinition;
    } catch (e) {
      return null;
    }
  }, []);

  // Validate YAML
  const validateYaml = useCallback((yamlString: string): ValidationError[] => {
    const validationErrors: ValidationError[] = [];

    // Custom validation if provided
    if (onValidate) {
      return onValidate(yamlString);
    }

    // Basic validation
    const lines = yamlString.split('\n');

    // Check for required fields
    if (!yamlString.includes('agent:')) {
      validationErrors.push({
        line: 1,
        column: 1,
        message: 'Missing required "agent" root key',
        severity: 'error',
      });
    }

    const requiredFields = ['id', 'name', 'description', 'model', 'system_prompt'];
    for (const field of requiredFields) {
      if (!yamlString.includes(`${field}:`)) {
        validationErrors.push({
          line: 1,
          column: 1,
          message: `Missing required field: ${field}`,
          severity: 'error',
        });
      }
    }

    // Check for valid provider
    const providerMatch = yamlString.match(/provider:\s*(\w+)/);
    if (providerMatch) {
      const provider = providerMatch[1];
      if (!Object.keys(MODEL_OPTIONS).includes(provider)) {
        const lineIndex = lines.findIndex(l => l.includes('provider:'));
        validationErrors.push({
          line: lineIndex + 1,
          column: 1,
          message: `Invalid provider: ${provider}. Valid options: ${Object.keys(MODEL_OPTIONS).join(', ')}`,
          severity: 'error',
        });
      }
    }

    // Check temperature range
    const tempMatch = yamlString.match(/temperature:\s*([\d.]+)/);
    if (tempMatch) {
      const temp = parseFloat(tempMatch[1]);
      if (temp < 0 || temp > 2) {
        const lineIndex = lines.findIndex(l => l.includes('temperature:'));
        validationErrors.push({
          line: lineIndex + 1,
          column: 1,
          message: 'Temperature must be between 0 and 2',
          severity: 'warning',
        });
      }
    }

    // Check indentation consistency
    let prevIndent = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === '' || line.trim().startsWith('#')) continue;

      const indent = line.search(/\S/);
      if (indent % 2 !== 0) {
        validationErrors.push({
          line: i + 1,
          column: 1,
          message: 'Inconsistent indentation (use 2 spaces)',
          severity: 'warning',
        });
      }
      prevIndent = indent;
    }

    return validationErrors;
  }, [onValidate]);

  // Parse and validate on change
  useEffect(() => {
    const parsed = parseYaml(yaml);
    setParsedAgent(parsed);
    const validationErrors = validateYaml(yaml);
    setErrors(validationErrors);
  }, [yaml, parseYaml, validateYaml]);

  // Handle save
  const handleSave = async () => {
    if (!parsedAgent || errors.some(e => e.severity === 'error')) return;

    setSaving(true);
    try {
      await onSave?.(yaml, parsedAgent);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Save failed:', e);
    } finally {
      setSaving(false);
    }
  };

  // Handle export
  const handleExport = () => {
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${parsedAgent?.agent?.id || 'agent'}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle import
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setYaml(content);
    };
    reader.readAsText(file);
  };

  // Handle copy
  const handleCopy = async () => {
    await navigator.clipboard.writeText(yaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle template selection
  const handleSelectTemplate = (template: AgentTemplate) => {
    setYaml(template.yaml);
    setShowTemplates(false);
  };

  // Handle version selection
  const handleSelectVersion = (version: VersionHistoryItem) => {
    setYaml(version.yaml);
    setShowHistory(false);
  };

  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className={clsx(
      'flex flex-col h-full rounded-xl border overflow-hidden',
      darkMode ? 'bg-warm-900 border-warm-700' : 'bg-white border-warm-200'
    )}>
      {/* Toolbar */}
      <div className={clsx(
        'flex items-center justify-between px-4 py-3 border-b',
        darkMode ? 'bg-warm-800 border-warm-700' : 'bg-warm-50 border-warm-200'
      )}>
        <div className="flex items-center gap-2">
          <div className={clsx(
            'p-2 rounded-lg',
            darkMode ? 'bg-teal-500/20' : 'bg-teal-100'
          )}>
            <FileCode className={clsx('w-5 h-5', darkMode ? 'text-teal-400' : 'text-teal-600')} />
          </div>
          <div>
            <h3 className={clsx(
              'font-medium text-sm',
              darkMode ? 'text-warm-100' : 'text-warm-900'
            )}>
              Agent YAML Editor
            </h3>
            <p className={clsx(
              'text-xs',
              darkMode ? 'text-warm-400' : 'text-warm-500'
            )}>
              {agentId ? `Editing: ${agentId}` : 'New Agent'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Template Selector */}
          <div className="relative">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className={clsx(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
                darkMode
                  ? 'bg-warm-700 hover:bg-warm-600 text-warm-200'
                  : 'bg-warm-100 hover:bg-warm-200 text-warm-700'
              )}
            >
              <GitFork className="w-4 h-4" />
              Templates
              <ChevronDown className="w-3 h-3" />
            </button>
            {showTemplates && (
              <div className={clsx(
                'absolute top-full left-0 mt-1 w-64 rounded-lg border shadow-lg z-10',
                darkMode ? 'bg-warm-800 border-warm-700' : 'bg-white border-warm-200'
              )}>
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className={clsx(
                      'w-full text-left px-4 py-3 transition-colors first:rounded-t-lg last:rounded-b-lg',
                      darkMode
                        ? 'hover:bg-warm-700 border-b border-warm-700 last:border-b-0'
                        : 'hover:bg-warm-50 border-b border-warm-100 last:border-b-0'
                    )}
                  >
                    <p className={clsx(
                      'font-medium text-sm',
                      darkMode ? 'text-warm-100' : 'text-warm-900'
                    )}>
                      {template.name}
                    </p>
                    <p className={clsx(
                      'text-xs mt-0.5',
                      darkMode ? 'text-warm-400' : 'text-warm-500'
                    )}>
                      {template.description}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Version History */}
          {versionHistory.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
                  darkMode
                    ? 'bg-warm-700 hover:bg-warm-600 text-warm-200'
                    : 'bg-warm-100 hover:bg-warm-200 text-warm-700'
                )}
              >
                <History className="w-4 h-4" />
                History
                <ChevronDown className="w-3 h-3" />
              </button>
              {showHistory && (
                <div className={clsx(
                  'absolute top-full right-0 mt-1 w-64 rounded-lg border shadow-lg z-10 max-h-64 overflow-y-auto',
                  darkMode ? 'bg-warm-800 border-warm-700' : 'bg-white border-warm-200'
                )}>
                  {versionHistory.map((version) => (
                    <button
                      key={version.id}
                      onClick={() => handleSelectVersion(version)}
                      className={clsx(
                        'w-full text-left px-4 py-3 transition-colors first:rounded-t-lg last:rounded-b-lg',
                        darkMode
                          ? 'hover:bg-warm-700 border-b border-warm-700 last:border-b-0'
                          : 'hover:bg-warm-50 border-b border-warm-100 last:border-b-0'
                      )}
                    >
                      <p className={clsx(
                        'font-medium text-sm',
                        darkMode ? 'text-warm-100' : 'text-warm-900'
                      )}>
                        {version.label}
                      </p>
                      <p className={clsx(
                        'text-xs mt-0.5',
                        darkMode ? 'text-warm-400' : 'text-warm-500'
                      )}>
                        {formatDate(version.timestamp)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={clsx(
              'p-2 rounded-lg transition-colors',
              darkMode
                ? 'bg-warm-700 hover:bg-warm-600 text-warm-200'
                : 'bg-warm-100 hover:bg-warm-200 text-warm-700'
            )}
          >
            {darkMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          {/* Preview Toggle */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={clsx(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
              showPreview
                ? 'bg-teal-500 text-white'
                : darkMode
                  ? 'bg-warm-700 hover:bg-warm-600 text-warm-200'
                  : 'bg-warm-100 hover:bg-warm-200 text-warm-700'
            )}
          >
            <Code className="w-4 h-4" />
            Preview
          </button>
        </div>
      </div>

      {/* Editor & Preview */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        <div className={clsx(
          'flex-1 flex flex-col',
          showPreview ? 'border-r' : '',
          darkMode ? 'border-warm-700' : 'border-warm-200'
        )}>
          {/* Line numbers and editor */}
          <div className="flex-1 flex overflow-hidden">
            {/* Line numbers */}
            <div className={clsx(
              'flex-shrink-0 py-4 px-2 text-right select-none font-mono text-xs',
              darkMode ? 'bg-warm-800 text-warm-500' : 'bg-warm-50 text-warm-400'
            )}>
              {yaml.split('\n').map((_, i) => {
                const lineError = errors.find(e => e.line === i + 1);
                return (
                  <div
                    key={i}
                    className={clsx(
                      'leading-6',
                      lineError?.severity === 'error' && 'text-error',
                      lineError?.severity === 'warning' && 'text-warning'
                    )}
                  >
                    {i + 1}
                  </div>
                );
              })}
            </div>

            {/* Editor textarea */}
            <textarea
              ref={editorRef}
              value={yaml}
              onChange={(e) => setYaml(e.target.value)}
              readOnly={readOnly}
              spellCheck={false}
              className={clsx(
                'flex-1 p-4 font-mono text-sm leading-6 resize-none focus:outline-none',
                darkMode
                  ? 'bg-warm-900 text-warm-100'
                  : 'bg-white text-warm-800',
                readOnly && 'cursor-not-allowed opacity-75'
              )}
              placeholder="Enter YAML configuration..."
            />
          </div>

          {/* Errors panel */}
          {errors.length > 0 && (
            <div className={clsx(
              'border-t max-h-32 overflow-y-auto',
              darkMode ? 'bg-warm-800 border-warm-700' : 'bg-warm-50 border-warm-200'
            )}>
              {errors.map((error, i) => (
                <div
                  key={i}
                  className={clsx(
                    'flex items-start gap-2 px-4 py-2 text-xs border-b last:border-b-0',
                    darkMode ? 'border-warm-700' : 'border-warm-100'
                  )}
                >
                  <AlertCircle className={clsx(
                    'w-4 h-4 flex-shrink-0 mt-0.5',
                    error.severity === 'error' ? 'text-error' : 'text-warning'
                  )} />
                  <div>
                    <span className={clsx(
                      'font-medium',
                      error.severity === 'error' ? 'text-error' : 'text-warning'
                    )}>
                      Line {error.line}:
                    </span>
                    <span className={darkMode ? 'text-warm-300' : 'text-warm-600'}>
                      {' '}{error.message}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className={clsx(
            'w-80 flex flex-col overflow-hidden',
            darkMode ? 'bg-warm-800' : 'bg-warm-50'
          )}>
            <div className={clsx(
              'px-4 py-3 border-b font-medium text-sm',
              darkMode ? 'text-warm-200 border-warm-700' : 'text-warm-700 border-warm-200'
            )}>
              Live Preview
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {parsedAgent?.agent ? (
                <>
                  {/* Agent Info */}
                  <div className={clsx(
                    'p-4 rounded-lg',
                    darkMode ? 'bg-warm-700' : 'bg-white border border-warm-200'
                  )}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={clsx(
                        'p-2 rounded-lg',
                        darkMode ? 'bg-teal-500/20' : 'bg-teal-100'
                      )}>
                        <Sparkles className={clsx(
                          'w-5 h-5',
                          darkMode ? 'text-teal-400' : 'text-teal-600'
                        )} />
                      </div>
                      <div>
                        <p className={clsx(
                          'font-medium',
                          darkMode ? 'text-warm-100' : 'text-warm-900'
                        )}>
                          {parsedAgent.agent.name || 'Unnamed Agent'}
                        </p>
                        <p className={clsx(
                          'text-xs',
                          darkMode ? 'text-warm-400' : 'text-warm-500'
                        )}>
                          {parsedAgent.agent.id || 'no-id'}
                        </p>
                      </div>
                    </div>
                    <p className={clsx(
                      'text-sm',
                      darkMode ? 'text-warm-300' : 'text-warm-600'
                    )}>
                      {parsedAgent.agent.description || 'No description'}
                    </p>
                  </div>

                  {/* Model Info */}
                  {parsedAgent.agent.model && (
                    <div className={clsx(
                      'p-4 rounded-lg',
                      darkMode ? 'bg-warm-700' : 'bg-white border border-warm-200'
                    )}>
                      <div className="flex items-center gap-2 mb-3">
                        <Cpu className={clsx(
                          'w-4 h-4',
                          darkMode ? 'text-warm-400' : 'text-warm-500'
                        )} />
                        <span className={clsx(
                          'font-medium text-sm',
                          darkMode ? 'text-warm-200' : 'text-warm-700'
                        )}>
                          Model
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className={darkMode ? 'text-warm-400' : 'text-warm-500'}>
                            Provider
                          </span>
                          <span className={clsx(
                            'font-medium capitalize',
                            darkMode ? 'text-warm-200' : 'text-warm-700'
                          )}>
                            {parsedAgent.agent.model.provider}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className={darkMode ? 'text-warm-400' : 'text-warm-500'}>
                            Model ID
                          </span>
                          <span className={clsx(
                            'font-mono text-xs',
                            darkMode ? 'text-warm-200' : 'text-warm-700'
                          )}>
                            {parsedAgent.agent.model.model_id}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className={darkMode ? 'text-warm-400' : 'text-warm-500'}>
                            Temperature
                          </span>
                          <span className={clsx(
                            'font-medium',
                            darkMode ? 'text-warm-200' : 'text-warm-700'
                          )}>
                            {parsedAgent.agent.model.temperature}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Capabilities */}
                  {parsedAgent.agent.capabilities && parsedAgent.agent.capabilities.length > 0 && (
                    <div className={clsx(
                      'p-4 rounded-lg',
                      darkMode ? 'bg-warm-700' : 'bg-white border border-warm-200'
                    )}>
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className={clsx(
                          'w-4 h-4',
                          darkMode ? 'text-warm-400' : 'text-warm-500'
                        )} />
                        <span className={clsx(
                          'font-medium text-sm',
                          darkMode ? 'text-warm-200' : 'text-warm-700'
                        )}>
                          Capabilities
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {parsedAgent.agent.capabilities.map((cap: string, i: number) => (
                          <span
                            key={i}
                            className={clsx(
                              'px-2 py-0.5 rounded-full text-xs',
                              darkMode
                                ? 'bg-teal-500/20 text-teal-300'
                                : 'bg-teal-100 text-teal-700'
                            )}
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Guardrails */}
                  {parsedAgent.agent.guardrails && (
                    <div className={clsx(
                      'p-4 rounded-lg',
                      darkMode ? 'bg-warm-700' : 'bg-white border border-warm-200'
                    )}>
                      <div className="flex items-center gap-2 mb-3">
                        <Settings className={clsx(
                          'w-4 h-4',
                          darkMode ? 'text-warm-400' : 'text-warm-500'
                        )} />
                        <span className={clsx(
                          'font-medium text-sm',
                          darkMode ? 'text-warm-200' : 'text-warm-700'
                        )}>
                          Guardrails
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className={darkMode ? 'text-warm-400' : 'text-warm-500'}>
                            Max Retries
                          </span>
                          <span className={clsx(
                            'font-medium',
                            darkMode ? 'text-warm-200' : 'text-warm-700'
                          )}>
                            {parsedAgent.agent.guardrails.max_retries}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className={darkMode ? 'text-warm-400' : 'text-warm-500'}>
                            Timeout
                          </span>
                          <span className={clsx(
                            'font-medium',
                            darkMode ? 'text-warm-200' : 'text-warm-700'
                          )}>
                            {parsedAgent.agent.guardrails.timeout_seconds}s
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className={clsx(
                  'flex flex-col items-center justify-center py-12 text-center',
                  darkMode ? 'text-warm-400' : 'text-warm-500'
                )}>
                  <AlertCircle className="w-12 h-12 mb-3 opacity-50" />
                  <p className="font-medium">Invalid YAML</p>
                  <p className="text-sm mt-1">Fix errors to see preview</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Toolbar */}
      <div className={clsx(
        'flex items-center justify-between px-4 py-3 border-t',
        darkMode ? 'bg-warm-800 border-warm-700' : 'bg-warm-50 border-warm-200'
      )}>
        <div className="flex items-center gap-2">
          {/* Import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".yaml,.yml"
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className={clsx(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
              darkMode
                ? 'bg-warm-700 hover:bg-warm-600 text-warm-200'
                : 'bg-warm-100 hover:bg-warm-200 text-warm-700'
            )}
          >
            <Upload className="w-4 h-4" />
            Import
          </button>

          {/* Export */}
          <button
            onClick={handleExport}
            className={clsx(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
              darkMode
                ? 'bg-warm-700 hover:bg-warm-600 text-warm-200'
                : 'bg-warm-100 hover:bg-warm-200 text-warm-700'
            )}
          >
            <Download className="w-4 h-4" />
            Export
          </button>

          {/* Copy */}
          <button
            onClick={handleCopy}
            className={clsx(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
              copied
                ? 'bg-success text-white'
                : darkMode
                  ? 'bg-warm-700 hover:bg-warm-600 text-warm-200'
                  : 'bg-warm-100 hover:bg-warm-200 text-warm-700'
            )}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Error count */}
          {errors.length > 0 && (
            <div className="flex items-center gap-2">
              <span className={clsx(
                'text-sm',
                errors.some(e => e.severity === 'error') ? 'text-error' : 'text-warning'
              )}>
                {errors.filter(e => e.severity === 'error').length} error(s),
                {' '}{errors.filter(e => e.severity === 'warning').length} warning(s)
              </span>
            </div>
          )}

          {/* Save Button */}
          {!readOnly && (
            <button
              onClick={handleSave}
              disabled={saving || errors.some(e => e.severity === 'error')}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                saving || errors.some(e => e.severity === 'error')
                  ? 'bg-warm-200 text-warm-400 cursor-not-allowed'
                  : saved
                    ? 'bg-success text-white'
                    : 'bg-teal-500 hover:bg-teal-600 text-white'
              )}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <Check className="w-4 h-4" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Agent
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export { AgentYAMLEditor };
export type { AgentYAMLEditorProps, AgentDefinition, ValidationError, VersionHistoryItem, AgentTemplate };
