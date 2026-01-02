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

type ModelProvider = 'anthropic' | 'openai' | 'google';

function detectProvider(model: string): ModelProvider {
  const lowerModel = model.toLowerCase();

  if (lowerModel.includes('claude')) {
    return 'anthropic';
  } else if (lowerModel.includes('gpt') || lowerModel.includes('o1') || lowerModel.includes('o3')) {
    return 'openai';
  } else if (lowerModel.includes('gemini') || lowerModel.includes('palm')) {
    return 'google';
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
// Provider Factory
// ============================================================================

class ProviderFactory {
  private static anthropic: AnthropicProvider | null = null;
  private static openai: OpenAIProvider | null = null;
  private static google: GoogleProvider | null = null;

  static getProvider(model: string): AnthropicProvider | OpenAIProvider | GoogleProvider {
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

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
}

// ============================================================================
// Chat Handler
// ============================================================================

export async function handleChatStream(req: Request, res: Response, logger: Logger) {
  const abortController = new AbortController();

  // Handle client disconnect
  req.on('close', () => {
    abortController.abort();
  });

  try {
    // Validate request
    const validationResult = ChatRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: {
          message: 'Invalid request',
          details: validationResult.error.errors,
        },
      });
      return;
    }

    const chatRequest = validationResult.data;

    // Get appropriate provider
    const provider = ProviderFactory.getProvider(chatRequest.model);

    // Non-streaming response
    if (!chatRequest.stream) {
      const result = await provider.chat(chatRequest, logger);
      res.json({
        data: {
          content: result.content,
          usage: result.usage,
          artifacts: result.artifacts,
          model: chatRequest.model,
        },
      });
      return;
    }

    // Streaming response with SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Send initial connected event
    res.write('event: connected\n');
    res.write('data: {"status":"ready"}\n\n');

    let fullContent = '';
    let finalUsage: TokenUsage = {
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
    };

    // Stream from provider
    for await (const chunk of provider.streamChat(chatRequest, logger, abortController.signal)) {
      if (abortController.signal.aborted) {
        res.write('event: aborted\n');
        res.write('data: {"message":"Stream aborted"}\n\n');
        break;
      }

      if (chunk.type === 'content') {
        fullContent += chunk.data.content;
        res.write(`data: ${JSON.stringify(chunk.data)}\n\n`);
      } else if (chunk.type === 'usage') {
        finalUsage = {
          input_tokens: chunk.data.input_tokens || finalUsage.input_tokens || 0,
          output_tokens: chunk.data.output_tokens || finalUsage.output_tokens || 0,
          total_tokens: chunk.data.total_tokens ||
            (chunk.data.input_tokens || 0) + (chunk.data.output_tokens || 0) ||
            finalUsage.total_tokens || 0,
        };
        res.write(`event: usage\n`);
        res.write(`data: ${JSON.stringify(finalUsage)}\n\n`);
      } else if (chunk.type === 'error') {
        res.write('event: error\n');
        res.write(`data: ${JSON.stringify({ error: chunk.error })}\n\n`);
      } else if (chunk.type === 'done') {
        // Extract and send artifacts
        const artifacts = extractArtifacts(fullContent);
        if (artifacts.length > 0) {
          res.write('event: artifacts\n');
          res.write(`data: ${JSON.stringify({ artifacts })}\n\n`);
        }

        res.write('event: done\n');
        res.write(`data: ${JSON.stringify({
          usage: finalUsage,
          artifacts_count: artifacts.length
        })}\n\n`);
      }
    }

    res.end();

  } catch (error: any) {
    logger.error({ error }, 'Chat stream error');

    if (!res.headersSent) {
      res.status(500).json({
        error: {
          message: error.message || 'Internal server error',
          type: error.constructor.name,
        },
      });
    } else {
      res.write('event: error\n');
      res.write(`data: ${JSON.stringify({
        error: error.message || 'Internal server error'
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
      // Anthropic Claude models
      {
        id: 'claude-3-5-sonnet-20241022',
        provider: 'anthropic',
        name: 'Claude 3.5 Sonnet',
        description: 'Most intelligent model, best for complex tasks',
        context_window: 200000,
        supports_vision: true,
      },
      {
        id: 'claude-3-5-haiku-20241022',
        provider: 'anthropic',
        name: 'Claude 3.5 Haiku',
        description: 'Fastest model, best for simple tasks',
        context_window: 200000,
        supports_vision: true,
      },
      {
        id: 'claude-3-opus-20240229',
        provider: 'anthropic',
        name: 'Claude 3 Opus',
        description: 'Previous flagship model',
        context_window: 200000,
        supports_vision: true,
      },
      // OpenAI GPT models
      {
        id: 'gpt-4o',
        provider: 'openai',
        name: 'GPT-4o',
        description: 'Most advanced multimodal model',
        context_window: 128000,
        supports_vision: true,
      },
      {
        id: 'gpt-4o-mini',
        provider: 'openai',
        name: 'GPT-4o Mini',
        description: 'Fast and affordable model',
        context_window: 128000,
        supports_vision: true,
      },
      {
        id: 'gpt-4-turbo',
        provider: 'openai',
        name: 'GPT-4 Turbo',
        description: 'Previous generation flagship',
        context_window: 128000,
        supports_vision: true,
      },
      {
        id: 'o1',
        provider: 'openai',
        name: 'o1',
        description: 'Advanced reasoning model',
        context_window: 200000,
        supports_vision: false,
      },
      // Google Gemini models
      {
        id: 'gemini-2.0-flash-exp',
        provider: 'google',
        name: 'Gemini 2.0 Flash',
        description: 'Next generation multimodal model',
        context_window: 1000000,
        supports_vision: true,
      },
      {
        id: 'gemini-1.5-pro',
        provider: 'google',
        name: 'Gemini 1.5 Pro',
        description: 'Pro-level multimodal model',
        context_window: 2000000,
        supports_vision: true,
      },
      {
        id: 'gemini-1.5-flash',
        provider: 'google',
        name: 'Gemini 1.5 Flash',
        description: 'Fast and efficient model',
        context_window: 1000000,
        supports_vision: true,
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
