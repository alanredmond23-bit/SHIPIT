import { Logger } from 'pino';
import {
  ImageGenerationRequest,
  ImageEditRequest,
  GeneratedImage,
  ImageProvider,
  ProviderConfig,
} from './types';

export interface StabilityConfig extends ProviderConfig {
  apiKey: string;
  baseUrl?: string;
}

interface StabilityApiResponse {
  artifacts: Array<{
    base64: string;
    seed: number;
    finishReason: string;
  }>;
}

export class StabilityProvider implements ImageProvider {
  private apiKey: string;
  private baseUrl: string;
  private logger: Logger;
  private config: StabilityConfig;

  // Available models
  private readonly models = {
    'stable-diffusion-xl-1024-v1-0': 'SDXL 1.0',
    'stable-diffusion-v1-6': 'SD 1.6',
    'stable-diffusion-xl-beta-v2-2-2': 'SDXL Beta',
  };

  // Supported samplers
  private readonly samplers = [
    'DDIM',
    'DDPM',
    'K_DPMPP_2M',
    'K_DPMPP_2S_ANCESTRAL',
    'K_DPM_2',
    'K_DPM_2_ANCESTRAL',
    'K_EULER',
    'K_EULER_ANCESTRAL',
    'K_HEUN',
    'K_LMS',
  ];

  // Style presets
  private readonly stylePresets = {
    'photorealistic': 'photographic',
    'anime': 'anime',
    'digital-art': 'digital-art',
    '3d-render': '3d-model',
    'natural': 'enhance',
    'vivid': 'cinematic',
  };

  // Cost per image (approximate, as of 2024)
  private readonly baseCost = 0.02; // $0.02 per image

  constructor(config: StabilityConfig, logger: Logger) {
    this.config = config;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.stability.ai';
    this.logger = logger.child({ provider: 'stability' });

    this.logger.info('Stability AI provider initialized');
  }

  async generate(request: ImageGenerationRequest): Promise<GeneratedImage[]> {
    const startTime = Date.now();
    this.logger.info({ request }, 'Generating images with Stability AI');

    try {
      const model = request.model || 'stable-diffusion-xl-1024-v1-0';
      const [width, height] = this.parseSize(request.size);

      const body = {
        text_prompts: [
          {
            text: request.prompt,
            weight: 1,
          },
          ...(request.negativePrompt
            ? [
                {
                  text: request.negativePrompt,
                  weight: -1,
                },
              ]
            : []),
        ],
        cfg_scale: request.cfgScale || 7,
        height,
        width,
        samples: request.count,
        steps: request.steps || 30,
        seed: request.seed || 0,
        sampler: request.sampler || 'K_DPMPP_2M',
        style_preset: this.mapStylePreset(request.style),
      };

      const response = await this.makeRequest<StabilityApiResponse>(
        `/v1/generation/${model}/text-to-image`,
        'POST',
        body
      );

      const generationTime = Date.now() - startTime;

      const images: GeneratedImage[] = response.artifacts.map((artifact, index) => {
        // Convert base64 to URL (you'll need to upload this to your storage)
        const imageData = `data:image/png;base64,${artifact.base64}`;

        return {
          id: `stability-${Date.now()}-${index}`,
          url: imageData, // This should be uploaded to storage and replaced with actual URL
          prompt: request.prompt,
          provider: 'stability',
          model,
          size: request.size,
          style: request.style,
          seed: artifact.seed,
          metadata: {
            generationTime,
            cost: this.baseCost,
            finishReason: artifact.finishReason,
            cfgScale: request.cfgScale,
            steps: request.steps,
            sampler: request.sampler,
            negativePrompt: request.negativePrompt,
          },
          createdAt: new Date(),
        };
      });

      this.logger.info(
        {
          count: images.length,
          generationTime,
          cost: images.length * this.baseCost,
        },
        'Images generated successfully'
      );

      return images;
    } catch (error: any) {
      this.logger.error({ error, request }, 'Failed to generate images');
      throw new Error(`Stability AI generation failed: ${error.message}`);
    }
  }

