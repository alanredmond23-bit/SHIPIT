/**
 * Model Definitions & Capabilities
 * Comprehensive multi-provider model configuration for Meta Agent
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ModelProvider =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'deepseek'
  | 'mistral'
  | 'xai'
  | 'groq'
  | 'together';

export type ModelCapability =
  | 'vision'
  | 'tools'
  | 'extended_thinking'
  | 'code'
  | 'json_mode'
  | 'streaming'
  | 'file_upload'
  | 'computer_use'
  | 'pdf_vision';

export interface ModelPricing {
  input: number;  // per 1M tokens
  output: number; // per 1M tokens
  cached?: number; // for models with prompt caching
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: ModelProvider;
  description: string;
  contextWindow: number;
  maxOutputTokens: number;
  capabilities: ModelCapability[];
  pricing: ModelPricing;
  releaseDate?: string;
  deprecated?: boolean;
  recommended?: boolean;
  tier: 'flagship' | 'standard' | 'fast' | 'economy';
}

export interface ProviderInfo {
  id: ModelProvider;
  name: string;
  description: string;
  website: string;
  icon: string; // Lucide icon name or emoji
  color: string; // Brand color
  models: ModelInfo[];
}

// ============================================================================
// ANTHROPIC MODELS
// ============================================================================

const anthropicModels: ModelInfo[] = [
  {
    id: 'claude-opus-4-20250514',
    name: 'Claude Opus 4',
    provider: 'anthropic',
    description: 'Most powerful model for complex reasoning, analysis, and extended thinking',
    contextWindow: 200000,
    maxOutputTokens: 32000,
    capabilities: ['vision', 'tools', 'extended_thinking', 'code', 'json_mode', 'streaming', 'computer_use', 'pdf_vision'],
    pricing: { input: 15, output: 75, cached: 1.875 },
    releaseDate: '2025-05-14',
    recommended: true,
    tier: 'flagship',
  },
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    description: 'Best balance of intelligence and speed for most tasks',
    contextWindow: 200000,
    maxOutputTokens: 16000,
    capabilities: ['vision', 'tools', 'extended_thinking', 'code', 'json_mode', 'streaming', 'computer_use', 'pdf_vision'],
    pricing: { input: 3, output: 15, cached: 0.375 },
    releaseDate: '2025-05-14',
    recommended: true,
    tier: 'standard',
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    description: 'Previous generation Sonnet - excellent for coding and analysis',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    capabilities: ['vision', 'tools', 'code', 'json_mode', 'streaming', 'computer_use', 'pdf_vision'],
    pricing: { input: 3, output: 15, cached: 0.375 },
    releaseDate: '2024-10-22',
    tier: 'standard',
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    description: 'Fastest model for quick responses and high-volume tasks',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    capabilities: ['vision', 'tools', 'code', 'json_mode', 'streaming'],
    pricing: { input: 0.80, output: 4, cached: 0.10 },
    releaseDate: '2024-10-22',
    tier: 'fast',
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    description: 'Previous flagship for complex analysis tasks',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    capabilities: ['vision', 'tools', 'code', 'json_mode', 'streaming'],
    pricing: { input: 15, output: 75, cached: 1.875 },
    releaseDate: '2024-02-29',
    tier: 'flagship',
  },
];

// ============================================================================
// OPENAI MODELS
// ============================================================================

const openaiModels: ModelInfo[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'Most capable OpenAI model with vision and multimodal understanding',
    contextWindow: 128000,
    maxOutputTokens: 16384,
    capabilities: ['vision', 'tools', 'code', 'json_mode', 'streaming', 'file_upload'],
    pricing: { input: 2.50, output: 10, cached: 1.25 },
    recommended: true,
    tier: 'flagship',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Fast and affordable for simple tasks',
    contextWindow: 128000,
    maxOutputTokens: 16384,
    capabilities: ['vision', 'tools', 'code', 'json_mode', 'streaming'],
    pricing: { input: 0.15, output: 0.60, cached: 0.075 },
    tier: 'fast',
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    description: 'Previous generation with vision capabilities',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    capabilities: ['vision', 'tools', 'code', 'json_mode', 'streaming'],
    pricing: { input: 10, output: 30 },
    tier: 'standard',
  },
  {
    id: 'o1',
    name: 'o1',
    provider: 'openai',
    description: 'Advanced reasoning model for complex problems',
    contextWindow: 200000,
    maxOutputTokens: 100000,
    capabilities: ['vision', 'tools', 'extended_thinking', 'code', 'json_mode', 'streaming'],
    pricing: { input: 15, output: 60, cached: 7.50 },
    tier: 'flagship',
  },
  {
    id: 'o1-mini',
    name: 'o1 Mini',
    provider: 'openai',
    description: 'Efficient reasoning model for coding and STEM',
    contextWindow: 128000,
    maxOutputTokens: 65536,
    capabilities: ['tools', 'extended_thinking', 'code', 'json_mode', 'streaming'],
    pricing: { input: 3, output: 12, cached: 1.50 },
    tier: 'standard',
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    description: 'Legacy model for simple, high-volume tasks',
    contextWindow: 16385,
    maxOutputTokens: 4096,
    capabilities: ['tools', 'json_mode', 'streaming'],
    pricing: { input: 0.50, output: 1.50 },
    tier: 'economy',
    deprecated: true,
  },
];

// ============================================================================
// GOOGLE MODELS
// ============================================================================

const googleModels: ModelInfo[] = [
  {
    id: 'gemini-2.0-flash-exp',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    description: 'Latest multimodal model with native tool use',
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    capabilities: ['vision', 'tools', 'code', 'json_mode', 'streaming'],
    pricing: { input: 0, output: 0 }, // Free during preview
    recommended: true,
    tier: 'fast',
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    description: 'Best for complex reasoning with 1M token context',
    contextWindow: 2097152,
    maxOutputTokens: 8192,
    capabilities: ['vision', 'tools', 'code', 'json_mode', 'streaming', 'file_upload'],
    pricing: { input: 1.25, output: 5 },
    tier: 'flagship',
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'google',
    description: 'Fast and versatile for everyday tasks',
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    capabilities: ['vision', 'tools', 'code', 'json_mode', 'streaming'],
    pricing: { input: 0.075, output: 0.30 },
    tier: 'fast',
  },
  {
    id: 'gemini-1.5-flash-8b',
    name: 'Gemini 1.5 Flash 8B',
    provider: 'google',
    description: 'Smallest and fastest for high-volume tasks',
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    capabilities: ['vision', 'tools', 'json_mode', 'streaming'],
    pricing: { input: 0.0375, output: 0.15 },
    tier: 'economy',
  },
];

// ============================================================================
// DEEPSEEK MODELS
// ============================================================================

const deepseekModels: ModelInfo[] = [
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    description: 'General conversation and reasoning',
    contextWindow: 64000,
    maxOutputTokens: 8192,
    capabilities: ['tools', 'code', 'json_mode', 'streaming'],
    pricing: { input: 0.14, output: 0.28, cached: 0.014 },
    tier: 'standard',
  },
  {
    id: 'deepseek-coder',
    name: 'DeepSeek Coder',
    provider: 'deepseek',
    description: 'Specialized for code generation and completion',
    contextWindow: 64000,
    maxOutputTokens: 8192,
    capabilities: ['tools', 'code', 'json_mode', 'streaming'],
    pricing: { input: 0.14, output: 0.28, cached: 0.014 },
    recommended: true,
    tier: 'standard',
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek R1',
    provider: 'deepseek',
    description: 'Advanced reasoning with chain-of-thought',
    contextWindow: 64000,
    maxOutputTokens: 8192,
    capabilities: ['extended_thinking', 'code', 'json_mode', 'streaming'],
    pricing: { input: 0.55, output: 2.19, cached: 0.14 },
    tier: 'flagship',
  },
];

// ============================================================================
// MISTRAL MODELS
// ============================================================================

const mistralModels: ModelInfo[] = [
  {
    id: 'mistral-large-latest',
    name: 'Mistral Large',
    provider: 'mistral',
    description: 'Most powerful Mistral model for complex tasks',
    contextWindow: 128000,
    maxOutputTokens: 8192,
    capabilities: ['tools', 'code', 'json_mode', 'streaming'],
    pricing: { input: 2, output: 6 },
    recommended: true,
    tier: 'flagship',
  },
  {
    id: 'mistral-medium-latest',
    name: 'Mistral Medium',
    provider: 'mistral',
    description: 'Balanced performance for general tasks',
    contextWindow: 32000,
    maxOutputTokens: 8192,
    capabilities: ['tools', 'code', 'json_mode', 'streaming'],
    pricing: { input: 2.75, output: 8.1 },
    tier: 'standard',
  },
  {
    id: 'mistral-small-latest',
    name: 'Mistral Small',
    provider: 'mistral',
    description: 'Fast and efficient for simple tasks',
    contextWindow: 32000,
    maxOutputTokens: 8192,
    capabilities: ['tools', 'code', 'json_mode', 'streaming'],
    pricing: { input: 0.2, output: 0.6 },
    tier: 'fast',
  },
  {
    id: 'codestral-latest',
    name: 'Codestral',
    provider: 'mistral',
    description: 'Specialized for code generation',
    contextWindow: 32000,
    maxOutputTokens: 8192,
    capabilities: ['code', 'json_mode', 'streaming'],
    pricing: { input: 0.2, output: 0.6 },
    tier: 'standard',
  },
  {
    id: 'pixtral-large-latest',
    name: 'Pixtral Large',
    provider: 'mistral',
    description: 'Multimodal model with vision capabilities',
    contextWindow: 128000,
    maxOutputTokens: 8192,
    capabilities: ['vision', 'tools', 'code', 'json_mode', 'streaming'],
    pricing: { input: 2, output: 6 },
    tier: 'flagship',
  },
];

// ============================================================================
// XAI MODELS
// ============================================================================

const xaiModels: ModelInfo[] = [
  {
    id: 'grok-2',
    name: 'Grok 2',
    provider: 'xai',
    description: 'xAI flagship model with real-time knowledge',
    contextWindow: 131072,
    maxOutputTokens: 8192,
    capabilities: ['vision', 'tools', 'code', 'json_mode', 'streaming'],
    pricing: { input: 2, output: 10 },
    recommended: true,
    tier: 'flagship',
  },
  {
    id: 'grok-2-vision',
    name: 'Grok 2 Vision',
    provider: 'xai',
    description: 'Multimodal Grok with image understanding',
    contextWindow: 32768,
    maxOutputTokens: 8192,
    capabilities: ['vision', 'tools', 'code', 'json_mode', 'streaming'],
    pricing: { input: 2, output: 10 },
    tier: 'flagship',
  },
  {
    id: 'grok-beta',
    name: 'Grok Beta',
    provider: 'xai',
    description: 'Previous generation Grok model',
    contextWindow: 131072,
    maxOutputTokens: 8192,
    capabilities: ['tools', 'code', 'json_mode', 'streaming'],
    pricing: { input: 5, output: 15 },
    tier: 'standard',
  },
];

// ============================================================================
// GROQ MODELS (FAST INFERENCE)
// ============================================================================

const groqModels: ModelInfo[] = [
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B',
    provider: 'groq',
    description: 'Powerful open model with fast inference',
    contextWindow: 128000,
    maxOutputTokens: 32768,
    capabilities: ['tools', 'code', 'json_mode', 'streaming'],
    pricing: { input: 0.59, output: 0.79 },
    recommended: true,
    tier: 'standard',
  },
  {
    id: 'llama-3.1-70b-versatile',
    name: 'Llama 3.1 70B',
    provider: 'groq',
    description: 'Previous Llama version with great capabilities',
    contextWindow: 128000,
    maxOutputTokens: 32768,
    capabilities: ['tools', 'code', 'json_mode', 'streaming'],
    pricing: { input: 0.59, output: 0.79 },
    tier: 'standard',
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B',
    provider: 'groq',
    description: 'Ultra-fast for simple tasks',
    contextWindow: 128000,
    maxOutputTokens: 8192,
    capabilities: ['tools', 'code', 'json_mode', 'streaming'],
    pricing: { input: 0.05, output: 0.08 },
    tier: 'economy',
  },
  {
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B',
    provider: 'groq',
    description: 'Mixture of experts for balanced performance',
    contextWindow: 32768,
    maxOutputTokens: 8192,
    capabilities: ['tools', 'code', 'json_mode', 'streaming'],
    pricing: { input: 0.24, output: 0.24 },
    tier: 'standard',
  },
  {
    id: 'gemma2-9b-it',
    name: 'Gemma 2 9B',
    provider: 'groq',
    description: 'Google open model with fast inference',
    contextWindow: 8192,
    maxOutputTokens: 8192,
    capabilities: ['code', 'json_mode', 'streaming'],
    pricing: { input: 0.20, output: 0.20 },
    tier: 'fast',
  },
];

// ============================================================================
// TOGETHER MODELS
// ============================================================================

const togetherModels: ModelInfo[] = [
  {
    id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    name: 'Llama 3.3 70B Turbo',
    provider: 'together',
    description: 'Fast Llama inference on Together',
    contextWindow: 128000,
    maxOutputTokens: 8192,
    capabilities: ['tools', 'code', 'json_mode', 'streaming'],
    pricing: { input: 0.88, output: 0.88 },
    tier: 'standard',
  },
  {
    id: 'Qwen/Qwen2.5-72B-Instruct-Turbo',
    name: 'Qwen 2.5 72B',
    provider: 'together',
    description: 'Alibaba flagship model',
    contextWindow: 32768,
    maxOutputTokens: 8192,
    capabilities: ['tools', 'code', 'json_mode', 'streaming'],
    pricing: { input: 1.20, output: 1.20 },
    recommended: true,
    tier: 'flagship',
  },
  {
    id: 'deepseek-ai/DeepSeek-V3',
    name: 'DeepSeek V3',
    provider: 'together',
    description: 'DeepSeek V3 on Together infrastructure',
    contextWindow: 64000,
    maxOutputTokens: 8192,
    capabilities: ['tools', 'code', 'json_mode', 'streaming'],
    pricing: { input: 0.90, output: 0.90 },
    tier: 'flagship',
  },
  {
    id: 'mistralai/Mixtral-8x22B-Instruct-v0.1',
    name: 'Mixtral 8x22B',
    provider: 'together',
    description: 'Large Mixtral variant',
    contextWindow: 65536,
    maxOutputTokens: 8192,
    capabilities: ['tools', 'code', 'json_mode', 'streaming'],
    pricing: { input: 1.20, output: 1.20 },
    tier: 'flagship',
  },
  {
    id: 'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo',
    name: 'Llama 3.2 11B Vision',
    provider: 'together',
    description: 'Multimodal Llama with vision',
    contextWindow: 128000,
    maxOutputTokens: 8192,
    capabilities: ['vision', 'tools', 'code', 'json_mode', 'streaming'],
    pricing: { input: 0.18, output: 0.18 },
    tier: 'fast',
  },
];

// ============================================================================
// PROVIDERS
// ============================================================================

export const providers: ProviderInfo[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude AI models with advanced reasoning',
    website: 'https://anthropic.com',
    icon: 'brain',
    color: '#D4A574',
    models: anthropicModels,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT and o1 reasoning models',
    website: 'https://openai.com',
    icon: 'zap',
    color: '#10A37F',
    models: openaiModels,
  },
  {
    id: 'google',
    name: 'Google',
    description: 'Gemini multimodal AI models',
    website: 'https://ai.google.dev',
    icon: 'sparkles',
    color: '#4285F4',
    models: googleModels,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'Cost-effective reasoning models',
    website: 'https://deepseek.com',
    icon: 'search',
    color: '#5B8DEF',
    models: deepseekModels,
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    description: 'European open-weight models',
    website: 'https://mistral.ai',
    icon: 'wind',
    color: '#FF7000',
    models: mistralModels,
  },
  {
    id: 'xai',
    name: 'xAI',
    description: 'Grok models with real-time knowledge',
    website: 'https://x.ai',
    icon: 'bot',
    color: '#000000',
    models: xaiModels,
  },
  {
    id: 'groq',
    name: 'Groq',
    description: 'Ultra-fast LPU inference',
    website: 'https://groq.com',
    icon: 'rocket',
    color: '#F55036',
    models: groqModels,
  },
  {
    id: 'together',
    name: 'Together AI',
    description: 'Open models at scale',
    website: 'https://together.ai',
    icon: 'layers',
    color: '#0066FF',
    models: togetherModels,
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all models across all providers
 */
