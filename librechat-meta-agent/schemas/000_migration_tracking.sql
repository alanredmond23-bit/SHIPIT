-- ============================================================================
-- 000_migration_tracking.sql
-- Migration Tracking Infrastructure
-- This file MUST be run first - it tracks which migrations have been applied
-- ============================================================================

-- Migration tracking table
CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  version VARCHAR(10) NOT NULL UNIQUE,          -- e.g., '001', '002'
  name VARCHAR(255) NOT NULL,                    -- e.g., 'initial_schema'
  filename VARCHAR(255) NOT NULL,                -- e.g., '001_initial_schema.sql'
  checksum VARCHAR(64),                          -- SHA256 of file contents
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_by VARCHAR(255) DEFAULT current_user,
  execution_time_ms INTEGER,                     -- How long it took to run
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT,
  rollback_sql TEXT                              -- Optional rollback script
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_migrations_version ON _migrations(version);
CREATE INDEX IF NOT EXISTS idx_migrations_applied_at ON _migrations(applied_at);

-- Prevent duplicate migrations
CREATE UNIQUE INDEX IF NOT EXISTS idx_migrations_filename ON _migrations(filename);

-- Function to check if a migration has been applied
CREATE OR REPLACE FUNCTION migration_applied(p_version VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM _migrations
    WHERE version = p_version
    AND success = TRUE
  );
END;
$$ LANGUAGE plpgsql;

-- Function to record a migration
CREATE OR REPLACE FUNCTION record_migration(
  p_version VARCHAR,
  p_name VARCHAR,
  p_filename VARCHAR,
  p_checksum VARCHAR DEFAULT NULL,
  p_execution_time_ms INTEGER DEFAULT NULL,
  p_rollback_sql TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  migration_id INTEGER;
BEGIN
  INSERT INTO _migrations (version, name, filename, checksum, execution_time_ms, rollback_sql)
  VALUES (p_version, p_name, p_filename, p_checksum, p_execution_time_ms, p_rollback_sql)
  ON CONFLICT (filename) DO UPDATE SET
    applied_at = NOW(),
    execution_time_ms = EXCLUDED.execution_time_ms,
    success = TRUE,
    error_message = NULL
  RETURNING id INTO migration_id;

  RETURN migration_id::text::uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to mark migration as failed
CREATE OR REPLACE FUNCTION record_migration_failure(
  p_version VARCHAR,
  p_name VARCHAR,
  p_filename VARCHAR,
  p_error_message TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO _migrations (version, name, filename, success, error_message)
  VALUES (p_version, p_name, p_filename, FALSE, p_error_message)
  ON CONFLICT (filename) DO UPDATE SET
    applied_at = NOW(),
    success = FALSE,
    error_message = EXCLUDED.error_message;
END;
$$ LANGUAGE plpgsql;

-- Function to get pending migrations (for display purposes)
CREATE OR REPLACE FUNCTION get_applied_migrations()
RETURNS TABLE (
  version VARCHAR,
  name VARCHAR,
  filename VARCHAR,
  applied_at TIMESTAMPTZ,
  execution_time_ms INTEGER,
  success BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.version,
    m.name,
    m.filename,
    m.applied_at,
    m.execution_time_ms,
    m.success
  FROM _migrations m
  ORDER BY m.version ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to rollback a migration (if rollback_sql exists)
CREATE OR REPLACE FUNCTION rollback_migration(p_version VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  v_rollback_sql TEXT;
BEGIN
  SELECT rollback_sql INTO v_rollback_sql
  FROM _migrations
  WHERE version = p_version AND rollback_sql IS NOT NULL;

  IF v_rollback_sql IS NULL THEN
    RAISE EXCEPTION 'No rollback SQL found for migration %', p_version;
  END IF;

  EXECUTE v_rollback_sql;

  DELETE FROM _migrations WHERE version = p_version;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Rollback failed for migration %: %', p_version, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE _migrations IS 'Tracks applied database migrations for version control';
COMMENT ON COLUMN _migrations.version IS 'Migration version number (e.g., 001, 002)';
COMMENT ON COLUMN _migrations.checksum IS 'SHA256 hash of migration file for integrity checking';
COMMENT ON COLUMN _migrations.rollback_sql IS 'SQL to undo this migration (optional)';
COMMENT ON FUNCTION migration_applied IS 'Check if a specific migration version has been applied';
COMMENT ON FUNCTION record_migration IS 'Record a successful migration';
COMMENT ON FUNCTION rollback_migration IS 'Execute rollback SQL and remove migration record';

-- Record this migration as the first one
INSERT INTO _migrations (version, name, filename, checksum, success)
VALUES ('000', 'migration_tracking', '000_migration_tracking.sql', NULL, TRUE)
ON CONFLICT (filename) DO NOTHING;
