# Chat API Quick Start Guide

## 🎯 What Was Created

A production-ready streaming chat API endpoint supporting multiple LLM providers:

### Core Files

1. **`/src/api/chat.ts`** (927 lines)
   - Complete streaming chat implementation
   - Supports Anthropic Claude, OpenAI GPT, and Google Gemini
   - Server-Sent Events (SSE) for real-time streaming
   - Automatic artifact extraction (code blocks, JSON, etc.)
   - Token usage tracking
   - Error handling and abort support

2. **`/src/api/routes.ts`** (Updated)
   - Integrated chat routes: `POST /api/chat` and `GET /api/models`
   - Exports handlers from chat.ts

3. **`package.json`** (Updated)
   - Added `openai` dependency for GPT support
   - Google Gemini uses native fetch (no SDK needed)

### Documentation & Examples

4. **`CHAT_API.md`**
   - Complete API documentation
   - Request/response schemas
   - TypeScript types
   - Usage examples for all features
   - Error handling guide

5. **`examples/chat-client-example.js`**
   - Simple CLI client for testing
   - Streaming and non-streaming modes
   - Model selection support

6. **`examples/advanced-chat-examples.js`**
   - 8 comprehensive examples:
     - Vision analysis
     - Multi-turn conversations
     - Code generation
     - Streaming responses
     - Temperature comparison
     - Multi-provider comparison
     - Error handling
     - Stop sequences

## 🚀 Quick Start

### 1. Set Environment Variables

At least one provider API key is required:

```bash
# Anthropic (Claude)
export ANTHROPIC_API_KEY=sk-ant-xxx

# OpenAI (GPT)
export OPENAI_API_KEY=sk-xxx

# Google (Gemini)
export GOOGLE_API_KEY=xxx
```

### 2. Install Dependencies

```bash
cd /home/user/SHIPIT/librechat-meta-agent/orchestrator
npm install
```

### 3. Start the Server

```bash
npm run dev
# Server starts on http://localhost:3100
```

### 4. Test the API

**Option A: Simple curl test**
```bash
curl -X POST http://localhost:3100/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": false
  }'
```

**Option B: Use the example client**
```bash
node examples/chat-client-example.js "Explain quantum computing"
node examples/chat-client-example.js "Write a Python script" --model gpt-4o
```

**Option C: Run advanced examples**
```bash
node examples/advanced-chat-examples.js 1    # Vision example
node examples/advanced-chat-examples.js all  # Run all examples
```

**Option D: List available models**
```bash
curl http://localhost:3100/api/models
```

## 📋 API Endpoints

### POST /api/chat

Stream or get chat completions.

**Basic Request:**
```json
{
  "messages": [
    {"role": "user", "content": "Hello!"}
  ],
  "model": "claude-3-5-sonnet-20241022",
  "stream": true
}
```

**With Vision:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": [
        {"type": "text", "text": "What's in this image?"},
        {
          "type": "image",
          "source": {
            "type": "url",
            "url": "https://example.com/image.jpg"
          }
        }
      ]
    }
  ],
  "model": "claude-3-5-sonnet-20241022"
}
```

**Streaming Response:**
```
event: connected
data: {"status":"ready"}

data: {"content":"Hello"}
data: {"content":" there"}

event: usage
data: {"input_tokens":5,"output_tokens":2,"total_tokens":7}

