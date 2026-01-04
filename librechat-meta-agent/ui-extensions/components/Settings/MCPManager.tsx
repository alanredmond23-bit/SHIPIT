'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Search,
  Grid,
  List,
  Filter,
  RefreshCw,
  Power,
  Settings,
  Activity,
  ChevronDown,
  X,
  Check,
  AlertCircle,
  Loader2,
  Server,
  Zap,
  Database,
  Globe,
  MessageSquare,
  CloudOff,
  CloudCog,
} from 'lucide-react';
import clsx from 'clsx';
import MCPServerCard from './MCPServerCard';
import MCPConfigModal from './MCPConfigModal';
import {
  MCP_SERVERS,
  MCP_CATEGORIES,
  type MCPServer,
  type MCPCategory,
  type MCPHealthStatus,
  searchServers,
  getServersByCategory,
} from './mcpServersData';

/**
 * MCPManager - MCP server management dashboard
 *
 * Features:
 * - Grid/List view of all 75+ available MCP servers
 * - Category filters (Productivity, Development, Data, Communication, etc.)
 * - Search/filter by name
 * - Enable/Disable toggle per server
 * - Health status indicator (green/yellow/red)
 * - Quick configuration modal
 * - Last health check timestamp
 */

interface MCPManagerProps {
  onSaveConfig?: (serverId: string, config: Record<string, any>) => Promise<void>;
  onTestConfig?: (serverId: string, config: Record<string, any>) => Promise<{ success: boolean; message: string }>;
  onToggleServer?: (serverId: string, enabled: boolean) => Promise<void>;
  onRefreshHealth?: (serverId: string) => Promise<void>;
  onRefreshAllHealth?: () => Promise<void>;
  serverConfigs?: Record<string, Record<string, any>>;
}

type ViewMode = 'grid' | 'list';
type FilterStatus = 'all' | 'enabled' | 'disabled' | 'healthy' | 'issues';

// Category icon mapping
const CATEGORY_ICONS: Record<MCPCategory, React.ElementType> = {
  productivity: Zap,
  development: Settings,
  data: Database,
  ai: Activity,
  web: Globe,
  communication: MessageSquare,
  storage: CloudCog,
  analytics: Activity,
  security: Settings,
  media: Activity,
};

