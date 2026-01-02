-- Computer Use System Schema
-- Database schema for browser automation and computer use features

-- ============================================================================
-- Computer Sessions
-- ============================================================================

CREATE TABLE IF NOT EXISTS computer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('browser', 'desktop')),
  status VARCHAR(50) NOT NULL CHECK (status IN ('starting', 'active', 'paused', 'ended')),
  config JSONB DEFAULT '{}'::jsonb,
  current_url TEXT,
  screenshot_url TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_computer_sessions_user_id
  ON computer_sessions(user_id);

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_computer_sessions_status
  ON computer_sessions(status)
  WHERE status != 'ended';

-- Index for active sessions
CREATE INDEX IF NOT EXISTS idx_computer_sessions_active
  ON computer_sessions(user_id, status)
  WHERE status IN ('active', 'paused');

-- ============================================================================
-- Computer Actions
-- ============================================================================

CREATE TABLE IF NOT EXISTS computer_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES computer_sessions(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
    'click', 'type', 'scroll', 'navigate', 'screenshot',
    'wait', 'select', 'hover', 'drag', 'key_press'
  )),
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB DEFAULT '{}'::jsonb,
  screenshot_url TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for session queries
CREATE INDEX IF NOT EXISTS idx_computer_actions_session_id
  ON computer_actions(session_id, created_at DESC);

-- Index for action type analysis
CREATE INDEX IF NOT EXISTS idx_computer_actions_type
  ON computer_actions(action_type, created_at DESC);

-- Index for failed actions
CREATE INDEX IF NOT EXISTS idx_computer_actions_failures
  ON computer_actions(session_id, created_at DESC)
  WHERE success = false;

-- ============================================================================
-- Saved Workflows
-- ============================================================================

CREATE TABLE IF NOT EXISTS saved_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_public BOOLEAN DEFAULT false,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user workflows
CREATE INDEX IF NOT EXISTS idx_saved_workflows_user_id
  ON saved_workflows(user_id, created_at DESC);

-- Index for public workflows
CREATE INDEX IF NOT EXISTS idx_saved_workflows_public
  ON saved_workflows(is_public, created_at DESC)
  WHERE is_public = true;

-- Index for tag searches
CREATE INDEX IF NOT EXISTS idx_saved_workflows_tags
  ON saved_workflows USING gin(tags);

