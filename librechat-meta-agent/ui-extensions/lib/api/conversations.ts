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

// Export format type
export type ExportFormat = 'json' | 'markdown';

/**
 * List conversations for the current user
 */
export async function listConversations(options?: {
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
  agentType?: string;
  search?: string;
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

  // Search filter - performs client-side filtering after query
  // For production, this should use a full-text search index
  const searchTerm = options?.search?.toLowerCase().trim();

  // Pagination
  if (options?.limit) {
    query = query.limit(searchTerm ? 200 : options.limit); // Get more for search filtering
  }
  if (options?.offset && !searchTerm) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list conversations: ${error.message}`);
  }

  let results = (data || []) as ConversationListItem[];

  // Apply search filter client-side
  if (searchTerm) {
    results = results.filter((c) => {
      const title = (c.title || '').toLowerCase();
      const summary = (c.summary || '').toLowerCase();
      return title.includes(searchTerm) || summary.includes(searchTerm);
    });

    // Apply limit after filtering
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }
  }

  return results;
}

/**
 * Search conversations by content (includes message content search)
 * This performs a more thorough search including message content
 */
export async function searchConversations(
  searchQuery: string,
  options?: {
    limit?: number;
    includeArchived?: boolean;
  }
): Promise<ConversationListItem[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // First, search in messages to find matching conversation IDs
  const messageSearchQuery = db()
    .from('meta_messages')
    .select('conversation_id')
    .ilike('content', `%${searchQuery}%`);

  const { data: messageMatches, error: msgError } = await messageSearchQuery;

  if (msgError) {
    throw new Error(`Failed to search messages: ${msgError.message}`);
  }

  const matchingConversationIds = [...new Set((messageMatches || []).map((m: any) => m.conversation_id))];

  // Now get conversations that match title/summary OR have matching messages
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

  // Filter by user
  if (user?.id) {
    query = query.or(`user_id.eq.${user.id},user_id.is.null`);
  } else {
    query = query.is('user_id', null);
  }

  // Filter archived
  if (!options?.includeArchived) {
    query = query.eq('is_archived', false);
  }

  // Apply search filter - match title, summary, or conversation ID in message matches
  const searchPattern = `%${searchQuery}%`;
  if (matchingConversationIds.length > 0) {
    query = query.or(`title.ilike.${searchPattern},summary.ilike.${searchPattern},id.in.(${matchingConversationIds.join(',')})`);
  } else {
    query = query.or(`title.ilike.${searchPattern},summary.ilike.${searchPattern}`);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
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
// Export Operations
// ============================================================================

/**
 * Export conversation data for download
 */
export interface ExportedConversation {
  conversation: {
    id: string;
    title: string | null;
    summary: string | null;
    model_used: string | null;
    agent_type: string | null;
    message_count: number;
    total_tokens: number;
    created_at: string;
    updated_at: string;
    metadata: Record<string, any>;
  };
  messages: Array<{
    id: string;
    role: string;
    content: string;
    content_type: string;
    tool_name: string | null;
    tool_input: Record<string, any> | null;
    tool_output: Record<string, any> | null;
    tokens_used: number;
    created_at: string;
    metadata: Record<string, any>;
  }>;
  exported_at: string;
}

/**
 * Export a conversation as JSON
 */
export async function exportConversationAsJson(
  conversationId: string
): Promise<ExportedConversation> {
  // Get conversation
  const { data: conversation, error: convError } = await db()
    .from('meta_conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (convError) {
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
    conversation: {
      id: conversation.id,
      title: conversation.title,
      summary: conversation.summary,
      model_used: conversation.model_used,
      agent_type: conversation.agent_type,
      message_count: conversation.message_count,
      total_tokens: conversation.total_tokens,
      created_at: conversation.created_at,
      updated_at: conversation.updated_at,
      metadata: conversation.metadata,
    },
    messages: (messages || []).map((msg: any) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      content_type: msg.content_type,
      tool_name: msg.tool_name,
      tool_input: msg.tool_input,
      tool_output: msg.tool_output,
      tokens_used: msg.tokens_used,
      created_at: msg.created_at,
      metadata: msg.metadata,
    })),
    exported_at: new Date().toISOString(),
  };
}

/**
 * Export a conversation as Markdown string
 */
export async function exportConversationAsMarkdown(
  conversationId: string
): Promise<string> {
  // Get conversation
  const { data: conversation, error: convError } = await db()
    .from('meta_conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (convError) {
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

  // Generate Markdown
  const title = conversation.title || 'Conversation';
  const createdAt = new Date(conversation.created_at).toLocaleString();

  let markdown = `# ${title}\n\n`;
  markdown += `**Created:** ${createdAt}\n`;
  markdown += `**Model:** ${conversation.model_used || 'Unknown'}\n`;
  markdown += `**Messages:** ${conversation.message_count}\n\n`;
  markdown += `---\n\n`;

  for (const msg of messages || []) {
    const timestamp = new Date(msg.created_at).toLocaleString();
    const roleLabel = msg.role === 'user' ? '**User**' : '**Assistant**';

    markdown += `### ${roleLabel} (${timestamp})\n\n`;
    markdown += `${msg.content}\n\n`;

    if (msg.tool_name) {
      markdown += `> Tool used: \`${msg.tool_name}\`\n\n`;
    }

    markdown += `---\n\n`;
  }

  return markdown;
}

/**
 * Download conversation export - triggers file download in browser
 */
export function downloadConversationExport(
  data: ExportedConversation | string,
  format: ExportFormat,
  filename?: string
): void {
  let content: string;
  let mimeType: string;
  let extension: string;

  if (format === 'markdown') {
    content = typeof data === 'string' ? data : '';
    mimeType = 'text/markdown';
    extension = 'md';
  } else {
    content = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
    mimeType = 'application/json';
    extension = 'json';
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `conversation-export.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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

// ============================================================================
// Branching Operations
// ============================================================================

import type {
  CreateBranchRequest,
  SwitchBranchRequest,
  BranchOperationResult,
  ConversationBranch,
} from '@/types/branching';

/**
 * Create a new branch from an edited message
 * This creates a new message as a sibling to the original and marks it as active
 */
export async function createBranchFromEdit(
  request: CreateBranchRequest
): Promise<BranchOperationResult> {
  try {
    const branchName = request.branchName || `branch-${Date.now()}`;

    // First, mark the current active sibling messages as inactive (from the branch point forward)
    const { error: deactivateError } = await db()
      .from('meta_messages')
      .update({ is_active_branch: false })
      .eq('conversation_id', request.conversationId)
      .eq('parent_message_id', request.parentMessageId)
      .eq('is_active_branch', true);

    if (deactivateError) {
      // Non-fatal - there may not be existing siblings
      console.warn('Could not deactivate sibling messages:', deactivateError.message);
    }

    // Create the new message as part of the new branch
    const { data: newMessage, error: createError } = await db()
      .from('meta_messages')
      .insert({
        conversation_id: request.conversationId,
        parent_message_id: request.parentMessageId,
        role: request.role,
        content: request.content,
        content_type: 'text',
        branch_name: branchName,
        is_active_branch: true,
        tokens_used: 0,
        metadata: {
          branch_created_at: new Date().toISOString(),
          is_edit: true,
        },
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create branch message: ${createError.message}`);
    }

    // Update conversation timestamp
    await db()
      .from('meta_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', request.conversationId);

    return {
      success: true,
      branchId: branchName,
      messageId: newMessage.id,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create branch',
    };
  }
}

