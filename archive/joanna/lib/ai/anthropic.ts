// Anthropic Claude integration utilities

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function claudeCompletion(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  }
) {
  const response = await anthropic.messages.create({
    model: options?.model || 'claude-3-5-sonnet-20241022',
    max_tokens: options?.maxTokens || 4096,
    temperature: options?.temperature || 0.7,
    system: options?.systemPrompt || 'You are Joanna, a helpful AI assistant.',
    messages,
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}

export default anthropic;
