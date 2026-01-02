-- Task History/Audit Trail Schema
-- Merged from Joanna for complete change tracking

-- =============================================
-- TASK HISTORY TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS meta_task_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES meta_tasks(id) ON DELETE CASCADE,
  changed_by UUID,
  change_type TEXT NOT NULL,
  field_name TEXT,
  old_value JSONB,
  new_value JSONB,
  change_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_task_history_task_id ON meta_task_history(task_id);
CREATE INDEX idx_task_history_created_at ON meta_task_history(created_at DESC);
CREATE INDEX idx_task_history_change_type ON meta_task_history(change_type);
CREATE INDEX idx_task_history_changed_by ON meta_task_history(changed_by);

-- Enable RLS
ALTER TABLE meta_task_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own task history"
  ON meta_task_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM meta_tasks t
    JOIN meta_workstreams w ON w.id = t.workstream_id
    JOIN meta_projects p ON p.id = w.project_id
    WHERE t.id = meta_task_history.task_id
    AND (p.owner_id = auth.uid() OR p.owner_id IS NULL)
  ));

-- =============================================
-- PROJECT HISTORY TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS meta_project_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES meta_projects(id) ON DELETE CASCADE,
  changed_by UUID,
  change_type TEXT NOT NULL,
  field_name TEXT,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_project_history_project_id ON meta_project_history(project_id);
CREATE INDEX idx_project_history_created_at ON meta_project_history(created_at DESC);

ALTER TABLE meta_project_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project history"
  ON meta_project_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM meta_projects p
    WHERE p.id = meta_project_history.project_id
    AND (p.owner_id = auth.uid() OR p.owner_id IS NULL)
  ));

-- =============================================
-- AUTOMATIC HISTORY TRACKING TRIGGERS
-- =============================================

-- Task history trigger function
CREATE OR REPLACE FUNCTION track_task_changes()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields JSONB := '{}'::jsonb;
  field_name TEXT;
  old_val JSONB;
  new_val JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO meta_task_history (task_id, change_type, new_value)
    VALUES (NEW.id, 'created', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Track each changed field
    FOREACH field_name IN ARRAY ARRAY['title', 'description', 'status', 'priority', 'assigned_agent', 'model_tier'] LOOP
      EXECUTE format('SELECT to_jsonb($1.%I), to_jsonb($2.%I)', field_name, field_name)
        INTO old_val, new_val
        USING OLD, NEW;

      IF old_val IS DISTINCT FROM new_val THEN
        INSERT INTO meta_task_history (task_id, change_type, field_name, old_value, new_value)
        VALUES (NEW.id, 'updated', field_name, old_val, new_val);
      END IF;
    END LOOP;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO meta_task_history (task_id, change_type, old_value)
    VALUES (OLD.id, 'deleted', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS track_meta_task_changes ON meta_tasks;
CREATE TRIGGER track_meta_task_changes
  AFTER INSERT OR UPDATE OR DELETE ON meta_tasks
  FOR EACH ROW EXECUTE FUNCTION track_task_changes();

-- Project history trigger function
CREATE OR REPLACE FUNCTION track_project_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO meta_project_history (project_id, change_type, new_value)
    VALUES (NEW.id, 'created', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.name IS DISTINCT FROM NEW.name THEN
      INSERT INTO meta_project_history (project_id, change_type, field_name, old_value, new_value)
      VALUES (NEW.id, 'updated', 'name', to_jsonb(OLD.name), to_jsonb(NEW.name));
    END IF;
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO meta_project_history (project_id, change_type, field_name, old_value, new_value)
      VALUES (NEW.id, 'updated', 'status', to_jsonb(OLD.status), to_jsonb(NEW.status));
    END IF;
    IF OLD.description IS DISTINCT FROM NEW.description THEN
      INSERT INTO meta_project_history (project_id, change_type, field_name, old_value, new_value)
      VALUES (NEW.id, 'updated', 'description', to_jsonb(OLD.description), to_jsonb(NEW.description));
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO meta_project_history (project_id, change_type, old_value)
    VALUES (OLD.id, 'deleted', to_jsonb(OLD));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS track_meta_project_changes ON meta_projects;
CREATE TRIGGER track_meta_project_changes
  AFTER INSERT OR UPDATE OR DELETE ON meta_projects
  FOR EACH ROW EXECUTE FUNCTION track_project_changes();

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Get task history with user-friendly format
CREATE OR REPLACE FUNCTION get_task_history(
  p_task_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  change_type TEXT,
  field_name TEXT,
  old_value JSONB,
  new_value JSONB,
  changed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    h.change_type,
    h.field_name,
    h.old_value,
    h.new_value,
    h.created_at as changed_at
  FROM meta_task_history h
  WHERE h.task_id = p_task_id
  ORDER BY h.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Get activity feed for a project
CREATE OR REPLACE FUNCTION get_project_activity_feed(
  p_project_id UUID,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  activity_type TEXT,
  entity_type TEXT,
  entity_id UUID,
  change_type TEXT,
  field_name TEXT,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  (
    SELECT
      'task'::TEXT as activity_type,
      'task'::TEXT as entity_type,
      th.task_id as entity_id,
      th.change_type,
      th.field_name,
      th.old_value,
      th.new_value,
      th.created_at
    FROM meta_task_history th
    JOIN meta_tasks t ON t.id = th.task_id
    JOIN meta_workstreams w ON w.id = t.workstream_id
    WHERE w.project_id = p_project_id
  )
  UNION ALL
  (
    SELECT
      'project'::TEXT as activity_type,
      'project'::TEXT as entity_type,
      ph.project_id as entity_id,
      ph.change_type,
      ph.field_name,
      ph.old_value,
      ph.new_value,
      ph.created_at
    FROM meta_project_history ph
    WHERE ph.project_id = p_project_id
  )
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
