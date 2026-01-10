// vitest import removed - Jest globals used
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock the API module
vi.mock('@/lib/api/conversations', () => ({
  listConversations: vi.fn(),
  getConversationWithMessages: vi.fn(),
  createConversation: vi.fn(),
  updateConversation: vi.fn(),
  deleteConversation: vi.fn(),
  archiveConversation: vi.fn(),
  pinConversation: vi.fn(),
  createMessage: vi.fn(),
  createConversationWithMessage: vi.fn(),
  generateTitleFromMessage: vi.fn((msg: string) => msg.slice(0, 30)),
  searchConversations: vi.fn(),
  exportConversationAsJson: vi.fn(),
  exportConversationAsMarkdown: vi.fn(),
  downloadConversationExport: vi.fn(),
}));

// Import after mocking
import {
  useConversationsList,
  useConversation,
  useCreateConversation,
  useUpdateConversation,
  useDeleteConversation,
  useArchiveConversation,
  usePinConversation,
  useChatPersistence,
  useConversationSearch,
} from '@/hooks/useConversations';

import * as api from '@/lib/api/conversations';

// Types for testing
interface MockConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  is_pinned: boolean;
  agent_type: string;
  model_used: string | null;
}

interface MockMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  metadata: Record<string, any> | null;
}

// Mock data
const mockConversations: MockConversation[] = [
  {
    id: 'conv-1',
    title: 'Test Conversation 1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_archived: false,
    is_pinned: false,
    agent_type: 'general',
    model_used: 'claude-opus-4-5',
  },
  {
    id: 'conv-2',
    title: 'Test Conversation 2',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    is_archived: false,
    is_pinned: true,
    agent_type: 'general',
    model_used: 'gpt-4',
  },
];

const mockMessages: MockMessage[] = [
  {
    id: 'msg-1',
    conversation_id: 'conv-1',
    role: 'user',
    content: 'Hello, AI!',
    created_at: '2024-01-01T00:00:00Z',
    metadata: null,
  },
  {
    id: 'msg-2',
    conversation_id: 'conv-1',
    role: 'assistant',
    content: 'Hello! How can I help you today?',
    created_at: '2024-01-01T00:00:01Z',
    metadata: { model: 'claude-opus-4-5' },
  },
];

// Wrapper for React Query
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useConversationsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.listConversations as any).mockResolvedValue(mockConversations);
  });

  it('should fetch conversations on mount', async () => {
    const { result } = renderHook(() => useConversationsList(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.conversations).toEqual(mockConversations);
    expect(api.listConversations).toHaveBeenCalledTimes(1);
  });

  it('should pass options to API', async () => {
    const options = { limit: 10, includeArchived: true, agentType: 'general' };

    renderHook(() => useConversationsList(options), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(api.listConversations).toHaveBeenCalledWith(options);
    });
  });

  it('should handle fetch error', async () => {
    const error = new Error('Failed to fetch');
    (api.listConversations as any).mockRejectedValue(error);

    const { result } = renderHook(() => useConversationsList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.code).toBe('FETCH_ERROR');
  });

  it('should not fetch when disabled', async () => {
    renderHook(() => useConversationsList({ enabled: false }), {
      wrapper: createWrapper(),
    });

    expect(api.listConversations).not.toHaveBeenCalled();
  });

  it('should provide invalidate function', async () => {
    const { result } = renderHook(() => useConversationsList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.invalidate).toBe('function');
  });
});

