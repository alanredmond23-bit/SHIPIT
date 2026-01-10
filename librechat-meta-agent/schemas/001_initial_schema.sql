-- ============================================================================
-- 001_initial_schema.sql
-- Meta Master Agent Schema - Core tables for task orchestration
-- Made idempotent with IF NOT EXISTS checks
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUM Types (created safely with DO blocks)
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE project_status AS ENUM ('planning', 'active', 'paused', 'completed', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('queued', 'running', 'blocked', 'needs_review', 'revision_required', 'done');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE run_status AS ENUM ('running', 'completed', 'failed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE artifact_status AS ENUM ('draft', 'verified', 'promoted');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE model_tier AS ENUM ('haiku', 'sonnet', 'opus');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- Core Tables
-- ============================================================================

-- Projects
CREATE TABLE IF NOT EXISTS meta_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  status project_status DEFAULT 'planning',
  owner_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workstreams
CREATE TABLE IF NOT EXISTS meta_workstreams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES meta_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  lead_agent TEXT,
  status TEXT DEFAULT 'active',
  priority INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint if not exists
DO $$ BEGIN
  ALTER TABLE meta_workstreams ADD CONSTRAINT meta_workstreams_project_name_unique UNIQUE(project_id, name);
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

-- Tasks
CREATE TABLE IF NOT EXISTS meta_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workstream_id UUID NOT NULL REFERENCES meta_workstreams(id) ON DELETE CASCADE,
  parent_task_id UUID REFERENCES meta_tasks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status task_status DEFAULT 'queued',
  assigned_agent TEXT,
  model_tier model_tier DEFAULT 'sonnet',
  priority INTEGER DEFAULT 5,
  definition_of_done JSONB DEFAULT '[]'::jsonb,
  context_packet JSONB DEFAULT '{}'::jsonb,
  thread_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3
);

-- Task Dependencies
CREATE TABLE IF NOT EXISTS meta_task_dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES meta_tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES meta_tasks(id) ON DELETE CASCADE,
  dependency_type TEXT DEFAULT 'blocks',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraints if not exists
DO $$ BEGIN
  ALTER TABLE meta_task_dependencies ADD CONSTRAINT no_self_dependency CHECK (task_id != depends_on_task_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE meta_task_dependencies ADD CONSTRAINT meta_task_deps_unique UNIQUE(task_id, depends_on_task_id);
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

-- Task Runs
CREATE TABLE IF NOT EXISTS meta_task_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES meta_tasks(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  model_used TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  status run_status DEFAULT 'running',
  tokens_used INTEGER DEFAULT 0,
  cost DECIMAL(10, 6) DEFAULT 0,
  output JSONB DEFAULT '{}'::jsonb,
  error_message TEXT
);

-- Artifacts
CREATE TABLE IF NOT EXISTS meta_artifacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES meta_tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  status artifact_status DEFAULT 'draft',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Decisions
CREATE TABLE IF NOT EXISTS meta_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES meta_projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES meta_tasks(id) ON DELETE SET NULL,
  decision_text TEXT NOT NULL,
  rationale TEXT,
  alternatives JSONB DEFAULT '[]'::jsonb,
  made_by_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memory Facts (with vector embeddings)
CREATE TABLE IF NOT EXISTS meta_memory_facts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES meta_projects(id) ON DELETE CASCADE,
  fact_type TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  embedding vector(1536),
  source_task_id UUID REFERENCES meta_tasks(id) ON DELETE SET NULL,
  importance_score FLOAT DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Budgets
CREATE TABLE IF NOT EXISTS meta_budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES meta_projects(id) ON DELETE CASCADE,
  model_tier model_tier NOT NULL,
  allocated_tokens BIGINT DEFAULT 0,
  used_tokens BIGINT DEFAULT 0,
  allocated_cost DECIMAL(10, 4) DEFAULT 0,
  used_cost DECIMAL(10, 4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE meta_budgets ADD CONSTRAINT meta_budgets_project_tier_unique UNIQUE(project_id, model_tier);
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_meta_tasks_status ON meta_tasks(status);
CREATE INDEX IF NOT EXISTS idx_meta_tasks_workstream ON meta_tasks(workstream_id);
CREATE INDEX IF NOT EXISTS idx_meta_task_runs_task ON meta_task_runs(task_id);
CREATE INDEX IF NOT EXISTS idx_meta_artifacts_task ON meta_artifacts(task_id);

-- Vector index (needs special handling)
DO $$ BEGIN
  CREATE INDEX idx_meta_memory_embedding ON meta_memory_facts USING ivfflat (embedding vector_cosine_ops);
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN undefined_object THEN NULL; -- ivfflat not available
END $$;

-- ============================================================================
-- Functions & Triggers
-- ============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers (drop first to be idempotent)
DROP TRIGGER IF EXISTS update_meta_projects_updated_at ON meta_projects;
CREATE TRIGGER update_meta_projects_updated_at
  BEFORE UPDATE ON meta_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_meta_workstreams_updated_at ON meta_workstreams;
CREATE TRIGGER update_meta_workstreams_updated_at
  BEFORE UPDATE ON meta_workstreams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_meta_tasks_updated_at ON meta_tasks;
CREATE TRIGGER update_meta_tasks_updated_at
  BEFORE UPDATE ON meta_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to get ready tasks
CREATE OR REPLACE FUNCTION get_ready_tasks(p_workstream_id UUID DEFAULT NULL)
RETURNS TABLE (id UUID, title TEXT, priority INTEGER, assigned_agent TEXT, model_tier model_tier) AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.title, t.priority, t.assigned_agent, t.model_tier
  FROM meta_tasks t
  WHERE t.status = 'queued'
    AND (p_workstream_id IS NULL OR t.workstream_id = p_workstream_id)
    AND NOT EXISTS (
      SELECT 1 FROM meta_task_dependencies d
      JOIN meta_tasks dep ON d.depends_on_task_id = dep.id
      WHERE d.task_id = t.id AND dep.status != 'done'
    )
  ORDER BY t.priority DESC, t.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE meta_projects IS 'Top-level projects containing workstreams and tasks';
COMMENT ON TABLE meta_workstreams IS 'Logical groupings of related tasks within a project';
COMMENT ON TABLE meta_tasks IS 'Individual units of work assigned to agents';
COMMENT ON TABLE meta_task_dependencies IS 'Dependency relationships between tasks';
COMMENT ON TABLE meta_task_runs IS 'Execution history for tasks';
COMMENT ON TABLE meta_artifacts IS 'Files and outputs produced by tasks';
COMMENT ON TABLE meta_decisions IS 'Recorded decisions made during project execution';
COMMENT ON TABLE meta_memory_facts IS 'Vector-searchable facts and context';
COMMENT ON TABLE meta_budgets IS 'Token and cost budgets per model tier';
