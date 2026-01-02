-- Voice Conversation System Schema
-- Supports real-time voice conversations with STT/TTS, transcripts, and custom voices

-- Voice sessions table
CREATE TABLE IF NOT EXISTS voice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(50) NOT NULL DEFAULT 'connecting',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Stats tracking
  user_speak_time_ms INTEGER DEFAULT 0,
  ai_speak_time_ms INTEGER DEFAULT 0,
  interruptions_count INTEGER DEFAULT 0,
  total_turns INTEGER DEFAULT 0,

  -- Quality metrics
  avg_latency_ms INTEGER,
  avg_confidence FLOAT,

  CONSTRAINT valid_status CHECK (status IN ('connecting', 'active', 'paused', 'ended', 'error')),
  CONSTRAINT valid_duration CHECK (duration_seconds IS NULL OR duration_seconds >= 0)
);

-- Indexes for voice sessions
CREATE INDEX IF NOT EXISTS idx_voice_sessions_user_id ON voice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_status ON voice_sessions(status);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_started_at ON voice_sessions(started_at DESC);

-- Voice transcripts table
CREATE TABLE IF NOT EXISTS voice_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES voice_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  text TEXT NOT NULL,
  audio_url TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_ms INTEGER NOT NULL DEFAULT 0,

  -- Analysis
  emotion VARCHAR(50),
  confidence FLOAT,
  language VARCHAR(10),

  -- Word-level timestamps for advanced features
  word_timestamps JSONB,

  -- Metadata
  stt_provider VARCHAR(50),
  tts_provider VARCHAR(50),
  model_used VARCHAR(100),

  CONSTRAINT valid_role CHECK (role IN ('user', 'assistant')),
  CONSTRAINT valid_confidence CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  CONSTRAINT valid_duration CHECK (duration_ms >= 0)
);

-- Indexes for voice transcripts
CREATE INDEX IF NOT EXISTS idx_voice_transcripts_session_id ON voice_transcripts(session_id);
CREATE INDEX IF NOT EXISTS idx_voice_transcripts_timestamp ON voice_transcripts(timestamp);
CREATE INDEX IF NOT EXISTS idx_voice_transcripts_role ON voice_transcripts(role);

-- Custom voices table (for voice cloning)
CREATE TABLE IF NOT EXISTS custom_voices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  provider_voice_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  preview_url TEXT,

  -- Voice characteristics
  language VARCHAR(10),
  gender VARCHAR(20),
  age VARCHAR(50),
  accent VARCHAR(100),
  use_case VARCHAR(100),

  -- Training data
  sample_count INTEGER DEFAULT 0,
  training_status VARCHAR(50) DEFAULT 'pending',

  -- Permissions
  is_public BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_provider CHECK (provider IN ('openai', 'elevenlabs', 'playht', 'custom')),
  CONSTRAINT valid_training_status CHECK (training_status IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT unique_user_voice_name UNIQUE(user_id, name)
);

-- Indexes for custom voices
CREATE INDEX IF NOT EXISTS idx_custom_voices_user_id ON custom_voices(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_voices_provider ON custom_voices(provider);
CREATE INDEX IF NOT EXISTS idx_custom_voices_is_public ON custom_voices(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_custom_voices_is_active ON custom_voices(is_active) WHERE is_active = true;

-- Voice analytics table (for usage tracking and billing)
CREATE TABLE IF NOT EXISTS voice_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES voice_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Provider usage
  stt_provider VARCHAR(50),
  tts_provider VARCHAR(50),

  -- Character/token counts for billing
  characters_transcribed INTEGER DEFAULT 0,
  characters_synthesized INTEGER DEFAULT 0,

  -- Audio metrics
  audio_seconds_processed FLOAT DEFAULT 0,
  audio_seconds_generated FLOAT DEFAULT 0,

  -- Costs (if tracking)
  estimated_cost_usd DECIMAL(10, 6),

  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_characters CHECK (characters_transcribed >= 0 AND characters_synthesized >= 0)
);

-- Indexes for voice analytics
CREATE INDEX IF NOT EXISTS idx_voice_analytics_user_id ON voice_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_analytics_session_id ON voice_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_voice_analytics_recorded_at ON voice_analytics(recorded_at DESC);

-- Function to update session duration on end
CREATE OR REPLACE FUNCTION update_voice_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'ended' AND NEW.ended_at IS NOT NULL THEN
    NEW.duration_seconds := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating duration
DROP TRIGGER IF EXISTS trigger_update_voice_session_duration ON voice_sessions;
CREATE TRIGGER trigger_update_voice_session_duration
  BEFORE UPDATE ON voice_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_voice_session_duration();

-- Function to update custom voices timestamp
CREATE OR REPLACE FUNCTION update_custom_voices_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating timestamp
DROP TRIGGER IF EXISTS trigger_update_custom_voices_timestamp ON custom_voices;
CREATE TRIGGER trigger_update_custom_voices_timestamp
  BEFORE UPDATE ON custom_voices
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_voices_timestamp();

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON voice_sessions TO orchestrator_user;
-- GRANT ALL PRIVILEGES ON voice_transcripts TO orchestrator_user;
-- GRANT ALL PRIVILEGES ON custom_voices TO orchestrator_user;
-- GRANT ALL PRIVILEGES ON voice_analytics TO orchestrator_user;
