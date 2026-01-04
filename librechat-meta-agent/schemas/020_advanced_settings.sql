-- Advanced Settings Schema for Meta Agent A++ Elevation
-- User-configurable model parameters, reasoning controls, RAG settings,
-- custom agents, skills, MCP configs, and functions
-- Competitors hide all of this - WE EXPOSE EVERYTHING

-- ============================================================================
-- USER SETTINGS (Master settings with JSON storage + versioning)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  -- Model Parameters (what ChatGPT/Claude/Gemini HIDE)
  model_parameters JSONB DEFAULT '{
    "temperature": 0.7,
    "top_p": 1.0,
    "top_k": 40,
    "frequency_penalty": 0.0,
    "presence_penalty": 0.0,
    "max_input_tokens": 128000,
    "max_output_tokens": 4096,
    "seed": null,
    "stop_sequences": []
  }'::jsonb,

  -- Reasoning Controls (UNIQUE to Meta Agent)
  reasoning_config JSONB DEFAULT '{
    "reasoning_effort": "medium",
    "thinking_budget": 10000,
    "show_thinking": true,
    "max_inflections": 10,
    "max_reflections": 5,
    "confidence_threshold": 0.7
  }'::jsonb,

  -- Search/Research Settings
  search_config JSONB DEFAULT '{
    "search_depth": 5,
    "max_sources": 10,
    "fact_verification": true,
    "source_quality_threshold": 0.6,
    "max_iterations": 5
  }'::jsonb,

  -- RAG Configuration (NO ONE exposes this)
  rag_config JSONB DEFAULT '{
    "enabled": true,
    "chunk_size": 512,
    "chunk_overlap": 50,
    "similarity_threshold": 0.7,
    "max_chunks": 10,
    "embedding_model": "text-embedding-3-small"
  }'::jsonb,

  -- Output Destinations
  output_config JSONB DEFAULT '{
    "default_destination": "chat",
    "canvas_enabled": true,
    "canvas_position": "right",
    "canvas_auto_open": false,
    "artifact_enabled": true,
    "artifact_auto_detect": true,
    "artifact_version_history": true,
    "export_formats": ["markdown", "json", "yaml"]
  }'::jsonb,

  -- UI Preferences
  ui_preferences JSONB DEFAULT '{
    "show_thinking_animation": true,
    "show_confidence_scores": true,
    "show_iteration_counts": true,
    "compact_mode": false,
    "keyboard_shortcuts": true
  }'::jsonb,

  -- Active preset (Creative, Precise, Balanced, Custom)
  active_preset VARCHAR(50) DEFAULT 'balanced',

  -- Schema versioning for migrations
  schema_version INTEGER NOT NULL DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- ============================================================================
-- PARAMETER PRESETS (Creative, Precise, Balanced, Custom)
-- ============================================================================
CREATE TABLE IF NOT EXISTS parameter_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- NULL for system presets

  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,

  -- Full configuration snapshot
  model_parameters JSONB NOT NULL,
  reasoning_config JSONB NOT NULL,
  search_config JSONB NOT NULL,
  rag_config JSONB NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert system presets
