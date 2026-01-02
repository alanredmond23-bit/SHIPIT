/**
 * Image Generation System Configuration
 * Copy this file and customize for your needs
 */

import { ImageGenerationEngineConfig } from '../orchestrator/src/services/image-generation';

export const imageGenerationConfig: ImageGenerationEngineConfig = {
  // DALL-E 3 Configuration (OpenAI)
  dalle: {
    enabled: true, // Set to false to disable
    apiKey: process.env.OPENAI_API_KEY || '',
    organization: process.env.OPENAI_ORG_ID,
    maxRetries: 3,
    timeout: 60000, // 60 seconds
    priority: 1, // Highest priority
  },

  // Stability AI Configuration
  stability: {
    enabled: true,
    apiKey: process.env.STABILITY_API_KEY || '',
    baseUrl: 'https://api.stability.ai',
    priority: 2,
  },

  // Replicate Configuration
  replicate: {
    enabled: true,
    apiKey: process.env.REPLICATE_API_TOKEN || '',
    baseUrl: 'https://api.replicate.com/v1',
    priority: 3,
  },

  // Anthropic API for prompt enhancement and image analysis
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,

  // Default provider when none specified
  defaultProvider: 'dalle3', // 'dalle3' | 'stability' | 'replicate'

  // Storage configuration
  storageBasePath: process.env.IMAGE_STORAGE_PATH || './storage/images',

  // Advanced options
  autoFallback: true, // Automatically try next provider if one fails
  cacheResults: true, // Cache identical prompts for 24 hours
  maxConcurrent: 5, // Max concurrent generations per user
};

/**
 * Provider-specific model configurations
 */
export const modelConfigs = {
  // DALL-E models
  dalle: {
    'dall-e-3': {
      maxPromptLength: 4000,
      supportedSizes: ['1024x1024', '1024x1792', '1792x1024'],
      supportedQualities: ['standard', 'hd'],
      supportedStyles: ['natural', 'vivid'],
      costPerImage: {
        standard: 0.04,
        hd: 0.08,
      },
    },
    'dall-e-2': {
      maxPromptLength: 1000,
      supportedSizes: ['256x256', '512x512', '1024x1024'],
      costPerImage: {
        standard: 0.02,
      },
    },
  },

  // Stability AI models
  stability: {
    'stable-diffusion-xl-1024-v1-0': {
      maxPromptLength: 2000,
      supportedSizes: ['512x512', '768x768', '1024x1024', '1536x1536'],
      defaultSteps: 30,
      defaultCfgScale: 7,
      costPerImage: 0.02,
    },
  },

  // Replicate models
  replicate: {
    sdxl: {
      version:
        'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
      maxPromptLength: 2000,
      supportedSizes: ['512x512', '768x768', '1024x1024', '1024x1792', '1792x1024'],
      defaultSteps: 30,
      costPerSecond: 0.00055,
    },
    'flux-dev': {
      version:
        'black-forest-labs/flux-dev:c5d68f4e42e19210bfc1dd2c8ecd8c38f3c60e39a55a29087f607f03a6e44bcd',
      maxPromptLength: 1000,
      supportedSizes: ['1024x1024'],
      defaultSteps: 28,
      costPerSecond: 0.001,
    },
  },
};

/**
 * Rate limiting configuration
 */
export const rateLimitConfig = {
  // Per-user limits
  perUser: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 20,
  },

  // Global limits
  global: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  },

  // Per-provider limits
  perProvider: {
    dalle3: {
      minRequestInterval: 1000, // 1 second between requests
    },
    stability: {
      minRequestInterval: 100, // 100ms between requests
    },
    replicate: {
      minRequestInterval: 500, // 500ms between requests
    },
  },
};

/**
 * Budget and cost configuration
 */
export const budgetConfig = {
  // Default budget per user (in USD)
  defaultDailyBudget: 10.0,
  defaultMonthlyBudget: 100.0,

  // Cost multipliers for different quality settings
  qualityMultipliers: {
    standard: 1.0,
    hd: 2.0,
  },

  // Alert thresholds
  alerts: {
    dailyWarning: 7.5, // Alert at 75% of daily budget
    monthlyWarning: 75.0, // Alert at 75% of monthly budget
  },
};

