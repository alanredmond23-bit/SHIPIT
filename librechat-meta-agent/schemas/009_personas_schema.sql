-- Personas/GPTs/Gems System Schema
-- Custom AI personas with personalities, knowledge bases, and marketplace

-- Main personas table
CREATE TABLE IF NOT EXISTS personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  avatar_url TEXT,
  description TEXT NOT NULL,
  category VARCHAR(100) DEFAULT 'general',

  -- Persona configuration
  system_prompt TEXT NOT NULL,
  starter_prompts JSONB DEFAULT '[]'::jsonb,

  -- Personality traits
  personality JSONB DEFAULT '{
    "tone": "professional",
    "verbosity": "balanced",
    "creativity": 0.7
  }'::jsonb,

  -- Capabilities/features
  capabilities JSONB DEFAULT '{
    "web_search": false,
    "code_execution": false,
    "image_generation": false,
    "file_analysis": false,
    "voice_chat": false,
    "computer_use": false
  }'::jsonb,

  -- Model configuration
  model_config JSONB DEFAULT '{
    "preferred_model": "claude-3-5-sonnet-20241022",
    "temperature": 0.7,
    "max_tokens": 4096
  }'::jsonb,

  -- Voice configuration (optional)
  voice_config JSONB,

  -- Visibility and publishing
  visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'unlisted', 'public')),
  is_featured BOOLEAN DEFAULT FALSE,

  -- Versioning
  version INT DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge base for personas (uploaded files)
CREATE TABLE IF NOT EXISTS persona_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,

  -- File information
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size INT NOT NULL,
  storage_path TEXT NOT NULL,

  -- Vector embeddings reference (if processed)
  embedding_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Persona conversations
CREATE TABLE IF NOT EXISTS persona_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title VARCHAR(255),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation messages
CREATE TABLE IF NOT EXISTS persona_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES persona_conversations(id) ON DELETE CASCADE,

  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Persona likes (social feature)
CREATE TABLE IF NOT EXISTS persona_likes (
  persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (persona_id, user_id)
);

