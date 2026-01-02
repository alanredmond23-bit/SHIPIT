# Voice API Reference

Complete API reference for the Voice Conversation System.

## Base URL

```
http://localhost:4000/api/voice
```

Production:
```
https://your-domain.com/api/voice
```

## Authentication

> **Note**: Current implementation uses a simple `userId` parameter. In production, implement proper JWT/session-based authentication.

---

## Endpoints

### Start Voice Session

Start a new voice conversation session.

**Endpoint:** `POST /api/voice/start`

**Request Body:**
```json
{
  "userId": "string",
  "sttProvider": "whisper" | "deepgram" | "assemblyai",
  "ttsProvider": "openai" | "elevenlabs" | "playht",
  "voice": "string",
  "language": "string",
  "interruptSensitivity": "low" | "medium" | "high",
  "responseStyle": "concise" | "conversational" | "detailed",
  "enableEmotionDetection": boolean,
  "systemPrompt": "string" // optional
}
```

**Example:**
```bash
curl -X POST http://localhost:4000/api/voice/start \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "sttProvider": "whisper",
    "ttsProvider": "openai",
    "voice": "alloy",
    "language": "en",
    "interruptSensitivity": "medium",
    "responseStyle": "conversational",
    "enableEmotionDetection": false
  }'
```

**Response:** `200 OK`
```json
{
  "success": true,
  "session": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "active",
    "config": {
      "sttProvider": "whisper",
      "ttsProvider": "openai",
      "voice": "alloy",
      "language": "en",
      "interruptSensitivity": "medium",
      "responseStyle": "conversational",
      "enableEmotionDetection": false
    },
    "wsUrl": "ws://localhost:4000/ws/voice/550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Error Response:** `500 Internal Server Error`
```json
{
  "success": false,
  "error": "STT provider 'whisper' not found or not configured"
}
```

---

### End Voice Session

End an active voice session and get final statistics.

**Endpoint:** `POST /api/voice/:sessionId/end`

**URL Parameters:**
- `sessionId` (string): The session ID

**Example:**
```bash
curl -X POST http://localhost:4000/api/voice/550e8400-e29b-41d4-a716-446655440000/end
```

**Response:** `200 OK`
```json
{
  "success": true,
  "session": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "ended",
    "stats": {
      "duration": 180000,
      "userSpeakTime": 60000,
      "aiSpeakTime": 45000,
      "interruptions": 2,
      "totalTurns": 12
    },
    "duration": 180000
  }
}
```

---

### Get Session Details

Get details about a voice session.

**Endpoint:** `GET /api/voice/:sessionId`

**URL Parameters:**
- `sessionId` (string): The session ID

**Example:**
```bash
curl http://localhost:4000/api/voice/550e8400-e29b-41d4-a716-446655440000
```

**Response:** `200 OK`
```json
{
  "success": true,
  "session": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user-123",
    "status": "active",
    "config": { ... },
    "transcript": [],
    "stats": {
      "duration": 45000,
      "userSpeakTime": 15000,
      "aiSpeakTime": 12000,
      "interruptions": 1,
      "totalTurns": 5
    },
    "startedAt": "2024-01-15T10:30:00Z",
    "endedAt": null
  }
}
```

**Error Response:** `404 Not Found`
```json
{
  "success": false,
  "error": "Session not found"
}
```

---

### Get Session Transcript

Get the full transcript of a voice session.

**Endpoint:** `GET /api/voice/:sessionId/transcript`

**URL Parameters:**
- `sessionId` (string): The session ID

**Example:**
```bash
curl http://localhost:4000/api/voice/550e8400-e29b-41d4-a716-446655440000/transcript
```

**Response:** `200 OK`
```json
{
  "success": true,
  "transcript": [
    {
      "id": "trans-001",
      "role": "user",
      "text": "What's the weather like today?",
      "audioUrl": null,
      "timestamp": "2024-01-15T10:30:15Z",
      "duration": 2500,
      "emotion": null,
      "confidence": 0.95
    },
    {
      "id": "trans-002",
      "role": "assistant",
      "text": "I don't have access to real-time weather data, but I'd be happy to help you find that information.",
      "audioUrl": null,
      "timestamp": "2024-01-15T10:30:18Z",
      "duration": 5000,
      "emotion": null,
      "confidence": 1.0
    }
  ],
  "count": 2
}
```

---

### List Available Voices

Get list of available voices for a TTS provider.

**Endpoint:** `GET /api/voice/voices/:provider`

**URL Parameters:**
- `provider` (string): TTS provider name (`openai`, `elevenlabs`, `playht`)

**Example:**
```bash
curl http://localhost:4000/api/voice/voices/openai
```

**Response:** `200 OK`
```json
{
  "success": true,
  "provider": "openai",
  "voices": [
    {
      "id": "alloy",
      "name": "Alloy",
      "description": "Neutral and balanced voice",
      "gender": "neutral",
      "use_case": "general"
    },
    {
      "id": "echo",
      "name": "Echo",
      "description": "Male voice with clear pronunciation",
      "gender": "male",
      "use_case": "general"
    },
    {
      "id": "fable",
      "name": "Fable",
      "description": "British male voice with expressive tone",
      "gender": "male",
      "accent": "british",
      "use_case": "storytelling"
    },
    {
      "id": "onyx",
      "name": "Onyx",
      "description": "Deep male voice",
      "gender": "male",
      "use_case": "authoritative"
    },
    {
      "id": "nova",
      "name": "Nova",
      "description": "Young female voice with energy",
      "gender": "female",
      "age": "young",
      "use_case": "friendly"
    },
    {
      "id": "shimmer",
      "name": "Shimmer",
      "description": "Soft female voice",
      "gender": "female",
      "use_case": "gentle"
    }
  ],
  "count": 6
}
```

**Error Response:** `500 Internal Server Error`
```json
{
  "success": false,
  "error": "TTS provider 'xyz' not found or not configured"
}
```

---

### Clone Voice

Clone a custom voice using audio samples (ElevenLabs only).

**Endpoint:** `POST /api/voice/clone`

**Request:** `multipart/form-data`

**Form Fields:**
- `name` (string): Name for the custom voice
- `description` (string): Description of the voice
- `provider` (string): Provider name (currently only `elevenlabs`)
- `samples` (file[]): Audio files (3-10 samples, 1-2 min each, MP3 format)

**Example:**
```bash
curl -X POST http://localhost:4000/api/voice/clone \
  -F "name=My Custom Voice" \
  -F "description=A friendly professional voice" \
  -F "provider=elevenlabs" \
  -F "samples=@sample1.mp3" \
  -F "samples=@sample2.mp3" \
  -F "samples=@sample3.mp3"
