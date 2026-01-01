-- Meta Master Agent Schema
-- Complete database schema for task orchestration

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUM Types
CREATE TYPE project_status AS ENUM ('planning', 'active', 'paused', 'completed', 'archived');
CREATE TYPE task_status AS ENUM ('queued', 'running', 'blocked', 'needs_review', 'revision_required', 'done');
CREATE TYPE run_status AS ENUM ('running', 'completed', 'failed', 'cancelled');
CREATE TYPE artifact_status AS ENUM ('draft', 'verified', 'promoted');
CREATE TYPE model_tier AS ENUM ('haiku', 'sonnet', 'opus');

-- Projects
CREATE TABLE meta_projects (
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
CREATE TABLE meta_workstreams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES meta_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  lead_agent TEXT,
  status TEXT DEFAULT 'active',
  priority INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, name)
);

-- Tasks
CREATE TABLE meta_tasks (
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
CREATE TABLE meta_task_dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES meta_tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES meta_tasks(id) ON DELETE CASCADE,
  dependency_type TEXT DEFAULT 'blocks',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_self_dependency CHECK (task_id != depends_on_task_id),
  UNIQUE(task_id, depends_on_task_id)
);

-- Task Runs
CREATE TABLE meta_task_runs (
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
CREATE TABLE meta_artifacts (
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
CREATE TABLE meta_decisions (
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
CREATE TABLE meta_memory_facts (
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
CREATE TABLE meta_budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES meta_projects(id) ON DELETE CASCADE,
  model_tier model_tier NOT NULL,
  allocated_tokens BIGINT DEFAULT 0,
  used_tokens BIGINT DEFAULT 0,
  allocated_cost DECIMAL(10, 4) DEFAULT 0,
  used_cost DECIMAL(10, 4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, model_tier)
);

-- Indexes
CREATE INDEX idx_meta_tasks_status ON meta_tasks(status);
CREATE INDEX idx_meta_tasks_workstream ON meta_tasks(workstream_id);
CREATE INDEX idx_meta_task_runs_task ON meta_task_runs(task_id);
CREATE INDEX idx_meta_artifacts_task ON meta_artifacts(task_id);
CREATE INDEX idx_meta_memory_embedding ON meta_memory_facts USING ivfflat (embedding vector_cosine_ops);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_meta_projects_updated_at BEFORE UPDATE ON meta_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_meta_workstreams_updated_at BEFORE UPDATE ON meta_workstreams FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_meta_tasks_updated_at BEFORE UPDATE ON meta_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

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