INSERT INTO parameter_presets (name, description, is_system, model_parameters, reasoning_config, search_config, rag_config)
VALUES
  ('Creative', 'Higher temperature, more creative outputs', TRUE,
   '{"temperature": 1.2, "top_p": 0.95, "top_k": 100, "frequency_penalty": 0.3, "presence_penalty": 0.3}'::jsonb,
   '{"reasoning_effort": "medium", "thinking_budget": 8000, "show_thinking": true}'::jsonb,
   '{"search_depth": 5, "max_sources": 10, "fact_verification": true}'::jsonb,
   '{"enabled": true, "chunk_size": 512, "similarity_threshold": 0.6}'::jsonb),

  ('Precise', 'Lower temperature, factual and deterministic', TRUE,
   '{"temperature": 0.3, "top_p": 0.8, "top_k": 20, "frequency_penalty": 0.0, "presence_penalty": 0.0}'::jsonb,
   '{"reasoning_effort": "high", "thinking_budget": 15000, "show_thinking": true}'::jsonb,
   '{"search_depth": 8, "max_sources": 20, "fact_verification": true}'::jsonb,
   '{"enabled": true, "chunk_size": 256, "similarity_threshold": 0.8}'::jsonb),

  ('Balanced', 'Default balanced settings', TRUE,
   '{"temperature": 0.7, "top_p": 1.0, "top_k": 40, "frequency_penalty": 0.0, "presence_penalty": 0.0}'::jsonb,
   '{"reasoning_effort": "medium", "thinking_budget": 10000, "show_thinking": true}'::jsonb,
   '{"search_depth": 5, "max_sources": 10, "fact_verification": true}'::jsonb,
   '{"enabled": true, "chunk_size": 512, "similarity_threshold": 0.7}'::jsonb),

  ('Maximum Reasoning', 'Maximum thinking depth for complex problems', TRUE,
   '{"temperature": 0.5, "top_p": 0.9, "top_k": 50, "frequency_penalty": 0.1, "presence_penalty": 0.1}'::jsonb,
   '{"reasoning_effort": "max", "thinking_budget": 50000, "show_thinking": true, "max_inflections": 20, "max_reflections": 10}'::jsonb,
   '{"search_depth": 10, "max_sources": 30, "fact_verification": true}'::jsonb,
   '{"enabled": true, "chunk_size": 1024, "similarity_threshold": 0.75}'::jsonb)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- USER RULES (Like CLAUDE.md)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('global', 'project', 'format', 'behavior')),
  name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,

  -- Rule priority (higher = applied first)
  priority INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT TRUE,

  -- Optional project scope
  project_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CUSTOM AGENTS (User-editable YAML definitions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS custom_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  name VARCHAR(255) NOT NULL,
  description TEXT,
  slug VARCHAR(255) NOT NULL,
  avatar_url TEXT,

  -- YAML configuration (the full agent definition)
  yaml_config TEXT NOT NULL,

  -- Parsed config for quick access
  parsed_config JSONB DEFAULT '{}'::jsonb,

  -- Version control
  version INTEGER DEFAULT 1,
  parent_id UUID REFERENCES custom_agents(id), -- For forking

  -- Visibility
  visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'unlisted', 'public')),
  is_featured BOOLEAN DEFAULT FALSE,

  -- Usage stats
  usage_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, slug)
);

-- ============================================================================
-- SKILLS (Reusable agent capabilities)
-- ============================================================================
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL,

  name VARCHAR(255) NOT NULL,
  description TEXT,
  slug VARCHAR(255) UNIQUE NOT NULL,
  icon VARCHAR(50), -- Lucide icon name

  -- Triggers
  triggers JSONB NOT NULL DEFAULT '{
    "commands": [],
    "keywords": [],
    "patterns": []
  }'::jsonb,

  -- Implementation
  implementation JSONB NOT NULL DEFAULT '{
    "type": "prompt",
    "prompt": "",
    "function": null,
    "workflow_id": null
  }'::jsonb,

  -- Requirements
  requires TEXT[] DEFAULT '{}',

  -- Settings schema
  settings_schema JSONB DEFAULT '{}'::jsonb,
  default_settings JSONB DEFAULT '{}'::jsonb,

  -- Marketplace
  visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'unlisted', 'public')),
  downloads INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,

  -- Version
  version VARCHAR(20) DEFAULT '1.0.0',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- USER SKILLS (Installed skills per user)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,

  enabled BOOLEAN DEFAULT TRUE,
  settings JSONB DEFAULT '{}'::jsonb,

  installed_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, skill_id)
);

-- ============================================================================
-- MCP CONFIGURATIONS (75+ servers)
-- ============================================================================
CREATE TABLE IF NOT EXISTS mcp_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  server_id VARCHAR(100) NOT NULL, -- e.g., 'github', 'supabase', 'slack'
  server_name VARCHAR(255) NOT NULL,
  category VARCHAR(50), -- 'productivity', 'development', 'data', etc.

  enabled BOOLEAN DEFAULT FALSE,

  -- Configuration
  config JSONB NOT NULL DEFAULT '{
    "api_key": null,
    "rate_limit": {
      "requests_per_minute": 60,
      "burst_size": 10
    },
    "cache": {
      "enabled": true,
      "ttl_seconds": 300
    },
    "timeout_ms": 30000
  }'::jsonb,

  -- Health status
  last_health_check TIMESTAMPTZ,
  health_status VARCHAR(20) DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, server_id)
);

