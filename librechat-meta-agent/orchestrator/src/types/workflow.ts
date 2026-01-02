// Workflow State Machine Types
// Merged from Joanna for visual workflow automation

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';
export type WorkflowTriggerType = 'manual' | 'scheduled' | 'event' | 'ai_suggested' | 'webhook';
export type WorkflowStateType = 'start' | 'action' | 'decision' | 'parallel' | 'wait' | 'end';
export type WorkflowInstanceStatus = 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type WorkflowLogStatus = 'success' | 'failed' | 'skipped' | 'pending';

export interface Workflow {
  id: string;
  project_id?: string;
  user_id?: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  trigger_type?: WorkflowTriggerType;
  trigger_config: Record<string, any>;
  version: number;
  is_template: boolean;
  template_category?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface WorkflowState {
  id: string;
  workflow_id: string;
  name: string;
  description?: string;
  state_type: WorkflowStateType;
  action_type?: string;
  action_config: Record<string, any>;
  // Visual positioning
  position_x: number;
  position_y: number;
  // Styling
  color: string;
  icon?: string;
  // Execution settings
  timeout_seconds: number;
  retry_count: number;
  retry_delay_seconds: number;
  created_at: string;
}

export interface WorkflowTransition {
  id: string;
  workflow_id: string;
  from_state_id: string;
  to_state_id: string;
  name?: string;
  condition: Record<string, any>;
  condition_expression?: string;
  priority: number;
  routing_points: Array<{ x: number; y: number }>;
  created_at: string;
}

export interface WorkflowInstance {
  id: string;
  workflow_id: string;
  user_id?: string;
  status: WorkflowInstanceStatus;
  current_state_id?: string;
  context: Record<string, any>;
  input_data: Record<string, any>;
  output_data: Record<string, any>;
  error_message?: string;
  trigger_source?: string;
  started_at: string;
  completed_at?: string;
  parallel_branches: Array<{
    branch_id: string;
    state_id: string;
    status: WorkflowInstanceStatus;
  }>;
}

export interface WorkflowLog {
  id: string;
  instance_id: string;
  state_id?: string;
  transition_id?: string;
  action: string;
  status: WorkflowLogStatus;
  input_data?: Record<string, any>;
  output_data?: Record<string, any>;
  error?: string;
  duration_ms?: number;
  created_at: string;
}

export interface WorkflowSchedule {
  id: string;
  workflow_id: string;
  cron_expression: string;
  timezone: string;
  enabled: boolean;
  input_data: Record<string, any>;
  last_run_at?: string;
  next_run_at?: string;
  run_count: number;
  created_at: string;
}

// Full workflow with nested states and transitions
export interface WorkflowWithDetails extends Workflow {
  states: WorkflowState[];
  transitions: WorkflowTransition[];
  schedules?: WorkflowSchedule[];
}

// Action types for workflow states
export type WorkflowActionType =
  | 'ai_task'
  | 'http_request'
  | 'email'
  | 'notification'
  | 'transform'
  | 'delay'
  | 'condition'
  | 'loop'
  | 'parallel'
  | 'code'
  | 'database'
  | 'file'
  | 'webhook';

export interface ActionConfig {
  type: WorkflowActionType;
  // AI Task
  prompt?: string;
  model?: string;
  temperature?: number;
  // HTTP Request
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: Record<string, any>;
  // Email
  to?: string[];
  subject?: string;
  template?: string;
  // Transform
  expression?: string;
  mappings?: Record<string, string>;
  // Delay
  delay_seconds?: number;
  delay_until?: string;
  // Code
  language?: 'javascript' | 'python';
  code?: string;
}

// Condition evaluation
export interface ConditionConfig {
  type: 'expression' | 'comparison' | 'all' | 'any';
  expression?: string;
  field?: string;
  operator?: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'startsWith' | 'endsWith';
  value?: any;
  conditions?: ConditionConfig[];
}

// Workflow execution context
export interface ExecutionContext {
  workflow_id: string;
  instance_id: string;
  current_state_id: string;
  variables: Record<string, any>;
  input: Record<string, any>;
  outputs: Record<string, Record<string, any>>;
  errors: Array<{ state_id: string; error: string; timestamp: string }>;
  start_time: string;
  current_time: string;
}