event: done
data: {"usage":{...},"artifacts_count":0}
```

### GET /api/models

Get list of available models.

**Response:**
```json
{
  "data": [
    {
      "id": "claude-3-5-sonnet-20241022",
      "provider": "anthropic",
      "name": "Claude 3.5 Sonnet",
      "context_window": 200000,
      "supports_vision": true
    },
    ...
  ]
}
```

## 🎨 Supported Models

### Anthropic Claude
- `claude-3-5-sonnet-20241022` - Most intelligent
- `claude-3-5-haiku-20241022` - Fastest
- `claude-3-opus-20240229` - Previous flagship

### OpenAI GPT
- `gpt-4o` - Most advanced multimodal
- `gpt-4o-mini` - Fast and affordable
- `gpt-4-turbo` - Previous generation
- `o1` - Advanced reasoning

### Google Gemini
- `gemini-2.0-flash-exp` - Next generation
- `gemini-1.5-pro` - 2M token context
- `gemini-1.5-flash` - Fast and efficient

## ✨ Key Features

### ✅ Streaming
Real-time token streaming via Server-Sent Events (SSE)

### ✅ Multi-Provider
Automatically detects provider from model name

### ✅ Vision Support
Send images via URL or base64 encoding

### ✅ Artifact Extraction
Automatically extracts code blocks and structured data

### ✅ Token Tracking
Real-time usage statistics for cost monitoring

### ✅ Error Handling
Graceful error handling with detailed messages

### ✅ Abort Support
Client can disconnect mid-stream

### ✅ Context Management
Multi-turn conversations with full history

### ✅ System Prompts
Custom instructions for specialized behavior

## 🔧 Advanced Usage

### Custom System Prompt
```javascript
{
  "messages": [...],
  "system_prompt": "You are an expert Python developer.",
  "temperature": 0.7,
  "max_tokens": 2000
}
```

### Stop Sequences
```javascript
{
  "messages": [...],
  "stop_sequences": ["END", "STOP"]
}
```

### Temperature Control
```javascript
{
  "messages": [...],
  "temperature": 0.0  // Deterministic (0.0 - 2.0)
}
```

## 📊 Code Structure

```
orchestrator/
├── src/
│   └── api/
│       ├── chat.ts           # Main chat API (927 lines)
│       └── routes.ts         # Route definitions
├── examples/
│   ├── chat-client-example.js
│   └── advanced-chat-examples.js
├── CHAT_API.md              # Full documentation
├── QUICKSTART_CHAT_API.md   # This file
└── package.json             # Updated with dependencies
```

## 🏗️ Architecture

### Provider Factory Pattern
```typescript
ProviderFactory.getProvider(model)
  → AnthropicProvider | OpenAIProvider | GoogleProvider
```

### Streaming Pipeline
```
Client Request
  → Validation (Zod schema)
  → Provider Selection
  → Stream Generation
  → SSE Formatting
  → Client Response
```

### Artifact Extraction
```
Response Text
  → Code Block Detection (regex)
  → Language Identification
  → Metadata Extraction
  → Structured Output
```

## 🧪 Testing

### Unit Test Example
```bash
# Test Claude
curl -X POST http://localhost:3100/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hi"}],"model":"claude-3-5-haiku-20241022","stream":false}'

# Test GPT
curl -X POST http://localhost:3100/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hi"}],"model":"gpt-4o-mini","stream":false}'

# Test Gemini
curl -X POST http://localhost:3100/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hi"}],"model":"gemini-1.5-flash","stream":false}'
```

## 🔐 Security

- ✅ API keys stored server-side only
- ✅ CORS enabled with configurable origins
- ✅ Helmet security headers
- ✅ Request size limit (10MB)
- ✅ Input validation with Zod
- ✅ No data persistence (stateless)

## 📈 Performance

- First token latency: ~200-500ms
- Concurrent stream support
- No server-side buffering
- Memory-efficient chunk processing

## 🐛 Troubleshooting

### "Cannot find module 'openai'"
```bash
npm install
```

### "ANTHROPIC_API_KEY environment variable is required"
```bash
export ANTHROPIC_API_KEY=sk-ant-xxx
```

### Streaming not working
Check that response headers include:
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

### Model not found
Use `GET /api/models` to see available models

## 📚 Next Steps

1. Read full documentation: `CHAT_API.md`
2. Try the examples: `examples/chat-client-example.js`
3. Test advanced features: `examples/advanced-chat-examples.js`
4. Integrate into your application
5. Monitor token usage for cost optimization

## 🎯 Production Checklist

- [ ] Set all required API keys
- [ ] Configure CORS origins for your domain
- [ ] Set up rate limiting (if needed)
- [ ] Monitor token usage and costs
- [ ] Implement request logging
- [ ] Set up error tracking
- [ ] Test all providers
- [ ] Load test with concurrent streams

## 💡 Tips

1. **Use streaming** for better UX and lower perceived latency
2. **Choose the right model**:
   - Simple tasks → Haiku/Flash
   - Complex reasoning → Sonnet/GPT-4o
   - Long context → Gemini 1.5 Pro
3. **Set appropriate max_tokens** to control costs
4. **Use temperature=0** for deterministic outputs
5. **Monitor usage events** for cost tracking
6. **Handle errors gracefully** on client side

---

**Happy coding! 🚀**

For issues or questions, see `CHAT_API.md` for detailed documentation.
