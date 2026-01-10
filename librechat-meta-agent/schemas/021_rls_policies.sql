-- ============================================================================
-- 021_rls_policies.sql
-- Row Level Security Policies for Meta Agent
-- Multi-tenant security policies
-- Made idempotent with DROP POLICY IF EXISTS
-- ============================================================================

-- ============================================================================
-- Enable RLS on core tables
-- ============================================================================

ALTER TABLE meta_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_workstreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_task_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_memory_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_budgets ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- META_PROJECTS Policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own projects" ON meta_projects;
CREATE POLICY "Users can view own projects"
  ON meta_projects FOR SELECT
  USING (owner_id = auth.uid() OR owner_id IS NULL);

DROP POLICY IF EXISTS "Users can create own projects" ON meta_projects;
CREATE POLICY "Users can create own projects"
  ON meta_projects FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR owner_id IS NULL);

DROP POLICY IF EXISTS "Users can update own projects" ON meta_projects;
CREATE POLICY "Users can update own projects"
  ON meta_projects FOR UPDATE
  USING (owner_id = auth.uid() OR owner_id IS NULL);

DROP POLICY IF EXISTS "Users can delete own projects" ON meta_projects;
CREATE POLICY "Users can delete own projects"
  ON meta_projects FOR DELETE
  USING (owner_id = auth.uid() OR owner_id IS NULL);

-- ============================================================================
-- META_WORKSTREAMS Policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own workstreams" ON meta_workstreams;
CREATE POLICY "Users can view own workstreams"
  ON meta_workstreams FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM meta_projects
    WHERE meta_projects.id = meta_workstreams.project_id
    AND (meta_projects.owner_id = auth.uid() OR meta_projects.owner_id IS NULL)
  ));

DROP POLICY IF EXISTS "Users can manage own workstreams" ON meta_workstreams;
CREATE POLICY "Users can manage own workstreams"
  ON meta_workstreams FOR ALL
  USING (EXISTS (
    SELECT 1 FROM meta_projects
    WHERE meta_projects.id = meta_workstreams.project_id
    AND (meta_projects.owner_id = auth.uid() OR meta_projects.owner_id IS NULL)
  ));

-- ============================================================================
-- META_TASKS Policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own tasks" ON meta_tasks;
CREATE POLICY "Users can view own tasks"
  ON meta_tasks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM meta_workstreams w
    JOIN meta_projects p ON p.id = w.project_id
    WHERE w.id = meta_tasks.workstream_id
    AND (p.owner_id = auth.uid() OR p.owner_id IS NULL)
  ));

DROP POLICY IF EXISTS "Users can manage own tasks" ON meta_tasks;
CREATE POLICY "Users can manage own tasks"
  ON meta_tasks FOR ALL
  USING (EXISTS (
    SELECT 1 FROM meta_workstreams w
    JOIN meta_projects p ON p.id = w.project_id
    WHERE w.id = meta_tasks.workstream_id
    AND (p.owner_id = auth.uid() OR p.owner_id IS NULL)
  ));

-- ============================================================================
-- META_TASK_DEPENDENCIES Policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own task dependencies" ON meta_task_dependencies;
CREATE POLICY "Users can view own task dependencies"
  ON meta_task_dependencies FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM meta_tasks t
    JOIN meta_workstreams w ON w.id = t.workstream_id
    JOIN meta_projects p ON p.id = w.project_id
    WHERE t.id = meta_task_dependencies.task_id
    AND (p.owner_id = auth.uid() OR p.owner_id IS NULL)
  ));

DROP POLICY IF EXISTS "Users can manage own task dependencies" ON meta_task_dependencies;
CREATE POLICY "Users can manage own task dependencies"
  ON meta_task_dependencies FOR ALL
  USING (EXISTS (
    SELECT 1 FROM meta_tasks t
    JOIN meta_workstreams w ON w.id = t.workstream_id
    JOIN meta_projects p ON p.id = w.project_id
    WHERE t.id = meta_task_dependencies.task_id
    AND (p.owner_id = auth.uid() OR p.owner_id IS NULL)
  ));

-- ============================================================================
-- META_TASK_RUNS Policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own task runs" ON meta_task_runs;
CREATE POLICY "Users can view own task runs"
  ON meta_task_runs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM meta_tasks t
    JOIN meta_workstreams w ON w.id = t.workstream_id
    JOIN meta_projects p ON p.id = w.project_id
    WHERE t.id = meta_task_runs.task_id
    AND (p.owner_id = auth.uid() OR p.owner_id IS NULL)
  ));

