// Task and Project History Types
// Merged from Joanna for audit trail

export type ChangeType = 'created' | 'updated' | 'deleted';

export interface TaskHistory {
  id: string;
  task_id: string;
  changed_by?: string;
  change_type: ChangeType;
  field_name?: string;
  old_value?: any;
  new_value?: any;
  change_metadata: Record<string, any>;
  created_at: string;
}

export interface ProjectHistory {
  id: string;
  project_id: string;
  changed_by?: string;
  change_type: ChangeType;
  field_name?: string;
  old_value?: any;
  new_value?: any;
  created_at: string;
}

export interface ActivityFeedItem {
  activity_type: 'task' | 'project';
  entity_type: string;
  entity_id: string;
  change_type: ChangeType;
  field_name?: string;
  old_value?: any;
  new_value?: any;
  created_at: string;
}

// Get task history request
export interface GetTaskHistoryRequest {
  task_id: string;
  limit?: number;
}

// Get activity feed request
export interface GetActivityFeedRequest {
  project_id: string;
  limit?: number;
  entity_types?: ('task' | 'project')[];
  change_types?: ChangeType[];
  since?: string;
}

// Change summary for UI display
export interface ChangeSummary {
  id: string;
  entity_type: 'task' | 'project';
  entity_id: string;
  entity_name?: string;
  change_type: ChangeType;
  changes: Array<{
    field: string;
    from?: any;
    to?: any;
  }>;
  changed_by?: {
    id: string;
    name?: string;
    avatar?: string;
  };
  created_at: string;
  formatted_time: string;
}

// History filter options
export interface HistoryFilter {
  entity_types?: ('task' | 'project')[];
  change_types?: ChangeType[];
  changed_by?: string[];
  field_names?: string[];
  date_from?: string;
  date_to?: string;
}

// History stats
export interface HistoryStats {
  total_changes: number;
  changes_by_type: Record<ChangeType, number>;
  changes_by_field: Record<string, number>;
  changes_by_user: Record<string, number>;
  changes_over_time: Array<{
    date: string;
    count: number;
  }>;
}
