/**
 * useConversations Hook
 * React Query hooks for managing conversations and messages
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import {
  listConversations,
  getConversationWithMessages,
  createConversation,
  updateConversation,
  deleteConversation,
  archiveConversation,
  pinConversation,
  createMessage,
  createConversationWithMessage,
  generateTitleFromMessage,
  searchConversations,
  exportConversationAsJson,
  exportConversationAsMarkdown,
  downloadConversationExport,
  type ExportFormat,
  type ExportedConversation,
} from '@/lib/api/conversations';
import type {
  Conversation,
  Message,
  ConversationListItem,
  ConversationWithMessages,
  CreateConversationRequest,
  UpdateConversationRequest,
  CreateMessageRequest,
  ChatMessage,
} from '@/types/conversations';

// Query keys
const QUERY_KEYS = {
  conversations: ['conversations'] as const,
  conversationsSearch: (search: string) => ['conversations', 'search', search] as const,
  conversation: (id: string) => ['conversation', id] as const,
  messages: (conversationId: string) => ['messages', conversationId] as const,
};

// Error types for better error handling
export interface ConversationError {
  code: string;
  message: string;
  details?: unknown;
}

// ============================================================================
// Conversation List Hook
// ============================================================================

interface UseConversationsListOptions {
  limit?: number;
  includeArchived?: boolean;
  agentType?: string;
  search?: string;
  enabled?: boolean;
}

export function useConversationsList(options: UseConversationsListOptions = {}) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...QUERY_KEYS.conversations, options],
    queryFn: () => listConversations(options),
    enabled: options.enabled !== false,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
  }, [queryClient]);

  // Format error for display
  const formattedError: ConversationError | null = query.error
    ? {
        code: 'FETCH_ERROR',
        message: query.error instanceof Error ? query.error.message : 'Failed to load conversations',
        details: query.error,
      }
    : null;

  return {
    ...query,
    conversations: query.data || [],
    error: formattedError,
    invalidate,
  };
}

// ============================================================================
// Conversation Search Hook
// ============================================================================

interface UseConversationSearchOptions {
  enabled?: boolean;
  limit?: number;
  includeArchived?: boolean;
}

export function useConversationSearch(
  searchQuery: string,
  options: UseConversationSearchOptions = {}
) {
  const query = useQuery({
    queryKey: QUERY_KEYS.conversationsSearch(searchQuery),
    queryFn: () => searchConversations(searchQuery, options),
    enabled: !!searchQuery.trim() && options.enabled !== false,
    staleTime: 60000, // 1 minute
  });

  return {
    ...query,
    results: query.data || [],
    isSearching: query.isLoading,
  };
}

// ============================================================================
// Single Conversation Hook
// ============================================================================

interface UseConversationOptions {
  enabled?: boolean;
}

export function useConversation(
  conversationId: string | null,
  options: UseConversationOptions = {}
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: conversationId ? QUERY_KEYS.conversation(conversationId) : ['conversation-null'],
    queryFn: () => conversationId ? getConversationWithMessages(conversationId) : null,
    enabled: !!conversationId && options.enabled !== false,
    staleTime: 10000, // 10 seconds
  });

  const invalidate = useCallback(() => {
    if (conversationId) {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversation(conversationId) });
    }
  }, [queryClient, conversationId]);

  return {
    ...query,
    conversation: query.data?.conversation || null,
    messages: query.data?.messages || [],
    invalidate,
  };
}

// ============================================================================
// Conversation Mutations
// ============================================================================

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateConversationRequest) => createConversation(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
    },
  });
}

export function useUpdateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateConversationRequest }) =>
      updateConversation(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversation(data.id) });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) => deleteConversation(conversationId),
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
      queryClient.removeQueries({ queryKey: QUERY_KEYS.conversation(conversationId) });
    },
  });
}

export function useArchiveConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, archive }: { id: string; archive: boolean }) =>
      archiveConversation(id, archive),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversation(data.id) });
    },
  });
}

export function usePinConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, pin }: { id: string; pin: boolean }) => pinConversation(id, pin),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversation(data.id) });
    },
  });
}

// ============================================================================
// Message Mutations
// ============================================================================

export function useCreateMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateMessageRequest) => createMessage(request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversation(data.conversation_id) });
    },
  });
}

// ============================================================================
// Combined Chat State Hook
// ============================================================================

interface UseChatPersistenceOptions {
  modelId?: string;
  agentType?: string;
}

export function useChatPersistence(options: UseChatPersistenceOptions = {}) {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const queryClient = useQueryClient();

  // List of conversations for sidebar
  const conversationsQuery = useConversationsList({
    limit: 50,
    agentType: options.agentType,
  });

  // Current conversation with messages
  const conversationQuery = useConversation(currentConversationId);

  // Mutations
  const createConversationMutation = useCreateConversation();
  const createMessageMutation = useCreateMessage();
  const updateConversationMutation = useUpdateConversation();
  const deleteConversationMutation = useDeleteConversation();
  const archiveMutation = useArchiveConversation();
  const pinMutation = usePinConversation();

  /**
   * Start a new conversation
   */
  const startNewConversation = useCallback(async () => {
    setCurrentConversationId(null);
    setIsInitialized(true);
    return null;
  }, []);

  /**
   * Load an existing conversation
   */
  const loadConversation = useCallback(async (conversationId: string) => {
    setCurrentConversationId(conversationId);
    setIsInitialized(true);
  }, []);

  /**
   * Save a user message (creates conversation if needed)
   */
  const saveUserMessage = useCallback(async (
    content: string,
    metadata?: Record<string, any>
  ): Promise<{ conversationId: string; messageId: string }> => {
    let conversationId = currentConversationId;

    // Create conversation if needed
    if (!conversationId) {
      const conversation = await createConversationMutation.mutateAsync({
        title: generateTitleFromMessage(content),
        model_used: options.modelId,
        agent_type: options.agentType || 'general',
      });
      conversationId = conversation.id;
      setCurrentConversationId(conversationId);
    }

    // Save the message
    const message = await createMessageMutation.mutateAsync({
      conversation_id: conversationId,
      role: 'user',
      content,
      metadata,
    });

    return { conversationId, messageId: message.id };
  }, [currentConversationId, options.modelId, options.agentType, createConversationMutation, createMessageMutation]);

  /**
   * Save an assistant message
   */
  const saveAssistantMessage = useCallback(async (
    content: string,
    metadata?: Record<string, any>
  ): Promise<string | null> => {
    if (!currentConversationId) {
      console.warn('Cannot save assistant message without a conversation');
      return null;
    }

    const message = await createMessageMutation.mutateAsync({
      conversation_id: currentConversationId,
      role: 'assistant',
      content,
      metadata: {
        ...metadata,
        model: options.modelId,
      },
    });

    return message.id;
  }, [currentConversationId, options.modelId, createMessageMutation]);

  /**
   * Update conversation title
   */
  const updateTitle = useCallback(async (title: string) => {
    if (!currentConversationId) return;

    await updateConversationMutation.mutateAsync({
      id: currentConversationId,
      updates: { title },
    });
  }, [currentConversationId, updateConversationMutation]);

  /**
   * Delete the current conversation
   */
  const deleteCurrentConversation = useCallback(async () => {
    if (!currentConversationId) return;

    await deleteConversationMutation.mutateAsync(currentConversationId);
    setCurrentConversationId(null);
  }, [currentConversationId, deleteConversationMutation]);

  /**
   * Archive/unarchive a conversation
   */
  const archive = useCallback(async (conversationId: string, shouldArchive: boolean = true) => {
    await archiveMutation.mutateAsync({ id: conversationId, archive: shouldArchive });
    if (conversationId === currentConversationId && shouldArchive) {
      setCurrentConversationId(null);
    }
  }, [archiveMutation, currentConversationId]);

  /**
   * Pin/unpin a conversation
   */
  const pin = useCallback(async (conversationId: string, shouldPin: boolean = true) => {
    await pinMutation.mutateAsync({ id: conversationId, pin: shouldPin });
  }, [pinMutation]);

  /**
   * Export conversation as JSON and trigger download
   */
  const exportAsJson = useCallback(async (conversationId?: string) => {
    const targetId = conversationId || currentConversationId;
    if (!targetId) {
      console.warn('No conversation to export');
      return;
    }

    try {
      const data = await exportConversationAsJson(targetId);
      downloadConversationExport(data, 'json', `conversation-${targetId}.json`);
    } catch (error) {
      console.error('Failed to export conversation as JSON:', error);
      throw error;
    }
  }, [currentConversationId]);

  /**
   * Export conversation as Markdown and trigger download
   */
  const exportAsMarkdown = useCallback(async (conversationId?: string) => {
    const targetId = conversationId || currentConversationId;
    if (!targetId) {
      console.warn('No conversation to export');
      return;
    }

    try {
      const markdown = await exportConversationAsMarkdown(targetId);
      downloadConversationExport(markdown, 'markdown', `conversation-${targetId}.md`);
    } catch (error) {
      console.error('Failed to export conversation as Markdown:', error);
      throw error;
    }
  }, [currentConversationId]);

  /**
   * Convert database messages to ChatMessage format
   */
  const chatMessages: ChatMessage[] = (conversationQuery.messages || []).map((msg) => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
    timestamp: new Date(msg.created_at),
    model: msg.metadata?.model as string | undefined,
    tools: msg.metadata?.tools as string[] | undefined,
    isStreaming: false,
  }));

  return {
    // State
    currentConversationId,
    currentConversation: conversationQuery.conversation,
    conversations: conversationsQuery.conversations,
    messages: chatMessages,
    isInitialized,

    // Loading states
    isLoadingConversations: conversationsQuery.isLoading,
    isLoadingMessages: conversationQuery.isLoading,
    isSaving: createMessageMutation.isPending || createConversationMutation.isPending,

    // Error states
    conversationsError: conversationsQuery.error,
    messagesError: conversationQuery.error,
    hasError: !!conversationsQuery.error || !!conversationQuery.error,

    // Actions
    startNewConversation,
    loadConversation,
    saveUserMessage,
    saveAssistantMessage,
    updateTitle,
    deleteCurrentConversation,
    deleteConversation: deleteConversationMutation.mutateAsync,
    archive,
    pin,

    // Export actions
    exportAsJson,
    exportAsMarkdown,

    // Refresh
    refreshConversations: conversationsQuery.invalidate,
    refreshCurrentConversation: conversationQuery.invalidate,
  };
}

// ============================================================================
// Export Hook for standalone use
// ============================================================================

export function useConversationExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportJson = useCallback(async (conversationId: string) => {
    setIsExporting(true);
    setExportError(null);
    try {
      const data = await exportConversationAsJson(conversationId);
      downloadConversationExport(data, 'json', `conversation-${conversationId}.json`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed';
      setExportError(message);
      throw error;
    } finally {
      setIsExporting(false);
    }
  }, []);

  const exportMarkdown = useCallback(async (conversationId: string) => {
    setIsExporting(true);
    setExportError(null);
    try {
      const markdown = await exportConversationAsMarkdown(conversationId);
      downloadConversationExport(markdown, 'markdown', `conversation-${conversationId}.md`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed';
      setExportError(message);
      throw error;
    } finally {
      setIsExporting(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setExportError(null);
  }, []);

  return {
    exportJson,
    exportMarkdown,
    isExporting,
    exportError,
    clearError,
  };
}

export default useChatPersistence;
