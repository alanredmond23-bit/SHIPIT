import { Pool } from 'pg';
import { Logger } from 'pino';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import {
  VideoGenerationRequest,
  ImageToVideoRequest,
  VideoExtendRequest,
  VideoInterpolateRequest,
  GeneratedVideo,
  VideoProvider,
  VideoProgressUpdate,
  RunwayConfig,
  PikaConfig,
  StabilityVideoConfig,
  ReplicateVideoConfig,
} from './video/types';
import { RunwayProvider } from './video/runway-provider';
import { PikaProvider } from './video/pika-provider';
import { ReplicateVideoProvider } from './video/replicate-provider';

export interface VideoGenerationEngineConfig {
  runway?: RunwayConfig;
  pika?: PikaConfig;
  stability?: StabilityVideoConfig;
  replicate?: ReplicateVideoConfig;
  defaultProvider?: 'runway' | 'pika' | 'stability' | 'replicate';
  storageBasePath?: string;
}

/**
 * Multi-Provider Video Generation Engine
 * Like Sora, but with support for multiple providers:
 * - Runway Gen-3 Alpha
 * - Pika Labs
 * - Stability AI Video
 * - Replicate (various models)
 */
export class VideoGenerationEngine extends EventEmitter {
  private providers: Map<string, VideoProvider> = new Map();
  private db: Pool;
  private logger: Logger;
  private config: VideoGenerationEngineConfig;
  private defaultProvider: string;
  private progressTrackers: Map<string, NodeJS.Timeout> = new Map();

  constructor(db: Pool, logger: Logger, config: VideoGenerationEngineConfig) {
    super();
    this.db = db;
    this.logger = logger.child({ service: 'video-generation' });
    this.config = config;
    this.defaultProvider = config.defaultProvider || 'runway';

    this.initializeProviders();

    this.logger.info(
      { providers: Array.from(this.providers.keys()) },
      'Video generation engine initialized'
    );
  }

  private initializeProviders(): void {
    // Initialize Runway provider
    if (this.config.runway?.enabled) {
      try {
        const runwayProvider = new RunwayProvider(this.config.runway, this.logger);
        this.providers.set('runway', runwayProvider);
        this.logger.info('Runway Gen-3 provider enabled');
      } catch (error) {
        this.logger.error({ error }, 'Failed to initialize Runway provider');
      }
    }

    // Initialize Pika provider
    if (this.config.pika?.enabled) {
      try {
        const pikaProvider = new PikaProvider(this.config.pika, this.logger);
        this.providers.set('pika', pikaProvider);
        this.logger.info('Pika Labs provider enabled');
      } catch (error) {
        this.logger.error({ error }, 'Failed to initialize Pika provider');
      }
    }

    // Initialize Stability Video provider (placeholder - implement when API available)
    if (this.config.stability?.enabled) {
      this.logger.warn('Stability Video provider not yet implemented');
    }

    // Initialize Replicate provider
    if (this.config.replicate?.enabled) {
      try {
        const replicateProvider = new ReplicateVideoProvider(
          this.config.replicate,
          this.logger
        );
        this.providers.set('replicate', replicateProvider);
        this.logger.info('Replicate video provider enabled');
      } catch (error) {
        this.logger.error({ error }, 'Failed to initialize Replicate provider');
      }
    }

    if (this.providers.size === 0) {
      this.logger.warn('No video generation providers enabled!');
    }
  }

  /**
   * Generate video from text prompt
   */
  async generateFromText(request: VideoGenerationRequest): Promise<GeneratedVideo> {
    const startTime = Date.now();
    this.logger.info({ request }, 'Generating video from text');

    try {
      const provider = this.getProvider(request.provider);

      if (!provider) {
        throw new Error(`Provider ${request.provider} not available or not enabled`);
      }

      // Generate video
      const video = await provider.generateFromText(request);

      // Save to database
      await this.saveGeneratedVideo(video, request);

      // Start progress tracking
      this.trackProgress(video.id, request.provider);

      const totalTime = Date.now() - startTime;
      this.logger.info(
        {
          videoId: video.id,
          provider: request.provider,
          totalTime,
        },
        'Video generation started'
      );

      return video;
    } catch (error: any) {
      this.logger.error({ error, request }, 'Video generation failed');
      throw error;
    }
  }

