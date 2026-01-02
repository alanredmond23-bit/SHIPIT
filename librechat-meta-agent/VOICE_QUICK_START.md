# Voice Conversation System - Quick Start 🎤

Get started with the real-time voice conversation system in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- PostgreSQL running
- API keys: OpenAI (required), Anthropic (required), others optional

## Step 1: Install Dependencies (1 min)

```bash
# Backend
cd orchestrator
npm install

# Frontend
cd ../ui-extensions
npm install
```

## Step 2: Setup Database (1 min)

```bash
# From project root
psql -U postgres -d librechat -f schemas/007_voice_schema.sql
```

Or with Docker:
```bash
docker exec -i postgres psql -U postgres -d librechat < schemas/007_voice_schema.sql
```

## Step 3: Configure Environment (1 min)

Create/update `.env`:

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=librechat
DB_USER=postgres
DB_PASSWORD=your_password

# Optional (for additional providers)
DEEPGRAM_API_KEY=...
ELEVENLABS_API_KEY=...
```

## Step 4: Start Services (1 min)

```bash
# Terminal 1: Backend
cd orchestrator
npm run dev

# Terminal 2: Frontend  
cd ui-extensions
npm run dev
```

## Step 5: Test It! (1 min)

### Option A: Run Test Script

```bash
./scripts/test-voice-system.sh
```

### Option B: Use the UI

1. Open: http://localhost:3000/voice
2. Click "Start Call"
3. Allow microphone access
4. Start speaking!

### Option C: Test with cURL

```bash
# Start a session
curl -X POST http://localhost:4000/api/voice/start \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test",
    "sttProvider": "whisper",
    "ttsProvider": "openai",
    "voice": "alloy",
    "language": "en"
  }'
```

## That's It! 🎉

You now have a fully functional voice conversation system.

## Next Steps

- **Customize**: Adjust voice settings in the UI
- **Explore**: Try different voices and languages
- **Integrate**: Add to your existing chat interface
- **Deploy**: Set up HTTPS/WSS for production

## Documentation

- 📚 [Complete Guide](./docs/VOICE_SYSTEM.md)
- 🔧 [Integration Examples](./docs/VOICE_INTEGRATION_EXAMPLE.md)
- 📖 [API Reference](./docs/VOICE_API_REFERENCE.md)
- 📝 [Implementation Summary](./VOICE_SYSTEM_SUMMARY.md)

## Troubleshooting

**"API not responding"**
- Check orchestrator is running: `cd orchestrator && npm run dev`
- Verify port 4000 is free: `lsof -i :4000`

**"Microphone permission denied"**
- Allow microphone in browser settings
- Use HTTPS in production (required for getUserMedia)

**"Provider not configured"**
- Verify API keys in `.env`
- Restart orchestrator after adding keys

**"Database tables not found"**
- Run migration: `psql -U postgres -d librechat -f schemas/007_voice_schema.sql`

## Features Overview

✅ Real-time voice conversations with AI
✅ Multiple STT providers (Whisper, Deepgram, AssemblyAI)
✅ Multiple TTS providers (OpenAI, ElevenLabs, PlayHT)
✅ Interrupt detection (AI stops when you speak)
✅ Conversation memory (maintains context)
✅ Beautiful mobile-first UI
✅ 9+ languages supported
✅ Voice cloning (ElevenLabs)
✅ Session analytics
✅ Production-ready architecture

## Get Help

- Check logs: `tail -f orchestrator/logs/app.log`
- Review docs: `docs/VOICE_SYSTEM.md`
- Test API: `./scripts/test-voice-system.sh`

Happy voice chatting! 🎤✨
