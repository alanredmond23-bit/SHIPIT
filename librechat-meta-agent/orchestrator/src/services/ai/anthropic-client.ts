import Anthropic from '@anthropic-ai/sdk';
import { Logger } from 'pino';

/**
 * Anthropic (Claude) API Client
 *
 * Supports:
 * - Chat completions with streaming
 * - Extended thinking mode (Claude 3.5+)
 * - Tool use
 * - Message history
 * - Vision (image understanding)
 */

// ============================================================================
// Types
// ============================================================================

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image';
    text?: string;
    source?: {
      type: 'base64' | 'url';
      media_type: string;
      data: string;
    };
  }>;
}

export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ClaudeChatRequest {
  model: string;
  messages: ClaudeMessage[];
  system?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  tools?: ClaudeTool[];
  stream?: boolean;
  metadata?: {
    user_id?: string;
  };
  // Extended thinking options
  thinking?: {
    type: 'enabled';
    budget_tokens?: number;
  };
}

export interface ClaudeChatResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text' | 'tool_use' | 'thinking';
    text?: string;
    id?: string;
    name?: string;
    input?: any;
  }>;
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';
  stop_sequence?: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

export interface ClaudeStreamChunk {
  type: 'message_start' | 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_delta' | 'message_stop';
  index?: number;
  delta?: {
    type: 'text_delta' | 'input_json_delta';
    text?: string;
    partial_json?: string;
  };
  content_block?: {
    type: 'text' | 'tool_use' | 'thinking';
    text?: string;
    id?: string;
    name?: string;
  };
  message?: ClaudeChatResponse;
  usage?: ClaudeChatResponse['usage'];
}

// ============================================================================
// Anthropic Client
// ============================================================================

export class AnthropicClient {
  private client: Anthropic;
  private logger: Logger;

  // Model configurations
  public static readonly MODELS = {
    OPUS_4: 'claude-opus-4-20250514',
    SONNET_4: 'claude-sonnet-4-20250514',
    SONNET_3_7: 'claude-3-7-sonnet-20250219',
    SONNET_3_5: 'claude-3-5-sonnet-20241022',
    HAIKU_3_5: 'claude-3-5-haiku-20241022',
    HAIKU_3: 'claude-3-haiku-20240307',
  };

  // Model limits
  public static readonly MODEL_LIMITS = {
    [AnthropicClient.MODELS.OPUS_4]: { maxTokens: 16384, contextWindow: 200000 },
    [AnthropicClient.MODELS.SONNET_4]: { maxTokens: 16384, contextWindow: 200000 },
    [AnthropicClient.MODELS.SONNET_3_7]: { maxTokens: 8192, contextWindow: 200000 },
    [AnthropicClient.MODELS.SONNET_3_5]: { maxTokens: 8192, contextWindow: 200000 },
    [AnthropicClient.MODELS.HAIKU_3_5]: { maxTokens: 8192, contextWindow: 200000 },
    [AnthropicClient.MODELS.HAIKU_3]: { maxTokens: 4096, contextWindow: 200000 },
  };

  constructor(apiKey: string, logger: Logger) {
    if (!apiKey) {
      throw new Error('Anthropic API key is required');
    }

    this.client = new Anthropic({
      apiKey,
      maxRetries: 3,
      timeout: 120000, // 2 minutes
    });

    this.logger = logger.child({ service: 'anthropic-client' });
    this.logger.info('Anthropic client initialized');
  }

  /**
   * Send a chat completion request
   */
  async chat(request: ClaudeChatRequest): Promise<ClaudeChatResponse> {
    const startTime = Date.now();

    try {
      this.logger.info({
        model: request.model,
        messageCount: request.messages.length,
        hasTools: !!request.tools,
        hasThinking: !!request.thinking,
      }, 'Sending chat request to Claude');

      const response = await this.client.messages.create({
        model: request.model,
        max_tokens: request.maxTokens || 4096,
        messages: request.messages as any,
        system: request.system,
        temperature: request.temperature,
        top_p: request.topP,
        top_k: request.topK,
        tools: request.tools as any,
        metadata: request.metadata,
        // @ts-ignore - Extended thinking is a newer feature
        thinking: request.thinking,
      });

      const duration = Date.now() - startTime;

      this.logger.info({
        id: response.id,
        model: response.model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        stopReason: response.stop_reason,
        duration,
      }, 'Chat request completed');

      return response as ClaudeChatResponse;
    } catch (error: any) {
      this.logger.error({
        error: error.message,
        model: request.model,
        duration: Date.now() - startTime,
      }, 'Chat request failed');

      throw new Error(`Claude API error: ${error.message}`);
    }
  }