-- ============================================================================
-- CUSTOM FUNCTIONS (User-defined tools)
-- ============================================================================
CREATE TABLE IF NOT EXISTS custom_functions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- OpenAI-style function schema
  parameters JSONB NOT NULL DEFAULT '{
    "type": "object",
    "properties": {},
    "required": []
  }'::jsonb,

  -- Handler configuration
  handler_type VARCHAR(50) NOT NULL CHECK (handler_type IN ('webhook', 'code', 'mcp')),
  handler_config JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Testing
  test_input JSONB,
  test_output JSONB,
  last_test_at TIMESTAMPTZ,
  last_test_status VARCHAR(20),

  enabled BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, name)
);

-- ============================================================================
-- SETTINGS HISTORY (For undo/versioning)
-- ============================================================================
CREATE TABLE IF NOT EXISTS settings_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,

  action VARCHAR(20) NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  previous_value JSONB,
  new_value JSONB,

  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- THINKING SESSIONS (Track reasoning metrics)
-- ============================================================================
CREATE TABLE IF NOT EXISTS thinking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  message_id UUID NOT NULL,

  -- Reasoning metrics (what competitors hide)
  inflection_count INTEGER DEFAULT 0,
  reflection_count INTEGER DEFAULT 0,
  turn_count INTEGER DEFAULT 0,

  -- Token usage
  thinking_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,

  -- Confidence scoring
  initial_confidence DECIMAL(5,4),
  final_confidence DECIMAL(5,4),

  -- Timing
  thinking_duration_ms INTEGER,
  total_duration_ms INTEGER,

  -- Full thought stream (expandable)
  thought_stream JSONB DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_parameter_presets_user ON parameter_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_parameter_presets_system ON parameter_presets(is_system) WHERE is_system = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_rules_user ON user_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rules_type ON user_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_custom_agents_user ON custom_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_agents_visibility ON custom_agents(visibility);
