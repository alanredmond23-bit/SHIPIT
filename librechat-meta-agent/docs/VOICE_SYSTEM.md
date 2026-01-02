# Real-Time Voice Conversation System

A production-ready, real-time voice conversation system for the LibreChat Meta Agent with support for multiple STT/TTS providers, interrupt detection, emotion analysis, and voice cloning.

## Features

### Core Capabilities
- **Real-time Audio Streaming**: WebRTC-based low-latency audio communication via WebSocket
- **Multiple STT Providers**: OpenAI Whisper, Deepgram, AssemblyAI
- **Multiple TTS Providers**: OpenAI TTS, ElevenLabs, PlayHT
- **Interrupt Detection**: Automatically stops AI speech when user starts speaking
- **Conversation Memory**: Maintains context across the conversation
- **Voice Cloning**: Clone custom voices using ElevenLabs (10+ audio samples)
- **Multi-language Support**: English, Spanish, French, German, Italian, Portuguese, Japanese, Korean, Chinese
- **Emotion Detection**: Optional emotion/tone analysis (when enabled)
- **Session Analytics**: Track usage, latency, costs, and quality metrics

### UI Features
- Beautiful mobile-first voice chat interface
- Real-time waveform visualization
- Live transcript display with confidence scores
- Network quality indicator
- Call duration timer
- Response style configuration (concise/conversational/detailed)
- Interrupt sensitivity settings
- Custom system prompts

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Browser   │ WebRTC  │ Orchestrator │   API   │  STT/TTS    │
│  (UI Client)│◄───────►│  WebSocket   │◄───────►│  Providers  │
└─────────────┘         └──────────────┘         └─────────────┘
       │                        │
       │                        │
       ▼                        ▼
┌─────────────┐         ┌──────────────┐
│   Audio     │         │  PostgreSQL  │
│  Playback   │         │   Database   │
└─────────────┘         └──────────────┘
```

## Setup

### 1. Database Setup

Run the schema migration:

```bash
psql -U your_user -d librechat -f schemas/007_voice_schema.sql
```

This creates the following tables:
- `voice_sessions` - Active and historical voice sessions
- `voice_transcripts` - Full conversation transcripts
- `custom_voices` - User's custom cloned voices
- `voice_analytics` - Usage metrics and billing data

### 2. Environment Variables

Add to your `.env` file:

```bash
# Required for basic functionality
OPENAI_API_KEY=sk-...                    # For Whisper STT and OpenAI TTS
ANTHROPIC_API_KEY=sk-ant-...             # For AI responses

# Optional providers
DEEPGRAM_API_KEY=...                     # For real-time STT
ASSEMBLYAI_API_KEY=...                   # Alternative STT
ELEVENLABS_API_KEY=...                   # For premium TTS and voice cloning
PLAYHT_API_KEY=...                       # Alternative TTS
PLAYHT_USER_ID=...                       # Required for PlayHT

# API Configuration
ORCHESTRATOR_PORT=4000
```

### 3. Install Dependencies

**Backend (Orchestrator):**
```bash
cd orchestrator
npm install
```

The required dependencies are already in `package.json`:
- `ws` - WebSocket server
- `openai` - OpenAI API client
- `@anthropic-ai/sdk` - Claude API client
- `pg` - PostgreSQL client
- `multer` - File upload handling

**Frontend (UI):**
```bash
cd ui-extensions
npm install
```

### 4. Initialize Voice Engine

In your orchestrator's main file (`src/index.ts`), initialize the voice engine:

```typescript
import { VoiceConversationEngine } from './services/voice-conversation';
import { createVoiceRouter } from './api/voice';

// Initialize voice engine
const voiceEngine = new VoiceConversationEngine(
  db,
  logger,
  {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
    openaiApiKey: process.env.OPENAI_API_KEY,
    deepgramApiKey: process.env.DEEPGRAM_API_KEY,
    assemblyaiApiKey: process.env.ASSEMBLYAI_API_KEY,
    elevenlabsApiKey: process.env.ELEVENLABS_API_KEY,
    playhtApiKey: process.env.PLAYHT_API_KEY,
    playhtUserId: process.env.PLAYHT_USER_ID,
  }
);

// Register voice API routes
app.use('/api/voice', createVoiceRouter(db, logger, voiceEngine, httpServer));
```

### 5. Start Services

```bash
# Start orchestrator
cd orchestrator
npm run dev

# Start UI (in another terminal)
cd ui-extensions
npm run dev
```

## Usage

### Web Interface

Navigate to `http://localhost:3000/voice` to access the voice chat interface.

