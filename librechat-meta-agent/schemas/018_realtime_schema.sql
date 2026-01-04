-- Real-time Collaboration Schema
-- Database tables for real-time features: presence, sync, and collaboration

-- ENUM Types for real-time collaboration
CREATE TYPE presence_status_enum AS ENUM ('online', 'away', 'busy', 'offline');
CREATE TYPE collaboration_role AS ENUM ('owner', 'editor', 'viewer');
CREATE TYPE operation_type_enum AS ENUM ('insert', 'delete', 'update', 'move');

-- ============================================================================
-- PRESENCE TRACKING
-- ============================================================================

-- User presence status
-- Tracks who's online, what they're viewing, and their current status
CREATE TABLE presence_status (
  user_id UUID PRIMARY KEY,
  status presence_status_enum DEFAULT 'online',
  current_view JSONB, -- { type: 'project|conversation|workflow|task', id: string, name: string }
  cursor JSONB, -- { x: number, y: number, viewportId: string }
  metadata JSONB DEFAULT '{}'::jsonb,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Presence history for analytics
CREATE TABLE presence_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  status presence_status_enum NOT NULL,
  session_duration INTEGER, -- seconds
  views_visited JSONB DEFAULT '[]'::jsonb, -- Array of views visited during session
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================================================
-- REAL-TIME EVENTS
-- ============================================================================

-- Real-time events log
-- Stores all real-time events for debugging and replay
CREATE TABLE realtime_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  room_id TEXT,
  user_id UUID,
  client_id TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================================================
-- COLLABORATION SESSIONS
-- ============================================================================

-- Collaboration sessions
-- Tracks active collaboration sessions (rooms)
CREATE TABLE collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id TEXT NOT NULL UNIQUE,
  resource_type TEXT NOT NULL, -- 'project', 'workflow', 'conversation', etc.
  resource_id UUID NOT NULL,
  name TEXT,
  owner_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  participant_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Session participants
CREATE TABLE session_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role collaboration_role DEFAULT 'viewer',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{}'::jsonb,
  UNIQUE(session_id, user_id)
);

-- ============================================================================
-- OPERATIONAL TRANSFORM / SYNC
-- ============================================================================

-- Resource state for sync
-- Stores the current state and version of collaborative resources
CREATE TABLE realtime_resource_state (
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  version INTEGER DEFAULT 0,
  data JSONB NOT NULL,
  last_modified TIMESTAMPTZ DEFAULT NOW(),
  last_modified_by UUID,
  checksum TEXT, -- For integrity validation
  metadata JSONB DEFAULT '{}'::jsonb,
  PRIMARY KEY (resource_type, resource_id)
);

-- Operations log for operational transform
-- Stores all operations for conflict resolution and history
CREATE TABLE realtime_operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation_id TEXT NOT NULL UNIQUE, -- Client-generated operation ID
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  operation_type operation_type_enum NOT NULL,
  operation_data JSONB NOT NULL, -- Full operation object
  user_id UUID NOT NULL,
  version INTEGER NOT NULL, -- Version when operation was applied
  parent_version INTEGER, -- Version this operation was based on
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Conflict resolution log
CREATE TABLE sync_conflicts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  operation_id TEXT NOT NULL,
  conflicting_operation_id TEXT,
  resolution_strategy TEXT, -- 'accept', 'reject', 'merge', 'manual'
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Presence indexes
CREATE INDEX idx_presence_status_active ON presence_status(status) WHERE status IN ('online', 'away', 'busy');
CREATE INDEX idx_presence_last_active ON presence_status(last_active DESC);
CREATE INDEX idx_presence_history_user ON presence_history(user_id, started_at DESC);

-- Real-time events indexes
CREATE INDEX idx_realtime_events_room ON realtime_events(room_id, timestamp DESC);
CREATE INDEX idx_realtime_events_user ON realtime_events(user_id, timestamp DESC);
CREATE INDEX idx_realtime_events_type ON realtime_events(event_type, timestamp DESC);
CREATE INDEX idx_realtime_events_timestamp ON realtime_events(timestamp DESC);

