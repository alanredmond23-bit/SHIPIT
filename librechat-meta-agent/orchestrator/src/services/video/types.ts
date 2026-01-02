// Core types for video generation system

export interface VideoGenerationRequest {
  prompt: string;
  provider: 'runway' | 'pika' | 'stability' | 'replicate';
  model?: string;
  duration: 4 | 8 | 16; // seconds
  aspectRatio: '16:9' | '9:16' | '1:1';
  style?: string;
  motion?: 'slow' | 'medium' | 'fast';
  seed?: number;
  fps?: number; // Frames per second (default: 24)
  negativePrompt?: string;
}

export interface ImageToVideoRequest {
  imageUrl: string;
  prompt: string;
  provider: string;
  duration: number;
  motion: string;
  seed?: number;
  endImageUrl?: string; // For interpolation
}

export interface VideoExtendRequest {
  videoUrl: string;
  prompt: string;
  extendBy: number; // seconds
  provider?: string;
}

export interface VideoInterpolateRequest {
  startImageUrl: string;
  endImageUrl: string;
  frames: number;
  provider?: string;
}

export interface GeneratedVideo {
  id: string;
  url: string;
  thumbnailUrl: string;
  prompt: string;
  provider: string;
  model?: string;
  duration: number;
  aspectRatio: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  fps?: number;
  motion?: string;
  style?: string;
  seed?: number;
  sourceImageUrl?: string;
  sourceVideoUrl?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  completedAt?: Date;
}

export interface VideoProviderConfig {
  enabled: boolean;
  apiKey?: string;
  priority?: number;
  maxDuration?: number;
  supportedAspectRatios?: string[];
}

export interface VideoProvider {
  generateFromText(request: VideoGenerationRequest): Promise<GeneratedVideo>;
  generateFromImage(request: ImageToVideoRequest): Promise<GeneratedVideo>;
  extendVideo(request: VideoExtendRequest): Promise<GeneratedVideo>;
  interpolate(request: VideoInterpolateRequest): Promise<GeneratedVideo>;
  getStatus(videoId: string): Promise<GeneratedVideo>;
  cancelGeneration(videoId: string): Promise<boolean>;
  healthCheck(): Promise<boolean>;
  getName(): string;
  getSupportedDurations(): number[];
  getSupportedAspectRatios(): string[];
  getCapabilities(): string[];
}

export interface VideoProgressUpdate {
  videoId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  message?: string;
  estimatedTimeRemaining?: number; // seconds
  thumbnailUrl?: string;
  videoUrl?: string;
  errorMessage?: string;
}

export interface RunwayConfig extends VideoProviderConfig {
  apiKey: string;
  baseUrl?: string;
  model?: 'gen3' | 'gen3-turbo';
}

export interface PikaConfig extends VideoProviderConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface StabilityVideoConfig extends VideoProviderConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface ReplicateVideoConfig extends VideoProviderConfig {
  apiKey: string;
  defaultModel?: string;
}