  async edit(request: ImageEditRequest): Promise<GeneratedImage> {
    const startTime = Date.now();
    this.logger.info({ request }, 'Editing image with Stability AI');

    try {
      const model = 'stable-diffusion-xl-1024-v1-0';

      if (request.editType === 'upscale') {
        return await this.upscale(request.imageUrl, 2);
      }

      if (request.editType === 'style-transfer') {
        return await this.applyStyle(request.imageUrl, request.prompt);
      }

      // Image-to-image or inpainting
      const imageBlob = await this.downloadImage(request.imageUrl);
      const imageBase64 = await this.blobToBase64(imageBlob);

      const formData = new FormData();
      formData.append('init_image', imageBase64);
      formData.append('init_image_mode', 'IMAGE_STRENGTH');
      formData.append('image_strength', (request.strength || 0.35).toString());
      formData.append('text_prompts[0][text]', request.prompt);
      formData.append('text_prompts[0][weight]', '1');
      formData.append('cfg_scale', '7');
      formData.append('samples', '1');
      formData.append('steps', (request.seed ? '50' : '30').toString());

      if (request.negativePrompt) {
        formData.append('text_prompts[1][text]', request.negativePrompt);
        formData.append('text_prompts[1][weight]', '-1');
      }

      if (request.seed) {
        formData.append('seed', request.seed.toString());
      }

      // For inpainting
      if (request.editType === 'inpaint' && request.mask) {
        const maskBlob = await this.base64ToBlob(request.mask);
        const maskBase64 = await this.blobToBase64(maskBlob);
        formData.append('mask_source', 'MASK_IMAGE_WHITE');
        formData.append('mask_image', maskBase64);
      }

      const endpoint =
        request.editType === 'inpaint'
          ? `/v1/generation/${model}/image-to-image/masking`
          : `/v1/generation/${model}/image-to-image`;

      const response = await this.makeRequest<StabilityApiResponse>(
        endpoint,
        'POST',
        formData,
        true
      );

      const generationTime = Date.now() - startTime;
      const imageData = `data:image/png;base64,${response.artifacts[0].base64}`;

      const result: GeneratedImage = {
        id: `stability-edit-${Date.now()}`,
        url: imageData,
        prompt: request.prompt,
        provider: 'stability',
        model,
        size: '1024x1024',
        seed: response.artifacts[0].seed,
        metadata: {
          generationTime,
          cost: this.baseCost,
          editType: request.editType,
          sourceImage: request.imageUrl,
          strength: request.strength,
          finishReason: response.artifacts[0].finishReason,
        },
        createdAt: new Date(),
      };

      this.logger.info({ generationTime }, 'Image edited successfully');
      return result;
    } catch (error: any) {
      this.logger.error({ error, request }, 'Failed to edit image');
      throw new Error(`Stability AI edit failed: ${error.message}`);
    }
  }

