-- Row Level Security Policies for Meta Agent
-- Merged from Joanna for multi-tenant security

-- Enable RLS on all core tables
ALTER TABLE meta_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_workstreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_task_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_memory_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_budgets ENABLE ROW LEVEL SECURITY;

-- =============================================
-- META_PROJECTS Policies
-- =============================================
CREATE POLICY "Users can view own projects"
  ON meta_projects FOR SELECT
  USING (owner_id = auth.uid() OR owner_id IS NULL);

CREATE POLICY "Users can create own projects"
  ON meta_projects FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR owner_id IS NULL);

CREATE POLICY "Users can update own projects"
  ON meta_projects FOR UPDATE
  USING (owner_id = auth.uid() OR owner_id IS NULL);

CREATE POLICY "Users can delete own projects"
  ON meta_projects FOR DELETE
  USING (owner_id = auth.uid() OR owner_id IS NULL);

-- =============================================
-- META_WORKSTREAMS Policies
-- =============================================
CREATE POLICY "Users can view own workstreams"
  ON meta_workstreams FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM meta_projects
    WHERE meta_projects.id = meta_workstreams.project_id
    AND (meta_projects.owner_id = auth.uid() OR meta_projects.owner_id IS NULL)
  ));

CREATE POLICY "Users can manage own workstreams"
  ON meta_workstreams FOR ALL
  USING (EXISTS (
    SELECT 1 FROM meta_projects
    WHERE meta_projects.id = meta_workstreams.project_id
    AND (meta_projects.owner_id = auth.uid() OR meta_projects.owner_id IS NULL)
  ));

-- =============================================
-- META_TASKS Policies
-- =============================================
CREATE POLICY "Users can view own tasks"
  ON meta_tasks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM meta_workstreams w
    JOIN meta_projects p ON p.id = w.project_id
    WHERE w.id = meta_tasks.workstream_id
    AND (p.owner_id = auth.uid() OR p.owner_id IS NULL)
  ));

CREATE POLICY "Users can manage own tasks"
  ON meta_tasks FOR ALL
  USING (EXISTS (
    SELECT 1 FROM meta_workstreams w
    JOIN meta_projects p ON p.id = w.project_id
    WHERE w.id = meta_tasks.workstream_id
    AND (p.owner_id = auth.uid() OR p.owner_id IS NULL)
  ));

-- =============================================
-- META_TASK_DEPENDENCIES Policies
-- =============================================
CREATE POLICY "Users can view own task dependencies"
  ON meta_task_dependencies FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM meta_tasks t
    JOIN meta_workstreams w ON w.id = t.workstream_id
    JOIN meta_projects p ON p.id = w.project_id
    WHERE t.id = meta_task_dependencies.task_id
    AND (p.owner_id = auth.uid() OR p.owner_id IS NULL)
  ));

CREATE POLICY "Users can manage own task dependencies"
  ON meta_task_dependencies FOR ALL
  USING (EXISTS (
    SELECT 1 FROM meta_tasks t
    JOIN meta_workstreams w ON w.id = t.workstream_id
    JOIN meta_projects p ON p.id = w.project_id
    WHERE t.id = meta_task_dependencies.task_id
    AND (p.owner_id = auth.uid() OR p.owner_id IS NULL)
  ));

-- =============================================
-- META_TASK_RUNS Policies
-- =============================================
CREATE POLICY "Users can view own task runs"
  ON meta_task_runs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM meta_tasks t
    JOIN meta_workstreams w ON w.id = t.workstream_id
    JOIN meta_projects p ON p.id = w.project_id
    WHERE t.id = meta_task_runs.task_id
    AND (p.owner_id = auth.uid() OR p.owner_id IS NULL)
  ));

CREATE POLICY "Users can manage own task runs"
  ON meta_task_runs FOR ALL
  USING (EXISTS (
    SELECT 1 FROM meta_tasks t
    JOIN meta_workstreams w ON w.id = t.workstream_id
    JOIN meta_projects p ON p.id = w.project_id
    WHERE t.id = meta_task_runs.task_id
    AND (p.owner_id = auth.uid() OR p.owner_id IS NULL)
  ));

-- =============================================
-- META_ARTIFACTS Policies
-- =============================================
CREATE POLICY "Users can view own artifacts"
  ON meta_artifacts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM meta_tasks t
    JOIN meta_workstreams w ON w.id = t.workstream_id
    JOIN meta_projects p ON p.id = w.project_id
    WHERE t.id = meta_artifacts.task_id
    AND (p.owner_id = auth.uid() OR p.owner_id IS NULL)
  ));

CREATE POLICY "Users can manage own artifacts"
  ON meta_artifacts FOR ALL
  USING (EXISTS (
    SELECT 1 FROM meta_tasks t
    JOIN meta_workstreams w ON w.id = t.workstream_id
    JOIN meta_projects p ON p.id = w.project_id
    WHERE t.id = meta_artifacts.task_id
    AND (p.owner_id = auth.uid() OR p.owner_id IS NULL)
  ));

-- =============================================
-- META_DECISIONS Policies
-- =============================================
CREATE POLICY "Users can view own decisions"
  ON meta_decisions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM meta_projects p
    WHERE p.id = meta_decisions.project_id
    AND (p.owner_id = auth.uid() OR p.owner_id IS NULL)
  ));

CREATE POLICY "Users can manage own decisions"
  ON meta_decisions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM meta_projects p
    WHERE p.id = meta_decisions.project_id
    AND (p.owner_id = auth.uid() OR p.owner_id IS NULL)
  ));

-- =============================================
-- META_MEMORY_FACTS Policies
-- =============================================
CREATE POLICY "Users can view own memory facts"
  ON meta_memory_facts FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can manage own memory facts"
  ON meta_memory_facts FOR ALL
  USING (user_id = auth.uid() OR user_id IS NULL);

-- =============================================
-- META_BUDGETS Policies
-- =============================================
CREATE POLICY "Users can view own budgets"
  ON meta_budgets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM meta_projects p
    WHERE p.id = meta_budgets.project_id
    AND (p.owner_id = auth.uid() OR p.owner_id IS NULL)
  ));

CREATE POLICY "Users can manage own budgets"
  ON meta_budgets FOR ALL
  USING (EXISTS (
    SELECT 1 FROM meta_projects p
    WHERE p.id = meta_budgets.project_id
    AND (p.owner_id = auth.uid() OR p.owner_id IS NULL)
  ));

-- =============================================
-- Enable RLS on feature tables
-- =============================================
ALTER TABLE IF EXISTS thinking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS research_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS voice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS computer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS generated_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS google_workspace_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS scheduled_tasks ENABLE ROW LEVEL SECURITY;

-- Feature tables RLS policies (user_id based)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'thinking_sessions', 'research_sessions', 'generated_images',
    'voice_sessions', 'computer_sessions', 'personas',
    'generated_videos', 'google_workspace_connections', 'scheduled_tasks'
  ] LOOP
    EXECUTE format('
      CREATE POLICY IF NOT EXISTS "Users can view own %I"
        ON %I FOR SELECT
        USING (user_id = auth.uid() OR user_id IS NULL);

      CREATE POLICY IF NOT EXISTS "Users can manage own %I"
        ON %I FOR ALL
        USING (user_id = auth.uid() OR user_id IS NULL);
    ', tbl, tbl, tbl, tbl);
  END LOOP;
END $$;