export default function MCPManager({
  onSaveConfig,
  onTestConfig,
  onToggleServer,
  onRefreshHealth,
  onRefreshAllHealth,
  serverConfigs = {},
}: MCPManagerProps) {
  // State
  const [servers, setServers] = useState<MCPServer[]>(MCP_SERVERS);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MCPCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [configModalServer, setConfigModalServer] = useState<MCPServer | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());

  // Filtered servers
  const filteredServers = useMemo(() => {
    let result = servers;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter((s) => s.category === selectedCategory);
    }

    // Status filter
    switch (statusFilter) {
      case 'enabled':
        result = result.filter((s) => s.enabled);
        break;
      case 'disabled':
        result = result.filter((s) => !s.enabled);
        break;
      case 'healthy':
        result = result.filter((s) => s.healthStatus === 'healthy');
        break;
      case 'issues':
        result = result.filter(
          (s) => s.healthStatus === 'degraded' || s.healthStatus === 'offline'
        );
        break;
    }

    return result;
  }, [servers, searchQuery, selectedCategory, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const enabled = servers.filter((s) => s.enabled).length;
    const healthy = servers.filter((s) => s.healthStatus === 'healthy').length;
    const issues = servers.filter(
      (s) => s.healthStatus === 'degraded' || s.healthStatus === 'offline'
    ).length;
    return { total: servers.length, enabled, healthy, issues };
  }, [servers]);

  // Handlers
  const handleToggleServer = async (serverId: string, enabled: boolean) => {
    // Optimistically update UI
    setServers((prev) =>
      prev.map((s) =>
        s.id === serverId ? { ...s, enabled } : s
      )
    );

    try {
      await onToggleServer?.(serverId, enabled);
    } catch (e) {
      // Revert on error
      setServers((prev) =>
        prev.map((s) =>
          s.id === serverId ? { ...s, enabled: !enabled } : s
        )
      );
    }
  };

  const handleRefreshHealth = async (serverId: string) => {
    setRefreshingIds((prev) => new Set(prev).add(serverId));

    try {
      await onRefreshHealth?.(serverId);
      // Simulate health check result for demo
      setServers((prev) =>
        prev.map((s) =>
          s.id === serverId
            ? {
                ...s,
                healthStatus: s.enabled ? 'healthy' : 'unknown',
                lastHealthCheck: new Date(),
              }
            : s
        )
      );
    } finally {
      setRefreshingIds((prev) => {
        const next = new Set(prev);
        next.delete(serverId);
        return next;
      });
    }
  };

  const handleRefreshAllHealth = async () => {
    setRefreshingAll(true);
    try {
      await onRefreshAllHealth?.();
      // Simulate health check results for demo
      setServers((prev) =>
        prev.map((s) =>
          s.enabled
            ? {
                ...s,
                healthStatus: Math.random() > 0.1 ? 'healthy' : 'degraded',
                lastHealthCheck: new Date(),
              }
            : s
        )
      );
    } finally {
      setRefreshingAll(false);
    }
  };

  const handleSaveConfig = async (serverId: string, config: Record<string, any>) => {
    await onSaveConfig?.(serverId, config);
  };

  const handleTestConfig = async (
    serverId: string,
    config: Record<string, any>
  ): Promise<{ success: boolean; message: string }> => {
    if (onTestConfig) {
      return onTestConfig(serverId, config);
    }
    // Simulate test for demo
    await new Promise((r) => setTimeout(r, 1500));
    return { success: true, message: 'Connection established successfully' };
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-warm-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-100">
              <Server className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-warm-900">MCP Server Manager</h2>
              <p className="text-sm text-warm-500">
                Configure and manage {stats.total} MCP integrations
              </p>
            </div>
          </div>

          {/* Refresh All */}
          <button
            onClick={handleRefreshAllHealth}
            disabled={refreshingAll}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              refreshingAll
                ? 'bg-warm-200 text-warm-400 cursor-not-allowed'
                : 'bg-teal-500 hover:bg-teal-600 text-white'
            )}
          >
            <RefreshCw
              className={clsx('w-4 h-4', refreshingAll && 'animate-spin')}
            />
            {refreshingAll ? 'Refreshing...' : 'Refresh Health'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="p-3 rounded-lg bg-warm-50 border border-warm-100">
            <p className="text-2xl font-bold text-warm-900">{stats.total}</p>
            <p className="text-xs text-warm-500">Total Servers</p>
          </div>
          <div className="p-3 rounded-lg bg-teal-50 border border-teal-100">
            <p className="text-2xl font-bold text-teal-600">{stats.enabled}</p>
            <p className="text-xs text-warm-500">Enabled</p>
          </div>
          <div className="p-3 rounded-lg bg-green-50 border border-green-100">
            <p className="text-2xl font-bold text-success">{stats.healthy}</p>
            <p className="text-xs text-warm-500">Healthy</p>
          </div>
          <div className="p-3 rounded-lg bg-orange-50 border border-orange-100">
            <p className="text-2xl font-bold text-warning">{stats.issues}</p>
            <p className="text-xs text-warm-500">Issues</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search servers..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-warm-200 bg-white text-warm-900 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-warm-100 text-warm-400"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="relative">
            <button
              onClick={() => {
                setShowCategoryDropdown(!showCategoryDropdown);
                setShowStatusDropdown(false);
              }}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
                selectedCategory !== 'all'
                  ? 'bg-teal-50 border-teal-200 text-teal-700'
                  : 'bg-white border-warm-200 text-warm-700 hover:bg-warm-50'
              )}
            >
              <Filter className="w-4 h-4" />
              {selectedCategory === 'all'
                ? 'All Categories'
                : MCP_CATEGORIES[selectedCategory].label}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showCategoryDropdown && (
              <div className="absolute top-full left-0 mt-1 w-56 rounded-lg border border-warm-200 bg-white shadow-lg z-10 py-1 max-h-80 overflow-y-auto">
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setShowCategoryDropdown(false);
                  }}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors',
                    selectedCategory === 'all'
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-warm-700 hover:bg-warm-50'
                  )}
                >
                  <Server className="w-4 h-4" />
                  All Categories
                  {selectedCategory === 'all' && <Check className="w-4 h-4 ml-auto" />}
                </button>
                {(Object.keys(MCP_CATEGORIES) as MCPCategory[]).map((cat) => {
                  const Icon = CATEGORY_ICONS[cat];
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setShowCategoryDropdown(false);
                      }}
                      className={clsx(
                        'w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors',
                        selectedCategory === cat
                          ? 'bg-teal-50 text-teal-700'
                          : 'text-warm-700 hover:bg-warm-50'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {MCP_CATEGORIES[cat].label}
                      {selectedCategory === cat && <Check className="w-4 h-4 ml-auto" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Status Filter */}
          <div className="relative">
            <button
              onClick={() => {
                setShowStatusDropdown(!showStatusDropdown);
                setShowCategoryDropdown(false);
              }}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
                statusFilter !== 'all'
                  ? 'bg-teal-50 border-teal-200 text-teal-700'
                  : 'bg-white border-warm-200 text-warm-700 hover:bg-warm-50'
              )}
            >
              <Activity className="w-4 h-4" />
              {statusFilter === 'all'
                ? 'All Status'
                : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showStatusDropdown && (
              <div className="absolute top-full left-0 mt-1 w-44 rounded-lg border border-warm-200 bg-white shadow-lg z-10 py-1">
                {(['all', 'enabled', 'disabled', 'healthy', 'issues'] as FilterStatus[]).map(
                  (status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setStatusFilter(status);
                        setShowStatusDropdown(false);
                      }}
                      className={clsx(
                        'w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors',
                        statusFilter === status
                          ? 'bg-teal-50 text-teal-700'
                          : 'text-warm-700 hover:bg-warm-50'
                      )}
                    >
                      {status === 'all' && <Server className="w-4 h-4" />}
                      {status === 'enabled' && <Power className="w-4 h-4 text-teal-500" />}
                      {status === 'disabled' && <CloudOff className="w-4 h-4 text-warm-400" />}
                      {status === 'healthy' && (
                        <div className="w-4 h-4 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-success" />
                        </div>
                      )}
                      {status === 'issues' && <AlertCircle className="w-4 h-4 text-warning" />}
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                      {statusFilter === status && <Check className="w-4 h-4 ml-auto" />}
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-warm-200 overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={clsx(
                'p-2 transition-colors',
                viewMode === 'grid'
                  ? 'bg-teal-500 text-white'
                  : 'bg-white text-warm-600 hover:bg-warm-50'
              )}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={clsx(
                'p-2 transition-colors',
                viewMode === 'list'
                  ? 'bg-teal-500 text-white'
                  : 'bg-white text-warm-600 hover:bg-warm-50'
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Server List */}
      <div className="flex-1 overflow-y-auto p-6 bg-warm-50/50">
        {filteredServers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Server className="w-16 h-16 text-warm-300 mb-4" />
            <h3 className="text-lg font-medium text-warm-700 mb-2">No servers found</h3>
            <p className="text-sm text-warm-500 max-w-md">
              {searchQuery
                ? `No servers match "${searchQuery}". Try a different search term.`
                : 'No servers match the selected filters. Try adjusting your filters.'}
            </p>
            {(searchQuery || selectedCategory !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setStatusFilter('all');
                }}
                className="mt-4 px-4 py-2 rounded-lg bg-warm-200 hover:bg-warm-300 text-warm-700 text-sm font-medium transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServers.map((server) => (
              <MCPServerCard
                key={server.id}
                server={server}
                onToggle={handleToggleServer}
                onConfigure={setConfigModalServer}
                onRefreshHealth={handleRefreshHealth}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredServers.map((server) => (
              <MCPServerCard
                key={server.id}
                server={server}
                onToggle={handleToggleServer}
                onConfigure={setConfigModalServer}
                onRefreshHealth={handleRefreshHealth}
                compact
              />
            ))}
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="flex-shrink-0 px-6 py-3 border-t border-warm-200 bg-white text-sm text-warm-500">
        Showing {filteredServers.length} of {stats.total} servers
        {(searchQuery || selectedCategory !== 'all' || statusFilter !== 'all') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setStatusFilter('all');
            }}
            className="ml-2 text-teal-600 hover:text-teal-700"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Config Modal */}
      {configModalServer && (
        <MCPConfigModal
          server={configModalServer}
          isOpen={!!configModalServer}
          onClose={() => setConfigModalServer(null)}
          onSave={handleSaveConfig}
          onTest={handleTestConfig}
          initialConfig={serverConfigs[configModalServer.id]}
        />
      )}
    </div>
  );
}

export { MCPManager };
export type { MCPManagerProps, ViewMode, FilterStatus };
