'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Copy,
  Download,
  Play,
  Check,
  ChevronDown,
  Maximize2,
  Minimize2,
  Code2,
  FileText,
} from 'lucide-react';
import clsx from 'clsx';

/**
 * Supported programming languages for syntax highlighting
 */
export type CodeLanguage =
  | 'typescript' | 'javascript' | 'tsx' | 'jsx'
  | 'python' | 'java' | 'cpp' | 'c' | 'csharp'
  | 'go' | 'rust' | 'php' | 'ruby' | 'swift'
  | 'kotlin' | 'sql' | 'html' | 'css' | 'scss'
  | 'json' | 'yaml' | 'xml' | 'markdown'
  | 'bash' | 'shell' | 'powershell'
  | 'plaintext';

/**
 * Language display names and extensions
 */
const LANGUAGE_INFO: Record<CodeLanguage, { name: string; extension: string }> = {
  typescript: { name: 'TypeScript', extension: 'ts' },
  javascript: { name: 'JavaScript', extension: 'js' },
  tsx: { name: 'TSX', extension: 'tsx' },
  jsx: { name: 'JSX', extension: 'jsx' },
  python: { name: 'Python', extension: 'py' },
  java: { name: 'Java', extension: 'java' },
  cpp: { name: 'C++', extension: 'cpp' },
  c: { name: 'C', extension: 'c' },
  csharp: { name: 'C#', extension: 'cs' },
  go: { name: 'Go', extension: 'go' },
  rust: { name: 'Rust', extension: 'rs' },
  php: { name: 'PHP', extension: 'php' },
  ruby: { name: 'Ruby', extension: 'rb' },
  swift: { name: 'Swift', extension: 'swift' },
  kotlin: { name: 'Kotlin', extension: 'kt' },
  sql: { name: 'SQL', extension: 'sql' },
  html: { name: 'HTML', extension: 'html' },
  css: { name: 'CSS', extension: 'css' },
  scss: { name: 'SCSS', extension: 'scss' },
  json: { name: 'JSON', extension: 'json' },
  yaml: { name: 'YAML', extension: 'yaml' },
  xml: { name: 'XML', extension: 'xml' },
  markdown: { name: 'Markdown', extension: 'md' },
  bash: { name: 'Bash', extension: 'sh' },
  shell: { name: 'Shell', extension: 'sh' },
  powershell: { name: 'PowerShell', extension: 'ps1' },
  plaintext: { name: 'Text', extension: 'txt' },
};

/**
 * Syntax highlighting color schemes by token type
 */
const SYNTAX_COLORS = {
  keyword: 'text-teal-400',
  string: 'text-green-400',
  comment: 'text-stone-400',
  function: 'text-blue-400',
  number: 'text-orange-400',
  operator: 'text-pink-400',
  variable: 'text-cyan-400',
  type: 'text-yellow-400',
};

export interface CodeArtifactProps {
  /** Unique identifier for the artifact */
  id: string;
  /** Code content to display */
  content: string;
  /** Programming language for syntax highlighting */
  language?: CodeLanguage;
  /** Optional filename */
  filename?: string;
  /** Optional title */
  title?: string;
  /** Whether the code is editable */
  editable?: boolean;
  /** Callback when code changes */
  onChange?: (newContent: string) => void;
  /** Callback when run button is clicked */
  onRun?: (code: string) => void;
  /** Whether to show line numbers */
  showLineNumbers?: boolean;
  /** Maximum height before scrolling */
  maxHeight?: string;
  /** Whether to start in fullscreen */
  fullscreen?: boolean;
}

/**
 * Code artifact display component with Monaco-style editor
 * Features: syntax highlighting, copy/download/run, line numbers, language selector
 */
