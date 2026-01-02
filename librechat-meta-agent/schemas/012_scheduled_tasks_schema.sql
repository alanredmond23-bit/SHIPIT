-- Scheduled Tasks & Automation Schema
-- Comprehensive task scheduling, automation, and execution tracking

-- Main scheduled tasks table
CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL CHECK (type IN ('one-time', 'recurring', 'trigger')),

  -- Scheduling configuration
  schedule JSONB,  -- { at?: ISO8601, cron?: string, timezone?: string }

  -- Trigger configuration (for trigger-based tasks)
  trigger_config JSONB,  -- { type: 'webhook'|'email'|'event', config: {...} }

  -- Action to execute
  action JSONB NOT NULL,  -- TaskAction type (ai-prompt, webhook, etc.)

  -- Conditions for execution
  conditions JSONB,  -- Array of TaskCondition

  -- Retry configuration
  retry_policy JSONB,  -- { maxRetries: number, backoffMs: number }

  -- Notification configuration
  notification_config JSONB,  -- { onSuccess?: boolean, onFailure?: boolean, channels: string[] }

  -- Task status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'failed')),

  -- Execution tracking
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  run_count INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task executions table (history)
CREATE TABLE IF NOT EXISTS task_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES scheduled_tasks(id) ON DELETE CASCADE,

  -- Execution status
  status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'completed', 'failed')),

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INT,

  -- Results
  result JSONB,
  error TEXT,
  logs JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook triggers table
CREATE TABLE IF NOT EXISTS task_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES scheduled_tasks(id) ON DELETE CASCADE,
  secret VARCHAR(255) NOT NULL,

  -- Stats
  last_triggered_at TIMESTAMPTZ,
  trigger_count INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance

-- Task queries
CREATE INDEX IF NOT EXISTS idx_tasks_user ON scheduled_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON scheduled_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON scheduled_tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_next_run ON scheduled_tasks(next_run_at)
  WHERE status = 'active' AND next_run_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON scheduled_tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_created ON scheduled_tasks(created_at DESC);

-- Execution queries
CREATE INDEX IF NOT EXISTS idx_executions_task ON task_executions(task_id);
CREATE INDEX IF NOT EXISTS idx_executions_started ON task_executions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_executions_status ON task_executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_task_started ON task_executions(task_id, started_at DESC);

