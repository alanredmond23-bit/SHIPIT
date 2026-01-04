// MCP Server Integrations
// Popular Model Context Protocol servers for enhanced AI capabilities

// ============================================================================
// MCP Server Types
// ============================================================================

export interface MCPServer {
  id: string;
  name: string;
  description: string;
  category: MCPCategory;
  author: string;
  repository: string;
  npm_package?: string;
  docker_image?: string;

  // Capabilities
  tools: MCPTool[];
  resources?: MCPResource[];

  // Configuration
  config_schema: Record<string, ConfigField>;
  env_vars?: string[];

  // Meta
  stars: number;
  downloads?: number;
  last_updated: string;
  documentation_url?: string;

  // Setup
  setup_instructions: string[];
  example_config: string;
}

export type MCPCategory =
  | 'filesystem'
  | 'database'
  | 'web'
  | 'git'
  | 'cloud'
  | 'productivity'
  | 'communication'
  | 'analytics'
  | 'development';

export interface MCPTool {
  name: string;
  description: string;
  input_schema: Record<string, any>;
  example_usage?: string;
}

export interface MCPResource {
  uri_template: string;
  name: string;
  description: string;
  mime_type?: string;
}

export interface ConfigField {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: any;
  env_var?: string;
}

// ============================================================================
// Popular MCP Servers (Top 9)
// ============================================================================

