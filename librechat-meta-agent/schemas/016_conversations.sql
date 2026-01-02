-- Conversation History Schema
-- Merged from Joanna for persistent chat with semantic search

-- =============================================
-- CONVERSATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS meta_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  project_id UUID REFERENCES meta_projects(id) ON DELETE SET NULL,
  agent_type TEXT, -- 'thinking', 'research', 'general', 'voice', etc.
  title TEXT,
  summary TEXT,
  model_used TEXT,
  total_tokens INTEGER DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  is_archived BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_user_id ON meta_conversations(user_id);
CREATE INDEX idx_conversations_project_id ON meta_conversations(project_id);
CREATE INDEX idx_conversations_agent_type ON meta_conversations(agent_type);
CREATE INDEX idx_conversations_created_at ON meta_conversations(created_at DESC);
CREATE INDEX idx_conversations_is_archived ON meta_conversations(is_archived);
CREATE INDEX idx_conversations_is_pinned ON meta_conversations(is_pinned) WHERE is_pinned = true;

-- =============================================
-- MESSAGES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS meta_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES meta_conversations(id) ON DELETE CASCADE,
  parent_message_id UUID REFERENCES meta_messages(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text', -- 'text', 'markdown', 'code', 'image', 'audio'
  -- For tool calls
  tool_name TEXT,
  tool_input JSONB,
  tool_output JSONB,
  -- For branching conversations
  branch_name TEXT,
  is_active_branch BOOLEAN DEFAULT true,
  -- Embeddings for semantic search
  embedding vector(1536),
  -- Token tracking
  tokens_used INTEGER DEFAULT 0,
  -- Reactions and feedback
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  user_feedback TEXT,
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation_id ON meta_messages(conversation_id);
CREATE INDEX idx_messages_parent_id ON meta_messages(parent_message_id);
CREATE INDEX idx_messages_role ON meta_messages(role);
CREATE INDEX idx_messages_created_at ON meta_messages(created_at);
CREATE INDEX idx_messages_embedding ON meta_messages USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_messages_active_branch ON meta_messages(conversation_id, is_active_branch) WHERE is_active_branch = true;

-- =============================================
-- MESSAGE ATTACHMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS meta_message_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES meta_messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_message_attachments_message_id ON meta_message_attachments(message_id);

-- =============================================
-- CONVERSATION SHARES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS meta_conversation_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES meta_conversations(id) ON DELETE CASCADE,
  share_token TEXT UNIQUE NOT NULL,
  shared_by UUID,
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversation_shares_conversation_id ON meta_conversation_shares(conversation_id);
CREATE INDEX idx_conversation_shares_token ON meta_conversation_shares(share_token);

-- =============================================
-- ENABLE RLS
-- =============================================
ALTER TABLE meta_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_conversation_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON meta_conversations FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can manage own conversations"
  ON meta_conversations FOR ALL
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can view own messages"
  ON meta_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM meta_conversations c
    WHERE c.id = meta_messages.conversation_id
    AND (c.user_id = auth.uid() OR c.user_id IS NULL)
  ));

CREATE POLICY "Users can manage own messages"
  ON meta_messages FOR ALL
  USING (EXISTS (
    SELECT 1 FROM meta_conversations c
    WHERE c.id = meta_messages.conversation_id
    AND (c.user_id = auth.uid() OR c.user_id IS NULL)
  ));

CREATE POLICY "Users can view own message attachments"
  ON meta_message_attachments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM meta_messages m
    JOIN meta_conversations c ON c.id = m.conversation_id
    WHERE m.id = meta_message_attachments.message_id
    AND (c.user_id = auth.uid() OR c.user_id IS NULL)
  ));

CREATE POLICY "Users can view shared conversations"
  ON meta_conversation_shares FOR SELECT
  USING (
    shared_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM meta_conversations c
      WHERE c.id = meta_conversation_shares.conversation_id
      AND (c.user_id = auth.uid() OR c.user_id IS NULL)
    )
  );

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Search messages by semantic similarity
CREATE OR REPLACE FUNCTION search_messages_by_similarity(
  p_user_id UUID,
  p_query_embedding vector(1536),
  p_limit INTEGER DEFAULT 20,
  p_conversation_id UUID DEFAULT NULL,
  p_min_similarity FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  message_id UUID,
  conversation_id UUID,
  role TEXT,
  content TEXT,
  similarity FLOAT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id as message_id,
    m.conversation_id,
    m.role,
    m.content,
    1 - (m.embedding <=> p_query_embedding) as similarity,
    m.created_at
  FROM meta_messages m
  JOIN meta_conversations c ON c.id = m.conversation_id
  WHERE (c.user_id = p_user_id OR c.user_id IS NULL)
    AND (p_conversation_id IS NULL OR m.conversation_id = p_conversation_id)
    AND m.embedding IS NOT NULL
    AND (1 - (m.embedding <=> p_query_embedding)) >= p_min_similarity
  ORDER BY m.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Get conversation with messages
CREATE OR REPLACE FUNCTION get_conversation_with_messages(
  p_conversation_id UUID,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  conversation JSONB,
  messages JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    to_jsonb(c.*) as conversation,
    COALESCE(
      jsonb_agg(
        to_jsonb(m.*) ORDER BY m.created_at ASC
      ) FILTER (WHERE m.id IS NOT NULL),
      '[]'::jsonb
    ) as messages
  FROM meta_conversations c
  LEFT JOIN meta_messages m ON m.conversation_id = c.id AND m.is_active_branch = true
  WHERE c.id = p_conversation_id
  GROUP BY c.id;
END;
$$ LANGUAGE plpgsql;

-- Update message counts trigger
CREATE OR REPLACE FUNCTION update_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE meta_conversations
    SET message_count = message_count + 1,
        total_tokens = total_tokens + COALESCE(NEW.tokens_used, 0),
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE meta_conversations
    SET message_count = GREATEST(0, message_count - 1),
        total_tokens = GREATEST(0, total_tokens - COALESCE(OLD.tokens_used, 0)),
        updated_at = NOW()
    WHERE id = OLD.conversation_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_stats_trigger
  AFTER INSERT OR DELETE ON meta_messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_stats();

-- Auto-update timestamp
CREATE TRIGGER update_meta_conversations_updated_at
  BEFORE UPDATE ON meta_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
