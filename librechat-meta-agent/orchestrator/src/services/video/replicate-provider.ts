import { Logger } from 'pino';
import Replicate from 'replicate';
import {
  VideoProvider,
  ReplicateVideoConfig,
  VideoGenerationRequest,
  ImageToVideoRequest,
  VideoExtendRequest,
  VideoInterpolateRequest,
  GeneratedVideo,
} from './types';

/**
 * Replicate Video Generation Provider
 * Supports multiple models: Stable Video Diffusion, AnimateDiff, Zeroscope, etc.
 */
export class ReplicateVideoProvider implements VideoProvider {
  private config: ReplicateVideoConfig;
  private logger: Logger;
  private client: Replicate;

  // Available video models on Replicate
  private models = {
    'stable-video-diffusion': 'stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438',
    'animatediff': 'lucataco/animate-diff:beecf59c4aee8d81bf04f0381033dfa10dc16e845b4ae00d281e2fa377e48a9f',
    'zeroscope': 'anotherjesse/zeroscope-v2-xl:9f747673945c62801b13b84701c783929c0ee784e4748ec062204894dda1a351',
    'text2video-zero': 'cjwbw/text2video-zero:b6b8c8a4e7c37e1c1e4c5f6b8d8b6b5c7a0e9d8b7c6a5b4c3d2e1f0a9b8c7d6e5',
    'modelscope': 'cjwbw/modelscope-text2video:e71e6e3c5db8e3e4b4e2d4c5f6b8d8b6b5c7a0e9d8b7c6a5b4c3d2e1f0a9b8c7d6',
  };

  constructor(config: ReplicateVideoConfig, logger: Logger) {
    this.config = config;
    this.logger = logger.child({ provider: 'replicate-video' });

    if (!config.apiKey) {
      throw new Error('Replicate API key is required');
    }

    this.client = new Replicate({
      auth: config.apiKey,
    });
  }

  /**
   * Generate video from text prompt
   */
  async generateFromText(request: VideoGenerationRequest): Promise<GeneratedVideo> {
    this.logger.info({ request }, 'Generating video from text with Replicate');

    try {
      const modelName = request.model || this.config.defaultModel || 'zeroscope';
      const modelVersion = this.models[modelName as keyof typeof this.models];

      if (!modelVersion) {
        throw new Error(`Unsupported model: ${modelName}`);
      }

      // Different models have different input formats
      const input = this.buildTextToVideoInput(modelName, request);

      const prediction = await this.client.predictions.create({
        version: modelVersion.split(':')[1],
        input,
      });

      const video: GeneratedVideo = {
        id: prediction.id,
        url: '',
        thumbnailUrl: '',
        prompt: request.prompt,
        provider: 'replicate',
        model: modelName,
        duration: request.duration,
        aspectRatio: request.aspectRatio,
        status: 'processing',
        progress: 0,
        fps: request.fps || 24,
        motion: request.motion,
        style: request.style,
        seed: request.seed,
        metadata: {
          predictionId: prediction.id,
        },
        createdAt: new Date(),
      };

      // Start polling for completion
      this.pollForCompletion(prediction.id, video);

      return video;
    } catch (error: any) {
      this.logger.error({ error }, 'Failed to generate video from text');
      throw error;
    }
  }

