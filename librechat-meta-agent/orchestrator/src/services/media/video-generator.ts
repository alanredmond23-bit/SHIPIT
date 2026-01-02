import { Logger } from 'pino';

/**
 * Multi-Provider Video Generation Service
 *
 * Supports:
 * - Runway Gen-3 Alpha (high quality cinematic video)
 * - Replicate (various video models)
 * - Pika Labs (via API)
 * - Luma AI (Dream Machine)
 */

// ============================================================================
// Types
// ============================================================================

export interface VideoGenerationRequest {
  prompt: string;
  provider: 'runway' | 'replicate' | 'pika' | 'luma';
  model?: string;
  duration?: number; // seconds
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3';
  fps?: number;
  seed?: number;
  imageUrl?: string; // For image-to-video
  videoUrl?: string; // For video-to-video
  motion?: number; // Motion intensity (0-1)
  quality?: 'draft' | 'standard' | 'high';
  watermark?: boolean;
}

export interface GeneratedVideo {
  id: string;
  url: string;
  thumbnailUrl?: string;
  prompt: string;
  provider: string;
  model: string;
  duration: number;
  aspectRatio: string;
  fps: number;
  seed?: number;
  metadata?: {
    generationTime: number;
    cost?: number;
    status?: string;
    [key: string]: any;
  };
  createdAt: Date;
}

export interface VideoProvider {
  generate(request: VideoGenerationRequest): Promise<GeneratedVideo>;
  getStatus(videoId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress?: number;
    url?: string;
    error?: string;
  }>;
  healthCheck(): Promise<boolean>;
  getName(): string;
  getCapabilities(): string[];
}

// ============================================================================
// Runway Gen-3 Provider
// ============================================================================

export class RunwayProvider implements VideoProvider {
  private apiKey: string;
  private logger: Logger;
  private baseUrl = 'https://api.runwayml.com/v1';

  constructor(apiKey: string, logger: Logger) {
    this.apiKey = apiKey;
    this.logger = logger.child({ provider: 'runway' });
  }

  getName(): string {
    return 'runway';
  }

  getCapabilities(): string[] {
    return ['text-to-video', 'image-to-video', 'extend-video', 'high-quality'];
  }

