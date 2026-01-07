import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// OpenAI API for fallback
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ============================================================================
// SETTINGS TYPES (duplicated from settings-context for server-side use)
// ============================================================================

interface ModelParameters {
  temperature: number;
  top_p: number;
  top_k: number;
  frequency_penalty: number;
  presence_penalty: number;
  max_output_tokens: number;
  seed: number | null;
  stop_sequences: string[];
}

interface ReasoningConfig {
  reasoning_effort: 'low' | 'medium' | 'high' | 'max' | 'custom';
  thinking_budget: number;
  show_thinking: boolean;
  max_inflections: number;
  max_reflections: number;
  confidence_threshold: number;
}

interface UserSettings {
  modelParameters: ModelParameters;
  reasoningConfig: ReasoningConfig;
  selectedModel: string;
}

// In-memory settings store (shared with settings API)
// In production, this would be a database query
const settingsStore = new Map<string, { settings: UserSettings }>();

// Default settings to use if none are found
const DEFAULT_SETTINGS: UserSettings = {
  modelParameters: {
    temperature: 0.7,
    top_p: 1.0,
    top_k: 40,
    frequency_penalty: 0.0,
    presence_penalty: 0.0,
    max_output_tokens: 8192,
    seed: null,
    stop_sequences: [],
  },
  reasoningConfig: {
    reasoning_effort: 'medium',
    thinking_budget: 16384,
    show_thinking: true,
    max_inflections: 5,
    max_reflections: 3,
    confidence_threshold: 0.7,
  },
  selectedModel: 'claude-opus-4-5-20251101',
};

