# API Documentation

This document describes the API endpoints available in Mission Control.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Chat API](#chat-api)
4. [Auth Callback](#auth-callback)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [WebSocket Events](#websocket-events)

---

## Overview

### Base URL

```
Development: http://localhost:3000/api
Production:  https://your-domain.com/api
```

### Content Type

All API requests and responses use JSON:

```
Content-Type: application/json
```

### Request Format

```javascript
{
  // Request body varies by endpoint
}
```

### Response Format

Successful responses:
```javascript
{
  "data": { ... },
  "meta": {
    "timestamp": "2026-01-10T12:00:00Z"
  }
}
```

Error responses:
```javascript
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

---

## Authentication

### Supabase Authentication

Mission Control uses Supabase for authentication. Include the session token in requests:

```http
Authorization: Bearer <session_token>
```

### Getting a Session Token

```javascript
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

### Protected Routes

The following routes require authentication:
- All routes except `/login`, `/signup`, `/auth/callback`

Unauthenticated requests to protected routes redirect to `/login`.

---

## Chat API

### POST /api/chat

Send a message to an AI model and receive a response.

#### Request

```http
POST /api/chat
Content-Type: application/json
```

```javascript
{
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "model": "claude-opus-4-5-20251101",
  "stream": true,
  "tools": ["web_search", "code_interpreter"]
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messages` | array | Yes | Array of message objects |
| `model` | string | No | Model ID (defaults to claude-opus-4-5-20251101) |
| `stream` | boolean | No | Enable streaming (default: true) |
| `tools` | array | No | Enabled tools list |

#### Message Object

| Field | Type | Description |
|-------|------|-------------|
| `role` | string | `"user"` or `"assistant"` |
| `content` | string | Message content |

#### Supported Models

**Anthropic (claude-*)**
- `claude-opus-4-5-20251101`
- `claude-sonnet-4-20250514`
- `claude-3-5-sonnet-20241022`
- `claude-3-5-haiku-20241022`

**OpenAI (gpt-*, o1-*)**
- `gpt-5.2-pro`
- `gpt-5`
- `o3`
- `o1-pro`
- `gpt-4o`

**Google (gemini-*)**
- `gemini-2.0-ultra`
- `gemini-2.0-pro`
- `gemini-2.0-flash`

**DeepSeek (deepseek-*)**
- `deepseek-r1`
- `deepseek-v3`
- `deepseek-chat`

#### Available Tools

| Tool | Description |
|------|-------------|
| `web_search` | Web search capability |
| `code_interpreter` | Python code execution |
| `artifacts` | Document and code artifact creation |

#### Response (Non-Streaming)

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```javascript
{
  "content": "Hello! I'm doing well, thank you for asking..."
}
```

#### Response (Streaming)

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

```
data: {"content": "Hello"}

data: {"content": "! I'm"}

data: {"content": " doing well"}

data: {"content": ", thank you"}

data: [DONE]
```

#### Streaming Event Format

Each event is a JSON object:

```javascript
{
  "content": "text chunk"  // Text content delta
}
// OR
{
  "error": "error message" // Error during streaming
}
```

The stream ends with:
```
data: [DONE]
```

#### Error Responses

**400 Bad Request**
```javascript
{
  "error": "Invalid request body"
}
```

**401 Unauthorized**
```javascript
{
  "error": "Authentication required"
}
```

**500 Internal Server Error**
```javascript
{
  "error": "OpenAI API key not configured"
}
```

#### Example: cURL

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "model": "claude-opus-4-5-20251101",
    "stream": false
  }'
```

#### Example: JavaScript

```javascript
// Non-streaming
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Hello' }],
    model: 'claude-opus-4-5-20251101',
    stream: false
  })
});