export default function CodeArtifact({
  id,
  content,
  language = 'plaintext',
  filename,
  title,
  editable = false,
  onChange,
  onRun,
  showLineNumbers = true,
  maxHeight = '600px',
  fullscreen: initialFullscreen = false,
}: CodeArtifactProps) {
  const [copied, setCopied] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<CodeLanguage>(language);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(initialFullscreen);
  const [localContent, setLocalContent] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync external content changes
  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(localContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Handle download as file
  const handleDownload = () => {
    const langInfo = LANGUAGE_INFO[selectedLanguage];
    const downloadFilename = filename || `${title || 'artifact'}.${langInfo.extension}`;

    const blob = new Blob([localContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle run code
  const handleRun = () => {
    if (onRun) {
      onRun(localContent);
    }
  };

  // Handle content changes
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setLocalContent(newContent);
    onChange?.(newContent);
  };

  // Handle language selection
  const handleLanguageSelect = (lang: CodeLanguage) => {
    setSelectedLanguage(lang);
    setShowLanguageMenu(false);
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Calculate line numbers
  const lines = localContent.split('\n');
  const lineNumberWidth = String(lines.length).length;

  // Simple syntax highlighting (basic token detection)
  const highlightedLines = lines.map((line) => highlightLine(line, selectedLanguage));

  return (
    <div
      className={clsx(
        'code-artifact flex flex-col bg-white rounded-2xl border border-stone-200 overflow-hidden',
        isFullscreen && 'fixed inset-0 z-50 rounded-none m-0'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-stone-100/50 border-b border-stone-200">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Code2 className="w-5 h-5 text-indigo-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">
              {title || filename || 'Code Artifact'}
            </h3>
            <p className="text-xs text-stone-400">
              {lines.length} lines · {localContent.length} characters
            </p>
          </div>
        </div>

        {/* Language Selector */}
        <div className="relative">
          <button
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
            className="flex items-center gap-2 px-3 py-1.5 bg-stone-200/50 hover:bg-stone-200 rounded-lg text-sm transition-colors tap-target"
          >
            <span className="text-stone-700">{LANGUAGE_INFO[selectedLanguage].name}</span>
            <ChevronDown className="w-4 h-4 text-stone-500" />
          </button>

          {/* Language Dropdown */}
          {showLanguageMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowLanguageMenu(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-48 max-h-64 overflow-y-auto bg-stone-100 border border-stone-200 rounded-lg shadow-xl z-20 scroll-container">
                {(Object.keys(LANGUAGE_INFO) as CodeLanguage[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => handleLanguageSelect(lang)}
                    className={clsx(
                      'w-full px-4 py-2 text-left text-sm hover:bg-stone-200 transition-colors',
                      selectedLanguage === lang && 'bg-indigo-600/20 text-indigo-400'
                    )}
                  >
                    {LANGUAGE_INFO[lang].name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-stone-100/30 border-b border-stone-200/50">
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-1.5 bg-stone-200/50 hover:bg-stone-200 rounded-lg text-sm transition-colors tap-target"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy</span>
            </>
          )}
        </button>

        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-3 py-1.5 bg-stone-200/50 hover:bg-stone-200 rounded-lg text-sm transition-colors tap-target"
          aria-label="Download file"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Download</span>
        </button>

        {onRun && (
          <button
            onClick={handleRun}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-lg text-sm transition-colors tap-target"
            aria-label="Run code"
          >
            <Play className="w-4 h-4" />
            <span className="hidden sm:inline">Run</span>
          </button>
        )}

        <div className="flex-1" />

        <button
          onClick={toggleFullscreen}
          className="flex items-center gap-2 px-3 py-1.5 bg-stone-200/50 hover:bg-stone-200 rounded-lg text-sm transition-colors tap-target"
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Code Editor */}
      <div
        className="relative flex-1 overflow-hidden"
        style={{ maxHeight: isFullscreen ? 'none' : maxHeight }}
      >
        {editable ? (
          <div className="flex h-full overflow-auto scroll-container">
            {/* Line Numbers */}
            {showLineNumbers && (
              <div className="flex-shrink-0 px-4 py-4 bg-stone-100/30 text-stone-400 text-sm font-mono select-none border-r border-stone-200/50">
                {lines.map((_, index) => (
                  <div key={index} className="leading-6 text-right" style={{ minWidth: `${lineNumberWidth}ch` }}>
                    {index + 1}
                  </div>
                ))}
              </div>
            )}

            {/* Editable Textarea */}
            <textarea
              ref={textareaRef}
              value={localContent}
              onChange={handleContentChange}
              className="flex-1 px-4 py-4 bg-transparent text-stone-900 font-mono text-sm leading-6 resize-none focus:outline-none"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              style={{
                tabSize: 2,
                WebkitTextSizeAdjust: '100%',
              }}
            />
          </div>
        ) : (
          <div className="flex h-full overflow-auto scroll-container">
            {/* Line Numbers */}
            {showLineNumbers && (
              <div className="flex-shrink-0 px-4 py-4 bg-stone-100/30 text-stone-400 text-sm font-mono select-none border-r border-stone-200/50">
                {lines.map((_, index) => (
                  <div key={index} className="leading-6 text-right" style={{ minWidth: `${lineNumberWidth}ch` }}>
                    {index + 1}
                  </div>
                ))}
              </div>
            )}

            {/* Syntax Highlighted Code */}
            <pre className="flex-1 px-4 py-4 text-sm font-mono leading-6 overflow-x-auto">
              {highlightedLines.map((line, index) => (
                <div key={index}>
                  {line.length > 0 ? line : <br />}
                </div>
              ))}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Simple syntax highlighting for a single line
 * Returns array of React elements with appropriate styling
 */
function highlightLine(line: string, language: CodeLanguage): React.ReactNode[] {
  // Fallback for non-code languages
  if (['plaintext', 'markdown'].includes(language)) {
    return [<span key={0} className="text-stone-700">{line}</span>];
  }

  const tokens: React.ReactNode[] = [];
  let currentIndex = 0;
  let tokenId = 0;

  // Comment detection
  if (language === 'python' || language === 'bash' || language === 'shell' || language === 'ruby') {
    const commentMatch = line.match(/^(\s*)#(.*)$/);
    if (commentMatch) {
      return [
        <span key={0} className="text-stone-700">{commentMatch[1]}</span>,
        <span key={1} className={SYNTAX_COLORS.comment}>#{commentMatch[2]}</span>,
      ];
    }
  } else {
    const commentMatch = line.match(/^(\s*)(\/\/.*)$/);
    if (commentMatch) {
      return [
        <span key={0} className="text-stone-700">{commentMatch[1]}</span>,
        <span key={1} className={SYNTAX_COLORS.comment}>{commentMatch[2]}</span>,
      ];
    }

    const multiLineCommentMatch = line.match(/^(\s*)(\/\*.*?\*\/)(.*)$/);
    if (multiLineCommentMatch) {
      return [
        <span key={0} className="text-stone-700">{multiLineCommentMatch[1]}</span>,
        <span key={1} className={SYNTAX_COLORS.comment}>{multiLineCommentMatch[2]}</span>,
        <span key={2} className="text-stone-700">{multiLineCommentMatch[3]}</span>,
      ];
    }
  }

  // Keywords based on language
  const keywords = getKeywordsForLanguage(language);
  const keywordPattern = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');

  // String detection (simple)
  const stringPattern = /(['"`])(?:(?=(\\?))\2.)*?\1/g;

  // Number detection
  const numberPattern = /\b\d+\.?\d*\b/g;

  // Function call detection
  const functionPattern = /\b([a-zA-Z_]\w*)\s*\(/g;

  // Combine patterns
  const patterns = [
    { regex: stringPattern, className: SYNTAX_COLORS.string },
    { regex: keywordPattern, className: SYNTAX_COLORS.keyword },
    { regex: functionPattern, className: SYNTAX_COLORS.function },
    { regex: numberPattern, className: SYNTAX_COLORS.number },
  ];

  // Simple tokenization
  let remainingLine = line;
  const matches: Array<{ start: number; end: number; className: string; text: string }> = [];

  patterns.forEach(({ regex, className }) => {
    let match;
    const r = new RegExp(regex);
    while ((match = r.exec(line)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        className,
        text: match[0],
      });
    }
  });

  // Sort by start position
  matches.sort((a, b) => a.start - b.start);

  // Build token array
  let lastEnd = 0;
  matches.forEach((match) => {
    // Add plain text before match
    if (match.start > lastEnd) {
      tokens.push(
        <span key={tokenId++} className="text-stone-700">
          {line.substring(lastEnd, match.start)}
        </span>
      );
    }

    // Add matched token
    tokens.push(
      <span key={tokenId++} className={match.className}>
        {match.text}
      </span>
    );

    lastEnd = match.end;
  });

  // Add remaining text
  if (lastEnd < line.length) {
    tokens.push(
      <span key={tokenId++} className="text-stone-700">
        {line.substring(lastEnd)}
      </span>
    );
  }

  return tokens.length > 0 ? tokens : [<span key={0} className="text-stone-700">{line}</span>];
}

/**
 * Get keywords for syntax highlighting based on language
 */
function getKeywordsForLanguage(language: CodeLanguage): string[] {
  const keywordMap: Record<string, string[]> = {
    typescript: ['const', 'let', 'var', 'function', 'class', 'interface', 'type', 'enum', 'import', 'export', 'default', 'async', 'await', 'return', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'throw', 'new', 'this', 'extends', 'implements', 'public', 'private', 'protected', 'static', 'readonly'],
    javascript: ['const', 'let', 'var', 'function', 'class', 'import', 'export', 'default', 'async', 'await', 'return', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'throw', 'new', 'this', 'extends'],
    python: ['def', 'class', 'import', 'from', 'as', 'return', 'if', 'elif', 'else', 'for', 'while', 'break', 'continue', 'try', 'except', 'finally', 'raise', 'with', 'async', 'await', 'lambda', 'yield', 'True', 'False', 'None', 'and', 'or', 'not', 'in', 'is'],
    java: ['public', 'private', 'protected', 'class', 'interface', 'extends', 'implements', 'new', 'return', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'throws', 'static', 'final', 'abstract', 'void', 'int', 'boolean', 'String'],
    go: ['func', 'package', 'import', 'var', 'const', 'type', 'struct', 'interface', 'return', 'if', 'else', 'for', 'range', 'switch', 'case', 'break', 'continue', 'defer', 'go', 'chan', 'select', 'map'],
    rust: ['fn', 'let', 'mut', 'const', 'static', 'struct', 'enum', 'impl', 'trait', 'use', 'mod', 'pub', 'return', 'if', 'else', 'for', 'while', 'loop', 'match', 'break', 'continue', 'async', 'await'],
  };

  return keywordMap[language] || keywordMap.typescript;
}
