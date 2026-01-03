import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// OpenAI API for fallback
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, model, stream = true, tools = [] } = body;

    // Determine provider from model ID
    const isAnthropic = model?.startsWith('claude');
    const isOpenAI = model?.startsWith('gpt') || model?.startsWith('o1');
    const isGoogle = model?.startsWith('gemini');
    const isDeepSeek = model?.startsWith('deepseek');

    if (isAnthropic) {
      return handleAnthropicChat(messages, model, stream, tools);
    } else if (isOpenAI) {
      return handleOpenAIChat(messages, model, stream, tools);
    } else if (isGoogle) {
      return handleGoogleChat(messages, model, stream, tools);
    } else if (isDeepSeek) {
      return handleDeepSeekChat(messages, model, stream, tools);
    } else {
      // Default to Anthropic
      return handleAnthropicChat(messages, 'claude-opus-4-5-20251101', stream, tools);
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
  tools: string[]
) {
  // Convert messages to Anthropic format
  const anthropicMessages = messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

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

  if (stream) {
    // Streaming response
    const encoder = new TextEncoder();
    const streamResponse = new ReadableStream({
      async start(controller) {
        try {
          const response = await anthropic.messages.create({
            model: model || 'claude-opus-4-5-20251101',
            max_tokens: 8192,
            system: systemPrompt,
            messages: anthropicMessages,
            stream: true,
          });

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
        } catch (error: any) {
          console.error('Anthropic streaming error:', error);
          const errorData = JSON.stringify({ error: error.message });
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
      model: model || 'claude-opus-4-5-20251101',
      max_tokens: 8192,
      system: systemPrompt,
      messages: anthropicMessages,
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
  tools: string[]
) {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const systemMessage = {
    role: 'system',
    content: `You are Meta Agent, a powerful AI assistant powered by ${model}. You are helpful, harmless, and honest.`,
  };

  const openaiMessages = [systemMessage, ...messages];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o',
      messages: openaiMessages,
      stream,
    }),
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
  tools: string[]
) {
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
  if (!GOOGLE_API_KEY) {
    throw new Error('Google API key not configured');
  }

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
          maxOutputTokens: 8192,
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
    return handleAnthropicChat(messages, 'claude-sonnet-4-20250514', stream, tools);
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
  tools: string[]
) {
  // DeepSeek uses OpenAI-compatible API
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
  if (!DEEPSEEK_API_KEY) {
    // Fallback to Anthropic if DeepSeek not configured
    console.log('DeepSeek API key not configured, falling back to Claude');
    return handleAnthropicChat(messages, 'claude-sonnet-4-20250514', stream, tools);
  }

  const systemMessage = {
    role: 'system',
    content: `You are Meta Agent, a powerful AI assistant powered by ${model}. You are helpful, harmless, and honest.`,
  };

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: model || 'deepseek-chat',
      messages: [systemMessage, ...messages],
      stream,
    }),
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
