'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wrench,
  Search,
  Code,
  Play,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  ChevronRight,
  Server,
  Zap,
} from 'lucide-react';
import clsx from 'clsx';
import ToolResult from '@/components/Tools/ToolResult';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100';

// API functions
const api = {
  getTools: () => fetch(`${API_BASE}/api/tools`).then(r => r.json()),
  getToolHistory: () => fetch(`${API_BASE}/api/tools/history`).then(r => r.json()),
  executeWebSearch: (query: string, maxResults: number = 10) =>
    fetch(`${API_BASE}/api/tools/web-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, maxResults }),
    }).then(r => r.json()),
  executeCode: (language: string, code: string, timeout: number = 5000) =>
    fetch(`${API_BASE}/api/tools/code-executor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language, code, timeout }),
    }).then(r => r.json()),
  getServers: () => fetch(`${API_BASE}/api/tools/servers`).then(r => r.json()),
};

type View = 'tools' | 'test' | 'history' | 'settings';

export default function ToolsPage() {
  const [activeView, setActiveView] = useState<View>('tools');

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-lg border-b border-slate-800 px-4 py-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 rounded-xl">
              <Wrench className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">MCP Tools</h1>
              <p className="text-sm text-slate-400">Model Context Protocol Integration</p>
            </div>
          </div>

          {/* View Tabs */}
          <div className="flex gap-2 mt-4 overflow-x-auto">
            {[
              { id: 'tools', label: 'Available Tools' },
              { id: 'test', label: 'Test Tools' },
              { id: 'history', label: 'History' },
              { id: 'settings', label: 'Settings' },
            ].map((view) => (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id as View)}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                  activeView === view.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                )}
              >
                {view.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-4 pb-8">
        {activeView === 'tools' && <ToolsListView />}
        {activeView === 'test' && <TestToolsView />}
        {activeView === 'history' && <HistoryView />}
        {activeView === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}

/**
 * Tools List View - Display available tools
 */
function ToolsListView() {
  const { data: tools, isLoading } = useQuery({
    queryKey: ['tools'],
    queryFn: api.getTools,
    refetchInterval: 10000,
  });

  const { data: servers } = useQuery({
    queryKey: ['tool-servers'],
    queryFn: api.getServers,
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Server Status */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-5 h-5 text-indigo-400" />
          <h2 className="font-semibold text-white">MCP Servers</h2>
        </div>
        <div className="space-y-2">
          {servers?.data?.map((server: any) => (
            <div
              key={server.id}
              className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
            >
              <div>
                <div className="font-medium text-white">{server.name}</div>
                <div className="text-xs text-slate-500">{server.url}</div>
              </div>
              <div
                className={clsx(
                  'px-3 py-1 rounded-full text-xs font-medium',
                  server.status === 'connected'
                    ? 'bg-green-500/20 text-green-400'
                    : server.status === 'error'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-slate-600/20 text-slate-400'
                )}
              >
                {server.status}
              </div>
            </div>
          )) || (
            <div className="text-center py-4 text-slate-500">No servers connected</div>
          )}
        </div>
      </div>

      {/* Available Tools */}
      <div>
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-indigo-400" />
          Available Tools ({tools?.data?.length || 0})
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {tools?.data?.map((tool: any) => (
            <ToolCard key={tool.name} tool={tool} />
          )) || (
            <div className="col-span-2 text-center py-8 text-slate-500">
              No tools available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Individual Tool Card
 */
function ToolCard({ tool }: { tool: any }) {
  const [expanded, setExpanded] = useState(false);

  const getToolIcon = (name: string) => {
    if (name.includes('search')) return Search;
    if (name.includes('code')) return Code;
    return Wrench;
  };

  const Icon = getToolIcon(tool.name);

  return (
    <div className="card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-indigo-600/20 rounded-lg">
            <Icon className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-white">
                {tool.name.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </h3>
              <ChevronRight
                className={clsx(
                  'w-4 h-4 text-slate-400 transition-transform',
                  expanded && 'rotate-90'
                )}
              />
            </div>
            <p className="text-sm text-slate-400 mt-1 line-clamp-2">
              {tool.description}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 bg-slate-800 rounded text-xs text-slate-400">
                {tool.server}
              </span>
            </div>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-slate-800">
            <div className="text-sm text-slate-300">
              <div className="font-medium mb-2">Input Schema</div>
              <pre className="bg-slate-950 p-3 rounded-lg overflow-x-auto text-xs">
                {JSON.stringify(tool.inputSchema || {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </button>
    </div>
  );
}

/**
 * Test Tools View - Interactive testing
 */
function TestToolsView() {
  const [selectedTool, setSelectedTool] = useState<'web_search' | 'code_executor'>('web_search');
  const [testResult, setTestResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="font-semibold text-white mb-4">Select Tool to Test</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedTool('web_search')}
            className={clsx(
              'flex-1 p-4 rounded-xl transition-colors',
              selectedTool === 'web_search'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            )}
          >
            <Search className="w-6 h-6 mx-auto mb-2" />
            <div className="text-sm font-medium">Web Search</div>
          </button>
          <button
            onClick={() => setSelectedTool('code_executor')}
            className={clsx(
              'flex-1 p-4 rounded-xl transition-colors',
              selectedTool === 'code_executor'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            )}
          >
            <Code className="w-6 h-6 mx-auto mb-2" />
            <div className="text-sm font-medium">Code Executor</div>
          </button>
        </div>
      </div>

      {selectedTool === 'web_search' && (
        <WebSearchTest
          onExecute={(result: unknown) => {
            setTestResult(result);
            setIsExecuting(false);
          }}
          onStart={() => setIsExecuting(true)}
        />
      )}

      {selectedTool === 'code_executor' && (
        <CodeExecutorTest
          onExecute={(result: unknown) => {
            setTestResult(result);
            setIsExecuting(false);
          }}
          onStart={() => setIsExecuting(true)}
        />
      )}

      {/* Result Display */}
      {testResult && (
        <div>
          <h2 className="font-semibold text-white mb-4">Execution Result</h2>
          <ToolResult result={testResult} loading={isExecuting} />
        </div>
      )}
    </div>
  );
}

/**
 * Web Search Test Component
 */
function WebSearchTest({ onExecute, onStart }: any) {
  const [query, setQuery] = useState('');
  const [maxResults, setMaxResults] = useState(5);

  const executeMutation = useMutation({
    mutationFn: () => api.executeWebSearch(query, maxResults),
    onMutate: () => onStart(),
    onSuccess: (data) => {
      onExecute({
        id: Date.now().toString(),
        type: 'web_search',
        toolName: 'web_search',
        success: true,
        timestamp: new Date().toISOString(),
        duration: data.duration || 0,
        data: data.data,
      });
    },
    onError: (error: any) => {
      onExecute({
        id: Date.now().toString(),
        type: 'web_search',
        toolName: 'web_search',
        success: false,
        timestamp: new Date().toISOString(),
        duration: 0,
        error: error.message,
        data: { query, totalResults: 0, results: [] },
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      executeMutation.mutate();
    }
  };

  return (
    <div className="card">
      <h2 className="font-semibold text-white mb-4">Test Web Search</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-2">Search Query</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter search query..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-2">
            Max Results: {maxResults}
          </label>
          <input
            type="range"
            min="1"
            max="20"
            value={maxResults}
            onChange={(e) => setMaxResults(parseInt(e.target.value))}
            className="w-full"
          />
        </div>
        <button
          type="submit"
          disabled={!query.trim() || executeMutation.isPending}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {executeMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Execute Search
            </>
          )}
        </button>
      </form>
    </div>
  );
}

/**
 * Code Executor Test Component
 */
function CodeExecutorTest({ onExecute, onStart }: any) {
  const [language, setLanguage] = useState<'python' | 'javascript'>('python');
  const [code, setCode] = useState('print("Hello, World!")');
  const [timeout, setTimeout] = useState(5000);

  const executeMutation = useMutation({
    mutationFn: () => api.executeCode(language, code, timeout),
    onMutate: () => onStart(),
    onSuccess: (data) => {
      onExecute({
        id: data.data.id,
        type: 'code_executor',
        toolName: 'code_executor',
        success: data.data.success,
        timestamp: data.data.timestamp,
        duration: data.data.executionTime,
        data: data.data,
      });
    },
    onError: (error: any) => {
      onExecute({
        id: Date.now().toString(),
        type: 'code_executor',
        toolName: 'code_executor',
        success: false,
        timestamp: new Date().toISOString(),
        duration: 0,
        error: error.message,
        data: { language, stdout: '', stderr: error.message, exitCode: null, executionTime: 0, timedOut: false },
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      executeMutation.mutate();
    }
  };

  const examples = {
    python: 'print("Hello, World!")\nfor i in range(5):\n    print(f"Number: {i}")',
    javascript: 'console.log("Hello, World!");\nfor (let i = 0; i < 5; i++) {\n  console.log(`Number: ${i}`);\n}',
  };

  return (
    <div className="card">
      <h2 className="font-semibold text-white mb-4">Test Code Executor</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-2">Language</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setLanguage('python');
                setCode(examples.python);
              }}
              className={clsx(
                'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                language === 'python'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              )}
            >
              Python
            </button>
            <button
              type="button"
              onClick={() => {
                setLanguage('javascript');
                setCode(examples.javascript);
              }}
              className={clsx(
                'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                language === 'javascript'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              )}
            >
              JavaScript
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-2">Code</label>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter code to execute..."
            rows={8}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-2">
            Timeout: {timeout}ms
          </label>
          <input
            type="range"
            min="1000"
            max="30000"
            step="1000"
            value={timeout}
            onChange={(e) => setTimeout(parseInt(e.target.value))}
            className="w-full"
          />
        </div>
        <button
          type="submit"
          disabled={!code.trim() || executeMutation.isPending}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {executeMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Executing...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Execute Code
            </>
          )}
        </button>
      </form>
    </div>
  );
}

/**
 * History View - Show execution history
 */
function HistoryView() {
  const { data: history, isLoading } = useQuery({
    queryKey: ['tool-history'],
    queryFn: api.getToolHistory,
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-indigo-400" />
        Execution History
      </h2>
      {history?.data?.map((item: any) => (
        <div key={item.id} className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {item.success ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400" />
              )}
              <div>
                <div className="font-medium text-white">
                  {item.toolName.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </div>
                <div className="text-xs text-slate-500">
                  {new Date(item.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="text-sm text-slate-400">{item.duration}ms</div>
          </div>
        </div>
      )) || (
        <div className="text-center py-12 text-slate-500">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No execution history</p>
        </div>
      )}
    </div>
  );
}

/**
 * Settings View - Tool configuration
 */
function SettingsView() {
  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-indigo-400" />
          <h2 className="font-semibold text-white">Tool Settings</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Default Timeout (ms)
            </label>
            <input
              type="number"
              defaultValue={5000}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Rate Limit (requests/min)
            </label>
            <input
              type="number"
              defaultValue={10}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-white">Enable Caching</div>
              <div className="text-xs text-slate-500">Cache tool results</div>
            </div>
            <button className="px-4 py-2 bg-indigo-600 rounded-lg text-sm font-medium">
              Enabled
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-white mb-4">MCP Server Configuration</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Server URL</label>
            <input
              type="text"
              placeholder="http://localhost:3100"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button className="btn-primary w-full">
            Add Server
          </button>
        </div>
      </div>
    </div>
  );
}
