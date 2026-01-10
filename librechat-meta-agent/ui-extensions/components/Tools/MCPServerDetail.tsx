'use client';

import { useState, useMemo } from 'react';
import {
  X,
  Server,
  Power,
  PowerOff,
  Settings,
  Wrench,
  Clock,
  AlertCircle,
  CheckCircle,
  Circle,
  ExternalLink,
  Github,
  Loader2,
  ChevronDown,
  ChevronRight,
  Play,
  Copy,
  Check,
  Code2,
  FileJson,
  RefreshCw,
  Zap,
} from 'lucide-react';
import clsx from 'clsx';
import type { MCPServerWithTools, MCPTool } from '@/hooks/useMCPServers';
import MCPToolTester from './MCPToolTester';

// ============================================================================
// Types
// ============================================================================

interface MCPServerDetailProps {
  server: MCPServerWithTools;
  onClose: () => void;
  onToggleConnection?: () => Promise<void>;
  onRefresh?: () => void;
}

// ============================================================================
// Status Config
// ============================================================================

const STATUS_CONFIG: Record<string, { color: string; bgColor: string; label: string }> = {
  running: { color: 'text-green-600', bgColor: 'bg-green-100', label: 'Connected' },
  installed: { color: 'text-stone-600', bgColor: 'bg-stone-100', label: 'Installed' },
  available: { color: 'text-stone-500', bgColor: 'bg-stone-50', label: 'Available' },
  error: { color: 'text-red-600', bgColor: 'bg-red-100', label: 'Error' },
  updating: { color: 'text-amber-600', bgColor: 'bg-amber-100', label: 'Updating' },
};

// ============================================================================
// Tool Schema Display Component
// ============================================================================

