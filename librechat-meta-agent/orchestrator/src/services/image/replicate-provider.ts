import { Logger } from 'pino';
import {
  ImageGenerationRequest,
  ImageEditRequest,
  GeneratedImage,
  ImageProvider,
  ProviderConfig,
} from './types';

export interface ReplicateConfig extends ProviderConfig {
  apiKey: string;
  baseUrl?: string;
}

interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: any;
  error?: string;
  logs?: string;
  metrics?: {
    predict_time?: number;
  };
}

export class ReplicateProvider implements ImageProvider {
  private apiKey: string;
  private baseUrl: string;
  private logger: Logger;
  private config: ReplicateConfig;

  // Popular models on Replicate
  private readonly models = {
    'sdxl': 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
    'sdxl-lightning':
      'bytedance/sdxl-lightning-4step:5599ed30703defd1d160a25a63321b4dec97101d98b4674bcc56e41f62f35637',
    'playground-v2.5':
      'playgroundai/playground-v2.5-1024px-aesthetic:a45f82a1382bed5c7aeb861dac7c7d191b0fdf74d8d57c4a0e6ed7d4d0bf7d24',
    'kandinsky-2.2':
      'ai-forever/kandinsky-2.2:ad9d7879fbffa2874e1d909d1d37d9bc682889cc65b31f7bb00d2362619f194a',
    'flux-dev': 'black-forest-labs/flux-dev:c5d68f4e42e19210bfc1dd2c8ecd8c38f3c60e39a55a29087f607f03a6e44bcd',
    'flux-schnell':
      'black-forest-labs/flux-schnell:bf82f5d14e0c37b838d305e1baa6379e5a831b7f17c28d1fca8c2e2c8e5cfd73',
  };

  // Estimate costs (Replicate charges per second of compute)
  private readonly baseCostPerSecond = 0.00055; // Approximate

  constructor(config: ReplicateConfig, logger: Logger) {
    this.config = config;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.replicate.com/v1';
    this.logger = logger.child({ provider: 'replicate' });

    this.logger.info('Replicate provider initialized');
  }

  async generate(request: ImageGenerationRequest): Promise<GeneratedImage[]> {
    const startTime = Date.now();
    this.logger.info({ request }, 'Generating images with Replicate');

    try {
      const modelId = this.getModelId(request.model || 'sdxl');
      const [width, height] = this.parseSize(request.size);

      // Build input based on model
      const input: Record<string, any> = {
        prompt: request.prompt,
        width,
        height,
        num_outputs: request.count || 1,
      };

      // Add optional parameters
      if (request.negativePrompt) {
        input.negative_prompt = request.negativePrompt;
      }

      if (request.seed !== undefined) {
        input.seed = request.seed;
      }

      if (request.steps) {
        input.num_inference_steps = request.steps;
      }

      if (request.cfgScale) {
        input.guidance_scale = request.cfgScale;
      }

      if (request.sampler) {
        input.scheduler = request.sampler;
      }

      // Create prediction
      const prediction = await this.createPrediction(modelId, input);

      // Wait for completion
      const completed = await this.waitForPrediction(prediction.id);

      if (completed.status === 'failed') {
        throw new Error(completed.error || 'Prediction failed');
      }

      const generationTime = Date.now() - startTime;
      const predictTime = completed.metrics?.predict_time || generationTime / 1000;
      const cost = this.estimateCost(predictTime);

      // Parse output (can be array of URLs or single URL)
      const outputs = Array.isArray(completed.output)
        ? completed.output
        : [completed.output];

      const images: GeneratedImage[] = outputs.map((url: string, index: number) => ({
        id: `replicate-${Date.now()}-${index}`,
        url,
        prompt: request.prompt,
        provider: 'replicate',
        model: request.model || 'sdxl',
        size: request.size,
        style: request.style,
        seed: request.seed,
        metadata: {
          generationTime,
          cost,
          predictionId: prediction.id,
          predictTime,
          logs: completed.logs,
        },
        createdAt: new Date(),
      }));

      this.logger.info(
        {
          count: images.length,
          generationTime,
          cost,
        },
        'Images generated successfully'
      );

      return images;
    } catch (error: any) {
      this.logger.error({ error, request }, 'Failed to generate images');
      throw new Error(`Replicate generation failed: ${error.message}`);
    }
  }