**Starting a call:**
1. Click the "Start Call" button
2. Allow microphone access when prompted
3. Start speaking naturally
4. AI will respond with voice

**During a call:**
- Click the mute button to mute audio output
- Click the transcript button to show/hide the conversation
- Click "End Call" to terminate the session

**Settings (configure before starting):**
- Select voice provider and voice
- Choose language
- Set response style (concise/conversational/detailed)
- Adjust interrupt sensitivity
- Add custom system prompt

### API Usage

**Start a session:**
```bash
curl -X POST http://localhost:4000/api/voice/start \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "sttProvider": "whisper",
    "ttsProvider": "openai",
    "voice": "alloy",
    "language": "en",
    "responseStyle": "conversational",
    "interruptSensitivity": "medium"
  }'
```

Response:
```json
{
  "success": true,
  "session": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "active",
    "config": {...},
    "wsUrl": "ws://localhost:4000/ws/voice/550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Connect via WebSocket:**
```javascript
const ws = new WebSocket('ws://localhost:4000/ws/voice/SESSION_ID');

ws.onopen = () => {
  console.log('Connected');
};

// Send audio data (binary)
const audioBlob = ...;
ws.send(audioBlob);

// Receive messages
ws.onmessage = (event) => {
  if (typeof event.data === 'string') {
    const message = JSON.parse(event.data);

    if (message.type === 'transcript') {
      console.log(`${message.data.role}: ${message.data.text}`);
    }

    if (message.type === 'audio_start') {
      console.log('AI started speaking');
    }
  } else {
    // Binary audio data from AI
    playAudio(event.data);
  }
};
```

**Get transcript:**
```bash
curl http://localhost:4000/api/voice/SESSION_ID/transcript
```

**End session:**
```bash
curl -X POST http://localhost:4000/api/voice/SESSION_ID/end
```

**List available voices:**
```bash
curl http://localhost:4000/api/voice/voices/openai
curl http://localhost:4000/api/voice/voices/elevenlabs
```

**Clone a voice (ElevenLabs):**
```bash
curl -X POST http://localhost:4000/api/voice/clone \
  -F "name=My Custom Voice" \
  -F "description=A friendly voice" \
  -F "provider=elevenlabs" \
  -F "samples=@sample1.mp3" \
  -F "samples=@sample2.mp3" \
  -F "samples=@sample3.mp3"
```

### React Component Usage

```tsx
import { VoiceChat } from '@/components/Voice';

export default function MyPage() {
  return (
    <VoiceChat
      apiUrl="http://localhost:4000/api/voice"
      userId="user-123"
      initialConfig={{
        ttsProvider: 'openai',
        voice: 'nova',
        language: 'en',
        responseStyle: 'conversational',
      }}
      onSessionStart={(sessionId) => {
        console.log('Session started:', sessionId);
      }}
      onSessionEnd={(sessionId, metrics) => {
        console.log('Session ended with metrics:', metrics);
      }}
    />
  );
}
```

## Voice Providers

### OpenAI TTS
- **Voices**: alloy, echo, fable, onyx, nova, shimmer
- **Latency**: ~300-500ms
- **Quality**: High
- **Cost**: $15/1M characters
- **Streaming**: Yes
- **Best for**: General use, low latency

### ElevenLabs
- **Voices**: 100+ pre-built + custom cloned voices
- **Latency**: ~400-700ms
- **Quality**: Excellent (most natural)
- **Cost**: $0.30/1K characters (pro tier)
- **Streaming**: Yes
- **Voice Cloning**: Yes (requires 10+ samples, 1-2 min each)
- **Best for**: Premium quality, character voices, voice cloning

### PlayHT
- **Voices**: 800+ voices in 140+ languages
- **Latency**: ~500-800ms
- **Quality**: High
- **Cost**: Varies by tier
- **Streaming**: Yes
- **Best for**: Multi-language, variety

## STT Providers

### OpenAI Whisper
- **Accuracy**: Excellent
- **Languages**: 97 languages
- **Latency**: ~500-1000ms
- **Cost**: $0.006/minute
- **Real-time**: No (batch processing)
- **Word timestamps**: Yes
- **Best for**: High accuracy, multi-language

### Deepgram
- **Accuracy**: Excellent
- **Languages**: 30+ languages
- **Latency**: ~100-300ms (real-time)
- **Cost**: $0.0125/minute
- **Real-time**: Yes (streaming)
- **Word timestamps**: Yes
- **Best for**: Real-time conversations, low latency

### AssemblyAI
- **Accuracy**: Excellent
- **Languages**: 20+ languages
- **Latency**: ~300-600ms
- **Cost**: $0.00025/second
- **Real-time**: Yes
- **Word timestamps**: Yes
- **Best for**: Balanced accuracy and speed

## Configuration Options

### Response Styles

**Concise**:
- Max tokens: 150
- Best for: Quick answers, FAQ, brief interactions
- Example: "Yes, the capital of France is Paris."

**Conversational**:
- Max tokens: 500
- Best for: Natural dialogue, tutoring, general chat
- Example: "Great question! The capital of France is Paris. It's known as the City of Light and is famous for the Eiffel Tower."

**Detailed**:
- Max tokens: 500+
- Best for: Explanations, teaching, complex topics
- Example: "The capital of France is Paris, which has been the country's capital since the 12th century..."

### Interrupt Sensitivity

**Low**:
- Silences threshold: 2000ms
- AI finishes responses before accepting interrupts
- Best for: Detailed explanations, storytelling

**Medium**:
- Silence threshold: 1000ms
- Balanced responsiveness
- Best for: General conversation

**High**:
- Silence threshold: 500ms
- Quick to interrupt
- Best for: Back-and-forth dialogue, debugging

## Monitoring & Analytics

### Session Metrics

Access via API or database:

```sql
SELECT
  COUNT(*) as total_sessions,
  AVG(duration_seconds) as avg_duration,
  AVG(total_turns) as avg_turns,
  AVG(interruptions_count) as avg_interruptions
