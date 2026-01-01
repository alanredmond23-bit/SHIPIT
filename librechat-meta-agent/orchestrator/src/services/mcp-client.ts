import { EventEmitter } from '../events/emitter';
import { Logger } from 'pino';
import { z } from 'zod';

// MCP Protocol Types
export interface MCPServer {
  id: string;
  name: string;
  url: string;
  status: 'connected' | 'disconnected' | 'error';
  capabilities?: string[];
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: z.ZodSchema<any>;
  server: string;
}

export interface MCPToolCall {
  id: string;
  tool: string;
  input: Record<string, any>;
  timestamp: Date;
}

export interface MCPToolResult {
  id: string;
  toolCallId: string;
  success: boolean;
  output?: any;
  error?: string;
  duration: number;
  timestamp: Date;
}

// MCP Server Connection Schema
const MCPServerConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  apiKey: z.string().optional(),
  timeout: z.number().default(30000),
  retries: z.number().default(3),
});

type MCPServerConfig = z.infer<typeof MCPServerConfigSchema>;

/**
 * MCP (Model Context Protocol) Client
 * Manages connections to MCP servers and tool execution
 */
export class MCPClient {
  private servers: Map<string, MCPServer> = new Map();
  private tools: Map<string, MCPTool> = new Map();
  private toolCalls: Map<string, MCPToolCall> = new Map();
  private results: Map<string, MCPToolResult> = new Map();

  constructor(
    private events: EventEmitter,
    private logger: Logger
  ) {}

  /**
   * Connect to an MCP server and discover its tools
   */
  async connectServer(config: MCPServerConfig): Promise<MCPServer> {
    try {
      // Validate config
      const validated = MCPServerConfigSchema.parse(config);

      this.logger.info({ serverId: validated.id, url: validated.url }, 'Connecting to MCP server');

      // Check if already connected
      if (this.servers.has(validated.id)) {
        const existing = this.servers.get(validated.id)!;
        if (existing.status === 'connected') {
          this.logger.warn({ serverId: validated.id }, 'Server already connected');
          return existing;
        }
      }

      // Simulate server connection (in production, this would make actual HTTP/WebSocket connections)
      const server: MCPServer = {
        id: validated.id,
        name: validated.name,
        url: validated.url,
        status: 'connected',
        capabilities: await this.discoverCapabilities(validated),
      };

      this.servers.set(validated.id, server);
      this.events.emit('mcp:server:connected', { server });

      // Discover and register tools
      await this.discoverTools(validated.id);

      this.logger.info({ serverId: validated.id, toolCount: this.getToolsByServer(validated.id).length }, 'MCP server connected');

      return server;
    } catch (error: any) {
      this.logger.error({ error: error.message, serverId: config.id }, 'Failed to connect to MCP server');

      const errorServer: MCPServer = {
        id: config.id,
        name: config.name,
        url: config.url,
        status: 'error',
      };

      this.servers.set(config.id, errorServer);
      this.events.emit('mcp:server:error', { serverId: config.id, error: error.message });

      throw error;
    }
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnectServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    this.logger.info({ serverId }, 'Disconnecting from MCP server');

    // Remove all tools from this server
    const tools = this.getToolsByServer(serverId);
    for (const tool of tools) {
      this.tools.delete(tool.name);
    }

    // Update server status
    server.status = 'disconnected';
    this.servers.set(serverId, server);

    this.events.emit('mcp:server:disconnected', { serverId });
  }

  /**
   * List all available tools across all connected servers
   */
  listTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools from a specific server
   */
  getToolsByServer(serverId: string): MCPTool[] {
    return Array.from(this.tools.values()).filter(tool => tool.server === serverId);
  }

  /**
   * Get a specific tool by name
   */
  getTool(toolName: string): MCPTool | undefined {
    return this.tools.get(toolName);
  }

  /**
   * Execute a tool call
   */
  async executeTool(toolName: string, input: Record<string, any>): Promise<MCPToolResult> {
    const startTime = Date.now();
    const tool = this.tools.get(toolName);

    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }

