import { Pool } from 'pg';
import { Logger } from 'pino';
import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import {
  ImageGenerationRequest,
  ImageEditRequest,
  GeneratedImage,
  ImageProvider,
  PromptEnhancementResult,
  ImageAnalysis,
} from './image/types';
import { DalleProvider, DalleConfig } from './image/dalle-provider';
import { StabilityProvider, StabilityConfig } from './image/stability-provider';
import { ReplicateProvider, ReplicateConfig } from './image/replicate-provider';

export interface ImageGenerationEngineConfig {
  dalle?: DalleConfig;
  stability?: StabilityConfig;
  replicate?: ReplicateConfig;
  anthropicApiKey?: string;
  defaultProvider?: 'dalle3' | 'stability' | 'replicate';
  storageBasePath?: string;
}

/**
 * Multi-Provider Image Generation Engine
 * Supports: DALL-E 3, Stability AI, Replicate (SDXL, Flux, etc.)
 */
export class ImageGenerationEngine {
  private providers: Map<string, ImageProvider> = new Map();
  private db: Pool;
  private logger: Logger;
  private anthropic: Anthropic | null = null;
  private config: ImageGenerationEngineConfig;
  private defaultProvider: string;

  constructor(db: Pool, logger: Logger, config: ImageGenerationEngineConfig) {
    this.db = db;
    this.logger = logger.child({ service: 'image-generation' });
    this.config = config;
    this.defaultProvider = config.defaultProvider || 'dalle3';

    this.initializeProviders();

    if (config.anthropicApiKey) {
      this.anthropic = new Anthropic({
        apiKey: config.anthropicApiKey,
      });
    }

    this.logger.info(
      { providers: Array.from(this.providers.keys()) },
      'Image generation engine initialized'
    );
  }

  private initializeProviders(): void {
    // Initialize DALL-E provider
    if (this.config.dalle?.enabled) {
      try {
        const dalleProvider = new DalleProvider(this.config.dalle, this.logger);
        this.providers.set('dalle3', dalleProvider);
        this.logger.info('DALL-E provider enabled');
      } catch (error) {
        this.logger.error({ error }, 'Failed to initialize DALL-E provider');
      }
    }

    // Initialize Stability AI provider
    if (this.config.stability?.enabled) {
      try {
        const stabilityProvider = new StabilityProvider(this.config.stability, this.logger);
        this.providers.set('stability', stabilityProvider);
        this.logger.info('Stability AI provider enabled');
      } catch (error) {
        this.logger.error({ error }, 'Failed to initialize Stability AI provider');
      }
    }

    // Initialize Replicate provider
    if (this.config.replicate?.enabled) {
      try {
        const replicateProvider = new ReplicateProvider(this.config.replicate, this.logger);
        this.providers.set('replicate', replicateProvider);
        this.logger.info('Replicate provider enabled');
      } catch (error) {
        this.logger.error({ error }, 'Failed to initialize Replicate provider');
      }
    }

    if (this.providers.size === 0) {
      this.logger.warn('No image generation providers enabled!');
    }
  }

  /**
   * Generate images with any provider
   */
  async generate(request: ImageGenerationRequest): Promise<GeneratedImage[]> {
    const startTime = Date.now();
    this.logger.info({ request }, 'Generating images');

    try {
      const provider = this.getProvider(request.provider);

      if (!provider) {
        throw new Error(`Provider ${request.provider} not available or not enabled`);
      }

      // Generate images
      const images = await provider.generate(request);

      // Save to database
      await this.saveGeneratedImages(images, request);

      const totalTime = Date.now() - startTime;
      this.logger.info(
        {
          count: images.length,
          provider: request.provider,
          totalTime,
        },
        'Images generated and saved'
      );

      return images;
    } catch (error: any) {
      this.logger.error({ error, request }, 'Image generation failed');
      throw error;
    }
  }

