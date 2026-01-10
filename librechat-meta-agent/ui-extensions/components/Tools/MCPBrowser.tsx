'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  RefreshCw,
  Server,
  Filter,
  Grid3X3,
  List,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';
import MCPServerCard from './MCPServerCard';
import MCPServerDetail from './MCPServerDetail';
import MCPAddServer from './MCPAddServer';
import { useMCPServers, type MCPServerWithTools } from '@/hooks/useMCPServers';

// ============================================================================
// Types
// ============================================================================

type ViewMode = 'grid' | 'list';
type FilterCategory = 'all' | 'productivity' | 'development' | 'data' | 'communication' | 'ai' | 'utility';
type StatusFilter = 'all' | 'connected' | 'disconnected' | 'error';

interface MCPBrowserProps {
  className?: string;
  onServerSelect?: (server: MCPServerWithTools) => void;
}

// ============================================================================
// Category Labels & Colors
// ============================================================================

const CATEGORY_CONFIG: Record<FilterCategory, { label: string; color: string }> = {
  all: { label: 'All', color: 'bg-stone-500' },
  productivity: { label: 'Productivity', color: 'bg-blue-500' },
  development: { label: 'Development', color: 'bg-purple-500' },
  data: { label: 'Data', color: 'bg-teal-500' },
  communication: { label: 'Communication', color: 'bg-amber-500' },
  ai: { label: 'AI', color: 'bg-pink-500' },
  utility: { label: 'Utility', color: 'bg-stone-600' },
};

// ============================================================================
// MCPBrowser Component
// ============================================================================

export function MCPBrowser({ className, onServerSelect }: MCPBrowserProps) {
  const {
    servers,
    isLoading,
    error,
    refreshServers,
    isRefreshing,
    connectServer,
    disconnectServer,
  } = useMCPServers();

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedServer, setSelectedServer] = useState<MCPServerWithTools | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filter servers
  const filteredServers = useMemo(() => {
    return servers.filter((server) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          server.name.toLowerCase().includes(query) ||
          server.description.toLowerCase().includes(query) ||
          server.provider.toLowerCase().includes(query) ||
          server.features.some((f) => f.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && server.category !== categoryFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'connected' && server.status !== 'running') return false;
        if (statusFilter === 'disconnected' && server.status !== 'available' && server.status !== 'installed') return false;
        if (statusFilter === 'error' && server.status !== 'error') return false;
      }

      return true;
    });
  }, [servers, searchQuery, categoryFilter, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const connected = servers.filter((s) => s.status === 'running').length;
    const disconnected = servers.filter((s) => s.status === 'available' || s.status === 'installed').length;
    const errored = servers.filter((s) => s.status === 'error').length;
    const totalTools = servers.reduce((acc, s) => acc + (s.tools?.length || 0), 0);
    return { connected, disconnected, errored, total: servers.length, totalTools };
  }, [servers]);

  // Handle server selection
  const handleServerClick = (server: MCPServerWithTools) => {
    setSelectedServer(server);
    onServerSelect?.(server);
  };

  // Handle toggle connection
  const handleToggleConnection = async (server: MCPServerWithTools) => {
    if (server.status === 'running') {
      await disconnectServer(server.id);
    } else {
      await connectServer(server.id);
    }
  };

  if (isLoading) {
    return (
      <div className={clsx('flex items-center justify-center py-16', className)}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-teal-500 animate-spin mx-auto mb-3" />
          <p className="text-stone-500 text-sm">Loading MCP servers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={clsx('p-6 bg-red-50 rounded-xl border border-red-200', className)}>
        <div className="text-center">
          <Server className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-red-700 font-medium">Failed to load MCP servers</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
          <button
            onClick={refreshServers}
            className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-red-700 text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
            <Server className="w-5 h-5 text-teal-500" />
            MCP Servers
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            {stats.connected} connected, {stats.totalTools} tools available
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshServers}
            disabled={isRefreshing}
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh servers"
          >
            <RefreshCw className={clsx('w-5 h-5 text-stone-500', isRefreshing && 'animate-spin')} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Server
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search servers, tools, or features..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
          />
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={clsx(
            'flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors',
            showFilters
              ? 'bg-teal-50 border-teal-200 text-teal-700'
              : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
          )}
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>

        {/* View Mode Toggle */}
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

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-stone-50 rounded-xl p-4 mb-6 space-y-4">
          {/* Category Filter */}
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CATEGORY_CONFIG) as FilterCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                    categoryFilter === cat
                      ? 'bg-teal-500 text-white'
                      : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-300'
                  )}
                >
                  {CATEGORY_CONFIG[cat].label}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {(['all', 'connected', 'disconnected', 'error'] as StatusFilter[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize',
                    statusFilter === status
                      ? 'bg-teal-500 text-white'
                      : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-300'
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl p-3 border border-stone-200">
          <div className="text-2xl font-bold text-stone-900">{stats.total}</div>
          <div className="text-xs text-stone-500">Total Servers</div>
        </div>
        <div className="bg-white rounded-xl p-3 border border-stone-200">
          <div className="text-2xl font-bold text-green-600">{stats.connected}</div>
          <div className="text-xs text-stone-500">Connected</div>
        </div>
        <div className="bg-white rounded-xl p-3 border border-stone-200">
          <div className="text-2xl font-bold text-stone-500">{stats.disconnected}</div>
          <div className="text-xs text-stone-500">Disconnected</div>
        </div>
        <div className="bg-white rounded-xl p-3 border border-stone-200">
          <div className="text-2xl font-bold text-teal-600">{stats.totalTools}</div>
          <div className="text-xs text-stone-500">Total Tools</div>
        </div>
      </div>

      {/* Server Grid/List */}
      {filteredServers.length === 0 ? (
        <div className="text-center py-12 bg-stone-50 rounded-xl">
          <Server className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 font-medium">No servers found</p>
          <p className="text-stone-400 text-sm mt-1">
            {searchQuery ? 'Try a different search term' : 'Add a server to get started'}
          </p>
        </div>
      ) : (
        <div
          className={clsx(
            'gap-4',
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              : 'flex flex-col'
          )}
        >
          {filteredServers.map((server) => (
            <MCPServerCard
              key={server.id}
              server={server}
              viewMode={viewMode}
              onClick={() => handleServerClick(server)}
              onToggleConnection={() => handleToggleConnection(server)}
            />
          ))}
        </div>
      )}

      {/* Server Detail Modal */}
      {selectedServer && (
        <MCPServerDetail
          server={selectedServer}
          onClose={() => setSelectedServer(null)}
          onToggleConnection={() => handleToggleConnection(selectedServer)}
        />
      )}

      {/* Add Server Modal */}
      {showAddModal && (
        <MCPAddServer
          onClose={() => setShowAddModal(false)}
          onAdd={(config) => {
            // Handle adding new server
            console.log('Adding server:', config);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}

export default MCPBrowser;
