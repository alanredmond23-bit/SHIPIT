import { Logger } from 'pino';
import {
  TTSProviderFactory,
  ITTSProvider,
  TTSResult,
  TTSOptions,
  VoiceInfo,
  OpenAITTSProvider,
  ElevenLabsTTSProvider,
  PlayHTTTSProvider,
} from './tts-providers';

/**
 * TTS Service Configuration
 */
export interface TTSServiceConfig {
  defaultProvider: 'openai' | 'elevenlabs' | 'playht';
  defaultVoice: string;
  providers: {
    openai?: { apiKey: string };
    elevenlabs?: { apiKey: string };
    playht?: { apiKey: string; userId: string };
  };
  fallbackEnabled?: boolean;
  retryAttempts?: number;
  costTracking?: boolean;
  cacheEnabled?: boolean;
  cacheTTLSeconds?: number;
}

/**
 * TTS Request Options
 */
export interface TTSRequestOptions extends TTSOptions {
  provider?: 'openai' | 'elevenlabs' | 'playht';
  voice?: string;
  cacheKey?: string;
}

/**
 * TTS Cost Estimate
 */
export interface TTSCostEstimate {
  characterCount: number;
  provider: string;
  estimatedCost: number;
  currency: string;
}

/**
 * Cached audio entry
 */
interface CacheEntry {
  audio: Buffer;
  timestamp: number;
  format: string;
}

/**
 * TTS Service - Unified Text-to-Speech Interface
 * Wraps multiple TTS providers with fallback, retry, caching, and cost tracking
 */
export class TTSService {
  private factory: TTSProviderFactory;
  private defaultProvider: string;
  private defaultVoice: string;
  private fallbackEnabled: boolean;
  private retryAttempts: number;
  private costTracking: boolean;
  private cacheEnabled: boolean;
  private cacheTTL: number;
  private cache: Map<string, CacheEntry> = new Map();

  // Cost per 1000 characters by provider (approximate USD)
  private static readonly COST_PER_1K_CHARS: Record<string, number> = {
    openai: 0.015, // tts-1-hd
    elevenlabs: 0.18, // turbo model
    playht: 0.05,
  };

  constructor(
    private logger: Logger,
    private config: TTSServiceConfig
  ) {
    this.factory = new TTSProviderFactory(logger, {
      openai: config.providers.openai,
      elevenlabs: config.providers.elevenlabs,
      playht: config.providers.playht,
    });

    this.defaultProvider = config.defaultProvider;
    this.defaultVoice = config.defaultVoice;
    this.fallbackEnabled = config.fallbackEnabled ?? true;
    this.retryAttempts = config.retryAttempts ?? 2;
    this.costTracking = config.costTracking ?? true;
    this.cacheEnabled = config.cacheEnabled ?? false;
    this.cacheTTL = (config.cacheTTLSeconds ?? 3600) * 1000; // Convert to ms

    // Cleanup expired cache entries periodically
    if (this.cacheEnabled) {
      setInterval(() => this.cleanupCache(), 60000); // Every minute
    }
  }

  /**
   * Synthesize text to speech
   */
  async synthesize(
    text: string,
    options: TTSRequestOptions = {}
  ): Promise<TTSResult> {
    const provider = options.provider || this.defaultProvider;
    const voice = options.voice || this.defaultVoice;
    const providers = this.getProviderOrder(provider);

    // Check cache first
    if (this.cacheEnabled) {
      const cacheKey = options.cacheKey || this.generateCacheKey(text, provider, voice, options);
      const cached = this.cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        this.logger.debug({ cacheKey }, 'TTS cache hit');
        return {
          audio: cached.audio,
          duration: 0, // Unknown for cached
          format: cached.format,
        };
      }
    }

    let lastError: Error | null = null;

