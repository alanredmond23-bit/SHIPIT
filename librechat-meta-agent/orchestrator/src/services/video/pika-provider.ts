import { Logger } from 'pino';
import { v4 as uuidv4 } from 'uuid';
import {
  VideoProvider,
  PikaConfig,
  VideoGenerationRequest,
  ImageToVideoRequest,
  VideoExtendRequest,
  VideoInterpolateRequest,
  GeneratedVideo,
} from './types';

interface PikaGenerationResponse {
  job_id: string;
  status: string;
  progress: number;
  result_url?: string;
  thumbnail_url?: string;
  error?: string;
}

/**
 * Pika Labs Video Generation Provider
 * Supports text-to-video with unique style presets
 */
export class PikaProvider implements VideoProvider {
  private config: PikaConfig;
  private logger: Logger;
  private baseUrl: string;

  // Pika-specific style presets
  private stylePresets = {
    anime: 'anime style, vibrant colors',
    cinematic: 'cinematic, professional lighting, film grain',
    cartoon: '3D cartoon style, Pixar-like',
    realistic: 'photorealistic, ultra detailed',
    sketch: 'pencil sketch, hand-drawn',
    cyberpunk: 'cyberpunk, neon lights, futuristic',
  };

  constructor(config: PikaConfig, logger: Logger) {
    this.config = config;
    this.logger = logger.child({ provider: 'pika' });
    this.baseUrl = config.baseUrl || 'https://api.pika.art/v1';

    if (!config.apiKey) {
      throw new Error('Pika API key is required');
    }
  }

