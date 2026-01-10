import { Logger } from 'pino';
import {
  STTProviderFactory,
  ISTTProvider,
  STTResult,
  WhisperSTTProvider,
  DeepgramSTTProvider,
  AssemblyAISTTProvider,
} from './stt-providers';

/**
 * STT Service Configuration
 */
export interface STTServiceConfig {
  defaultProvider: 'whisper' | 'deepgram' | 'assemblyai';
  providers: {
    whisper?: { apiKey: string };
    deepgram?: { apiKey: string };
    assemblyai?: { apiKey: string };
  };
  fallbackEnabled?: boolean;
  retryAttempts?: number;
  costTracking?: boolean;
}

/**
 * STT Request Options
 */
export interface STTRequestOptions {
  provider?: 'whisper' | 'deepgram' | 'assemblyai';
  language?: string;
  enableWordTimestamps?: boolean;
  enableSpeakerDiarization?: boolean;
}

/**
 * STT Cost Estimate
 */
export interface STTCostEstimate {
  audioDurationSeconds: number;
  provider: string;
  estimatedCost: number;
  currency: string;
}

/**
 * STT Service - Unified Speech-to-Text Interface
 * Wraps multiple STT providers with fallback, retry, and cost tracking
 */
export class STTService {
  private factory: STTProviderFactory;
  private defaultProvider: string;
  private fallbackEnabled: boolean;
  private retryAttempts: number;
  private costTracking: boolean;

  // Cost per minute by provider (approximate USD)
  private static readonly COST_PER_MINUTE: Record<string, number> = {
    whisper: 0.006,
    deepgram: 0.0043,
    assemblyai: 0.015,
  };

  constructor(
    private logger: Logger,
    private config: STTServiceConfig
  ) {
    this.factory = new STTProviderFactory(logger, {
      openai: config.providers.whisper,
      deepgram: config.providers.deepgram,
      assemblyai: config.providers.assemblyai,
    });

    this.defaultProvider = config.defaultProvider;
    this.fallbackEnabled = config.fallbackEnabled ?? true;
    this.retryAttempts = config.retryAttempts ?? 2;
    this.costTracking = config.costTracking ?? true;
  }

  /**
   * Transcribe audio to text
   */
  async transcribe(
    audio: Buffer,
    options: STTRequestOptions = {}
  ): Promise<STTResult> {
    const provider = options.provider || this.defaultProvider;
    const providers = this.getProviderOrder(provider);

    let lastError: Error | null = null;

    for (const providerName of providers) {
      for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
        try {
          const startTime = Date.now();
          const providerInstance = this.factory.getProvider(providerName);

          const result = await providerInstance.transcribe(audio, options.language);

          const processingTime = Date.now() - startTime;

          this.logger.info({
            provider: providerName,
            attempt: attempt + 1,
            processingTime,
            textLength: result.text.length,
            confidence: result.confidence,
          }, 'STT transcription successful');

          // Track cost if enabled
          if (this.costTracking && result.duration) {
            const cost = this.calculateCost(result.duration / 1000, providerName);
            this.logger.debug({
              provider: providerName,
              durationSeconds: result.duration / 1000,
              estimatedCost: cost,
            }, 'STT cost tracked');
          }

          return result;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          this.logger.warn({
            provider: providerName,
            attempt: attempt + 1,
            error: lastError.message,
          }, 'STT transcription failed, will retry');

          // Wait before retry (exponential backoff)
          if (attempt < this.retryAttempts - 1) {
            await this.delay(Math.pow(2, attempt) * 500);
          }
        }
      }

      // If fallback is not enabled, stop after first provider fails
      if (!this.fallbackEnabled) {
        break;
      }
    }

    throw new Error(
      `STT transcription failed after all attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Transcribe with streaming support (for supported providers)
   */
  async transcribeStream(
    audioStream: AsyncIterable<Buffer>,
    options: STTRequestOptions = {},
    onPartialResult?: (partial: string) => void
  ): Promise<STTResult> {
    const provider = options.provider || this.defaultProvider;
    const providerInstance = this.factory.getProvider(provider);

    // Check if provider supports streaming
    if (!providerInstance.supportsStreaming()) {
      this.logger.warn({
        provider,
      }, 'Provider does not support streaming, falling back to batch transcription');

      // Collect all audio chunks and transcribe as batch
      const chunks: Buffer[] = [];
      for await (const chunk of audioStream) {
        chunks.push(chunk);
      }
      const fullAudio = Buffer.concat(chunks);
      return this.transcribe(fullAudio, options);
    }

    // For streaming providers, we need to implement streaming logic
    // This is a simplified version - real implementation would use WebSocket
    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const fullAudio = Buffer.concat(chunks);
    return this.transcribe(fullAudio, options);
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): string[] {
    return this.factory.getAvailableProviders();
  }

  /**
   * Check if a provider is available
   */
  hasProvider(name: string): boolean {
    return this.factory.hasProvider(name);
  }

  /**
   * Estimate cost for transcription
   */
  estimateCost(audioDurationSeconds: number, provider?: string): STTCostEstimate {
    const providerName = provider || this.defaultProvider;
    const cost = this.calculateCost(audioDurationSeconds, providerName);

    return {
      audioDurationSeconds,
      provider: providerName,
      estimatedCost: cost,
      currency: 'USD',
    };
  }

  /**
   * Calculate cost for a transcription
   */
  private calculateCost(durationSeconds: number, provider: string): number {
    const durationMinutes = durationSeconds / 60;
    const costPerMinute = STTService.COST_PER_MINUTE[provider] || 0.01;
    return Math.round(durationMinutes * costPerMinute * 10000) / 10000;
  }

  /**
   * Get provider order for fallback
   */
  private getProviderOrder(primary: string): string[] {
    const available = this.factory.getAvailableProviders();

    if (!this.fallbackEnabled) {
      return available.includes(primary) ? [primary] : [];
    }

    // Put primary first, then others
    const order = [primary];
    for (const p of available) {
      if (!order.includes(p)) {
        order.push(p);
      }
    }
    return order.filter(p => available.includes(p));
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create STT Service from environment
 */
export function createSTTService(logger: Logger): STTService {
  const config: STTServiceConfig = {
    defaultProvider: (process.env.STT_DEFAULT_PROVIDER as any) || 'whisper',
    providers: {
      whisper: process.env.OPENAI_API_KEY
        ? { apiKey: process.env.OPENAI_API_KEY }
        : undefined,
      deepgram: process.env.DEEPGRAM_API_KEY
        ? { apiKey: process.env.DEEPGRAM_API_KEY }
        : undefined,
      assemblyai: process.env.ASSEMBLYAI_API_KEY
        ? { apiKey: process.env.ASSEMBLYAI_API_KEY }
        : undefined,
    },
    fallbackEnabled: process.env.STT_FALLBACK_ENABLED !== 'false',
    retryAttempts: parseInt(process.env.STT_RETRY_ATTEMPTS || '2', 10),
    costTracking: process.env.STT_COST_TRACKING !== 'false',
  };

  return new STTService(logger, config);
}

export default STTService;