/**
 * Storage configuration
 */
export const storageConfig = {
  // Local storage
  local: {
    enabled: true,
    basePath: './storage/images',
    generateThumbnails: true,
    thumbnailSize: 256,
  },

  // S3-compatible storage
  s3: {
    enabled: false,
    bucket: process.env.S3_BUCKET,
    region: process.env.S3_REGION,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    cdnUrl: process.env.S3_CDN_URL,
  },

  // CloudFlare R2
  r2: {
    enabled: false,
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucket: process.env.R2_BUCKET,
    publicUrl: process.env.R2_PUBLIC_URL,
  },

  // Cleanup policy
  cleanup: {
    enabled: true,
    deleteAfterDays: 30, // Delete non-favorited images after 30 days
    keepFavorites: true,
    keepTemplateResults: true,
  },
};

/**
 * Style presets configuration
 */
export const stylePresetsConfig = {
  enabled: true,
  presets: [
    {
      id: 'photorealistic',
      name: 'Photorealistic',
      description: 'Ultra-realistic photography style',
      promptSuffix: ', professional photography, high detail, sharp focus, realistic lighting',
      negativePrompt: 'cartoon, illustration, painting, drawing, anime',
      recommendedProvider: 'dalle3',
    },
    {
      id: 'anime',
      name: 'Anime',
      description: 'Japanese anime/manga style',
      promptSuffix: ', anime style, manga, vibrant colors, detailed',
      negativePrompt: 'realistic, photograph, 3d',
      recommendedProvider: 'stability',
    },
    {
      id: 'digital-art',
      name: 'Digital Art',
      description: 'Modern digital illustration',
      promptSuffix: ', digital art, illustration, concept art, detailed, artstation',
      negativePrompt: 'photograph, realistic',
      recommendedProvider: 'replicate',
    },
    {
      id: '3d-render',
      name: '3D Render',
      description: '3D rendered appearance',
      promptSuffix: ', 3d render, octane render, unreal engine, cinema 4d, high quality',
      negativePrompt: 'flat, 2d, painting',
      recommendedProvider: 'stability',
    },
    {
      id: 'oil-painting',
      name: 'Oil Painting',
      description: 'Classic oil painting style',
      promptSuffix: ', oil painting, classical art, brush strokes, canvas texture',
      negativePrompt: 'photograph, digital, modern',
      recommendedProvider: 'stability',
    },
    {
      id: 'watercolor',
      name: 'Watercolor',
      description: 'Soft watercolor painting',
      promptSuffix: ', watercolor painting, soft colors, artistic, flowing',
      negativePrompt: 'photograph, harsh lines, digital',
      recommendedProvider: 'stability',
    },
  ],
};

/**
 * Content moderation configuration
 */
export const moderationConfig = {
  enabled: true,

  // Block specific keywords
  blockedKeywords: [
    // Add your blocked keywords here
  ],

  // OpenAI moderation API
  useOpenAIModerationAPI: true,

  // Stability AI safety settings
  stabilityAI: {
    enableSafetyChecker: true,
  },

  // Log all generations for review
  logAllGenerations: true,
};

/**
 * Analytics configuration
 */
export const analyticsConfig = {
  enabled: true,

  // Track these metrics
  metrics: [
    'totalGenerations',
    'successRate',
    'avgGenerationTime',
    'costPerUser',
    'providerUsage',
    'popularPrompts',
    'popularStyles',
  ],

  // Retention periods
  retention: {
    rawData: 90, // Keep raw data for 90 days
    aggregatedDaily: 365, // Keep daily aggregates for 1 year
    aggregatedMonthly: -1, // Keep monthly aggregates forever
  },
};

/**
 * Export all configurations
 */
export default {
  imageGeneration: imageGenerationConfig,
  models: modelConfigs,
  rateLimit: rateLimitConfig,
  budget: budgetConfig,
  storage: storageConfig,
  stylePresets: stylePresetsConfig,
  moderation: moderationConfig,
  analytics: analyticsConfig,
};