// Helper to get session ID and load settings
async function getUserSettings(request: NextRequest): Promise<UserSettings> {
  const cookieStore = cookies();
  const sessionId = cookieStore.get('meta-agent-session')?.value;

  if (sessionId) {
    const stored = settingsStore.get(sessionId);
    if (stored?.settings) {
      return stored.settings;
    }
  }

  return DEFAULT_SETTINGS;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, model, stream = true, tools = [], settings: clientSettings } = body;

    // Get user settings - prefer client-sent settings, then stored settings, then defaults
    const userSettings = clientSettings || await getUserSettings(request);

    // Determine provider from model ID
    const isAnthropic = model?.startsWith('claude');
    const isOpenAI = model?.startsWith('gpt') || model?.startsWith('o1');
    const isGoogle = model?.startsWith('gemini');
    const isDeepSeek = model?.startsWith('deepseek');

    if (isAnthropic) {
      return handleAnthropicChat(messages, model, stream, tools, userSettings);
    } else if (isOpenAI) {
      return handleOpenAIChat(messages, model, stream, tools, userSettings);
    } else if (isGoogle) {
      return handleGoogleChat(messages, model, stream, tools, userSettings);
    } else if (isDeepSeek) {
      return handleDeepSeekChat(messages, model, stream, tools, userSettings);
    } else {
      // Default to Anthropic
      return handleAnthropicChat(messages, 'claude-opus-4-5-20251101', stream, tools, userSettings);
    }
  } catch (error: any) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function handleAnthropicChat(
  messages: Array<{ role: string; content: string }>,
  model: string,
  stream: boolean,
  tools: string[],
  userSettings: UserSettings
) {
  // Convert messages to Anthropic format
  const anthropicMessages = messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  // Extract user parameters
  const { modelParameters, reasoningConfig } = userSettings;

  // Build system prompt based on enabled tools
  let systemPrompt = `You are Meta Agent, a powerful AI assistant powered by ${model}. You are helpful, harmless, and honest.`;

  if (tools.includes('web_search')) {
    systemPrompt += '\n\nYou have access to web search capabilities. When the user asks for current information, indicate that you would search the web.';
  }
  if (tools.includes('code_interpreter')) {
    systemPrompt += '\n\nYou can execute Python code. When providing code, wrap it in ```python code blocks.';
  }
  if (tools.includes('artifacts')) {
    systemPrompt += '\n\nYou can create artifacts like code files, documents, and diagrams. Present code in well-formatted blocks.';
  }

  // Build API request options with user settings
  const apiOptions: Parameters<typeof anthropic.messages.create>[0] = {
    model: model || 'claude-opus-4-5-20251101',
    max_tokens: modelParameters.max_output_tokens || 8192,
    system: systemPrompt,
    messages: anthropicMessages,
    stream,
    // Apply user's model parameters
    temperature: modelParameters.temperature,
    top_p: modelParameters.top_p,
    top_k: modelParameters.top_k,
  };

  // Add stop sequences if defined
  if (modelParameters.stop_sequences && modelParameters.stop_sequences.length > 0) {
    apiOptions.stop_sequences = modelParameters.stop_sequences;
  }

  // Log settings being used (for debugging)
  console.log('Chat API using settings:', {
    temperature: apiOptions.temperature,
    top_p: apiOptions.top_p,
    top_k: apiOptions.top_k,
    max_tokens: apiOptions.max_tokens,
    reasoning_effort: reasoningConfig.reasoning_effort,
    thinking_budget: reasoningConfig.thinking_budget,
  });

  if (stream) {
    // Streaming response
    const encoder = new TextEncoder();
    const streamResponse = new ReadableStream({
      async start(controller) {
        try {
          const response = await anthropic.messages.create(apiOptions as Parameters<typeof anthropic.messages.create>[0] & { stream: true });

          for await (const event of response) {
            if (event.type === 'content_block_delta') {
              const delta = event.delta;
              if ('text' in delta) {
                const data = JSON.stringify({ content: delta.text });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error: unknown) {
          console.error('Anthropic streaming error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const errorData = JSON.stringify({ error: errorMessage });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(streamResponse, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } else {
    // Non-streaming response
    const response = await anthropic.messages.create({
      ...apiOptions,
      stream: false,
    });

    const content = response.content[0];
    const text = content.type === 'text' ? content.text : '';

    return new Response(JSON.stringify({ content: text }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function handleOpenAIChat(
  messages: Array<{ role: string; content: string }>,
  model: string,
  stream: boolean,
  tools: string[],
  userSettings: UserSettings
) {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const { modelParameters } = userSettings;

  const systemMessage = {
    role: 'system',
    content: `You are Meta Agent, a powerful AI assistant powered by ${model}. You are helpful, harmless, and honest.`,
  };

  const openaiMessages = [systemMessage, ...messages];

  // Build request with user settings
  const requestBody: Record<string, unknown> = {
    model: model || 'gpt-4o',
    messages: openaiMessages,
    stream,
    temperature: modelParameters.temperature,
    top_p: modelParameters.top_p,
    max_tokens: modelParameters.max_output_tokens,
    frequency_penalty: modelParameters.frequency_penalty,
    presence_penalty: modelParameters.presence_penalty,
  };

  // Add optional parameters
  if (modelParameters.seed !== null) {
    requestBody.seed = modelParameters.seed;
  }
  if (modelParameters.stop_sequences && modelParameters.stop_sequences.length > 0) {
    requestBody.stop = modelParameters.stop_sequences;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (stream) {
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } else {
    const data = await response.json();
    return new Response(
      JSON.stringify({ content: data.choices[0]?.message?.content || '' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function handleGoogleChat(
  messages: Array<{ role: string; content: string }>,
  model: string,
  stream: boolean,
  tools: string[],
  userSettings: UserSettings
) {
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
  if (!GOOGLE_API_KEY) {
    throw new Error('Google API key not configured');
  }

  const { modelParameters } = userSettings;

  // Convert messages to Gemini format
  const geminiMessages = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: geminiMessages,
        generationConfig: {
          maxOutputTokens: modelParameters.max_output_tokens || 8192,
          temperature: modelParameters.temperature,
          topP: modelParameters.top_p,
          topK: modelParameters.top_k,
          stopSequences: modelParameters.stop_sequences?.length > 0
            ? modelParameters.stop_sequences
            : undefined,
        },
      }),
    }
  );

  const data = await response.json();

  // Handle Gemini API errors
  if (data.error) {
    console.error('Gemini API error:', data.error);
    // Fallback to Claude if Gemini fails
    console.log('Gemini failed, falling back to Claude');
    return handleAnthropicChat(messages, 'claude-sonnet-4-20250514', stream, tools, userSettings);
  }

  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // For Gemini, simulate streaming
  if (stream) {
    const encoder = new TextEncoder();
    const streamResponse = new ReadableStream({
      start(controller) {
        const data = JSON.stringify({ content });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(streamResponse, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }

  return new Response(JSON.stringify({ content }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleDeepSeekChat(
  messages: Array<{ role: string; content: string }>,
  model: string,
  stream: boolean,
  tools: string[],
  userSettings: UserSettings
) {
  // DeepSeek uses OpenAI-compatible API
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
  if (!DEEPSEEK_API_KEY) {
    // Fallback to Anthropic if DeepSeek not configured
    console.log('DeepSeek API key not configured, falling back to Claude');
    return handleAnthropicChat(messages, 'claude-sonnet-4-20250514', stream, tools, userSettings);
  }

  const { modelParameters } = userSettings;

  const systemMessage = {
    role: 'system',
    content: `You are Meta Agent, a powerful AI assistant powered by ${model}. You are helpful, harmless, and honest.`,
  };

  // Build request with user settings (DeepSeek uses OpenAI-compatible format)
  const requestBody: Record<string, unknown> = {
    model: model || 'deepseek-chat',
    messages: [systemMessage, ...messages],
    stream,
    temperature: modelParameters.temperature,
    top_p: modelParameters.top_p,
    max_tokens: modelParameters.max_output_tokens,
    frequency_penalty: modelParameters.frequency_penalty,
    presence_penalty: modelParameters.presence_penalty,
  };

  // Add optional parameters
  if (modelParameters.stop_sequences && modelParameters.stop_sequences.length > 0) {
    requestBody.stop = modelParameters.stop_sequences;
  }

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (stream) {
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } else {
    const data = await response.json();
    return new Response(
      JSON.stringify({ content: data.choices[0]?.message?.content || '' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
}
