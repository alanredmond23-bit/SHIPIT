// Core types for image generation system

export interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  provider: 'dalle3' | 'stability' | 'replicate';
  model?: string;
  size: '256x256' | '512x512' | '1024x1024' | '1024x1792' | '1792x1024';
  quality?: 'standard' | 'hd';
  style?:
    | 'natural'
    | 'vivid'
    | 'anime'
    | 'photorealistic'
    | 'digital-art'
    | '3d-render'
    | string;
  count: number;
  seed?: number;
  steps?: number;
  cfgScale?: number;
  sampler?: string;
}

export interface ImageEditRequest {
  imageUrl: string;
  prompt: string;
  editType: 'inpaint' | 'outpaint' | 'variation' | 'upscale' | 'style-transfer';
  mask?: string; // Base64 mask for inpainting
  strength?: number; // 0.0-1.0
  negativePrompt?: string;
  seed?: number;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  revisedPrompt?: string;
  provider: string;
  model: string;
  size: string;
  quality?: string;
  style?: string;
  seed?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface ProviderConfig {
  enabled: boolean;
  priority?: number;
}

export interface ImageProvider {
  generate(request: ImageGenerationRequest): Promise<GeneratedImage[]>;
  edit(request: ImageEditRequest): Promise<GeneratedImage>;
  createVariations(imageUrl: string, count: number): Promise<GeneratedImage[]>;
  upscale(imageUrl: string, scale: 2 | 4): Promise<GeneratedImage>;
  applyStyle(imageUrl: string, style: string): Promise<GeneratedImage>;
  healthCheck(): Promise<boolean>;
  getName(): string;
  getSupportedSizes(): string[];
  getSupportedModels(): string[];
  getCapabilities(): string[];
}

export interface PromptEnhancementResult {
  enhancedPrompt: string;
  suggestions: string[];
  tags: string[];
}

export interface ImageAnalysis {
  description: string;
  suggestions: string[];
  detectedObjects: string[];
  dominantColors: string[];
  style: string;
  mood: string;
}
