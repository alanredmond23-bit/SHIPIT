/**
 * Conversations API Client
 * Provides functions to interact with the conversations API
 */

import { createClient } from '@/lib/auth/supabase-client';
import type {
  Conversation,
  Message,
  CreateConversationRequest,
  UpdateConversationRequest,
  CreateMessageRequest,
  ConversationWithMessages,
  ConversationListItem,
} from '@/types/conversations';

// Helper to bypass Supabase type checking for tables without generated types
// TODO: Generate proper types with `supabase gen types typescript`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => createClient() as any;

// ============================================================================
// Conversation CRUD Operations
// ============================================================================

/**
 * Create a new conversation
 */
export async function createConversation(
  request: CreateConversationRequest
): Promise<Conversation> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await db()
    .from('meta_conversations')
    .insert({
      user_id: user?.id || null,
      title: request.title || null,
      agent_type: request.agent_type || 'general',
      model_used: request.model_used || null,
      project_id: request.project_id || null,
      metadata: request.metadata || {},
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create conversation: ${error.message}`);
  }

  return data as Conversation;
}

/**
 * Get a conversation by ID
 */
export async function getConversation(
  conversationId: string
): Promise<Conversation | null> {
  const { data, error } = await db()
    .from('meta_conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to get conversation: ${error.message}`);
  }

  return data as Conversation;
}

/**
 * Get conversation with all messages
 */
export async function getConversationWithMessages(
  conversationId: string
): Promise<ConversationWithMessages | null> {
  // Get conversation
  const { data: conversation, error: convError } = await db()
    .from('meta_conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (convError) {
    if (convError.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get conversation: ${convError.message}`);
  }

  // Get messages
  const { data: messages, error: msgError } = await db()
    .from('meta_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('is_active_branch', true)
    .order('created_at', { ascending: true });

  if (msgError) {
    throw new Error(`Failed to get messages: ${msgError.message}`);
  }

  return {
    conversation: conversation as Conversation,
    messages: (messages || []) as Message[],
  };
}

/**
 * List conversations for the current user
 */
export async function listConversations(options?: {
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
  agentType?: string;
}): Promise<ConversationListItem[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let query = db()
    .from('meta_conversations')
    .select(`
      id,
      title,
      summary,
      model_used,
      message_count,
      is_pinned,
      is_archived,
      created_at,
      updated_at
    `)
    .order('is_pinned', { ascending: false })
    .order('updated_at', { ascending: false });

  // Filter by user or allow null user_id (anonymous)
  if (user?.id) {
    query = query.or(`user_id.eq.${user.id},user_id.is.null`);
  } else {
    query = query.is('user_id', null);
  }

  // Filter archived
  if (!options?.includeArchived) {
    query = query.eq('is_archived', false);
  }

  // Filter by agent type
  if (options?.agentType) {
    query = query.eq('agent_type', options.agentType);
  }

  // Pagination
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list conversations: ${error.message}`);
  }

  return (data || []) as ConversationListItem[];
}

/**
 * Update a conversation
 */
export async function updateConversation(
  conversationId: string,
  updates: UpdateConversationRequest
): Promise<Conversation> {
  const { data, error } = await db()
    .from('meta_conversations')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update conversation: ${error.message}`);
  }

  return data as Conversation;
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  const { error } = await db()
    .from('meta_conversations')
    .delete()
    .eq('id', conversationId);

  if (error) {
    throw new Error(`Failed to delete conversation: ${error.message}`);
  }
}

/**
 * Archive a conversation
 */
export async function archiveConversation(
  conversationId: string,
  archive: boolean = true
): Promise<Conversation> {
  return updateConversation(conversationId, { is_archived: archive });
}

/**
 * Pin/unpin a conversation
 */
export async function pinConversation(
  conversationId: string,
  pin: boolean = true
): Promise<Conversation> {
  return updateConversation(conversationId, { is_pinned: pin });
}

// ============================================================================
// Message CRUD Operations
// ============================================================================

/**
 * Create a new message
 */
export async function createMessage(
  request: CreateMessageRequest
): Promise<Message> {
  const { data, error } = await db()
    .from('meta_messages')
    .insert({
      conversation_id: request.conversation_id,
      role: request.role,
      content: request.content,
      content_type: request.content_type || 'text',
      parent_message_id: request.parent_message_id || null,
      tool_name: request.tool_name || null,
      tool_input: request.tool_input || null,
      tool_output: request.tool_output || null,
      tokens_used: request.tokens_used || 0,
      metadata: request.metadata || {},
      is_active_branch: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create message: ${error.message}`);
  }

  return data as Message;
}

