import { NextResponse } from 'next/server';

// Available models configuration - Updated January 2026
const MODELS = [
  // ═══════════════════════════════════════════════════════════════
  // OPENAI MODELS (Latest 2025-2026)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'gpt-5.2-pro',
    name: 'GPT-5.2 Pro',
    provider: 'openai',
    description: 'Most powerful ChatGPT Pro model - 2M context',
    context_window: 2000000,
    supports_vision: true,
    tier: 'flagship',
  },
  {
    id: 'gpt-5.2',
    name: 'GPT-5.2',
    provider: 'openai',
    description: 'Latest GPT-5 series with enhanced reasoning',
    context_window: 1000000,
    supports_vision: true,
    tier: 'flagship',
  },
  {
    id: 'gpt-5',
    name: 'GPT-5',
    provider: 'openai',
    description: 'Major advancement in language understanding',
    context_window: 500000,
    supports_vision: true,
    tier: 'flagship',
  },
  {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'openai',
    description: 'Fast GPT-5 variant for everyday tasks',
    context_window: 256000,
    supports_vision: true,
    tier: 'fast',
  },
  {
    id: 'o3',
    name: 'o3',
    provider: 'openai',
    description: 'Most advanced reasoning model - PhD-level',
    context_window: 500000,
    supports_vision: true,
    tier: 'reasoning',
  },
  {
    id: 'o3-mini',
    name: 'o3 Mini',
    provider: 'openai',
    description: 'Fast reasoning with excellent cost efficiency',
    context_window: 200000,
    supports_vision: false,
    tier: 'reasoning',
  },
  {
    id: 'o1-pro',
    name: 'o1 Pro',
    provider: 'openai',
    description: 'Enhanced o1 with extended thinking time',
    context_window: 200000,
    supports_vision: true,
    tier: 'reasoning',
  },
  {
    id: 'o1',
    name: 'o1',
    provider: 'openai',
    description: 'Advanced reasoning for complex problems',
    context_window: 200000,
    supports_vision: false,
    tier: 'reasoning',
  },
  {
    id: 'gpt-4.5-turbo',
    name: 'GPT-4.5 Turbo',
    provider: 'openai',
    description: 'Bridge model between GPT-4 and GPT-5',
    context_window: 256000,
    supports_vision: true,
    tier: 'balanced',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'Multimodal GPT-4 with vision and audio',
    context_window: 128000,
    supports_vision: true,
    tier: 'balanced',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Fast and affordable GPT-4o variant',
    context_window: 128000,
    supports_vision: true,
    tier: 'fast',
  },

  // ═══════════════════════════════════════════════════════════════
  // ANTHROPIC MODELS (Latest 2025-2026)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'claude-opus-4-5-20251101',
    name: 'Claude Opus 4.5',
    provider: 'anthropic',
    description: 'Most capable Claude - extended thinking',
    context_window: 200000,
    supports_vision: true,
    tier: 'flagship',
  },
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    description: 'Balanced performance with computer use',
    context_window: 200000,
    supports_vision: true,
    tier: 'balanced',
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    description: 'Fast and intelligent for coding',
    context_window: 200000,
    supports_vision: true,
    tier: 'fast',
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    description: 'Fastest Claude for real-time tasks',
    context_window: 200000,
    supports_vision: true,
    tier: 'fast',
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    description: 'Previous flagship with deep analysis',
    context_window: 200000,
    supports_vision: true,
    tier: 'legacy',
  },

  // ═══════════════════════════════════════════════════════════════
  // GOOGLE MODELS (Latest 2025-2026)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'gemini-2.0-ultra',
    name: 'Gemini 2.0 Ultra',
    provider: 'google',
    description: 'Most capable Gemini - 10M token context',
    context_window: 10000000,
    supports_vision: true,
    tier: 'flagship',
  },
  {
    id: 'gemini-2.0-pro',
    name: 'Gemini 2.0 Pro',
    provider: 'google',
    description: 'Balanced Gemini 2.0 with multimodal',
    context_window: 2000000,
    supports_vision: true,
    tier: 'balanced',
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    description: 'Fastest Gemini with 1M context',
    context_window: 1000000,
    supports_vision: true,
    tier: 'fast',
  },
  {
    id: 'gemini-2.0-flash-thinking',
    name: 'Gemini 2.0 Flash Thinking',
    provider: 'google',
    description: 'Flash with enhanced reasoning',
    context_window: 1000000,
    supports_vision: true,
    tier: 'reasoning',
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    description: 'Previous gen with 2M context',
    context_window: 2000000,
    supports_vision: true,
    tier: 'legacy',
  },

  // ═══════════════════════════════════════════════════════════════
  // DEEPSEEK MODELS (Latest 2025-2026)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    provider: 'deepseek',
    description: 'Open-source reasoning champion',
    context_window: 128000,
    supports_vision: false,
    tier: 'reasoning',
  },
  {
    id: 'deepseek-r1-zero',
    name: 'DeepSeek R1 Zero',
    provider: 'deepseek',
    description: 'Pure RL reasoning without SFT',
    context_window: 128000,
    supports_vision: false,
    tier: 'reasoning',
  },
  {
    id: 'deepseek-v3',
    name: 'DeepSeek V3',
    provider: 'deepseek',
    description: '671B MoE - GPT-4 class open model',
    context_window: 128000,
    supports_vision: false,
    tier: 'flagship',
  },
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    description: 'General purpose conversation model',
    context_window: 64000,
    supports_vision: false,
    tier: 'balanced',
  },

  // ═══════════════════════════════════════════════════════════════
  // META MODELS (Latest 2025-2026)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'llama-4-405b',
    name: 'Llama 4 405B',
    provider: 'meta',
    description: 'Largest open-weight Llama model',
    context_window: 256000,
    supports_vision: true,
    tier: 'flagship',
  },
  {
    id: 'llama-4-70b',
    name: 'Llama 4 70B',
    provider: 'meta',
    description: 'Efficient Llama for production use',
    context_window: 128000,
    supports_vision: true,
    tier: 'balanced',
  },
  {
    id: 'llama-3.3-70b',
    name: 'Llama 3.3 70B',
    provider: 'meta',
    description: 'Best cost-performance open model',
    context_window: 128000,
    supports_vision: false,
    tier: 'balanced',
  },

  // ═══════════════════════════════════════════════════════════════
  // MISTRAL MODELS (Latest 2025-2026)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'mistral-large-2',
    name: 'Mistral Large 2',
    provider: 'mistral',
    description: 'Flagship Mistral with 128K context',
    context_window: 128000,
    supports_vision: true,
    tier: 'flagship',
  },
  {
    id: 'codestral',
    name: 'Codestral',
    provider: 'mistral',
    description: 'Specialized for code generation',
    context_window: 32000,
    supports_vision: false,
    tier: 'specialized',
  },
  {
    id: 'mistral-medium',
    name: 'Mistral Medium',
    provider: 'mistral',
    description: 'Balanced European AI model',
    context_window: 64000,
    supports_vision: false,
    tier: 'balanced',
  },

  // ═══════════════════════════════════════════════════════════════
  // XAI MODELS (Latest 2025-2026)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'grok-3',
    name: 'Grok 3',
    provider: 'xai',
    description: 'Latest Grok with real-time X data',
    context_window: 256000,
    supports_vision: true,
    tier: 'flagship',
  },
  {
    id: 'grok-2',
    name: 'Grok 2',
    provider: 'xai',
    description: 'Witty assistant with X integration',
    context_window: 128000,
    supports_vision: true,
    tier: 'balanced',
  },
];

export async function GET() {
  return NextResponse.json({ data: MODELS });
}
