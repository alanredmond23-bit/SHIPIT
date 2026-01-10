'use client';

import { useState, useMemo } from 'react';
import {
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  FileText,
  Code2,
  Database,
  Image,
  ExternalLink,
} from 'lucide-react';
import clsx from 'clsx';

// ============================================================================
// Types
// ============================================================================

type OutputType = 'text' | 'json' | 'error' | 'code' | 'image' | 'mixed';

interface ToolOutputProps {
  output: Record<string, any> | string | null;
  error?: string;
  maxPreviewLength?: number;
  className?: string;
}

// ============================================================================
// Output Type Detection
// ============================================================================

function detectOutputType(output: any): OutputType {
  if (!output) return 'text';
  if (typeof output === 'string') {
    // Check for code patterns
    if (output.includes('```') || output.startsWith('function') || output.startsWith('const')) {
      return 'code';
    }
    // Check for JSON string
    try {
      JSON.parse(output);
      return 'json';
    } catch {
      return 'text';
    }
  }
  if (typeof output === 'object') {
    if (output.error || output.message?.includes('error')) {
      return 'error';
    }
    if (output.image || output.url?.match(/\.(png|jpg|jpeg|gif|webp|svg)/i)) {
      return 'image';
    }
    return 'json';
  }
  return 'text';
}

// ============================================================================
// JSON Syntax Highlighter
// ============================================================================

function JsonHighlight({ value, depth = 0 }: { value: any; depth?: number }) {
  const indent = '  '.repeat(depth);

  if (value === null) {
    return <span className="text-orange-500">null</span>;
  }

  if (typeof value === 'boolean') {
    return <span className="text-purple-500">{value.toString()}</span>;
  }

  if (typeof value === 'number') {
    return <span className="text-blue-500">{value}</span>;
  }

  if (typeof value === 'string') {
    // Truncate long strings
    const displayValue = value.length > 200 ? value.slice(0, 200) + '...' : value;
    return (
      <span className="text-green-600 dark:text-green-400">"{displayValue}"</span>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-stone-500">[]</span>;
    }
    if (value.length > 10) {
      return (
        <span>
          {'[\n'}
          {value.slice(0, 10).map((item, i) => (
            <span key={i}>
              {indent}  <JsonHighlight value={item} depth={depth + 1} />
              {i < Math.min(value.length, 10) - 1 ? ',' : ''}
              {'\n'}
            </span>
          ))}
          {indent}  <span className="text-stone-400">... {value.length - 10} more items</span>
          {'\n'}
          {indent}]
        </span>
      );
    }
    return (
      <span>
        {'[\n'}
        {value.map((item, i) => (
          <span key={i}>
            {indent}  <JsonHighlight value={item} depth={depth + 1} />
            {i < value.length - 1 ? ',' : ''}
            {'\n'}
          </span>
        ))}
        {indent}]
      </span>
    );
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return <span className="text-stone-500">{'{}'}</span>;
    }
    return (
      <span>
        {'{\n'}
        {keys.map((key, i) => (
          <span key={key}>
            {indent}  <span className="text-teal-600 dark:text-teal-400">"{key}"</span>: <JsonHighlight value={value[key]} depth={depth + 1} />
            {i < keys.length - 1 ? ',' : ''}
            {'\n'}
          </span>
        ))}
        {indent}{'}'}
      </span>
    );
  }

  return <span>{String(value)}</span>;
}

// ============================================================================
// Error Display Component
// ============================================================================

function ErrorDisplay({ error }: { error: string }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="font-medium text-red-700 dark:text-red-300 text-sm">Error</div>
        <pre className="mt-1 text-xs font-mono text-red-600 dark:text-red-400 whitespace-pre-wrap break-words">
          {error}
        </pre>
      </div>
    </div>
  );
}

// ============================================================================
// Success Display Component
// ============================================================================

function SuccessDisplay({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="font-medium text-green-700 dark:text-green-300 text-sm">Success</div>
        <p className="mt-1 text-sm text-green-600 dark:text-green-400">{message}</p>
      </div>
    </div>
  );
}

// ============================================================================
// Image Display Component
// ============================================================================

function ImageDisplay({ url, alt }: { url: string; alt?: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative">
      <div className={clsx(
        'rounded-lg overflow-hidden border border-stone-200 dark:border-stone-700',
        !loaded && 'animate-pulse bg-stone-200 dark:bg-stone-700 h-48'
      )}>
        <img
          src={url}
          alt={alt || 'Tool output image'}
          onLoad={() => setLoaded(true)}
          className={clsx(
            'max-w-full h-auto transition-opacity duration-200',
            loaded ? 'opacity-100' : 'opacity-0'
          )}
        />
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-2 right-2 p-2 bg-white/90 dark:bg-stone-800/90 rounded-lg shadow-sm hover:bg-white dark:hover:bg-stone-700 transition-colors"
      >
        <ExternalLink className="w-4 h-4 text-stone-600 dark:text-stone-400" />
      </a>
    </div>
  );
}

// ============================================================================
// Code Display Component
// ============================================================================

