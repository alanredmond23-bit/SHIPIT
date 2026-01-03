import { NextResponse } from 'next/server';

// Available models configuration
const MODELS = [
  // Anthropic Models
  {
    id: 'claude-opus-4-5-20251101',
    name: 'Claude Opus 4.5',
    provider: 'anthropic',
    description: 'Most capable model for complex tasks',
    context_window: 200000,
    supports_vision: true,
    tier: 'flagship',
  },
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    description: 'Balanced performance and speed',
    context_window: 200000,
    supports_vision: true,
    tier: 'balanced',
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    description: 'Fast and intelligent',
    context_window: 200000,
    supports_vision: true,
    tier: 'fast',
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    description: 'Fastest responses',
    context_window: 200000,
    supports_vision: true,
    tier: 'fast',
  },
  // OpenAI Models
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'Most advanced OpenAI model',
    context_window: 128000,
    supports_vision: true,
    tier: 'flagship',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Fast and affordable',
    context_window: 128000,
    supports_vision: true,
    tier: 'fast',
  },
  {
    id: 'o1',
    name: 'o1',
    provider: 'openai',
    description: 'Advanced reasoning model',
    context_window: 200000,
    supports_vision: false,
    tier: 'reasoning',
  },
  {
    id: 'o1-mini',
    name: 'o1 Mini',
    provider: 'openai',
    description: 'Fast reasoning',
    context_window: 128000,
    supports_vision: false,
    tier: 'reasoning',
  },
  // Google Models
  {
    id: 'gemini-2.0-flash-exp',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    description: 'Google\'s fastest model',
    context_window: 1000000,
    supports_vision: true,
    tier: 'fast',
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    description: 'Balanced Google model',
    context_window: 2000000,
    supports_vision: true,
    tier: 'balanced',
  },
  // DeepSeek Models
  {
    id: 'deepseek-chat',
    name: 'DeepSeek V3',
    provider: 'deepseek',
    description: 'Advanced open model',
    context_window: 64000,
    supports_vision: false,
    tier: 'balanced',
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek R1',
    provider: 'deepseek',
    description: 'Reasoning specialist',
    context_window: 64000,
    supports_vision: false,
    tier: 'reasoning',
  },
];

export async function GET() {
  return NextResponse.json({ data: MODELS });
}