CREATE INDEX IF NOT EXISTS idx_custom_agents_slug ON custom_agents(slug);
CREATE INDEX IF NOT EXISTS idx_skills_creator ON skills(creator_id);
CREATE INDEX IF NOT EXISTS idx_skills_visibility ON skills(visibility);
CREATE INDEX IF NOT EXISTS idx_skills_slug ON skills(slug);
CREATE INDEX IF NOT EXISTS idx_user_skills_user ON user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_mcp_configs_user ON mcp_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_mcp_configs_server ON mcp_configs(server_id);
CREATE INDEX IF NOT EXISTS idx_custom_functions_user ON custom_functions(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_history_user ON settings_history(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_history_record ON settings_history(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_thinking_sessions_conversation ON thinking_sessions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_thinking_sessions_message ON thinking_sessions(message_id);

-- Full-text search for skills
CREATE INDEX IF NOT EXISTS idx_skills_search ON skills USING gin(
  to_tsvector('english', name || ' ' || COALESCE(description, ''))
);

-- Full-text search for custom agents
CREATE INDEX IF NOT EXISTS idx_agents_search ON custom_agents USING gin(
  to_tsvector('english', name || ' ' || COALESCE(description, ''))
);

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables
CREATE TRIGGER trigger_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_settings_updated_at();

CREATE TRIGGER trigger_user_rules_updated_at
  BEFORE UPDATE ON user_rules
  FOR EACH ROW EXECUTE FUNCTION update_settings_updated_at();

CREATE TRIGGER trigger_custom_agents_updated_at
  BEFORE UPDATE ON custom_agents
  FOR EACH ROW EXECUTE FUNCTION update_settings_updated_at();

CREATE TRIGGER trigger_skills_updated_at
  BEFORE UPDATE ON skills
  FOR EACH ROW EXECUTE FUNCTION update_settings_updated_at();

CREATE TRIGGER trigger_mcp_configs_updated_at
  BEFORE UPDATE ON mcp_configs
  FOR EACH ROW EXECUTE FUNCTION update_settings_updated_at();

CREATE TRIGGER trigger_custom_functions_updated_at
  BEFORE UPDATE ON custom_functions
  FOR EACH ROW EXECUTE FUNCTION update_settings_updated_at();

-- ============================================================================
-- HISTORY TRACKING FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION track_settings_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO settings_history (user_id, table_name, record_id, action, previous_value, new_value)
    VALUES (
      COALESCE(NEW.user_id, OLD.user_id),
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id),
      'update',
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO settings_history (user_id, table_name, record_id, action, previous_value)
    VALUES (OLD.user_id, TG_TABLE_NAME, OLD.id, 'delete', to_jsonb(OLD));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply history tracking
CREATE TRIGGER track_user_settings_history
  AFTER UPDATE OR DELETE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION track_settings_history();

CREATE TRIGGER track_user_rules_history
  AFTER UPDATE OR DELETE ON user_rules
  FOR EACH ROW EXECUTE FUNCTION track_settings_history();

CREATE TRIGGER track_custom_agents_history
  AFTER UPDATE OR DELETE ON custom_agents
  FOR EACH ROW EXECUTE FUNCTION track_settings_history();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get user settings with defaults
CREATE OR REPLACE FUNCTION get_user_settings(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT to_jsonb(us.*) INTO result
  FROM user_settings us
  WHERE us.user_id = p_user_id;

  IF result IS NULL THEN
    -- Return defaults if no settings exist
    result := '{
      "model_parameters": {"temperature": 0.7, "top_p": 1.0, "top_k": 40},
      "reasoning_config": {"reasoning_effort": "medium", "show_thinking": true},
      "search_config": {"search_depth": 5, "max_sources": 10},
      "rag_config": {"enabled": true, "chunk_size": 512},
      "active_preset": "balanced"
    }'::jsonb;
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Search skills with full-text
CREATE OR REPLACE FUNCTION search_skills(
  p_query TEXT,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  slug VARCHAR,
  description TEXT,
  icon VARCHAR,
  downloads INTEGER,
  rating DECIMAL,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.name,
    s.slug,
    s.description,
    s.icon,
    s.downloads,
    s.rating,
    ts_rank(to_tsvector('english', s.name || ' ' || COALESCE(s.description, '')), plainto_tsquery('english', p_query)) as rank
  FROM skills s
  WHERE
    s.visibility = 'public'
    AND to_tsvector('english', s.name || ' ' || COALESCE(s.description, '')) @@ plainto_tsquery('english', p_query)
  ORDER BY rank DESC, s.downloads DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE user_settings IS 'Master user settings with model parameters, reasoning config, RAG settings - what competitors hide';
COMMENT ON TABLE parameter_presets IS 'Saved presets for quick switching (Creative, Precise, Balanced, Custom)';
COMMENT ON TABLE user_rules IS 'User-defined rules similar to CLAUDE.md for behavior customization';
COMMENT ON TABLE custom_agents IS 'User-editable agent definitions in YAML format';
COMMENT ON TABLE skills IS 'Reusable skills/plugins with triggers and implementations';
COMMENT ON TABLE user_skills IS 'Skills installed per user with custom settings';
COMMENT ON TABLE mcp_configs IS 'MCP server configurations (75+ available servers)';
COMMENT ON TABLE custom_functions IS 'User-defined functions with webhook/code/mcp handlers';
COMMENT ON TABLE settings_history IS 'Change history for undo/versioning support';
COMMENT ON TABLE thinking_sessions IS 'Reasoning metrics per message - inflections, reflections, confidence (UNIQUE to Meta Agent)';

COMMENT ON COLUMN user_settings.model_parameters IS 'Temperature, TopK, TopP, penalties - what ChatGPT/Claude/Gemini HIDE from users';
COMMENT ON COLUMN user_settings.reasoning_config IS 'Reasoning effort, thinking budget, confidence threshold - UNIQUE to Meta Agent';
COMMENT ON COLUMN user_settings.search_config IS 'Search depth and iterations - no competitor exposes this';
COMMENT ON COLUMN user_settings.rag_config IS 'Chunk size, overlap, similarity threshold - completely hidden elsewhere';
COMMENT ON COLUMN thinking_sessions.thought_stream IS 'Full expandable reasoning stream - click to see AI thinking';
