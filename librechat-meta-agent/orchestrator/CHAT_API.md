# Chat API Documentation

## Overview

The Chat API provides streaming and non-streaming completions from multiple LLM providers:
- **Anthropic Claude** (claude-3-5-sonnet, claude-3-5-haiku, claude-3-opus)
- **OpenAI GPT** (gpt-4o, gpt-4o-mini, gpt-4-turbo, o1)
- **Google Gemini** (gemini-2.0-flash-exp, gemini-1.5-pro, gemini-1.5-flash)

## Endpoints

### POST /api/chat

Stream or get chat completions from supported LLM models.

#### Request Body

```typescript
{
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string | Array<{
      type: 'text' | 'image' | 'file';
      text?: string;
      source?: {
        type: 'base64' | 'url';
        media_type?: string;
        data?: string;
        url?: string;
      };
    }>;
  }>;
  model?: string;              // Default: 'claude-3-5-sonnet-20241022'
  stream?: boolean;            // Default: true
  temperature?: number;        // 0-2, controls randomness
  max_tokens?: number;         // Maximum tokens to generate
  system_prompt?: string;      // System instructions
  stop_sequences?: string[];   // Sequences that stop generation
}
```

#### Response (Streaming)

Server-Sent Events (SSE) format:

```
event: connected
data: {"status":"ready"}

data: {"content":"Hello"}

data: {"content":" world"}

event: usage
data: {"input_tokens":10,"output_tokens":5,"total_tokens":15}

event: artifacts
data: {"artifacts":[{"type":"code","language":"python","content":"..."}]}

event: done
data: {"usage":{...},"artifacts_count":1}
```

#### Response (Non-Streaming)

```json
{
  "data": {
    "content": "The complete response text",
    "usage": {
      "input_tokens": 100,
      "output_tokens": 50,
      "total_tokens": 150
    },
    "artifacts": [
      {
        "type": "code",
        "language": "python",
        "title": "Example Script",
        "content": "print('hello')",
        "metadata": {}
      }
    ],
    "model": "claude-3-5-sonnet-20241022"
  }
}
```

### GET /api/models

List all available models.

#### Response

```json
{
  "data": [
    {
      "id": "claude-3-5-sonnet-20241022",
      "provider": "anthropic",
      "name": "Claude 3.5 Sonnet",
      "description": "Most intelligent model, best for complex tasks",
      "context_window": 200000,
      "supports_vision": true
    },
    ...
  ]
}
```

## Usage Examples

### Simple Text Chat (Streaming)

```typescript
const response = await fetch('http://localhost:3100/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: 'Explain quantum computing in simple terms' }
    ],
    model: 'claude-3-5-sonnet-20241022',
    stream: true,
  }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      if (data.content) {
        process.stdout.write(data.content);
      }
    }
  }
}
```

### Chat with System Prompt

```javascript
fetch('http://localhost:3100/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: 'Write a Python function to calculate fibonacci numbers' }
    ],
    model: 'gpt-4o',
    system_prompt: 'You are an expert Python developer. Write clean, documented code.',
    temperature: 0.7,
    max_tokens: 2000,
  }),
});
```

### Multimodal Chat (Vision)

```javascript
fetch('http://localhost:3100/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'What is in this image?' },
          {
            type: 'image',
            source: {
              type: 'url',
              url: 'https://example.com/image.jpg'
            }
          }
        ]
      }
    ],
    model: 'claude-3-5-sonnet-20241022',
  }),
});
```

### Base64 Image Upload

```javascript
const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAUA...'; // Your base64 data

fetch('http://localhost:3100/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Describe this diagram' },
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: base64Image
            }
          }
        ]
      }
    ],
    model: 'gpt-4o',
  }),
});
```

### Conversation Context

```javascript
fetch('http://localhost:3100/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: 'What is TypeScript?' },
      { role: 'assistant', content: 'TypeScript is a superset of JavaScript...' },
      { role: 'user', content: 'How do I use it with React?' }
    ],
    model: 'claude-3-5-sonnet-20241022',
  }),
});
```

### Using Gemini with Long Context

```javascript
fetch('http://localhost:3100/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      {
        role: 'user',
        content: `Analyze this entire codebase: ${longCodebaseText}`
      }
    ],
    model: 'gemini-1.5-pro', // 2M token context window
    max_tokens: 8000,
  }),
});
```

### EventSource Client (Browser)

```javascript
// Note: EventSource doesn't support POST, so use fetch with ReadableStream
const response = await fetch('http://localhost:3100/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Hello!' }],
    stream: true,
  }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    if (!line.trim()) continue;

    if (line.startsWith('event: ')) {
      const event = line.slice(7);
      console.log('Event:', event);
    } else if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));

      if (data.content) {
        console.log('Content:', data.content);
      }
    }
  }
}
```