FROM voice_sessions
WHERE user_id = 'user-123'
  AND started_at > NOW() - INTERVAL '7 days';
```

### Usage Analytics

```sql
SELECT
  stt_provider,
  tts_provider,
  SUM(characters_transcribed) as total_transcribed,
  SUM(characters_synthesized) as total_synthesized,
  SUM(audio_seconds_processed) as total_audio_processed,
  SUM(estimated_cost_usd) as total_cost
FROM voice_analytics
WHERE user_id = 'user-123'
  AND recorded_at > NOW() - INTERVAL '30 days'
GROUP BY stt_provider, tts_provider;
```

## Cost Estimation

### Example: 30-minute conversation

**OpenAI Whisper + OpenAI TTS**:
- STT: 30 min × $0.006/min = $0.18
- TTS: ~5000 chars × $15/1M = $0.075
- **Total: ~$0.26**

**Deepgram + ElevenLabs**:
- STT: 30 min × $0.0125/min = $0.375
- TTS: ~5000 chars × $0.30/1K = $1.50
- **Total: ~$1.88**

## Troubleshooting

### "Microphone permission denied"
- Check browser settings to allow microphone access
- Ensure HTTPS in production (required for getUserMedia)

### "Connection error" / "WebSocket closed"
- Verify orchestrator is running
- Check firewall allows WebSocket connections
- Ensure correct WebSocket URL (ws:// for HTTP, wss:// for HTTPS)

### "Poor audio quality"
- Check network connection
- Try different voice provider
- Reduce background noise
- Use headphones to prevent echo

### "High latency"
- Switch to faster providers (Deepgram STT + OpenAI TTS)
- Check server load
- Verify network quality
- Consider edge deployment closer to users

### "STT provider not configured"
- Add required API keys to `.env`
- Restart orchestrator after adding keys
- Verify provider name matches exactly

## Security Considerations

1. **Audio Privacy**: Audio is streamed but not stored by default. Enable storage with caution.
2. **API Keys**: Never expose API keys in frontend code. Always proxy through backend.
3. **Rate Limiting**: Implement rate limits on voice session creation.
4. **Authentication**: Add proper user authentication before production.
5. **HTTPS**: Always use HTTPS/WSS in production for encrypted audio.

## Performance Optimization

1. **Use Deepgram for STT**: Lowest latency (~100-300ms)
2. **Use OpenAI TTS**: Good balance of quality and speed
3. **Enable response streaming**: Stream TTS audio as it's generated
4. **CDN for audio files**: Store and serve audio from CDN if persisting
5. **WebSocket connection pooling**: Reuse connections where possible
6. **Compression**: Enable WebSocket compression for audio data

## Roadmap

- [ ] Voice activity detection (VAD) on client side
- [ ] Speaker diarization (multi-speaker support)
- [ ] Background noise cancellation
- [ ] Voice presets (professional, casual, excited)
- [ ] Conversation summaries
- [ ] Audio file upload for processing
- [ ] Group voice calls (multi-user)
- [ ] Voice commands (wake words)
- [ ] Integration with LibreChat main chat

## License

Part of the LibreChat Meta Agent system.
