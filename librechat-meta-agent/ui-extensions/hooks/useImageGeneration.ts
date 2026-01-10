'use client';

import { useState, useCallback, useRef } from 'react';

/**
 * Generated image interface
 */
export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  revisedPrompt?: string;
  provider: string;
  model: string;
  size: string;
  style?: string;
  seed?: number;
  createdAt: Date;
  isFavorite?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Image generation provider
 */
export type ImageProvider = 'dalle3' | 'stability' | 'replicate';

/**
 * Image generation style preset
 */
export type ImageStyle = 'natural' | 'vivid' | 'photorealistic' | 'anime' | 'digital-art' | '3d-render';

/**
 * Image size options
 */
export type ImageSize = '256x256' | '512x512' | '1024x1024' | '1024x1792' | '1792x1024';

/**
 * Image generation request
 */
export interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  provider?: ImageProvider;
  size?: ImageSize;
  quality?: 'standard' | 'hd';
  style?: ImageStyle;
  count?: number;
  seed?: number;
  steps?: number;
  cfgScale?: number;
}

/**
 * Image generation status
 */
export type GenerationStatus = 'idle' | 'generating' | 'enhancing' | 'success' | 'error';

/**
 * Generation error
 */
export interface GenerationError {
  code: string;
  message: string;
  provider?: string;
}

/**
 * Cost tracking
 */
export interface GenerationCost {
  provider: string;
  size: string;
  quality: string;
  count: number;
  estimatedCost: number;
  currency: string;
}

/**
 * Hook options
 */
export interface UseImageGenerationOptions {
  apiUrl?: string;
  userId?: string;
  onGenerate?: (images: GeneratedImage[]) => void;
  onError?: (error: GenerationError) => void;
  maxHistorySize?: number;
}

/**
 * Hook return type
 */
export interface UseImageGenerationReturn {
  // State
  status: GenerationStatus;
  images: GeneratedImage[];
  history: GeneratedImage[];
  error: GenerationError | null;
  currentRequest: ImageGenerationRequest | null;
  estimatedCost: GenerationCost | null;

  // Actions
  generate: (request: ImageGenerationRequest) => Promise<GeneratedImage[]>;
  enhancePrompt: (prompt: string) => Promise<string>;
  createVariations: (imageUrl: string, count?: number) => Promise<GeneratedImage[]>;
  upscale: (imageUrl: string, scale?: number) => Promise<GeneratedImage>;
  clearImages: () => void;
  clearHistory: () => void;
  toggleFavorite: (imageId: string) => void;
  deleteImage: (imageId: string) => void;
  downloadImage: (image: GeneratedImage) => Promise<void>;
  shareImage: (image: GeneratedImage) => Promise<void>;
  estimateCost: (request: ImageGenerationRequest) => GenerationCost;

  // Refs
  abortController: React.RefObject<AbortController | null>;
}

// Cost estimates per image by provider and quality
const COST_ESTIMATES: Record<string, Record<string, number>> = {
  dalle3: {
    'standard:1024x1024': 0.04,
    'standard:1024x1792': 0.08,
    'standard:1792x1024': 0.08,
    'hd:1024x1024': 0.08,
    'hd:1024x1792': 0.12,
    'hd:1792x1024': 0.12,
  },
  stability: {
    'standard:512x512': 0.018,
    'standard:1024x1024': 0.036,
    'hd:512x512': 0.03,
    'hd:1024x1024': 0.06,
  },
  replicate: {
    'standard:512x512': 0.02,
    'standard:1024x1024': 0.04,
    'hd:512x512': 0.03,
    'hd:1024x1024': 0.06,
  },
};

/**
 * useImageGeneration - Comprehensive image generation hook
 * Manages image generation, history, and state
 */
