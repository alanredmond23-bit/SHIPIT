#!/usr/bin/env node

/**
 * Advanced Chat API Examples
 *
 * Demonstrates:
 * - Multimodal chat (vision)
 * - Conversation context
 * - System prompts
 * - Artifact extraction
 * - Error handling
 * - Multiple providers
 */

const API_URL = process.env.CHAT_API_URL || 'http://localhost:3100/api/chat';

// Example 1: Vision - Analyze an image
async function visionExample() {
  console.log('\n📸 Example 1: Vision Analysis\n' + '═'.repeat(60));

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What do you see in this image? Describe it in detail.' },
            {
              type: 'image',
              source: {
                type: 'url',
                url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Cat03.jpg/400px-Cat03.jpg'
              }
            }
          ]
        }
      ],
      model: 'claude-3-5-sonnet-20241022',
      stream: false,
      max_tokens: 500,
    }),
  });

  const result = await response.json();
  console.log(result.data.content);
  console.log(`\n✓ Used ${result.data.usage.total_tokens} tokens`);
}

// Example 2: Multi-turn Conversation
async function conversationExample() {
  console.log('\n💬 Example 2: Multi-turn Conversation\n' + '═'.repeat(60));

  const messages = [
    { role: 'user', content: 'What is the capital of France?' },
    { role: 'assistant', content: 'The capital of France is Paris.' },
    { role: 'user', content: 'What is its population?' },
  ];

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      model: 'gpt-4o-mini',
      stream: false,
    }),
  });

  const result = await response.json();
  console.log('User: What is its population?');
  console.log(`Assistant: ${result.data.content}`);
  console.log(`\n✓ Used ${result.data.usage.total_tokens} tokens`);
}

// Example 3: Code Generation with Artifact Extraction
async function codeGenerationExample() {
  console.log('\n💻 Example 3: Code Generation & Artifact Extraction\n' + '═'.repeat(60));

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: 'Write a Python function to implement binary search. Include docstrings and type hints.'
        }
      ],
      model: 'claude-3-5-sonnet-20241022',
      stream: false,
      system_prompt: 'You are an expert Python developer. Write clean, well-documented code.',
    }),
  });

  const result = await response.json();
  console.log(result.data.content);

  if (result.data.artifacts.length > 0) {
    console.log(`\n✓ Extracted ${result.data.artifacts.length} code artifact(s):`);
    result.data.artifacts.forEach((artifact, i) => {
      console.log(`\n  Artifact ${i + 1}:`);
      console.log(`  - Type: ${artifact.type}`);
      console.log(`  - Language: ${artifact.language}`);
      console.log(`  - Size: ${artifact.content.length} characters`);
    });
  }

  console.log(`\n✓ Used ${result.data.usage.total_tokens} tokens`);
}

// Example 4: Streaming with System Prompt
async function streamingExample() {
  console.log('\n🌊 Example 4: Streaming Response\n' + '═'.repeat(60));

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'user', content: 'Explain the concept of recursion with a simple example.' }
      ],
      model: 'gpt-4o',
      stream: true,
      system_prompt: 'You are a helpful programming tutor. Explain concepts clearly with examples.',
      max_tokens: 500,
    }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  console.log('Response: ');
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.content) {
            process.stdout.write(data.content);
          }
        } catch (e) {
          // Ignore
        }
      }
    }
  }

  console.log('\n\n✓ Streaming complete');
}

// Example 5: Temperature Comparison
async function temperatureExample() {
  console.log('\n🌡️  Example 5: Temperature Comparison\n' + '═'.repeat(60));

  const prompt = 'Write a creative story opening in one sentence.';

  console.log('Testing with different temperature values:\n');

  for (const temp of [0, 0.7, 1.5]) {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-4o-mini',
        temperature: temp,
        stream: false,
        max_tokens: 100,
      }),
    });

    const result = await response.json();
    console.log(`Temperature ${temp}:`);
    console.log(`  ${result.data.content.trim()}\n`);
  }
}