describe('useConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.getConversationWithMessages as any).mockResolvedValue({
      conversation: mockConversations[0],
      messages: mockMessages,
    });
  });

  it('should fetch conversation with messages', async () => {
    const { result } = renderHook(() => useConversation('conv-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.conversation).toEqual(mockConversations[0]);
    expect(result.current.messages).toEqual(mockMessages);
  });

  it('should not fetch when id is null', async () => {
    renderHook(() => useConversation(null), {
      wrapper: createWrapper(),
    });

    expect(api.getConversationWithMessages).not.toHaveBeenCalled();
  });

  it('should handle fetch error', async () => {
    (api.getConversationWithMessages as any).mockRejectedValue(new Error('Not found'));

    const { result } = renderHook(() => useConversation('conv-invalid'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.conversation).toBeNull();
    expect(result.current.messages).toEqual([]);
  });
});

describe('useConversationSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.searchConversations as any).mockResolvedValue(mockConversations);
  });

  it('should search conversations', async () => {
    const { result } = renderHook(() => useConversationSearch('test'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSearching).toBe(false);
    });

    expect(result.current.results).toEqual(mockConversations);
  });

  it('should not search with empty query', async () => {
    renderHook(() => useConversationSearch(''), {
      wrapper: createWrapper(),
    });

    expect(api.searchConversations).not.toHaveBeenCalled();
  });

  it('should not search with whitespace only', async () => {
    renderHook(() => useConversationSearch('   '), {
      wrapper: createWrapper(),
    });

    expect(api.searchConversations).not.toHaveBeenCalled();
  });
});

describe('useCreateConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.createConversation as any).mockResolvedValue(mockConversations[0]);
  });

  it('should create a conversation', async () => {
    const { result } = renderHook(() => useCreateConversation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        title: 'New Conversation',
        agent_type: 'general',
      });
    });

    expect(api.createConversation).toHaveBeenCalledWith({
      title: 'New Conversation',
      agent_type: 'general',
    });
  });
});

describe('useUpdateConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.updateConversation as any).mockResolvedValue(mockConversations[0]);
  });

  it('should update a conversation', async () => {
    const { result } = renderHook(() => useUpdateConversation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        id: 'conv-1',
        updates: { title: 'Updated Title' },
      });
    });

    expect(api.updateConversation).toHaveBeenCalledWith('conv-1', { title: 'Updated Title' });
  });
});

describe('useDeleteConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.deleteConversation as any).mockResolvedValue(undefined);
  });

  it('should delete a conversation', async () => {
    const { result } = renderHook(() => useDeleteConversation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync('conv-1');
    });

    expect(api.deleteConversation).toHaveBeenCalledWith('conv-1');
  });
});

describe('useArchiveConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.archiveConversation as any).mockResolvedValue({
      ...mockConversations[0],
      is_archived: true,
    });
  });

  it('should archive a conversation', async () => {
    const { result } = renderHook(() => useArchiveConversation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: 'conv-1', archive: true });
    });

    expect(api.archiveConversation).toHaveBeenCalledWith('conv-1', true);
  });

  it('should unarchive a conversation', async () => {
    (api.archiveConversation as any).mockResolvedValue({
      ...mockConversations[0],
      is_archived: false,
    });

    const { result } = renderHook(() => useArchiveConversation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: 'conv-1', archive: false });
    });

    expect(api.archiveConversation).toHaveBeenCalledWith('conv-1', false);
  });
});

describe('usePinConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.pinConversation as any).mockResolvedValue({
      ...mockConversations[0],
      is_pinned: true,
    });
  });

  it('should pin a conversation', async () => {
    const { result } = renderHook(() => usePinConversation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: 'conv-1', pin: true });
    });

    expect(api.pinConversation).toHaveBeenCalledWith('conv-1', true);
  });

  it('should unpin a conversation', async () => {
    (api.pinConversation as any).mockResolvedValue({
      ...mockConversations[0],
      is_pinned: false,
    });

    const { result } = renderHook(() => usePinConversation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: 'conv-1', pin: false });
    });

    expect(api.pinConversation).toHaveBeenCalledWith('conv-1', false);
  });
});

