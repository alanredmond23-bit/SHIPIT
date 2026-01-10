'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface MCPTool {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
}

export interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface MCPServerWithTools {
  id: string;
  name: string;
  description: string;
  category: 'productivity' | 'development' | 'data' | 'communication' | 'ai' | 'utility';
  provider: string;
  npmPackage?: string;
  githubUrl?: string;
  configTemplate?: MCPServerConfig;
  requiredEnvVars: string[];
  optionalEnvVars?: string[];
  features: string[];
  installCommand: string;
  status: 'available' | 'installed' | 'running' | 'error' | 'updating';
  version?: string;
  lastHealthCheck?: Date;
  healthStatus?: 'healthy' | 'unhealthy' | 'unknown';
  tools?: MCPTool[];
  errorMessage?: string;
}

export interface MCPInstallation {
  serverId: string;
  installedAt: Date;
  config: MCPServerConfig;
  autoStart: boolean;
  lastStarted?: Date;
  errorLog?: string[];
}

export interface MCPHealthCheck {
  serverId: string;
  timestamp: Date;
  status: 'healthy' | 'unhealthy' | 'timeout';
  responseTime?: number;
  error?: string;
  toolsAvailable?: number;
}

export interface MCPToolExecution {
  id: string;
  toolName: string;
  serverId: string;
  input: Record<string, unknown>;
  output?: unknown;
  error?: string;
  status: 'pending' | 'running' | 'success' | 'error';
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

export interface MCPConversationConfig {
  conversationId: string;
  enabledServers: string[];
  suggestedTools: string[];
}

// ============================================================================
// Mock Data - MCP Server Catalog
// ============================================================================

const MCP_SERVER_CATALOG: MCPServerWithTools[] = [
  {
    id: 'filesystem',
    name: 'Filesystem',
    description: 'Read, write, and manage files with secure sandboxed access',
    category: 'utility',
    provider: 'Anthropic',
    npmPackage: '@modelcontextprotocol/server-filesystem',
    githubUrl: 'https://github.com/modelcontextprotocol/servers',
    configTemplate: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/allowed/directory'],
    },
    requiredEnvVars: [],
    features: ['Read files', 'Write files', 'List directories', 'Search files', 'Move/copy files'],
    installCommand: 'npm install -g @modelcontextprotocol/server-filesystem',
    status: 'running',
    version: '1.0.0',
    lastHealthCheck: new Date(),
    healthStatus: 'healthy',
    tools: [
      { name: 'read_file', description: 'Read contents of a file', inputSchema: { type: 'object', properties: { path: { type: 'string', description: 'Path to the file' } }, required: ['path'] } },
      { name: 'write_file', description: 'Write content to a file', inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } },
      { name: 'list_directory', description: 'List files in a directory', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
      { name: 'search_files', description: 'Search for files matching a pattern', inputSchema: { type: 'object', properties: { pattern: { type: 'string' }, path: { type: 'string' } }, required: ['pattern'] } },
    ],
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Interact with GitHub repositories, issues, and pull requests',
    category: 'development',
    provider: 'Anthropic',
    npmPackage: '@modelcontextprotocol/server-github',
    githubUrl: 'https://github.com/modelcontextprotocol/servers',
    configTemplate: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: { GITHUB_PERSONAL_ACCESS_TOKEN: '' },
    },
    requiredEnvVars: ['GITHUB_PERSONAL_ACCESS_TOKEN'],
    features: ['List repos', 'Create issues', 'Read PRs', 'Commit files', 'Search code'],
    installCommand: 'npm install -g @modelcontextprotocol/server-github',
    status: 'running',
    version: '1.0.0',
    lastHealthCheck: new Date(),
    healthStatus: 'healthy',
    tools: [
      { name: 'list_repositories', description: 'List repositories for a user or organization', inputSchema: { type: 'object', properties: { owner: { type: 'string' }, type: { type: 'string', enum: ['all', 'public', 'private'] } } } },
      { name: 'create_issue', description: 'Create a new issue', inputSchema: { type: 'object', properties: { owner: { type: 'string' }, repo: { type: 'string' }, title: { type: 'string' }, body: { type: 'string' } }, required: ['owner', 'repo', 'title'] } },
      { name: 'get_pull_request', description: 'Get details of a pull request', inputSchema: { type: 'object', properties: { owner: { type: 'string' }, repo: { type: 'string' }, pull_number: { type: 'integer' } }, required: ['owner', 'repo', 'pull_number'] } },
      { name: 'search_code', description: 'Search for code across repositories', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
    ],
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send messages and interact with Slack workspaces',
    category: 'communication',
    provider: 'Anthropic',
    npmPackage: '@modelcontextprotocol/server-slack',
    githubUrl: 'https://github.com/modelcontextprotocol/servers',
    configTemplate: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-slack'],
      env: { SLACK_BOT_TOKEN: '', SLACK_TEAM_ID: '' },
    },
    requiredEnvVars: ['SLACK_BOT_TOKEN', 'SLACK_TEAM_ID'],
    features: ['Send messages', 'Read channels', 'List users', 'Search messages'],
    installCommand: 'npm install -g @modelcontextprotocol/server-slack',
    status: 'available',
    tools: [
      { name: 'send_message', description: 'Send a message to a channel', inputSchema: { type: 'object', properties: { channel: { type: 'string' }, text: { type: 'string' } }, required: ['channel', 'text'] } },
      { name: 'list_channels', description: 'List available channels', inputSchema: { type: 'object', properties: { limit: { type: 'integer' } } } },
    ],
  },
  {
    id: 'postgres',
    name: 'PostgreSQL',
    description: 'Query and manage PostgreSQL databases',
    category: 'data',
    provider: 'Anthropic',
    npmPackage: '@modelcontextprotocol/server-postgres',
    githubUrl: 'https://github.com/modelcontextprotocol/servers',
    configTemplate: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-postgres', 'postgresql://localhost/mydb'],
    },
    requiredEnvVars: [],
    features: ['Run queries', 'List tables', 'Describe schema', 'Read data'],
    installCommand: 'npm install -g @modelcontextprotocol/server-postgres',
    status: 'installed',
    tools: [
      { name: 'query', description: 'Execute a SQL query', inputSchema: { type: 'object', properties: { sql: { type: 'string' } }, required: ['sql'] } },
      { name: 'list_tables', description: 'List all tables in the database', inputSchema: { type: 'object', properties: {} } },
      { name: 'describe_table', description: 'Get table schema', inputSchema: { type: 'object', properties: { table: { type: 'string' } }, required: ['table'] } },
    ],
  },
  {
    id: 'brave-search',
    name: 'Brave Search',
    description: 'Web and local search using Brave Search API',
    category: 'productivity',
    provider: 'Anthropic',
    npmPackage: '@modelcontextprotocol/server-brave-search',
    githubUrl: 'https://github.com/modelcontextprotocol/servers',
    configTemplate: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-brave-search'],
      env: { BRAVE_API_KEY: '' },
    },
    requiredEnvVars: ['BRAVE_API_KEY'],
    features: ['Web search', 'Local search', 'News search', 'Image search'],
    installCommand: 'npm install -g @modelcontextprotocol/server-brave-search',
    status: 'running',
    lastHealthCheck: new Date(),
    healthStatus: 'healthy',
    tools: [
      { name: 'web_search', description: 'Search the web', inputSchema: { type: 'object', properties: { query: { type: 'string' }, count: { type: 'integer', default: 10 } }, required: ['query'] } },
      { name: 'news_search', description: 'Search for news articles', inputSchema: { type: 'object', properties: { query: { type: 'string' }, freshness: { type: 'string', enum: ['day', 'week', 'month'] } }, required: ['query'] } },
    ],
  },
  {
    id: 'puppeteer',
    name: 'Puppeteer',
    description: 'Browser automation and web scraping with Puppeteer',
    category: 'development',
    provider: 'Anthropic',
    npmPackage: '@modelcontextprotocol/server-puppeteer',
    githubUrl: 'https://github.com/modelcontextprotocol/servers',
    configTemplate: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-puppeteer'],
    },
    requiredEnvVars: [],
    features: ['Navigate pages', 'Screenshot', 'Click elements', 'Fill forms', 'Extract content'],
    installCommand: 'npm install -g @modelcontextprotocol/server-puppeteer',
    status: 'available',
    tools: [
      { name: 'navigate', description: 'Navigate to a URL', inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] } },
      { name: 'screenshot', description: 'Take a screenshot', inputSchema: { type: 'object', properties: { fullPage: { type: 'boolean' } } } },
      { name: 'click', description: 'Click an element', inputSchema: { type: 'object', properties: { selector: { type: 'string' } }, required: ['selector'] } },
    ],
  },
  {
    id: 'memory',
    name: 'Memory',
    description: 'Persistent memory using knowledge graph for context retention',
    category: 'ai',
    provider: 'Anthropic',
    npmPackage: '@modelcontextprotocol/server-memory',
    githubUrl: 'https://github.com/modelcontextprotocol/servers',
    configTemplate: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-memory'],
    },
    requiredEnvVars: [],
    features: ['Create entities', 'Create relations', 'Query knowledge', 'Delete entities'],
    installCommand: 'npm install -g @modelcontextprotocol/server-memory',
    status: 'running',
    lastHealthCheck: new Date(),
    healthStatus: 'healthy',
    tools: [
      { name: 'create_entity', description: 'Create a new entity in the knowledge graph', inputSchema: { type: 'object', properties: { name: { type: 'string' }, type: { type: 'string' }, properties: { type: 'object' } }, required: ['name', 'type'] } },
      { name: 'create_relation', description: 'Create a relation between entities', inputSchema: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' }, type: { type: 'string' } }, required: ['from', 'to', 'type'] } },
      { name: 'query', description: 'Query the knowledge graph', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
    ],
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Access and search Google Drive files',
    category: 'productivity',
    provider: 'Anthropic',
    npmPackage: '@modelcontextprotocol/server-gdrive',
    githubUrl: 'https://github.com/modelcontextprotocol/servers',
    configTemplate: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-gdrive'],
    },
    requiredEnvVars: ['GDRIVE_CREDENTIALS_PATH'],
    optionalEnvVars: ['GDRIVE_TOKEN_PATH'],
    features: ['List files', 'Read files', 'Search', 'Download'],
    installCommand: 'npm install -g @modelcontextprotocol/server-gdrive',
    status: 'error',
    errorMessage: 'Authentication required',
    tools: [],
  },
  {
    id: 'fetch',
    name: 'Fetch',
    description: 'Fetch URLs and convert web content to markdown',
    category: 'utility',
    provider: 'Anthropic',
    npmPackage: '@modelcontextprotocol/server-fetch',
    githubUrl: 'https://github.com/modelcontextprotocol/servers',
    configTemplate: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-fetch'],
    },
    requiredEnvVars: [],
    features: ['Fetch URLs', 'Convert to markdown', 'Extract text', 'Handle redirects'],
    installCommand: 'npm install -g @modelcontextprotocol/server-fetch',
    status: 'running',
    lastHealthCheck: new Date(),
    healthStatus: 'healthy',
    tools: [
      { name: 'fetch', description: 'Fetch a URL and return its content', inputSchema: { type: 'object', properties: { url: { type: 'string' }, format: { type: 'string', enum: ['markdown', 'html', 'text'] } }, required: ['url'] } },
    ],
  },
];

