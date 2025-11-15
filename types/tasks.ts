// Task-specific types

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
export type DependencyType = 'blocks' | 'related' | 'subtask';

export interface Task {
  id: string;
  userId: string;
  workflowId?: string | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: number;
  dueDate?: string | null;
  assignedTo?: string | null;
  agentId?: string | null;
  metadata?: Record<string, any>;
  parentTaskId?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  dependencyType: DependencyType;
  createdAt: string;
}

export interface TaskHistory {
  id: string;
  taskId: string;
  changedBy: string;
  changeType: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  createdAt: string;
}

export interface TaskWithDependencies extends Task {
  dependencies: TaskDependency[];
  subtasks: Task[];
}