-- Persona statistics and analytics
CREATE TABLE IF NOT EXISTS persona_stats (
  persona_id UUID PRIMARY KEY REFERENCES personas(id) ON DELETE CASCADE,

  conversations_count INT DEFAULT 0,
  messages_count INT DEFAULT 0,
  likes_count INT DEFAULT 0,
  forks_count INT DEFAULT 0,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_personas_creator ON personas(creator_id);
CREATE INDEX IF NOT EXISTS idx_personas_visibility ON personas(visibility);
CREATE INDEX IF NOT EXISTS idx_personas_category ON personas(category);
CREATE INDEX IF NOT EXISTS idx_personas_slug ON personas(slug);
CREATE INDEX IF NOT EXISTS idx_personas_featured ON personas(is_featured) WHERE is_featured = TRUE;

CREATE INDEX IF NOT EXISTS idx_persona_knowledge_persona ON persona_knowledge(persona_id);
CREATE INDEX IF NOT EXISTS idx_persona_conversations_persona ON persona_conversations(persona_id);
CREATE INDEX IF NOT EXISTS idx_persona_conversations_user ON persona_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_persona_messages_conversation ON persona_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_persona_likes_user ON persona_likes(user_id);

-- Full-text search index for personas
CREATE INDEX IF NOT EXISTS idx_personas_search ON personas USING gin(
  to_tsvector('english', name || ' ' || description)
);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_personas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_personas_updated_at
  BEFORE UPDATE ON personas
  FOR EACH ROW
  EXECUTE FUNCTION update_personas_updated_at();

CREATE TRIGGER trigger_persona_conversations_updated_at
  BEFORE UPDATE ON persona_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_personas_updated_at();

-- Function to search personas with full-text search
CREATE OR REPLACE FUNCTION search_personas(
  p_query TEXT,
  p_category VARCHAR DEFAULT NULL,
  p_featured BOOLEAN DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  slug VARCHAR,
  description TEXT,
  category VARCHAR,
  avatar_url TEXT,
  visibility VARCHAR,
  is_featured BOOLEAN,
  likes_count INT,
  conversations_count INT,
  created_at TIMESTAMPTZ,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.slug,
    p.description,
    p.category,
    p.avatar_url,
    p.visibility,
    p.is_featured,
    COALESCE(s.likes_count, 0) as likes_count,
    COALESCE(s.conversations_count, 0) as conversations_count,
    p.created_at,
    ts_rank(to_tsvector('english', p.name || ' ' || p.description), plainto_tsquery('english', p_query)) as rank
  FROM personas p
  LEFT JOIN persona_stats s ON p.id = s.persona_id
  WHERE
    p.visibility = 'public'
    AND (p_query IS NULL OR to_tsvector('english', p.name || ' ' || p.description) @@ plainto_tsquery('english', p_query))
    AND (p_category IS NULL OR p.category = p_category)
    AND (p_featured IS NULL OR p.is_featured = p_featured)
  ORDER BY
    rank DESC,
    s.likes_count DESC NULLS LAST,
    p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to get trending personas (most activity in last 7 days)
CREATE OR REPLACE FUNCTION get_trending_personas(
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  slug VARCHAR,
  description TEXT,
  category VARCHAR,
  avatar_url TEXT,
  likes_count INT,
  recent_conversations INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.slug,
    p.description,
    p.category,
    p.avatar_url,
    COALESCE(s.likes_count, 0) as likes_count,
    COUNT(pc.id)::INT as recent_conversations
  FROM personas p
  LEFT JOIN persona_stats s ON p.id = s.persona_id
  LEFT JOIN persona_conversations pc ON p.id = pc.persona_id AND pc.created_at > NOW() - INTERVAL '7 days'
  WHERE p.visibility = 'public'
  GROUP BY p.id, p.name, p.slug, p.description, p.category, p.avatar_url, s.likes_count
  HAVING COUNT(pc.id) > 0
  ORDER BY recent_conversations DESC, s.likes_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get persona categories with counts
CREATE OR REPLACE FUNCTION get_persona_categories()
RETURNS TABLE (
  category VARCHAR,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.category,
    COUNT(*) as count
  FROM personas p
  WHERE p.visibility = 'public'
  GROUP BY p.category
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE personas IS 'Custom AI personas/GPTs/Gems with personalities and configurations';
COMMENT ON TABLE persona_knowledge IS 'Knowledge base files uploaded for personas';
COMMENT ON TABLE persona_conversations IS 'User conversations with personas';
COMMENT ON TABLE persona_messages IS 'Messages within persona conversations';
COMMENT ON TABLE persona_likes IS 'User likes on public personas';
COMMENT ON TABLE persona_stats IS 'Usage statistics and analytics for personas';

COMMENT ON COLUMN personas.system_prompt IS 'Custom system prompt that defines persona behavior';
COMMENT ON COLUMN personas.personality IS 'Personality configuration (tone, verbosity, creativity)';
COMMENT ON COLUMN personas.capabilities IS 'Available features/tools for this persona';
COMMENT ON COLUMN personas.visibility IS 'Who can see this persona: private, unlisted, or public';
COMMENT ON COLUMN personas.is_featured IS 'Whether this persona is featured in the marketplace';
COMMENT ON COLUMN persona_knowledge.embedding_id IS 'Reference to vector embeddings for RAG';

-- Sample categories (insert initial data)
-- INSERT INTO personas (creator_id, name, slug, description, category, system_prompt, visibility, is_featured)
-- VALUES
--   ('00000000-0000-0000-0000-000000000000', 'Code Reviewer', 'code-reviewer', 'Expert code reviewer with deep knowledge of best practices', 'development', 'You are an expert code reviewer...', 'public', true),
--   ('00000000-0000-0000-0000-000000000000', 'Study Buddy', 'study-buddy', 'Patient tutor that helps with learning', 'education', 'You are a patient study buddy...', 'public', true);