### Node.js Complete Example

```javascript
const https = require('https');

async function streamChat(messages, model = 'claude-3-5-sonnet-20241022') {
  const response = await fetch('http://localhost:3100/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, model, stream: true }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let usage = null;
  let artifacts = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));

          if (data.content) {
            fullContent += data.content;
            process.stdout.write(data.content);
          }
        } catch (e) {
          // Ignore parse errors
        }
      } else if (line.startsWith('event: usage')) {
        // Next line will have usage data
      } else if (line.startsWith('event: artifacts')) {
        // Next line will have artifacts data
      } else if (line.startsWith('event: done')) {
        // Stream complete
      } else if (line.startsWith('event: error')) {
        const data = JSON.parse(line.split('\n')[1].slice(6));
        throw new Error(data.error);
      }
    }
  }

  return { content: fullContent, usage, artifacts };
}

// Usage
streamChat([
  { role: 'user', content: 'Write a quick sort algorithm in Python' }
])
  .then(result => {
    console.log('\n\nComplete!');
    console.log('Tokens used:', result.usage);
    console.log('Artifacts:', result.artifacts.length);
  })
  .catch(console.error);
```

## Artifact Extraction

The API automatically extracts code blocks and structured data from responses:

**Input Response:**
```
Here's a Python script:

​```python
def hello():
    print("Hello, world!")
​```

And here's some JSON data:

​```json
{"name": "test", "value": 42}
​```
```

**Extracted Artifacts:**
```json
{
  "artifacts": [
    {
      "type": "code",
      "language": "python",
      "content": "def hello():\n    print(\"Hello, world!\")",
      "metadata": { "position": 25, "length": 67 }
    },
    {
      "type": "data",
      "language": "json",
      "content": "{\"name\": \"test\", \"value\": 42}",
      "metadata": {
        "parsed": { "name": "test", "value": 42 },
        "position": 120
      }
    }
  ]
}
```

## Error Handling

### HTTP Errors

```json
{
  "error": {
    "message": "Invalid request",
    "details": [
      {
        "code": "invalid_type",
        "path": ["messages"],
        "message": "Required"
      }
    ]
  }
}
```

### Streaming Errors

```
event: error
data: {"error":"ANTHROPIC_API_KEY environment variable is required"}
```

## Environment Variables

Required environment variables (at least one provider):

```bash
# Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-xxx

# OpenAI (GPT)
OPENAI_API_KEY=sk-xxx

# Google (Gemini)
GOOGLE_API_KEY=xxx
```

## Rate Limiting & Best Practices

1. **Streaming**: Always use streaming for better UX and lower latency
2. **Model Selection**:
   - Use Haiku/Flash models for simple tasks
   - Use Sonnet/GPT-4o for complex reasoning
   - Use Gemini 1.5 Pro for long context
3. **Error Handling**: Always handle both HTTP errors and SSE error events
4. **Abort Support**: The API supports client disconnection - streams will stop automatically
5. **Token Management**: Monitor usage events to track costs

## Testing

```bash
# Test with curl
curl -X POST http://localhost:3100/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "model": "claude-3-5-sonnet-20241022",
    "stream": false
  }'

# Test streaming
curl -X POST http://localhost:3100/api/chat \
  -H "Content-Type: application/json" \
  -N \
  -d '{
    "messages": [{"role": "user", "content": "Count to 5"}],
    "stream": true
  }'

# List models
curl http://localhost:3100/api/models
```

## TypeScript Types

```typescript
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<{
    type: 'text' | 'image' | 'file';
    text?: string;
    source?: {
      type: 'base64' | 'url';
      media_type?: string;
      data?: string;
      url?: string;
    };
  }>;
}

interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  system_prompt?: string;
  stop_sequences?: string[];
}

interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

interface Artifact {
  type: 'code' | 'document' | 'data';
  language?: string;
  title?: string;
  content: string;
  metadata?: Record<string, any>;
}

interface ChatResponse {
  data: {
    content: string;
    usage: TokenUsage;
    artifacts: Artifact[];
    model: string;
  };
}
```

## Performance

- **Streaming Latency**: First token typically within 200-500ms
- **Throughput**: Supports concurrent streams (limited by provider rate limits)
- **Memory**: Streams are processed chunk-by-chunk (no buffering)
- **Timeout**: No server-side timeout (controlled by client)

## Security

- API keys are server-side only (never exposed to clients)
- CORS enabled (configure via CORS_ORIGINS env var)
- Helmet security headers enabled
- Request size limit: 10MB
- No data persistence (stateless)