    const server = this.servers.get(tool.server);
    if (!server || server.status !== 'connected') {
      throw new Error(`Server ${tool.server} not connected`);
    }

    // Create tool call record
    const toolCall: MCPToolCall = {
      id: this.generateId(),
      tool: toolName,
      input,
      timestamp: new Date(),
    };

    this.toolCalls.set(toolCall.id, toolCall);
    this.events.emit('mcp:tool:call', { toolCall });

    this.logger.info({ toolName, toolCallId: toolCall.id }, 'Executing tool');

    try {
      // Validate input against schema
      const validatedInput = tool.inputSchema.parse(input);

      // Execute the tool (in production, this would make actual API calls)
      const output = await this.executeToolCall(tool, validatedInput);

      const duration = Date.now() - startTime;

      // Create result
      const result: MCPToolResult = {
        id: this.generateId(),
        toolCallId: toolCall.id,
        success: true,
        output,
        duration,
        timestamp: new Date(),
      };

      this.results.set(result.id, result);
      this.events.emit('mcp:tool:result', { result });

      this.logger.info({ toolName, toolCallId: toolCall.id, duration }, 'Tool execution completed');

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      const result: MCPToolResult = {
        id: this.generateId(),
        toolCallId: toolCall.id,
        success: false,
        error: error.message,
        duration,
        timestamp: new Date(),
      };

      this.results.set(result.id, result);
      this.events.emit('mcp:tool:error', { result });

      this.logger.error({ toolName, toolCallId: toolCall.id, error: error.message }, 'Tool execution failed');

      throw error;
    }
  }

  /**
   * Get tool execution history
   */
  getToolHistory(limit: number = 50): MCPToolResult[] {
    return Array.from(this.results.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get all connected servers
   */
  getServers(): MCPServer[] {
    return Array.from(this.servers.values());
  }

  /**
   * Get server status
   */
  getServerStatus(serverId: string): MCPServer | undefined {
    return this.servers.get(serverId);
  }

  /**
   * Health check for all servers
   */
  async healthCheck(): Promise<Map<string, boolean>> {
    const health = new Map<string, boolean>();

    for (const [serverId, server] of this.servers) {
      try {
        // In production, this would ping the server
        const isHealthy = server.status === 'connected';
        health.set(serverId, isHealthy);

        if (!isHealthy && server.status !== 'disconnected') {
          this.logger.warn({ serverId }, 'Server health check failed');
          server.status = 'error';
          this.servers.set(serverId, server);
        }
      } catch (error) {
        health.set(serverId, false);
      }
    }

    return health;
  }

  // Private helper methods

  private async discoverCapabilities(config: MCPServerConfig): Promise<string[]> {
    // In production, this would query the server for capabilities
    // For now, return mock capabilities
    return ['tools', 'streaming', 'async'];
  }

  private async discoverTools(serverId: string): Promise<void> {
    // In production, this would query the server for available tools
    // For now, we'll register tools manually in the specific tool implementations
    this.logger.info({ serverId }, 'Tool discovery completed');
  }

  private async executeToolCall(tool: MCPTool, input: any): Promise<any> {
    // This is overridden by specific tool implementations
    // The actual execution happens in the tool-specific services
    throw new Error('Tool execution must be implemented by specific tool services');
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Register a tool manually (used by tool implementations)
   */
  registerTool(tool: MCPTool): void {
    if (!this.servers.has(tool.server)) {
      throw new Error(`Server ${tool.server} not found`);
    }

    this.tools.set(tool.name, tool);
    this.events.emit('mcp:tool:registered', { tool });
    this.logger.info({ toolName: tool.name, server: tool.server }, 'Tool registered');
  }

  /**
   * Unregister a tool
   */
  unregisterTool(toolName: string): void {
    if (this.tools.delete(toolName)) {
      this.events.emit('mcp:tool:unregistered', { toolName });
      this.logger.info({ toolName }, 'Tool unregistered');
    }
  }
}