function CodeDisplay({
  code,
  language,
}: {
  code: string;
  language?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-lg overflow-hidden border border-stone-200 dark:border-stone-700">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-stone-100 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-stone-500" />
          <span className="text-xs font-medium text-stone-600 dark:text-stone-400">
            {language || 'Code'}
          </span>
        </div>
        <button
          onClick={copyCode}
          className="p-1.5 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition-colors"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-stone-400" />
          )}
        </button>
      </div>

      {/* Code Content */}
      <pre className="p-4 bg-stone-50 dark:bg-stone-900 overflow-x-auto">
        <code className="text-xs font-mono text-stone-700 dark:text-stone-300 whitespace-pre-wrap break-words">
          {code}
        </code>
      </pre>
    </div>
  );
}

// ============================================================================
// Collapsible Section Component
// ============================================================================

function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultExpanded = true,
}: {
  title: string;
  icon: typeof FileText;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-stone-200 dark:border-stone-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700/50 transition-colors"
      >
        <span className="text-stone-400">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </span>
        <Icon className="w-4 h-4 text-stone-500" />
        <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
          {title}
        </span>
      </button>

      {isExpanded && (
        <div className="p-3 border-t border-stone-200 dark:border-stone-700">
          {children}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main ToolOutput Component
// ============================================================================

export function ToolOutput({
  output,
  error,
  maxPreviewLength = 1000,
  className,
}: ToolOutputProps) {
  const [copied, setCopied] = useState(false);
  const [showFull, setShowFull] = useState(false);

  const outputType = useMemo(() => detectOutputType(output), [output]);

  const stringOutput = useMemo(() => {
    if (!output) return '';
    if (typeof output === 'string') return output;
    return JSON.stringify(output, null, 2);
  }, [output]);

  const copyOutput = async () => {
    await navigator.clipboard.writeText(error || stringOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Error state
  if (error) {
    return (
      <div className={className}>
        <ErrorDisplay error={error} />
      </div>
    );
  }

  // No output
  if (!output) {
    return (
      <div className={clsx('p-4 bg-stone-50 dark:bg-stone-900/50 rounded-lg text-center', className)}>
        <p className="text-sm text-stone-500">No output</p>
      </div>
    );
  }

  // Image output
  if (outputType === 'image') {
    const imageUrl = typeof output === 'string'
      ? output
      : output.image || output.url || output.src;
    return (
      <div className={className}>
        <ImageDisplay url={imageUrl} />
      </div>
    );
  }

  // Code output
  if (outputType === 'code') {
    const codeContent = typeof output === 'string'
      ? output
      : output.code || output.content || JSON.stringify(output, null, 2);
    return (
      <div className={className}>
        <CodeDisplay
          code={codeContent}
          language={typeof output === 'object' ? output.language : undefined}
        />
      </div>
    );
  }

  // Check for success messages
  if (typeof output === 'object' && (output.success === true || output.status === 'success')) {
    const message = output.message || output.result || 'Operation completed successfully';
    return (
      <div className={className}>
        <SuccessDisplay message={String(message)} />
        {Object.keys(output).filter(k => !['success', 'status', 'message', 'result'].includes(k)).length > 0 && (
          <div className="mt-3">
            <CollapsibleSection title="Details" icon={Database} defaultExpanded={false}>
              <pre className="text-xs font-mono text-stone-700 dark:text-stone-300 whitespace-pre-wrap break-words overflow-x-auto">
                <JsonHighlight value={output} />
              </pre>
            </CollapsibleSection>
          </div>
        )}
      </div>
    );
  }

  const isLong = stringOutput.length > maxPreviewLength;

  return (
    <div
      className={clsx(
        'bg-stone-50 dark:bg-stone-900/50 rounded-lg border border-stone-200 dark:border-stone-700',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-stone-200 dark:border-stone-700">
        <div className="flex items-center gap-2">
          {outputType === 'json' ? (
            <Database className="w-4 h-4 text-indigo-500" />
          ) : (
            <FileText className="w-4 h-4 text-stone-500" />
          )}
          <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">
            Output
          </span>
        </div>
        <button
          onClick={copyOutput}
          className="p-1.5 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition-colors"
          title="Copy output"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-stone-400" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-3 overflow-x-auto">
        <pre className="text-xs font-mono text-stone-700 dark:text-stone-300 whitespace-pre-wrap break-words">
          {showFull || !isLong ? (
            outputType === 'json' ? (
              <JsonHighlight value={output} />
            ) : (
              stringOutput
            )
          ) : (
            <>
              {outputType === 'json' ? (
                stringOutput.slice(0, maxPreviewLength)
              ) : (
                stringOutput.slice(0, maxPreviewLength)
              )}
              <span className="text-stone-400">...</span>
              <button
                onClick={() => setShowFull(true)}
                className="ml-2 text-teal-500 hover:text-teal-600 font-medium underline"
              >
                show more ({Math.ceil((stringOutput.length - maxPreviewLength) / 1000)}k more)
              </button>
            </>
          )}
        </pre>
      </div>
    </div>
  );
}

export default ToolOutput;