```

**Response:** `200 OK`
```json
{
  "success": true,
  "voice": {
    "id": "voice-uuid-123",
    "name": "My Custom Voice",
    "description": "A friendly professional voice",
    "provider": "elevenlabs",
    "providerVoiceId": "elevenlabs-voice-id",
    "status": "completed"
  }
}
```

**Error Response:** `400 Bad Request`
```json
{
  "success": false,
  "error": "At least one audio sample is required"
}
```

---

### Get Custom Voices

Get user's custom cloned voices.

**Endpoint:** `GET /api/voice/my-voices`

**Query Parameters:**
- `userId` (string): User ID

**Example:**
```bash
curl "http://localhost:4000/api/voice/my-voices?userId=user-123"
```

**Response:** `200 OK`
```json
{
  "success": true,
  "voices": [
    {
      "id": "voice-uuid-123",
      "name": "My Custom Voice",
      "description": "A friendly professional voice",
      "provider": "elevenlabs",
      "providerVoiceId": "elevenlabs-voice-id",
      "previewUrl": "https://...",
      "language": "en",
      "gender": "male",
      "age": null,
      "accent": null,
      "useCase": null,
      "status": "completed",
      "isPublic": false,
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "count": 1
}
```

---

### Delete Custom Voice

Delete a custom voice.

**Endpoint:** `DELETE /api/voice/my-voices/:voiceId`

**URL Parameters:**
- `voiceId` (string): Voice ID

**Query Parameters:**
- `userId` (string): User ID

**Example:**
```bash
curl -X DELETE "http://localhost:4000/api/voice/my-voices/voice-uuid-123?userId=user-123"
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Voice deleted successfully"
}
```

**Error Response:** `404 Not Found`
```json
{
  "success": false,
  "error": "Voice not found"
}
```

---

### Get Analytics

Get voice usage analytics for a user.

**Endpoint:** `GET /api/voice/analytics`

**Query Parameters:**
- `userId` (string): User ID
- `startDate` (string): Start date (ISO 8601) - optional
- `endDate` (string): End date (ISO 8601) - optional

**Example:**
```bash
curl "http://localhost:4000/api/voice/analytics?userId=user-123&startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z"
```

**Response:** `200 OK`
```json
{
  "success": true,
  "analytics": {
    "total_sessions": "15",
    "total_characters_transcribed": "45000",
    "total_characters_synthesized": "38000",
    "total_audio_seconds_processed": "450.5",
    "total_audio_seconds_generated": "380.2",
    "avg_cost_per_session": "0.25",
    "total_estimated_cost": "3.75"
  }
}
```

---

## WebSocket Protocol

### Connection

Connect to the WebSocket URL returned from the `POST /start` endpoint:

```javascript
const ws = new WebSocket('ws://localhost:4000/ws/voice/SESSION_ID');
```

### Message Types

#### Client → Server

**Send Audio Chunk (Binary)**
```javascript
// Send raw audio data
ws.send(audioBlob);
```

**Start Speaking (JSON)**
```javascript
ws.send(JSON.stringify({
  type: 'start_speaking',
  data: {},
  timestamp: Date.now()
}));
```

**Stop Speaking (JSON)**
```javascript
ws.send(JSON.stringify({
  type: 'stop_speaking',
  data: {},
  timestamp: Date.now()
}));
```

**Interrupt (JSON)**
```javascript
ws.send(JSON.stringify({
  type: 'interrupt',
  data: {},
  timestamp: Date.now()
}));
```

**Config Update (JSON)**
```javascript
ws.send(JSON.stringify({
  type: 'config_update',
  data: {
    silenceThreshold: 1500
  },
  timestamp: Date.now()
}));
```

#### Server → Client

**Transcript (JSON)**
```json
{
  "type": "transcript",
  "data": {
    "role": "user",
    "text": "What's the weather like?",
    "confidence": 0.95,
    "duration": 2500
  },
  "timestamp": 1705315815000
}
```

**Audio Start (JSON)**
```json
{
  "type": "audio_start",
  "data": {},
  "timestamp": 1705315818000
}
```

**Audio Response (Binary)**
```
// Raw audio data (MP3 format)
<Buffer ...>
```

**Audio End (JSON)**
```json
{
  "type": "audio_end",
  "data": {},
  "timestamp": 1705315823000
}
```

**Status (JSON)**
```json
{
  "type": "status",
  "data": {
    "status": "transcribing"
  },
  "timestamp": 1705315816000
}
```

Status values:
- `connected` - WebSocket connected
- `transcribing` - Converting speech to text
- `thinking` - Generating AI response
- `synthesizing` - Converting text to speech

**Metrics (JSON)**
```json
{
  "type": "metrics",
  "data": {
    "totalTurns": 12,
    "userSpeakTime": 60000,
    "aiSpeakTime": 45000,
    "latency": 850
  },
  "timestamp": 1705315825000
}
```

**Error (JSON)**
```json
{
  "type": "error",
  "data": {
    "message": "Failed to process speech",
    "code": "STT_ERROR"
  },
  "timestamp": 1705315820000
}
```

### WebSocket Example

```javascript
// Connect
const ws = new WebSocket('ws://localhost:4000/ws/voice/SESSION_ID');

ws.onopen = () => {
  console.log('Connected to voice session');

  // Start recording
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(event.data); // Send audio chunk
        }
      };

      mediaRecorder.start(100); // Send chunks every 100ms
    });
};