  async edit(request: ImageEditRequest): Promise<GeneratedImage> {
    const startTime = Date.now();
    this.logger.info({ request }, 'Editing image with Replicate');

    try {
      if (request.editType === 'upscale') {
        return await this.upscale(request.imageUrl, 2);
      }

      if (request.editType === 'style-transfer') {
        return await this.applyStyle(request.imageUrl, request.prompt);
      }

      // Image-to-image or inpainting
      let modelId: string;
      const input: Record<string, any> = {
        prompt: request.prompt,
        image: request.imageUrl,
      };

      if (request.editType === 'inpaint' && request.mask) {
        // Use inpainting model
        modelId =
          'stability-ai/stable-diffusion-inpainting:95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68b3';
        input.mask = request.mask;
      } else {
        // Image-to-image
        modelId = this.getModelId('sdxl');
        input.prompt_strength = request.strength || 0.8;
      }

      if (request.negativePrompt) {
        input.negative_prompt = request.negativePrompt;
      }

      if (request.seed !== undefined) {
        input.seed = request.seed;
      }

      const prediction = await this.createPrediction(modelId, input);
      const completed = await this.waitForPrediction(prediction.id);

      if (completed.status === 'failed') {
        throw new Error(completed.error || 'Prediction failed');
      }

      const generationTime = Date.now() - startTime;
      const predictTime = completed.metrics?.predict_time || generationTime / 1000;
      const cost = this.estimateCost(predictTime);

      const outputUrl = Array.isArray(completed.output)
        ? completed.output[0]
        : completed.output;

      const result: GeneratedImage = {
        id: `replicate-edit-${Date.now()}`,
        url: outputUrl,
        prompt: request.prompt,
        provider: 'replicate',
        model: 'sdxl',
        size: '1024x1024',
        metadata: {
          generationTime,
          cost,
          editType: request.editType,
          sourceImage: request.imageUrl,
          strength: request.strength,
          predictionId: prediction.id,
        },
        createdAt: new Date(),
      };

      this.logger.info({ generationTime }, 'Image edited successfully');
      return result;
    } catch (error: any) {
      this.logger.error({ error, request }, 'Failed to edit image');
      throw new Error(`Replicate edit failed: ${error.message}`);
    }
  }