  /**
   * Edit existing image
   */
  async edit(request: ImageEditRequest): Promise<GeneratedImage> {
    this.logger.info({ request }, 'Editing image');

    try {
      // Determine best provider for edit type
      const providerName = this.selectProviderForEdit(request.editType);
      const provider = this.getProvider(providerName);

      if (!provider) {
        throw new Error(`No suitable provider available for ${request.editType}`);
      }

      // Edit image
      const image = await provider.edit(request);

      // Save to database
      await this.saveGeneratedImages([image], {
        prompt: request.prompt,
        provider: providerName as any,
        size: image.size as any,
        count: 1,
      });

      this.logger.info({ editType: request.editType }, 'Image edited successfully');
      return image;
    } catch (error: any) {
      this.logger.error({ error, request }, 'Image edit failed');
      throw error;
    }
  }

  /**
   * Generate variations of an image
   */
  async createVariations(
    imageUrl: string,
    count: number,
    provider?: string
  ): Promise<GeneratedImage[]> {
    this.logger.info({ imageUrl, count, provider }, 'Creating image variations');

    try {
      const providerName = provider || this.defaultProvider;
      const imageProvider = this.getProvider(providerName);

      if (!imageProvider) {
        throw new Error(`Provider ${providerName} not available`);
      }

      const variations = await imageProvider.createVariations(imageUrl, count);

      // Save to database
      await this.saveGeneratedImages(variations, {
        prompt: 'Image variations',
        provider: providerName as any,
        size: '1024x1024',
        count,
      });

      return variations;
    } catch (error: any) {
      this.logger.error({ error }, 'Failed to create variations');
      throw error;
    }
  }

  /**
   * Upscale image
   */
  async upscale(imageUrl: string, scale: 2 | 4, provider?: string): Promise<GeneratedImage> {
    this.logger.info({ imageUrl, scale, provider }, 'Upscaling image');

    try {
      // Prefer Stability or Replicate for upscaling (DALL-E doesn't support it)
      const providerName =
        provider || (this.providers.has('stability') ? 'stability' : 'replicate');
      const imageProvider = this.getProvider(providerName);

      if (!imageProvider) {
        throw new Error('No suitable provider available for upscaling');
      }

      const upscaled = await imageProvider.upscale(imageUrl, scale);

      // Save to database
      await this.saveGeneratedImages([upscaled], {
        prompt: 'Image upscale',
        provider: providerName as any,
        size: upscaled.size as any,
        count: 1,
      });

      return upscaled;
    } catch (error: any) {
      this.logger.error({ error }, 'Failed to upscale image');
      throw error;
    }
  }

  /**
   * Apply style transfer
   */
  async applyStyle(
    imageUrl: string,
    style: string,
    provider?: string
  ): Promise<GeneratedImage> {
    this.logger.info({ imageUrl, style, provider }, 'Applying style transfer');

    try {
      const providerName =
        provider || (this.providers.has('stability') ? 'stability' : 'replicate');
      const imageProvider = this.getProvider(providerName);

      if (!imageProvider) {
        throw new Error('No suitable provider available for style transfer');
      }

      const styled = await imageProvider.applyStyle(imageUrl, style);

      // Save to database
      await this.saveGeneratedImages([styled], {
        prompt: `Style: ${style}`,
        provider: providerName as any,
        size: styled.size as any,
        count: 1,
      });

      return styled;
    } catch (error: any) {
      this.logger.error({ error }, 'Failed to apply style');
      throw error;
    }
  }