  /**
   * Generate video from image (animate image)
   */
  async generateFromImage(request: ImageToVideoRequest): Promise<GeneratedVideo> {
    this.logger.info({ request }, 'Generating video from image');

    try {
      const provider = this.getProvider(request.provider);

      if (!provider) {
        throw new Error(`Provider ${request.provider} not available`);
      }

      const video = await provider.generateFromImage(request);

      // Save to database
      await this.saveGeneratedVideo(video, {
        prompt: request.prompt,
        provider: request.provider as any,
        duration: request.duration as any,
        aspectRatio: '16:9',
        motion: request.motion as any,
      });

      // Start progress tracking
      this.trackProgress(video.id, request.provider);

      this.logger.info({ videoId: video.id }, 'Image-to-video generation started');
      return video;
    } catch (error: any) {
      this.logger.error({ error, request }, 'Image-to-video generation failed');
      throw error;
    }
  }

  /**
   * Extend existing video
   */
  async extendVideo(request: VideoExtendRequest): Promise<GeneratedVideo> {
    this.logger.info({ request }, 'Extending video');

    try {
      const providerName = request.provider || this.defaultProvider;
      const provider = this.getProvider(providerName);

      if (!provider) {
        throw new Error(`Provider ${providerName} not available`);
      }

      const video = await provider.extendVideo(request);

      // Save to database
      await this.saveGeneratedVideo(video, {
        prompt: request.prompt,
        provider: providerName as any,
        duration: request.extendBy as any,
        aspectRatio: '16:9',
      });

      // Start progress tracking
      this.trackProgress(video.id, providerName);

      this.logger.info({ videoId: video.id }, 'Video extension started');
      return video;
    } catch (error: any) {
      this.logger.error({ error, request }, 'Video extension failed');
      throw error;
    }
  }

  /**
   * Interpolate between two images
   */
  async interpolate(
    startImageUrl: string,
    endImageUrl: string,
    frames: number,
    provider?: string
  ): Promise<GeneratedVideo> {
    this.logger.info({ startImageUrl, endImageUrl, frames }, 'Interpolating frames');

    try {
      const providerName = provider || this.defaultProvider;
      const videoProvider = this.getProvider(providerName);

      if (!videoProvider) {
        throw new Error(`Provider ${providerName} not available`);
      }

      const request: VideoInterpolateRequest = {
        startImageUrl,
        endImageUrl,
        frames,
      };

      const video = await videoProvider.interpolate(request);

      // Save to database
      await this.saveGeneratedVideo(video, {
        prompt: 'Frame interpolation',
        provider: providerName as any,
        duration: 4,
        aspectRatio: '16:9',
      });

      // Start progress tracking
      this.trackProgress(video.id, providerName);

      this.logger.info({ videoId: video.id }, 'Interpolation started');
      return video;
    } catch (error: any) {
      this.logger.error({ error }, 'Interpolation failed');
      throw error;
    }
  }

  /**
   * Get video generation status
   */
  async getStatus(videoId: string): Promise<GeneratedVideo> {
    try {
      // First try to get from database
      const dbVideo = await this.getVideoFromDB(videoId);

      if (!dbVideo) {
        throw new Error('Video not found');
      }

      // If still processing, check with provider
      if (dbVideo.status === 'processing' || dbVideo.status === 'queued') {
        const provider = this.getProvider(dbVideo.provider);

        if (provider) {
          try {
            const providerVideo = await provider.getStatus(videoId);

            // Update database with latest status
            await this.updateVideoStatus(videoId, providerVideo);

            return providerVideo;
          } catch (error) {
            this.logger.error({ error, videoId }, 'Failed to get provider status');
          }
        }
      }

      return dbVideo;
    } catch (error: any) {
      this.logger.error({ error, videoId }, 'Failed to get video status');
      throw error;
    }
  }