/**
 * Get messages for a conversation
 */
export async function getMessages(
  conversationId: string,
  options?: {
    limit?: number;
    offset?: number;
    activeBranchOnly?: boolean;
  }
): Promise<Message[]> {
  let query = db()
    .from('meta_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (options?.activeBranchOnly !== false) {
    query = query.eq('is_active_branch', true);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get messages: ${error.message}`);
  }

  return (data || []) as Message[];
}

/**
 * Update a message (e.g., for ratings/feedback)
 */
export async function updateMessage(
  messageId: string,
  updates: {
    user_rating?: number;
    user_feedback?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<Message> {
  const { data, error } = await db()
    .from('meta_messages')
    .update(updates)
    .eq('id', messageId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update message: ${error.message}`);
  }

  return data as Message;
}

/**
 * Delete a message
 */
export async function deleteMessage(messageId: string): Promise<void> {
  const { error } = await db()
    .from('meta_messages')
    .delete()
    .eq('id', messageId);

  if (error) {
    throw new Error(`Failed to delete message: ${error.message}`);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a title from the first user message
 */
export function generateTitleFromMessage(content: string): string {
  // Take first 100 characters, find natural break point
  const maxLength = 60;
  let title = content.trim();

  if (title.length <= maxLength) {
    return title;
  }

  // Try to break at sentence or phrase boundary
  const breakPoints = ['. ', '? ', '! ', ', ', ' '];
  for (const breakPoint of breakPoints) {
    const idx = title.lastIndexOf(breakPoint, maxLength);
    if (idx > 20) {
      return title.substring(0, idx + (breakPoint === ' ' ? 0 : 1)).trim();
    }
  }

  // Fallback: break at word boundary
  const lastSpace = title.lastIndexOf(' ', maxLength);
  if (lastSpace > 20) {
    return title.substring(0, lastSpace).trim() + '...';
  }

  // Last resort: truncate
  return title.substring(0, maxLength).trim() + '...';
}

/**
 * Create a conversation and add the first message in one operation
 */
export async function createConversationWithMessage(
  conversationRequest: CreateConversationRequest,
  messageContent: string,
  messageRole: 'user' | 'assistant' = 'user'
): Promise<{ conversation: Conversation; message: Message }> {
  // Create conversation with auto-generated title
  const title = conversationRequest.title || generateTitleFromMessage(messageContent);
  const conversation = await createConversation({
    ...conversationRequest,
    title,
  });

  // Add the first message
  const message = await createMessage({
    conversation_id: conversation.id,
    role: messageRole,
    content: messageContent,
  });

  return { conversation, message };
}

/**
 * Save a complete message exchange (user message + assistant response)
 */
export async function saveMessageExchange(
  conversationId: string,
  userContent: string,
  assistantContent: string,
  options?: {
    model?: string;
    userTokens?: number;
    assistantTokens?: number;
    userMetadata?: Record<string, unknown>;
    assistantMetadata?: Record<string, unknown>;
  }
): Promise<{ userMessage: Message; assistantMessage: Message }> {
  const userMessage = await createMessage({
    conversation_id: conversationId,
    role: 'user',
    content: userContent,
    tokens_used: options?.userTokens,
    metadata: options?.userMetadata,
  });

  const assistantMessage = await createMessage({
    conversation_id: conversationId,
    role: 'assistant',
    content: assistantContent,
    tokens_used: options?.assistantTokens,
    metadata: {
      ...options?.assistantMetadata,
      model: options?.model,
    },
  });

  return { userMessage, assistantMessage };
}
