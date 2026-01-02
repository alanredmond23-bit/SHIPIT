import { Router, Request, Response } from 'express';
import { Logger } from 'pino';
import { Pool } from 'pg';
import { z } from 'zod';
import { VideoGenerationEngine } from '../services/video-generation';
import {
  VideoGenerationRequest,
  ImageToVideoRequest,
  VideoExtendRequest,
} from '../services/video/types';

// Validation schemas
const GenerateVideoSchema = z.object({
  prompt: z.string().min(1).max(4000),
  provider: z.enum(['runway', 'pika', 'stability', 'replicate']),
  model: z.string().optional(),
  duration: z.enum([4, 8, 16]),
  aspectRatio: z.enum(['16:9', '9:16', '1:1']),
  style: z.string().optional(),
  motion: z.enum(['slow', 'medium', 'fast']).optional(),
  seed: z.number().int().optional(),
  fps: z.number().int().min(1).max(60).optional(),
  negativePrompt: z.string().optional(),
  userId: z.string().optional(),
});

const AnimateImageSchema = z.object({
  imageUrl: z.string().url(),
  prompt: z.string().min(1).max(4000),
  provider: z.enum(['runway', 'pika', 'stability', 'replicate']),
  duration: z.enum([4, 8, 16]),
  motion: z.enum(['slow', 'medium', 'fast']),
  seed: z.number().int().optional(),
  endImageUrl: z.string().url().optional(),
  userId: z.string().optional(),
});

const ExtendVideoSchema = z.object({
  videoUrl: z.string().url(),
  prompt: z.string().min(1).max(4000),
  extendBy: z.enum([4, 8]),
  provider: z.string().optional(),
  userId: z.string().optional(),
});

const InterpolateSchema = z.object({
  startImageUrl: z.string().url(),
  endImageUrl: z.string().url(),
  frames: z.number().int().min(8).max(128),
  provider: z.string().optional(),
  userId: z.string().optional(),
});

/**
 * Create API routes for video generation
 */
