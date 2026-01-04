// Conversation and Message Types
// Merged from Joanna for persistent chat with semantic search

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';
export type ContentType = 'text' | 'markdown' | 'code' | 'image' | 'audio';

export interface Conversation {
  id: string;
  user_id?: string;
  project_id?: string;
  agent_type?: string;
  title?: string;
  summary?: string;
  model_used?: string;
  total_tokens: number;
  message_count: number;
  is_archived: boolean;
  is_pinned: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  parent_message_id?: string;
  role: MessageRole;
  content: string;
  content_type: ContentType;
  // Tool calls
  tool_name?: string;
  tool_input?: Record<string, any>;
  tool_output?: Record<string, any>;
  // Branching
  branch_name?: string;
  is_active_branch: boolean;
  // Token tracking
  tokens_used: number;
  // Feedback
  user_rating?: number;
  user_feedback?: string;
  // Metadata
  metadata: Record<string, any>;
  created_at: string;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_type: string;
  file_size?: number;
  storage_path: string;
  thumbnail_path?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ConversationShare {
  id: string;
  conversation_id: string;
  share_token: string;
  shared_by?: string;
  expires_at?: string;
  view_count: number;
  is_public: boolean;
  created_at: string;
}

// Full conversation with messages
export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

// Semantic search result
export interface MessageSearchResult {
  message_id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  similarity: number;
  created_at: string;
}

// Create conversation request
export interface CreateConversationRequest {
  project_id?: string;
  agent_type?: string;
  title?: string;
  model_used?: string;
  metadata?: Record<string, any>;
}

// Add message request
export interface AddMessageRequest {
  conversation_id: string;
  role: MessageRole;
  content: string;
  content_type?: ContentType;
  parent_message_id?: string;
  tool_name?: string;
  tool_input?: Record<string, any>;
  tool_output?: Record<string, any>;
  tokens_used?: number;
  metadata?: Record<string, any>;
}

// Branch conversation request
export interface BranchConversationRequest {
  conversation_id: string;
  from_message_id: string;
  branch_name: string;
}

// Share conversation request
export interface ShareConversationRequest {
  conversation_id: string;
  is_public?: boolean;
  expires_in_hours?: number;
}