  /**
   * Generate video from text prompt
   */
  async generateFromText(request: VideoGenerationRequest): Promise<GeneratedVideo> {
    this.logger.info({ request }, 'Generating video from text with Pika');

    try {
      // Apply style preset if specified
      let enhancedPrompt = request.prompt;
      if (request.style && this.stylePresets[request.style as keyof typeof this.stylePresets]) {
        enhancedPrompt = `${request.prompt}, ${this.stylePresets[request.style as keyof typeof this.stylePresets]}`;
      }

      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          negative_prompt: request.negativePrompt || 'blurry, distorted, low quality',
          duration: request.duration,
          aspect_ratio: request.aspectRatio,
          motion_strength: this.mapMotionToStrength(request.motion || 'medium'),
          seed: request.seed,
          fps: request.fps || 24,
          options: {
            camera_motion: request.metadata?.cameraMotion,
            loop: request.metadata?.loop || false,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Pika API error: ${error}`);
      }

      const data: PikaGenerationResponse = await response.json();

      const video: GeneratedVideo = {
        id: data.job_id,
        url: '',
        thumbnailUrl: '',
        prompt: request.prompt,
        provider: 'pika',
        duration: request.duration,
        aspectRatio: request.aspectRatio,
        status: 'processing',
        progress: 0,
        fps: request.fps || 24,
        motion: request.motion,
        style: request.style,
        seed: request.seed,
        metadata: {
          enhancedPrompt,
        },
        createdAt: new Date(),
      };

      // Start polling for completion
      this.pollForCompletion(data.job_id, video);

      return video;
    } catch (error: any) {
      this.logger.error({ error }, 'Failed to generate video from text');
      throw error;
    }
  }

  /**
   * Generate video from image
   */
  async generateFromImage(request: ImageToVideoRequest): Promise<GeneratedVideo> {
    this.logger.info({ request }, 'Generating video from image with Pika');

    try {
      const response = await fetch(`${this.baseUrl}/animate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: request.imageUrl,
          prompt: request.prompt,
          duration: request.duration,
          motion_strength: this.mapMotionToStrength(request.motion),
          seed: request.seed,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Pika API error: ${error}`);
      }

      const data: PikaGenerationResponse = await response.json();

      const video: GeneratedVideo = {
        id: data.job_id,
        url: '',
        thumbnailUrl: '',
        prompt: request.prompt,
        provider: 'pika',
        duration: request.duration,
        aspectRatio: '16:9',
        status: 'processing',
        progress: 0,
        motion: request.motion,
        sourceImageUrl: request.imageUrl,
        createdAt: new Date(),
      };

      this.pollForCompletion(data.job_id, video);

      return video;
    } catch (error: any) {
      this.logger.error({ error }, 'Failed to generate video from image');
      throw error;
    }
  }

  /**
   * Extend existing video (Pika supports this via "continue" feature)
   */
  async extendVideo(request: VideoExtendRequest): Promise<GeneratedVideo> {
    this.logger.info({ request }, 'Extending video with Pika');

    try {
      const response = await fetch(`${this.baseUrl}/extend`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_url: request.videoUrl,
          prompt: request.prompt,
          extend_seconds: request.extendBy,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Pika API error: ${error}`);
      }

      const data: PikaGenerationResponse = await response.json();

      const video: GeneratedVideo = {
        id: data.job_id,
        url: '',
        thumbnailUrl: '',
        prompt: request.prompt,
        provider: 'pika',
        duration: request.extendBy,
        aspectRatio: '16:9',
        status: 'processing',
        progress: 0,
        sourceVideoUrl: request.videoUrl,
        createdAt: new Date(),
      };

      this.pollForCompletion(data.job_id, video);

      return video;
    } catch (error: any) {
      this.logger.error({ error }, 'Failed to extend video');
      throw error;
    }
  }

  /**
   * Interpolate between images (not directly supported by Pika)
   */
  async interpolate(request: VideoInterpolateRequest): Promise<GeneratedVideo> {
    throw new Error('Interpolation is not supported by Pika provider');
  }

  /**
   * Get generation status
   */
  async getStatus(videoId: string): Promise<GeneratedVideo> {
    try {
      const response = await fetch(`${this.baseUrl}/jobs/${videoId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get status: ${response.statusText}`);
      }

      const data: PikaGenerationResponse = await response.json();

      const status = this.mapPikaStatus(data.status);
      const video: GeneratedVideo = {
        id: videoId,
        url: data.result_url || '',
        thumbnailUrl: data.thumbnail_url || '',
        prompt: '',
        provider: 'pika',
        duration: 0,
        aspectRatio: '16:9',
        status,
        progress: data.progress || 0,
        errorMessage: data.error,
        createdAt: new Date(),
        completedAt: status === 'completed' ? new Date() : undefined,
      };

      return video;
    } catch (error: any) {
      this.logger.error({ error, videoId }, 'Failed to get status');
      throw error;
    }
  }

  /**
   * Cancel ongoing generation
   */
  async cancelGeneration(videoId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/jobs/${videoId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      return response.ok;
    } catch (error: any) {
      this.logger.error({ error, videoId }, 'Failed to cancel generation');
      return false;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      return response.ok;
    } catch (error) {
      this.logger.error({ error }, 'Health check failed');
      return false;
    }
  }

  getName(): string {
    return 'pika';
  }

  getSupportedDurations(): number[] {
    return [4, 8];
  }

  getSupportedAspectRatios(): string[] {
    return ['16:9', '9:16', '1:1'];
  }

  getCapabilities(): string[] {
    return [
      'text-to-video',
      'image-to-video',
      'video-extension',
      'style-presets',
      'camera-motion',
      'loop-video',
    ];
  }

  // Private helpers

  private mapMotionToStrength(motion: string): number {
    switch (motion) {
      case 'slow':
        return 0.3;
      case 'medium':
        return 0.6;
      case 'fast':
        return 0.9;
      default:
        return 0.6;
    }
  }

  private async pollForCompletion(id: string, video: GeneratedVideo): Promise<void> {
    const maxAttempts = 120; // 10 minutes max
    let attempts = 0;

    const poll = async () => {
      try {
        const status = await this.getStatus(id);

        if (status.status === 'completed' || status.status === 'failed') {
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          this.logger.warn({ id }, 'Polling timeout reached');
        }
      } catch (error) {
        this.logger.error({ error, id }, 'Polling error');
      }
    };

    setTimeout(poll, 5000);
  }

  private mapPikaStatus(pikaStatus: string): 'queued' | 'processing' | 'completed' | 'failed' {
    switch (pikaStatus.toLowerCase()) {
      case 'pending':
      case 'queued':
      case 'waiting':
        return 'queued';
      case 'processing':
      case 'running':
      case 'generating':
        return 'processing';
      case 'completed':
      case 'success':
      case 'finished':
        return 'completed';
      case 'failed':
      case 'error':
        return 'failed';
      default:
        return 'processing';
    }
  }
}