  async createVariations(imageUrl: string, count: number): Promise<GeneratedImage[]> {
    this.logger.info({ imageUrl, count }, 'Creating variations with Replicate');

    try {
      const variations: GeneratedImage[] = [];

      for (let i = 0; i < count; i++) {
        const modelId = this.getModelId('sdxl');
        const input = {
          image: imageUrl,
          prompt: 'enhance and create a variation of this image, maintaining the original style',
          prompt_strength: 0.6,
          num_outputs: 1,
        };

        const prediction = await this.createPrediction(modelId, input);
        const completed = await this.waitForPrediction(prediction.id);

        if (completed.status === 'succeeded') {
          const outputUrl = Array.isArray(completed.output)
            ? completed.output[0]
            : completed.output;
          const predictTime = completed.metrics?.predict_time || 0;

          variations.push({
            id: `replicate-var-${Date.now()}-${i}`,
            url: outputUrl,
            prompt: 'Image variation',
            provider: 'replicate',
            model: 'sdxl',
            size: '1024x1024',
            metadata: {
              cost: this.estimateCost(predictTime),
              sourceImage: imageUrl,
              variationType: 'replicate',
              predictionId: prediction.id,
            },
            createdAt: new Date(),
          });
        }

        // Small delay between requests
        if (i < count - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      return variations;
    } catch (error: any) {
      this.logger.error({ error }, 'Failed to create variations');
      throw new Error(`Replicate variations failed: ${error.message}`);
    }
  }

  async upscale(imageUrl: string, scale: 2 | 4): Promise<GeneratedImage> {
    const startTime = Date.now();
    this.logger.info({ imageUrl, scale }, 'Upscaling image with Replicate');

    try {
      // Use Real-ESRGAN for upscaling
      const modelId =
        scale === 4
          ? 'nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b'
          : 'nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b';

      const input = {
        image: imageUrl,
        scale,
        face_enhance: false,
      };

      const prediction = await this.createPrediction(modelId, input);
      const completed = await this.waitForPrediction(prediction.id);

      if (completed.status === 'failed') {
        throw new Error(completed.error || 'Upscaling failed');
      }

      const generationTime = Date.now() - startTime;
      const predictTime = completed.metrics?.predict_time || generationTime / 1000;

      const result: GeneratedImage = {
        id: `replicate-upscale-${Date.now()}`,
        url: completed.output,
        prompt: 'Image upscale',
        provider: 'replicate',
        model: 'real-esrgan',
        size: `upscaled-${scale}x`,
        metadata: {
          generationTime,
          cost: this.estimateCost(predictTime),
          sourceImage: imageUrl,
          upscaleMethod: 'real-esrgan',
          scale,
          predictionId: prediction.id,
        },
        createdAt: new Date(),
      };

      this.logger.info({ generationTime }, 'Image upscaled successfully');
      return result;
    } catch (error: any) {
      this.logger.error({ error }, 'Failed to upscale image');
      throw new Error(`Replicate upscale failed: ${error.message}`);
    }
  }

  async applyStyle(imageUrl: string, stylePrompt: string): Promise<GeneratedImage> {
    this.logger.info({ imageUrl, stylePrompt }, 'Applying style transfer');

    try {
      const modelId = this.getModelId('sdxl');
      const input = {
        image: imageUrl,
        prompt: `in the style of ${stylePrompt}, high quality, detailed`,
        prompt_strength: 0.7,
        num_inference_steps: 50,
      };

      const prediction = await this.createPrediction(modelId, input);
      const completed = await this.waitForPrediction(prediction.id);

      if (completed.status === 'failed') {
        throw new Error(completed.error || 'Style transfer failed');
      }

      const outputUrl = Array.isArray(completed.output)
        ? completed.output[0]
        : completed.output;
      const predictTime = completed.metrics?.predict_time || 0;

      const result: GeneratedImage = {
        id: `replicate-style-${Date.now()}`,
        url: outputUrl,
        prompt: `Style: ${stylePrompt}`,
        provider: 'replicate',
        model: 'sdxl',
        size: '1024x1024',
        metadata: {
          cost: this.estimateCost(predictTime),
          sourceImage: imageUrl,
          styleTransfer: stylePrompt,
          predictionId: prediction.id,
        },
        createdAt: new Date(),
      };

      return result;
    } catch (error: any) {
      this.logger.error({ error }, 'Failed to apply style');
      throw new Error(`Replicate style transfer failed: ${error.message}`);
    }
  }

  // Helper methods

  private getModelId(model: string): string {
    return this.models[model as keyof typeof this.models] || this.models.sdxl;
  }

  private parseSize(size: string): [number, number] {
    const [width, height] = size.split('x').map(Number);
    return [width, height];
  }

  private estimateCost(predictTimeSeconds: number): number {
    // Replicate charges per second, with minimum charge
    const minCost = 0.001;
    const calculatedCost = predictTimeSeconds * this.baseCostPerSecond;
    return Math.max(minCost, calculatedCost);
  }

  private async createPrediction(
    modelVersion: string,
    input: Record<string, any>
  ): Promise<ReplicatePrediction> {
    const url = `${this.baseUrl}/predictions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Token ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: modelVersion,
        input,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error({ status: response.status, errorText }, 'Failed to create prediction');
      throw new Error(`Replicate API error: ${response.statusText}`);
    }

    return await response.json();
  }

  private async waitForPrediction(
    predictionId: string,
    maxWaitTime = 300000
  ): Promise<ReplicatePrediction> {
    const startTime = Date.now();
    const pollInterval = 1000; // 1 second

    while (Date.now() - startTime < maxWaitTime) {
      const prediction = await this.getPrediction(predictionId);

      if (prediction.status === 'succeeded' || prediction.status === 'failed') {
        return prediction;
      }

      if (prediction.status === 'canceled') {
        throw new Error('Prediction was canceled');
      }

      // Wait before polling again
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error('Prediction timed out');
  }

  private async getPrediction(predictionId: string): Promise<ReplicatePrediction> {
    const url = `${this.baseUrl}/predictions/${predictionId}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Token ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error({ status: response.status, errorText }, 'Failed to get prediction');
      throw new Error(`Replicate API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Simple check - try to create a very basic prediction
      const response = await fetch(`${this.baseUrl}/predictions`, {
        method: 'HEAD',
        headers: {
          Authorization: `Token ${this.apiKey}`,
        },
      });
      return response.ok || response.status === 405; // 405 Method Not Allowed is okay for HEAD
    } catch (error) {
      this.logger.error({ error }, 'Health check failed');
      return false;
    }
  }

  getName(): string {
    return 'replicate';
  }

  getSupportedSizes(): string[] {
    return [
      '512x512',
      '768x768',
      '1024x1024',
      '1536x1536',
      '1024x1792',
      '1792x1024',
      '512x768',
      '768x512',
    ];
  }

  getSupportedModels(): string[] {
    return Object.keys(this.models);
  }

  getCapabilities(): string[] {
    return ['generate', 'edit', 'variations', 'upscale', 'style-transfer', 'inpaint'];
  }
}
