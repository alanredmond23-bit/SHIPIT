import { Logger } from 'pino';

/**
 * Google AI (Gemini) API Client
 *
 * Supports:
 * - Gemini chat completions
 * - Vision (multimodal understanding)
 * - Streaming responses
 * - Function calling
 */

// ============================================================================
// Types
// ============================================================================

export interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // base64
  };
  functionCall?: {
    name: string;
    args: Record<string, any>;
  };
  functionResponse?: {
    name: string;
    response: Record<string, any>;
  };
}

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

export interface GeminiTool {
  functionDeclarations: Array<{
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  }>;
}

export interface GeminiChatRequest {
  model: string;
  contents: GeminiMessage[];
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
  tools?: GeminiTool[];
}

export interface GeminiChatResponse {
  candidates: Array<{
    content: {
      parts: GeminiPart[];
      role: string;
    };
    finishReason: string;
    index: number;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  promptFeedback?: {
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  };
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export interface GeminiStreamChunk {
  candidates?: Array<{
    content: {
      parts: GeminiPart[];
      role: string;
    };
    finishReason?: string;
    index: number;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

// ============================================================================
// Google AI Client
// ============================================================================

export class GoogleAIClient {
  private apiKey: string;
  private logger: Logger;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  // Model configurations
  public static readonly MODELS = {
    GEMINI_2_0_FLASH: 'gemini-2.0-flash-exp',
    GEMINI_1_5_PRO: 'gemini-1.5-pro-latest',
    GEMINI_1_5_FLASH: 'gemini-1.5-flash-latest',
    GEMINI_PRO_VISION: 'gemini-pro-vision',
  };

  public static readonly SAFETY_CATEGORIES = {
    HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
    HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
    HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT',
  };

  public static readonly SAFETY_THRESHOLDS = {
    BLOCK_NONE: 'BLOCK_NONE',
    BLOCK_ONLY_HIGH: 'BLOCK_ONLY_HIGH',
    BLOCK_MEDIUM_AND_ABOVE: 'BLOCK_MEDIUM_AND_ABOVE',
    BLOCK_LOW_AND_ABOVE: 'BLOCK_LOW_AND_ABOVE',
  };

  constructor(apiKey: string, logger: Logger) {
    if (!apiKey) {
      throw new Error('Google AI API key is required');
    }

    this.apiKey = apiKey;
    this.logger = logger.child({ service: 'google-ai-client' });
    this.logger.info('Google AI client initialized');
  }

  // ============================================================================
  // Chat Completions
  // ============================================================================

  /**
   * Send a chat completion request
   */
  async chat(request: GeminiChatRequest): Promise<GeminiChatResponse> {
    const startTime = Date.now();

    try {
      this.logger.info({
        model: request.model,
        messageCount: request.contents.length,
        hasTools: !!request.tools,
      }, 'Sending chat request to Gemini');

      const modelName = request.model.includes('/') ? request.model : `models/${request.model}`;
      const url = `${this.baseUrl}/${modelName}:generateContent?key=${this.apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: request.contents,
          systemInstruction: request.systemInstruction,
          generationConfig: request.generationConfig,
          safetySettings: request.safetySettings,
          tools: request.tools,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json() as GeminiChatResponse;
      const duration = Date.now() - startTime;

      this.logger.info({
        model: request.model,
        promptTokens: data.usageMetadata?.promptTokenCount,
        completionTokens: data.usageMetadata?.candidatesTokenCount,
        finishReason: data.candidates?.[0]?.finishReason,
        duration,
      }, 'Chat request completed');

      return data;
    } catch (error: any) {
      this.logger.error({
        error: error.message,
        model: request.model,
        duration: Date.now() - startTime,
      }, 'Chat request failed');

      throw new Error(`Gemini API error: ${error.message}`);
    }
  }

  /**
   * Stream a chat completion
   */
  async *chatStream(request: GeminiChatRequest): AsyncGenerator<GeminiStreamChunk> {
    try {
      this.logger.info({
        model: request.model,
        messageCount: request.contents.length,
      }, 'Starting streaming chat request');

      const modelName = request.model.includes('/') ? request.model : `models/${request.model}`;
      const url = `${this.baseUrl}/${modelName}:streamGenerateContent?key=${this.apiKey}&alt=sse`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: request.contents,
          systemInstruction: request.systemInstruction,
          generationConfig: request.generationConfig,
          safetySettings: request.safetySettings,
          tools: request.tools,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini streaming error: ${response.statusText} - ${errorText}`);
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
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data.trim() === '') continue;

            try {
              const chunk = JSON.parse(data) as GeminiStreamChunk;
              yield chunk;
            } catch (e) {
              this.logger.warn({ line }, 'Failed to parse SSE chunk');
            }
          }
        }
      }

      this.logger.info('Streaming chat request completed');
    } catch (error: any) {
      this.logger.error({ error: error.message }, 'Streaming chat request failed');
      throw new Error(`Gemini streaming error: ${error.message}`);
    }
  }

  /**
   * Simple text generation
   */
  async generateText(
    prompt: string,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      systemInstruction?: string;
    } = {}
  ): Promise<string> {
    const contents: GeminiMessage[] = [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ];

    const response = await this.chat({
      model: options.model || GoogleAIClient.MODELS.GEMINI_1_5_FLASH,
      contents,
      systemInstruction: options.systemInstruction
        ? { parts: [{ text: options.systemInstruction }] }
        : undefined,
      generationConfig: {
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
      },
    });

    return GoogleAIClient.extractText(response);
  }

  /**
   * Analyze an image with vision
   */
  async analyzeImage(
    imageData: string,
    prompt: string,
    options: {
      model?: string;
      mimeType?: string;
      temperature?: number;
    } = {}
  ): Promise<string> {
    const contents: GeminiMessage[] = [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: options.mimeType || 'image/jpeg',
              data: imageData,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    ];

    const response = await this.chat({
      model: options.model || GoogleAIClient.MODELS.GEMINI_1_5_FLASH,
      contents,
      generationConfig: {
        temperature: options.temperature,
      },
    });

    return GoogleAIClient.extractText(response);
  }

  /**
   * Use Gemini with function calling
   */
  async chatWithTools(
    messages: GeminiMessage[],
    tools: GeminiTool[],
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<GeminiChatResponse> {
    return this.chat({
      model: options.model || GoogleAIClient.MODELS.GEMINI_1_5_FLASH,
      contents: messages,
      tools,
      generationConfig: {
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
      },
    });
  }

  /**
   * Count tokens (estimation via API)
   */
  async countTokens(text: string, model?: string): Promise<number> {
    try {
      const modelName = model || GoogleAIClient.MODELS.GEMINI_1_5_FLASH;
      const fullModelName = modelName.includes('/') ? modelName : `models/${modelName}`;
      const url = `${this.baseUrl}/${fullModelName}:countTokens?key=${this.apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text }],
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Token count error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.totalTokens || 0;
    } catch (error: any) {
      this.logger.warn({ error: error.message }, 'Token counting failed, using estimation');
      // Fallback to rough estimation
      return Math.ceil(text.length / 4);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.generateText('Hi', {
        model: GoogleAIClient.MODELS.GEMINI_1_5_FLASH,
        maxTokens: 10,
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
  getAvailableModels(): string[] {
    return Object.values(GoogleAIClient.MODELS);
  }

  /**
   * Get default safety settings (permissive)
   */
  static getDefaultSafetySettings() {
    return [
      {
        category: GoogleAIClient.SAFETY_CATEGORIES.HARM_CATEGORY_HARASSMENT,
        threshold: GoogleAIClient.SAFETY_THRESHOLDS.BLOCK_ONLY_HIGH,
      },
      {
        category: GoogleAIClient.SAFETY_CATEGORIES.HARM_CATEGORY_HATE_SPEECH,
        threshold: GoogleAIClient.SAFETY_THRESHOLDS.BLOCK_ONLY_HIGH,
      },
      {
        category: GoogleAIClient.SAFETY_CATEGORIES.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: GoogleAIClient.SAFETY_THRESHOLDS.BLOCK_ONLY_HIGH,
      },
      {
        category: GoogleAIClient.SAFETY_CATEGORIES.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: GoogleAIClient.SAFETY_THRESHOLDS.BLOCK_ONLY_HIGH,
      },
    ];
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Format message history for Gemini
   */
  static formatMessageHistory(
    history: Array<{ role: string; content: string }>
  ): GeminiMessage[] {
    return history
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));
  }

  /**
   * Extract text from response
   */
  static extractText(response: GeminiChatResponse): string {
    return (
      response.candidates?.[0]?.content?.parts
        ?.filter(part => part.text)
        .map(part => part.text)
        .join('') || ''
    );
  }

  /**
   * Extract function calls from response
   */
  static extractFunctionCalls(response: GeminiChatResponse): Array<{
    name: string;
    args: Record<string, any>;
  }> {
    const parts = response.candidates?.[0]?.content?.parts || [];
    return parts
      .filter(part => part.functionCall)
      .map(part => ({
        name: part.functionCall!.name,
        args: part.functionCall!.args,
      }));
  }

  /**
   * Create a function response part
   */
  static createFunctionResponse(
    name: string,
    response: Record<string, any>
  ): GeminiPart {
    return {
      functionResponse: {
        name,
        response,
      },
    };
  }
}
