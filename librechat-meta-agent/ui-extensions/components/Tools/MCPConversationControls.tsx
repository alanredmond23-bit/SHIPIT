'use client';

import { useState, useMemo } from 'react';
import { useMCPServers, MCPServerWithTools, MCPTool } from '@/hooks/useMCPServers';

// ============================================================================
// Types
// ============================================================================

interface MCPConversationControlsProps {
  conversationId: string;
  className?: string;
  onToolSelect?: (serverId: string, toolName: string) => void;
  compact?: boolean;
}

interface ToolSuggestion {
  tool: MCPTool & { serverId: string; serverName: string };
  relevanceScore: number;
  reason: string;
}

// ============================================================================
// Icons
// ============================================================================

function ServerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0a4.5 4.5 0 0 1 .9-2.7L5.737 5.1a3.375 3.375 0 0 1 2.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 0 1 .9 2.7m0 0a3 3 0 0 1-3 3m0 3h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Zm-3 6h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Z" />
    </svg>
  );
}

function ToolIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  );
}

function ChevronIcon({ className, direction = 'down' }: { className?: string; direction?: 'up' | 'down' }) {
  return (
    <svg
      className={`${className} transition-transform ${direction === 'up' ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function ServerToggle({
  server,
  isEnabled,
  onToggle,
}: {
  server: MCPServerWithTools;
  isEnabled: boolean;
  onToggle: () => void;
}) {
  const isConnected = server.status === 'running';

  return (
    <div
      className={`
        flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer
        ${isEnabled
          ? 'bg-teal-500/10 border-teal-500/30 hover:bg-teal-500/20'
          : 'bg-stone-800/50 border-stone-700/50 hover:bg-stone-800 opacity-60'
        }
      `}
      onClick={onToggle}
    >
      <div className="flex items-center gap-2">
        {/* Status indicator */}
        <div className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-stone-500'
        }`} />

        <span className="text-sm font-medium text-stone-200">{server.name}</span>

        {server.tools && (
          <span className="text-xs text-stone-500">
            {server.tools.length} tools
          </span>
        )}
      </div>

      <div className={`
        w-5 h-5 rounded flex items-center justify-center transition-colors
        ${isEnabled ? 'bg-teal-500 text-white' : 'bg-stone-700 text-stone-500'}
      `}>
        {isEnabled && <CheckIcon className="w-3 h-3" />}
      </div>
    </div>
  );
}

