# Voice System Integration Example

This guide shows how to integrate the Voice Conversation System into your LibreChat Meta Agent orchestrator.

## Step 1: Update Main Server File

Update your `orchestrator/src/index.ts`:

```typescript
import express from 'express';
import { createServer } from 'http';
import { Pool } from 'pg';
import pino from 'pino';
import cors from 'cors';
import helmet from 'helmet';
import { VoiceConversationEngine } from './services/voice-conversation';
import { createVoiceRouter } from './api/voice';

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Initialize logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

// Initialize database
const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'librechat',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

// Initialize Voice Conversation Engine
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

// Register API routes
app.use('/api/voice', createVoiceRouter(db, logger, voiceEngine, httpServer));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Start server
const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, () => {
  logger.info({ port: PORT }, 'Orchestrator server started');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');

  httpServer.close(() => {
    logger.info('HTTP server closed');
  });

  await db.end();
  logger.info('Database connections closed');

  process.exit(0);
});
```

## Step 2: Environment Configuration

Create or update `.env`:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=librechat
DB_USER=postgres
DB_PASSWORD=your_password

# AI Providers (Required)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Voice Providers (Optional but recommended)
DEEPGRAM_API_KEY=...
ASSEMBLYAI_API_KEY=...
ELEVENLABS_API_KEY=...
PLAYHT_API_KEY=...
PLAYHT_USER_ID=...

# Server
PORT=4000
LOG_LEVEL=info
NODE_ENV=development
```

## Step 3: Database Migration

Run the migration:

```bash
psql -U postgres -d librechat -f schemas/007_voice_schema.sql
```

Or with Docker:

```bash
docker exec -i postgres psql -U postgres -d librechat < schemas/007_voice_schema.sql
```

## Step 4: Update Docker Compose (if using Docker)

Update `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: librechat
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./schemas:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"

  orchestrator:
    build: ./orchestrator
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=librechat
      - DB_USER=postgres
      - DB_PASSWORD=${DB_PASSWORD}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - DEEPGRAM_API_KEY=${DEEPGRAM_API_KEY}
      - ELEVENLABS_API_KEY=${ELEVENLABS_API_KEY}
      - PORT=4000
    ports:
      - "4000:4000"
    depends_on:
      - postgres

  ui:
    build: ./ui-extensions
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:4000/api
    ports:
      - "3000:3000"
    depends_on:
      - orchestrator

volumes:
  postgres_data:
```

## Step 5: Frontend Integration

### Option A: Standalone Page

Create `ui-extensions/app/voice/page.tsx`:

```tsx
'use client';

import { VoiceChat } from '@/components/Voice';

export default function VoicePage() {
  return <VoiceChat apiUrl="http://localhost:4000/api/voice" />;
}
```

### Option B: Embedded in Chat

Add voice button to your chat interface:

```tsx
'use client';

import { useState } from 'react';
import { Mic } from 'lucide-react';
import { VoiceChat } from '@/components/Voice';

export default function ChatPage() {
  const [showVoiceChat, setShowVoiceChat] = useState(false);

  return (
    <div>
      {/* Your existing chat UI */}
      <div className="chat-container">
        {/* ... chat messages ... */}
      </div>

      {/* Voice chat button */}
      <button
        onClick={() => setShowVoiceChat(true)}
        className="fixed bottom-4 right-4 p-4 bg-indigo-600 rounded-full shadow-lg"
      >
        <Mic className="w-6 h-6 text-white" />
      </button>

      {/* Voice chat modal */}
      {showVoiceChat && (
        <div className="fixed inset-0 z-50">
          <VoiceChat
            apiUrl="http://localhost:4000/api/voice"
            onSessionEnd={() => setShowVoiceChat(false)}
          />
        </div>
      )}
    </div>
  );
}
```

## Step 6: Test the Integration

### 1. Start all services:

```bash
# Terminal 1: Database (if not using Docker)
# (Make sure PostgreSQL is running)

# Terminal 2: Orchestrator
cd orchestrator
npm run dev

# Terminal 3: UI
cd ui-extensions
npm run dev
```

### 2. Test the API:

```bash
# Check health
curl http://localhost:4000/health

# List available voices
curl http://localhost:4000/api/voice/voices/openai

# Start a session
curl -X POST http://localhost:4000/api/voice/start \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "sttProvider": "whisper",
    "ttsProvider": "openai",
    "voice": "alloy",
    "language": "en"
  }'
```

### 3. Test the UI:

Navigate to: `http://localhost:3000/voice`

## Step 7: Production Deployment

### HTTPS/WSS Configuration

For production, you need HTTPS and WSS (WebSocket Secure):

