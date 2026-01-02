-- Workflow State Machine Schema
-- Merged from Joanna for visual workflow automation

-- =============================================
-- WORKFLOWS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS meta_workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES meta_projects(id) ON DELETE CASCADE,
  user_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
  trigger_type TEXT CHECK (trigger_type IN ('manual', 'scheduled', 'event', 'ai_suggested', 'webhook')),
  trigger_config JSONB DEFAULT '{}'::jsonb,
  version INTEGER DEFAULT 1,
  is_template BOOLEAN DEFAULT false,
  template_category TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflows_project_id ON meta_workflows(project_id);
CREATE INDEX idx_workflows_user_id ON meta_workflows(user_id);
CREATE INDEX idx_workflows_status ON meta_workflows(status);
CREATE INDEX idx_workflows_trigger_type ON meta_workflows(trigger_type);
CREATE INDEX idx_workflows_is_template ON meta_workflows(is_template) WHERE is_template = true;

-- =============================================
-- WORKFLOW STATES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS meta_workflow_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES meta_workflows(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  state_type TEXT NOT NULL CHECK (state_type IN ('start', 'action', 'decision', 'parallel', 'wait', 'end')),
  action_type TEXT, -- 'ai_task', 'http_request', 'email', 'notification', 'transform', etc.
  action_config JSONB DEFAULT '{}'::jsonb,
  -- Visual positioning for workflow builder
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  -- Styling
  color TEXT DEFAULT '#6366f1',
  icon TEXT,
  -- Execution settings
  timeout_seconds INTEGER DEFAULT 300,
  retry_count INTEGER DEFAULT 0,
  retry_delay_seconds INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflow_states_workflow_id ON meta_workflow_states(workflow_id);
CREATE INDEX idx_workflow_states_type ON meta_workflow_states(state_type);

-- =============================================
-- WORKFLOW TRANSITIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS meta_workflow_transitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES meta_workflows(id) ON DELETE CASCADE,
  from_state_id UUID NOT NULL REFERENCES meta_workflow_states(id) ON DELETE CASCADE,
  to_state_id UUID NOT NULL REFERENCES meta_workflow_states(id) ON DELETE CASCADE,
  name TEXT,
  condition JSONB DEFAULT '{}'::jsonb, -- Condition to evaluate
  condition_expression TEXT, -- JavaScript-like expression
  priority INTEGER DEFAULT 0,
  -- Visual routing points for curved lines
  routing_points JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflow_transitions_workflow_id ON meta_workflow_transitions(workflow_id);
CREATE INDEX idx_workflow_transitions_from_state ON meta_workflow_transitions(from_state_id);
CREATE INDEX idx_workflow_transitions_to_state ON meta_workflow_transitions(to_state_id);

-- =============================================
-- WORKFLOW INSTANCES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS meta_workflow_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES meta_workflows(id) ON DELETE CASCADE,
  user_id UUID,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'paused', 'completed', 'failed', 'cancelled')),
  current_state_id UUID REFERENCES meta_workflow_states(id),
  context JSONB DEFAULT '{}'::jsonb, -- Runtime context/variables
  input_data JSONB DEFAULT '{}'::jsonb, -- Initial input
  output_data JSONB DEFAULT '{}'::jsonb, -- Final output
  error_message TEXT,
  trigger_source TEXT, -- What triggered this instance
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  -- Parallel execution tracking
  parallel_branches JSONB DEFAULT '[]'::jsonb
);

CREATE INDEX idx_workflow_instances_workflow_id ON meta_workflow_instances(workflow_id);
CREATE INDEX idx_workflow_instances_user_id ON meta_workflow_instances(user_id);
CREATE INDEX idx_workflow_instances_status ON meta_workflow_instances(status);
CREATE INDEX idx_workflow_instances_current_state ON meta_workflow_instances(current_state_id);

-- =============================================
-- WORKFLOW EXECUTION LOGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS meta_workflow_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id UUID NOT NULL REFERENCES meta_workflow_instances(id) ON DELETE CASCADE,
  state_id UUID REFERENCES meta_workflow_states(id),
  transition_id UUID REFERENCES meta_workflow_transitions(id),
  action TEXT NOT NULL,
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed', 'skipped', 'pending')),
  input_data JSONB,
  output_data JSONB,
  error TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflow_logs_instance_id ON meta_workflow_logs(instance_id);
CREATE INDEX idx_workflow_logs_state_id ON meta_workflow_logs(state_id);
CREATE INDEX idx_workflow_logs_created_at ON meta_workflow_logs(created_at DESC);

-- =============================================
-- WORKFLOW SCHEDULES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS meta_workflow_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES meta_workflows(id) ON DELETE CASCADE,
  cron_expression TEXT NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  enabled BOOLEAN DEFAULT true,
  input_data JSONB DEFAULT '{}'::jsonb,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflow_schedules_workflow_id ON meta_workflow_schedules(workflow_id);
CREATE INDEX idx_workflow_schedules_next_run ON meta_workflow_schedules(next_run_at) WHERE enabled = true;

-- =============================================
-- ENABLE RLS
-- =============================================
ALTER TABLE meta_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_workflow_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_workflow_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_workflow_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_workflow_schedules ENABLE ROW LEVEL SECURITY;