  async createVariations(imageUrl: string, count: number): Promise<GeneratedImage[]> {
    this.logger.info({ imageUrl, count }, 'Creating variations with Stability AI');

    try {
      const imageBlob = await this.downloadImage(imageUrl);
      const imageBase64 = await this.blobToBase64(imageBlob);

      const variations: GeneratedImage[] = [];

      for (let i = 0; i < count; i++) {
        const formData = new FormData();
        formData.append('init_image', imageBase64);
        formData.append('init_image_mode', 'IMAGE_STRENGTH');
        formData.append('image_strength', '0.4'); // More variation
        formData.append('text_prompts[0][text]', 'enhance and vary this image');
        formData.append('text_prompts[0][weight]', '1');
        formData.append('cfg_scale', '7');
        formData.append('samples', '1');
        formData.append('steps', '30');

        const response = await this.makeRequest<StabilityApiResponse>(
          '/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image',
          'POST',
          formData,
          true
        );

        const imageData = `data:image/png;base64,${response.artifacts[0].base64}`;

        variations.push({
          id: `stability-var-${Date.now()}-${i}`,
          url: imageData,
          prompt: 'Image variation',
          provider: 'stability',
          model: 'stable-diffusion-xl-1024-v1-0',
          size: '1024x1024',
          seed: response.artifacts[0].seed,
          metadata: {
            cost: this.baseCost,
            sourceImage: imageUrl,
            variationType: 'stability',
          },
          createdAt: new Date(),
        });

        // Small delay between requests
        if (i < count - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      return variations;
    } catch (error: any) {
      this.logger.error({ error }, 'Failed to create variations');
      throw new Error(`Stability AI variations failed: ${error.message}`);
    }
  }

  async upscale(imageUrl: string, scale: 2 | 4): Promise<GeneratedImage> {
    const startTime = Date.now();
    this.logger.info({ imageUrl, scale }, 'Upscaling image with Stability AI');

    try {
      const imageBlob = await this.downloadImage(imageUrl);
      const imageBase64 = await this.blobToBase64(imageBlob);

      const formData = new FormData();
      formData.append('image', imageBase64);

      // Use Real-ESRGAN for upscaling
      const endpoint =
        scale === 4
          ? '/v1/generation/esrgan-v1-x2plus/image-to-image/upscale'
          : '/v1/generation/esrgan-v1-x2plus/image-to-image/upscale';

      const response = await this.makeRequest<StabilityApiResponse>(
        endpoint,
        'POST',
        formData,
        true
      );

      const generationTime = Date.now() - startTime;
      const imageData = `data:image/png;base64,${response.artifacts[0].base64}`;

      const result: GeneratedImage = {
        id: `stability-upscale-${Date.now()}`,
        url: imageData,
        prompt: 'Image upscale',
        provider: 'stability',
        model: 'esrgan-v1-x2plus',
        size: `upscaled-${scale}x`,
        metadata: {
          generationTime,
          cost: this.baseCost * 1.5,
          sourceImage: imageUrl,
          upscaleMethod: 'esrgan',
          scale,
        },
        createdAt: new Date(),
      };

      this.logger.info({ generationTime }, 'Image upscaled successfully');
      return result;
    } catch (error: any) {
      this.logger.error({ error }, 'Failed to upscale image');
      throw new Error(`Stability AI upscale failed: ${error.message}`);
    }
  }

  async applyStyle(imageUrl: string, stylePrompt: string): Promise<GeneratedImage> {
    this.logger.info({ imageUrl, stylePrompt }, 'Applying style transfer');

    try {
      const imageBlob = await this.downloadImage(imageUrl);
      const imageBase64 = await this.blobToBase64(imageBlob);

      const formData = new FormData();
      formData.append('init_image', imageBase64);
      formData.append('init_image_mode', 'IMAGE_STRENGTH');
      formData.append('image_strength', '0.5');
      formData.append('text_prompts[0][text]', `in the style of ${stylePrompt}`);
      formData.append('text_prompts[0][weight]', '1');
      formData.append('cfg_scale', '8');
      formData.append('samples', '1');
      formData.append('steps', '40');

      const response = await this.makeRequest<StabilityApiResponse>(
        '/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image',
        'POST',
        formData,
        true
      );

      const imageData = `data:image/png;base64,${response.artifacts[0].base64}`;

      const result: GeneratedImage = {
        id: `stability-style-${Date.now()}`,
        url: imageData,
        prompt: `Style: ${stylePrompt}`,
        provider: 'stability',
        model: 'stable-diffusion-xl-1024-v1-0',
        size: '1024x1024',
        seed: response.artifacts[0].seed,
        metadata: {
          cost: this.baseCost,
          sourceImage: imageUrl,
          styleTransfer: stylePrompt,
        },
        createdAt: new Date(),
      };

      return result;
    } catch (error: any) {
      this.logger.error({ error }, 'Failed to apply style');
      throw new Error(`Stability AI style transfer failed: ${error.message}`);
    }
  }

  // Helper methods

  private parseSize(size: string): [number, number] {
    const [width, height] = size.split('x').map(Number);
    return [width, height];
  }

  private mapStylePreset(style?: string): string | undefined {
    if (!style) return undefined;
    return this.stylePresets[style as keyof typeof this.stylePresets] || undefined;
  }

  private async makeRequest<T>(
    endpoint: string,
    method: string,
    body?: any,
    isFormData = false
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: 'application/json',
    };

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const options: RequestInit = {
      method,
      headers,
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    };

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error({ status: response.status, errorText }, 'API request failed');
      throw new Error(`Stability AI API error: ${response.statusText} - ${errorText}`);
    }

    return await response.json();
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

  private async base64ToBlob(base64: string): Promise<Blob> {
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
      const response = await fetch(`${this.baseUrl}/v1/user/balance`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch (error) {
      this.logger.error({ error }, 'Health check failed');
      return false;
    }
  }

  getName(): string {
    return 'stability';
  }

  getSupportedSizes(): string[] {
    return ['512x512', '768x768', '1024x1024', '1536x1536', '1024x1792', '1792x1024'];
  }

  getSupportedModels(): string[] {
    return Object.keys(this.models);
  }

  getCapabilities(): string[] {
    return ['generate', 'edit', 'variations', 'upscale', 'style-transfer', 'inpaint'];
  }
}
