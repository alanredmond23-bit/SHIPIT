'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';

// MCP Server Types
export interface MCPServer {
  id: string;
  name: string;
  description: string;
  category: 'productivity' | 'development' | 'data' | 'communication' | 'ai' | 'utility';
  provider: string;
  npmPackage?: string;
  githubUrl?: string;
  configTemplate: MCPServerConfig;
  requiredEnvVars: string[];
  optionalEnvVars?: string[];
  features: string[];
  installCommand: string;
  status: 'available' | 'installed' | 'running' | 'error' | 'updating';
  version?: string;
  lastHealthCheck?: Date;
  healthStatus?: 'healthy' | 'unhealthy' | 'unknown';
}

export interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
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

// Available MCP Servers Catalog (based on popular servers)
const MCP_SERVER_CATALOG: MCPServer[] = [
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
    status: 'available',
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
    status: 'available',
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
    status: 'available',
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
    status: 'available',
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
    status: 'available',
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
    status: 'available',
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
    status: 'available',
  },
];

// Hook for managing MCP servers
export function useMCPManager() {
  const [servers, setServers] = useState<MCPServer[]>(MCP_SERVER_CATALOG);
  const [installations, setInstallations] = useState<MCPInstallation[]>([]);
  const [healthChecks, setHealthChecks] = useState<Map<string, MCPHealthCheck>>(new Map());
  const [isInstalling, setIsInstalling] = useState<string | null>(null);
  const [configEditorOpen, setConfigEditorOpen] = useState<string | null>(null);
  const [pendingConfig, setPendingConfig] = useState<MCPServerConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get server by ID
  const getServer = useCallback((serverId: string): MCPServer | undefined => {
    return servers.find(s => s.id === serverId);
  }, [servers]);

  // Get installation for a server
  const getInstallation = useCallback((serverId: string): MCPInstallation | undefined => {
    return installations.find(i => i.serverId === serverId);
  }, [installations]);

  // Filter servers by category
  const getServersByCategory = useCallback((category: MCPServer['category']): MCPServer[] => {
    return servers.filter(s => s.category === category);
  }, [servers]);

  // Search servers
  const searchServers = useCallback((query: string): MCPServer[] => {
    const lowerQuery = query.toLowerCase();
    return servers.filter(s =>
      s.name.toLowerCase().includes(lowerQuery) ||
      s.description.toLowerCase().includes(lowerQuery) ||
      s.features.some(f => f.toLowerCase().includes(lowerQuery))
    );
  }, [servers]);

  // Generate config for Claude Desktop
  const generateClaudeConfig = useCallback((): Record<string, MCPServerConfig> => {
    const config: Record<string, MCPServerConfig> = {};

    installations.forEach(installation => {
      const server = getServer(installation.serverId);
      if (server) {
        config[server.id] = installation.config;
      }
    });

    return config;
  }, [installations, getServer]);

  // Export full Claude Desktop config
  const exportClaudeDesktopConfig = useCallback((): string => {
    const mcpServers = generateClaudeConfig();
    const config = {
      mcpServers,
    };
    return JSON.stringify(config, null, 2);
  }, [generateClaudeConfig]);

  // Install a server
  const installServer = useCallback(async (serverId: string, config: MCPServerConfig): Promise<boolean> => {
    setIsInstalling(serverId);
    setError(null);

    try {
      // Simulate installation process
      await new Promise(resolve => setTimeout(resolve, 2000));

      const installation: MCPInstallation = {
        serverId,
        installedAt: new Date(),
        config,
        autoStart: true,
      };

      setInstallations(prev => [...prev.filter(i => i.serverId !== serverId), installation]);

      setServers(prev => prev.map(s =>
        s.id === serverId ? { ...s, status: 'installed' } : s
      ));

      setIsInstalling(null);
      return true;
    } catch (err) {
      setError(`Failed to install ${serverId}: ${err}`);
      setIsInstalling(null);
      return false;
    }
  }, []);

  // Uninstall a server
  const uninstallServer = useCallback(async (serverId: string): Promise<boolean> => {
    try {
      setInstallations(prev => prev.filter(i => i.serverId !== serverId));
      setServers(prev => prev.map(s =>
        s.id === serverId ? { ...s, status: 'available' } : s
      ));
      setHealthChecks(prev => {
        const next = new Map(prev);
        next.delete(serverId);
        return next;
      });
      return true;
    } catch (err) {
      setError(`Failed to uninstall ${serverId}: ${err}`);
      return false;
    }
  }, []);

  // Update server config
  const updateConfig = useCallback((serverId: string, config: MCPServerConfig): void => {
    setInstallations(prev => prev.map(i =>
      i.serverId === serverId ? { ...i, config } : i
    ));
  }, []);

  // Start a server
  const startServer = useCallback(async (serverId: string): Promise<boolean> => {
    try {
      // Simulate starting
      await new Promise(resolve => setTimeout(resolve, 500));

      setServers(prev => prev.map(s =>
        s.id === serverId ? { ...s, status: 'running' } : s
      ));

      setInstallations(prev => prev.map(i =>
        i.serverId === serverId ? { ...i, lastStarted: new Date() } : i
      ));

      return true;
    } catch (err) {
      setError(`Failed to start ${serverId}: ${err}`);
      return false;
    }
  }, []);

  // Stop a server
  const stopServer = useCallback(async (serverId: string): Promise<boolean> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));

      setServers(prev => prev.map(s =>
        s.id === serverId ? { ...s, status: 'installed' } : s
      ));

      return true;
    } catch (err) {
      setError(`Failed to stop ${serverId}: ${err}`);
      return false;
    }
  }, []);

  // Check server health
  const checkHealth = useCallback(async (serverId: string): Promise<MCPHealthCheck> => {
    const startTime = Date.now();

    try {
      // Simulate health check
      await new Promise(resolve => setTimeout(resolve, 200));

      const check: MCPHealthCheck = {
        serverId,
        timestamp: new Date(),
        status: 'healthy',
        responseTime: Date.now() - startTime,
        toolsAvailable: Math.floor(Math.random() * 10) + 3,
      };

      setHealthChecks(prev => {
        const next = new Map(prev);
        next.set(serverId, check);
        return next;
      });

      setServers(prev => prev.map(s =>
        s.id === serverId ? { ...s, healthStatus: 'healthy', lastHealthCheck: new Date() } : s
      ));

      return check;
    } catch (err) {
      const check: MCPHealthCheck = {
        serverId,
        timestamp: new Date(),
        status: 'unhealthy',
        error: String(err),
      };

      setHealthChecks(prev => {
        const next = new Map(prev);
        next.set(serverId, check);
        return next;
      });

      setServers(prev => prev.map(s =>
        s.id === serverId ? { ...s, healthStatus: 'unhealthy' } : s
      ));

      return check;
    }
  }, []);

  // Check health of all running servers
  const checkAllHealth = useCallback(async (): Promise<void> => {
    const runningServers = servers.filter(s => s.status === 'running');
    await Promise.all(runningServers.map(s => checkHealth(s.id)));
  }, [servers, checkHealth]);

  // Open config editor
  const openConfigEditor = useCallback((serverId: string): void => {
    const server = getServer(serverId);
    const installation = getInstallation(serverId);

    setPendingConfig(installation?.config || server?.configTemplate || null);
    setConfigEditorOpen(serverId);
  }, [getServer, getInstallation]);

  // Close config editor
  const closeConfigEditor = useCallback((): void => {
    setConfigEditorOpen(null);
    setPendingConfig(null);
  }, []);

  // Save config from editor
  const saveConfigFromEditor = useCallback(async (): Promise<boolean> => {
    if (!configEditorOpen || !pendingConfig) return false;

    const isInstalled = installations.some(i => i.serverId === configEditorOpen);

    if (isInstalled) {
      updateConfig(configEditorOpen, pendingConfig);
    } else {
      await installServer(configEditorOpen, pendingConfig);
    }

    closeConfigEditor();
    return true;
  }, [configEditorOpen, pendingConfig, installations, updateConfig, installServer, closeConfigEditor]);

  // Computed values
  const installedServers = useMemo(() =>
    servers.filter(s => s.status !== 'available'),
    [servers]
  );

  const runningServers = useMemo(() =>
    servers.filter(s => s.status === 'running'),
    [servers]
  );

  const availableServers = useMemo(() =>
    servers.filter(s => s.status === 'available'),
    [servers]
  );

  const categories = useMemo(() => {
    const cats = new Set(servers.map(s => s.category));
    return Array.from(cats);
  }, [servers]);

  const serversByCategory = useMemo(() => {
    const grouped: Record<string, MCPServer[]> = {};
    categories.forEach(cat => {
      grouped[cat] = servers.filter(s => s.category === cat);
    });
    return grouped;
  }, [servers, categories]);

  // Auto health check for running servers
  useEffect(() => {
    const interval = setInterval(() => {
      runningServers.forEach(server => {
        checkHealth(server.id);
      });
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [runningServers, checkHealth]);

  return {
    // State
    servers,
    installations,
    healthChecks,
    isInstalling,
    configEditorOpen,
    pendingConfig,
    error,

    // Computed
    installedServers,
    runningServers,
    availableServers,
    categories,
    serversByCategory,

    // Actions
    getServer,
    getInstallation,
    getServersByCategory,
    searchServers,
    installServer,
    uninstallServer,
    updateConfig,
    startServer,
    stopServer,
    checkHealth,
    checkAllHealth,

    // Config editor
    openConfigEditor,
    closeConfigEditor,
    setPendingConfig,
    saveConfigFromEditor,

    // Export
    generateClaudeConfig,
    exportClaudeDesktopConfig,

    // Error handling
    clearError: () => setError(null),
  };
}

export default useMCPManager;