-- Webhook queries
CREATE INDEX IF NOT EXISTS idx_webhooks_task ON task_webhooks(task_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_secret ON task_webhooks(secret);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_task_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_task_timestamp
  BEFORE UPDATE ON scheduled_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_task_updated_at();

-- Function to get due tasks (for worker polling)
CREATE OR REPLACE FUNCTION get_due_tasks(
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name VARCHAR(255),
  type VARCHAR(20),
  action JSONB,
  conditions JSONB,
  retry_policy JSONB,
  notification_config JSONB,
  run_count INT,
  next_run_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.user_id,
    t.name,
    t.type,
    t.action,
    t.conditions,
    t.retry_policy,
    t.notification_config,
    t.run_count,
    t.next_run_at
  FROM scheduled_tasks t
  WHERE t.status = 'active'
    AND t.next_run_at IS NOT NULL
    AND t.next_run_at <= NOW()
  ORDER BY t.next_run_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get upcoming tasks for a user
CREATE OR REPLACE FUNCTION get_upcoming_user_tasks(
  p_user_id UUID,
  p_hours_ahead INTEGER DEFAULT 24,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  type VARCHAR(20),
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  run_count INT,
  status VARCHAR(20)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.type,
    t.next_run_at,
    t.last_run_at,
    t.run_count,
    t.status
  FROM scheduled_tasks t
  WHERE t.user_id = p_user_id
    AND t.status = 'active'
    AND t.next_run_at IS NOT NULL
    AND t.next_run_at <= NOW() + (p_hours_ahead || ' hours')::INTERVAL
  ORDER BY t.next_run_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get task execution statistics
CREATE OR REPLACE FUNCTION get_task_stats(
  p_task_id UUID
)
RETURNS TABLE (
  total_executions BIGINT,
  successful_executions BIGINT,
  failed_executions BIGINT,
  avg_duration_ms FLOAT,
  last_execution_at TIMESTAMPTZ,
  last_execution_status VARCHAR(20)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_executions,
    COUNT(*) FILTER (WHERE status = 'completed') as successful_executions,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_executions,
    AVG(duration_ms) as avg_duration_ms,
    MAX(started_at) as last_execution_at,
    (
      SELECT status
      FROM task_executions
      WHERE task_id = p_task_id
      ORDER BY started_at DESC
      LIMIT 1
    ) as last_execution_status
  FROM task_executions
  WHERE task_id = p_task_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user task statistics
CREATE OR REPLACE FUNCTION get_user_task_stats(
  p_user_id UUID
)
RETURNS TABLE (
  total_tasks BIGINT,
  active_tasks BIGINT,
  paused_tasks BIGINT,
  completed_tasks BIGINT,
  failed_tasks BIGINT,
  upcoming_24h BIGINT,
  total_executions BIGINT,
  successful_executions BIGINT,
  failed_executions BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_tasks,
    COUNT(*) FILTER (WHERE status = 'active') as active_tasks,
    COUNT(*) FILTER (WHERE status = 'paused') as paused_tasks,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_tasks,
    COUNT(*) FILTER (
      WHERE status = 'active'
        AND next_run_at IS NOT NULL
        AND next_run_at <= NOW() + INTERVAL '24 hours'
    ) as upcoming_24h,
    (
      SELECT COUNT(*)
      FROM task_executions e
      JOIN scheduled_tasks t ON t.id = e.task_id
      WHERE t.user_id = p_user_id
    ) as total_executions,
    (
      SELECT COUNT(*)
      FROM task_executions e
      JOIN scheduled_tasks t ON t.id = e.task_id
      WHERE t.user_id = p_user_id AND e.status = 'completed'
    ) as successful_executions,
    (
      SELECT COUNT(*)
      FROM task_executions e
      JOIN scheduled_tasks t ON t.id = e.task_id
      WHERE t.user_id = p_user_id AND e.status = 'failed'
    ) as failed_executions
  FROM scheduled_tasks
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old executions (keep only last N per task)
CREATE OR REPLACE FUNCTION cleanup_old_executions(
  p_keep_per_task INTEGER DEFAULT 100
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH ranked_executions AS (
    SELECT
      id,
      ROW_NUMBER() OVER (PARTITION BY task_id ORDER BY started_at DESC) as rn
    FROM task_executions
  )
  DELETE FROM task_executions
  WHERE id IN (
    SELECT id FROM ranked_executions WHERE rn > p_keep_per_task
  );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old completed one-time tasks
CREATE OR REPLACE FUNCTION cleanup_completed_tasks(
  p_older_than_days INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM scheduled_tasks
  WHERE type = 'one-time'
    AND status = 'completed'
    AND updated_at < NOW() - (p_older_than_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE scheduled_tasks IS 'Scheduled tasks and automation workflows';
COMMENT ON TABLE task_executions IS 'Execution history and logs for scheduled tasks';
COMMENT ON TABLE task_webhooks IS 'Webhook triggers for tasks';

COMMENT ON COLUMN scheduled_tasks.type IS 'Task type: one-time, recurring, or trigger-based';
COMMENT ON COLUMN scheduled_tasks.schedule IS 'Schedule configuration for one-time and recurring tasks';
COMMENT ON COLUMN scheduled_tasks.trigger_config IS 'Trigger configuration for event-based tasks';
COMMENT ON COLUMN scheduled_tasks.action IS 'Action to execute (ai-prompt, webhook, code, etc.)';
COMMENT ON COLUMN scheduled_tasks.conditions IS 'Conditions that must be met for execution';
COMMENT ON COLUMN scheduled_tasks.retry_policy IS 'Retry configuration for failed executions';
COMMENT ON COLUMN scheduled_tasks.notification_config IS 'Notification settings for task completion';
COMMENT ON COLUMN scheduled_tasks.next_run_at IS 'Next scheduled execution time';
COMMENT ON COLUMN scheduled_tasks.run_count IS 'Total number of times this task has been executed';

COMMENT ON COLUMN task_executions.duration_ms IS 'Execution duration in milliseconds';
COMMENT ON COLUMN task_executions.result IS 'Execution result data';
COMMENT ON COLUMN task_executions.error IS 'Error message if execution failed';
COMMENT ON COLUMN task_executions.logs IS 'Execution logs array';

-- Create initial indexes for better query performance
ANALYZE scheduled_tasks;
ANALYZE task_executions;
ANALYZE task_webhooks;
