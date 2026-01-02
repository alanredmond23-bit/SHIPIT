import OpenAI from 'openai';
import { Logger } from 'pino';
import {
  ImageGenerationRequest,
  ImageEditRequest,
  GeneratedImage,
  ImageProvider,
  ProviderConfig,
} from './types';

export interface DalleConfig extends ProviderConfig {
  apiKey: string;
  organization?: string;
  maxRetries?: number;
  timeout?: number;
}

export class DalleProvider implements ImageProvider {
  private client: OpenAI;
  private logger: Logger;
  private config: DalleConfig;

  // Rate limiting
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;
  private lastRequestTime = 0;
  private minRequestInterval = 1000; // 1 second between requests

  // Cost tracking (as of 2024)
  private readonly costs = {
    'dall-e-3': {
      'standard': {
        '1024x1024': 0.040,
        '1024x1792': 0.080,
        '1792x1024': 0.080,
      },
      'hd': {
        '1024x1024': 0.080,
        '1024x1792': 0.120,
        '1792x1024': 0.120,
      },
    },
    'dall-e-2': {
      'standard': {
        '256x256': 0.016,
        '512x512': 0.018,
        '1024x1024': 0.020,
      },
    },
  };

  constructor(config: DalleConfig, logger: Logger) {
    this.config = config;
    this.logger = logger.child({ provider: 'dalle' });

    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organization,
      maxRetries: config.maxRetries || 3,
      timeout: config.timeout || 60000,
    });

    this.logger.info('DALL-E provider initialized');
  }

  async generate(request: ImageGenerationRequest): Promise<GeneratedImage[]> {
    const startTime = Date.now();
    this.logger.info({ request }, 'Generating images with DALL-E');

    try {
      // Validate request
      this.validateGenerationRequest(request);

      // Use DALL-E 3 by default
      const model = request.model || 'dall-e-3';

      // DALL-E 3 only supports n=1
      if (model === 'dall-e-3' && request.count > 1) {
        throw new Error('DALL-E 3 only supports generating 1 image at a time');
      }

      // Rate limit
      await this.rateLimit();

      // Call OpenAI API
      const response = await this.client.images.generate({
        model,
        prompt: request.prompt,
        n: request.count,
        size: this.mapSize(request.size, model),
        quality: request.quality || 'standard',
        style: this.mapStyle(request.style),
        response_format: 'url',
      });

      const generationTime = Date.now() - startTime;

      // Map response to our format
      const images: GeneratedImage[] = response.data.map((img, index) => {
        const cost = this.calculateCost(model, request.size, request.quality || 'standard');

        return {
          id: `dalle-${Date.now()}-${index}`,
          url: img.url!,
          prompt: request.prompt,
          revisedPrompt: img.revised_prompt || undefined,
          provider: 'dalle3',
          model,
          size: request.size,
          quality: request.quality,
          style: request.style,
          metadata: {
            generationTime,
            cost,
            revisedPrompt: img.revised_prompt,
          },
          createdAt: new Date(),
        };
      });

      this.logger.info(
        {
          count: images.length,
          generationTime,
          cost: images.reduce((sum, img) => sum + (img.metadata?.cost || 0), 0),
        },
        'Images generated successfully'
      );

      return images;
    } catch (error: any) {
      this.logger.error({ error, request }, 'Failed to generate images');
      throw new Error(`DALL-E generation failed: ${error.message}`);
    }
  }

  async edit(request: ImageEditRequest): Promise<GeneratedImage> {
    const startTime = Date.now();
    this.logger.info({ request }, 'Editing image with DALL-E');

    try {
      // DALL-E 3 doesn't support editing, fall back to DALL-E 2
      const model = 'dall-e-2';

      if (request.editType === 'upscale' || request.editType === 'style-transfer') {
        throw new Error(`DALL-E does not support ${request.editType}`);
      }

      // Download image
      const imageBlob = await this.downloadImage(request.imageUrl);
      const imageFile = new File([imageBlob], 'image.png', { type: 'image/png' });

      await this.rateLimit();

      let response;

      if (request.editType === 'inpaint' && request.mask) {
        // Inpainting with mask
        const maskBlob = await this.base64ToBlob(request.mask);
        const maskFile = new File([maskBlob], 'mask.png', { type: 'image/png' });

        response = await this.client.images.edit({
          model,
          image: imageFile,
          mask: maskFile,
          prompt: request.prompt,
          n: 1,
          size: '1024x1024',
        });
      } else if (request.editType === 'variation') {
        // Create variation
        response = await this.client.images.createVariation({
          model,
          image: imageFile,
          n: 1,
          size: '1024x1024',
        });
      } else {
        throw new Error(`Unsupported edit type: ${request.editType}`);
      }

      const generationTime = Date.now() - startTime;
      const cost = 0.020; // DALL-E 2 edit cost

      const result: GeneratedImage = {
        id: `dalle-edit-${Date.now()}`,
        url: response.data[0].url!,
        prompt: request.prompt,
        provider: 'dalle3',
        model,
        size: '1024x1024',
        metadata: {
          generationTime,
          cost,
          editType: request.editType,
          sourceImage: request.imageUrl,
        },
        createdAt: new Date(),
      };

      this.logger.info({ generationTime, cost }, 'Image edited successfully');
      return result;
    } catch (error: any) {
      this.logger.error({ error, request }, 'Failed to edit image');
      throw new Error(`DALL-E edit failed: ${error.message}`);
    }
  }

  async createVariations(imageUrl: string, count: number): Promise<GeneratedImage[]> {
    this.logger.info({ imageUrl, count }, 'Creating variations with DALL-E');

    try {
      const imageBlob = await this.downloadImage(imageUrl);
      const imageFile = new File([imageBlob], 'image.png', { type: 'image/png' });

      // DALL-E 2 for variations (DALL-E 3 doesn't support this)
      await this.rateLimit();

      const response = await this.client.images.createVariation({
        model: 'dall-e-2',
        image: imageFile,
        n: Math.min(count, 10), // Max 10
        size: '1024x1024',
      });

      const cost = 0.020; // Per variation

      return response.data.map((img, index) => ({
        id: `dalle-var-${Date.now()}-${index}`,
        url: img.url!,
        prompt: 'Image variation',
        provider: 'dalle3',
        model: 'dall-e-2',
        size: '1024x1024',
        metadata: {
          cost,
          sourceImage: imageUrl,
          variationType: 'dalle2',
        },
        createdAt: new Date(),
      }));
    } catch (error: any) {
      this.logger.error({ error }, 'Failed to create variations');
      throw new Error(`DALL-E variations failed: ${error.message}`);
    }
  }

  async upscale(imageUrl: string, scale: 2 | 4): Promise<GeneratedImage> {
    throw new Error('DALL-E does not support upscaling. Use Stability AI or Replicate instead.');
  }

  async applyStyle(imageUrl: string, style: string): Promise<GeneratedImage> {
    throw new Error(
      'DALL-E does not support style transfer. Use Stability AI or Replicate instead.'
    );
  }

  // Helper methods

  private validateGenerationRequest(request: ImageGenerationRequest): void {
    const model = request.model || 'dall-e-3';

    if (model === 'dall-e-3') {
      const validSizes = ['1024x1024', '1024x1792', '1792x1024'];
      if (!validSizes.includes(request.size)) {
        throw new Error(
          `Invalid size for DALL-E 3: ${request.size}. Valid sizes: ${validSizes.join(', ')}`
        );
      }

      if (request.count > 1) {
        throw new Error('DALL-E 3 only supports generating 1 image at a time');
      }
    } else if (model === 'dall-e-2') {
      const validSizes = ['256x256', '512x512', '1024x1024'];
      if (!validSizes.includes(request.size)) {
        throw new Error(
          `Invalid size for DALL-E 2: ${request.size}. Valid sizes: ${validSizes.join(', ')}`
        );
      }

      if (request.count > 10) {
        throw new Error('DALL-E 2 supports maximum 10 images per request');
      }
    }
  }

  private mapSize(
    size: string,
    model: string
  ): '256x256' | '512x512' | '1024x1024' | '1024x1792' | '1792x1024' {
    // Validate size based on model
    if (model === 'dall-e-3') {
      if (['1024x1024', '1024x1792', '1792x1024'].includes(size)) {
        return size as any;
      }
      return '1024x1024'; // Default
    } else {
      if (['256x256', '512x512', '1024x1024'].includes(size)) {
        return size as any;
      }
      return '1024x1024'; // Default
    }
  }

  private mapStyle(style?: string): 'natural' | 'vivid' | undefined {
    if (!style) return undefined;
    if (style === 'natural' || style === 'vivid') return style;
    // Map other styles to closest match
    if (style === 'photorealistic') return 'natural';
    if (style === 'anime' || style === 'digital-art') return 'vivid';
    return 'natural';
  }

  private calculateCost(model: string, size: string, quality: string): number {
    try {
      if (model === 'dall-e-3') {
        return this.costs['dall-e-3'][quality as 'standard' | 'hd'][size] || 0.040;
      } else if (model === 'dall-e-2') {
        return this.costs['dall-e-2']['standard'][size] || 0.020;
      }
      return 0;
    } catch {
      return 0;
    }
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      this.logger.debug({ waitTime }, 'Rate limiting...');
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  private async downloadImage(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    return await response.blob();
  }

  private async base64ToBlob(base64: string): Promise<Blob> {
    // Remove data URL prefix if present
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return new Blob([bytes], { type: 'image/png' });
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Simple check - list models
      const models = await this.client.models.list();
      return models.data.length > 0;
    } catch (error) {
      this.logger.error({ error }, 'Health check failed');
      return false;
    }
  }

  getName(): string {
    return 'dalle3';
  }

  getSupportedSizes(): string[] {
    return ['256x256', '512x512', '1024x1024', '1024x1792', '1792x1024'];
  }

  getSupportedModels(): string[] {
    return ['dall-e-2', 'dall-e-3'];
  }

  getCapabilities(): string[] {
    return ['generate', 'edit', 'variations'];
  }
}