const data = await response.json();
console.log(data.content);
```

```javascript
// Streaming
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Hello' }],
    model: 'claude-opus-4-5-20251101',
    stream: true
  })
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
      const data = line.slice(6);
      if (data === '[DONE]') break;

      try {
        const parsed = JSON.parse(data);
        if (parsed.content) {
          console.log(parsed.content);
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }
  }
}
```

---

## Auth Callback

### GET /auth/callback

Handle OAuth callback from authentication providers.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | string | Authorization code from OAuth provider |
| `next` | string | Redirect URL after authentication (optional) |

#### Response

Redirects to:
- `next` parameter value if provided
- `/` (dashboard) on success
- `/login?error=...` on failure

#### Example Flow

1. User clicks "Sign in with Google"
2. Redirected to Google OAuth consent
3. Google redirects to `/auth/callback?code=...`
4. Server exchanges code for session
5. User redirected to dashboard

---

## Error Handling

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |
| 503 | Service Unavailable - Upstream provider down |

### Error Response Structure

```javascript
{
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE",
  "details": {
    // Additional context
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_REQUEST` | Request body is malformed |
| `MISSING_FIELD` | Required field is missing |
| `INVALID_MODEL` | Model ID not recognized |
| `API_KEY_MISSING` | Provider API key not configured |
| `RATE_LIMITED` | Too many requests |
| `PROVIDER_ERROR` | Upstream provider returned error |
| `STREAM_ERROR` | Error during streaming response |

---

## Rate Limiting

### Default Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/chat` | 60 requests | 1 minute |
| `/auth/*` | 10 requests | 1 minute |

### Rate Limit Headers

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1704891234
```

### Rate Limit Response

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 30
```

```javascript
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMITED",
  "details": {
    "retryAfter": 30
  }
}
```

---

## WebSocket Events

For real-time features like collaboration, Mission Control uses WebSocket connections.

### Connection

```javascript
import { createRealtimeClient } from '@/lib/realtime';

const client = createRealtimeClient();
await client.connect();
```

### Events

#### Presence

```javascript
// User joined
{
  "type": "presence.join",
  "user": {
    "id": "user_123",
    "name": "John Doe",
    "cursor": { "x": 100, "y": 200 }
  }
}

// User left
{
  "type": "presence.leave",
  "userId": "user_123"
}

// Cursor moved
{
  "type": "presence.cursor",
  "userId": "user_123",
  "cursor": { "x": 150, "y": 250 }
}
```

#### Typing Indicator

```javascript
// User started typing
{
  "type": "typing.start",
  "userId": "user_123"
}

// User stopped typing
{
  "type": "typing.stop",
  "userId": "user_123"
}
```

### Subscribing to Events

```javascript
client.on('presence.join', (event) => {
  console.log(`${event.user.name} joined`);
});

client.on('typing.start', (event) => {
  console.log(`User ${event.userId} is typing...`);
});
```

---

## Environment Variables

### Required

```env
# At least one AI provider
ANTHROPIC_API_KEY=sk-ant-...
```

### Optional Providers

```env
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AIza...
DEEPSEEK_API_KEY=sk-...
META_API_KEY=...
MISTRAL_API_KEY=...
XAI_API_KEY=xai-...
```

### Authentication

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

---

## SDK Examples

### React Hook

```javascript
import { useMutation } from '@tanstack/react-query';

function useChat() {
  return useMutation({
    mutationFn: async ({ messages, model }) => {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, model, stream: false })
      });

      if (!response.ok) {
        throw new Error('Chat request failed');
      }

      return response.json();
    }
  });
}

// Usage
function ChatComponent() {
  const chat = useChat();

  const sendMessage = () => {
    chat.mutate({
      messages: [{ role: 'user', content: 'Hello' }],
      model: 'claude-opus-4-5-20251101'
    });
  };

  return (
    <button onClick={sendMessage} disabled={chat.isPending}>
      Send
    </button>
  );
}
```

### Streaming Hook

```javascript
function useStreamingChat() {
  const [content, setContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = async (messages, model) => {
    setContent('');
    setIsStreaming(true);

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, model, stream: true })
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
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              setContent(prev => prev + parsed.content);
            }
          } catch (e) {}
        }
      }
    }

    setIsStreaming(false);
  };

  return { content, isStreaming, sendMessage };
}
```

---

## Changelog

### v1.0.0

- Initial API release
- Chat endpoint with multi-provider support
- Streaming and non-streaming responses
- OAuth callback handling
- Rate limiting

---

*For usage examples, see the [User Guide](./USER_GUIDE.md)*
