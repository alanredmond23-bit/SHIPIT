/**
 * useBranching Hook
 * Manages conversation branching state and operations
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import type { Message } from '@/types/conversations';
import type {
  ConversationBranch,
  BranchNode,
  BranchNavigationState,
  BranchPoint,
  ConversationTree,
  CreateBranchRequest,
  EditingState,
  BranchOperationResult,
} from '@/types/branching';
import {
  createBranchFromEdit,
  switchBranch,
  getBranchesForConversation,
  regenerateResponse,
  getMessagesForBranch,
} from '@/lib/api/conversations';

// ============================================================================
// Hook Types
// ============================================================================

interface UseBranchingOptions {
  conversationId: string | null;
  messages: Message[];
  onBranchSwitch?: (branchId: string) => void;
  onMessageCreated?: (messageId: string) => void;
  onError?: (error: Error) => void;
}

interface UseBranchingReturn {
  // State
  tree: ConversationTree | null;
  navigationState: BranchNavigationState;
  editingState: EditingState;
  isLoading: boolean;
  error: Error | null;

  // Branch Navigation
  navigateToBranch: (branchId: string) => Promise<void>;
  navigateToNextBranch: (messageId: string) => void;
  navigateToPreviousBranch: (messageId: string) => void;
  getBranchPointsForMessage: (messageId: string) => BranchPoint | null;

  // Editing
  startEditing: (messageId: string, content: string) => void;
  updateEditContent: (content: string) => void;
  cancelEditing: () => void;
  saveEdit: (createNewBranch: boolean) => Promise<BranchOperationResult>;
  toggleDiffView: () => void;

  // Branch Operations
  createBranch: (request: CreateBranchRequest) => Promise<BranchOperationResult>;
  regenerateFromMessage: (messageId: string) => Promise<BranchOperationResult>;

  // Tree Utilities
  getNodeForMessage: (messageId: string) => BranchNode | null;
  getSiblingsForMessage: (messageId: string) => string[];
  getCurrentBranchMessages: () => Message[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build a conversation tree from messages
 */
function buildConversationTree(messages: Message[]): ConversationTree {
  const nodes = new Map<string, BranchNode>();
  const rootIds: string[] = [];
  const branchesMap = new Map<string, ConversationBranch>();

  // First pass: create nodes
  messages.forEach((msg, index) => {
    const branchId = msg.branch_name || 'main';

    // Track branches
    if (!branchesMap.has(branchId)) {
      branchesMap.set(branchId, {
        id: branchId,
        name: branchId === 'main' ? 'Main' : branchId,
        parentMessageId: msg.parent_message_id || '',
        messageIds: [],
        isActive: msg.is_active_branch,
        createdAt: new Date(msg.created_at),
      });
    }
    branchesMap.get(branchId)!.messageIds.push(msg.id);

    nodes.set(msg.id, {
      id: msg.id,
      parentId: msg.parent_message_id,
      childIds: [],
      branchId,
      depth: 0,
      siblingIndex: 0,
      siblingCount: 1,
      isOnActivePath: msg.is_active_branch,
    });

    if (!msg.parent_message_id) {
      rootIds.push(msg.id);
    }
  });

  // Second pass: build parent-child relationships
  messages.forEach((msg) => {
    if (msg.parent_message_id && nodes.has(msg.parent_message_id)) {
      const parentNode = nodes.get(msg.parent_message_id)!;
      parentNode.childIds.push(msg.id);
    }
  });

  // Third pass: calculate depths and sibling info
  function calculateDepth(nodeId: string, depth: number): void {
    const node = nodes.get(nodeId);
    if (!node) return;

    node.depth = depth;
    node.childIds.forEach((childId, index) => {
      const childNode = nodes.get(childId);
      if (childNode) {
        childNode.siblingIndex = index;
        childNode.siblingCount = node.childIds.length;
      }
      calculateDepth(childId, depth + 1);
    });
  }

  rootIds.forEach((rootId, index) => {
    const node = nodes.get(rootId);
    if (node) {
      node.siblingIndex = index;
      node.siblingCount = rootIds.length;
    }
    calculateDepth(rootId, 0);
  });

  // Build active path
  const activePath: string[] = [];
  const activeMessages = messages.filter((m) => m.is_active_branch);
  activeMessages.forEach((msg) => activePath.push(msg.id));

  // Determine active branch
  const activeBranchId = activeMessages.length > 0
    ? (activeMessages[0].branch_name || 'main')
    : 'main';

  return {
    nodes,
    rootIds,
    branches: Array.from(branchesMap.values()),
    activeBranchId,
    activePath,
  };
}

