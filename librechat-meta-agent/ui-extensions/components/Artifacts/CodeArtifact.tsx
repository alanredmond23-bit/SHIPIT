'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Copy,
  Check,
  Download,
  ExternalLink,
  ChevronDown,
  WrapText,
} from 'lucide-react';
import clsx from 'clsx';
import {
  type CodeLanguage,
  LANGUAGE_DISPLAY_NAMES,
  detectLanguage,
  getExtensionForLanguage,
  normalizeIndentation,
} from '@/lib/artifacts';

// ============================================================================
// Types
// ============================================================================

export interface CodeArtifactProps {
  content: string;
  language?: CodeLanguage;
  filename?: string;
  title?: string;
  showLineNumbers?: boolean;
  maxHeight?: string;
  onCopy?: () => void;
  onDownload?: () => void;
  onOpenInEditor?: () => void;
  className?: string;
}

// ============================================================================
// Custom theme based on oneDark but matching our design
// ============================================================================

const customTheme = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    background: '#1a1a1a',
    fontSize: '13px',
    lineHeight: '1.6',
    margin: 0,
    padding: '16px',
  },
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    background: 'transparent',
  },
};

// ============================================================================
// Component
// ============================================================================

export function CodeArtifact({
  content,
  language: providedLanguage,
  filename,
  title,
  showLineNumbers = true,
  maxHeight = '500px',
  onCopy,
  onDownload,
  onOpenInEditor,
  className,
}: CodeArtifactProps) {
  const [copied, setCopied] = useState(false);
  const [wrapLines, setWrapLines] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<CodeLanguage | undefined>(
    providedLanguage
  );

  // Normalize and process the code
  const normalizedCode = useMemo(() => normalizeIndentation(content), [content]);

  // Detect language if not provided
  const detectedLanguage = useMemo(
    () => selectedLanguage || detectLanguage(normalizedCode, filename),
    [selectedLanguage, normalizedCode, filename]
  );

  // Line count
  const lineCount = useMemo(
    () => normalizedCode.split('\n').length,
    [normalizedCode]
  );

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(normalizedCode);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [normalizedCode, onCopy]);

  // Download file
  const handleDownload = useCallback(() => {
    const blob = new Blob([normalizedCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `code.${getExtensionForLanguage(detectedLanguage)}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onDownload?.();
  }, [normalizedCode, filename, detectedLanguage, onDownload]);

  // Map our language to syntax highlighter language
  const highlighterLanguage = useMemo(() => {
    const mapping: Partial<Record<CodeLanguage, string>> = {
      javascript: 'javascript',
      typescript: 'typescript',
      jsx: 'jsx',
      tsx: 'tsx',
      python: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      csharp: 'csharp',
      go: 'go',
      rust: 'rust',
      ruby: 'ruby',
      php: 'php',
      swift: 'swift',
      kotlin: 'kotlin',
      scala: 'scala',
      r: 'r',
      sql: 'sql',
      html: 'markup',
      css: 'css',
      scss: 'scss',
      less: 'less',
      json: 'json',
      yaml: 'yaml',
      xml: 'markup',
      markdown: 'markdown',
      bash: 'bash',
      shell: 'bash',
      powershell: 'powershell',
      dockerfile: 'docker',
      graphql: 'graphql',
      plaintext: 'text',
    };
    return mapping[detectedLanguage] || 'text';
  }, [detectedLanguage]);

  return (
    <div className={clsx('rounded-xl overflow-hidden bg-[#1a1a1a] border border-stone-800', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-stone-900 border-b border-stone-800">
        <div className="flex items-center gap-3">
          {/* Title or filename */}
          <span className="text-sm font-medium text-stone-300">
            {title || filename || 'Code'}
          </span>

          {/* Language selector */}
          <div className="relative">
            <button
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-stone-400 hover:text-stone-300 bg-stone-800 hover:bg-stone-700 rounded-md transition-colors"
            >
              {LANGUAGE_DISPLAY_NAMES[detectedLanguage]}
              <ChevronDown className="w-3 h-3" />
            </button>

            {/* Language dropdown */}
            {showLanguageMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowLanguageMenu(false)}
                />
                <div className="absolute top-full left-0 mt-1 w-48 max-h-64 overflow-y-auto bg-stone-800 border border-stone-700 rounded-lg shadow-xl z-50 py-1">
                  {(Object.entries(LANGUAGE_DISPLAY_NAMES) as [CodeLanguage, string][]).map(
                    ([lang, displayName]) => (
                      <button
                        key={lang}
                        onClick={() => {
                          setSelectedLanguage(lang);
                          setShowLanguageMenu(false);
                        }}
                        className={clsx(
                          'w-full text-left px-3 py-1.5 text-sm transition-colors',
                          lang === detectedLanguage
                            ? 'bg-teal-600 text-white'
                            : 'text-stone-300 hover:bg-stone-700'
                        )}
                      >
                        {displayName}
                      </button>
                    )
                  )}
                </div>
              </>
            )}
          </div>

          {/* Line count */}
          <span className="text-xs text-stone-500">
            {lineCount} line{lineCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Wrap toggle */}
          <button
            onClick={() => setWrapLines(!wrapLines)}
            className={clsx(
              'p-1.5 rounded-md transition-colors',
              wrapLines
                ? 'bg-teal-600 text-white'
                : 'text-stone-400 hover:text-stone-300 hover:bg-stone-800'
            )}
            title={wrapLines ? 'Disable line wrap' : 'Enable line wrap'}
          >
            <WrapText className="w-4 h-4" />
          </button>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="p-1.5 text-stone-400 hover:text-stone-300 hover:bg-stone-800 rounded-md transition-colors"
            title="Copy code"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>

          {/* Download button */}
          <button
            onClick={handleDownload}
            className="p-1.5 text-stone-400 hover:text-stone-300 hover:bg-stone-800 rounded-md transition-colors"
            title="Download file"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Open in editor button */}
          {onOpenInEditor && (
            <button
              onClick={onOpenInEditor}
              className="p-1.5 text-stone-400 hover:text-stone-300 hover:bg-stone-800 rounded-md transition-colors"
              title="Open in editor"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Code content */}
      <div
        className="overflow-auto"
        style={{ maxHeight }}
      >
        <SyntaxHighlighter
          language={highlighterLanguage}
          style={customTheme}
          showLineNumbers={showLineNumbers}
          wrapLines={wrapLines}
          wrapLongLines={wrapLines}
          lineNumberStyle={{
            minWidth: '3em',
            paddingRight: '1em',
            color: '#4a4a4a',
            textAlign: 'right',
            userSelect: 'none',
          }}
          customStyle={{
            margin: 0,
            borderRadius: 0,
          }}
        >
          {normalizedCode}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

export default CodeArtifact;
