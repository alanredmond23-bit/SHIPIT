import { Router, Request, Response } from 'express';
import { Logger } from 'pino';
import { Pool } from 'pg';
import { z } from 'zod';
import { ImageGenerationEngine } from '../services/image-generation';
import { ImageGenerationRequest, ImageEditRequest } from '../services/image/types';

// Validation schemas
const GenerateImageSchema = z.object({
  prompt: z.string().min(1).max(4000),
  negativePrompt: z.string().optional(),
  provider: z.enum(['dalle3', 'stability', 'replicate']),
  model: z.string().optional(),
  size: z.enum(['256x256', '512x512', '1024x1024', '1024x1792', '1792x1024']),
  quality: z.enum(['standard', 'hd']).optional(),
  style: z.string().optional(),
  count: z.number().int().min(1).max(10).default(1),
  seed: z.number().int().optional(),
  steps: z.number().int().min(1).max(150).optional(),
  cfgScale: z.number().min(0).max(20).optional(),
  sampler: z.string().optional(),
  userId: z.string().optional(),
  conversationId: z.string().optional(),
});

const EditImageSchema = z.object({
  imageUrl: z.string().url(),
  prompt: z.string().min(1).max(4000),
  editType: z.enum(['inpaint', 'outpaint', 'variation', 'upscale', 'style-transfer']),
  mask: z.string().optional(),
  strength: z.number().min(0).max(1).optional(),
  negativePrompt: z.string().optional(),
  seed: z.number().int().optional(),
  userId: z.string().optional(),
});

const VariationsSchema = z.object({
  imageUrl: z.string().url(),
  count: z.number().int().min(1).max(10),
  provider: z.string().optional(),
  userId: z.string().optional(),
});

const UpscaleSchema = z.object({
  imageUrl: z.string().url(),
  scale: z.enum([2, 4]),
  provider: z.string().optional(),
  userId: z.string().optional(),
});

const StyleTransferSchema = z.object({
  imageUrl: z.string().url(),
  style: z.string().min(1),
  provider: z.string().optional(),
  userId: z.string().optional(),
});

const EnhancePromptSchema = z.object({
  prompt: z.string().min(1).max(4000),
});

const AnalyzeImageSchema = z.object({
  imageUrl: z.string().url(),
});

/**
 * Create API routes for image generation
 */