/**
 * Switch to a different branch
 * Updates which messages are marked as active in the conversation
 */
export async function switchBranch(
  request: SwitchBranchRequest
): Promise<BranchOperationResult> {
  try {
    const { conversationId, branchId } = request;

    // First, get all messages for this conversation
    const { data: allMessages, error: fetchError } = await db()
      .from('meta_messages')
      .select('id, parent_message_id, branch_name, is_active_branch')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch messages: ${fetchError.message}`);
    }

    if (!allMessages || allMessages.length === 0) {
      return { success: true }; // No messages to switch
    }

    // Find the target branch messages
    const targetBranchMessages = allMessages.filter(
      (m: any) => m.branch_name === branchId || (branchId === 'main' && !m.branch_name)
    );

    if (targetBranchMessages.length === 0) {
      return {
        success: false,
        error: `Branch "${branchId}" not found`,
      };
    }

    // Build the path from root to the target branch
    const pathMessageIds = new Set<string>();
    const targetMessageIds = new Set(targetBranchMessages.map((m: any) => m.id));

    // Add target branch messages to path
    targetBranchMessages.forEach((m: any) => pathMessageIds.add(m.id));

    // Trace back from each target message to root
    for (const msg of targetBranchMessages) {
      let currentMsg = msg;
      while (currentMsg.parent_message_id) {
        pathMessageIds.add(currentMsg.parent_message_id);
        const parentMsg = allMessages.find((m: any) => m.id === currentMsg.parent_message_id);
        if (!parentMsg) break;
        currentMsg = parentMsg;
      }
    }

    // Deactivate all messages not in the path
    const messagesToDeactivate = allMessages
      .filter((m: any) => !pathMessageIds.has(m.id) && m.is_active_branch)
      .map((m: any) => m.id);

    if (messagesToDeactivate.length > 0) {
      const { error: deactivateError } = await db()
        .from('meta_messages')
        .update({ is_active_branch: false })
        .in('id', messagesToDeactivate);

      if (deactivateError) {
        throw new Error(`Failed to deactivate messages: ${deactivateError.message}`);
      }
    }

    // Activate all messages in the path
    const messagesToActivate = allMessages
      .filter((m: any) => pathMessageIds.has(m.id) && !m.is_active_branch)
      .map((m: any) => m.id);

    if (messagesToActivate.length > 0) {
      const { error: activateError } = await db()
        .from('meta_messages')
        .update({ is_active_branch: true })
        .in('id', messagesToActivate);

      if (activateError) {
        throw new Error(`Failed to activate messages: ${activateError.message}`);
      }
    }

    return {
      success: true,
      branchId,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to switch branch',
    };
  }
}

/**
 * Get all branches for a conversation
 */
export async function getBranchesForConversation(
  conversationId: string
): Promise<ConversationBranch[]> {
  const { data: messages, error } = await db()
    .from('meta_messages')
    .select('id, branch_name, parent_message_id, is_active_branch, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to get branches: ${error.message}`);
  }

  if (!messages || messages.length === 0) {
    return [];
  }

  // Group messages by branch
  const branchMap = new Map<string, ConversationBranch>();

  for (const msg of messages) {
    const branchId = msg.branch_name || 'main';

    if (!branchMap.has(branchId)) {
      branchMap.set(branchId, {
        id: branchId,
        name: branchId === 'main' ? 'Main' : branchId,
        parentMessageId: msg.parent_message_id || '',
        messageIds: [],
        isActive: msg.is_active_branch,
        createdAt: new Date(msg.created_at),
      });
    }

    const branch = branchMap.get(branchId)!;
    branch.messageIds.push(msg.id);
    // A branch is active if any of its messages are active
    if (msg.is_active_branch) {
      branch.isActive = true;
    }
  }

  return Array.from(branchMap.values());
}