export const MCP_SERVERS: MCPServer[] = [
  // 1. Filesystem Server
  {
    id: 'mcp-filesystem',
    name: 'Filesystem',
    description: 'Secure file operations with configurable access controls',
    category: 'filesystem',
    author: 'Anthropic',
    repository: 'https://github.com/modelcontextprotocol/servers',
    npm_package: '@modelcontextprotocol/server-filesystem',
    tools: [
      {
        name: 'read_file',
        description: 'Read the complete contents of a file',
        input_schema: { path: { type: 'string', required: true } },
        example_usage: 'read_file({ path: "/path/to/file.txt" })',
      },
      {
        name: 'write_file',
        description: 'Create or overwrite a file',
        input_schema: {
          path: { type: 'string', required: true },
          content: { type: 'string', required: true },
        },
      },
      {
        name: 'list_directory',
        description: 'List contents of a directory',
        input_schema: { path: { type: 'string', required: true } },
      },
      {
        name: 'create_directory',
        description: 'Create a new directory',
        input_schema: { path: { type: 'string', required: true } },
      },
      {
        name: 'move_file',
        description: 'Move or rename a file',
        input_schema: {
          source: { type: 'string', required: true },
          destination: { type: 'string', required: true },
        },
      },
      {
        name: 'search_files',
        description: 'Search for files matching a pattern',
        input_schema: {
          path: { type: 'string', required: true },
          pattern: { type: 'string', required: true },
        },
      },
    ],
    config_schema: {
      allowed_directories: {
        type: 'array',
        description: 'List of directories the server can access',
        required: true,
      },
    },
    stars: 15000,
    last_updated: '2025-01',
    documentation_url: 'https://modelcontextprotocol.io/docs/servers/filesystem',
    setup_instructions: [
      'npm install @modelcontextprotocol/server-filesystem',
      'Configure allowed_directories in your MCP config',
      'Add server to your Claude config.json',
    ],
    example_config: `{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/you/Documents", "/Users/you/Projects"]
    }
  }
}`,
  },

  // 2. GitHub Server
  {
    id: 'mcp-github',
    name: 'GitHub',
    description: 'Interact with GitHub repositories, issues, PRs, and more',
    category: 'git',
    author: 'Anthropic',
    repository: 'https://github.com/modelcontextprotocol/servers',
    npm_package: '@modelcontextprotocol/server-github',
    tools: [
      {
        name: 'create_or_update_file',
        description: 'Create or update a file in a repository',
        input_schema: {
          owner: { type: 'string', required: true },
          repo: { type: 'string', required: true },
          path: { type: 'string', required: true },
          content: { type: 'string', required: true },
          message: { type: 'string', required: true },
        },
      },
      {
        name: 'search_repositories',
        description: 'Search for GitHub repositories',
        input_schema: { query: { type: 'string', required: true } },
      },
      {
        name: 'create_issue',
        description: 'Create a new issue in a repository',
        input_schema: {
          owner: { type: 'string', required: true },
          repo: { type: 'string', required: true },
          title: { type: 'string', required: true },
          body: { type: 'string', required: false },
        },
      },
      {
        name: 'create_pull_request',
        description: 'Create a new pull request',
        input_schema: {
          owner: { type: 'string', required: true },
          repo: { type: 'string', required: true },
          title: { type: 'string', required: true },
          head: { type: 'string', required: true },
          base: { type: 'string', required: true },
        },
      },
      {
        name: 'fork_repository',
        description: 'Fork a repository',
        input_schema: {
          owner: { type: 'string', required: true },
          repo: { type: 'string', required: true },
        },
      },
      {
        name: 'list_commits',
        description: 'List commits in a repository',
        input_schema: {
          owner: { type: 'string', required: true },
          repo: { type: 'string', required: true },
        },
      },
    ],
    config_schema: {
      github_token: {
        type: 'string',
        description: 'GitHub Personal Access Token',
        required: true,
        env_var: 'GITHUB_TOKEN',
      },
    },
    env_vars: ['GITHUB_TOKEN'],
    stars: 12000,
    last_updated: '2025-01',
    setup_instructions: [
      'Create a GitHub Personal Access Token',
      'Set GITHUB_TOKEN environment variable',
      'npm install @modelcontextprotocol/server-github',
    ],
    example_config: `{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "<your-token>"
      }
    }
  }
}`,
  },

  // 3. PostgreSQL Server
  {
    id: 'mcp-postgres',
    name: 'PostgreSQL',
    description: 'Query and manage PostgreSQL databases with schema inspection',
    category: 'database',
    author: 'Anthropic',
    repository: 'https://github.com/modelcontextprotocol/servers',
    npm_package: '@modelcontextprotocol/server-postgres',
    tools: [
      {
        name: 'query',
        description: 'Execute a read-only SQL query',
        input_schema: { sql: { type: 'string', required: true } },
        example_usage: 'query({ sql: "SELECT * FROM users LIMIT 10" })',
      },
    ],
    resources: [
      {
        uri_template: 'postgres://{table}/schema',
        name: 'Table Schema',
        description: 'Get the schema of a database table',
      },
    ],
    config_schema: {
      connection_string: {
        type: 'string',
        description: 'PostgreSQL connection string',
        required: true,
        env_var: 'POSTGRES_URL',
      },
    },
    env_vars: ['POSTGRES_URL'],
    stars: 8500,
    last_updated: '2025-01',
    setup_instructions: [
      'npm install @modelcontextprotocol/server-postgres',
      'Set POSTGRES_URL environment variable',
      'Add to Claude config',
    ],
    example_config: `{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://user:pass@localhost/db"]
    }
  }
}`,
  },

  // 4. Puppeteer Server (Web Browsing)
  {
    id: 'mcp-puppeteer',
    name: 'Puppeteer',
    description: 'Browser automation for web scraping and interaction',
    category: 'web',
    author: 'Anthropic',
    repository: 'https://github.com/modelcontextprotocol/servers',
    npm_package: '@modelcontextprotocol/server-puppeteer',
    tools: [
      {
        name: 'puppeteer_navigate',
        description: 'Navigate to a URL in the browser',
        input_schema: { url: { type: 'string', required: true } },
      },
      {
        name: 'puppeteer_screenshot',
        description: 'Take a screenshot of the current page',
        input_schema: { name: { type: 'string', required: true } },
      },
      {
        name: 'puppeteer_click',
        description: 'Click on an element',
        input_schema: { selector: { type: 'string', required: true } },
      },
      {
        name: 'puppeteer_fill',
        description: 'Fill out an input field',
        input_schema: {
          selector: { type: 'string', required: true },
          value: { type: 'string', required: true },
        },
      },
      {
        name: 'puppeteer_evaluate',
        description: 'Execute JavaScript in the browser',
        input_schema: { script: { type: 'string', required: true } },
      },
    ],
    config_schema: {
      headless: {
        type: 'boolean',
        description: 'Run browser in headless mode',
        required: false,
        default: true,
      },
    },
    stars: 9200,
    last_updated: '2025-01',
    setup_instructions: [
      'npm install @modelcontextprotocol/server-puppeteer',
      'Ensure Chrome/Chromium is installed',
      'Add to Claude config',
    ],
    example_config: `{
  "mcpServers": {
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
    }
  }
}`,
  },

  // 5. Slack Server
  {
    id: 'mcp-slack',
    name: 'Slack',
    description: 'Send messages and interact with Slack workspaces',
    category: 'communication',
    author: 'Anthropic',
    repository: 'https://github.com/modelcontextprotocol/servers',
    npm_package: '@modelcontextprotocol/server-slack',
    tools: [
      {
        name: 'slack_post_message',
        description: 'Post a message to a Slack channel',
        input_schema: {
          channel: { type: 'string', required: true },
          text: { type: 'string', required: true },
        },
      },
      {
        name: 'slack_list_channels',
        description: 'List available Slack channels',
        input_schema: {},
      },
      {
        name: 'slack_get_channel_history',
        description: 'Get message history from a channel',
        input_schema: {
          channel: { type: 'string', required: true },
          limit: { type: 'number', required: false },
        },
      },
      {
        name: 'slack_reply_to_thread',
        description: 'Reply to a message thread',
        input_schema: {
          channel: { type: 'string', required: true },
          thread_ts: { type: 'string', required: true },
          text: { type: 'string', required: true },
        },
      },
    ],
    config_schema: {
      bot_token: {
        type: 'string',
        description: 'Slack Bot User OAuth Token',
        required: true,
        env_var: 'SLACK_BOT_TOKEN',
      },
      team_id: {
        type: 'string',
        description: 'Slack Team ID',
        required: true,
        env_var: 'SLACK_TEAM_ID',
      },
    },
    env_vars: ['SLACK_BOT_TOKEN', 'SLACK_TEAM_ID'],
    stars: 7800,
    last_updated: '2025-01',
    setup_instructions: [
      'Create a Slack app and get Bot Token',
      'Set SLACK_BOT_TOKEN and SLACK_TEAM_ID',
      'npm install @modelcontextprotocol/server-slack',
    ],
    example_config: `{
  "mcpServers": {
    "slack": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-slack"],
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-...",
        "SLACK_TEAM_ID": "T..."
      }
    }
  }
}`,
  },

  // 6. Google Drive Server
  {
    id: 'mcp-gdrive',
    name: 'Google Drive',
    description: 'Search and read files from Google Drive',
    category: 'cloud',
    author: 'Anthropic',
    repository: 'https://github.com/modelcontextprotocol/servers',
    npm_package: '@modelcontextprotocol/server-gdrive',
    tools: [
      {
        name: 'gdrive_search',
        description: 'Search for files in Google Drive',
        input_schema: { query: { type: 'string', required: true } },
      },
      {
        name: 'gdrive_read_file',
        description: 'Read contents of a file',
        input_schema: { file_id: { type: 'string', required: true } },
      },
    ],
    resources: [
      {
        uri_template: 'gdrive:///{file_id}',
        name: 'Drive File',
        description: 'Access a Google Drive file by ID',
        mime_type: 'application/octet-stream',
      },
    ],
    config_schema: {
      credentials_path: {
        type: 'string',
        description: 'Path to Google OAuth credentials JSON',
        required: true,
      },
    },
    stars: 6500,
    last_updated: '2025-01',
    setup_instructions: [
      'Create OAuth credentials in Google Cloud Console',
      'Download credentials.json',
      'npm install @modelcontextprotocol/server-gdrive',
      'Run auth flow on first use',
    ],
    example_config: `{
  "mcpServers": {
    "gdrive": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-gdrive"]
    }
  }
}`,
  },

  // 7. Brave Search Server
  {
    id: 'mcp-brave-search',
    name: 'Brave Search',
    description: 'Privacy-focused web search using Brave Search API',
    category: 'web',
    author: 'Anthropic',
    repository: 'https://github.com/modelcontextprotocol/servers',
    npm_package: '@modelcontextprotocol/server-brave-search',
    tools: [
      {
        name: 'brave_web_search',
        description: 'Search the web using Brave Search',
        input_schema: {
          query: { type: 'string', required: true },
          count: { type: 'number', required: false, default: 10 },
        },
        example_usage: 'brave_web_search({ query: "latest AI news" })',
      },
      {
        name: 'brave_local_search',
        description: 'Search for local businesses and places',
        input_schema: {
          query: { type: 'string', required: true },
          count: { type: 'number', required: false },
        },
      },
    ],
    config_schema: {
      api_key: {
        type: 'string',
        description: 'Brave Search API Key',
        required: true,
        env_var: 'BRAVE_API_KEY',
      },
    },
    env_vars: ['BRAVE_API_KEY'],
    stars: 5800,
    last_updated: '2025-01',
    setup_instructions: [
      'Get API key from Brave Search API',
      'Set BRAVE_API_KEY environment variable',
      'npm install @modelcontextprotocol/server-brave-search',
    ],
    example_config: `{
  "mcpServers": {
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "<your-key>"
      }
    }
  }
}`,
  },

  // 8. Memory Server
  {
    id: 'mcp-memory',
    name: 'Memory',
    description: 'Persistent memory using a knowledge graph',
    category: 'productivity',
    author: 'Anthropic',
    repository: 'https://github.com/modelcontextprotocol/servers',
    npm_package: '@modelcontextprotocol/server-memory',
    tools: [
      {
        name: 'create_entities',
        description: 'Create new entities in the knowledge graph',
        input_schema: {
          entities: {
            type: 'array',
            required: true,
            description: 'Array of entities with name, type, observations',
          },
        },
      },
      {
        name: 'create_relations',
        description: 'Create relationships between entities',
        input_schema: {
          relations: {
            type: 'array',
            required: true,
            description: 'Array of relations with from, to, type',
          },
        },
      },
      {
        name: 'search_nodes',
        description: 'Search for entities matching criteria',
        input_schema: { query: { type: 'string', required: true } },
      },
      {
        name: 'open_nodes',
        description: 'Retrieve specific entities by name',
        input_schema: {
          names: { type: 'array', required: true },
        },
      },
    ],
    config_schema: {
      memory_path: {
        type: 'string',
        description: 'Path to store memory database',
        required: false,
        default: '~/.mcp-memory',
      },
    },
    stars: 7200,
    last_updated: '2025-01',
    setup_instructions: [
      'npm install @modelcontextprotocol/server-memory',
      'Memory persists across sessions automatically',
      'Add to Claude config',
    ],
    example_config: `{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    }
  }
}`,
  },

  // 9. Sequential Thinking Server
  {
    id: 'mcp-sequential-thinking',
    name: 'Sequential Thinking',
    description: 'Structured problem-solving through step-by-step reasoning',
    category: 'development',
    author: 'Anthropic',
    repository: 'https://github.com/modelcontextprotocol/servers',
    npm_package: '@modelcontextprotocol/server-sequential-thinking',
    tools: [
      {
        name: 'sequentialthinking',
        description: 'Break down complex problems into sequential steps',
        input_schema: {
          thought: { type: 'string', required: true },
          thought_number: { type: 'number', required: true },
          total_thoughts: { type: 'number', required: true },
          next_thought_needed: { type: 'boolean', required: true },
        },
      },
    ],
    config_schema: {},
    stars: 4500,
    last_updated: '2025-01',
    setup_instructions: [
      'npm install @modelcontextprotocol/server-sequential-thinking',
      'Add to Claude config',
      'Use for complex reasoning tasks',
    ],
    example_config: `{
  "mcpServers": {
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    }
  }
}`,
  },
];