export function useImageGeneration(options: UseImageGenerationOptions = {}): UseImageGenerationReturn {
  const {
    apiUrl = '/api/images',
    userId = 'default-user',
    onGenerate,
    onError,
    maxHistorySize = 50,
  } = options;

  // State
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState<GenerationError | null>(null);
  const [currentRequest, setCurrentRequest] = useState<ImageGenerationRequest | null>(null);
  const [estimatedCostState, setEstimatedCostState] = useState<GenerationCost | null>(null);

  // Refs
  const abortController = useRef<AbortController | null>(null);

  /**
   * Estimate cost for generation
   */
  const estimateCost = useCallback((request: ImageGenerationRequest): GenerationCost => {
    const provider = request.provider || 'dalle3';
    const quality = request.quality || 'standard';
    const size = request.size || '1024x1024';
    const count = request.count || 1;

    const key = `${quality}:${size}`;
    const providerCosts = COST_ESTIMATES[provider] || COST_ESTIMATES.dalle3;
    const perImageCost = providerCosts[key] || 0.04;

    return {
      provider,
      size,
      quality,
      count,
      estimatedCost: Math.round(perImageCost * count * 100) / 100,
      currency: 'USD',
    };
  }, []);

  /**
   * Generate images
   */
  const generate = useCallback(async (request: ImageGenerationRequest): Promise<GeneratedImage[]> => {
    setStatus('generating');
    setError(null);
    setCurrentRequest(request);
    setEstimatedCostState(estimateCost(request));

    // Create abort controller
    abortController.current = new AbortController();

    try {
      const response = await fetch(`${apiUrl}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...request,
          userId,
        }),
        signal: abortController.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          code: `HTTP_${response.status}`,
          message: errorData.error?.message || `HTTP error ${response.status}`,
          provider: request.provider,
        };
      }

      const data = await response.json();

      if (!data.success) {
        throw {
          code: data.error?.code || 'GENERATION_FAILED',
          message: data.error?.message || 'Image generation failed',
          provider: request.provider,
        };
      }

      const generatedImages: GeneratedImage[] = data.images.map((img: any) => ({
        id: img.id || Math.random().toString(36).substring(7),
        url: img.url,
        prompt: request.prompt,
        revisedPrompt: img.revised_prompt,
        provider: request.provider || 'dalle3',
        model: img.model || 'unknown',
        size: request.size || '1024x1024',
        style: request.style,
        seed: img.seed,
        createdAt: new Date(),
        isFavorite: false,
        metadata: img.metadata,
      }));

      setImages(generatedImages);

      // Add to history
      setHistory(prev => {
        const newHistory = [...generatedImages, ...prev].slice(0, maxHistorySize);
        return newHistory;
      });

      setStatus('success');
      onGenerate?.(generatedImages);

      return generatedImages;
    } catch (err: any) {
      const genError: GenerationError = {
        code: err.code || 'UNKNOWN_ERROR',
        message: err.message || 'An unexpected error occurred',
        provider: err.provider || request.provider,
      };

      setError(genError);
      setStatus('error');
      onError?.(genError);

      throw genError;
    } finally {
      setCurrentRequest(null);
      abortController.current = null;
    }
  }, [apiUrl, userId, maxHistorySize, estimateCost, onGenerate, onError]);

  /**
   * Enhance prompt with AI
   */
  const enhancePrompt = useCallback(async (prompt: string): Promise<string> => {
    setStatus('enhancing');

    try {
      const response = await fetch(`${apiUrl}/enhance-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error('Failed to enhance prompt');
      }

      const data = await response.json();
      setStatus('idle');

      return data.enhancedPrompt || prompt;
    } catch (err) {
      setStatus('idle');
      throw err;
    }
  }, [apiUrl]);

  /**
   * Create variations of an image
   */
  const createVariations = useCallback(async (
    imageUrl: string,
    count: number = 4
  ): Promise<GeneratedImage[]> => {
    setStatus('generating');
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/variations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          count,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create variations');
      }

      const data = await response.json();

      if (!data.success) {
        throw {
          code: data.error?.code || 'VARIATION_FAILED',
          message: data.error?.message || 'Variation creation failed',
        };
      }

      const variations: GeneratedImage[] = data.variations.map((img: any) => ({
        id: img.id || Math.random().toString(36).substring(7),
        url: img.url,
        prompt: 'Variation of existing image',
        provider: img.provider || 'dalle3',
        model: img.model || 'unknown',
        size: img.size || '1024x1024',
        createdAt: new Date(),
        isFavorite: false,
      }));

      setImages(variations);
      setStatus('success');

      return variations;
    } catch (err: any) {
      const genError: GenerationError = {
        code: err.code || 'VARIATION_ERROR',
        message: err.message || 'Failed to create variations',
      };

      setError(genError);
      setStatus('error');

      throw genError;
    }
  }, [apiUrl, userId]);

  /**
   * Upscale an image
   */
  const upscale = useCallback(async (
    imageUrl: string,
    scale: number = 2
  ): Promise<GeneratedImage> => {
    setStatus('generating');
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/upscale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          scale,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to upscale image');
      }

      const data = await response.json();

      if (!data.success) {
        throw {
          code: data.error?.code || 'UPSCALE_FAILED',
          message: data.error?.message || 'Image upscale failed',
        };
      }

      const upscaledImage: GeneratedImage = {
        id: data.image.id || Math.random().toString(36).substring(7),
        url: data.image.url,
        prompt: 'Upscaled image',
        provider: data.image.provider || 'stability',
        model: data.image.model || 'unknown',
        size: data.image.size || `${scale}x`,
        createdAt: new Date(),
        isFavorite: false,
      };

      setImages(prev => [upscaledImage, ...prev]);
      setStatus('success');

      return upscaledImage;
    } catch (err: any) {
      const genError: GenerationError = {
        code: err.code || 'UPSCALE_ERROR',
        message: err.message || 'Failed to upscale image',
      };

      setError(genError);
      setStatus('error');

      throw genError;
    }
  }, [apiUrl, userId]);

  /**
   * Clear current images
   */
  const clearImages = useCallback(() => {
    setImages([]);
    setError(null);
    setStatus('idle');
  }, []);

  /**
   * Clear history
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  /**
   * Toggle favorite status
   */
  const toggleFavorite = useCallback((imageId: string) => {
    setImages(prev => prev.map(img =>
      img.id === imageId ? { ...img, isFavorite: !img.isFavorite } : img
    ));
    setHistory(prev => prev.map(img =>
      img.id === imageId ? { ...img, isFavorite: !img.isFavorite } : img
    ));
  }, []);

  /**
   * Delete an image
   */
  const deleteImage = useCallback((imageId: string) => {
    setImages(prev => prev.filter(img => img.id !== imageId));
    setHistory(prev => prev.filter(img => img.id !== imageId));
  }, []);

  /**
   * Download an image
   */
  const downloadImage = useCallback(async (image: GeneratedImage) => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-${image.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download image:', err);
      throw new Error('Failed to download image');
    }
  }, []);

  /**
   * Share an image (copy URL to clipboard)
   */
  const shareImage = useCallback(async (image: GeneratedImage) => {
    try {
      await navigator.clipboard.writeText(image.url);
    } catch (err) {
      console.error('Failed to copy URL:', err);
      throw new Error('Failed to copy URL to clipboard');
    }
  }, []);

  return {
    // State
    status,
    images,
    history,
    error,
    currentRequest,
    estimatedCost: estimatedCostState,

    // Actions
    generate,
    enhancePrompt,
    createVariations,
    upscale,
    clearImages,
    clearHistory,
    toggleFavorite,
    deleteImage,
    downloadImage,
    shareImage,
    estimateCost,

    // Refs
    abortController,
  };
}

export default useImageGeneration;
