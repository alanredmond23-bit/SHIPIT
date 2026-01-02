// Storage and File Metadata Types
// Merged from Joanna for organized file storage

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type StorageBucket =
  | 'user-uploads'
  | 'task-attachments'
  | 'workflow-templates'
  | 'agent-artifacts'
  | 'knowledge-base'
  | 'generated-images'
  | 'generated-videos'
  | 'voice-recordings'
  | 'conversation-exports';

export interface FileMetadata {
  id: string;
  user_id?: string;
  bucket: StorageBucket;
  file_path: string;
  file_name: string;
  original_name?: string;
  mime_type?: string;
  size_bytes?: number;
  checksum?: string;
  // Related entities
  project_id?: string;
  task_id?: string;
  conversation_id?: string;
  // Processing
  processing_status: ProcessingStatus;
  processing_error?: string;
  extracted_text?: string;
  // Metadata
  metadata: Record<string, any>;
  tags: string[];
  // Timestamps
  created_at: string;
  updated_at: string;
  accessed_at: string;
  expires_at?: string;
}

export interface StorageQuota {
  id: string;
  user_id?: string;
  total_quota_bytes: number;
  used_bytes: number;
  file_count: number;
  bucket_quotas: Record<StorageBucket, number>;
  plan_type: string;
  updated_at: string;
}

export interface StorageSummary {
  total_quota_bytes: number;
  used_bytes: number;
  file_count: number;
  usage_percentage: number;
  bucket_breakdown: Record<StorageBucket, {
    count: number;
    size: number;
  }>;
}

// File search result
export interface FileSearchResult {
  id: string;
  file_name: string;
  bucket: StorageBucket;
  file_path: string;
  mime_type?: string;
  similarity: number;
  created_at: string;
}

// Upload file request
export interface UploadFileRequest {
  bucket: StorageBucket;
  file_name: string;
  original_name?: string;
  mime_type?: string;
  size_bytes?: number;
  project_id?: string;
  task_id?: string;
  conversation_id?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

// File processing result
export interface FileProcessingResult {
  id: string;
  status: ProcessingStatus;
  extracted_text?: string;
  error?: string;
  metadata?: Record<string, any>;
}

// Bucket configuration
export interface BucketConfig {
  id: StorageBucket;
  name: string;
  public: boolean;
  max_file_size: number;
  allowed_mime_types?: string[];
}

export const BUCKET_CONFIGS: BucketConfig[] = [
  {
    id: 'user-uploads',
    name: 'User Uploads',
    public: false,
    max_file_size: 50 * 1024 * 1024, // 50MB
    allowed_mime_types: ['image/*', 'application/pdf', 'text/*', 'application/json'],
  },
  {
    id: 'task-attachments',
    name: 'Task Attachments',
    public: false,
    max_file_size: 100 * 1024 * 1024, // 100MB
  },
  {
    id: 'workflow-templates',
    name: 'Workflow Templates',
    public: false,
    max_file_size: 10 * 1024 * 1024, // 10MB
    allowed_mime_types: ['application/json'],
  },
  {
    id: 'agent-artifacts',
    name: 'Agent Artifacts',
    public: false,
    max_file_size: 100 * 1024 * 1024, // 100MB
  },
  {
    id: 'knowledge-base',
    name: 'Knowledge Base',
    public: false,
    max_file_size: 50 * 1024 * 1024, // 50MB
    allowed_mime_types: ['application/pdf', 'text/*', 'application/json'],
  },
  {
    id: 'generated-images',
    name: 'Generated Images',
    public: true,
    max_file_size: 20 * 1024 * 1024, // 20MB
    allowed_mime_types: ['image/*'],
  },
  {
    id: 'generated-videos',
    name: 'Generated Videos',
    public: true,
    max_file_size: 500 * 1024 * 1024, // 500MB
    allowed_mime_types: ['video/*'],
  },
  {
    id: 'voice-recordings',
    name: 'Voice Recordings',
    public: false,
    max_file_size: 100 * 1024 * 1024, // 100MB
    allowed_mime_types: ['audio/*'],
  },
  {
    id: 'conversation-exports',
    name: 'Conversation Exports',
    public: false,
    max_file_size: 50 * 1024 * 1024, // 50MB
    allowed_mime_types: ['application/json', 'text/*', 'application/pdf'],
  },
];