-- Workflow policies
CREATE POLICY "Users can view own workflows"
  ON meta_workflows FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL OR is_template = true);

CREATE POLICY "Users can manage own workflows"
  ON meta_workflows FOR ALL
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Workflow states inherit from workflow
CREATE POLICY "Users can view workflow states"
  ON meta_workflow_states FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM meta_workflows w
    WHERE w.id = meta_workflow_states.workflow_id
    AND (w.user_id = auth.uid() OR w.user_id IS NULL OR w.is_template = true)
  ));

CREATE POLICY "Users can manage workflow states"
  ON meta_workflow_states FOR ALL
  USING (EXISTS (
    SELECT 1 FROM meta_workflows w
    WHERE w.id = meta_workflow_states.workflow_id
    AND (w.user_id = auth.uid() OR w.user_id IS NULL)
  ));

-- Similar policies for other workflow tables
CREATE POLICY "Users can view workflow transitions"
  ON meta_workflow_transitions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM meta_workflows w
    WHERE w.id = meta_workflow_transitions.workflow_id
    AND (w.user_id = auth.uid() OR w.user_id IS NULL OR w.is_template = true)
  ));

CREATE POLICY "Users can manage workflow transitions"
  ON meta_workflow_transitions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM meta_workflows w
    WHERE w.id = meta_workflow_transitions.workflow_id
    AND (w.user_id = auth.uid() OR w.user_id IS NULL)
  ));

CREATE POLICY "Users can view own workflow instances"
  ON meta_workflow_instances FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can manage own workflow instances"
  ON meta_workflow_instances FOR ALL
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can view own workflow logs"
  ON meta_workflow_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM meta_workflow_instances i
    WHERE i.id = meta_workflow_logs.instance_id
    AND (i.user_id = auth.uid() OR i.user_id IS NULL)
  ));

CREATE POLICY "Users can view own workflow schedules"
  ON meta_workflow_schedules FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM meta_workflows w
    WHERE w.id = meta_workflow_schedules.workflow_id
    AND (w.user_id = auth.uid() OR w.user_id IS NULL)
  ));

CREATE POLICY "Users can manage own workflow schedules"
  ON meta_workflow_schedules FOR ALL
  USING (EXISTS (
    SELECT 1 FROM meta_workflows w
    WHERE w.id = meta_workflow_schedules.workflow_id
    AND (w.user_id = auth.uid() OR w.user_id IS NULL)
  ));

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Get start state for a workflow
CREATE OR REPLACE FUNCTION get_workflow_start_state(p_workflow_id UUID)
RETURNS UUID AS $$
  SELECT id FROM meta_workflow_states
  WHERE workflow_id = p_workflow_id AND state_type = 'start'
  LIMIT 1;
$$ LANGUAGE SQL;

-- Get available transitions from a state
CREATE OR REPLACE FUNCTION get_available_transitions(p_state_id UUID)
RETURNS TABLE (
  transition_id UUID,
  to_state_id UUID,
  to_state_name TEXT,
  condition JSONB,
  priority INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id as transition_id,
    t.to_state_id,
    s.name as to_state_name,
    t.condition,
    t.priority
  FROM meta_workflow_transitions t
  JOIN meta_workflow_states s ON s.id = t.to_state_id
  WHERE t.from_state_id = p_state_id
  ORDER BY t.priority DESC;
END;
$$ LANGUAGE plpgsql;

-- Clone a workflow (for templates)
CREATE OR REPLACE FUNCTION clone_workflow(
  p_workflow_id UUID,
  p_new_name TEXT,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  new_workflow_id UUID;
  state_mapping JSONB := '{}'::jsonb;
  old_state_id UUID;
  new_state_id UUID;
BEGIN
  -- Clone workflow
  INSERT INTO meta_workflows (user_id, name, description, trigger_type, trigger_config, metadata)
  SELECT p_user_id, p_new_name, description, trigger_type, trigger_config, metadata
  FROM meta_workflows WHERE id = p_workflow_id
  RETURNING id INTO new_workflow_id;

  -- Clone states and build mapping
  FOR old_state_id, new_state_id IN
    INSERT INTO meta_workflow_states (workflow_id, name, description, state_type, action_type, action_config, position_x, position_y, color, icon)
    SELECT new_workflow_id, name, description, state_type, action_type, action_config, position_x, position_y, color, icon
    FROM meta_workflow_states WHERE workflow_id = p_workflow_id
    RETURNING (SELECT id FROM meta_workflow_states WHERE workflow_id = p_workflow_id LIMIT 1), id
  LOOP
    state_mapping := state_mapping || jsonb_build_object(old_state_id::text, new_state_id);
  END LOOP;

  -- Clone transitions with mapped state IDs
  INSERT INTO meta_workflow_transitions (workflow_id, from_state_id, to_state_id, name, condition, condition_expression, priority, routing_points)
  SELECT
    new_workflow_id,
    (state_mapping->>(from_state_id::text))::uuid,
    (state_mapping->>(to_state_id::text))::uuid,
    name, condition, condition_expression, priority, routing_points
  FROM meta_workflow_transitions WHERE workflow_id = p_workflow_id;

  RETURN new_workflow_id;
END;
$$ LANGUAGE plpgsql;

-- Update timestamp trigger
CREATE TRIGGER update_meta_workflows_updated_at
  BEFORE UPDATE ON meta_workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
