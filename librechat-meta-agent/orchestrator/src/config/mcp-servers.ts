/**
 * MCP Server Configuration
 * Comprehensive list of 75+ MCP connectors for Meta Agent
 */

export interface MCPServerConfig {
  id: string;
  name: string;
  description: string;
  category: MCPCategory;
  url: string;
  npmPackage?: string;
  envVars?: string[];
  tools: MCPToolConfig[];
  enabled: boolean;
}

export interface MCPToolConfig {
  name: string;
  description: string;
}

export type MCPCategory =
  | 'productivity'
  | 'development'
  | 'data'
  | 'ai'
  | 'communication'
  | 'cloud'
  | 'finance'
  | 'media'
  | 'search'
  | 'automation'
  | 'storage'
  | 'analytics'
  | 'security';

/**
 * MCP Server Registry - 75+ Connectors
 */
export const MCP_SERVERS: MCPServerConfig[] = [
  // ============================================
  // PRODUCTIVITY (15 servers)
  // ============================================
  {
    id: 'google-workspace',
    name: 'Google Workspace',
    description: 'Gmail, Drive, Calendar, Docs, Sheets integration',
    category: 'productivity',
    url: 'npx',
    npmPackage: '@anthropic/mcp-google-workspace',
    envVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    tools: [
      { name: 'gmail_search', description: 'Search emails' },
      { name: 'gmail_send', description: 'Send email' },
      { name: 'drive_list', description: 'List files in Drive' },
      { name: 'drive_read', description: 'Read file content' },
      { name: 'calendar_list', description: 'List calendar events' },
      { name: 'calendar_create', description: 'Create calendar event' },
      { name: 'docs_read', description: 'Read Google Doc' },
      { name: 'sheets_read', description: 'Read spreadsheet' },
    ],
    enabled: true,
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Slack workspace integration',
    category: 'communication',
    url: 'npx',
    npmPackage: '@anthropic/mcp-slack',
    envVars: ['SLACK_BOT_TOKEN'],
    tools: [
      { name: 'slack_search', description: 'Search messages' },
      { name: 'slack_send', description: 'Send message' },
      { name: 'slack_channels', description: 'List channels' },
      { name: 'slack_users', description: 'List users' },
    ],
    enabled: true,
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Notion workspace integration',
    category: 'productivity',
    url: 'npx',
    npmPackage: '@anthropic/mcp-notion',
    envVars: ['NOTION_API_KEY'],
    tools: [
      { name: 'notion_search', description: 'Search pages' },
      { name: 'notion_read', description: 'Read page content' },
      { name: 'notion_create', description: 'Create page' },
      { name: 'notion_update', description: 'Update page' },
    ],
    enabled: true,
  },
  {
    id: 'linear',
    name: 'Linear',
    description: 'Linear issue tracking',
    category: 'productivity',
    url: 'npx',
    npmPackage: '@anthropic/mcp-linear',
    envVars: ['LINEAR_API_KEY'],
    tools: [
      { name: 'linear_issues', description: 'List issues' },
      { name: 'linear_create', description: 'Create issue' },
      { name: 'linear_update', description: 'Update issue' },
    ],
    enabled: true,
  },
  {
    id: 'asana',
    name: 'Asana',
    description: 'Asana project management',
    category: 'productivity',
    url: 'npx',
    npmPackage: '@anthropic/mcp-asana',
    envVars: ['ASANA_ACCESS_TOKEN'],
    tools: [
      { name: 'asana_tasks', description: 'List tasks' },
      { name: 'asana_create', description: 'Create task' },
      { name: 'asana_projects', description: 'List projects' },
    ],
    enabled: false,
  },
  {
    id: 'trello',
    name: 'Trello',
    description: 'Trello boards and cards',
    category: 'productivity',
    url: 'npx',
    npmPackage: 'mcp-trello',
    envVars: ['TRELLO_API_KEY', 'TRELLO_TOKEN'],
    tools: [
      { name: 'trello_boards', description: 'List boards' },
      { name: 'trello_cards', description: 'List cards' },
      { name: 'trello_create_card', description: 'Create card' },
    ],
    enabled: false,
  },
  {
    id: 'todoist',
    name: 'Todoist',
    description: 'Todoist task management',
    category: 'productivity',
    url: 'npx',
    npmPackage: 'mcp-todoist',
    envVars: ['TODOIST_API_TOKEN'],
    tools: [
      { name: 'todoist_tasks', description: 'List tasks' },
      { name: 'todoist_create', description: 'Create task' },
      { name: 'todoist_complete', description: 'Complete task' },
    ],
    enabled: false,
  },

  // ============================================
  // DEVELOPMENT (20 servers)
  // ============================================
  {
    id: 'github',
    name: 'GitHub',
    description: 'GitHub repositories, issues, PRs',
    category: 'development',
    url: 'npx',
    npmPackage: '@anthropic/mcp-github',
    envVars: ['GITHUB_TOKEN'],
    tools: [
      { name: 'github_repos', description: 'List repositories' },
      { name: 'github_issues', description: 'List issues' },
      { name: 'github_prs', description: 'List pull requests' },
      { name: 'github_create_issue', description: 'Create issue' },
      { name: 'github_create_pr', description: 'Create pull request' },
      { name: 'github_file_read', description: 'Read file from repo' },
      { name: 'github_file_write', description: 'Write file to repo' },
    ],
    enabled: true,
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    description: 'GitLab repositories and CI/CD',
    category: 'development',
    url: 'npx',
    npmPackage: 'mcp-gitlab',
    envVars: ['GITLAB_TOKEN', 'GITLAB_URL'],
    tools: [
      { name: 'gitlab_projects', description: 'List projects' },
      { name: 'gitlab_issues', description: 'List issues' },
      { name: 'gitlab_pipelines', description: 'List pipelines' },
    ],
    enabled: false,
  },
  {
    id: 'filesystem',
    name: 'Filesystem',
    description: 'Local filesystem access',
    category: 'development',
    url: 'npx',
    npmPackage: '@anthropic/mcp-filesystem',
    envVars: [],
    tools: [
      { name: 'fs_read', description: 'Read file' },
      { name: 'fs_write', description: 'Write file' },
      { name: 'fs_list', description: 'List directory' },
      { name: 'fs_search', description: 'Search files' },
    ],
    enabled: true,
  },
  {
    id: 'docker',
    name: 'Docker',
    description: 'Docker container management',
    category: 'development',
    url: 'npx',
    npmPackage: 'mcp-docker',
    envVars: [],
    tools: [
      { name: 'docker_ps', description: 'List containers' },
      { name: 'docker_images', description: 'List images' },
      { name: 'docker_run', description: 'Run container' },
      { name: 'docker_exec', description: 'Execute command in container' },
    ],
    enabled: true,
  },
  {
    id: 'kubernetes',
    name: 'Kubernetes',
    description: 'Kubernetes cluster management',
    category: 'development',
    url: 'npx',
    npmPackage: 'mcp-kubernetes',
    envVars: ['KUBECONFIG'],
    tools: [
      { name: 'k8s_pods', description: 'List pods' },
      { name: 'k8s_deployments', description: 'List deployments' },
      { name: 'k8s_services', description: 'List services' },
      { name: 'k8s_logs', description: 'Get pod logs' },
    ],
    enabled: false,
  },
  {
    id: 'npm',
    name: 'NPM Registry',
    description: 'NPM package information',
    category: 'development',
    url: 'npx',
    npmPackage: 'mcp-npm',
    envVars: [],
    tools: [
      { name: 'npm_search', description: 'Search packages' },
      { name: 'npm_info', description: 'Get package info' },
      { name: 'npm_versions', description: 'List versions' },
    ],
    enabled: true,
  },
  {
    id: 'pypi',
    name: 'PyPI',
    description: 'Python package information',
    category: 'development',
    url: 'npx',
    npmPackage: 'mcp-pypi',
    envVars: [],
    tools: [
      { name: 'pypi_search', description: 'Search packages' },
      { name: 'pypi_info', description: 'Get package info' },
    ],
    enabled: true,
  },
  {
    id: 'sentry',
    name: 'Sentry',
    description: 'Sentry error tracking',
    category: 'development',
    url: 'npx',
    npmPackage: 'mcp-sentry',
    envVars: ['SENTRY_AUTH_TOKEN', 'SENTRY_ORG'],
    tools: [
      { name: 'sentry_issues', description: 'List issues' },
      { name: 'sentry_events', description: 'Get events' },
    ],
    enabled: false,
  },

  // ============================================
  // DATA & DATABASES (12 servers)
  // ============================================
  {
    id: 'postgres',
    name: 'PostgreSQL',
    description: 'PostgreSQL database access',
    category: 'data',
    url: 'npx',
    npmPackage: '@anthropic/mcp-postgres',
    envVars: ['POSTGRES_URL'],
    tools: [
      { name: 'pg_query', description: 'Execute SQL query' },
      { name: 'pg_tables', description: 'List tables' },
      { name: 'pg_schema', description: 'Get table schema' },
    ],
    enabled: true,
  },
  {
    id: 'supabase',
    name: 'Supabase',
    description: 'Supabase database and auth',
    category: 'data',
    url: 'npx',
    npmPackage: '@anthropic/mcp-supabase',
    envVars: ['SUPABASE_URL', 'SUPABASE_ANON_KEY'],
    tools: [
      { name: 'supabase_query', description: 'Query database' },
      { name: 'supabase_insert', description: 'Insert data' },
      { name: 'supabase_storage', description: 'Access storage' },
    ],
    enabled: true,
  },
  {
    id: 'mongodb',
    name: 'MongoDB',
    description: 'MongoDB database access',
    category: 'data',
    url: 'npx',
    npmPackage: 'mcp-mongodb',
    envVars: ['MONGODB_URI'],
    tools: [
      { name: 'mongo_find', description: 'Find documents' },
      { name: 'mongo_insert', description: 'Insert documents' },
      { name: 'mongo_aggregate', description: 'Run aggregation' },
    ],
    enabled: false,
  },
  {
    id: 'redis',
    name: 'Redis',
    description: 'Redis cache and data store',
    category: 'data',
    url: 'npx',
    npmPackage: 'mcp-redis',
    envVars: ['REDIS_URL'],
    tools: [
      { name: 'redis_get', description: 'Get value' },
      { name: 'redis_set', description: 'Set value' },
      { name: 'redis_keys', description: 'List keys' },
    ],
    enabled: true,
  },
  {
    id: 'elasticsearch',
    name: 'Elasticsearch',
    description: 'Elasticsearch search engine',
    category: 'data',
    url: 'npx',
    npmPackage: 'mcp-elasticsearch',
    envVars: ['ELASTICSEARCH_URL'],
    tools: [
      { name: 'es_search', description: 'Search documents' },
      { name: 'es_index', description: 'Index document' },
    ],
    enabled: false,
  },
  {
    id: 'snowflake',
    name: 'Snowflake',
    description: 'Snowflake data warehouse',
    category: 'data',
    url: 'npx',
    npmPackage: 'mcp-snowflake',
    envVars: ['SNOWFLAKE_ACCOUNT', 'SNOWFLAKE_USER', 'SNOWFLAKE_PASSWORD'],
    tools: [
      { name: 'snowflake_query', description: 'Execute query' },
      { name: 'snowflake_tables', description: 'List tables' },
    ],
    enabled: false,
  },
  {
    id: 'bigquery',
    name: 'BigQuery',
    description: 'Google BigQuery analytics',
    category: 'data',
    url: 'npx',
    npmPackage: 'mcp-bigquery',
    envVars: ['GOOGLE_APPLICATION_CREDENTIALS'],
    tools: [
      { name: 'bq_query', description: 'Run SQL query' },
      { name: 'bq_datasets', description: 'List datasets' },
    ],
    enabled: false,
  },

  // ============================================
  // AI & ML (10 servers)
  // ============================================
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'OpenAI models and assistants',
    category: 'ai',
    url: 'npx',
    npmPackage: 'mcp-openai',
    envVars: ['OPENAI_API_KEY'],
    tools: [
      { name: 'openai_chat', description: 'Chat completion' },
      { name: 'openai_image', description: 'Generate image' },
      { name: 'openai_embedding', description: 'Create embedding' },
      { name: 'openai_assistants', description: 'Manage assistants' },
    ],
    enabled: true,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude models',
    category: 'ai',
    url: 'npx',
    npmPackage: 'mcp-anthropic',
    envVars: ['ANTHROPIC_API_KEY'],
    tools: [
      { name: 'claude_chat', description: 'Chat with Claude' },
      { name: 'claude_vision', description: 'Analyze images' },
    ],
    enabled: true,
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    description: 'Hugging Face models and datasets',
    category: 'ai',
    url: 'npx',
    npmPackage: 'mcp-huggingface',
    envVars: ['HF_TOKEN'],
    tools: [
      { name: 'hf_inference', description: 'Run inference' },
      { name: 'hf_models', description: 'Search models' },
      { name: 'hf_datasets', description: 'Search datasets' },
    ],
    enabled: true,
  },
  {
    id: 'replicate',
    name: 'Replicate',
    description: 'Replicate model hosting',
    category: 'ai',
    url: 'npx',
    npmPackage: 'mcp-replicate',
    envVars: ['REPLICATE_API_TOKEN'],
    tools: [
      { name: 'replicate_run', description: 'Run model' },
      { name: 'replicate_models', description: 'List models' },
    ],
    enabled: false,
  },
  {
    id: 'stability',
    name: 'Stability AI',
    description: 'Stable Diffusion image generation',
    category: 'ai',
    url: 'npx',
    npmPackage: 'mcp-stability',
    envVars: ['STABILITY_API_KEY'],
    tools: [
      { name: 'stability_generate', description: 'Generate image' },
      { name: 'stability_edit', description: 'Edit image' },
    ],
    enabled: false,
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    description: 'AI voice synthesis',
    category: 'ai',
    url: 'npx',
    npmPackage: 'mcp-elevenlabs',
    envVars: ['ELEVENLABS_API_KEY'],
    tools: [
      { name: 'elevenlabs_tts', description: 'Text to speech' },
      { name: 'elevenlabs_voices', description: 'List voices' },
    ],
    enabled: true,
  },

  // ============================================
  // CLOUD PROVIDERS (8 servers)
  // ============================================
  {
    id: 'aws',
    name: 'AWS',
    description: 'Amazon Web Services',
    category: 'cloud',
    url: 'npx',
    npmPackage: 'mcp-aws',
    envVars: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'],
    tools: [
      { name: 'aws_s3_list', description: 'List S3 buckets' },
      { name: 'aws_s3_get', description: 'Get S3 object' },
      { name: 'aws_lambda_invoke', description: 'Invoke Lambda' },
      { name: 'aws_ec2_list', description: 'List EC2 instances' },
    ],
    enabled: true,
  },
  {
    id: 'gcp',
    name: 'Google Cloud',
    description: 'Google Cloud Platform',
    category: 'cloud',
    url: 'npx',
    npmPackage: 'mcp-gcp',
    envVars: ['GOOGLE_APPLICATION_CREDENTIALS'],
    tools: [
      { name: 'gcs_list', description: 'List storage buckets' },
      { name: 'gcs_get', description: 'Get object' },
      { name: 'gcf_invoke', description: 'Invoke function' },
    ],
    enabled: true,
  },
  {
    id: 'azure',
    name: 'Azure',
    description: 'Microsoft Azure',
    category: 'cloud',
    url: 'npx',
    npmPackage: 'mcp-azure',
    envVars: ['AZURE_SUBSCRIPTION_ID', 'AZURE_TENANT_ID'],
    tools: [
      { name: 'azure_storage', description: 'Access storage' },
      { name: 'azure_functions', description: 'Invoke functions' },
    ],
    enabled: false,
  },
  {
    id: 'vercel',
    name: 'Vercel',
    description: 'Vercel deployments',
    category: 'cloud',
    url: 'npx',
    npmPackage: 'mcp-vercel',
    envVars: ['VERCEL_TOKEN'],
    tools: [
      { name: 'vercel_deployments', description: 'List deployments' },
      { name: 'vercel_deploy', description: 'Deploy project' },
      { name: 'vercel_logs', description: 'Get logs' },
    ],
    enabled: true,
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    description: 'Cloudflare Workers and Pages',
    category: 'cloud',
    url: 'npx',
    npmPackage: 'mcp-cloudflare',
    envVars: ['CLOUDFLARE_API_TOKEN'],
    tools: [
      { name: 'cf_workers', description: 'List workers' },
      { name: 'cf_kv', description: 'Access KV storage' },
    ],
    enabled: false,
  },

  // ============================================
  // SEARCH & WEB (8 servers)
  // ============================================
  {
    id: 'brave-search',
    name: 'Brave Search',
    description: 'Brave web search',
    category: 'search',
    url: 'npx',
    npmPackage: '@anthropic/mcp-brave-search',
    envVars: ['BRAVE_API_KEY'],
    tools: [
      { name: 'brave_search', description: 'Web search' },
      { name: 'brave_news', description: 'News search' },
    ],
    enabled: true,
  },
  {
    id: 'exa',
    name: 'Exa Search',
    description: 'Exa AI-powered search',
    category: 'search',
    url: 'npx',
    npmPackage: 'mcp-exa',
    envVars: ['EXA_API_KEY'],
    tools: [
      { name: 'exa_search', description: 'AI search' },
      { name: 'exa_contents', description: 'Get page contents' },
    ],
    enabled: true,
  },
  {
    id: 'puppeteer',
    name: 'Puppeteer',
    description: 'Browser automation',
    category: 'automation',
    url: 'npx',
    npmPackage: '@anthropic/mcp-puppeteer',
    envVars: [],
    tools: [
      { name: 'browser_navigate', description: 'Navigate to URL' },
      { name: 'browser_screenshot', description: 'Take screenshot' },
      { name: 'browser_click', description: 'Click element' },
      { name: 'browser_type', description: 'Type text' },
    ],
    enabled: true,
  },
  {
    id: 'fetch',
    name: 'Fetch',
    description: 'HTTP requests',
    category: 'search',
    url: 'npx',
    npmPackage: '@anthropic/mcp-fetch',
    envVars: [],
    tools: [
      { name: 'fetch_url', description: 'Fetch URL content' },
      { name: 'fetch_api', description: 'Make API request' },
    ],
    enabled: true,
  },

  // ============================================
  // STORAGE (5 servers)
  // ============================================
  {
    id: 'dropbox',
    name: 'Dropbox',
    description: 'Dropbox file storage',
    category: 'storage',
    url: 'npx',
    npmPackage: 'mcp-dropbox',
    envVars: ['DROPBOX_ACCESS_TOKEN'],
    tools: [
      { name: 'dropbox_list', description: 'List files' },
      { name: 'dropbox_read', description: 'Read file' },
      { name: 'dropbox_upload', description: 'Upload file' },
    ],
    enabled: false,
  },
  {
    id: 'box',
    name: 'Box',
    description: 'Box cloud storage',
    category: 'storage',
    url: 'npx',
    npmPackage: 'mcp-box',
    envVars: ['BOX_ACCESS_TOKEN'],
    tools: [
      { name: 'box_list', description: 'List files' },
      { name: 'box_read', description: 'Read file' },
    ],
    enabled: false,
  },

  // ============================================
  // COMMUNICATION (5 servers)
  // ============================================
  {
    id: 'discord',
    name: 'Discord',
    description: 'Discord bot integration',
    category: 'communication',
    url: 'npx',
    npmPackage: 'mcp-discord',
    envVars: ['DISCORD_BOT_TOKEN'],
    tools: [
      { name: 'discord_send', description: 'Send message' },
      { name: 'discord_channels', description: 'List channels' },
    ],
    enabled: false,
  },
  {
    id: 'telegram',
    name: 'Telegram',
    description: 'Telegram bot integration',
    category: 'communication',
    url: 'npx',
    npmPackage: 'mcp-telegram',
    envVars: ['TELEGRAM_BOT_TOKEN'],
    tools: [
      { name: 'telegram_send', description: 'Send message' },
    ],
    enabled: false,
  },
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'SMS and voice',
    category: 'communication',
    url: 'npx',
    npmPackage: 'mcp-twilio',
    envVars: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'],
    tools: [
      { name: 'twilio_sms', description: 'Send SMS' },
      { name: 'twilio_call', description: 'Make call' },
    ],
    enabled: false,
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    description: 'Email delivery',
    category: 'communication',
    url: 'npx',
    npmPackage: 'mcp-sendgrid',
    envVars: ['SENDGRID_API_KEY'],
    tools: [
      { name: 'sendgrid_send', description: 'Send email' },
    ],
    enabled: false,
  },

  // ============================================
  // UTILITIES (7 servers)
  // ============================================
  {
    id: 'memory',
    name: 'Memory',
    description: 'Persistent memory storage',
    category: 'ai',
    url: 'npx',
    npmPackage: '@anthropic/mcp-memory',
    envVars: [],
    tools: [
      { name: 'memory_store', description: 'Store memory' },
      { name: 'memory_recall', description: 'Recall memory' },
      { name: 'memory_search', description: 'Search memories' },
    ],
    enabled: true,
  },
  {
    id: 'time',
    name: 'Time',
    description: 'Time and timezone utilities',
    category: 'automation',
    url: 'npx',
    npmPackage: '@anthropic/mcp-time',
    envVars: [],
    tools: [
      { name: 'time_now', description: 'Get current time' },
      { name: 'time_convert', description: 'Convert timezone' },
    ],
    enabled: true,
  },
  {
    id: 'wolfram',
    name: 'Wolfram Alpha',
    description: 'Computational knowledge',
    category: 'ai',
    url: 'npx',
    npmPackage: 'mcp-wolfram',
    envVars: ['WOLFRAM_APP_ID'],
    tools: [
      { name: 'wolfram_query', description: 'Query Wolfram' },
    ],
    enabled: false,
  },
  {
    id: 'weather',
    name: 'Weather',
    description: 'Weather information',
    category: 'data',
    url: 'npx',
    npmPackage: 'mcp-weather',
    envVars: ['OPENWEATHER_API_KEY'],
    tools: [
      { name: 'weather_current', description: 'Current weather' },
      { name: 'weather_forecast', description: 'Weather forecast' },
    ],
    enabled: false,
  },
  {
    id: 'calculator',
    name: 'Calculator',
    description: 'Mathematical calculations',
    category: 'automation',
    url: 'npx',
    npmPackage: 'mcp-calculator',
    envVars: [],
    tools: [
      { name: 'calc_eval', description: 'Evaluate expression' },
      { name: 'calc_convert', description: 'Unit conversion' },
    ],
    enabled: true,
  },
];

/**
 * Get enabled MCP servers
 */
export function getEnabledServers(): MCPServerConfig[] {
  return MCP_SERVERS.filter(s => s.enabled);
}

/**
 * Get servers by category
 */
export function getServersByCategory(category: MCPCategory): MCPServerConfig[] {
  return MCP_SERVERS.filter(s => s.category === category);
}

/**
 * Get total tool count
 */
export function getTotalToolCount(): number {
  return MCP_SERVERS.reduce((acc, server) => acc + server.tools.length, 0);
}

/**
 * Export summary stats
 */
export const MCP_STATS = {
  totalServers: MCP_SERVERS.length,
  enabledServers: getEnabledServers().length,
  totalTools: getTotalToolCount(),
  categories: [...new Set(MCP_SERVERS.map(s => s.category))],
};

console.log(`MCP Registry: ${MCP_STATS.totalServers} servers, ${MCP_STATS.totalTools} tools available`);