/**
 * Find branch points (messages with multiple children)
 */
function findBranchPoints(tree: ConversationTree): BranchPoint[] {
  const branchPoints: BranchPoint[] = [];

  tree.nodes.forEach((node, messageId) => {
    if (node.childIds.length > 1) {
      // Find which child is on the active path
      const selectedIndex = node.childIds.findIndex((childId) => {
        const childNode = tree.nodes.get(childId);
        return childNode?.isOnActivePath;
      });

      branchPoints.push({
        messageId,
        childBranchIds: node.childIds,
        selectedIndex: selectedIndex >= 0 ? selectedIndex : 0,
        totalBranches: node.childIds.length,
      });
    }
  });

  return branchPoints;
}

// ============================================================================
// Main Hook
// ============================================================================

export function useBranching(options: UseBranchingOptions): UseBranchingReturn {
  const { conversationId, messages, onBranchSwitch, onMessageCreated, onError } = options;
  const queryClient = useQueryClient();

  // ============================================================================
  // State
  // ============================================================================

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [navigationState, setNavigationState] = useState<BranchNavigationState>({
    currentPath: [],
    branches: [],
    activeBranchId: null,
    currentMessageId: null,
    branchPoints: [],
    isNavigating: false,
  });

  const [editingState, setEditingState] = useState<EditingState>({
    messageId: null,
    originalContent: '',
    editedContent: '',
    isSaving: false,
    showDiff: false,
  });

  // ============================================================================
  // Computed State
  // ============================================================================

  const tree = useMemo<ConversationTree | null>(() => {
    if (!messages || messages.length === 0) return null;
    return buildConversationTree(messages);
  }, [messages]);

  // Update navigation state when tree changes
  useEffect(() => {
    if (tree) {
      const branchPoints = findBranchPoints(tree);
      setNavigationState((prev) => ({
        ...prev,
        branches: tree.branches,
        activeBranchId: tree.activeBranchId,
        currentPath: tree.activePath,
        branchPoints,
      }));
    }
  }, [tree]);

  // ============================================================================
  // Mutations
  // ============================================================================

  const createBranchMutation = useMutation({
    mutationFn: createBranchFromEdit,
    onSuccess: (result) => {
      if (result.messageId && onMessageCreated) {
        onMessageCreated(result.messageId);
      }
      // Invalidate conversation queries
      if (conversationId) {
        queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      }
    },
    onError: (err: Error) => {
      setError(err);
      onError?.(err);
    },
  });

  const switchBranchMutation = useMutation({
    mutationFn: switchBranch,
    onSuccess: (_, variables) => {
      onBranchSwitch?.(variables.branchId);
      if (conversationId) {
        queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      }
    },
    onError: (err: Error) => {
      setError(err);
      onError?.(err);
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: regenerateResponse,
    onSuccess: (result) => {
      if (result.messageId && onMessageCreated) {
        onMessageCreated(result.messageId);
      }
      if (conversationId) {
        queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      }
    },
    onError: (err: Error) => {
      setError(err);
      onError?.(err);
    },
  });

  // ============================================================================
  // Branch Navigation
  // ============================================================================

  const navigateToBranch = useCallback(async (branchId: string) => {
    if (!conversationId) return;

    setNavigationState((prev) => ({ ...prev, isNavigating: true }));

    try {
      await switchBranchMutation.mutateAsync({
        conversationId,
        branchId,
      });

      setNavigationState((prev) => ({
        ...prev,
        activeBranchId: branchId,
        isNavigating: false,
      }));
    } catch (err) {
      setNavigationState((prev) => ({ ...prev, isNavigating: false }));
      throw err;
    }
  }, [conversationId, switchBranchMutation]);

  const navigateToNextBranch = useCallback((messageId: string) => {
    const branchPoint = navigationState.branchPoints.find(
      (bp) => bp.messageId === messageId
    );

    if (!branchPoint) return;

    const nextIndex = (branchPoint.selectedIndex + 1) % branchPoint.totalBranches;
    const nextBranchId = branchPoint.childBranchIds[nextIndex];

    navigateToBranch(nextBranchId);
  }, [navigationState.branchPoints, navigateToBranch]);

  const navigateToPreviousBranch = useCallback((messageId: string) => {
    const branchPoint = navigationState.branchPoints.find(
      (bp) => bp.messageId === messageId
    );

    if (!branchPoint) return;

    const prevIndex = branchPoint.selectedIndex === 0
      ? branchPoint.totalBranches - 1
      : branchPoint.selectedIndex - 1;
    const prevBranchId = branchPoint.childBranchIds[prevIndex];

    navigateToBranch(prevBranchId);
  }, [navigationState.branchPoints, navigateToBranch]);

  const getBranchPointsForMessage = useCallback((messageId: string): BranchPoint | null => {
    return navigationState.branchPoints.find((bp) => bp.messageId === messageId) || null;
  }, [navigationState.branchPoints]);

  // ============================================================================
  // Editing
  // ============================================================================

  const startEditing = useCallback((messageId: string, content: string) => {
    setEditingState({
      messageId,
      originalContent: content,
      editedContent: content,
      isSaving: false,
      showDiff: false,
    });
  }, []);

  const updateEditContent = useCallback((content: string) => {
    setEditingState((prev) => ({
      ...prev,
      editedContent: content,
    }));
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingState({
      messageId: null,
      originalContent: '',
      editedContent: '',
      isSaving: false,
      showDiff: false,
    });
  }, []);

  const saveEdit = useCallback(async (createNewBranch: boolean): Promise<BranchOperationResult> => {
    if (!editingState.messageId || !conversationId) {
      return { success: false, error: 'No message being edited' };
    }

    // Find the message being edited
    const message = messages.find((m) => m.id === editingState.messageId);
    if (!message) {
      return { success: false, error: 'Message not found' };
    }

    setEditingState((prev) => ({ ...prev, isSaving: true }));

    try {
      if (createNewBranch) {
        // Create a new branch with the edited content
        const result = await createBranchMutation.mutateAsync({
          conversationId,
          parentMessageId: message.parent_message_id || message.id,
          content: editingState.editedContent,
          role: message.role as 'user' | 'assistant',
          branchName: `edit-${Date.now()}`,
        });

        cancelEditing();
        return result;
      } else {
        // In-place edit (less common, may not be supported)
        // For now, always create a branch
        const result = await createBranchMutation.mutateAsync({
          conversationId,
          parentMessageId: message.parent_message_id || message.id,
          content: editingState.editedContent,
          role: message.role as 'user' | 'assistant',
        });

        cancelEditing();
        return result;
      }
    } catch (err) {
      setEditingState((prev) => ({ ...prev, isSaving: false }));
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to save edit'
      };
    }
  }, [editingState, conversationId, messages, createBranchMutation, cancelEditing]);

  const toggleDiffView = useCallback(() => {
    setEditingState((prev) => ({
      ...prev,
      showDiff: !prev.showDiff,
    }));
  }, []);

  // ============================================================================
  // Branch Operations
  // ============================================================================

  const createBranch = useCallback(async (request: CreateBranchRequest): Promise<BranchOperationResult> => {
    try {
      return await createBranchMutation.mutateAsync(request);
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create branch'
      };
    }
  }, [createBranchMutation]);

  const regenerateFromMessage = useCallback(async (messageId: string): Promise<BranchOperationResult> => {
    if (!conversationId) {
      return { success: false, error: 'No conversation selected' };
    }

    try {
      return await regenerateMutation.mutateAsync({
        conversationId,
        messageId,
      });
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to regenerate response'
      };
    }
  }, [conversationId, regenerateMutation]);

  // ============================================================================
  // Tree Utilities
  // ============================================================================

  const getNodeForMessage = useCallback((messageId: string): BranchNode | null => {
    return tree?.nodes.get(messageId) || null;
  }, [tree]);

  const getSiblingsForMessage = useCallback((messageId: string): string[] => {
    const node = tree?.nodes.get(messageId);
    if (!node || !node.parentId) return [];

    const parentNode = tree?.nodes.get(node.parentId);
    return parentNode?.childIds || [];
  }, [tree]);

  const getCurrentBranchMessages = useCallback((): Message[] => {
    if (!tree) return [];

    return messages.filter((msg) => tree.activePath.includes(msg.id));
  }, [tree, messages]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    tree,
    navigationState,
    editingState,
    isLoading: isLoading || createBranchMutation.isPending || switchBranchMutation.isPending,
    error,

    // Branch Navigation
    navigateToBranch,
    navigateToNextBranch,
    navigateToPreviousBranch,
    getBranchPointsForMessage,

    // Editing
    startEditing,
    updateEditContent,
    cancelEditing,
    saveEdit,
    toggleDiffView,

    // Branch Operations
    createBranch,
    regenerateFromMessage,

    // Tree Utilities
    getNodeForMessage,
    getSiblingsForMessage,
    getCurrentBranchMessages,
  };
}

export default useBranching;
