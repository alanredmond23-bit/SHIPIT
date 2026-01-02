import OpenAI from 'openai';
import { Logger } from 'pino';

/**
 * OpenAI API Client
 *
 * Supports:
 * - Chat completions (GPT-4, GPT-4 Turbo, GPT-3.5)
 * - Embeddings (text-embedding-3-small, text-embedding-3-large)
 * - DALL-E 3 image generation
 * - Whisper speech-to-text
 * - TTS (text-to-speech)
 * - Streaming responses
 */

// ============================================================================
// Types
// ============================================================================

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
}

export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export interface OpenAIChatRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stream?: boolean;
  tools?: OpenAITool[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  response_format?: { type: 'text' | 'json_object' };
  seed?: number;
  user?: string;
}

export interface OpenAIChatResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: OpenAIMessage;
    finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
    logprobs?: any;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  system_fingerprint?: string;
}

export interface OpenAIStreamChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: 'assistant';
      content?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: 'function';
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason?: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  }>;
}

export interface EmbeddingRequest {
  input: string | string[];
  model?: string;
  user?: string;
}

export interface EmbeddingResponse {
  object: 'list';
  data: Array<{
    object: 'embedding';
    index: number;
    embedding: number[];
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface ImageGenerationRequest {
  prompt: string;
  model?: 'dall-e-2' | 'dall-e-3';
  n?: number;
  size?: '256x256' | '512x512' | '1024x1024' | '1024x1792' | '1792x1024';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  response_format?: 'url' | 'b64_json';
  user?: string;
}

export interface ImageGenerationResponse {
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
}

export interface TranscriptionRequest {
  file: Buffer;
  filename: string;
  model?: string;
  language?: string;
  prompt?: string;
  response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  temperature?: number;
}

export interface TranscriptionResponse {
  text: string;
  language?: string;
  duration?: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
  segments?: Array<{
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
    tokens: number[];
    temperature: number;
    avg_logprob: number;
    compression_ratio: number;
    no_speech_prob: number;
  }>;
}

export interface TTSRequest {
  input: string;
  model?: 'tts-1' | 'tts-1-hd';
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  response_format?: 'mp3' | 'opus' | 'aac' | 'flac';
  speed?: number;
}

// ============================================================================
// OpenAI Client
// ============================================================================

export class OpenAIClient {
  private client: OpenAI;
  private logger: Logger;

  // Model configurations
  public static readonly MODELS = {
    GPT_4O: 'gpt-4o',
    GPT_4O_MINI: 'gpt-4o-mini',
    GPT_4_TURBO: 'gpt-4-turbo',
    GPT_4: 'gpt-4',
    GPT_35_TURBO: 'gpt-3.5-turbo',
    O1: 'o1',
    O1_MINI: 'o1-mini',
  };

  public static readonly EMBEDDING_MODELS = {
    SMALL: 'text-embedding-3-small',
    LARGE: 'text-embedding-3-large',
    ADA_002: 'text-embedding-ada-002',
  };

  public static readonly IMAGE_MODELS = {
    DALLE_3: 'dall-e-3',
    DALLE_2: 'dall-e-2',
  };

  public static readonly AUDIO_MODELS = {
    WHISPER_1: 'whisper-1',
    TTS_1: 'tts-1',
    TTS_1_HD: 'tts-1-hd',
  };

  constructor(apiKey: string, logger: Logger, organization?: string) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({
      apiKey,
      organization,
      maxRetries: 3,
      timeout: 120000, // 2 minutes
    });

    this.logger = logger.child({ service: 'openai-client' });
    this.logger.info('OpenAI client initialized');
  }

  // ============================================================================
  // Chat Completions
  // ============================================================================

  /**
   * Send a chat completion request
   */
  async chat(request: OpenAIChatRequest): Promise<OpenAIChatResponse> {
    const startTime = Date.now();

    try {
      this.logger.info({
        model: request.model,
        messageCount: request.messages.length,
        hasTools: !!request.tools,
      }, 'Sending chat request to OpenAI');

      const response = await this.client.chat.completions.create({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature,
        top_p: request.topP,
        max_tokens: request.maxTokens,
        tools: request.tools,
        tool_choice: request.tool_choice,
        response_format: request.response_format,
        seed: request.seed,
        user: request.user,
      });

      const duration = Date.now() - startTime;

      this.logger.info({
        id: response.id,
        model: response.model,
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        finishReason: response.choices[0]?.finish_reason,
        duration,
      }, 'Chat request completed');

      return response as OpenAIChatResponse;
    } catch (error: any) {
      this.logger.error({
        error: error.message,
        model: request.model,
        duration: Date.now() - startTime,
      }, 'Chat request failed');

      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  /**
   * Stream a chat completion
   */
  async *chatStream(request: OpenAIChatRequest): AsyncGenerator<OpenAIStreamChunk> {
    try {
      this.logger.info({
        model: request.model,
        messageCount: request.messages.length,
      }, 'Starting streaming chat request');

      const stream = await this.client.chat.completions.create({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature,
        top_p: request.topP,
        max_tokens: request.maxTokens,
        tools: request.tools,
        tool_choice: request.tool_choice,
        response_format: request.response_format,
        seed: request.seed,
        user: request.user,
        stream: true,
      });

      for await (const chunk of stream) {
        yield chunk as OpenAIStreamChunk;
      }

      this.logger.info('Streaming chat request completed');
    } catch (error: any) {
      this.logger.error({ error: error.message }, 'Streaming chat request failed');
      throw new Error(`OpenAI streaming error: ${error.message}`);
    }
  }

  /**
   * Use ChatGPT with tools/functions
   */
  async chatWithTools(
    messages: OpenAIMessage[],
    tools: OpenAITool[],
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<OpenAIChatResponse> {
    return this.chat({
      model: options.model || OpenAIClient.MODELS.GPT_4O,
      messages,
      tools,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    });
  }

  // ============================================================================
  // Embeddings
  // ============================================================================

  /**
   * Generate embeddings for text
   */
  async createEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const startTime = Date.now();

    try {
      this.logger.info({
        model: request.model || OpenAIClient.EMBEDDING_MODELS.SMALL,
        inputType: Array.isArray(request.input) ? 'array' : 'string',
        inputCount: Array.isArray(request.input) ? request.input.length : 1,
      }, 'Creating embeddings');

      const response = await this.client.embeddings.create({
        model: request.model || OpenAIClient.EMBEDDING_MODELS.SMALL,
        input: request.input,
        user: request.user,
      });

      const duration = Date.now() - startTime;

      this.logger.info({
        embeddingCount: response.data.length,
        dimensions: response.data[0]?.embedding.length,
        promptTokens: response.usage.prompt_tokens,
        duration,
      }, 'Embeddings created');

      return response as EmbeddingResponse;
    } catch (error: any) {
      this.logger.error({
        error: error.message,
        duration: Date.now() - startTime,
      }, 'Embedding creation failed');

      throw new Error(`OpenAI embedding error: ${error.message}`);
    }
  }

  /**
   * Generate embedding for a single text
   */
  async embed(text: string, model?: string): Promise<number[]> {
    const response = await this.createEmbedding({
      input: text,
      model: model || OpenAIClient.EMBEDDING_MODELS.SMALL,
    });

    return response.data[0].embedding;
  }

  /**
   * Generate embeddings for multiple texts
   */
  async embedBatch(texts: string[], model?: string): Promise<number[][]> {
    const response = await this.createEmbedding({
      input: texts,
      model: model || OpenAIClient.EMBEDDING_MODELS.SMALL,
    });

    return response.data.map(item => item.embedding);
  }

  // ============================================================================
  // Image Generation (DALL-E)
  // ============================================================================

  /**
   * Generate images with DALL-E
   */
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const startTime = Date.now();

    try {
      this.logger.info({
        model: request.model || OpenAIClient.IMAGE_MODELS.DALLE_3,
        prompt: request.prompt.substring(0, 100),
        size: request.size,
        quality: request.quality,
      }, 'Generating image');

      const response = await this.client.images.generate({
        model: request.model || OpenAIClient.IMAGE_MODELS.DALLE_3,
        prompt: request.prompt,
        n: request.n,
        size: request.size,
        quality: request.quality,
        style: request.style,
        response_format: request.response_format || 'url',
        user: request.user,
      });

      const duration = Date.now() - startTime;

      this.logger.info({
        imageCount: response.data.length,
        duration,
      }, 'Image generated');

      return response as ImageGenerationResponse;
    } catch (error: any) {
      this.logger.error({
        error: error.message,
        duration: Date.now() - startTime,
      }, 'Image generation failed');

      throw new Error(`DALL-E error: ${error.message}`);
    }
  }

  // ============================================================================
  // Speech-to-Text (Whisper)
  // ============================================================================

  /**
   * Transcribe audio with Whisper
   */
  async transcribe(request: TranscriptionRequest): Promise<TranscriptionResponse> {
    const startTime = Date.now();

    try {
      this.logger.info({
        model: request.model || OpenAIClient.AUDIO_MODELS.WHISPER_1,
        filename: request.filename,
        language: request.language,
      }, 'Transcribing audio');

      // Create a File object from the buffer
      const file = new File([request.file], request.filename, {
        type: 'audio/mpeg',
      });

      const response = await this.client.audio.transcriptions.create({
        file,
        model: request.model || OpenAIClient.AUDIO_MODELS.WHISPER_1,
        language: request.language,
        prompt: request.prompt,
        response_format: request.response_format || 'json',
        temperature: request.temperature,
      });

      const duration = Date.now() - startTime;

      this.logger.info({
        textLength: typeof response === 'string' ? response.length : (response as any).text?.length,
        duration,
      }, 'Audio transcribed');

      if (typeof response === 'string') {
        return { text: response };
      }

      return response as TranscriptionResponse;
    } catch (error: any) {
      this.logger.error({
        error: error.message,
        duration: Date.now() - startTime,
      }, 'Transcription failed');

      throw new Error(`Whisper error: ${error.message}`);
    }
  }

  // ============================================================================
  // Text-to-Speech
  // ============================================================================

  /**
   * Synthesize speech from text
   */
  async textToSpeech(request: TTSRequest): Promise<Buffer> {
    const startTime = Date.now();

    try {
      this.logger.info({
        model: request.model || OpenAIClient.AUDIO_MODELS.TTS_1,
        voice: request.voice,
        textLength: request.input.length,
      }, 'Synthesizing speech');

      const response = await this.client.audio.speech.create({
        model: request.model || OpenAIClient.AUDIO_MODELS.TTS_1,
        voice: request.voice,
        input: request.input,
        response_format: request.response_format || 'mp3',
        speed: request.speed,
      });

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      const duration = Date.now() - startTime;

      this.logger.info({
        audioSize: audioBuffer.length,
        duration,
      }, 'Speech synthesized');

      return audioBuffer;
    } catch (error: any) {
      this.logger.error({
        error: error.message,
        duration: Date.now() - startTime,
      }, 'TTS failed');

      throw new Error(`OpenAI TTS error: ${error.message}`);
    }
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.chat({
        model: OpenAIClient.MODELS.GPT_35_TURBO,
        messages: [{ role: 'user', content: 'Hi' }],
        maxTokens: 5,
      });
      return true;
    } catch (error) {
      this.logger.error({ error }, 'Health check failed');
      return false;
    }
  }

  /**
   * Get available models
   */
  async listModels(): Promise<Array<{ id: string; created: number }>> {
    try {
      const response = await this.client.models.list();
      return response.data.map(model => ({
        id: model.id,
        created: model.created,
      }));
    } catch (error: any) {
      this.logger.error({ error: error.message }, 'Failed to list models');
      throw new Error(`Failed to list models: ${error.message}`);
    }
  }

  /**
   * Format message history for OpenAI
   */
  static formatMessageHistory(
    history: Array<{ role: string; content: string }>
  ): OpenAIMessage[] {
    return history
      .filter(msg => ['system', 'user', 'assistant'].includes(msg.role))
      .map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content,
      }));
  }

  /**
   * Extract text from response
   */
  static extractText(response: OpenAIChatResponse): string {
    return response.choices[0]?.message?.content || '';
  }

  /**
   * Extract tool calls from response
   */
  static extractToolCalls(response: OpenAIChatResponse): Array<{
    id: string;
    name: string;
    arguments: any;
  }> {
    const toolCalls = response.choices[0]?.message?.tool_calls || [];
    return toolCalls.map(tc => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments),
    }));
  }
}