  /**
   * Stream a chat completion
   */
  async *chatStream(request: ClaudeChatRequest): AsyncGenerator<ClaudeStreamChunk> {
    try {
      this.logger.info({
        model: request.model,
        messageCount: request.messages.length,
      }, 'Starting streaming chat request');

      const stream = await this.client.messages.create({
        model: request.model,
        max_tokens: request.maxTokens || 4096,
        messages: request.messages as any,
        system: request.system,
        temperature: request.temperature,
        top_p: request.topP,
        top_k: request.topK,
        tools: request.tools as any,
        metadata: request.metadata,
        // @ts-ignore - Extended thinking
        thinking: request.thinking,
        stream: true,
      });

      for await (const chunk of stream) {
        yield chunk as ClaudeStreamChunk;
      }

      this.logger.info('Streaming chat request completed');
    } catch (error: any) {
      this.logger.error({ error: error.message }, 'Streaming chat request failed');
      throw new Error(`Claude streaming error: ${error.message}`);
    }
  }

  /**
   * Create a message with extended thinking enabled
   */
  async thinkAndRespond(
    messages: ClaudeMessage[],
    options: {
      model?: string;
      thinkingBudget?: number;
      maxTokens?: number;
      system?: string;
    } = {}
  ): Promise<ClaudeChatResponse> {
    return this.chat({
      model: options.model || AnthropicClient.MODELS.SONNET_3_7,
      messages,
      system: options.system,
      maxTokens: options.maxTokens || 16000,
      thinking: {
        type: 'enabled',
        budget_tokens: options.thinkingBudget || 10000,
      },
    });
  }

  /**
   * Stream a message with extended thinking
   */
  async *thinkAndRespondStream(
    messages: ClaudeMessage[],
    options: {
      model?: string;
      thinkingBudget?: number;
      maxTokens?: number;
      system?: string;
    } = {}
  ): AsyncGenerator<ClaudeStreamChunk> {
    yield* this.chatStream({
      model: options.model || AnthropicClient.MODELS.SONNET_3_7,
      messages,
      system: options.system,
      maxTokens: options.maxTokens || 16000,
      thinking: {
        type: 'enabled',
        budget_tokens: options.thinkingBudget || 10000,
      },
      stream: true,
    });
  }

  /**
   * Use Claude with tools
   */
  async chatWithTools(
    messages: ClaudeMessage[],
    tools: ClaudeTool[],
    options: {
      model?: string;
      maxTokens?: number;
      system?: string;
    } = {}
  ): Promise<ClaudeChatResponse> {
    return this.chat({
      model: options.model || AnthropicClient.MODELS.SONNET_3_5,
      messages,
      tools,
      system: options.system,
      maxTokens: options.maxTokens || 4096,
    });
  }

  /**
   * Analyze an image
   */
  async analyzeImage(
    imageData: string,
    prompt: string,
    options: {
      model?: string;
      mediaType?: string;
      maxTokens?: number;
    } = {}
  ): Promise<ClaudeChatResponse> {
    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: options.mediaType || 'image/jpeg',
              data: imageData,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ];

    return this.chat({
      model: options.model || AnthropicClient.MODELS.SONNET_3_5,
      messages,
      maxTokens: options.maxTokens || 4096,
    });
  }

  /**
   * Count tokens (estimation)
   */
  async countTokens(text: string): Promise<number> {
    try {
      const response = await this.client.messages.count_tokens({
        model: AnthropicClient.MODELS.SONNET_3_5,
        messages: [{ role: 'user', content: text }],
      });
      return response.input_tokens;
    } catch (error: any) {
      // Fallback to rough estimation: ~4 chars per token
      return Math.ceil(text.length / 4);
    }
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return Object.values(AnthropicClient.MODELS);
  }

  /**
   * Get model limits
   */
  getModelLimits(model: string) {
    return AnthropicClient.MODEL_LIMITS[model] || {
      maxTokens: 4096,
      contextWindow: 200000,
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.chat({
        model: AnthropicClient.MODELS.HAIKU_3,
        messages: [{ role: 'user', content: 'Hi' }],
        maxTokens: 10,
      });
      return true;
    } catch (error) {
      this.logger.error({ error }, 'Health check failed');
      return false;
    }
  }

  /**
   * Format message history for Claude
   */
  static formatMessageHistory(
    history: Array<{ role: string; content: string }>
  ): ClaudeMessage[] {
    return history
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));
  }

  /**
   * Extract text from response
   */
  static extractText(response: ClaudeChatResponse): string {
    return response.content
      .filter(block => block.type === 'text')
      .map(block => block.text || '')
      .join('\n');
  }

  /**
   * Extract thinking from response
   */
  static extractThinking(response: ClaudeChatResponse): string {
    return response.content
      .filter(block => block.type === 'thinking')
      .map(block => block.text || '')
      .join('\n');
  }

  /**
   * Extract tool uses from response
   */
  static extractToolUses(response: ClaudeChatResponse): Array<{
    id: string;
    name: string;
    input: any;
  }> {
    return response.content
      .filter(block => block.type === 'tool_use')
      .map(block => ({
        id: block.id || '',
        name: block.name || '',
        input: block.input || {},
      }));
  }
}