  async generate(request: VideoGenerationRequest): Promise<GeneratedVideo> {
    const startTime = Date.now();

    try {
      this.logger.info({
        prompt: request.prompt.substring(0, 100),
        duration: request.duration,
        aspectRatio: request.aspectRatio,
      }, 'Generating video with Runway');

      // Create generation task
      const response = await fetch(`${this.baseUrl}/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: request.model || 'gen3a_turbo',
          prompt: request.prompt,
          duration: request.duration || 5,
          ratio: request.aspectRatio || '16:9',
          image: request.imageUrl,
          seed: request.seed,
          watermark: request.watermark !== false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Runway API error: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      const taskId = data.id;

      // Poll for completion
      const result = await this.pollForCompletion(taskId);

      const generationTime = Date.now() - startTime;

      this.logger.info({
        taskId,
        generationTime,
      }, 'Video generated successfully');

      return {
        id: taskId,
        url: result.output[0],
        prompt: request.prompt,
        provider: 'runway',
        model: request.model || 'gen3a_turbo',
        duration: request.duration || 5,
        aspectRatio: request.aspectRatio || '16:9',
        fps: 24,
        seed: request.seed,
        metadata: {
          generationTime,
          cost: this.calculateCost(request.duration || 5),
        },
        createdAt: new Date(),
      };
    } catch (error: any) {
      this.logger.error({ error: error.message }, 'Runway video generation failed');
      throw new Error(`Runway error: ${error.message}`);
    }
  }

  async getStatus(videoId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks/${videoId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get status: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        status: this.mapStatus(data.status),
        progress: data.progress,
        url: data.output?.[0],
        error: data.failure,
      };
    } catch (error: any) {
      this.logger.error({ error: error.message }, 'Failed to get video status');
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/account`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async pollForCompletion(taskId: string, maxWait = 300000): Promise<any> {
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds

    while (Date.now() - startTime < maxWait) {
      const status = await this.getStatus(taskId);

      if (status.status === 'completed') {
        return status;
      }

      if (status.status === 'failed') {
        throw new Error(`Video generation failed: ${status.error}`);
      }

      this.logger.debug({ taskId, progress: status.progress }, 'Video generation in progress');
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Video generation timed out');
  }

  private mapStatus(status: string): 'pending' | 'processing' | 'completed' | 'failed' {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'succeeded':
        return 'completed';
      case 'failed':
      case 'error':
        return 'failed';
      case 'running':
      case 'processing':
        return 'processing';
      default:
        return 'pending';
    }
  }

  private calculateCost(duration: number): number {
    // Runway Gen-3 pricing: ~$0.05 per second
    return duration * 0.05;
  }
}

// ============================================================================
// Replicate Provider
// ============================================================================

export class ReplicateVideoProvider implements VideoProvider {
  private apiKey: string;
  private logger: Logger;
  private baseUrl = 'https://api.replicate.com/v1';

  constructor(apiKey: string, logger: Logger) {
    this.apiKey = apiKey;
    this.logger = logger.child({ provider: 'replicate-video' });
  }

  getName(): string {
    return 'replicate';
  }

  getCapabilities(): string[] {
    return ['text-to-video', 'image-to-video', 'various-models'];
  }

  async generate(request: VideoGenerationRequest): Promise<GeneratedVideo> {
    const startTime = Date.now();

    try {
      // Select model based on request
      const model = request.model || this.selectDefaultModel(request);

      this.logger.info({
        model,
        prompt: request.prompt.substring(0, 100),
      }, 'Generating video with Replicate');

      // Create prediction
      const response = await fetch(`${this.baseUrl}/predictions`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: this.getModelVersion(model),
          input: {
            prompt: request.prompt,
            num_frames: (request.duration || 3) * (request.fps || 8),
            num_inference_steps: request.quality === 'high' ? 50 : 25,
            image: request.imageUrl,
            seed: request.seed,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Replicate API error: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      const predictionId = data.id;

      // Poll for completion
      const result = await this.pollForCompletion(predictionId);

      const generationTime = Date.now() - startTime;

      this.logger.info({
        predictionId,
        generationTime,
      }, 'Video generated successfully');

      return {
        id: predictionId,
        url: Array.isArray(result.output) ? result.output[0] : result.output,
        prompt: request.prompt,
        provider: 'replicate',
        model,
        duration: request.duration || 3,
        aspectRatio: request.aspectRatio || '16:9',
        fps: request.fps || 8,
        seed: request.seed,
        metadata: {
          generationTime,
        },
        createdAt: new Date(),
      };
    } catch (error: any) {
      this.logger.error({ error: error.message }, 'Replicate video generation failed');
      throw new Error(`Replicate error: ${error.message}`);
    }
  }

  async getStatus(videoId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/predictions/${videoId}`, {
        headers: {
          'Authorization': `Token ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get status: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        status: this.mapStatus(data.status),
        url: Array.isArray(data.output) ? data.output[0] : data.output,
        error: data.error,
      };
    } catch (error: any) {
      this.logger.error({ error: error.message }, 'Failed to get video status');
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Token ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async pollForCompletion(predictionId: string, maxWait = 300000): Promise<any> {
    const startTime = Date.now();
    const pollInterval = 1000;

    while (Date.now() - startTime < maxWait) {
      const status = await this.getStatus(predictionId);

      if (status.status === 'completed') {
        return status;
      }

      if (status.status === 'failed') {
        throw new Error(`Video generation failed: ${status.error}`);
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Video generation timed out');
  }

  private selectDefaultModel(request: VideoGenerationRequest): string {
    if (request.imageUrl) {
      return 'stable-video-diffusion';
    }
    return 'zeroscope-v2-xl';
  }

  private getModelVersion(model: string): string {
    // Map model names to Replicate version hashes
    const versions: Record<string, string> = {
      'stable-video-diffusion': '3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438',
      'zeroscope-v2-xl': '9f747673945c62801b13b84701c783929c0ee784e4748ec062204894dda1a351',
      'text2video-zero': 'devi/text2video-zero',
    };

    return versions[model] || versions['zeroscope-v2-xl'];
  }

  private mapStatus(status: string): 'pending' | 'processing' | 'completed' | 'failed' {
    switch (status?.toLowerCase()) {
      case 'succeeded':
        return 'completed';
      case 'failed':
      case 'canceled':
        return 'failed';
      case 'processing':
        return 'processing';
      default:
        return 'pending';
    }
  }
}

// ============================================================================
// Luma AI Provider
// ============================================================================

export class LumaProvider implements VideoProvider {
  private apiKey: string;
  private logger: Logger;
  private baseUrl = 'https://api.lumalabs.ai/dream-machine/v1';

  constructor(apiKey: string, logger: Logger) {
    this.apiKey = apiKey;
    this.logger = logger.child({ provider: 'luma' });
  }

  getName(): string {
    return 'luma';
  }

  getCapabilities(): string[] {
    return ['text-to-video', 'image-to-video', 'extend-video', 'camera-motion'];
  }

  async generate(request: VideoGenerationRequest): Promise<GeneratedVideo> {
    const startTime = Date.now();

    try {
      this.logger.info({
        prompt: request.prompt.substring(0, 100),
      }, 'Generating video with Luma AI');

      const response = await fetch(`${this.baseUrl}/generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: request.prompt,
          keyframes: request.imageUrl ? {
            frame0: { type: 'image', url: request.imageUrl },
          } : undefined,
          aspect_ratio: request.aspectRatio || '16:9',
          loop: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Luma API error: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      const generationId = data.id;

      // Poll for completion
      const result = await this.pollForCompletion(generationId);

      const generationTime = Date.now() - startTime;

      this.logger.info({
        generationId,
        generationTime,
      }, 'Video generated successfully');

      return {
        id: generationId,
        url: result.video.url,
        thumbnailUrl: result.video.thumbnail,
        prompt: request.prompt,
        provider: 'luma',
        model: 'dream-machine-v1',
        duration: 5, // Luma generates ~5 second videos
        aspectRatio: request.aspectRatio || '16:9',
        fps: 24,
        metadata: {
          generationTime,
        },
        createdAt: new Date(),
      };
    } catch (error: any) {
      this.logger.error({ error: error.message }, 'Luma video generation failed');
      throw new Error(`Luma error: ${error.message}`);
    }
  }

  async getStatus(videoId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/generations/${videoId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get status: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        status: this.mapStatus(data.state),
        url: data.video?.url,
        error: data.failure_reason,
      };
    } catch (error: any) {
      this.logger.error({ error: error.message }, 'Failed to get video status');
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Luma doesn't have a dedicated health endpoint, try a credits check
      const response = await fetch(`${this.baseUrl}/credits`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async pollForCompletion(generationId: string, maxWait = 300000): Promise<any> {
    const startTime = Date.now();
    const pollInterval = 2000;

    while (Date.now() - startTime < maxWait) {
      const status = await this.getStatus(generationId);

      if (status.status === 'completed') {
        return status;
      }

      if (status.status === 'failed') {
        throw new Error(`Video generation failed: ${status.error}`);
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Video generation timed out');
  }

  private mapStatus(state: string): 'pending' | 'processing' | 'completed' | 'failed' {
    switch (state?.toLowerCase()) {
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      case 'processing':
      case 'queued':
        return 'processing';
      default:
        return 'pending';
    }
  }
}

// ============================================================================
// Video Generation Engine
// ============================================================================

export interface VideoGenerationConfig {
  runway?: { apiKey: string; enabled: boolean };
  replicate?: { apiKey: string; enabled: boolean };
  luma?: { apiKey: string; enabled: boolean };
  defaultProvider?: 'runway' | 'replicate' | 'luma';
}

export class VideoGenerationEngine {
  private providers: Map<string, VideoProvider> = new Map();
  private logger: Logger;
  private defaultProvider: string;

  constructor(logger: Logger, config: VideoGenerationConfig) {
    this.logger = logger.child({ service: 'video-generation' });
    this.defaultProvider = config.defaultProvider || 'runway';

    this.initializeProviders(config);

    this.logger.info(
      { providers: Array.from(this.providers.keys()) },
      'Video generation engine initialized'
    );
  }

  private initializeProviders(config: VideoGenerationConfig): void {
    if (config.runway?.enabled && config.runway.apiKey) {
      this.providers.set('runway', new RunwayProvider(config.runway.apiKey, this.logger));
    }

    if (config.replicate?.enabled && config.replicate.apiKey) {
      this.providers.set('replicate', new ReplicateVideoProvider(config.replicate.apiKey, this.logger));
    }

    if (config.luma?.enabled && config.luma.apiKey) {
      this.providers.set('luma', new LumaProvider(config.luma.apiKey, this.logger));
    }

    if (this.providers.size === 0) {
      this.logger.warn('No video generation providers enabled');
    }
  }

  async generate(request: VideoGenerationRequest): Promise<GeneratedVideo> {
    const provider = this.providers.get(request.provider || this.defaultProvider);

    if (!provider) {
      throw new Error(`Video provider '${request.provider || this.defaultProvider}' not available`);
    }

    return provider.generate(request);
  }

  async getStatus(videoId: string, provider: string): Promise<any> {
    const videoProvider = this.providers.get(provider);

    if (!videoProvider) {
      throw new Error(`Video provider '${provider}' not available`);
    }

    return videoProvider.getStatus(videoId);
  }

  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name, provider] of this.providers) {
      try {
        results[name] = await provider.healthCheck();
      } catch {
        results[name] = false;
      }
    }

    return results;
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  getProviderCapabilities(providerName: string): string[] {
    const provider = this.providers.get(providerName);
    return provider ? provider.getCapabilities() : [];
  }
}