  /**
   * Enhance prompt using AI
   */
  async enhancePrompt(prompt: string): Promise<PromptEnhancementResult> {
    this.logger.info({ prompt }, 'Enhancing prompt with AI');

    if (!this.anthropic) {
      // Fallback: return original prompt with basic enhancements
      return {
        enhancedPrompt: `${prompt}, high quality, detailed, professional`,
        suggestions: [
          'Add more specific details',
          'Specify art style or medium',
          'Include lighting and mood',
        ],
        tags: [],
      };
    }

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `You are an expert at crafting prompts for AI image generation. Enhance this prompt to produce better results:

"${prompt}"

Provide:
1. An enhanced version of the prompt (more descriptive, specific, with artistic details)
2. 3-5 suggestions for alternative variations
3. Relevant tags/keywords

Format as JSON:
{
  "enhancedPrompt": "...",
  "suggestions": ["...", "..."],
  "tags": ["...", "..."]
}`,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        // Extract JSON from response
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          this.logger.info('Prompt enhanced successfully');
          return result;
        }
      }

      // Fallback
      return {
        enhancedPrompt: `${prompt}, high quality, detailed`,
        suggestions: [],
        tags: [],
      };
    } catch (error: any) {
      this.logger.error({ error }, 'Failed to enhance prompt');
      // Return original with basic enhancement
      return {
        enhancedPrompt: `${prompt}, high quality, detailed`,
        suggestions: [],
        tags: [],
      };
    }
  }

  /**
   * Analyze image and suggest improvements
   */
  async analyzeImage(imageUrl: string): Promise<ImageAnalysis> {
    this.logger.info({ imageUrl }, 'Analyzing image');

    if (!this.anthropic) {
      throw new Error('Anthropic API not configured for image analysis');
    }

    try {
      // Download and convert image to base64
      const imageBlob = await this.downloadImage(imageUrl);
      const base64Image = await this.blobToBase64(imageBlob);
      const mediaType = this.getMediaType(imageUrl);

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: `Analyze this image and provide:
1. A detailed description of what's in the image
2. Suggestions for improvements or variations
3. Detected main objects or subjects
4. Dominant colors
5. Overall style (e.g., realistic, cartoon, abstract)
6. Mood or atmosphere

Format as JSON:
{
  "description": "...",
  "suggestions": ["...", "..."],
  "detectedObjects": ["...", "..."],
  "dominantColors": ["...", "..."],
  "style": "...",
  "mood": "..."
}`,
              },
            ],
          },
        ],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          this.logger.info('Image analyzed successfully');
          return result;
        }
      }

      throw new Error('Failed to parse analysis result');
    } catch (error: any) {
      this.logger.error({ error }, 'Failed to analyze image');
      throw error;
    }
  }

  /**
   * Get generation history for a user
   */
  async getHistory(userId: string, limit = 50, offset = 0): Promise<any[]> {
    try {
      const result = await this.db.query(
        `SELECT * FROM generated_images
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      return result.rows;
    } catch (error: any) {
      this.logger.error({ error, userId }, 'Failed to get history');
      throw error;
    }
  }

  /**
   * Delete an image
   */
  async deleteImage(imageId: string, userId?: string): Promise<boolean> {
    try {
      const query = userId
        ? 'DELETE FROM generated_images WHERE id = $1 AND user_id = $2'
        : 'DELETE FROM generated_images WHERE id = $1';

      const params = userId ? [imageId, userId] : [imageId];
      const result = await this.db.query(query, params);

      return (result.rowCount || 0) > 0;
    } catch (error: any) {
      this.logger.error({ error, imageId }, 'Failed to delete image');
      throw error;
    }
  }

  /**
   * Get provider statistics
   */
  async getProviderStats(): Promise<any> {
    try {
      const result = await this.db.query(
        `SELECT * FROM provider_performance ORDER BY total_requests DESC`
      );

      return result.rows;
    } catch (error: any) {
      this.logger.error({ error }, 'Failed to get provider stats');
      throw error;
    }
  }

  // Helper methods

  private getProvider(name: string): ImageProvider | undefined {
    return this.providers.get(name);
  }

  private selectProviderForEdit(editType: string): string {
    switch (editType) {
      case 'upscale':
        return this.providers.has('stability') ? 'stability' : 'replicate';
      case 'style-transfer':
        return this.providers.has('stability') ? 'stability' : 'replicate';
      case 'inpaint':
      case 'outpaint':
        return this.providers.has('stability') ? 'stability' : 'replicate';
      case 'variation':
        return this.defaultProvider;
      default:
        return this.defaultProvider;
    }
  }

  private async saveGeneratedImages(
    images: GeneratedImage[],
    request: ImageGenerationRequest
  ): Promise<void> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      for (const image of images) {
        await client.query(
          `INSERT INTO generated_images (
            id, prompt, revised_prompt, provider, model, size, quality, style,
            seed, url, status, metadata, created_at, completed_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            uuidv4(),
            image.prompt,
            image.revisedPrompt || null,
            image.provider,
            image.model,
            image.size,
            image.quality || null,
            image.style || null,
            image.seed || null,
            image.url,
            'completed',
            JSON.stringify(image.metadata || {}),
            image.createdAt,
            new Date(),
          ]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async downloadImage(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    return await response.blob();
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private getMediaType(url: string): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
    const ext = url.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/png';
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
}