export function createImageRoutes(
  db: Pool,
  imageEngine: ImageGenerationEngine,
  logger: Logger
): Router {
  const router = Router();

  /**
   * POST /api/images/generate
   * Generate new images
   */
  router.post('/generate', async (req: Request, res: Response) => {
    try {
      const data = GenerateImageSchema.parse(req.body);

      logger.info({ data }, 'Generating images');

      const request: ImageGenerationRequest = {
        prompt: data.prompt,
        negativePrompt: data.negativePrompt,
        provider: data.provider,
        model: data.model,
        size: data.size,
        quality: data.quality,
        style: data.style,
        count: data.count,
        seed: data.seed,
        steps: data.steps,
        cfgScale: data.cfgScale,
        sampler: data.sampler,
      };

      const images = await imageEngine.generate(request);

      res.json({
        success: true,
        images,
        count: images.length,
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to generate images');

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
          message: error.message || 'Image generation failed',
        },
      });
    }
  });

  /**
   * POST /api/images/edit
   * Edit existing image
   */
  router.post('/edit', async (req: Request, res: Response) => {
    try {
      const data = EditImageSchema.parse(req.body);

      logger.info({ data }, 'Editing image');

      const request: ImageEditRequest = {
        imageUrl: data.imageUrl,
        prompt: data.prompt,
        editType: data.editType,
        mask: data.mask,
        strength: data.strength,
        negativePrompt: data.negativePrompt,
        seed: data.seed,
      };

      const image = await imageEngine.edit(request);

      res.json({
        success: true,
        image,
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to edit image');

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
          message: error.message || 'Image edit failed',
        },
      });
    }
  });

  /**
   * POST /api/images/variations
   * Create variations of an image
   */
  router.post('/variations', async (req: Request, res: Response) => {
    try {
      const data = VariationsSchema.parse(req.body);

      logger.info({ data }, 'Creating image variations');

      const variations = await imageEngine.createVariations(
        data.imageUrl,
        data.count,
        data.provider
      );

      res.json({
        success: true,
        variations,
        count: variations.length,
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to create variations');

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
          message: error.message || 'Variation creation failed',
        },
      });
    }
  });

  /**
   * POST /api/images/upscale
   * Upscale an image
   */
  router.post('/upscale', async (req: Request, res: Response) => {
    try {
      const data = UpscaleSchema.parse(req.body);

      logger.info({ data }, 'Upscaling image');

      const upscaled = await imageEngine.upscale(data.imageUrl, data.scale, data.provider);

      res.json({
        success: true,
        image: upscaled,
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to upscale image');

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
          message: error.message || 'Image upscale failed',
        },
      });
    }
  });

  /**
   * POST /api/images/style
   * Apply style transfer to an image
   */
  router.post('/style', async (req: Request, res: Response) => {
    try {
      const data = StyleTransferSchema.parse(req.body);

      logger.info({ data }, 'Applying style transfer');

      const styled = await imageEngine.applyStyle(data.imageUrl, data.style, data.provider);

      res.json({
        success: true,
        image: styled,
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to apply style');

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
          message: error.message || 'Style transfer failed',
        },
      });
    }
  });

  /**
   * POST /api/images/enhance-prompt
   * AI-powered prompt enhancement
   */
  router.post('/enhance-prompt', async (req: Request, res: Response) => {
    try {
      const data = EnhancePromptSchema.parse(req.body);

      logger.info({ prompt: data.prompt }, 'Enhancing prompt');

      const result = await imageEngine.enhancePrompt(data.prompt);

      res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to enhance prompt');

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
          message: error.message || 'Prompt enhancement failed',
        },
      });
    }
  });

  /**
   * POST /api/images/analyze
   * Analyze image with AI
   */
  router.post('/analyze', async (req: Request, res: Response) => {
    try {
      const data = AnalyzeImageSchema.parse(req.body);

      logger.info({ imageUrl: data.imageUrl }, 'Analyzing image');

      const analysis = await imageEngine.analyzeImage(data.imageUrl);

      res.json({
        success: true,
        analysis,
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to analyze image');

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
          message: error.message || 'Image analysis failed',
        },
      });
    }
  });

  /**
   * GET /api/images/history
   * Get generation history for a user
   */
  router.get('/history', async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      if (!userId) {
        return res.status(400).json({
          error: {
            message: 'userId is required',
          },
        });
      }

      logger.info({ userId, limit, offset }, 'Fetching image history');

      const images = await imageEngine.getHistory(userId, limit, offset);

      res.json({
        success: true,
        images,
        count: images.length,
        limit,
        offset,
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to fetch history');

      res.status(500).json({
        error: {
          message: error.message || 'Failed to fetch history',
        },
      });
    }
  });

  /**
   * DELETE /api/images/:id
   * Delete a generated image
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.query.userId as string | undefined;

      logger.info({ id, userId }, 'Deleting image');

      const deleted = await imageEngine.deleteImage(id, userId);

      if (!deleted) {
        return res.status(404).json({
          error: {
            message: 'Image not found or not authorized',
          },
        });
      }

      res.json({
        success: true,
        message: 'Image deleted successfully',
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to delete image');

      res.status(500).json({
        error: {
          message: error.message || 'Failed to delete image',
        },
      });
    }
  });

  /**
   * GET /api/images/providers
   * Get available providers and their capabilities
   */
  router.get('/providers', async (req: Request, res: Response) => {
    try {
      const providers = imageEngine.getAvailableProviders();

      const providerInfo = providers.map((name) => ({
        name,
        capabilities: imageEngine.getProviderCapabilities(name),
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
   * GET /api/images/stats
   * Get provider statistics
   */
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const stats = await imageEngine.getProviderStats();

      res.json({
        success: true,
        stats,
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to get stats');

      res.status(500).json({
        error: {
          message: error.message || 'Failed to get stats',
        },
      });
    }
  });

  /**
   * GET /api/images/health
   * Health check for all providers
   */
  router.get('/health', async (req: Request, res: Response) => {
    try {
      const health = await imageEngine.healthCheck();

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
   * GET /api/images/templates
   * Get prompt templates
   */
  router.get('/templates', async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string | undefined;
      const isPublic = req.query.public === 'true';
      const category = req.query.category as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;

      let query = `SELECT * FROM prompt_templates WHERE 1=1`;
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
   * POST /api/images/templates
   * Create a new prompt template
   */
  router.post('/templates', async (req: Request, res: Response) => {
    try {
      const {
        userId,
        name,
        description,
        promptTemplate,
        negativePromptTemplate,
        stylePreset,
        defaultProvider,
        defaultSize,
        defaultQuality,
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
        `INSERT INTO prompt_templates (
          user_id, name, description, prompt_template, negative_prompt_template,
          style_preset, default_provider, default_size, default_quality,
          category, tags, is_public
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          userId || null,
          name,
          description || null,
          promptTemplate,
          negativePromptTemplate || null,
          stylePreset || null,
          defaultProvider || null,
          defaultSize || null,
          defaultQuality || null,
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

  return router;
}
