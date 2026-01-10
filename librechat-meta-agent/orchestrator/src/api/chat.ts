import { Request, Response } from 'express';
import { Logger } from 'pino';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

// ============================================================================
// Types & Schemas
// ============================================================================

const MessageContentSchema = z.union([
  z.object({
    type: z.literal('text'),
    text: z.string(),
  }),
  z.object({
    type: z.literal('image'),
    source: z.object({
      type: z.enum(['base64', 'url']),
      media_type: z.string().optional(),
      data: z.string().optional(),
      url: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal('file'),
    source: z.object({
      type: z.enum(['base64', 'url']),
      media_type: z.string(),
      data: z.string().optional(),
      url: z.string().optional(),
    }),
  }),
]);

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.union([z.string(), z.array(MessageContentSchema)]),
});

const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema),
  model: z.string().default('claude-3-5-sonnet-20241022'),
  stream: z.boolean().default(true),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().positive().optional(),
  system_prompt: z.string().optional(),
  stop_sequences: z.array(z.string()).optional(),
});

export type ChatMessage = z.infer<typeof MessageSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

interface Artifact {
  type: 'code' | 'document' | 'data';
  language?: string;
  title?: string;
  content: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// Model Provider Detection
// ============================================================================

type ModelProvider = 'anthropic' | 'openai' | 'google' | 'deepseek' | 'mistral' | 'xai';

function detectProvider(model: string): ModelProvider {
  const lowerModel = model.toLowerCase();

  if (lowerModel.includes('claude')) {
    return 'anthropic';
  } else if (lowerModel.includes('gpt') || lowerModel.includes('o1') || lowerModel.includes('o3') || lowerModel.includes('o4')) {
    return 'openai';
  } else if (lowerModel.includes('gemini') || lowerModel.includes('palm')) {
    return 'google';
  } else if (lowerModel.includes('deepseek')) {
    return 'deepseek';
  } else if (lowerModel.includes('mistral')) {
    return 'mistral';
  } else if (lowerModel.includes('grok')) {
    return 'xai';
  }

  // Default to anthropic if unknown
  return 'anthropic';
}

// ============================================================================
// Artifact Extraction
// ============================================================================

function extractArtifacts(text: string): Artifact[] {
  const artifacts: Artifact[] = [];

  // Extract code blocks with language specification
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const language = match[1] || 'text';
    const content = match[2].trim();

    // Try to extract title from first line if it's a comment
    let title: string | undefined;
    const firstLine = content.split('\n')[0];
    if (firstLine.startsWith('//') || firstLine.startsWith('#') || firstLine.startsWith('/*')) {
      title = firstLine.replace(/^(\/\/|#|\/\*|\*)\s*/, '').trim();
    }

    artifacts.push({
      type: 'code',
      language,
      title,
      content,
      metadata: {
        position: match.index,
        length: match[0].length,
      },
    });
  }

  // Extract structured data (JSON, YAML, XML)
  const jsonRegex = /```json\n([\s\S]*?)```/gi;
  while ((match = jsonRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      artifacts.push({
        type: 'data',
        language: 'json',
        content: match[1].trim(),
        metadata: { parsed, position: match.index },
      });
    } catch {
      // If JSON is invalid, it's already captured as code block
    }
  }

  return artifacts;
}

// ============================================================================
// Anthropic (Claude) Provider
// ============================================================================

class AnthropicProvider {
  private client: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    this.client = new Anthropic({ apiKey });
  }

  async *streamChat(
    request: ChatRequest,
    logger: Logger,
    signal?: AbortSignal
  ): AsyncGenerator<{
    type: 'content' | 'usage' | 'error' | 'done';
    data?: any;
    error?: string;
  }> {
    try {
      // Separate system messages from conversation
      const systemMessages = request.messages.filter(m => m.role === 'system');
      const conversationMessages = request.messages.filter(m => m.role !== 'system');

      const systemPrompt = request.system_prompt ||
        systemMessages.map(m => typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).join('\n\n');

      // Convert messages to Anthropic format
      const anthropicMessages = conversationMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      const stream = await this.client.messages.stream({
        model: request.model,
        max_tokens: request.max_tokens || 4096,
        temperature: request.temperature,
        system: systemPrompt || undefined,
        messages: anthropicMessages as any,
        stop_sequences: request.stop_sequences,
      });

      // Handle abort signal
      if (signal) {
        signal.addEventListener('abort', () => {
          stream.controller.abort();
        });
      }

      for await (const chunk of stream) {
        if (signal?.aborted) {
          yield { type: 'error', error: 'Request aborted by client' };
          break;
        }

        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          yield {
            type: 'content',
            data: { content: chunk.delta.text },
          };
        } else if (chunk.type === 'message_start') {
          // Initial message metadata
          const usage = chunk.message.usage;
          if (usage) {
            yield {
              type: 'usage',
              data: {
                input_tokens: usage.input_tokens,
                output_tokens: usage.output_tokens || 0,
              },
            };
          }
        } else if (chunk.type === 'message_delta') {
          // Final usage stats
          if (chunk.usage) {
            yield {
              type: 'usage',
              data: {
                output_tokens: chunk.usage.output_tokens,
              },
            };
          }
        }
      }

      yield { type: 'done' };

    } catch (error: any) {
      logger.error({ error }, 'Anthropic streaming error');
      yield {
        type: 'error',
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  async chat(request: ChatRequest, logger: Logger): Promise<{
    content: string;
    usage: TokenUsage;
    artifacts: Artifact[];
  }> {
    const systemMessages = request.messages.filter(m => m.role === 'system');
    const conversationMessages = request.messages.filter(m => m.role !== 'system');

    const systemPrompt = request.system_prompt ||
      systemMessages.map(m => typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).join('\n\n');

    const anthropicMessages = conversationMessages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    const response = await this.client.messages.create({
      model: request.model,
      max_tokens: request.max_tokens || 4096,
      temperature: request.temperature,
      system: systemPrompt || undefined,
      messages: anthropicMessages as any,
      stop_sequences: request.stop_sequences,
    });

    const content = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('\n');

    const usage: TokenUsage = {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      total_tokens: response.usage.input_tokens + response.usage.output_tokens,
    };

    const artifacts = extractArtifacts(content);

    return { content, usage, artifacts };
  }
}

// ============================================================================
// OpenAI (GPT) Provider
// ============================================================================

class OpenAIProvider {
  private baseURL: string = 'https://api.openai.com/v1';
  private apiKey: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    this.apiKey = apiKey;
  }

  private convertMessages(messages: ChatMessage[]) {
    return messages.map(msg => {
      if (typeof msg.content === 'string') {
        return { role: msg.role, content: msg.content };
      }

      // Handle multimodal content
      const content = msg.content.map((item: any) => {
        if (item.type === 'text') {
          return { type: 'text', text: item.text };
        } else if (item.type === 'image') {
          if (item.source.type === 'url') {
            return { type: 'image_url', image_url: { url: item.source.url } };
          } else if (item.source.type === 'base64') {
            return {
              type: 'image_url',
              image_url: {
                url: `data:${item.source.media_type || 'image/png'};base64,${item.source.data}`,
              },
            };
          }
        }
        return item;
      });

      return { role: msg.role, content };
    });
  }

  async *streamChat(
    request: ChatRequest,
    logger: Logger,
    signal?: AbortSignal
  ): AsyncGenerator<{
    type: 'content' | 'usage' | 'error' | 'done';
    data?: any;
    error?: string;
  }> {
    try {
      const messages = this.convertMessages(request.messages);

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: request.model,
          messages,
          temperature: request.temperature,
          max_tokens: request.max_tokens,
          stop: request.stop_sequences,
          stream: true,
          stream_options: { include_usage: true },
        }),
        signal,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || line.trim() === 'data: [DONE]') continue;

          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              const delta = data.choices?.[0]?.delta;
              if (delta?.content) {
                yield {
                  type: 'content',
                  data: { content: delta.content },
                };
              }

              // Usage information (GPT-4 and newer models)
              if (data.usage) {
                yield {
                  type: 'usage',
                  data: {
                    input_tokens: data.usage.prompt_tokens,
                    output_tokens: data.usage.completion_tokens,
                    total_tokens: data.usage.total_tokens,
                  },
                };
              }

            } catch (e) {
              logger.warn({ line }, 'Failed to parse SSE line');
            }
          }
        }
      }

      yield { type: 'done' };

    } catch (error: any) {
      logger.error({ error }, 'OpenAI streaming error');
      yield {
        type: 'error',
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  async chat(request: ChatRequest, logger: Logger): Promise<{
    content: string;
    usage: TokenUsage;
    artifacts: Artifact[];
  }> {
    const messages = this.convertMessages(request.messages);

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model,
        messages,
        temperature: request.temperature,
        max_tokens: request.max_tokens,
        stop: request.stop_sequences,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    const usage: TokenUsage = {
      input_tokens: data.usage?.prompt_tokens || 0,
      output_tokens: data.usage?.completion_tokens || 0,
      total_tokens: data.usage?.total_tokens || 0,
    };

    const artifacts = extractArtifacts(content);

    return { content, usage, artifacts };
  }
}

// ============================================================================
// Google (Gemini) Provider
// ============================================================================

class GoogleProvider {
  private baseURL: string = 'https://generativelanguage.googleapis.com/v1beta';
  private apiKey: string;

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY environment variable is required');
    }
    this.apiKey = apiKey;
  }

  private convertMessages(messages: ChatMessage[]) {
    return messages
      .filter(m => m.role !== 'system')
      .map(msg => {
        const role = msg.role === 'assistant' ? 'model' : 'user';

        if (typeof msg.content === 'string') {
          return { role, parts: [{ text: msg.content }] };
        }

        // Handle multimodal content
        const parts = msg.content.map((item: any) => {
          if (item.type === 'text') {
            return { text: item.text };
          } else if (item.type === 'image' && item.source.type === 'base64') {
            return {
              inline_data: {
                mime_type: item.source.media_type || 'image/png',
                data: item.source.data,
              },
            };
          }
          return null;
        }).filter(Boolean);

        return { role, parts };
      });
  }

  async *streamChat(
    request: ChatRequest,
    logger: Logger,
    signal?: AbortSignal
  ): AsyncGenerator<{
    type: 'content' | 'usage' | 'error' | 'done';
    data?: any;
    error?: string;
  }> {
    try {
      const systemMessages = request.messages.filter(m => m.role === 'system');
      const systemInstruction = request.system_prompt ||
        systemMessages.map(m => typeof m.content === 'string' ? m.content : '').join('\n\n');

      const contents = this.convertMessages(request.messages);

      const modelName = request.model.includes('/') ? request.model : `models/${request.model}`;
      const url = `${this.baseURL}/${modelName}:streamGenerateContent?key=${this.apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
          generationConfig: {
            temperature: request.temperature,
            maxOutputTokens: request.max_tokens,
            stopSequences: request.stop_sequences,
          },
        }),
        signal,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Google API error: ${response.status} - ${error}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Google streams JSON objects separated by newlines
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const data = JSON.parse(line);

            const candidate = data.candidates?.[0];
            if (candidate?.content?.parts) {
              for (const part of candidate.content.parts) {
                if (part.text) {
                  yield {
                    type: 'content',
                    data: { content: part.text },
                  };
                }
              }
            }

            // Usage metadata
            if (data.usageMetadata) {
              yield {
                type: 'usage',
                data: {
                  input_tokens: data.usageMetadata.promptTokenCount || 0,
                  output_tokens: data.usageMetadata.candidatesTokenCount || 0,
                  total_tokens: data.usageMetadata.totalTokenCount || 0,
                },
              };
            }

          } catch (e) {
            logger.warn({ line }, 'Failed to parse Google response line');
          }
        }
      }

      yield { type: 'done' };

    } catch (error: any) {
      logger.error({ error }, 'Google streaming error');
      yield {
        type: 'error',
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  async chat(request: ChatRequest, logger: Logger): Promise<{
    content: string;
    usage: TokenUsage;
    artifacts: Artifact[];
  }> {
    const systemMessages = request.messages.filter(m => m.role === 'system');
    const systemInstruction = request.system_prompt ||
      systemMessages.map(m => typeof m.content === 'string' ? m.content : '').join('\n\n');

    const contents = this.convertMessages(request.messages);

    const modelName = request.model.includes('/') ? request.model : `models/${request.model}`;
    const url = `${this.baseURL}/${modelName}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        generationConfig: {
          temperature: request.temperature,
          maxOutputTokens: request.max_tokens,
          stopSequences: request.stop_sequences,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google API error: ${response.status} - ${error}`);
    }

    const data: any = await response.json();
    const candidate = data.candidates?.[0];
    const content = candidate?.content?.parts?.map((p: any) => p.text).join('') || '';

    const usage: TokenUsage = {
      input_tokens: data.usageMetadata?.promptTokenCount || 0,
      output_tokens: data.usageMetadata?.candidatesTokenCount || 0,
      total_tokens: data.usageMetadata?.totalTokenCount || 0,
    };

    const artifacts = extractArtifacts(content);

    return { content, usage, artifacts };
  }
}

// ============================================================================
// DeepSeek Provider (OpenAI-Compatible API)
// ============================================================================

class DeepSeekProvider {
  private baseURL: string = 'https://api.deepseek.com/v1';
  private apiKey: string;

  constructor() {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.warn('DEEPSEEK_API_KEY not set - DeepSeek models will not work');
      this.apiKey = '';
    } else {
      this.apiKey = apiKey;
    }
  }

  private convertMessages(messages: ChatMessage[]) {
    return messages.map(msg => {
      if (typeof msg.content === 'string') {
        return { role: msg.role, content: msg.content };
      }
      // DeepSeek uses text-only for now
      const textContent = msg.content
        .filter((item: any) => item.type === 'text')
        .map((item: any) => item.text)
        .join('\n');
      return { role: msg.role, content: textContent };
    });
  }

  async *streamChat(
    request: ChatRequest,
    logger: Logger,
    signal?: AbortSignal
  ): AsyncGenerator<{
    type: 'content' | 'usage' | 'error' | 'done';
    data?: any;
    error?: string;
  }> {
    if (!this.apiKey) {
      yield { type: 'error', error: 'DEEPSEEK_API_KEY not configured' };
      return;
    }

    try {
      const messages = this.convertMessages(request.messages);

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: request.model,
          messages,
          temperature: request.temperature,
          max_tokens: request.max_tokens,
          stop: request.stop_sequences,
          stream: true,
        }),
        signal,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`DeepSeek API error: ${response.status} - ${error}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || line.trim() === 'data: [DONE]') continue;

          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              const delta = data.choices?.[0]?.delta;
              if (delta?.content) {
                yield {
                  type: 'content',
                  data: { content: delta.content },
                };
              }

              if (data.usage) {
                yield {
                  type: 'usage',
                  data: {
                    input_tokens: data.usage.prompt_tokens,
                    output_tokens: data.usage.completion_tokens,
                    total_tokens: data.usage.total_tokens,
                  },
                };
              }
            } catch (e) {
              logger.warn({ line }, 'Failed to parse DeepSeek SSE line');
            }
          }
        }
      }

      yield { type: 'done' };

    } catch (error: any) {
      logger.error({ error }, 'DeepSeek streaming error');
      yield {
        type: 'error',
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  async chat(request: ChatRequest, logger: Logger): Promise<{
    content: string;
    usage: TokenUsage;
    artifacts: Artifact[];
  }> {
    if (!this.apiKey) {
      throw new Error('DEEPSEEK_API_KEY not configured');
    }

    const messages = this.convertMessages(request.messages);

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model,
        messages,
        temperature: request.temperature,
        max_tokens: request.max_tokens,
        stop: request.stop_sequences,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} - ${error}`);
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    const usage: TokenUsage = {
      input_tokens: data.usage?.prompt_tokens || 0,
      output_tokens: data.usage?.completion_tokens || 0,
      total_tokens: data.usage?.total_tokens || 0,
    };

    const artifacts = extractArtifacts(content);

    return { content, usage, artifacts };
  }
}

// ============================================================================
// Provider Factory
// ============================================================================

class ProviderFactory {
  private static anthropic: AnthropicProvider | null = null;
  private static openai: OpenAIProvider | null = null;
  private static google: GoogleProvider | null = null;
  private static deepseek: DeepSeekProvider | null = null;

  static getProvider(model: string): AnthropicProvider | OpenAIProvider | GoogleProvider | DeepSeekProvider {
    const provider = detectProvider(model);

    switch (provider) {
      case 'anthropic':
        if (!this.anthropic) {
          this.anthropic = new AnthropicProvider();
        }
        return this.anthropic;

      case 'openai':
        if (!this.openai) {
          this.openai = new OpenAIProvider();
        }
        return this.openai;

      case 'google':
        if (!this.google) {
          this.google = new GoogleProvider();
        }
        return this.google;

      case 'deepseek':
        if (!this.deepseek) {
          this.deepseek = new DeepSeekProvider();
        }
        return this.deepseek;

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
}

// ============================================================================
// Token Estimation & Limits
// ============================================================================

const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  // Anthropic
  'claude-opus-4-5-20251101': 200000,
  'claude-sonnet-4-5-20250929': 200000,
  'claude-haiku-4-5-20251022': 200000,
  'claude-3-5-sonnet-20241022': 200000,
  'claude-3-5-haiku-20241022': 200000,
  // OpenAI
  'gpt-5.2': 400000,
  'gpt-5.2-pro': 400000,
  'gpt-4.1': 1000000,
  'o3': 200000,
  'o3-pro': 200000,
  'o4-mini': 200000,
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,
  // Google
  'gemini-3-pro': 1000000,
  'gemini-3-flash': 1000000,
  'gemini-2.5-pro': 2000000,
  // DeepSeek
  'deepseek-v3.2-exp': 128000,
  'deepseek-r1': 128000,
  // Default
  'default': 128000,
};

function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token for English text
  // More accurate would require tiktoken or similar
  return Math.ceil(text.length / 4);
}

function estimateRequestTokens(messages: Array<{ role: string; content: any }>): number {
  let total = 0;
  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      total += estimateTokens(msg.content);
    } else if (Array.isArray(msg.content)) {
      for (const item of msg.content) {
        if (item.type === 'text' && item.text) {
          total += estimateTokens(item.text);
        } else if (item.type === 'image') {
          // Images typically cost ~1000 tokens for small, more for large
          total += 1500;
        }
      }
    }
  }
  // Add overhead for message formatting
  return total + messages.length * 10;
}

function getModelContextLimit(model: string): number {
  // Check exact match first
  if (MODEL_CONTEXT_LIMITS[model]) {
    return MODEL_CONTEXT_LIMITS[model];
  }
  // Check partial matches
  for (const [key, limit] of Object.entries(MODEL_CONTEXT_LIMITS)) {
    if (model.toLowerCase().includes(key.toLowerCase())) {
      return limit;
    }
  }
  return MODEL_CONTEXT_LIMITS['default'];
}

// ============================================================================
// Error Classification
// ============================================================================

interface ClassifiedError {
  code: string;
  message: string;
  retryable: boolean;
  statusCode: number;
  details?: Record<string, any>;
}

function classifyError(error: any, model: string): ClassifiedError {
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code?.toLowerCase() || '';

  // Token/context limit errors
  if (
    errorMessage.includes('token') ||
    errorMessage.includes('context') ||
    errorMessage.includes('too long') ||
    errorMessage.includes('maximum') ||
    errorCode.includes('context_length')
  ) {
    return {
      code: 'TOKEN_LIMIT_EXCEEDED',
      message: 'The conversation is too long for this model. Try removing some messages or starting a new conversation.',
      retryable: false,
      statusCode: 413,
      details: {
        model,
        limit: getModelContextLimit(model),
      },
    };
  }

  // Rate limiting
  if (
    errorMessage.includes('rate limit') ||
    errorMessage.includes('too many requests') ||
    error.status === 429
  ) {
    return {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please wait a moment before trying again.',
      retryable: true,
      statusCode: 429,
      details: {
        retryAfter: error.headers?.get?.('retry-after') || 30,
      },
    };
  }

  // Authentication errors
  if (
    errorMessage.includes('api key') ||
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('authentication') ||
    error.status === 401
  ) {
    return {
      code: 'AUTHENTICATION_ERROR',
      message: 'API authentication failed. Please check your configuration.',
      retryable: false,
      statusCode: 401,
    };
  }

  // Model not found
  if (
    errorMessage.includes('model') &&
    (errorMessage.includes('not found') || errorMessage.includes('does not exist'))
  ) {
    return {
      code: 'MODEL_NOT_FOUND',
      message: `The model "${model}" is not available. Please select a different model.`,
      retryable: false,
      statusCode: 404,
    };
  }

  // Server errors (retryable)
  if (error.status >= 500 || errorMessage.includes('server error')) {
    return {
      code: 'SERVER_ERROR',
      message: 'The AI service is temporarily unavailable. Please try again.',
      retryable: true,
      statusCode: error.status || 503,
    };
  }

  // Network errors (retryable)
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('connection') ||
    errorCode.includes('econnrefused')
  ) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Network error. Please check your connection and try again.',
      retryable: true,
      statusCode: 503,
    };
  }

  // Default unknown error
  return {
    code: 'UNKNOWN_ERROR',
    message: error.message || 'An unexpected error occurred.',
    retryable: false,
    statusCode: 500,
    details: {
      originalError: error.message,
    },
  };
}

// ============================================================================
// Chat Handler
// ============================================================================

export async function handleChatStream(req: Request, res: Response, logger: Logger) {
  const abortController = new AbortController();
  let heartbeatInterval: NodeJS.Timeout | null = null;
  let isClientConnected = true;

  // Handle client disconnect
  req.on('close', () => {
    logger.debug('Client disconnected');
    isClientConnected = false;
    abortController.abort();
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
  });

  req.on('error', (err) => {
    logger.error({ error: err }, 'Request error');
    isClientConnected = false;
    abortController.abort();
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
  });

  try {
    // Validate request
    const validationResult = ChatRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid request format',
          details: validationResult.error.errors,
          retryable: false,
        },
      });
      return;
    }

    const chatRequest = validationResult.data;

    // Check token limit before making request
    const estimatedTokens = estimateRequestTokens(chatRequest.messages);
    const contextLimit = getModelContextLimit(chatRequest.model);
    const safeLimit = contextLimit * 0.9; // Leave 10% buffer for response

    if (estimatedTokens > safeLimit) {
      logger.warn({
        estimatedTokens,
        contextLimit,
        model: chatRequest.model,
      }, 'Request may exceed context limit');

      // If way over limit, reject immediately
      if (estimatedTokens > contextLimit) {
        res.status(413).json({
          error: {
            code: 'TOKEN_LIMIT_EXCEEDED',
            message: 'The conversation is too long for this model. Try removing some messages or starting a new conversation.',
            retryable: false,
            details: {
              estimatedTokens,
              contextLimit,
              model: chatRequest.model,
            },
          },
        });
        return;
      }
    }

    // Get appropriate provider
    let provider;
    try {
      provider = ProviderFactory.getProvider(chatRequest.model);
    } catch (providerError: any) {
      res.status(400).json({
        error: {
          code: 'PROVIDER_ERROR',
          message: providerError.message || 'Failed to initialize model provider',
          retryable: false,
          details: { model: chatRequest.model },
        },
      });
      return;
    }

    // Non-streaming response
    if (!chatRequest.stream) {
      try {
        const result = await provider.chat(chatRequest, logger);
        res.json({
          data: {
            content: result.content,
            usage: result.usage,
            artifacts: result.artifacts,
            model: chatRequest.model,
          },
        });
      } catch (error: any) {
        const classified = classifyError(error, chatRequest.model);
        logger.error({ error, classified }, 'Non-streaming chat error');
        res.status(classified.statusCode).json({
          error: {
            code: classified.code,
            message: classified.message,
            retryable: classified.retryable,
            details: classified.details,
          },
        });
      }
      return;
    }

    // Streaming response with SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Flush headers immediately
    res.flushHeaders?.();

    // Send initial connected event
    res.write('event: connected\n');
    res.write(`data: ${JSON.stringify({
      status: 'ready',
      model: chatRequest.model,
      estimatedInputTokens: estimatedTokens,
      contextLimit,
    })}\n\n`);

    // Start heartbeat to keep connection alive
    heartbeatInterval = setInterval(() => {
      if (isClientConnected && !res.writableEnded) {
        try {
          res.write('event: heartbeat\n');
          res.write(`data: ${JSON.stringify({ timestamp: Date.now() })}\n\n`);
        } catch (err) {
          logger.debug('Failed to send heartbeat, client may have disconnected');
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }
        }
      }
    }, 15000); // Send heartbeat every 15 seconds

    let fullContent = '';
    let finalUsage: TokenUsage = {
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
    };
    let chunkCount = 0;
    const startTime = Date.now();

    // Stream from provider
    try {
      for await (const chunk of provider.streamChat(chatRequest, logger, abortController.signal)) {
        // Check if client is still connected
        if (!isClientConnected || res.writableEnded) {
          logger.debug('Client disconnected, stopping stream');
          break;
        }

        if (abortController.signal.aborted) {
          res.write('event: aborted\n');
          res.write(`data: ${JSON.stringify({
            message: 'Stream aborted',
            contentLength: fullContent.length,
          })}\n\n`);
          break;
        }

        if (chunk.type === 'content') {
          fullContent += chunk.data.content;
          chunkCount++;
          res.write(`data: ${JSON.stringify({
            content: chunk.data.content,
            chunkIndex: chunkCount,
          })}\n\n`);
        } else if (chunk.type === 'usage') {
          finalUsage = {
            input_tokens: chunk.data.input_tokens || finalUsage.input_tokens || 0,
            output_tokens: chunk.data.output_tokens || finalUsage.output_tokens || 0,
            total_tokens: chunk.data.total_tokens ||
              (chunk.data.input_tokens || 0) + (chunk.data.output_tokens || 0) ||
              finalUsage.total_tokens || 0,
          };
          res.write('event: usage\n');
          res.write(`data: ${JSON.stringify(finalUsage)}\n\n`);
        } else if (chunk.type === 'error') {
          const classified = classifyError({ message: chunk.error }, chatRequest.model);
          res.write('event: error\n');
          res.write(`data: ${JSON.stringify({
            code: classified.code,
            error: classified.message,
            retryable: classified.retryable,
            details: classified.details,
          })}\n\n`);
        } else if (chunk.type === 'done') {
          // Extract and send artifacts
          const artifacts = extractArtifacts(fullContent);
          if (artifacts.length > 0) {
            res.write('event: artifacts\n');
            res.write(`data: ${JSON.stringify({ artifacts })}\n\n`);
          }

          const duration = Date.now() - startTime;
          res.write('event: done\n');
          res.write(`data: ${JSON.stringify({
            usage: finalUsage,
            artifacts_count: artifacts.length,
            chunk_count: chunkCount,
            duration_ms: duration,
            model: chatRequest.model,
          })}\n\n`);
        }
      }
    } catch (streamError: any) {
      logger.error({ error: streamError }, 'Error during streaming');
      const classified = classifyError(streamError, chatRequest.model);

      if (!res.writableEnded) {
        res.write('event: error\n');
        res.write(`data: ${JSON.stringify({
          code: classified.code,
          error: classified.message,
          retryable: classified.retryable,
          details: classified.details,
          partialContent: fullContent.length > 0,
          contentLength: fullContent.length,
        })}\n\n`);
      }
    }

    // Clean up
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }

    if (!res.writableEnded) {
      res.end();
    }

  } catch (error: any) {
    logger.error({ error }, 'Chat stream error');

    // Clean up heartbeat
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }

    const classified = classifyError(error, req.body?.model || 'unknown');

    if (!res.headersSent) {
      res.status(classified.statusCode).json({
        error: {
          code: classified.code,
          message: classified.message,
          retryable: classified.retryable,
          details: classified.details,
        },
      });
    } else if (!res.writableEnded) {
      res.write('event: error\n');
      res.write(`data: ${JSON.stringify({
        code: classified.code,
        error: classified.message,
        retryable: classified.retryable,
      })}\n\n`);
      res.end();
    }
  }
}

// ============================================================================
// Models List Handler
// ============================================================================

export async function handleListModels(req: Request, res: Response, logger: Logger) {
  try {
    const models = [
      // ============================================
      // ANTHROPIC - Latest Models (January 2026)
      // ============================================
      {
        id: 'claude-opus-4-5-20251101',
        provider: 'anthropic',
        name: 'Claude Opus 4.5',
        description: 'Most capable model - best for complex reasoning, analysis, and creative tasks',
        context_window: 200000,
        supports_vision: true,
        tier: 'flagship',
      },
      {
        id: 'claude-sonnet-4-5-20250929',
        provider: 'anthropic',
        name: 'Claude Sonnet 4.5',
        description: 'Excellent balance of intelligence and speed for most tasks',
        context_window: 200000,
        supports_vision: true,
        tier: 'balanced',
      },
      {
        id: 'claude-haiku-4-5-20251022',
        provider: 'anthropic',
        name: 'Claude Haiku 4.5',
        description: 'Fastest model - ideal for high-volume, low-latency tasks',
        context_window: 200000,
        supports_vision: true,
        tier: 'fast',
      },
      {
        id: 'claude-3-5-sonnet-20241022',
        provider: 'anthropic',
        name: 'Claude 3.5 Sonnet',
        description: 'Previous generation intelligent model',
        context_window: 200000,
        supports_vision: true,
        tier: 'legacy',
      },
      {
        id: 'claude-3-5-haiku-20241022',
        provider: 'anthropic',
        name: 'Claude 3.5 Haiku',
        description: 'Previous generation fast model',
        context_window: 200000,
        supports_vision: true,
        tier: 'legacy',
      },
      // ============================================
      // OPENAI - Latest Models (January 2026)
      // ============================================
      {
        id: 'gpt-5.2',
        provider: 'openai',
        name: 'GPT-5.2',
        description: 'Latest flagship GPT model with enhanced reasoning',
        context_window: 400000,
        supports_vision: true,
        tier: 'flagship',
      },
      {
        id: 'gpt-5.2-pro',
        provider: 'openai',
        name: 'GPT-5.2 Pro',
        description: 'Extended capabilities GPT-5.2 for enterprise',
        context_window: 400000,
        supports_vision: true,
        tier: 'flagship',
      },
      {
        id: 'gpt-4.1',
        provider: 'openai',
        name: 'GPT-4.1',
        description: 'Million-token context flagship model',
        context_window: 1000000,
        supports_vision: true,
        tier: 'balanced',
      },
      {
        id: 'o3',
        provider: 'openai',
        name: 'o3',
        description: 'Advanced reasoning model - excels at math, coding, and logic',
        context_window: 200000,
        supports_vision: false,
        tier: 'reasoning',
      },
      {
        id: 'o3-pro',
        provider: 'openai',
        name: 'o3 Pro',
        description: 'Extended o3 with enhanced reasoning capabilities',
        context_window: 200000,
        supports_vision: false,
        tier: 'reasoning',
      },
      {
        id: 'o4-mini',
        provider: 'openai',
        name: 'o4 Mini',
        description: 'Fast reasoning model with lower cost',
        context_window: 200000,
        supports_vision: false,
        tier: 'fast',
      },
      {
        id: 'gpt-4o',
        provider: 'openai',
        name: 'GPT-4o',
        description: 'Multimodal model with vision and audio',
        context_window: 128000,
        supports_vision: true,
        tier: 'legacy',
      },
      {
        id: 'gpt-4o-mini',
        provider: 'openai',
        name: 'GPT-4o Mini',
        description: 'Fast and affordable GPT-4o variant',
        context_window: 128000,
        supports_vision: true,
        tier: 'legacy',
      },
      // ============================================
      // GOOGLE - Latest Models (January 2026)
      // ============================================
      {
        id: 'gemini-3-pro',
        provider: 'google',
        name: 'Gemini 3 Pro',
        description: 'Latest Gemini flagship with million-token context',
        context_window: 1000000,
        supports_vision: true,
        tier: 'flagship',
      },
      {
        id: 'gemini-3-flash',
        provider: 'google',
        name: 'Gemini 3 Flash',
        description: 'Fast Gemini 3 model for high-throughput tasks',
        context_window: 1000000,
        supports_vision: true,
        tier: 'fast',
      },
      {
        id: 'gemini-3-deep-think',
        provider: 'google',
        name: 'Gemini 3 Deep Think',
        description: 'Advanced reasoning variant with deep thinking capabilities',
        context_window: 192000,
        supports_vision: true,
        tier: 'reasoning',
      },
      {
        id: 'gemini-2.5-pro',
        provider: 'google',
        name: 'Gemini 2.5 Pro',
        description: '2-million token context powerhouse',
        context_window: 2000000,
        supports_vision: true,
        tier: 'balanced',
      },
      {
        id: 'gemini-2.0-flash-exp',
        provider: 'google',
        name: 'Gemini 2.0 Flash',
        description: 'Previous generation fast model',
        context_window: 1000000,
        supports_vision: true,
        tier: 'legacy',
      },
      {
        id: 'gemini-1.5-pro',
        provider: 'google',
        name: 'Gemini 1.5 Pro',
        description: 'Previous generation pro model',
        context_window: 2000000,
        supports_vision: true,
        tier: 'legacy',
      },
      // ============================================
      // DEEPSEEK - Latest Models (January 2026)
      // ============================================
      {
        id: 'deepseek-v3.2-exp',
        provider: 'deepseek',
        name: 'DeepSeek V3.2',
        description: 'Latest DeepSeek with enhanced coding and reasoning',
        context_window: 128000,
        supports_vision: false,
        tier: 'flagship',
      },
      {
        id: 'deepseek-r1',
        provider: 'deepseek',
        name: 'DeepSeek R1',
        description: 'Reasoning-focused model rivaling o1',
        context_window: 128000,
        supports_vision: false,
        tier: 'reasoning',
      },
      {
        id: 'deepseek-coder-v3',
        provider: 'deepseek',
        name: 'DeepSeek Coder V3',
        description: 'Specialized coding model with exceptional code generation',
        context_window: 128000,
        supports_vision: false,
        tier: 'specialized',
      },
      // ============================================
      // MISTRAL - Latest Models (January 2026)
      // ============================================
      {
        id: 'mistral-large-2',
        provider: 'mistral',
        name: 'Mistral Large 2',
        description: 'Flagship Mistral model with advanced reasoning and multilingual support',
        context_window: 128000,
        supports_vision: true,
        tier: 'flagship',
      },
      {
        id: 'mistral-medium-2',
        provider: 'mistral',
        name: 'Mistral Medium 2',
        description: 'Balanced Mistral model for general-purpose tasks',
        context_window: 128000,
        supports_vision: true,
        tier: 'balanced',
      },
      // ============================================
      // XAI GROK - Latest Models (January 2026)
      // ============================================
      {
        id: 'grok-3',
        provider: 'xai',
        name: 'Grok 3',
        description: 'Latest xAI flagship model with real-time knowledge',
        context_window: 131072,
        supports_vision: true,
        tier: 'flagship',
      },
      {
        id: 'grok-3-vision',
        provider: 'xai',
        name: 'Grok 3 Vision',
        description: 'Grok 3 with enhanced vision capabilities',
        context_window: 131072,
        supports_vision: true,
        tier: 'flagship',
      },
    ];

    res.json({ data: models });
  } catch (error: any) {
    logger.error({ error }, 'Failed to list models');
    res.status(500).json({
      error: { message: error.message || 'Failed to list models' },
    });
  }
}
