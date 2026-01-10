'use client';

import React, { useState, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Copy,
  Check,
  Download,
  Code2,
  Eye,
  ExternalLink,
} from 'lucide-react';
import clsx from 'clsx';

// ============================================================================
// Types
// ============================================================================

export interface MarkdownArtifactProps {
  content: string;
  title?: string;
  maxHeight?: string;
  onCopy?: () => void;
  onDownload?: () => void;
  className?: string;
}

type ViewMode = 'preview' | 'code';

// ============================================================================
// Custom Code Block Component
// ============================================================================

interface CodeBlockProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

function CodeBlock({ inline, className, children, ...props }: CodeBlockProps) {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const codeString = String(children).replace(/\n$/, '');

  if (inline) {
    return (
      <code className="px-1.5 py-0.5 bg-stone-200 dark:bg-stone-700 text-pink-600 dark:text-pink-400 rounded text-sm font-mono">
        {children}
      </code>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden my-4 border border-stone-200 dark:border-stone-700">
      {language && (
        <div className="px-4 py-2 bg-stone-100 dark:bg-stone-800 text-xs text-stone-500 dark:text-stone-400 font-medium uppercase">
          {language}
        </div>
      )}
      <SyntaxHighlighter
        style={oneDark}
        language={language || 'text'}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: 0,
          padding: '16px',
        }}
        {...props}
      >
        {codeString}
      </SyntaxHighlighter>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function MarkdownArtifact({
  content,
  title = 'Document',
  maxHeight = '500px',
  onCopy,
  onDownload,
  className,
}: MarkdownArtifactProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [copied, setCopied] = useState(false);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [content, onCopy]);

  // Download markdown file
  const handleDownload = useCallback(() => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onDownload?.();
  }, [content, title, onDownload]);

  // Custom components for ReactMarkdown
  const components = useMemo(() => ({
    code: CodeBlock,
    h1: ({ children, ...props }: any) => (
      <h1 className="text-2xl font-bold text-stone-900 dark:text-white mt-6 mb-4 pb-2 border-b border-stone-200 dark:border-stone-700" {...props}>
        {children}
      </h1>
    ),
    h2: ({ children, ...props }: any) => (
      <h2 className="text-xl font-semibold text-stone-900 dark:text-white mt-5 mb-3" {...props}>
        {children}
      </h2>
    ),
    h3: ({ children, ...props }: any) => (
      <h3 className="text-lg font-semibold text-stone-900 dark:text-white mt-4 mb-2" {...props}>
        {children}
      </h3>
    ),
    h4: ({ children, ...props }: any) => (
      <h4 className="text-base font-semibold text-stone-900 dark:text-white mt-4 mb-2" {...props}>
        {children}
      </h4>
    ),
    p: ({ children, ...props }: any) => (
      <p className="text-stone-700 dark:text-stone-300 leading-relaxed mb-4" {...props}>
        {children}
      </p>
    ),
    ul: ({ children, ...props }: any) => (
      <ul className="list-disc list-inside text-stone-700 dark:text-stone-300 mb-4 space-y-1" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }: any) => (
      <ol className="list-decimal list-inside text-stone-700 dark:text-stone-300 mb-4 space-y-1" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }: any) => (
      <li className="text-stone-700 dark:text-stone-300" {...props}>
        {children}
      </li>
    ),
    blockquote: ({ children, ...props }: any) => (
      <blockquote className="border-l-4 border-teal-500 pl-4 my-4 italic text-stone-600 dark:text-stone-400" {...props}>
        {children}
      </blockquote>
    ),
    a: ({ href, children, ...props }: any) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1"
        {...props}
      >
        {children}
        <ExternalLink className="w-3 h-3" />
      </a>
    ),
    table: ({ children, ...props }: any) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full divide-y divide-stone-200 dark:divide-stone-700 border border-stone-200 dark:border-stone-700 rounded-lg" {...props}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }: any) => (
      <thead className="bg-stone-100 dark:bg-stone-800" {...props}>
        {children}
      </thead>
    ),
    th: ({ children, ...props }: any) => (
      <th className="px-4 py-2 text-left text-sm font-semibold text-stone-900 dark:text-white" {...props}>
        {children}
      </th>
    ),
    td: ({ children, ...props }: any) => (
      <td className="px-4 py-2 text-sm text-stone-700 dark:text-stone-300 border-t border-stone-200 dark:border-stone-700" {...props}>
        {children}
      </td>
    ),
    hr: ({ ...props }: any) => (
      <hr className="my-6 border-stone-200 dark:border-stone-700" {...props} />
    ),
    img: ({ src, alt, ...props }: any) => (
      <img
        src={src}
        alt={alt}
        className="max-w-full h-auto rounded-lg my-4 border border-stone-200 dark:border-stone-700"
        {...props}
      />
    ),
  }), []);

  return (
    <div className={clsx('rounded-xl overflow-hidden bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-stone-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-3">
          {/* Title */}
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">{title}</span>

          {/* View mode toggle */}
          <div className="flex items-center bg-stone-200 dark:bg-stone-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('preview')}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors',
                viewMode === 'preview'
                  ? 'bg-white dark:bg-teal-600 text-stone-900 dark:text-white shadow-sm'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
              )}
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors',
                viewMode === 'code'
                  ? 'bg-white dark:bg-teal-600 text-stone-900 dark:text-white shadow-sm'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
              )}
            >
              <Code2 className="w-3.5 h-3.5" />
              Source
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="p-1.5 text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-md transition-colors"
            title="Copy markdown"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>

          {/* Download button */}
          <button
            onClick={handleDownload}
            className="p-1.5 text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-md transition-colors"
            title="Download markdown"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className="overflow-auto"
        style={{ maxHeight }}
      >
        {viewMode === 'preview' ? (
          <div className="p-6 prose prose-stone dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={components}
            >
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <pre className="p-4 text-sm font-mono text-stone-700 dark:text-stone-300 bg-stone-50 dark:bg-[#1a1a1a] overflow-auto whitespace-pre-wrap">
            {content}
          </pre>
        )}
      </div>
    </div>
  );
}

export default MarkdownArtifact;
