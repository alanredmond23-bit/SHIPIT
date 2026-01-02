'use client';

import { useState } from 'react';
import {
  Search,
  Code,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Copy,
  ChevronDown,
  ChevronRight,
  Terminal,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';

// Tool Result Types
interface BaseToolResult {
  id: string;
  toolName: string;
  timestamp: string;
  success: boolean;
  duration: number;
  error?: string;
}

interface WebSearchResult extends BaseToolResult {
  type: 'web_search';
  data: {
    query: string;
    totalResults: number;
    results: Array<{
      title: string;
      url: string;
      snippet: string;
      displayUrl: string;
      datePublished?: string;
    }>;
    relatedSearches?: string[];
  };
}

interface CodeExecutionResult extends BaseToolResult {
  type: 'code_executor';
  data: {
    language: string;
    stdout: string;
    stderr: string;
    exitCode: number | null;
    executionTime: number;
    timedOut: boolean;
  };
}

type ToolResult = WebSearchResult | CodeExecutionResult;

interface ToolResultProps {
  result: ToolResult | null;
  loading?: boolean;
  error?: string;
}

/**
 * Display tool execution results with formatting
 */
export default function ToolResult({ result, loading, error }: ToolResultProps) {
  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  if (!result) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4">
      <ResultHeader result={result} />

      {result.type === 'web_search' && <WebSearchDisplay result={result} />}
      {result.type === 'code_executor' && <CodeExecutionDisplay result={result} />}
    </div>
  );
}

/**
 * Result header with metadata
 */
function ResultHeader({ result }: { result: ToolResult }) {
  const [copied, setCopied] = useState(false);

  const copyResultId = () => {
    navigator.clipboard.writeText(result.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {result.success ? (
            <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 text-red-400 mt-0.5" />
          )}
          <div>
            <div className="font-semibold text-white">
              {result.toolName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
              <Clock className="w-3 h-3" />
              <span>{result.duration}ms</span>
              <span>•</span>
              <span>{new Date(result.timestamp).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={copyResultId}
                className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                {copied ? 'Copied!' : result.id.slice(0, 8)}
              </button>
            </div>
          </div>
        </div>
        <div
          className={clsx(
            'px-3 py-1 rounded-full text-xs font-medium',
            result.success
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          )}
        >
          {result.success ? 'Success' : 'Failed'}
        </div>
      </div>

      {result.error && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
            <div className="text-sm text-red-300">{result.error}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Display web search results
 */
function WebSearchDisplay({ result }: { result: WebSearchResult }) {
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set([0]));

  const toggleResult = (index: number) => {
    const next = new Set(expandedResults);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setExpandedResults(next);
  };

  return (
    <div className="space-y-3">
      {/* Search Query */}
      <div className="card">
        <div className="flex items-center gap-2 text-slate-300 mb-2">
          <Search className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-medium">Search Query</span>
        </div>
        <div className="text-white font-mono text-sm bg-slate-800 p-3 rounded-lg">
          {result.data.query}
        </div>
        <div className="text-xs text-slate-500 mt-2">
          {result.data.totalResults} results found
        </div>
      </div>

      {/* Search Results */}
      <div className="space-y-2">
        {result.data.results.map((item, index) => (
          <div key={index} className="card">
            <button
              onClick={() => toggleResult(index)}
              className="w-full text-left flex items-start justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  {expandedResults.has(index) ? (
                    <ChevronDown className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white truncate">{item.title}</h3>
                    <div className="text-xs text-indigo-400 mt-0.5">{item.displayUrl}</div>
                  </div>
                </div>

                {expandedResults.has(index) && (
                  <div className="mt-3 ml-6 space-y-2">
                    <p className="text-sm text-slate-300 leading-relaxed">{item.snippet}</p>
                    {item.datePublished && (
                      <div className="text-xs text-slate-500">
                        Published: {new Date(item.datePublished).toLocaleDateString()}
                      </div>
                    )}
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Visit Page
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </button>
          </div>
        ))}
      </div>

      {/* Related Searches */}
      {result.data.relatedSearches && result.data.relatedSearches.length > 0 && (
        <div className="card">
          <div className="text-sm font-medium text-slate-300 mb-2">Related Searches</div>
          <div className="flex flex-wrap gap-2">
            {result.data.relatedSearches.map((search, index) => (
              <div
                key={index}
                className="px-3 py-1 bg-slate-800 rounded-full text-xs text-slate-300"
              >
                {search}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Display code execution results
 */
function CodeExecutionDisplay({ result }: { result: CodeExecutionResult }) {
  const [activeTab, setActiveTab] = useState<'stdout' | 'stderr'>('stdout');
  const [copied, setCopied] = useState(false);

  const copyOutput = () => {
    const output = activeTab === 'stdout' ? result.data.stdout : result.data.stderr;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      {/* Execution Info */}
      <div className="card">
        <div className="flex items-center gap-2 text-slate-300 mb-3">
          <Code className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-medium">Code Execution</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-slate-500">Language</div>
            <div className="text-sm text-white mt-1 capitalize">{result.data.language}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Execution Time</div>
            <div className="text-sm text-white mt-1">{result.data.executionTime}ms</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Exit Code</div>
            <div
              className={clsx(
                'text-sm mt-1',
                result.data.exitCode === 0 ? 'text-green-400' : 'text-red-400'
              )}
            >
              {result.data.exitCode ?? 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Status</div>
            <div className="text-sm mt-1">
              {result.data.timedOut ? (
                <span className="text-amber-400">Timed Out</span>
              ) : result.success ? (
                <span className="text-green-400">Completed</span>
              ) : (
                <span className="text-red-400">Failed</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Output Display */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('stdout')}
              className={clsx(
                'px-3 py-1 rounded-lg text-sm font-medium transition-colors',
                activeTab === 'stdout'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              )}
            >
              <div className="flex items-center gap-2">
                <Terminal className="w-3 h-3" />
                stdout
              </div>
            </button>
            <button
              onClick={() => setActiveTab('stderr')}
              className={clsx(
                'px-3 py-1 rounded-lg text-sm font-medium transition-colors',
                activeTab === 'stderr'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              )}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-3 h-3" />
                stderr
              </div>
            </button>
          </div>
          <button
            onClick={copyOutput}
            className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Copy className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="bg-slate-950 rounded-lg p-4 overflow-x-auto">
          <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap break-words">
            {activeTab === 'stdout'
              ? result.data.stdout || '(no output)'
              : result.data.stderr || '(no errors)'}
          </pre>
        </div>

        {copied && (
          <div className="text-xs text-green-400 mt-2">Copied to clipboard!</div>
        )}
      </div>
    </div>
  );
}

/**
 * Loading state
 */
function LoadingState() {
  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
        <div>
          <div className="font-medium text-white">Executing tool...</div>
          <div className="text-sm text-slate-400 mt-1">Please wait</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Error state
 */
function ErrorState({ error }: { error: string }) {
  return (
    <div className="card">
      <div className="flex items-start gap-3">
        <XCircle className="w-5 h-5 text-red-400 mt-0.5" />
        <div>
          <div className="font-medium text-red-400">Tool Execution Failed</div>
          <div className="text-sm text-slate-300 mt-2">{error}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Empty state
 */
function EmptyState() {
  return (
    <div className="card text-center py-8">
      <div className="text-slate-500">
        <Code className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No tool results to display</p>
        <p className="text-sm mt-1">Execute a tool to see results here</p>
      </div>
    </div>
  );
}