export function getAllModels(): ModelInfo[] {
  return providers.flatMap((p) => p.models);
}

/**
 * Get models by provider
 */
export function getModelsByProvider(providerId: ModelProvider): ModelInfo[] {
  const provider = providers.find((p) => p.id === providerId);
  return provider?.models || [];
}

/**
 * Get a specific model by ID
 */
export function getModelById(modelId: string): ModelInfo | undefined {
  return getAllModels().find((m) => m.id === modelId);
}

/**
 * Get recommended models for quick access
 */
export function getRecommendedModels(): ModelInfo[] {
  return getAllModels().filter((m) => m.recommended && !m.deprecated);
}

/**
 * Get models with a specific capability
 */
export function getModelsWithCapability(capability: ModelCapability): ModelInfo[] {
  return getAllModels().filter((m) => m.capabilities.includes(capability));
}

/**
 * Get models by tier
 */
export function getModelsByTier(tier: ModelInfo['tier']): ModelInfo[] {
  return getAllModels().filter((m) => m.tier === tier && !m.deprecated);
}

/**
 * Get the cheapest model with specific capabilities
 */
export function getCheapestModel(capabilities: ModelCapability[] = []): ModelInfo | undefined {
  const eligible = getAllModels().filter(
    (m) =>
      !m.deprecated &&
      capabilities.every((cap) => m.capabilities.includes(cap))
  );

  return eligible.sort((a, b) => a.pricing.input - b.pricing.input)[0];
}