DROP POLICY IF EXISTS "Users can manage own task runs" ON meta_task_runs;
CREATE POLICY "Users can manage own task runs"
  ON meta_task_runs FOR ALL
  USING (EXISTS (
    SELECT 1 FROM meta_tasks t
    JOIN meta_workstreams w ON w.id = t.workstream_id
    JOIN meta_projects p ON p.id = w.project_id
    WHERE t.id = meta_task_runs.task_id
    AND (p.owner_id = auth.uid() OR p.owner_id IS NULL)
  ));

-- ============================================================================
-- META_ARTIFACTS Policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own artifacts" ON meta_artifacts;
CREATE POLICY "Users can view own artifacts"
  ON meta_artifacts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM meta_tasks t
    JOIN meta_workstreams w ON w.id = t.workstream_id
    JOIN meta_projects p ON p.id = w.project_id
    WHERE t.id = meta_artifacts.task_id
    AND (p.owner_id = auth.uid() OR p.owner_id IS NULL)
  ));

DROP POLICY IF EXISTS "Users can manage own artifacts" ON meta_artifacts;
CREATE POLICY "Users can manage own artifacts"
  ON meta_artifacts FOR ALL
  USING (EXISTS (
    SELECT 1 FROM meta_tasks t
    JOIN meta_workstreams w ON w.id = t.workstream_id
    JOIN meta_projects p ON p.id = w.project_id
    WHERE t.id = meta_artifacts.task_id
    AND (p.owner_id = auth.uid() OR p.owner_id IS NULL)
  ));

-- ============================================================================
-- META_DECISIONS Policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own decisions" ON meta_decisions;
CREATE POLICY "Users can view own decisions"
  ON meta_decisions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM meta_projects p
    WHERE p.id = meta_decisions.project_id
    AND (p.owner_id = auth.uid() OR p.owner_id IS NULL)
  ));

DROP POLICY IF EXISTS "Users can manage own decisions" ON meta_decisions;
CREATE POLICY "Users can manage own decisions"
  ON meta_decisions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM meta_projects p
    WHERE p.id = meta_decisions.project_id
    AND (p.owner_id = auth.uid() OR p.owner_id IS NULL)
  ));

-- ============================================================================
-- META_MEMORY_FACTS Policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own memory facts" ON meta_memory_facts;
CREATE POLICY "Users can view own memory facts"
  ON meta_memory_facts FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can manage own memory facts" ON meta_memory_facts;
CREATE POLICY "Users can manage own memory facts"
  ON meta_memory_facts FOR ALL
  USING (user_id = auth.uid() OR user_id IS NULL);

-- ============================================================================
-- META_BUDGETS Policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own budgets" ON meta_budgets;
CREATE POLICY "Users can view own budgets"
  ON meta_budgets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM meta_projects p
    WHERE p.id = meta_budgets.project_id
    AND (p.owner_id = auth.uid() OR p.owner_id IS NULL)
  ));

DROP POLICY IF EXISTS "Users can manage own budgets" ON meta_budgets;
CREATE POLICY "Users can manage own budgets"
  ON meta_budgets FOR ALL
  USING (EXISTS (
    SELECT 1 FROM meta_projects p
    WHERE p.id = meta_budgets.project_id
    AND (p.owner_id = auth.uid() OR p.owner_id IS NULL)
  ));

-- ============================================================================
-- Enable RLS on feature tables (if they exist)
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE thinking_sessions ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE research_sessions ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE computer_sessions ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE generated_videos ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE google_workspace_connections ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE scheduled_tasks ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================================
-- Feature tables RLS policies (user_id based) - created safely
-- ============================================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'thinking_sessions', 'research_sessions', 'generated_images',
    'voice_sessions', 'computer_sessions', 'personas',
    'generated_videos', 'google_workspace_connections', 'scheduled_tasks'
  ] LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS "Users can view own %I" ON %I', tbl, tbl);
      EXECUTE format('
        CREATE POLICY "Users can view own %I"
          ON %I FOR SELECT
          USING (user_id = auth.uid() OR user_id IS NULL)
      ', tbl, tbl);
    EXCEPTION WHEN undefined_table THEN
      -- Table doesn't exist, skip
      NULL;
    END;

    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS "Users can manage own %I" ON %I', tbl, tbl);
      EXECUTE format('
        CREATE POLICY "Users can manage own %I"
          ON %I FOR ALL
          USING (user_id = auth.uid() OR user_id IS NULL)
      ', tbl, tbl);
    EXCEPTION WHEN undefined_table THEN
      -- Table doesn't exist, skip
      NULL;
    END;
  END LOOP;
END $$;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON POLICY "Users can view own projects" ON meta_projects IS 'Users can only view their own projects';
COMMENT ON POLICY "Users can manage own workstreams" ON meta_workstreams IS 'Users can only manage workstreams in their own projects';
COMMENT ON POLICY "Users can manage own tasks" ON meta_tasks IS 'Users can only manage tasks in their own projects';
