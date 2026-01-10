'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  BarChart3,
  Grid3X3,
  List,
} from 'lucide-react';
import clsx from 'clsx';
import ToolResult from '@/components/Tools/ToolResult';
import MCPBrowser from '@/components/Tools/MCPBrowser';
import { useMCPServers, type MCPServerWithTools } from '@/hooks/useMCPServers';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100';

// API functions
const api = {
  getTools: () => fetch(`${API_BASE}/api/tools`).then((r) => r.json()),
  getToolHistory: () => fetch(`${API_BASE}/api/tools/history`).then((r) => r.json()),
  executeWebSearch: (query: string, maxResults: number = 10) =>
    fetch(`${API_BASE}/api/tools/web-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, maxResults }),
    }).then((r) => r.json()),
  executeCode: (language: string, code: string, timeout: number = 5000) =>
    fetch(`${API_BASE}/api/tools/code-executor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language, code, timeout }),
    }).then((r) => r.json()),
  getServers: () => fetch(`${API_BASE}/api/tools/servers`).then((r) => r.json()),
};

type View = 'servers' | 'tools' | 'usage' | 'settings';

export default function ToolsPage() {
  const [activeView, setActiveView] = useState<View>('servers');
  const { runningServers, availableTools, toolUsageStats } = useMCPServers();

  // Calculate stats
  const stats = useMemo(() => ({
    connectedServers: runningServers.length,
    availableTools: availableTools.length,
    totalExecutions: Object.values(toolUsageStats).reduce((a, b) => a + b, 0),
  }), [runningServers, availableTools, toolUsageStats]);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-stone-200 px-4 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-teal-100 rounded-xl">
                <Wrench className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-stone-900">MCP Tools</h1>
                <p className="text-sm text-stone-500">Model Context Protocol Integration</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-green-700 font-medium">
                  {stats.connectedServers} servers
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 rounded-lg">
                <Wrench className="w-4 h-4 text-teal-600" />
                <span className="text-sm text-teal-700 font-medium">
                  {stats.availableTools} tools
                </span>
              </div>
            </div>
          </div>

          {/* View Tabs */}
          <div className="flex gap-1 mt-4 overflow-x-auto pb-1">
            {[
              { id: 'servers', label: 'MCP Servers', icon: Server },
              { id: 'tools', label: 'Available Tools', icon: Zap },
              { id: 'usage', label: 'Usage', icon: BarChart3 },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((view) => {
              const Icon = view.icon;
              return (
                <button
                  key={view.id}
                  onClick={() => setActiveView(view.id as View)}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
                    activeView === view.id
                      ? 'bg-teal-500 text-white shadow-sm'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {view.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 pb-8">
        {activeView === 'servers' && <MCPServersView />}
        {activeView === 'tools' && <ToolsListView />}
        {activeView === 'usage' && <UsageView />}
        {activeView === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}

/**
 * MCP Servers View - Visual server browser
 */
function MCPServersView() {
  const handleServerSelect = (server: MCPServerWithTools) => {
    console.log('Selected server:', server);
  };

  return <MCPBrowser onServerSelect={handleServerSelect} />;
}

/**
 * Tools List View - Display all available tools across servers
 */
function ToolsListView() {
  const { availableTools, runningServers } = useMCPServers();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Filter tools
  const filteredTools = useMemo(() => {
    if (!searchQuery) return availableTools;
    const query = searchQuery.toLowerCase();
    return availableTools.filter(
      (tool) =>
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.serverName.toLowerCase().includes(query)
    );
  }, [availableTools, searchQuery]);

  // Group by server
  const toolsByServer = useMemo(() => {
    const grouped: Record<string, typeof availableTools> = {};
    filteredTools.forEach((tool) => {
      if (!grouped[tool.serverName]) {
        grouped[tool.serverName] = [];
      }
      grouped[tool.serverName].push(tool);
    });
    return grouped;
  }, [filteredTools]);

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tools across all servers..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
          />
        </div>

        <div className="flex items-center bg-white border border-stone-200 rounded-xl p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={clsx(
              'p-2 rounded-lg transition-colors',
              viewMode === 'grid' ? 'bg-teal-100 text-teal-700' : 'text-stone-400 hover:text-stone-600'
            )}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={clsx(
              'p-2 rounded-lg transition-colors',
              viewMode === 'list' ? 'bg-teal-100 text-teal-700' : 'text-stone-400 hover:text-stone-600'
            )}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-stone-500">
        <span>{filteredTools.length} tools available</span>
        <span>from {runningServers.length} connected servers</span>
      </div>

      {/* Tools by Server */}
      {Object.entries(toolsByServer).length === 0 ? (
        <div className="text-center py-12 bg-stone-50 rounded-xl">
          <Wrench className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 font-medium">No tools found</p>
          <p className="text-stone-400 text-sm mt-1">
            {searchQuery ? 'Try a different search term' : 'Connect to servers to access their tools'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(toolsByServer).map(([serverName, tools]) => (
            <div key={serverName} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-teal-600" />
                  <span className="font-medium text-stone-900">{serverName}</span>
                  <span className="px-2 py-0.5 bg-teal-100 rounded-full text-xs text-teal-700 font-medium">
                    {tools.length} tools
                  </span>
                </div>
              </div>

              <div className={clsx(
                'p-4',
                viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : 'space-y-2'
              )}>
                {tools.map((tool) => (
                  <div
                    key={`${tool.serverId}-${tool.name}`}
                    className={clsx(
                      'p-3 rounded-lg border border-stone-200 hover:border-teal-300 hover:bg-teal-50/30 transition-colors cursor-pointer',
                      viewMode === 'list' && 'flex items-center justify-between'
                    )}
                  >
                    <div className={clsx(viewMode === 'list' && 'flex items-center gap-3')}>
                      <div className="p-1.5 bg-teal-100 rounded-lg w-fit">
                        <Wrench className="w-4 h-4 text-teal-600" />
                      </div>
                      <div className={viewMode === 'grid' ? 'mt-2' : ''}>
                        <div className="font-medium text-stone-900 text-sm">{tool.name}</div>
                        <div className="text-xs text-stone-500 line-clamp-2 mt-0.5">
                          {tool.description}
                        </div>
                      </div>
                    </div>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 rounded-lg text-teal-700 text-xs font-medium transition-colors mt-2 sm:mt-0">
                      <Play className="w-3.5 h-3.5" />
                      Test
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Usage View - Tool usage statistics
 */
function UsageView() {
  const { getExecutionHistory, toolUsageStats, runningServers } = useMCPServers();
  const history = getExecutionHistory(undefined, 20);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-100 rounded-xl">
              <Zap className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-stone-900">
                {Object.values(toolUsageStats).reduce((a, b) => a + b, 0)}
              </div>
              <div className="text-sm text-stone-500">Total Executions</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-100 rounded-xl">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-stone-900">
                {history.filter((h) => h.status === 'success').length}
              </div>
              <div className="text-sm text-stone-500">Successful</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-100 rounded-xl">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-stone-900">
                {history.filter((h) => h.status === 'error').length}
              </div>
              <div className="text-sm text-stone-500">Failed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Executions */}
      <div className="bg-white rounded-xl border border-stone-200">
        <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between">
          <h2 className="font-semibold text-stone-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-500" />
            Recent Executions
          </h2>
        </div>

        <div className="divide-y divide-stone-100">
          {history.length === 0 ? (
            <div className="text-center py-12 text-stone-400">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No execution history</p>
              <p className="text-sm mt-1">Execute a tool to see results here</p>
            </div>
          ) : (
            history.map((item) => (
              <div key={item.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {item.status === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : item.status === 'error' ? (
                    <XCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
                  )}
                  <div>
                    <div className="font-medium text-stone-900">{item.toolName}</div>
                    <div className="text-xs text-stone-400">
                      {item.startTime.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-stone-500">{item.duration}ms</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Top Used Tools */}
      <div className="bg-white rounded-xl border border-stone-200">
        <div className="px-4 py-3 border-b border-stone-200">
          <h2 className="font-semibold text-stone-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-500" />
            Most Used Tools
          </h2>
        </div>

        <div className="p-4">
          {Object.keys(toolUsageStats).length === 0 ? (
            <div className="text-center py-8 text-stone-400">
              <p>No usage data yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(toolUsageStats)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([key, count]) => {
                  const [serverId, toolName] = key.split(':');
                  const maxCount = Math.max(...Object.values(toolUsageStats));
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-stone-900">{toolName}</div>
                        <div className="text-xs text-stone-400">{serverId}</div>
                      </div>
                      <div className="w-32 bg-stone-100 rounded-full h-2">
                        <div
                          className="bg-teal-500 h-2 rounded-full"
                          style={{ width: `${(count / maxCount) * 100}%` }}
                        />
                      </div>
                      <div className="text-sm text-stone-500 w-12 text-right">{count}</div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Settings View - Tool configuration
 */
function SettingsView() {
  const { runningServers } = useMCPServers();

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-200 flex items-center gap-2">
          <Settings className="w-5 h-5 text-teal-500" />
          <h2 className="font-semibold text-stone-900">General Settings</h2>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Default Timeout (ms)
            </label>
            <input
              type="number"
              defaultValue={5000}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Rate Limit (requests/min)
            </label>
            <input
              type="number"
              defaultValue={10}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
            <div>
              <div className="text-sm font-medium text-stone-900">Enable Caching</div>
              <div className="text-xs text-stone-500">Cache tool results for faster responses</div>
            </div>
            <button className="px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors">
              Enabled
            </button>
          </div>
          <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
            <div>
              <div className="text-sm font-medium text-stone-900">Auto-connect Servers</div>
              <div className="text-xs text-stone-500">Automatically connect to previously used servers</div>
            </div>
            <button className="px-4 py-2 bg-stone-200 text-stone-600 rounded-lg text-sm font-medium hover:bg-stone-300 transition-colors">
              Disabled
            </button>
          </div>
        </div>
      </div>

      {/* Connected Servers */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-teal-500" />
            <h2 className="font-semibold text-stone-900">Connected Servers</h2>
          </div>
          <span className="text-sm text-stone-500">{runningServers.length} active</span>
        </div>
        <div className="divide-y divide-stone-100">
          {runningServers.length === 0 ? (
            <div className="p-8 text-center text-stone-400">
              <Server className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No servers connected</p>
            </div>
          ) : (
            runningServers.map((server) => (
              <div key={server.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <div>
                    <div className="font-medium text-stone-900">{server.name}</div>
                    <div className="text-xs text-stone-400">{server.tools?.length || 0} tools</div>
                  </div>
                </div>
                <button className="text-sm text-red-600 hover:text-red-700 font-medium">
                  Disconnect
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Export Configuration */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-200 flex items-center gap-2">
          <Code className="w-5 h-5 text-teal-500" />
          <h2 className="font-semibold text-stone-900">Export Configuration</h2>
        </div>
        <div className="p-4">
          <p className="text-sm text-stone-500 mb-4">
            Export your MCP server configuration for use with Claude Desktop or other MCP clients.
          </p>
          <div className="flex gap-3">
            <button className="flex-1 px-4 py-2.5 bg-teal-500 text-white rounded-xl text-sm font-medium hover:bg-teal-600 transition-colors">
              Export for Claude Desktop
            </button>
            <button className="px-4 py-2.5 border border-stone-200 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors">
              Copy JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
