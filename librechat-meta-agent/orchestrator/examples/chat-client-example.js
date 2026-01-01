#!/usr/bin/env node

/**
 * Chat API Client Example
 *
 * This example demonstrates how to use the streaming chat API with different models.
 *
 * Usage:
 *   node chat-client-example.js "Your prompt here"
 *   node chat-client-example.js "Explain TypeScript" --model gpt-4o
 *   node chat-client-example.js "Count to 10" --no-stream
 */

const API_URL = process.env.CHAT_API_URL || 'http://localhost:3100/api/chat';
const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';

// Parse command line arguments
const args = process.argv.slice(2);
let prompt = '';
let model = DEFAULT_MODEL;
let stream = true;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--model' && args[i + 1]) {
    model = args[i + 1];
    i++;
  } else if (args[i] === '--no-stream') {
    stream = false;
  } else if (!args[i].startsWith('--')) {
    prompt = args[i];
  }
}

if (!prompt) {
  console.error('Usage: node chat-client-example.js "Your prompt" [--model MODEL] [--no-stream]');
  console.error('');
  console.error('Examples:');
  console.error('  node chat-client-example.js "Explain quantum computing"');
  console.error('  node chat-client-example.js "Write a Python script" --model gpt-4o');
  console.error('  node chat-client-example.js "Hello" --no-stream');
  process.exit(1);
}

// Streaming chat function
async function streamingChat(messages, model) {
  console.log(`\n🤖 ${model}\n${'─'.repeat(60)}\n`);

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      model,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';
  let usage = null;
  let artifacts = [];

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      if (line.startsWith('event: ')) {
        const event = line.slice(7).trim();

        // Get the data from the next line
        continue;
      } else if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));

          if (data.content) {
            fullContent += data.content;
            process.stdout.write(data.content);
          } else if (data.input_tokens !== undefined) {
            usage = data;
          } else if (data.artifacts) {
            artifacts = data.artifacts;
          }
        } catch (e) {
          // Ignore parse errors for non-JSON data lines
        }
      }
    }
  }

  console.log('\n\n' + '─'.repeat(60));

  if (usage) {
    console.log(`📊 Tokens: ${usage.input_tokens} in / ${usage.output_tokens} out / ${usage.total_tokens} total`);
  }

  if (artifacts.length > 0) {
    console.log(`\n📦 Extracted ${artifacts.length} artifact(s):`);
    artifacts.forEach((artifact, i) => {
      console.log(`  ${i + 1}. [${artifact.type}] ${artifact.language || 'unknown'} (${artifact.content.length} chars)`);
    });
  }

  return { content: fullContent, usage, artifacts };
}

// Non-streaming chat function
async function nonStreamingChat(messages, model) {
  console.log(`\n🤖 ${model} (non-streaming)\n${'─'.repeat(60)}\n`);

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      model,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  const result = await response.json();
  const { content, usage, artifacts } = result.data;

  console.log(content);
  console.log('\n' + '─'.repeat(60));
  console.log(`📊 Tokens: ${usage.input_tokens} in / ${usage.output_tokens} out / ${usage.total_tokens} total`);

  if (artifacts.length > 0) {
    console.log(`\n📦 Extracted ${artifacts.length} artifact(s):`);
    artifacts.forEach((artifact, i) => {
      console.log(`  ${i + 1}. [${artifact.type}] ${artifact.language || 'unknown'} (${artifact.content.length} chars)`);
    });
  }

  return result.data;
}

// Main execution
(async () => {
  try {
    const messages = [
      { role: 'user', content: prompt }
    ];

    if (stream) {
      await streamingChat(messages, model);
    } else {
      await nonStreamingChat(messages, model);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
})();
