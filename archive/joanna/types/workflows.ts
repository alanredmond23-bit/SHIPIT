// Workflow-specific types

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';
export type WorkflowTriggerType = 'manual' | 'scheduled' | 'event' | 'ai_suggested';
export type StateType = 'start' | 'action' | 'decision' | 'end';
export type InstanceStatus = 'running' | 'paused' | 'completed' | 'failed';

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  triggerType?: WorkflowTriggerType;
  triggerConfig?: Record<string, any>;
  states: WorkflowState[];
  transitions: WorkflowTransition[];
}

export interface WorkflowState {
  id: string;
  workflowId: string;
  name: string;
  stateType: StateType;
  configuration?: Record<string, any>;
  position?: { x: number; y: number };
}

export interface WorkflowTransition {
  id: string;
  workflowId: string;
  fromStateId: string;
  toStateId: string;
  condition?: Record<string, any>;
  priority: number;
}

export interface WorkflowInstance {
  id: string;
  workflowId: string;
  userId: string;
  status: InstanceStatus;
  currentStateId?: string;
  context: Record<string, any>;
  startedAt: string;
  completedAt?: string;
}

export interface WorkflowLog {
  id: string;
  instanceId: string;
  stateId?: string;
  action: string;
  result?: Record<string, any>;
  error?: string;
  createdAt: string;
}