// ============================================================================
// MCP Integration Service
// ============================================================================

export class MCPIntegrationService {
  private supabase: any;

  constructor(supabase?: any) {
    this.supabase = supabase;
  }

  // Get all MCP servers
  getServers(category?: MCPCategory): MCPServer[] {
    if (category) {
      return MCP_SERVERS.filter((s) => s.category === category);
    }
    return MCP_SERVERS;
  }

  // Get server by ID
  getServer(id: string): MCPServer | undefined {
    return MCP_SERVERS.find((s) => s.id === id);
  }

  // Get servers by category
  getServersByCategory(): Record<MCPCategory, MCPServer[]> {
    const result: Partial<Record<MCPCategory, MCPServer[]>> = {};

    for (const server of MCP_SERVERS) {
      if (!result[server.category]) {
        result[server.category] = [];
      }
      result[server.category]!.push(server);
    }

    return result as Record<MCPCategory, MCPServer[]>;
  }

  // Generate config for selected servers
  generateConfig(serverIds: string[]): string {
    const servers = serverIds
      .map((id) => this.getServer(id))
      .filter((s): s is MCPServer => s !== undefined);

    const config: Record<string, any> = {
      mcpServers: {},
    };

    for (const server of servers) {
      // Parse example config to extract just this server's config
      try {
        const parsed = JSON.parse(server.example_config);
        const serverKey = Object.keys(parsed.mcpServers)[0];
        config.mcpServers[serverKey] = parsed.mcpServers[serverKey];
      } catch {
        // Fallback to basic config
        config.mcpServers[server.id] = {
          command: 'npx',
          args: ['-y', server.npm_package],
        };
      }
    }

    return JSON.stringify(config, null, 2);
  }