-- ============================================================================
-- Workflow Executions
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES saved_workflows(id) ON DELETE CASCADE,
  session_id UUID REFERENCES computer_sessions(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  steps_completed INTEGER DEFAULT 0,
  total_steps INTEGER NOT NULL,
  current_step INTEGER,
  error_message TEXT,
  result JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

-- Index for workflow queries
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id
  ON workflow_executions(workflow_id, started_at DESC);

-- Index for user executions
CREATE INDEX IF NOT EXISTS idx_workflow_executions_user_id
  ON workflow_executions(user_id, started_at DESC);

-- Index for running executions
CREATE INDEX IF NOT EXISTS idx_workflow_executions_running
  ON workflow_executions(status, started_at DESC)
  WHERE status = 'running';

-- ============================================================================
-- Screen Snapshots (for analysis and replay)
-- ============================================================================

CREATE TABLE IF NOT EXISTS screen_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES computer_sessions(id) ON DELETE CASCADE,
  action_id UUID REFERENCES computer_actions(id) ON DELETE SET NULL,
  screenshot_url TEXT NOT NULL,
  screenshot_data TEXT, -- Base64 encoded screenshot
  analysis JSONB DEFAULT '{}'::jsonb, -- Vision analysis results
  detected_elements JSONB DEFAULT '[]'::jsonb,
  html_snapshot TEXT,
  url TEXT,
  viewport_width INTEGER,
  viewport_height INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for session snapshots
CREATE INDEX IF NOT EXISTS idx_screen_snapshots_session_id
  ON screen_snapshots(session_id, created_at DESC);

-- Index for action snapshots
CREATE INDEX IF NOT EXISTS idx_screen_snapshots_action_id
  ON screen_snapshots(action_id);

-- ============================================================================
-- Element Interactions (tracking clicked/interacted elements)
-- ============================================================================

CREATE TABLE IF NOT EXISTS element_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES computer_sessions(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES computer_actions(id) ON DELETE CASCADE,
  element_type VARCHAR(50),
  element_text TEXT,
  selector TEXT,
  coordinates JSONB, -- {x, y}
  attributes JSONB DEFAULT '{}'::jsonb,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for session interactions
CREATE INDEX IF NOT EXISTS idx_element_interactions_session_id
  ON element_interactions(session_id, created_at DESC);

-- Index for element type analysis
CREATE INDEX IF NOT EXISTS idx_element_interactions_type
  ON element_interactions(element_type, created_at DESC);

-- ============================================================================
-- Task Executions (AI-driven task planning)
-- ============================================================================

CREATE TABLE IF NOT EXISTS computer_task_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES computer_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  task_description TEXT NOT NULL,
  planned_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  executed_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(50) NOT NULL CHECK (status IN ('planning', 'executing', 'completed', 'failed')),
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 0,
  success BOOLEAN,
  error_message TEXT,
  final_screenshot_url TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

-- Index for session tasks
CREATE INDEX IF NOT EXISTS idx_computer_task_executions_session_id
  ON computer_task_executions(session_id, started_at DESC);

-- Index for user tasks
CREATE INDEX IF NOT EXISTS idx_computer_task_executions_user_id
  ON computer_task_executions(user_id, started_at DESC);

-- Index for running tasks
CREATE INDEX IF NOT EXISTS idx_computer_task_executions_running
  ON computer_task_executions(status)
  WHERE status IN ('planning', 'executing');

-- ============================================================================
-- Download Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS computer_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES computer_sessions(id) ON DELETE CASCADE,
  action_id UUID REFERENCES computer_actions(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  url_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for session downloads
CREATE INDEX IF NOT EXISTS idx_computer_downloads_session_id
  ON computer_downloads(session_id, created_at DESC);

-- ============================================================================
-- Session Analytics
-- ============================================================================

CREATE TABLE IF NOT EXISTS computer_session_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES computer_sessions(id) ON DELETE CASCADE,
  total_actions INTEGER DEFAULT 0,
  successful_actions INTEGER DEFAULT 0,
  failed_actions INTEGER DEFAULT 0,
  pages_visited INTEGER DEFAULT 0,
  urls_visited TEXT[] DEFAULT ARRAY[]::TEXT[],
  total_duration_ms INTEGER DEFAULT 0,
  screenshots_taken INTEGER DEFAULT 0,
  elements_clicked INTEGER DEFAULT 0,
  forms_filled INTEGER DEFAULT 0,
  files_downloaded INTEGER DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for session analytics
CREATE INDEX IF NOT EXISTS idx_computer_session_analytics_session_id
  ON computer_session_analytics(session_id);

-- ============================================================================
-- Triggers for updated_at columns
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_computer_sessions_updated_at
  BEFORE UPDATE ON computer_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_workflows_updated_at
  BEFORE UPDATE ON saved_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to get session statistics
CREATE OR REPLACE FUNCTION get_session_stats(p_session_id UUID)
RETURNS TABLE (
  total_actions BIGINT,
  successful_actions BIGINT,
  failed_actions BIGINT,
  unique_urls BIGINT,
  duration_seconds INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_actions,
    COUNT(*) FILTER (WHERE success = true)::BIGINT as successful_actions,
    COUNT(*) FILTER (WHERE success = false)::BIGINT as failed_actions,
    COUNT(DISTINCT (params->>'url'))::BIGINT as unique_urls,
    EXTRACT(EPOCH FROM (
      SELECT COALESCE(ended_at, NOW()) - started_at
      FROM computer_sessions
      WHERE id = p_session_id
    ))::INTEGER as duration_seconds
  FROM computer_actions
  WHERE session_id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old sessions
CREATE OR REPLACE FUNCTION cleanup_old_computer_sessions(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM computer_sessions
    WHERE status = 'ended'
      AND ended_at < NOW() - INTERVAL '1 day' * days_old
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Initial Data / Comments
-- ============================================================================

COMMENT ON TABLE computer_sessions IS 'Browser automation sessions for computer use feature';
COMMENT ON TABLE computer_actions IS 'Individual actions performed within computer use sessions';
COMMENT ON TABLE saved_workflows IS 'User-defined workflows for browser automation';
COMMENT ON TABLE workflow_executions IS 'Execution history of saved workflows';
COMMENT ON TABLE screen_snapshots IS 'Screenshots and analysis data for session replay';
COMMENT ON TABLE element_interactions IS 'Tracking of UI element interactions';
COMMENT ON TABLE computer_task_executions IS 'AI-driven task execution history';
COMMENT ON TABLE computer_downloads IS 'Files downloaded during computer use sessions';
COMMENT ON TABLE computer_session_analytics IS 'Aggregated analytics for sessions';