-- Collaboration sessions indexes
CREATE INDEX idx_collaboration_sessions_room ON collaboration_sessions(room_id);
CREATE INDEX idx_collaboration_sessions_resource ON collaboration_sessions(resource_type, resource_id);
CREATE INDEX idx_collaboration_sessions_owner ON collaboration_sessions(owner_id);
CREATE INDEX idx_collaboration_sessions_active ON collaboration_sessions(created_at) WHERE ended_at IS NULL;
CREATE INDEX idx_session_participants_session ON session_participants(session_id);
CREATE INDEX idx_session_participants_user ON session_participants(user_id);
CREATE INDEX idx_session_participants_active ON session_participants(session_id, is_active) WHERE is_active = true;

-- Sync indexes
CREATE INDEX idx_resource_state_type ON realtime_resource_state(resource_type);
CREATE INDEX idx_resource_state_modified ON realtime_resource_state(last_modified DESC);
CREATE INDEX idx_operations_resource ON realtime_operations(resource_type, resource_id, version DESC);
CREATE INDEX idx_operations_user ON realtime_operations(user_id, applied_at DESC);
CREATE INDEX idx_operations_version ON realtime_operations(resource_id, version);
CREATE INDEX idx_sync_conflicts_resource ON sync_conflicts(resource_type, resource_id);
CREATE INDEX idx_sync_conflicts_unresolved ON sync_conflicts(created_at) WHERE resolved_at IS NULL;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp trigger for presence_status
CREATE TRIGGER update_presence_status_timestamp
  BEFORE UPDATE ON presence_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Auto-update participant count in collaboration_sessions