  // Get required environment variables for servers
  getRequiredEnvVars(serverIds: string[]): string[] {
    const envVars: Set<string> = new Set();

    for (const id of serverIds) {
      const server = this.getServer(id);
      if (server?.env_vars) {
        for (const envVar of server.env_vars) {
          envVars.add(envVar);
        }
      }
    }

    return Array.from(envVars);
  }

  // Get recommended servers for a use case
  recommendServers(useCase: {
    needs_file_access: boolean;
    needs_git: boolean;
    needs_database: boolean;
    needs_web: boolean;
    needs_communication: boolean;
    needs_memory: boolean;
  }): MCPServer[] {
    const recommendations: MCPServer[] = [];

    if (useCase.needs_file_access) {
      const fs = this.getServer('mcp-filesystem');
      if (fs) recommendations.push(fs);
    }

    if (useCase.needs_git) {
      const gh = this.getServer('mcp-github');
      if (gh) recommendations.push(gh);
    }

    if (useCase.needs_database) {
      const pg = this.getServer('mcp-postgres');
      if (pg) recommendations.push(pg);
    }

    if (useCase.needs_web) {
      const brave = this.getServer('mcp-brave-search');
      const puppeteer = this.getServer('mcp-puppeteer');
      if (brave) recommendations.push(brave);
      if (puppeteer) recommendations.push(puppeteer);
    }

    if (useCase.needs_communication) {
      const slack = this.getServer('mcp-slack');
      if (slack) recommendations.push(slack);
    }

    if (useCase.needs_memory) {
      const memory = this.getServer('mcp-memory');
      if (memory) recommendations.push(memory);
    }

    return recommendations;
  }
}

export default MCPIntegrationService;