/**
 * Get the most capable model for a task
 */
export function getFlagshipModel(providerId?: ModelProvider): ModelInfo | undefined {
  const models = providerId ? getModelsByProvider(providerId) : getAllModels();
  return models.find((m) => m.tier === 'flagship' && m.recommended && !m.deprecated);
}

/**
 * Calculate cost estimate for a conversation
 */
export function estimateCost(
  model: ModelInfo,
  inputTokens: number,
  outputTokens: number,
  useCaching: boolean = false
): number {
  const inputPrice = useCaching && model.pricing.cached
    ? model.pricing.cached
    : model.pricing.input;

  const inputCost = (inputTokens / 1_000_000) * inputPrice;
  const outputCost = (outputTokens / 1_000_000) * model.pricing.output;

  return inputCost + outputCost;
}

/**
 * Format context window for display
 */
export function formatContextWindow(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  return `${Math.round(tokens / 1000)}K`;
}

/**
 * Get provider by ID
 */
export function getProviderById(providerId: ModelProvider): ProviderInfo | undefined {
  return providers.find((p) => p.id === providerId);
}

/**
 * Get capability display info
 */
export function getCapabilityInfo(capability: ModelCapability): {
  label: string;
  icon: string;
  description: string;
} {
  const capabilityMap: Record<ModelCapability, { label: string; icon: string; description: string }> = {
    vision: {
      label: 'Vision',
      icon: 'eye',
      description: 'Can analyze images and screenshots',
    },
    tools: {
      label: 'Tools',
      icon: 'wrench',
      description: 'Can use function calling and tools',
    },
    extended_thinking: {
      label: 'Extended Thinking',
      icon: 'brain',
      description: 'Supports chain-of-thought reasoning',
    },
    code: {
      label: 'Code',
      icon: 'code',
      description: 'Optimized for code generation',
    },
    json_mode: {
      label: 'JSON Mode',
      icon: 'braces',
      description: 'Can output structured JSON',
    },
    streaming: {
      label: 'Streaming',
      icon: 'play',
      description: 'Supports streaming responses',
    },
    file_upload: {
      label: 'File Upload',
      icon: 'upload',
      description: 'Can process uploaded files',
    },
    computer_use: {
      label: 'Computer Use',
      icon: 'monitor',
      description: 'Can control computer interfaces',
    },
    pdf_vision: {
      label: 'PDF Vision',
      icon: 'file-text',
      description: 'Can read and analyze PDF documents',
    },
  };

  return capabilityMap[capability];
}