// Example 6: Model Comparison
async function modelComparisonExample() {
  console.log('\n🔄 Example 6: Multi-Provider Comparison\n' + '═'.repeat(60));

  const prompt = 'In one sentence, what is the meaning of life?';

  const models = [
    'claude-3-5-haiku-20241022',
    'gpt-4o-mini',
    'gemini-1.5-flash',
  ];

  console.log(`Prompt: "${prompt}"\n`);

  for (const model of models) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          model,
          stream: false,
          max_tokens: 100,
        }),
      });

      const result = await response.json();
      const provider = result.data.model.includes('claude') ? 'Anthropic' :
                      result.data.model.includes('gpt') ? 'OpenAI' : 'Google';

      console.log(`[${provider}] ${model}:`);
      console.log(`  ${result.data.content.trim()}`);
      console.log(`  (${result.data.usage.total_tokens} tokens)\n`);

    } catch (error) {
      console.log(`[ERROR] ${model}: ${error.message}\n`);
    }
  }
}

// Example 7: Error Handling
async function errorHandlingExample() {
  console.log('\n⚠️  Example 7: Error Handling\n' + '═'.repeat(60));

  // Test 1: Invalid model
  console.log('Test 1: Invalid model name');
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'invalid-model-name',
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.log(`  ✓ Caught expected error: ${error.error.message}`);
    }
  } catch (error) {
    console.log(`  ✓ Caught: ${error.message}`);
  }

  // Test 2: Invalid request
  console.log('\nTest 2: Missing required field');
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        // Missing messages field
      }),
    });

    const error = await response.json();
    console.log(`  ✓ Caught validation error: ${error.error.message}`);
  } catch (error) {
    console.log(`  ✓ Caught: ${error.message}`);
  }
}

// Example 8: Stop Sequences
async function stopSequenceExample() {
  console.log('\n🛑 Example 8: Stop Sequences\n' + '═'.repeat(60));

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'user', content: 'Count from 1 to 20.' }
      ],
      model: 'gpt-4o-mini',
      stop_sequences: ['10'],
      stream: false,
    }),
  });

  const result = await response.json();
  console.log('Asked to count to 20, but stopped at 10:');
  console.log(result.data.content);
  console.log('\n✓ Stop sequence worked!');
}

// Main menu
async function main() {
  const examples = [
    { name: 'Vision Analysis', fn: visionExample },
    { name: 'Multi-turn Conversation', fn: conversationExample },
    { name: 'Code Generation & Artifacts', fn: codeGenerationExample },
    { name: 'Streaming Response', fn: streamingExample },
    { name: 'Temperature Comparison', fn: temperatureExample },
    { name: 'Multi-Provider Comparison', fn: modelComparisonExample },
    { name: 'Error Handling', fn: errorHandlingExample },
    { name: 'Stop Sequences', fn: stopSequenceExample },
  ];

  const exampleNum = process.argv[2];

  if (exampleNum === 'all') {
    console.log('🚀 Running all examples...\n');
    for (const example of examples) {
      try {
        await example.fn();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit delay
      } catch (error) {
        console.error(`\n❌ Error in ${example.name}:`, error.message);
      }
    }
  } else if (exampleNum && examples[parseInt(exampleNum) - 1]) {
    await examples[parseInt(exampleNum) - 1].fn();
  } else {
    console.log('🎯 Advanced Chat API Examples\n');
    console.log('Available examples:');
    examples.forEach((ex, i) => {
      console.log(`  ${i + 1}. ${ex.name}`);
    });
    console.log('\nUsage:');
    console.log('  node advanced-chat-examples.js <number>  # Run specific example');
    console.log('  node advanced-chat-examples.js all       # Run all examples');
    console.log('\nExamples:');
    console.log('  node advanced-chat-examples.js 1');
    console.log('  node advanced-chat-examples.js all');
  }
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