ws.onmessage = (event) => {
  if (typeof event.data === 'string') {
    // JSON message
    const message = JSON.parse(event.data);

    switch (message.type) {
      case 'transcript':
        console.log(`${message.data.role}: ${message.data.text}`);
        break;

      case 'status':
        console.log('Status:', message.data.status);
        break;

      case 'metrics':
        console.log('Metrics:', message.data);
        break;

      case 'error':
        console.error('Error:', message.data.message);
        break;
    }
  } else {
    // Binary audio data
    playAudio(event.data);
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('WebSocket closed');
};
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `SESSION_NOT_FOUND` | Session ID doesn't exist |
| `STT_ERROR` | Speech-to-text processing failed |
| `TTS_ERROR` | Text-to-speech synthesis failed |
| `AI_ERROR` | AI response generation failed |
| `PROVIDER_NOT_CONFIGURED` | Required provider not configured |
| `INVALID_CONFIG` | Invalid configuration parameters |
| `AUDIO_ERROR` | Audio processing error |
| `NETWORK_ERROR` | Network connection issue |

---

## Rate Limits

> **Note**: Implement rate limiting in production to prevent abuse.

Recommended limits:
- Session creation: 10 per hour per user
- Concurrent sessions: 3 per user
- Voice cloning: 5 per day per user
- API calls: 100 per minute per user

---

## Best Practices

1. **Always close sessions** when done to free resources
2. **Handle WebSocket reconnections** for network issues
3. **Implement exponential backoff** for retries
4. **Validate audio format** before sending (WebM recommended)
5. **Monitor latency metrics** to detect issues early
6. **Use appropriate providers** for your use case (see docs)
7. **Enable HTTPS/WSS** in production for security
8. **Implement proper authentication** before production deployment

---

## SDKs and Libraries

### JavaScript/TypeScript

```typescript
import { VoiceClient } from '@librechat/voice-client';

const client = new VoiceClient('http://localhost:4000/api/voice');

const session = await client.startSession({
  userId: 'user-123',
  config: {
    ttsProvider: 'openai',
    voice: 'alloy',
    language: 'en',
  },
});

client.on('transcript', (entry) => {
  console.log(`${entry.role}: ${entry.text}`);
});

client.on('metrics', (metrics) => {
  console.log('Latency:', metrics.latency);
});

await client.endSession();
```

### Python

```python
import requests
import websocket
import json

# Start session
response = requests.post('http://localhost:4000/api/voice/start', json={
    'userId': 'user-123',
    'sttProvider': 'whisper',
    'ttsProvider': 'openai',
    'voice': 'alloy',
    'language': 'en',
})

session = response.json()['session']
ws_url = session['wsUrl']

# Connect WebSocket
ws = websocket.create_connection(ws_url)

# Send audio
with open('audio.webm', 'rb') as f:
    ws.send(f.read(), opcode=websocket.ABNF.OPCODE_BINARY)

# Receive messages
while True:
    message = ws.recv()
    if isinstance(message, str):
        data = json.loads(message)
        print(f"{data['type']}: {data['data']}")
    else:
        # Save audio
        with open('response.mp3', 'wb') as f:
            f.write(message)
```

---

For more details, see the [Full Documentation](./VOICE_SYSTEM.md).
