import { Logger } from 'pino';
import { v4 as uuidv4 } from 'uuid';
import {
  VideoProvider,
  RunwayConfig,
  VideoGenerationRequest,
  ImageToVideoRequest,
  VideoExtendRequest,
  VideoInterpolateRequest,
  GeneratedVideo,
} from './types';

interface RunwayGenerationResponse {
  id: string;
  status: string;
  progress: number;
  output?: string[];
  error?: string;
}

/**
 * Runway Gen-3 Alpha Video Generation Provider
 * Supports text-to-video and image-to-video
 */
export class RunwayProvider implements VideoProvider {
  private config: RunwayConfig;
  private logger: Logger;
  private baseUrl: string;

  constructor(config: RunwayConfig, logger: Logger) {
    this.config = config;
    this.logger = logger.child({ provider: 'runway' });
    this.baseUrl = config.baseUrl || 'https://api.runwayml.com/v1';

    if (!config.apiKey) {
      throw new Error('Runway API key is required');
    }
  }

  /**
   * Generate video from text prompt
   */
  async generateFromText(request: VideoGenerationRequest): Promise<GeneratedVideo> {
    this.logger.info({ request }, 'Generating video from text with Runway');

    try {
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model || 'gen3',
          prompt: request.prompt,
          duration: request.duration,
          aspect_ratio: request.aspectRatio,
          motion: request.motion || 'medium',
          style: request.style,
          seed: request.seed,
          fps: request.fps || 24,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Runway API error: ${error}`);
      }

      const data: RunwayGenerationResponse = await response.json();

      // Runway returns an ID that we need to poll for status
      const video: GeneratedVideo = {
        id: data.id,
        url: '',
        thumbnailUrl: '',
        prompt: request.prompt,
        provider: 'runway',
        model: this.config.model || 'gen3',
        duration: request.duration,
        aspectRatio: request.aspectRatio,
        status: 'processing',
        progress: 0,
        fps: request.fps || 24,
        motion: request.motion,
        style: request.style,
        seed: request.seed,
        createdAt: new Date(),
      };

      // Start polling for completion
      this.pollForCompletion(data.id, video);

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
    this.logger.info({ request }, 'Generating video from image with Runway');

    try {
      const response = await fetch(`${this.baseUrl}/image-to-video`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model || 'gen3',
          image_url: request.imageUrl,
          prompt: request.prompt,
          duration: request.duration,
          motion: request.motion,
          seed: request.seed,
          end_image_url: request.endImageUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Runway API error: ${error}`);
      }

      const data: RunwayGenerationResponse = await response.json();

      const video: GeneratedVideo = {
        id: data.id,
        url: '',
        thumbnailUrl: '',
        prompt: request.prompt,
        provider: 'runway',
        model: this.config.model || 'gen3',
        duration: request.duration,
        aspectRatio: '16:9', // Default
        status: 'processing',
        progress: 0,
        motion: request.motion,
        sourceImageUrl: request.imageUrl,
        createdAt: new Date(),
      };

      this.pollForCompletion(data.id, video);

      return video;
    } catch (error: any) {
      this.logger.error({ error }, 'Failed to generate video from image');
      throw error;
    }
  }

  /**
   * Extend existing video
   */
  async extendVideo(request: VideoExtendRequest): Promise<GeneratedVideo> {
    this.logger.info({ request }, 'Extending video with Runway');

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
          extend_by: request.extendBy,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Runway API error: ${error}`);
      }

      const data: RunwayGenerationResponse = await response.json();

      const video: GeneratedVideo = {
        id: data.id,
        url: '',
        thumbnailUrl: '',
        prompt: request.prompt,
        provider: 'runway',
        duration: request.extendBy,
        aspectRatio: '16:9',
        status: 'processing',
        progress: 0,
        sourceVideoUrl: request.videoUrl,
        createdAt: new Date(),
      };

      this.pollForCompletion(data.id, video);

      return video;
    } catch (error: any) {
      this.logger.error({ error }, 'Failed to extend video');
      throw error;
    }
  }

  /**
   * Interpolate between two images
   */
  async interpolate(request: VideoInterpolateRequest): Promise<GeneratedVideo> {
    this.logger.info({ request }, 'Interpolating between images with Runway');

    try {
      const response = await fetch(`${this.baseUrl}/interpolate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start_image: request.startImageUrl,
          end_image: request.endImageUrl,
          frames: request.frames,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Runway API error: ${error}`);
      }

      const data: RunwayGenerationResponse = await response.json();

      const video: GeneratedVideo = {
        id: data.id,
        url: '',
        thumbnailUrl: '',
        prompt: 'Image interpolation',
        provider: 'runway',
        duration: request.frames / 24, // Assuming 24 fps
        aspectRatio: '16:9',
        status: 'processing',
        progress: 0,
        sourceImageUrl: request.startImageUrl,
        createdAt: new Date(),
      };

      this.pollForCompletion(data.id, video);

      return video;
    } catch (error: any) {
      this.logger.error({ error }, 'Failed to interpolate');
      throw error;
    }
  }

  /**
   * Get generation status
   */
  async getStatus(videoId: string): Promise<GeneratedVideo> {
    try {
      const response = await fetch(`${this.baseUrl}/status/${videoId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get status: ${response.statusText}`);
      }

      const data: RunwayGenerationResponse = await response.json();

      const status = this.mapRunwayStatus(data.status);
      const video: GeneratedVideo = {
        id: data.id,
        url: data.output?.[0] || '',
        thumbnailUrl: data.output?.[1] || '',
        prompt: '',
        provider: 'runway',
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
      const response = await fetch(`${this.baseUrl}/cancel/${videoId}`, {
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
    return 'runway';
  }

  getSupportedDurations(): number[] {
    return [4, 8, 16];
  }

  getSupportedAspectRatios(): string[] {
    return ['16:9', '9:16', '1:1'];
  }

  getCapabilities(): string[] {
    return [
      'text-to-video',
      'image-to-video',
      'video-extension',
      'interpolation',
      'custom-motion',
      'style-presets',
    ];
  }

  // Private helpers

  private async pollForCompletion(id: string, video: GeneratedVideo): Promise<void> {
    const maxAttempts = 120; // 10 minutes max (5s intervals)
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

    // Start polling asynchronously
    setTimeout(poll, 5000);
  }

  private mapRunwayStatus(runwayStatus: string): 'queued' | 'processing' | 'completed' | 'failed' {
    switch (runwayStatus.toLowerCase()) {
      case 'pending':
      case 'queued':
        return 'queued';
      case 'processing':
      case 'running':
        return 'processing';
      case 'succeeded':
      case 'completed':
        return 'completed';
      case 'failed':
      case 'error':
        return 'failed';
      default:
        return 'processing';
    }
  }
}