CREATE OR REPLACE FUNCTION update_participant_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.is_active = true AND OLD.is_active = false) THEN
    UPDATE collaboration_sessions
    SET participant_count = participant_count + 1
    WHERE id = NEW.session_id;
  ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.is_active = false AND OLD.is_active = true) THEN
    UPDATE collaboration_sessions
    SET participant_count = participant_count - 1
    WHERE id = COALESCE(OLD.session_id, NEW.session_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER session_participant_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON session_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_participant_count();

-- Presence history tracking
CREATE OR REPLACE FUNCTION track_presence_history() RETURNS TRIGGER AS $$
BEGIN
  -- If user goes offline, end current session
  IF NEW.status = 'offline' AND OLD.status != 'offline' THEN
    UPDATE presence_history
    SET ended_at = NOW(),
        session_duration = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
    WHERE user_id = NEW.user_id AND ended_at IS NULL;

  -- If user comes online, start new session
  ELSIF NEW.status != 'offline' AND OLD.status = 'offline' THEN
    INSERT INTO presence_history (user_id, status, started_at)
    VALUES (NEW.user_id, NEW.status, NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER presence_history_trigger
  AFTER UPDATE ON presence_status
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION track_presence_history();

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Get active users in a room
CREATE OR REPLACE FUNCTION get_active_room_users(p_room_id TEXT)
RETURNS TABLE (
  user_id UUID,
  role collaboration_role,
  status presence_status_enum,
  current_view JSONB,
  joined_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.user_id,
    sp.role,
    ps.status,
    ps.current_view,
    sp.joined_at
  FROM session_participants sp
  LEFT JOIN presence_status ps ON sp.user_id = ps.user_id
  WHERE sp.session_id = (
    SELECT id FROM collaboration_sessions WHERE room_id = p_room_id
  )
  AND sp.is_active = true
  AND sp.left_at IS NULL
  ORDER BY sp.joined_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Get online users viewing a specific resource
CREATE OR REPLACE FUNCTION get_users_viewing_resource(
  p_resource_type TEXT,
  p_resource_id UUID
)
RETURNS TABLE (
  user_id UUID,
  status presence_status_enum,
  cursor JSONB,
  metadata JSONB,
  last_active TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.user_id,
    ps.status,
    ps.cursor,
    ps.metadata,
    ps.last_active
  FROM presence_status ps
  WHERE ps.status IN ('online', 'away', 'busy')
  AND ps.current_view->>'type' = p_resource_type
  AND (ps.current_view->>'id')::UUID = p_resource_id
  ORDER BY ps.last_active DESC;
END;
$$ LANGUAGE plpgsql;

-- Clean up stale presence (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS INTEGER AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  UPDATE presence_status
  SET status = 'offline'
  WHERE status != 'offline'
  AND last_active < NOW() - INTERVAL '1 hour';

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated;
END;
$$ LANGUAGE plpgsql;

-- Get operation history for a resource
CREATE OR REPLACE FUNCTION get_operation_history(
  p_resource_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  operation_id TEXT,
  operation_type operation_type_enum,
  user_id UUID,
  version INTEGER,
  operation_data JSONB,
  applied_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ro.operation_id,
    ro.operation_type,
    ro.user_id,
    ro.version,
    ro.operation_data,
    ro.applied_at
  FROM realtime_operations ro
  WHERE ro.resource_id = p_resource_id
  ORDER BY ro.version DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- End inactive collaboration sessions (no activity for 1 hour)
CREATE OR REPLACE FUNCTION end_inactive_sessions()
RETURNS INTEGER AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  -- Mark participants as inactive
  UPDATE session_participants sp
  SET is_active = false, left_at = NOW()
  FROM collaboration_sessions cs
  WHERE sp.session_id = cs.id
  AND sp.is_active = true
  AND cs.ended_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM presence_status ps
    WHERE ps.user_id = sp.user_id
    AND ps.status IN ('online', 'away', 'busy')
    AND ps.last_active > NOW() - INTERVAL '1 hour'
  );

  -- End sessions with no active participants
  UPDATE collaboration_sessions
  SET ended_at = NOW()
  WHERE ended_at IS NULL
  AND participant_count = 0;

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PERMISSIONS (RLS)
-- ============================================================================

-- Enable Row Level Security
ALTER TABLE presence_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE presence_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE realtime_resource_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE realtime_operations ENABLE ROW LEVEL SECURITY;

-- Users can see their own presence
CREATE POLICY presence_own_data ON presence_status
  FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);

-- Users can see presence of users in same sessions
CREATE POLICY presence_session_members ON presence_status
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM session_participants sp1
      JOIN session_participants sp2 ON sp1.session_id = sp2.session_id
      WHERE sp1.user_id = current_setting('app.current_user_id')::UUID
      AND sp2.user_id = presence_status.user_id
      AND sp1.is_active = true
      AND sp2.is_active = true
    )
  );

-- Users can see sessions they're part of
CREATE POLICY session_participants_view ON session_participants
  FOR SELECT USING (
    user_id = current_setting('app.current_user_id')::UUID
    OR session_id IN (
      SELECT session_id FROM session_participants
      WHERE user_id = current_setting('app.current_user_id')::UUID
    )
  );

-- Users can see resource state they have access to
CREATE POLICY resource_state_access ON realtime_resource_state
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM session_participants sp
      JOIN collaboration_sessions cs ON sp.session_id = cs.id
      WHERE sp.user_id = current_setting('app.current_user_id')::UUID
      AND cs.resource_type = realtime_resource_state.resource_type
      AND cs.resource_id = realtime_resource_state.resource_id
      AND sp.is_active = true
    )
  );

-- ============================================================================
-- MAINTENANCE
-- ============================================================================

-- Cleanup old events (keep 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_realtime_events()
RETURNS INTEGER AS $$
DECLARE
  rows_deleted INTEGER;
BEGIN
  DELETE FROM realtime_events
  WHERE timestamp < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS rows_deleted = ROW_COUNT;
  RETURN rows_deleted;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old operations (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_operations()
RETURNS INTEGER AS $$
DECLARE
  rows_deleted INTEGER;
BEGIN
  DELETE FROM realtime_operations
  WHERE applied_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS rows_deleted = ROW_COUNT;
  RETURN rows_deleted;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE presence_status IS 'Tracks real-time user presence and activity';
COMMENT ON TABLE collaboration_sessions IS 'Active collaboration rooms for real-time editing';
COMMENT ON TABLE realtime_resource_state IS 'Current state and version of collaborative resources';
COMMENT ON TABLE realtime_operations IS 'Operation log for operational transform and conflict resolution';
COMMENT ON TABLE sync_conflicts IS 'Log of sync conflicts and their resolutions';