/**
 * Get messages for a specific branch
 */
export async function getMessagesForBranch(
  conversationId: string,
  branchId: string
): Promise<Message[]> {
  // For 'main' branch, get messages without branch_name or with branch_name = 'main'
  let query = db()
    .from('meta_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (branchId === 'main') {
    query = query.or('branch_name.is.null,branch_name.eq.main');
  } else {
    query = query.eq('branch_name', branchId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get branch messages: ${error.message}`);
  }

  return (data || []) as Message[];
}

/**
 * Regenerate a response from a specific message
 * Creates a new branch with a regenerated assistant response
 */
export async function regenerateResponse(
  request: { conversationId: string; messageId: string }
): Promise<BranchOperationResult> {
  try {
    const { conversationId, messageId } = request;

    // Get the message to regenerate from
    const { data: message, error: fetchError } = await db()
      .from('meta_messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to get message: ${fetchError.message}`);
    }

    // The message to regenerate from should be a user message
    // We'll create a new assistant response as a sibling to any existing responses
    const branchName = `regenerate-${Date.now()}`;

    // Deactivate the current assistant response (if it's the next message)
    const { data: nextMessages, error: nextError } = await db()
      .from('meta_messages')
      .select('id')
      .eq('parent_message_id', messageId)
      .eq('role', 'assistant')
      .eq('is_active_branch', true);

    if (!nextError && nextMessages && nextMessages.length > 0) {
      await db()
        .from('meta_messages')
        .update({ is_active_branch: false })
        .in('id', nextMessages.map((m: any) => m.id));
    }

    // Note: The actual regeneration would be done by the chat API
    // This function just sets up the branch structure
    // Return a placeholder that indicates regeneration is ready

    return {
      success: true,
      branchId: branchName,
      // The messageId will be filled in when the actual response is generated
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to prepare regeneration',
    };
  }
}

/**
 * Get conversation with all messages including branches
 */
export async function getConversationWithAllBranches(
  conversationId: string
): Promise<{
  conversation: Conversation;
  messages: Message[];
  branches: ConversationBranch[];
} | null> {
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

  // Get ALL messages (including inactive branches)
  const { data: messages, error: msgError } = await db()
    .from('meta_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (msgError) {
    throw new Error(`Failed to get messages: ${msgError.message}`);
  }

  // Get branch information
  const branches = await getBranchesForConversation(conversationId);

  return {
    conversation: conversation as Conversation,
    messages: (messages || []) as Message[],
    branches,
  };
}

/**
 * Delete a branch (and all its messages)
 * Cannot delete the 'main' branch
 */
export async function deleteBranch(
  conversationId: string,
  branchId: string
): Promise<BranchOperationResult> {
  if (branchId === 'main') {
    return {
      success: false,
      error: 'Cannot delete the main branch',
    };
  }

  try {
    const { error } = await db()
      .from('meta_messages')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('branch_name', branchId);

    if (error) {
      throw new Error(`Failed to delete branch: ${error.message}`);
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete branch',
    };
  }
}

/**
 * Rename a branch
 */
export async function renameBranch(
  conversationId: string,
  oldBranchId: string,
  newBranchId: string
): Promise<BranchOperationResult> {
  if (oldBranchId === 'main') {
    return {
      success: false,
      error: 'Cannot rename the main branch',
    };
  }

  try {
    const { error } = await db()
      .from('meta_messages')
      .update({ branch_name: newBranchId })
      .eq('conversation_id', conversationId)
      .eq('branch_name', oldBranchId);

    if (error) {
      throw new Error(`Failed to rename branch: ${error.message}`);
    }

    return {
      success: true,
      branchId: newBranchId,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to rename branch',
    };
  }
}