  /**
   * Stream generation progress via async generator
   */
  async *streamProgress(videoId: string): AsyncGenerator<VideoProgressUpdate> {
    const pollInterval = 3000; // 3 seconds
    const maxPolls = 600; // 30 minutes max
    let polls = 0;

    while (polls < maxPolls) {
      try {
        const video = await this.getStatus(videoId);

        const update: VideoProgressUpdate = {
          videoId: video.id,
          status: video.status,
          progress: video.progress,
          thumbnailUrl: video.thumbnailUrl,
          videoUrl: video.url,
          errorMessage: video.errorMessage,
        };

        yield update;

        if (video.status === 'completed' || video.status === 'failed') {
          break;
        }

        // Wait before next poll
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        polls++;
      } catch (error: any) {
        this.logger.error({ error, videoId }, 'Error streaming progress');
        yield {
          videoId,
          status: 'failed',
          progress: 0,
          errorMessage: error.message,
        };
        break;
      }
    }
  }

  /**
   * List user's videos
   */
  async listVideos(
    userId: string,
    limit = 50,
    offset = 0,
    status?: string
  ): Promise<GeneratedVideo[]> {
    try {
      let query = `
        SELECT * FROM generated_videos
        WHERE user_id = $1
      `;
      const params: any[] = [userId];
      let paramIndex = 2;

      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await this.db.query(query, params);

      return result.rows.map(this.rowToVideo);
    } catch (error: any) {
      this.logger.error({ error, userId }, 'Failed to list videos');
      throw error;
    }
  }