  /**
   * Generate video from image (animate image)
   */
  async generateFromImage(request: ImageToVideoRequest): Promise<GeneratedVideo> {
    this.logger.info({ request }, 'Generating video from image with Replicate');

    try {
      // Use Stable Video Diffusion for image-to-video
      const modelVersion = this.models['stable-video-diffusion'];

      const prediction = await this.client.predictions.create({
        version: modelVersion.split(':')[1],
        input: {
          input_image: request.imageUrl,
          cond_aug: 0.02,
          decoding_t: 7,
          video_length: this.mapDurationToFrames(request.duration),
          sizing_strategy: 'maintain_aspect_ratio',
          motion_bucket_id: this.mapMotionToBucketId(request.motion),
          frames_per_second: 6,
          seed: request.seed,
        },
      });

      const video: GeneratedVideo = {
        id: prediction.id,
        url: '',
        thumbnailUrl: '',
        prompt: request.prompt,
        provider: 'replicate',
        model: 'stable-video-diffusion',
        duration: request.duration,
        aspectRatio: '16:9',
        status: 'processing',
        progress: 0,
        motion: request.motion,
        sourceImageUrl: request.imageUrl,
        metadata: {
          predictionId: prediction.id,
        },
        createdAt: new Date(),
      };

      this.pollForCompletion(prediction.id, video);

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
    // Video extension is not directly supported in most Replicate models
    // We can implement this by using the last frame as an image-to-video generation
    throw new Error('Video extension is not directly supported by Replicate provider');
  }

  /**
   * Interpolate between two images
   */
  async interpolate(request: VideoInterpolateRequest): Promise<GeneratedVideo> {
    this.logger.info({ request }, 'Interpolating between images with Replicate');

    try {
      // Use FILM (Frame Interpolation for Large Motion) model
      const filmModel = 'google-research/frame-interpolation:4b417b169d3d0e2bfb969a7b7b4a5f6d5e8c9a8b7c6d5e4f3a2b1c0d9e8f7a6b5';

      const prediction = await this.client.predictions.create({
        version: filmModel.split(':')[1],
        input: {
          frame1: request.startImageUrl,
          frame2: request.endImageUrl,
          times_to_interpolate: Math.log2(request.frames),
        },
      });

      const video: GeneratedVideo = {
        id: prediction.id,
        url: '',
        thumbnailUrl: '',
        prompt: 'Frame interpolation',
        provider: 'replicate',
        model: 'film',
        duration: request.frames / 24,
        aspectRatio: '16:9',
        status: 'processing',
        progress: 0,
        sourceImageUrl: request.startImageUrl,
        metadata: {
          predictionId: prediction.id,
          endImage: request.endImageUrl,
        },
        createdAt: new Date(),
      };

      this.pollForCompletion(prediction.id, video);

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
      const prediction = await this.client.predictions.get(videoId);

      const status = this.mapReplicateStatus(prediction.status);

      let videoUrl = '';
      if (prediction.output) {
        // Output can be string, array, or object depending on model
        if (typeof prediction.output === 'string') {
          videoUrl = prediction.output;
        } else if (Array.isArray(prediction.output) && prediction.output.length > 0) {
          videoUrl = prediction.output[0];
        } else if (prediction.output.video) {
          videoUrl = prediction.output.video;
        }
      }

      const video: GeneratedVideo = {
        id: videoId,
        url: videoUrl,
        thumbnailUrl: '',
        prompt: prediction.input?.prompt || '',
        provider: 'replicate',
        duration: 0,
        aspectRatio: '16:9',
        status,
        progress: this.calculateProgress(prediction),
        errorMessage: prediction.error?.toString(),
        createdAt: new Date(prediction.created_at),
        completedAt: prediction.completed_at ? new Date(prediction.completed_at) : undefined,
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
      await this.client.predictions.cancel(videoId);
      return true;
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
      // Test with a simple model list call
      await this.client.models.get('stability-ai', 'stable-video-diffusion');
      return true;
    } catch (error) {
      this.logger.error({ error }, 'Health check failed');
      return false;
    }
  }

  getName(): string {
    return 'replicate';
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
      'interpolation',
      'multiple-models',
      'custom-parameters',
    ];
  }

  // Private helpers

  private buildTextToVideoInput(modelName: string, request: VideoGenerationRequest): any {
    // Different models expect different input formats
    switch (modelName) {
      case 'zeroscope':
        return {
          prompt: request.prompt,
          num_frames: this.mapDurationToFrames(request.duration),
          num_inference_steps: 50,
          guidance_scale: 17.5,
          seed: request.seed,
        };

      case 'animatediff':
        return {
          prompt: request.prompt,
          negative_prompt: request.negativePrompt || 'blurry, distorted',
          num_frames: this.mapDurationToFrames(request.duration),
          num_inference_steps: 25,
          guidance_scale: 7.5,
          seed: request.seed,
        };

      case 'modelscope':
        return {
          prompt: request.prompt,
          num_frames: this.mapDurationToFrames(request.duration),
          fps: request.fps || 8,
          seed: request.seed,
        };

      default:
        return {
          prompt: request.prompt,
          num_frames: this.mapDurationToFrames(request.duration),
          seed: request.seed,
        };
    }
  }

  private mapDurationToFrames(duration: number): number {
    // Most models work with frame counts
    // Assuming ~8 FPS for most video models
    return Math.min(duration * 8, 128); // Cap at 128 frames
  }

  private mapMotionToBucketId(motion?: string): number {
    switch (motion) {
      case 'slow':
        return 50;
      case 'medium':
        return 127;
      case 'fast':
        return 200;
      default:
        return 127;
    }
  }

  private async pollForCompletion(id: string, video: GeneratedVideo): Promise<void> {
    const maxAttempts = 180; // 15 minutes max
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

  private mapReplicateStatus(
    status: string
  ): 'queued' | 'processing' | 'completed' | 'failed' {
    switch (status) {
      case 'starting':
      case 'queued':
        return 'queued';
      case 'processing':
        return 'processing';
      case 'succeeded':
        return 'completed';
      case 'failed':
      case 'canceled':
        return 'failed';
      default:
        return 'processing';
    }
  }

  private calculateProgress(prediction: any): number {
    if (prediction.status === 'succeeded') return 100;
    if (prediction.status === 'failed' || prediction.status === 'canceled') return 0;

    // Estimate progress based on logs if available
    if (prediction.logs) {
      const logs = prediction.logs.toLowerCase();
      if (logs.includes('100%')) return 95;
      if (logs.includes('75%')) return 75;
      if (logs.includes('50%')) return 50;
      if (logs.includes('25%')) return 25;
    }

    return prediction.status === 'processing' ? 50 : 10;
  }
}