export function createVideoRoutes(
  db: Pool,
  videoEngine: VideoGenerationEngine,
  logger: Logger
): Router {
  const router = Router();

  /**
   * POST /api/videos/generate
   * Generate video from text prompt
   */
  router.post('/generate', async (req: Request, res: Response) => {
    try {
      const data = GenerateVideoSchema.parse(req.body);

      logger.info({ data }, 'Generating video from text');

      const request: VideoGenerationRequest = {
        prompt: data.prompt,
        provider: data.provider,
        model: data.model,
        duration: data.duration,
        aspectRatio: data.aspectRatio,
        style: data.style,
        motion: data.motion,
        seed: data.seed,
        fps: data.fps,
        negativePrompt: data.negativePrompt,
      };

      const video = await videoEngine.generateFromText(request);

      res.json({
        success: true,
        video,
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to generate video');

      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: {
            message: 'Invalid request parameters',
            details: error.errors,
          },
        });
      }

      res.status(500).json({
        error: {
          message: error.message || 'Video generation failed',
        },
      });
    }
  });

  /**
   * POST /api/videos/animate
   * Animate an image (image-to-video)
   */
  router.post('/animate', async (req: Request, res: Response) => {
    try {
      const data = AnimateImageSchema.parse(req.body);

      logger.info({ data }, 'Animating image');

      const request: ImageToVideoRequest = {
        imageUrl: data.imageUrl,
        prompt: data.prompt,
        provider: data.provider,
        duration: data.duration,
        motion: data.motion,
        seed: data.seed,
        endImageUrl: data.endImageUrl,
      };

      const video = await videoEngine.generateFromImage(request);

      res.json({
        success: true,
        video,
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to animate image');

      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: {
            message: 'Invalid request parameters',
            details: error.errors,
          },
        });
      }

      res.status(500).json({
        error: {
          message: error.message || 'Image animation failed',
        },
      });
    }
  });

  /**
   * POST /api/videos/extend
   * Extend an existing video
   */
  router.post('/extend', async (req: Request, res: Response) => {
    try {
      const data = ExtendVideoSchema.parse(req.body);

      logger.info({ data }, 'Extending video');

      const request: VideoExtendRequest = {
        videoUrl: data.videoUrl,
        prompt: data.prompt,
        extendBy: data.extendBy,
        provider: data.provider,
      };

      const video = await videoEngine.extendVideo(request);

      res.json({
        success: true,
        video,
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to extend video');

      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: {
            message: 'Invalid request parameters',
            details: error.errors,
          },
        });
      }

      res.status(500).json({
        error: {
          message: error.message || 'Video extension failed',
        },
      });
    }
  });

  /**
   * POST /api/videos/interpolate
   * Interpolate between two images
   */
  router.post('/interpolate', async (req: Request, res: Response) => {
    try {
      const data = InterpolateSchema.parse(req.body);

      logger.info({ data }, 'Interpolating frames');

      const video = await videoEngine.interpolate(
        data.startImageUrl,
        data.endImageUrl,
        data.frames,
        data.provider
      );

      res.json({
        success: true,
        video,
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to interpolate');

      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: {
            message: 'Invalid request parameters',
            details: error.errors,
          },
        });
      }

      res.status(500).json({
        error: {
          message: error.message || 'Interpolation failed',
        },
      });
    }
  });

  /**
   * GET /api/videos/:id
   * Get video status and details
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      logger.info({ id }, 'Getting video status');

      const video = await videoEngine.getStatus(id);

      if (!video) {
        return res.status(404).json({
          error: {
            message: 'Video not found',
          },
        });
      }

      res.json({
        success: true,
        video,
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to get video status');

      res.status(500).json({
        error: {
          message: error.message || 'Failed to get video status',
        },
      });
    }
  });

  /**
   * GET /api/videos/:id/stream
   * Server-Sent Events stream for progress updates
   */
  router.get('/:id/stream', async (req: Request, res: Response) => {
    const { id } = req.params;

    logger.info({ id }, 'Starting SSE stream for video progress');

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      // Stream progress updates
      for await (const update of videoEngine.streamProgress(id)) {
        const data = JSON.stringify(update);
        res.write(`data: ${data}\n\n`);

        // Stop streaming if completed or failed
        if (update.status === 'completed' || update.status === 'failed') {
          res.end();
          break;
        }
      }
    } catch (error: any) {
      logger.error({ error, id }, 'SSE stream error');
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  });

  /**
   * GET /api/videos
   * List user's videos
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status as string | undefined;

      if (!userId) {
        return res.status(400).json({
          error: {
            message: 'userId is required',
          },
        });
      }

      logger.info({ userId, limit, offset, status }, 'Listing videos');

      const videos = await videoEngine.listVideos(userId, limit, offset, status);

      res.json({
        success: true,
        videos,
        count: videos.length,
        limit,
        offset,
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to list videos');

      res.status(500).json({
        error: {
          message: error.message || 'Failed to list videos',
        },
      });
    }
  });

  /**
   * DELETE /api/videos/:id
   * Delete a video
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.query.userId as string | undefined;

      logger.info({ id, userId }, 'Deleting video');

      const deleted = await videoEngine.deleteVideo(id, userId);

      if (!deleted) {
        return res.status(404).json({
          error: {
            message: 'Video not found or not authorized',
          },
        });
      }

      res.json({
        success: true,
        message: 'Video deleted successfully',
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to delete video');

      res.status(500).json({
        error: {
          message: error.message || 'Failed to delete video',
        },
      });
    }
  });

  /**
   * POST /api/videos/:id/favorite
   * Toggle favorite status
   */
  router.post('/:id/favorite', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          error: {
            message: 'userId is required',
          },
        });
      }

      logger.info({ id, userId }, 'Toggling favorite');

      const isFavorite = await videoEngine.toggleFavorite(id, userId);

      res.json({
        success: true,
        isFavorite,
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to toggle favorite');

      res.status(500).json({
        error: {
          message: error.message || 'Failed to toggle favorite',
        },
      });
    }
  });

  /**
   * GET /api/videos/favorites
   * Get user's favorite videos
   */
  router.get('/favorites/list', async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!userId) {
        return res.status(400).json({
          error: {
            message: 'userId is required',
          },
        });
      }

      logger.info({ userId, limit }, 'Getting favorite videos');

      const videos = await videoEngine.getFavorites(userId, limit);

      res.json({
        success: true,
        videos,
        count: videos.length,
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to get favorites');

      res.status(500).json({
        error: {
          message: error.message || 'Failed to get favorites',
        },
      });
    }
  });

  /**
   * GET /api/videos/providers
   * Get available providers and their capabilities
   */
  router.get('/providers/list', async (req: Request, res: Response) => {
    try {
      const providers = videoEngine.getAvailableProviders();

      const providerInfo = providers.map((name) => ({
        name,
        capabilities: videoEngine.getProviderCapabilities(name),
      }));

      res.json({
        success: true,
        providers: providerInfo,
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to get providers');

      res.status(500).json({
        error: {
          message: error.message || 'Failed to get providers',
        },
      });
    }
  });

  /**
   * GET /api/videos/health
   * Health check for all video providers
   */
  router.get('/health/check', async (req: Request, res: Response) => {
    try {
      const health = await videoEngine.healthCheck();

      const allHealthy = Object.values(health).every((status) => status);

      res.status(allHealthy ? 200 : 503).json({
        success: allHealthy,
        providers: health,
      });
    } catch (error: any) {
      logger.error({ error }, 'Health check failed');

      res.status(503).json({
        success: false,
        error: {
          message: error.message || 'Health check failed',
        },
      });
    }
  });

  /**
   * GET /api/videos/templates
   * Get video prompt templates
   */
  router.get('/templates/list', async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string | undefined;
      const isPublic = req.query.public === 'true';
      const category = req.query.category as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;

      let query = `SELECT * FROM video_prompt_templates WHERE 1=1`;
      const params: any[] = [];
      let paramIndex = 1;

      if (isPublic) {
        query += ` AND is_public = true`;
      } else if (userId) {
        query += ` AND (user_id = $${paramIndex} OR is_public = true)`;
        params.push(userId);
        paramIndex++;
      }

      if (category) {
        query += ` AND category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }

      query += ` ORDER BY usage_count DESC, created_at DESC LIMIT $${paramIndex}`;
      params.push(limit);

      const result = await db.query(query, params);

      res.json({
        success: true,
        templates: result.rows,
        count: result.rows.length,
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to fetch templates');

      res.status(500).json({
        error: {
          message: error.message || 'Failed to fetch templates',
        },
      });
    }
  });

  /**
   * POST /api/videos/templates
   * Create a new video prompt template
   */
  router.post('/templates', async (req: Request, res: Response) => {
    try {
      const {
        userId,
        name,
        description,
        promptTemplate,
        stylePreset,
        motionPreset,
        defaultProvider,
        defaultDuration,
        defaultAspectRatio,
        category,
        tags,
        isPublic,
      } = req.body;

      if (!name || !promptTemplate) {
        return res.status(400).json({
          error: {
            message: 'name and promptTemplate are required',
          },
        });
      }

      const result = await db.query(
        `INSERT INTO video_prompt_templates (
          user_id, name, description, prompt_template, style_preset,
          motion_preset, default_provider, default_duration, default_aspect_ratio,
          category, tags, is_public
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          userId || null,
          name,
          description || null,
          promptTemplate,
          stylePreset || null,
          motionPreset || null,
          defaultProvider || null,
          defaultDuration || null,
          defaultAspectRatio || null,
          category || null,
          tags || null,
          isPublic || false,
        ]
      );

      res.json({
        success: true,
        template: result.rows[0],
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to create template');

      res.status(500).json({
        error: {
          message: error.message || 'Failed to create template',
        },
      });
    }
  });

  /**
   * POST /api/videos/:id/analytics
   * Track video analytics event
   */
  router.post('/:id/analytics', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { eventType, userId, metadata } = req.body;

      if (!eventType) {
        return res.status(400).json({
          error: {
            message: 'eventType is required',
          },
        });
      }

      await db.query(
        'SELECT track_video_event($1, $2, $3, $4)',
        [id, eventType, userId || null, JSON.stringify(metadata || {})]
      );

      res.json({
        success: true,
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to track analytics');

      res.status(500).json({
        error: {
          message: error.message || 'Failed to track analytics',
        },
      });
    }
  });

  return router;
}