    for (const providerName of providers) {
      for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
        try {
          const startTime = Date.now();
          const providerInstance = this.factory.getProvider(providerName);
          const providerVoice = this.getVoiceForProvider(voice, providerName);

          const result = await providerInstance.synthesize(text, providerVoice, {
            speed: options.speed,
            pitch: options.pitch,
            stability: options.stability,
            similarity_boost: options.similarity_boost,
            style: options.style,
            use_speaker_boost: options.use_speaker_boost,
            output_format: options.output_format,
          });

          const processingTime = Date.now() - startTime;

          this.logger.info({
            provider: providerName,
            voice: providerVoice,
            attempt: attempt + 1,
            processingTime,
            textLength: text.length,
            audioSize: result.audio.length,
          }, 'TTS synthesis successful');

          // Track cost if enabled
          if (this.costTracking) {
            const cost = this.calculateCost(text.length, providerName);
            this.logger.debug({
              provider: providerName,
              characterCount: text.length,
              estimatedCost: cost,
            }, 'TTS cost tracked');
          }

          // Cache result if enabled
          if (this.cacheEnabled) {
            const cacheKey = options.cacheKey || this.generateCacheKey(text, provider, voice, options);
            this.cache.set(cacheKey, {
              audio: result.audio,
              timestamp: Date.now(),
              format: result.format,
            });
          }

          return result;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          this.logger.warn({
            provider: providerName,
            attempt: attempt + 1,
            error: lastError.message,
          }, 'TTS synthesis failed, will retry');

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
      `TTS synthesis failed after all attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Synthesize with streaming (returns audio buffer progressively)
   */
  async *synthesizeStream(
    text: string,
    options: TTSRequestOptions = {}
  ): AsyncGenerator<Buffer> {
    // For now, just yield the full buffer
    // Real streaming would use chunked transfer
    const result = await this.synthesize(text, options);
    yield result.audio;
  }

  /**
   * Get available voices for a provider
   */
  async getVoices(provider?: string): Promise<VoiceInfo[]> {
    const providerName = provider || this.defaultProvider;

    try {
      const providerInstance = this.factory.getProvider(providerName);
      return await providerInstance.getVoices();
    } catch (error) {
      this.logger.error({ provider: providerName, error }, 'Failed to get voices');
      return [];
    }
  }

  /**
   * Get all available voices from all providers
   */
  async getAllVoices(): Promise<Record<string, VoiceInfo[]>> {
    const result: Record<string, VoiceInfo[]> = {};

    for (const providerName of this.factory.getAvailableProviders()) {
      try {
        const providerInstance = this.factory.getProvider(providerName);
        result[providerName] = await providerInstance.getVoices();
      } catch (error) {
        this.logger.error({ provider: providerName, error }, 'Failed to get voices');
        result[providerName] = [];
      }
    }

    return result;
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
   * Estimate cost for synthesis
   */
  estimateCost(text: string, provider?: string): TTSCostEstimate {
    const providerName = provider || this.defaultProvider;
    const cost = this.calculateCost(text.length, providerName);

    return {
      characterCount: text.length,
      provider: providerName,
      estimatedCost: cost,
      currency: 'USD',
    };
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.info('TTS cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: number } {
    let size = 0;
    for (const entry of this.cache.values()) {
      size += entry.audio.length;
    }
    return {
      size,
      entries: this.cache.size,
    };
  }

  /**
   * Calculate cost for synthesis
   */
  private calculateCost(characterCount: number, provider: string): number {
    const costPer1K = TTSService.COST_PER_1K_CHARS[provider] || 0.05;
    return Math.round((characterCount / 1000) * costPer1K * 10000) / 10000;
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
   * Map voice name to provider-specific voice
   */
  private getVoiceForProvider(voice: string, provider: string): string {
    // Default voice mappings between providers
    const voiceMappings: Record<string, Record<string, string>> = {
      alloy: { openai: 'alloy', elevenlabs: 'Rachel', playht: 'jennifer' },
      echo: { openai: 'echo', elevenlabs: 'Domi', playht: 'michael' },
      fable: { openai: 'fable', elevenlabs: 'Bella', playht: 'christopher' },
      onyx: { openai: 'onyx', elevenlabs: 'Antoni', playht: 'james' },
      nova: { openai: 'nova', elevenlabs: 'Elli', playht: 'sophia' },
      shimmer: { openai: 'shimmer', elevenlabs: 'Premade/Alice', playht: 'emma' },
    };

    // If voice is already provider-specific, use it
    if (voice.includes('/') || voice.length > 20) {
      return voice;
    }

    // Try to map the voice
    const mapping = voiceMappings[voice.toLowerCase()];
    if (mapping && mapping[provider]) {
      return mapping[provider];
    }

    // Return as-is if no mapping found
    return voice;
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(
    text: string,
    provider: string,
    voice: string,
    options: TTSRequestOptions
  ): string {
    const optionsStr = JSON.stringify({
      speed: options.speed,
      pitch: options.pitch,
      output_format: options.output_format,
    });
    return `${provider}:${voice}:${options.speed || 1}:${text.slice(0, 100)}:${this.hashString(text)}:${this.hashString(optionsStr)}`;
  }

  /**
   * Simple string hash
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Cleanup expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.cacheTTL) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug({ cleaned }, 'TTS cache cleanup completed');
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create TTS Service from environment
 */
export function createTTSService(logger: Logger): TTSService {
  const config: TTSServiceConfig = {
    defaultProvider: (process.env.TTS_DEFAULT_PROVIDER as any) || 'openai',
    defaultVoice: process.env.TTS_DEFAULT_VOICE || 'alloy',
    providers: {
      openai: process.env.OPENAI_API_KEY
        ? { apiKey: process.env.OPENAI_API_KEY }
        : undefined,
      elevenlabs: process.env.ELEVENLABS_API_KEY
        ? { apiKey: process.env.ELEVENLABS_API_KEY }
        : undefined,
      playht: process.env.PLAYHT_API_KEY && process.env.PLAYHT_USER_ID
        ? { apiKey: process.env.PLAYHT_API_KEY, userId: process.env.PLAYHT_USER_ID }
        : undefined,
    },
    fallbackEnabled: process.env.TTS_FALLBACK_ENABLED !== 'false',
    retryAttempts: parseInt(process.env.TTS_RETRY_ATTEMPTS || '2', 10),
    costTracking: process.env.TTS_COST_TRACKING !== 'false',
    cacheEnabled: process.env.TTS_CACHE_ENABLED === 'true',
    cacheTTLSeconds: parseInt(process.env.TTS_CACHE_TTL_SECONDS || '3600', 10),
  };

  return new TTSService(logger, config);
}

export default TTSService;
