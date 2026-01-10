/**
 * Conversation and Message Types
 * Matches the database schema in schemas/016_conversations.sql
 */

export interface Conversation {
  id: string;
  user_id: string | null;
  project_id: string | null;
  agent_type: string | null;
  title: string | null;
  summary: string | null;
  model_used: string | null;
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
  parent_message_id: string | null;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  content_type: 'text' | 'markdown' | 'code' | 'image' | 'audio';
  tool_name: string | null;
  tool_input: Record<string, any> | null;
  tool_output: Record<string, any> | null;
  branch_name: string | null;
  is_active_branch: boolean;
  tokens_used: number;
  user_rating: number | null;
  user_feedback: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  storage_path: string;
  thumbnail_path: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ConversationShare {
  id: string;
  conversation_id: string;
  share_token: string;
  shared_by: string | null;
  expires_at: string | null;
  view_count: number;
  is_public: boolean;
  created_at: string;
}

// API Request/Response Types
export interface CreateConversationRequest {
  title?: string;
  agent_type?: string;
  model_used?: string;
  project_id?: string;
  metadata?: Record<string, any>;
}

export interface UpdateConversationRequest {
  title?: string;
  summary?: string;
  is_archived?: boolean;
  is_pinned?: boolean;
  metadata?: Record<string, any>;
}

export interface CreateMessageRequest {
  conversation_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  content_type?: 'text' | 'markdown' | 'code' | 'image' | 'audio';
  parent_message_id?: string;
  tool_name?: string;
  tool_input?: Record<string, any>;
  tool_output?: Record<string, any>;
  tokens_used?: number;
  metadata?: Record<string, any>;
}

export interface ConversationWithMessages {
  conversation: Conversation;
  messages: Message[];
}

export interface ConversationListItem {
  id: string;
  title: string | null;
  summary: string | null;
  model_used: string | null;
  message_count: number;
  is_pinned: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  preview?: string; // First message content preview
}

// Local UI State Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: ChatAttachment[];
  artifact?: ChatArtifact;
  isStreaming?: boolean;
  model?: string;
  tools?: string[];
}

export interface ChatAttachment {
  id: string;
  type: 'image' | 'file' | 'code';
  name: string;
  url?: string;
  content?: string;
}

export interface ChatArtifact {
  id: string;
  type: 'code' | 'document' | 'diagram';
  title: string;
  content: string;
  language?: string;
}