```typescript
// In your server setup
import https from 'https';
import fs from 'fs';

const httpsServer = https.createServer({
  key: fs.readFileSync('/path/to/private-key.pem'),
  cert: fs.readFileSync('/path/to/certificate.pem'),
}, app);

// Use httpsServer instead of httpServer
const voiceRouter = createVoiceRouter(db, logger, voiceEngine, httpsServer);
```

### Nginx Reverse Proxy

```nginx
server {
  listen 443 ssl http2;
  server_name your-domain.com;

  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;

  # Regular HTTP endpoints
  location /api/ {
    proxy_pass http://localhost:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }

  # WebSocket endpoint
  location /ws/voice/ {
    proxy_pass http://localhost:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400; # 24 hours
  }

  # Frontend
  location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

## Advanced Features

### Custom Voice Cloning

```typescript
// In your application
import { ElevenLabsTTSProvider } from './services/voice/tts-providers';

const elevenlabs = new ElevenLabsTTSProvider(logger, apiKey);

// Clone voice
const audioSamples = [
  fs.readFileSync('sample1.mp3'),
  fs.readFileSync('sample2.mp3'),
  fs.readFileSync('sample3.mp3'),
];

const customVoice = await elevenlabs.cloneVoice(
  'My Custom Voice',
  'A friendly and professional voice',
  audioSamples
);

console.log('Voice cloned:', customVoice.id);
```

### Emotion Detection

Enable in config:

```typescript
const config = {
  enableEmotionDetection: true,
  // ... other config
};
```

Then access in transcripts:

```typescript
const transcript = await voiceEngine.getTranscript(sessionId);

transcript.forEach(entry => {
  console.log(`${entry.role}: ${entry.text} [${entry.emotion}]`);
});
```

### Session Analytics

```typescript
// Get analytics for a user
const analytics = await db.query(`
  SELECT
    COUNT(*) as total_sessions,
    SUM(duration_seconds) as total_duration,
    AVG(total_turns) as avg_turns_per_session
  FROM voice_sessions
  WHERE user_id = $1
    AND started_at > NOW() - INTERVAL '30 days'
`, [userId]);

console.log('User analytics:', analytics.rows[0]);
```

## Monitoring

### Health Checks

Add voice-specific health check:

```typescript
app.get('/health/voice', async (req, res) => {
  const checks = {
    stt: {
      whisper: !!process.env.OPENAI_API_KEY,
      deepgram: !!process.env.DEEPGRAM_API_KEY,
      assemblyai: !!process.env.ASSEMBLYAI_API_KEY,
    },
    tts: {
      openai: !!process.env.OPENAI_API_KEY,
      elevenlabs: !!process.env.ELEVENLABS_API_KEY,
      playht: !!process.env.PLAYHT_API_KEY,
    },
    database: false,
  };

  try {
    await db.query('SELECT 1');
    checks.database = true;
  } catch (error) {
    // Database check failed
  }

  const allHealthy = Object.values(checks).every(v =>
    typeof v === 'boolean' ? v : Object.values(v).some(x => x)
  );

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
  });
});
```

### Logging

The system logs important events:

```typescript
// Session lifecycle
logger.info({ session_id, user_id }, 'Voice session started');
logger.info({ session_id, duration }, 'Voice session ended');

// Processing steps
logger.info({ text_length, duration_ms }, 'Whisper transcription completed');
logger.info({ audio_size, duration_ms }, 'TTS synthesis completed');

// Errors
logger.error({ error, session_id }, 'Error processing user speech');
```

## Troubleshooting

### WebSocket Connection Fails

Check if `httpServer` is passed correctly to `createVoiceRouter`:

```typescript
// ✅ Correct
const voiceRouter = createVoiceRouter(db, logger, voiceEngine, httpServer);

// ❌ Wrong
const voiceRouter = createVoiceRouter(db, logger, voiceEngine, app);
```

### "Provider not configured"

Ensure API keys are set:

```bash
# Check environment variables
echo $OPENAI_API_KEY
echo $ANTHROPIC_API_KEY

# Or in Node.js
console.log('OpenAI:', !!process.env.OPENAI_API_KEY);
console.log('Anthropic:', !!process.env.ANTHROPIC_API_KEY);
```

### High Latency

1. Use Deepgram for STT (real-time streaming)
2. Use OpenAI TTS (fastest synthesis)
3. Check network latency: `ping api.openai.com`
4. Consider edge deployment

## Support

For issues or questions:
1. Check logs: `tail -f orchestrator/logs/app.log`
2. Review documentation: `docs/VOICE_SYSTEM.md`
3. Test with cURL first before testing with UI
4. Verify database migrations ran successfully