  /**
   * Delete video
   */
  async deleteVideo(videoId: string, userId?: string): Promise<boolean> {
    try {
      const query = userId
        ? 'DELETE FROM generated_videos WHERE id = $1 AND user_id = $2'
        : 'DELETE FROM generated_videos WHERE id = $1';

      const params = userId ? [videoId, userId] : [videoId];
      const result = await this.db.query(query, params);

      // Stop progress tracking if active
      this.stopProgressTracking(videoId);

      return (result.rowCount || 0) > 0;
    } catch (error: any) {
      this.logger.error({ error, videoId }, 'Failed to delete video');
      throw error;
    }
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(videoId: string, userId: string): Promise<boolean> {
    try {
      // Check if already favorited
      const checkResult = await this.db.query(
        'SELECT 1 FROM video_favorites WHERE user_id = $1 AND video_id = $2',
        [userId, videoId]
      );

      if (checkResult.rows.length > 0) {
        // Remove favorite
        await this.db.query(
          'DELETE FROM video_favorites WHERE user_id = $1 AND video_id = $2',
          [userId, videoId]
        );
        return false;
      } else {
        // Add favorite
        await this.db.query(
          'INSERT INTO video_favorites (user_id, video_id) VALUES ($1, $2)',
          [userId, videoId]
        );
        return true;
      }
    } catch (error: any) {
      this.logger.error({ error, videoId, userId }, 'Failed to toggle favorite');
      throw error;
    }
  }

  /**
   * Get favorites
   */
  async getFavorites(userId: string, limit = 50): Promise<GeneratedVideo[]> {
    try {
      const result = await this.db.query(
        `SELECT v.* FROM generated_videos v
         JOIN video_favorites f ON v.id = f.video_id
         WHERE f.user_id = $1
         ORDER BY f.created_at DESC
         LIMIT $2`,
        [userId, limit]
      );

      return result.rows.map(this.rowToVideo);
    } catch (error: any) {
      this.logger.error({ error, userId }, 'Failed to get favorites');
      throw error;
    }
  }

  // Helper methods

  private getProvider(name: string): VideoProvider | undefined {
    return this.providers.get(name);
  }

  private async saveGeneratedVideo(
    video: GeneratedVideo,
    request: VideoGenerationRequest
  ): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO generated_videos (
          id, prompt, provider, model, duration_seconds, aspect_ratio,
          style, motion, seed, status, progress, video_url, thumbnail_url,
          source_image_url, source_video_url, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          progress = EXCLUDED.progress,
          video_url = EXCLUDED.video_url,
          thumbnail_url = EXCLUDED.thumbnail_url`,
        [
          video.id,
          video.prompt,
          video.provider,
          video.model || null,
          video.duration,
          video.aspectRatio,
          video.style || null,
          video.motion || null,
          video.seed || null,
          video.status,
          video.progress,
          video.url || null,
          video.thumbnailUrl || null,
          video.sourceImageUrl || null,
          video.sourceVideoUrl || null,
          JSON.stringify(video.metadata || {}),
          video.createdAt,
        ]
      );
    } catch (error: any) {
      this.logger.error({ error }, 'Failed to save video to database');
      throw error;
    }
  }

  private async getVideoFromDB(videoId: string): Promise<GeneratedVideo | null> {
    try {
      const result = await this.db.query(
        'SELECT * FROM generated_videos WHERE id = $1',
        [videoId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.rowToVideo(result.rows[0]);
    } catch (error: any) {
      this.logger.error({ error, videoId }, 'Failed to get video from database');
      throw error;
    }
  }

  private async updateVideoStatus(videoId: string, video: GeneratedVideo): Promise<void> {
    try {
      await this.db.query(
        `UPDATE generated_videos SET
          status = $1,
          progress = $2,
          video_url = $3,
          thumbnail_url = $4,
          error_message = $5,
          completed_at = $6
        WHERE id = $7`,
        [
          video.status,
          video.progress,
          video.url || null,
          video.thumbnailUrl || null,
          video.errorMessage || null,
          video.completedAt || null,
          videoId,
        ]
      );

      // Emit progress event
      this.emit('progress', {
        videoId,
        status: video.status,
        progress: video.progress,
        videoUrl: video.url,
      });
    } catch (error: any) {
      this.logger.error({ error, videoId }, 'Failed to update video status');
    }
  }

  private rowToVideo(row: any): GeneratedVideo {
    return {
      id: row.id,
      url: row.video_url || '',
      thumbnailUrl: row.thumbnail_url || '',
      prompt: row.prompt,
      provider: row.provider,
      model: row.model,
      duration: row.duration_seconds,
      aspectRatio: row.aspect_ratio,
      status: row.status,
      progress: row.progress || 0,
      fps: row.metadata?.fps,
      motion: row.motion,
      style: row.style,
      seed: row.seed,
      sourceImageUrl: row.source_image_url,
      sourceVideoUrl: row.source_video_url,
      errorMessage: row.error_message,
      metadata: row.metadata,
      createdAt: new Date(row.created_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    };
  }

  private trackProgress(videoId: string, providerName: string): void {
    // Clear existing tracker if any
    this.stopProgressTracking(videoId);

    // Start new progress tracker
    const tracker = setInterval(async () => {
      try {
        const video = await this.getStatus(videoId);

        if (video.status === 'completed' || video.status === 'failed') {
          this.stopProgressTracking(videoId);
        }
      } catch (error) {
        this.logger.error({ error, videoId }, 'Progress tracking error');
        this.stopProgressTracking(videoId);
      }
    }, 5000); // Check every 5 seconds

    this.progressTrackers.set(videoId, tracker);
  }

  private stopProgressTracking(videoId: string): void {
    const tracker = this.progressTrackers.get(videoId);
    if (tracker) {
      clearInterval(tracker);
      this.progressTrackers.delete(videoId);
    }
  }

  /**
   * Health check for all providers
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name, provider] of this.providers) {
      try {
        results[name] = await provider.healthCheck();
      } catch (error) {
        results[name] = false;
      }
    }

    return results;
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get provider capabilities
   */
  getProviderCapabilities(providerName: string): string[] {
    const provider = this.getProvider(providerName);
    return provider ? provider.getCapabilities() : [];
  }

  /**
   * Cleanup on shutdown
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down video generation engine');

    // Stop all progress trackers
    for (const [videoId, tracker] of this.progressTrackers) {
      clearInterval(tracker);
    }
    this.progressTrackers.clear();

    this.removeAllListeners();
  }
}