describe('useChatPersistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.listConversations as any).mockResolvedValue(mockConversations);
    (api.getConversationWithMessages as any).mockResolvedValue({
      conversation: mockConversations[0],
      messages: mockMessages,
    });
    (api.createConversation as any).mockResolvedValue(mockConversations[0]);
    (api.createMessage as any).mockImplementation((request: any) =>
      Promise.resolve({
        id: 'msg-new',
        conversation_id: request.conversation_id,
        role: request.role,
        content: request.content,
        created_at: new Date().toISOString(),
        metadata: request.metadata,
      })
    );
  });

  it('should initialize with empty state', async () => {
    const { result } = renderHook(() => useChatPersistence(), {
      wrapper: createWrapper(),
    });

    expect(result.current.currentConversationId).toBeNull();
    expect(result.current.messages).toEqual([]);
    expect(result.current.isInitialized).toBe(false);
  });

  it('should start new conversation', async () => {
    const { result } = renderHook(() => useChatPersistence(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.startNewConversation();
    });

    expect(result.current.currentConversationId).toBeNull();
    expect(result.current.isInitialized).toBe(true);
  });

  it('should load existing conversation', async () => {
    const { result } = renderHook(() => useChatPersistence(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.loadConversation('conv-1');
    });

    expect(result.current.currentConversationId).toBe('conv-1');
    expect(result.current.isInitialized).toBe(true);
  });

  it('should save user message and create conversation if needed', async () => {
    const { result } = renderHook(() => useChatPersistence({ modelId: 'claude-opus-4-5' }), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      const { conversationId, messageId } = await result.current.saveUserMessage('Hello!');
      expect(conversationId).toBe('conv-1');
      expect(messageId).toBe('msg-new');
    });

    expect(api.createConversation).toHaveBeenCalled();
    expect(api.createMessage).toHaveBeenCalled();
  });

  it('should save assistant message', async () => {
    const { result } = renderHook(() => useChatPersistence(), {
      wrapper: createWrapper(),
    });

    // First load a conversation
    await act(async () => {
      await result.current.loadConversation('conv-1');
    });

    await act(async () => {
      const messageId = await result.current.saveAssistantMessage('Response');
      expect(messageId).toBe('msg-new');
    });

    expect(api.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversation_id: 'conv-1',
        role: 'assistant',
        content: 'Response',
      })
    );
  });

  it('should return null when saving assistant message without conversation', async () => {
    const { result } = renderHook(() => useChatPersistence(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      const messageId = await result.current.saveAssistantMessage('Response');
      expect(messageId).toBeNull();
    });
  });

  it('should update conversation title', async () => {
    (api.updateConversation as any).mockResolvedValue({
      ...mockConversations[0],
      title: 'New Title',
    });

    const { result } = renderHook(() => useChatPersistence(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.loadConversation('conv-1');
    });

    await act(async () => {
      await result.current.updateTitle('New Title');
    });

    expect(api.updateConversation).toHaveBeenCalledWith('conv-1', { title: 'New Title' });
  });

  it('should delete current conversation', async () => {
    (api.deleteConversation as any).mockResolvedValue(undefined);

    const { result } = renderHook(() => useChatPersistence(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.loadConversation('conv-1');
    });

    await act(async () => {
      await result.current.deleteCurrentConversation();
    });

    expect(api.deleteConversation).toHaveBeenCalledWith('conv-1');
    expect(result.current.currentConversationId).toBeNull();
  });

  it('should archive and unarchive conversations', async () => {
    (api.archiveConversation as any).mockResolvedValue({
      ...mockConversations[0],
      is_archived: true,
    });

    const { result } = renderHook(() => useChatPersistence(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.archive('conv-1', true);
    });

    expect(api.archiveConversation).toHaveBeenCalledWith('conv-1', true);
  });

  it('should pin and unpin conversations', async () => {
    (api.pinConversation as any).mockResolvedValue({
      ...mockConversations[0],
      is_pinned: true,
    });

    const { result } = renderHook(() => useChatPersistence(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.pin('conv-1', true);
    });

    expect(api.pinConversation).toHaveBeenCalledWith('conv-1', true);
  });

  it('should convert database messages to ChatMessage format', async () => {
    const { result } = renderHook(() => useChatPersistence(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.loadConversation('conv-1');
    });

    await waitFor(() => {
      expect(result.current.messages.length).toBeGreaterThan(0);
    });

    const chatMessages = result.current.messages;
    expect(chatMessages[0]).toMatchObject({
      id: 'msg-1',
      role: 'user',
      content: 'Hello, AI!',
    });
  });
});