function ToolSuggestionCard({
  suggestion,
  onClick,
}: {
  suggestion: ToolSuggestion;
  onClick: () => void;
}) {
  return (
    <div
      className="
        flex items-start gap-3 p-3 rounded-lg bg-stone-800/50 border border-stone-700/50
        hover:bg-stone-800 hover:border-teal-500/30 cursor-pointer transition-all group
      "
      onClick={onClick}
    >
      <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 group-hover:bg-teal-500/20">
        <ToolIcon className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-stone-200">{suggestion.tool.name}</span>
          <span className="text-xs text-stone-500">from {suggestion.tool.serverName}</span>
        </div>
        <p className="text-xs text-stone-400 mt-0.5 line-clamp-2">{suggestion.reason}</p>
      </div>

      <div className="flex items-center gap-1 text-xs text-teal-400">
        <SparklesIcon className="w-3 h-3" />
        <span>{Math.round(suggestion.relevanceScore * 100)}%</span>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function MCPConversationControls({
  conversationId,
  className = '',
  onToolSelect,
  compact = false,
}: MCPConversationControlsProps) {
  const {
    servers,
    runningServers,
    availableTools,
    getConversationConfig,
    toggleConversationServer,
  } = useMCPServers();

  const [isExpanded, setIsExpanded] = useState(!compact);
  const [activeSection, setActiveSection] = useState<'servers' | 'suggestions'>('servers');

  const config = getConversationConfig(conversationId);
  const enabledServerIds = new Set(config.enabledServers);

  // Get enabled tools for this conversation
  const enabledTools = useMemo(() => {
    return availableTools.filter((tool) => enabledServerIds.has(tool.serverId));
  }, [availableTools, enabledServerIds]);

  // Generate tool suggestions based on context
  // In a real implementation, this would analyze conversation context
  const toolSuggestions: ToolSuggestion[] = useMemo(() => {
    // Mock suggestions - in production, this would be based on conversation analysis
    const suggestions: ToolSuggestion[] = [];

    enabledTools.forEach((tool, index) => {
      if (index < 3) {
        suggestions.push({
          tool,
          relevanceScore: 0.95 - (index * 0.15),
          reason: getToolSuggestionReason(tool.name),
        });
      }
    });

    return suggestions;
  }, [enabledTools]);

  const enabledCount = servers.filter((s) => enabledServerIds.has(s.id)).length;
  const connectedCount = runningServers.filter((s) => enabledServerIds.has(s.id)).length;

  // Compact view
  if (compact && !isExpanded) {
    return (
      <div
        className={`
          flex items-center gap-2 p-2 rounded-lg bg-stone-900/50 border border-stone-700/50
          hover:border-stone-600/50 cursor-pointer transition-all ${className}
        `}
        onClick={() => setIsExpanded(true)}
      >
        <ServerIcon className="w-4 h-4 text-stone-400" />
        <span className="text-sm text-stone-300">
          {connectedCount} MCP{connectedCount !== 1 ? 's' : ''} active
        </span>
        <span className="text-xs text-stone-500">
          ({enabledTools.length} tools)
        </span>
        <ChevronIcon className="w-4 h-4 text-stone-500 ml-auto" direction="down" />
      </div>
    );
  }

  return (
    <div className={`rounded-xl bg-stone-900/50 border border-stone-700/50 overflow-hidden ${className}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 border-b border-stone-700/50 cursor-pointer hover:bg-stone-800/30"
        onClick={() => compact && setIsExpanded(false)}
      >
        <div className="flex items-center gap-2">
          <ServerIcon className="w-5 h-5 text-teal-400" />
          <span className="text-sm font-medium text-stone-200">MCP Tools</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-stone-400">
              {connectedCount}/{enabledCount} connected
            </span>
          </div>

          {compact && (
            <ChevronIcon className="w-4 h-4 text-stone-500" direction="up" />
          )}
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex border-b border-stone-700/50">
        <button
          onClick={() => setActiveSection('servers')}
          className={`
            flex-1 px-4 py-2 text-sm font-medium transition-colors
            ${activeSection === 'servers'
              ? 'text-teal-400 border-b-2 border-teal-400 bg-teal-500/5'
              : 'text-stone-400 hover:text-stone-300'
            }
          `}
        >
          Servers ({enabledCount})
        </button>
        <button
          onClick={() => setActiveSection('suggestions')}
          className={`
            flex-1 px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5
            ${activeSection === 'suggestions'
              ? 'text-teal-400 border-b-2 border-teal-400 bg-teal-500/5'
              : 'text-stone-400 hover:text-stone-300'
            }
          `}
        >
          <SparklesIcon className="w-4 h-4" />
          Suggestions
        </button>
      </div>

      {/* Content */}
      <div className="p-3 max-h-64 overflow-y-auto">
        {activeSection === 'servers' ? (
          <div className="space-y-2">
            {servers.map((server) => (
              <ServerToggle
                key={server.id}
                server={server}
                isEnabled={enabledServerIds.has(server.id)}
                onToggle={() => toggleConversationServer(conversationId, server.id)}
              />
            ))}

            {servers.length === 0 && (
              <div className="text-center py-6 text-stone-500">
                <ServerIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No MCP servers configured</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {toolSuggestions.length > 0 ? (
              toolSuggestions.map((suggestion, index) => (
                <ToolSuggestionCard
                  key={`${suggestion.tool.serverId}-${suggestion.tool.name}-${index}`}
                  suggestion={suggestion}
                  onClick={() => onToolSelect?.(suggestion.tool.serverId, suggestion.tool.name)}
                />
              ))
            ) : (
              <div className="text-center py-6 text-stone-500">
                <SparklesIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No tool suggestions available</p>
                <p className="text-xs mt-1">Enable MCP servers to get suggestions</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer with tool count */}
      <div className="px-3 py-2 border-t border-stone-700/50 bg-stone-800/30">
        <div className="flex items-center justify-between text-xs text-stone-500">
          <span>{enabledTools.length} tools available</span>
          <span>{toolSuggestions.length} suggestions</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getToolSuggestionReason(toolName: string): string {
  const reasons: Record<string, string> = {
    read_file: 'Read and analyze file contents based on conversation context',
    write_file: 'Create or modify files as discussed in the conversation',
    list_directory: 'Explore project structure to find relevant files',
    search_files: 'Find specific files matching your requirements',
    query: 'Query database for information mentioned in the conversation',
    web_search: 'Search for information related to your question',
    fetch: 'Retrieve content from URLs mentioned in the conversation',
    create_entity: 'Store information from this conversation for future reference',
    send_message: 'Send notifications about conversation outcomes',
    list_repositories: 'Find relevant code repositories',
    create_issue: 'Track tasks or bugs discussed in this conversation',
    navigate: 'Browse web pages to gather information',
    screenshot: 'Capture visual information from websites',
  };

  return reasons[toolName] || `Use ${toolName} to help with your request`;
}

export default MCPConversationControls;
