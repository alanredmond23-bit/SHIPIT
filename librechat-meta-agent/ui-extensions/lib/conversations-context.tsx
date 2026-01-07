'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
  model?: string;
  tokens_used?: number;
  isStreaming?: boolean;
  metadata?: Record<string, unknown>;
}

export interface Conversation {
  id: string;
  title: string;
  summary?: string;
  agent_type: string;
  model_used?: string;
  message_count: number;
  total_tokens: number;
  is_archived: boolean;
  is_pinned: boolean;
  messages: Message[];
  preview?: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationListItem {
  id: string;
  title: string;
  agent_type: string;
  message_count: number;
  is_archived: boolean;
  is_pinned: boolean;
  preview?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// CONTEXT TYPE
// ============================================================================

interface ConversationsContextType {
  // Current conversation
  currentConversation: Conversation | null;
  messages: Message[];

  // Conversation list
  conversations: ConversationListItem[];
  isLoadingList: boolean;

  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Actions
  createConversation: (agentType?: string) => Promise<string>;
  loadConversation: (id: string) => Promise<void>;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => Promise<Message>;
  updateMessage: (id: string, content: string) => void;
  deleteConversation: (id: string) => Promise<void>;

  // Metadata updates
  updateTitle: (title: string) => Promise<void>;
  togglePin: () => Promise<void>;
  archiveConversation: () => Promise<void>;

  // List management
  refreshList: () => Promise<void>;
  clearCurrentConversation: () => void;

  // Export
  exportConversation: (format: 'json' | 'markdown' | 'txt') => string;
}

const ConversationsContext = createContext<ConversationsContextType | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

interface ConversationsProviderProps {
  children: ReactNode;
}

export function ConversationsProvider({ children }: ConversationsProviderProps) {
  // State
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-save debounce ref
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // ========================================================================
  // API CALLS
  // ========================================================================

  const refreshList = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const response = await fetch('/api/conversations');
      if (!response.ok) throw new Error('Failed to fetch conversations');
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/conversations?id=${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Conversation not found');
        }
        throw new Error('Failed to load conversation');
      }
      const data = await response.json();
      setCurrentConversation(data.conversation);
      setMessages(data.conversation.messages || []);
    } catch (err) {
      console.error('Error loading conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createConversation = useCallback(async (agentType: string = 'general'): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_type: agentType }),
      });
      if (!response.ok) throw new Error('Failed to create conversation');
      const data = await response.json();
      setCurrentConversation(data.conversation);
      setMessages([]);
      // Refresh list to include new conversation
      await refreshList();
      return data.conversation.id;
    } catch (err) {
      console.error('Error creating conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to create conversation');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshList]);

  const addMessage = useCallback(async (message: Omit<Message, 'id' | 'timestamp'>): Promise<Message> => {
    // If no current conversation, create one first
    let conversationId = currentConversation?.id;
    if (!conversationId) {
      conversationId = await createConversation();
    }

    // Optimistically add message to local state
    const optimisticMessage: Message = {
      ...message,
      id: `temp_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMessage]);

    // Save to backend
    setIsSaving(true);
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          message: {
            role: message.role,
            content: message.content,
            model: message.model,
            tokens_used: message.tokens_used,
            metadata: message.metadata,
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to save message');
      const data = await response.json();

      // Update with real message ID
      const savedMessage: Message = {
        ...optimisticMessage,
        id: data.message_id,
      };

      setMessages(prev =>
        prev.map(m => m.id === optimisticMessage.id ? savedMessage : m)
      );

      // Update current conversation
      if (currentConversation) {
        setCurrentConversation(prev => prev ? {
          ...prev,
          message_count: prev.message_count + 1,
          updated_at: new Date().toISOString(),
        } : null);
      }

      return savedMessage;
    } catch (err) {
      // Revert on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      console.error('Error saving message:', err);
      setError(err instanceof Error ? err.message : 'Failed to save message');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [currentConversation, createConversation]);

  const updateMessage = useCallback((id: string, content: string) => {
    setMessages(prev =>
      prev.map(m => m.id === id ? { ...m, content } : m)
    );
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/conversations?id=${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete conversation');

      // Clear current if it's the deleted one
      if (currentConversation?.id === id) {
        setCurrentConversation(null);
        setMessages([]);
      }

      // Remove from list
      setConversations(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete conversation');
      throw err;
    }
  }, [currentConversation]);

  // ========================================================================
  // METADATA UPDATES
  // ========================================================================

  const updateTitle = useCallback(async (title: string) => {
    if (!currentConversation) return;

    try {
      const response = await fetch('/api/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: currentConversation.id,
          title,
        }),
      });
      if (!response.ok) throw new Error('Failed to update title');

      setCurrentConversation(prev => prev ? { ...prev, title } : null);
      setConversations(prev =>
        prev.map(c => c.id === currentConversation.id ? { ...c, title } : c)
      );
    } catch (err) {
      console.error('Error updating title:', err);
      throw err;
    }
  }, [currentConversation]);

  const togglePin = useCallback(async () => {
    if (!currentConversation) return;

    const newPinned = !currentConversation.is_pinned;
    try {
      const response = await fetch('/api/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: currentConversation.id,
          is_pinned: newPinned,
        }),
      });
      if (!response.ok) throw new Error('Failed to toggle pin');

      setCurrentConversation(prev => prev ? { ...prev, is_pinned: newPinned } : null);
      await refreshList(); // Re-sort list
    } catch (err) {
      console.error('Error toggling pin:', err);
      throw err;
    }
  }, [currentConversation, refreshList]);

  const archiveConversation = useCallback(async () => {
    if (!currentConversation) return;

    try {
      const response = await fetch('/api/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: currentConversation.id,
          is_archived: true,
        }),
      });
      if (!response.ok) throw new Error('Failed to archive conversation');

      setCurrentConversation(null);
      setMessages([]);
      await refreshList();
    } catch (err) {
      console.error('Error archiving conversation:', err);
      throw err;
    }
  }, [currentConversation, refreshList]);

  const clearCurrentConversation = useCallback(() => {
    setCurrentConversation(null);
    setMessages([]);
    setError(null);
  }, []);

  // ========================================================================
  // EXPORT
  // ========================================================================

  const exportConversation = useCallback((format: 'json' | 'markdown' | 'txt'): string => {
    if (!currentConversation) return '';

    switch (format) {
      case 'json':
        return JSON.stringify({
          ...currentConversation,
          exported_at: new Date().toISOString(),
        }, null, 2);

      case 'markdown':
        let md = `# ${currentConversation.title}\n\n`;
        md += `*Exported: ${new Date().toLocaleString()}*\n\n`;
        md += `---\n\n`;
        messages.forEach(m => {
          const role = m.role === 'user' ? '**You**' : '**Assistant**';
          md += `${role}:\n\n${m.content}\n\n---\n\n`;
        });
        return md;

      case 'txt':
        let txt = `${currentConversation.title}\n`;
        txt += `${'='.repeat(currentConversation.title.length)}\n\n`;
        messages.forEach(m => {
          const role = m.role === 'user' ? 'You' : 'Assistant';
          txt += `[${role}]:\n${m.content}\n\n`;
        });
        return txt;

      default:
        return '';
    }
  }, [currentConversation, messages]);

  // ========================================================================
  // EFFECTS
  // ========================================================================

  // Load conversation list on mount
  useEffect(() => {
    refreshList();
  }, [refreshList]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // ========================================================================
  // CONTEXT VALUE
  // ========================================================================

  const value: ConversationsContextType = {
    currentConversation,
    messages,
    conversations,
    isLoading,
    isLoadingList,
    isSaving,
    error,
    createConversation,
    loadConversation,
    addMessage,
    updateMessage,
    deleteConversation,
    updateTitle,
    togglePin,
    archiveConversation,
    refreshList,
    clearCurrentConversation,
    exportConversation,
  };

  return (
    <ConversationsContext.Provider value={value}>
      {children}
    </ConversationsContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useConversations(): ConversationsContextType {
  const context = useContext(ConversationsContext);
  if (!context) {
    throw new Error('useConversations must be used within ConversationsProvider');
  }
  return context;
}

export default ConversationsProvider;