// ============================================================================
// LOCAL STORAGE PERSISTENCE
// ============================================================================

const MODEL_PREFERENCE_KEY = 'meta-agent-model-preference';
const PROVIDER_PREFERENCE_KEY = 'meta-agent-provider-preference';

export interface ModelPreferences {
  defaultModelId: string;
  defaultProviderId: ModelProvider;
  recentModels: string[];
  favoriteModels: string[];
}

const DEFAULT_PREFERENCES: ModelPreferences = {
  defaultModelId: 'claude-sonnet-4-20250514',
  defaultProviderId: 'anthropic',
  recentModels: [],
  favoriteModels: [],
};

/**
 * Load model preferences from localStorage
 */
export function loadModelPreferences(): ModelPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFERENCES;
  }

  try {
    const stored = localStorage.getItem(MODEL_PREFERENCE_KEY);
    if (stored) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.warn('Failed to load model preferences:', error);
  }

  return DEFAULT_PREFERENCES;
}

/**
 * Save model preferences to localStorage
 */
export function saveModelPreferences(preferences: Partial<ModelPreferences>): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const current = loadModelPreferences();
    const updated = { ...current, ...preferences };
    localStorage.setItem(MODEL_PREFERENCE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('Failed to save model preferences:', error);
  }
}

/**
 * Add a model to recent models list
 */
export function addToRecentModels(modelId: string): void {
  const prefs = loadModelPreferences();
  const recentModels = [modelId, ...prefs.recentModels.filter((id) => id !== modelId)].slice(0, 10);
  saveModelPreferences({ recentModels });
}

/**
 * Toggle a model as favorite
 */
export function toggleFavoriteModel(modelId: string): boolean {
  const prefs = loadModelPreferences();
  const isFavorite = prefs.favoriteModels.includes(modelId);

  const favoriteModels = isFavorite
    ? prefs.favoriteModels.filter((id) => id !== modelId)
    : [...prefs.favoriteModels, modelId];

  saveModelPreferences({ favoriteModels });
  return !isFavorite;
}

/**
 * Set default model
 */
export function setDefaultModel(modelId: string): void {
  const model = getModelById(modelId);
  if (model) {
    saveModelPreferences({
      defaultModelId: modelId,
      defaultProviderId: model.provider,
    });
  }
}
