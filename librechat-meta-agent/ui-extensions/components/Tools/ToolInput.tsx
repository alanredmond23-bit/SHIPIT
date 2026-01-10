'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import clsx from 'clsx';

// ============================================================================
// Types
// ============================================================================

interface ToolInputProps {
  inputs: Record<string, any>;
  maxPreviewLength?: number;
  showLineNumbers?: boolean;
  className?: string;
}

// ============================================================================
// JSON Syntax Highlighter
// ============================================================================

function SyntaxHighlight({ value }: { value: any }) {
  const renderValue = (val: any, depth: number = 0): React.ReactNode => {
    const indent = '  '.repeat(depth);

    if (val === null) {
      return <span className="text-orange-500">null</span>;
    }

    if (val === undefined) {
      return <span className="text-stone-400">undefined</span>;
    }

    if (typeof val === 'boolean') {
      return <span className="text-purple-500">{val.toString()}</span>;
    }

    if (typeof val === 'number') {
      return <span className="text-blue-500">{val}</span>;
    }

    if (typeof val === 'string') {
      // Check if it's a long string
      if (val.length > 100) {
        return (
          <span className="text-green-600 dark:text-green-400">
            "{val.slice(0, 100)}..."
          </span>
        );
      }
      return (
        <span className="text-green-600 dark:text-green-400">"{val}"</span>
      );
    }

    if (Array.isArray(val)) {
      if (val.length === 0) {
        return <span className="text-stone-500">[]</span>;
      }

      return (
        <span>
          {'[\n'}
          {val.map((item, i) => (
            <span key={i}>
              {indent}  {renderValue(item, depth + 1)}
              {i < val.length - 1 ? ',' : ''}
              {'\n'}
            </span>
          ))}
          {indent}]
        </span>
      );
    }

    if (typeof val === 'object') {
      const keys = Object.keys(val);
      if (keys.length === 0) {
        return <span className="text-stone-500">{'{}'}</span>;
      }

      return (
        <span>
          {'{\n'}
          {keys.map((key, i) => (
            <span key={key}>
              {indent}  <span className="text-teal-600 dark:text-teal-400">"{key}"</span>: {renderValue(val[key], depth + 1)}
              {i < keys.length - 1 ? ',' : ''}
              {'\n'}
            </span>
          ))}
          {indent}{'}'}
        </span>
      );
    }

    return <span>{String(val)}</span>;
  };

  return <>{renderValue(value)}</>;
}

// ============================================================================
// Truncated Preview Component
// ============================================================================

function TruncatedPreview({
  text,
  maxLength,
  onExpand,
}: {
  text: string;
  maxLength: number;
  onExpand: () => void;
}) {
  const isTruncated = text.length > maxLength;
  const displayText = isTruncated ? text.slice(0, maxLength) : text;

  return (
    <div className="relative">
      <pre className="text-xs font-mono text-stone-700 dark:text-stone-300 whitespace-pre-wrap break-words">
        {displayText}
        {isTruncated && (
          <>
            <span className="text-stone-400">...</span>
            <button
              onClick={onExpand}
              className="ml-2 text-teal-500 hover:text-teal-600 font-medium underline"
            >
              show more ({Math.ceil((text.length - maxLength) / 1000)}k more)
            </button>
          </>
        )}
      </pre>
    </div>
  );
}

// ============================================================================
// Collapsible Field Component
// ============================================================================

function CollapsibleField({
  fieldName,
  value,
  defaultExpanded = false,
}: {
  fieldName: string;
  value: any;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const stringValue = useMemo(() => {
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  }, [value]);

  const isLongValue = stringValue.length > 200;

  if (!isLongValue) {
    return (
      <div className="py-2 border-b border-stone-100 dark:border-stone-700/50 last:border-0">
        <div className="flex items-start gap-2">
          <span className="text-xs font-medium text-teal-600 dark:text-teal-400 min-w-[80px]">
            {fieldName}:
          </span>
          <div className="flex-1 text-xs font-mono text-stone-700 dark:text-stone-300">
            {typeof value === 'object' ? (
              <SyntaxHighlight value={value} />
            ) : (
              <span className={typeof value === 'string' ? 'text-green-600 dark:text-green-400' : 'text-blue-500'}>
                {typeof value === 'string' ? `"${value}"` : String(value)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-2 border-b border-stone-100 dark:border-stone-700/50 last:border-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 hover:bg-stone-50 dark:hover:bg-stone-700/50 rounded-lg p-1 -m-1 transition-colors"
      >
        <span className="text-stone-400">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </span>
        <span className="text-xs font-medium text-teal-600 dark:text-teal-400">
          {fieldName}
        </span>
        {!isExpanded && (
          <span className="text-xs text-stone-400 truncate flex-1 text-left">
            {stringValue.slice(0, 50)}...
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="mt-2 ml-5 bg-stone-50 dark:bg-stone-900/50 rounded-lg p-3 overflow-x-auto">
          <pre className="text-xs font-mono text-stone-700 dark:text-stone-300 whitespace-pre-wrap break-words">
            {typeof value === 'object' ? (
              <SyntaxHighlight value={value} />
            ) : (
              stringValue
            )}
          </pre>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main ToolInput Component
// ============================================================================

export function ToolInput({
  inputs,
  maxPreviewLength = 500,
  showLineNumbers = false,
  className,
}: ToolInputProps) {
  const [copied, setCopied] = useState(false);
  const [showFull, setShowFull] = useState(false);

  const jsonString = useMemo(() => {
    return JSON.stringify(inputs, null, 2);
  }, [inputs]);

  const fields = useMemo(() => {
    return Object.entries(inputs);
  }, [inputs]);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isLong = jsonString.length > maxPreviewLength;

  return (
    <div
      className={clsx(
        'bg-stone-50 dark:bg-stone-900/50 rounded-lg border border-stone-200 dark:border-stone-700',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-stone-200 dark:border-stone-700">
        <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">
          Input Parameters
        </span>
        <button
          onClick={copyToClipboard}
          className="p-1.5 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition-colors"
          title="Copy inputs"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-stone-400" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="px-3 py-2">
        {fields.length <= 5 && !isLong ? (
          // Field-by-field view for small objects
          <div>
            {fields.map(([key, value]) => (
              <CollapsibleField key={key} fieldName={key} value={value} />
            ))}
          </div>
        ) : (
          // Full JSON view for complex objects
          <div className="overflow-x-auto">
            {showFull || !isLong ? (
              <pre className="text-xs font-mono text-stone-700 dark:text-stone-300 whitespace-pre-wrap break-words">
                {showLineNumbers ? (
                  jsonString.split('\n').map((line, i) => (
                    <div key={i} className="flex">
                      <span className="text-stone-400 select-none w-8 text-right pr-2">
                        {i + 1}
                      </span>
                      <span>{line}</span>
                    </div>
                  ))
                ) : (
                  <SyntaxHighlight value={inputs} />
                )}
              </pre>
            ) : (
              <TruncatedPreview
                text={jsonString}
                maxLength={maxPreviewLength}
                onExpand={() => setShowFull(true)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ToolInput;