function SchemaDisplay({ schema }: { schema: Record<string, unknown> }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const schemaString = useMemo(() => JSON.stringify(schema, null, 2), [schema]);

  const copySchema = async () => {
    await navigator.clipboard.writeText(schemaString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs text-stone-500 hover:text-stone-700"
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
        <FileJson className="w-3.5 h-3.5" />
        <span>View Schema</span>
      </button>

      {isExpanded && (
        <div className="mt-2 relative">
          <button
            onClick={copySchema}
            className="absolute top-2 right-2 p-1.5 bg-white/80 hover:bg-white rounded-lg shadow-sm transition-colors"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-stone-400" />
            )}
          </button>
          <pre className="bg-stone-50 rounded-lg p-3 text-xs font-mono text-stone-700 overflow-x-auto max-h-64">
            {schemaString}
          </pre>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Tool Item Component
// ============================================================================

function ToolItem({
  tool,
  onTest
}: {
  tool: MCPTool;
  onTest: (tool: MCPTool) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-stone-200 rounded-lg overflow-hidden">
      {/* Tool Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-stone-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-stone-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-stone-400" />
          )}
          <div className="p-1.5 bg-teal-50 rounded-lg">
            <Wrench className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <div className="font-medium text-stone-900 text-sm">{tool.name}</div>
            <div className="text-xs text-stone-500 line-clamp-1">{tool.description}</div>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onTest(tool);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 rounded-lg text-teal-700 text-xs font-medium transition-colors"
        >
          <Play className="w-3.5 h-3.5" />
          Test
        </button>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-0 border-t border-stone-100">
          <p className="text-sm text-stone-600 mt-3">{tool.description}</p>

          {/* Input Schema */}
          {tool.inputSchema && (
            <div className="mt-3">
              <div className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
                Input Schema
              </div>
              <SchemaDisplay schema={tool.inputSchema} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MCPServerDetail Component
// ============================================================================

export function MCPServerDetail({
  server,
  onClose,
  onToggleConnection,
  onRefresh,
}: MCPServerDetailProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [activeTab, setActiveTab] = useState<'tools' | 'config' | 'logs'>('tools');
  const [testingTool, setTestingTool] = useState<MCPTool | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const statusConfig = STATUS_CONFIG[server.status] || STATUS_CONFIG.available;

  // Filter tools
  const filteredTools = useMemo(() => {
    if (!server.tools) return [];
    if (!searchQuery) return server.tools;

    const query = searchQuery.toLowerCase();
    return server.tools.filter(
      (tool) =>
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query)
    );
  }, [server.tools, searchQuery]);

  const handleToggleConnection = async () => {
    if (!onToggleConnection || isConnecting) return;
    setIsConnecting(true);
    try {
      await onToggleConnection();
    } finally {
      setIsConnecting(false);
    }
  };

  const formatLastSync = (date?: Date) => {
    if (!date) return 'Never';
    return date.toLocaleString();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-stone-200">
          <div className="flex items-start gap-4">
            <div
              className={clsx(
                'p-3 rounded-xl',
                server.status === 'running' ? 'bg-green-100' : 'bg-stone-100'
              )}
            >
              <Server
                className={clsx(
                  'w-6 h-6',
                  server.status === 'running' ? 'text-green-600' : 'text-stone-500'
                )}
              />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-stone-900">{server.name}</h2>
              <p className="text-sm text-stone-500 mt-1">{server.description}</p>
              <div className="flex items-center gap-3 mt-3">
                <span
                  className={clsx(
                    'px-2.5 py-1 rounded-full text-xs font-medium',
                    statusConfig.bgColor,
                    statusConfig.color
                  )}
                >
                  {statusConfig.label}
                </span>
                <span className="text-sm text-stone-400">{server.provider}</span>
                {server.version && (
                  <span className="text-sm text-stone-400">v{server.version}</span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleConnection}
              disabled={isConnecting}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                server.status === 'running'
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              )}
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : server.status === 'running' ? (
                <>
                  <PowerOff className="w-4 h-4" />
                  Disconnect
                </>
              ) : (
                <>
                  <Power className="w-4 h-4" />
                  Connect
                </>
              )}
            </button>

            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-2 hover:bg-stone-200 rounded-lg text-stone-500 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {server.githubUrl && (
              <a
                href={server.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 hover:bg-stone-200 rounded-lg text-stone-600 text-sm transition-colors"
              >
                <Github className="w-4 h-4" />
                GitHub
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 py-2 border-b border-stone-200">
          {(['tools', 'config', 'logs'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize',
                activeTab === tab
                  ? 'bg-teal-100 text-teal-700'
                  : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'tools' && (
            <div>
              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tools..."
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                />
              </div>

              {/* Tools Count */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-stone-500">
                  <Wrench className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {filteredTools.length} tools available
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-stone-400 text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  Last sync: {formatLastSync(server.lastHealthCheck)}
                </div>
              </div>

              {/* Tools List */}
              {filteredTools.length === 0 ? (
                <div className="text-center py-12 bg-stone-50 rounded-xl">
                  <Wrench className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                  <p className="text-stone-500 font-medium">No tools found</p>
                  <p className="text-stone-400 text-sm mt-1">
                    {searchQuery
                      ? 'Try a different search term'
                      : 'Connect to the server to discover tools'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTools.map((tool) => (
                    <ToolItem
                      key={tool.name}
                      tool={tool}
                      onTest={setTestingTool}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'config' && (
            <div className="space-y-6">
              {/* Server Configuration */}
              <div>
                <h3 className="text-sm font-medium text-stone-700 mb-3">
                  Server Configuration
                </h3>
                <div className="bg-stone-50 rounded-xl p-4 space-y-4">
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">Command</label>
                    <code className="block bg-white px-3 py-2 rounded-lg text-sm font-mono text-stone-700 border border-stone-200">
                      {server.configTemplate?.command || 'Not configured'}
                    </code>
                  </div>
                  {server.configTemplate?.args && (
                    <div>
                      <label className="block text-xs text-stone-500 mb-1">Arguments</label>
                      <code className="block bg-white px-3 py-2 rounded-lg text-sm font-mono text-stone-700 border border-stone-200">
                        {server.configTemplate.args.join(' ')}
                      </code>
                    </div>
                  )}
                </div>
              </div>

              {/* Required Environment Variables */}
              {server.requiredEnvVars && server.requiredEnvVars.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-stone-700 mb-3">
                    Required Environment Variables
                  </h3>
                  <div className="space-y-2">
                    {server.requiredEnvVars.map((envVar) => (
                      <div
                        key={envVar}
                        className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-2"
                      >
                        <code className="text-sm font-mono text-amber-700">{envVar}</code>
                        <span className="text-xs text-amber-600 font-medium">Required</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Features */}
              {server.features && server.features.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-stone-700 mb-3">Features</h3>
                  <div className="flex flex-wrap gap-2">
                    {server.features.map((feature, index) => (
                      <span
                        key={index}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-full text-sm text-teal-700"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Install Command */}
              {server.installCommand && (
                <div>
                  <h3 className="text-sm font-medium text-stone-700 mb-3">
                    Installation
                  </h3>
                  <div className="bg-stone-900 rounded-xl p-4">
                    <code className="text-sm font-mono text-green-400">
                      {server.installCommand}
                    </code>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-stone-700">Server Logs</h3>
                <button className="text-xs text-teal-600 hover:text-teal-700 font-medium">
                  Clear Logs
                </button>
              </div>

              <div className="bg-stone-900 rounded-xl p-4 h-96 overflow-y-auto font-mono text-xs">
                <div className="text-stone-400">
                  <p className="text-green-400">[INFO] Server initialized</p>
                  <p className="text-stone-500">[DEBUG] Loading configuration...</p>
                  <p className="text-stone-500">[DEBUG] Connecting to MCP protocol...</p>
                  {server.status === 'running' ? (
                    <p className="text-green-400">[INFO] Server connected successfully</p>
                  ) : server.status === 'error' ? (
                    <p className="text-red-400">[ERROR] Connection failed</p>
                  ) : (
                    <p className="text-amber-400">[WARN] Server not connected</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tool Tester Modal */}
      {testingTool && (
        <MCPToolTester
          tool={testingTool}
          server={server}
          onClose={() => setTestingTool(null)}
        />
      )}
    </>
  );
}

export default MCPServerDetail;