// ============================================================================
// Hook: useMCPServers
// ============================================================================

export function useMCPServers() {
  const [servers, setServers] = useState<MCPServerWithTools[]>(MCP_SERVER_CATALOG);
  const [installations, setInstallations] = useState<MCPInstallation[]>([]);
  const [healthChecks, setHealthChecks] = useState<Map<string, MCPHealthCheck>>(new Map());
  const [executions, setExecutions] = useState<MCPToolExecution[]>([]);
  const [conversationConfigs, setConversationConfigs] = useState<Map<string, MCPConversationConfig>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ========================================
  // Server Management
  // ========================================

  const getServer = useCallback((serverId: string): MCPServerWithTools | undefined => {
    return servers.find((s) => s.id === serverId);
  }, [servers]);

  const refreshServers = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update health status for running servers
      setServers((prev) =>
        prev.map((s) =>
          s.status === 'running'
            ? { ...s, lastHealthCheck: new Date(), healthStatus: 'healthy' as const }
            : s
        )
      );
    } catch (err) {
      setError('Failed to refresh servers');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const connectServer = useCallback(async (serverId: string): Promise<boolean> => {
    try {
      // Simulate connection
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setServers((prev) =>
        prev.map((s) =>
          s.id === serverId
            ? {
                ...s,
                status: 'running' as const,
                lastHealthCheck: new Date(),
                healthStatus: 'healthy' as const,
              }
            : s
        )
      );

      return true;
    } catch (err) {
      setServers((prev) =>
        prev.map((s) =>
          s.id === serverId
            ? {
                ...s,
                status: 'error' as const,
                errorMessage: 'Connection failed',
              }
            : s
        )
      );
      return false;
    }
  }, []);

  const disconnectServer = useCallback(async (serverId: string): Promise<boolean> => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      setServers((prev) =>
        prev.map((s) =>
          s.id === serverId
            ? { ...s, status: 'installed' as const, healthStatus: undefined }
            : s
        )
      );

      return true;
    } catch {
      return false;
    }
  }, []);

  const addServer = useCallback((config: Partial<MCPServerWithTools>): MCPServerWithTools => {
    const newServer: MCPServerWithTools = {
      id: `custom-${Date.now()}`,
      name: config.name || 'Custom Server',
      description: config.description || '',
      category: config.category || 'utility',
      provider: 'Custom',
      requiredEnvVars: config.requiredEnvVars || [],
      features: config.features || [],
      installCommand: '',
      status: 'available',
      ...config,
    };

    setServers((prev) => [...prev, newServer]);
    return newServer;
  }, []);

  const removeServer = useCallback((serverId: string) => {
    setServers((prev) => prev.filter((s) => s.id !== serverId));
  }, []);

  // ========================================
  // Tool Execution
  // ========================================

  const executeTool = useCallback(
    async (
      serverId: string,
      toolName: string,
      input: Record<string, unknown>
    ): Promise<MCPToolExecution> => {
      const execution: MCPToolExecution = {
        id: `exec-${Date.now()}`,
        toolName,
        serverId,
        input,
        status: 'running',
        startTime: new Date(),
      };

      setExecutions((prev) => [...prev, execution]);

      try {
        // Simulate tool execution
        await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));

        const completedExecution: MCPToolExecution = {
          ...execution,
          status: 'success',
          output: {
            result: `Successfully executed ${toolName}`,
            timestamp: new Date().toISOString(),
          },
          endTime: new Date(),
          duration: Date.now() - execution.startTime.getTime(),
        };

        setExecutions((prev) =>
          prev.map((e) => (e.id === execution.id ? completedExecution : e))
        );

        return completedExecution;
      } catch (err) {
        const failedExecution: MCPToolExecution = {
          ...execution,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
          endTime: new Date(),
          duration: Date.now() - execution.startTime.getTime(),
        };

        setExecutions((prev) =>
          prev.map((e) => (e.id === execution.id ? failedExecution : e))
        );

        return failedExecution;
      }
    },
    []
  );

  const getExecutionHistory = useCallback((serverId?: string, limit = 50) => {
    let history = [...executions].reverse();
    if (serverId) {
      history = history.filter((e) => e.serverId === serverId);
    }
    return history.slice(0, limit);
  }, [executions]);

  // ========================================
  // Conversation-level Controls
  // ========================================

  const getConversationConfig = useCallback(
    (conversationId: string): MCPConversationConfig => {
      return (
        conversationConfigs.get(conversationId) || {
          conversationId,
          enabledServers: servers.filter((s) => s.status === 'running').map((s) => s.id),
          suggestedTools: [],
        }
      );
    },
    [conversationConfigs, servers]
  );

  const setConversationServers = useCallback(
    (conversationId: string, serverIds: string[]) => {
      setConversationConfigs((prev) => {
        const next = new Map(prev);
        const config = next.get(conversationId) || {
          conversationId,
          enabledServers: [],
          suggestedTools: [],
        };
        next.set(conversationId, { ...config, enabledServers: serverIds });
        return next;
      });
    },
    []
  );

  const toggleConversationServer = useCallback(
    (conversationId: string, serverId: string) => {
      setConversationConfigs((prev) => {
        const next = new Map(prev);
        const config = next.get(conversationId) || {
          conversationId,
          enabledServers: servers.filter((s) => s.status === 'running').map((s) => s.id),
          suggestedTools: [],
        };
        const enabled = new Set(config.enabledServers);
        if (enabled.has(serverId)) {
          enabled.delete(serverId);
        } else {
          enabled.add(serverId);
        }
        next.set(conversationId, { ...config, enabledServers: Array.from(enabled) });
        return next;
      });
    },
    [servers]
  );

  // ========================================
  // Computed Values
  // ========================================

  const runningServers = useMemo(
    () => servers.filter((s) => s.status === 'running'),
    [servers]
  );

  const availableTools = useMemo(() => {
    return runningServers.flatMap((s) =>
      (s.tools || []).map((t) => ({
        ...t,
        serverId: s.id,
        serverName: s.name,
      }))
    );
  }, [runningServers]);

  const serversByCategory = useMemo(() => {
    const grouped: Record<string, MCPServerWithTools[]> = {};
    servers.forEach((s) => {
      if (!grouped[s.category]) {
        grouped[s.category] = [];
      }
      grouped[s.category].push(s);
    });
    return grouped;
  }, [servers]);

  const toolUsageStats = useMemo(() => {
    const stats: Record<string, number> = {};
    executions.forEach((e) => {
      const key = `${e.serverId}:${e.toolName}`;
      stats[key] = (stats[key] || 0) + 1;
    });
    return stats;
  }, [executions]);

  // ========================================
  // Health Check Effect
  // ========================================

  useEffect(() => {
    const interval = setInterval(() => {
      runningServers.forEach((server) => {
        // Update health check
        setHealthChecks((prev) => {
          const next = new Map(prev);
          next.set(server.id, {
            serverId: server.id,
            timestamp: new Date(),
            status: 'healthy',
            responseTime: Math.random() * 100,
            toolsAvailable: server.tools?.length || 0,
          });
          return next;
        });
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [runningServers]);

  // ========================================
  // Return Hook API
  // ========================================

  return {
    // State
    servers,
    installations,
    healthChecks,
    executions,
    isLoading,
    isRefreshing,
    error,

    // Computed
    runningServers,
    availableTools,
    serversByCategory,
    toolUsageStats,

    // Server Management
    getServer,
    refreshServers,
    connectServer,
    disconnectServer,
    addServer,
    removeServer,

    // Tool Execution
    executeTool,
    getExecutionHistory,

    // Conversation Controls
    getConversationConfig,
    setConversationServers,
    toggleConversationServer,

    // Error Handling
    clearError: () => setError(null),
  };
}

export default useMCPServers;
