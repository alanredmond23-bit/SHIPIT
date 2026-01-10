-- ============================================================================
-- 002_memory_schema.sql
-- Memory/Personalization Schema Extension
-- Enhances meta_memory_facts with user-specific memory features
-- Made idempotent with IF NOT EXISTS checks
-- ============================================================================

-- Add columns to support multi-user memories (IF NOT EXISTS already used)
ALTER TABLE meta_memory_facts
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'fact',
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ;

-- Create memory categories enum (safely)
DO $$ BEGIN
  CREATE TYPE memory_category AS ENUM ('preference', 'fact', 'instruction', 'context');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_memory_user_id ON meta_memory_facts(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_category ON meta_memory_facts(category);
CREATE INDEX IF NOT EXISTS idx_memory_enabled ON meta_memory_facts(enabled);
CREATE INDEX IF NOT EXISTS idx_memory_created_at ON meta_memory_facts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_user_category ON meta_memory_facts(user_id, category) WHERE enabled = true;

-- Composite index for semantic search by user (handle potential errors)
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_memory_user_embedding ON meta_memory_facts(user_id, embedding)
    WHERE enabled = true;
EXCEPTION
  WHEN undefined_column THEN NULL;
  WHEN feature_not_supported THEN NULL;
END $$;

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to update last_accessed_at timestamp
CREATE OR REPLACE FUNCTION update_memory_access() RETURNS TRIGGER AS $$
BEGIN
  NEW.last_accessed_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to search memories by semantic similarity for a specific user
CREATE OR REPLACE FUNCTION search_user_memories(
  p_user_id UUID,
  p_query_embedding vector(1536),
  p_limit INTEGER DEFAULT 10,
  p_category TEXT DEFAULT NULL,
  p_min_similarity FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  summary TEXT,
  category TEXT,
  importance_score FLOAT,
  similarity FLOAT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.summary,
    m.category,
    m.importance_score,
    1 - (m.embedding <=> p_query_embedding) as similarity,
    m.created_at
  FROM meta_memory_facts m
  WHERE m.user_id = p_user_id
    AND m.enabled = true
    AND (p_category IS NULL OR m.category = p_category)
    AND (m.expires_at IS NULL OR m.expires_at > NOW())
    AND (1 - (m.embedding <=> p_query_embedding)) >= p_min_similarity
  ORDER BY m.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get all active memories for a user
CREATE OR REPLACE FUNCTION get_user_memories(
  p_user_id UUID,
  p_category TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  summary TEXT,
  category TEXT,
  importance_score FLOAT,
  created_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.summary,
    m.category,
    m.importance_score,
    m.created_at,
    m.last_accessed_at
  FROM meta_memory_facts m
  WHERE m.user_id = p_user_id
    AND m.enabled = true
    AND (p_category IS NULL OR m.category = p_category)
    AND (m.expires_at IS NULL OR m.expires_at > NOW())
  ORDER BY m.importance_score DESC, m.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN meta_memory_facts.user_id IS 'User ID for multi-user memory support';
COMMENT ON COLUMN meta_memory_facts.category IS 'Memory type: preference, fact, instruction, or context';
COMMENT ON COLUMN meta_memory_facts.enabled IS 'Whether this memory is active and should be retrieved';
COMMENT ON COLUMN meta_memory_facts.last_accessed_at IS 'Last time this memory was accessed/used';

COMMENT ON FUNCTION search_user_memories IS 'Search memories by semantic similarity for a specific user';
COMMENT ON FUNCTION get_user_memories IS 'Get all active memories for a user';
