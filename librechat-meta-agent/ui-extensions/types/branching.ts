/**
 * Conversation Branching Types
 * Types for managing conversation branches and message editing
 */

/**
 * Represents a branch in a conversation tree
 */
export interface ConversationBranch {
  /** Unique identifier for the branch */
  id: string;
  /** Display name for the branch */
  name: string;
  /** ID of the parent message where this branch starts */
  parentMessageId: string;
  /** IDs of messages in this branch */
  messageIds: string[];
  /** Whether this is the currently active branch */
  isActive: boolean;
  /** When the branch was created */
  createdAt: Date;
  /** Optional description of why this branch was created */
  description?: string;
}

/**
 * Node in the conversation tree structure
 */
export interface BranchNode {
  /** Message ID */
  id: string;
  /** Parent message ID (null for root) */
  parentId: string | null;
  /** Child message IDs */
  childIds: string[];
  /** Branch this message belongs to */
  branchId: string;
  /** Depth in the tree */
  depth: number;
  /** Index among siblings */
  siblingIndex: number;
  /** Total number of siblings */
  siblingCount: number;
  /** Whether this node is on the active path */
  isOnActivePath: boolean;
}

/**
 * State for branch navigation
 */
export interface BranchNavigationState {
  /** Current branch path from root to current position */
  currentPath: string[];
  /** All available branches */
  branches: ConversationBranch[];
  /** Currently selected branch ID */
  activeBranchId: string | null;
  /** Message ID at current position */
  currentMessageId: string | null;
  /** Branch points (messages with multiple children) */
  branchPoints: BranchPoint[];
  /** Whether navigation controls are visible */
  isNavigating: boolean;
}

/**
 * A point where the conversation branches
 */
export interface BranchPoint {
  /** The parent message ID where branching occurs */
  messageId: string;
  /** IDs of all child branches */
  childBranchIds: string[];
  /** Index of the currently selected child */
  selectedIndex: number;
  /** Total number of branches at this point */
  totalBranches: number;
}

/**
 * Tree structure for the entire conversation
 */
export interface ConversationTree {
  /** Map of message ID to BranchNode */
  nodes: Map<string, BranchNode>;
  /** Root message IDs */
  rootIds: string[];
  /** All branches in the conversation */
  branches: ConversationBranch[];
  /** ID of the active branch */
  activeBranchId: string;
  /** Ordered list of message IDs on the active path */
  activePath: string[];
}

/**
 * Request to create a new branch
 */
export interface CreateBranchRequest {
  /** Conversation ID */
  conversationId: string;
  /** Parent message ID to branch from */
  parentMessageId: string;
  /** New message content (edited content) */
  content: string;
  /** Optional branch name */
  branchName?: string;
  /** Role of the message */
  role: 'user' | 'assistant';
}

/**
 * Request to switch to a different branch
 */
export interface SwitchBranchRequest {
  /** Conversation ID */
  conversationId: string;
  /** Target branch ID */
  branchId: string;
}

/**
 * Result of a branch operation
 */
export interface BranchOperationResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** New branch ID if created */
  branchId?: string;
  /** New message ID if created */
  messageId?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Options for editing a message
 */
export interface EditMessageOptions {
  /** Whether to create a new branch or edit in place */
  createBranch: boolean;
  /** Whether to regenerate the assistant response */
  regenerateResponse: boolean;
  /** Branch name for the new branch */
  branchName?: string;
}

/**
 * State for message editing UI
 */
export interface EditingState {
  /** ID of the message being edited */
  messageId: string | null;
  /** Original content before editing */
  originalContent: string;
  /** Current edited content */
  editedContent: string;
  /** Whether save is in progress */
  isSaving: boolean;
  /** Whether to show diff between original and edited */
  showDiff: boolean;
}

/**
 * Actions available for a message
 */
export interface MessageAction {
  /** Action identifier */
  id: string;
  /** Display label */
  label: string;
  /** Icon name (lucide-react) */
  icon: string;
  /** Whether this action is available */
  enabled: boolean;
  /** Action handler */
  handler: () => void;
  /** Keyboard shortcut */
  shortcut?: string;
  /** Danger level for styling */
  variant?: 'default' | 'danger' | 'success';
}

/**
 * Branch comparison for diff view
 */
export interface BranchComparison {
  /** First branch ID */
  branchAId: string;
  /** Second branch ID */
  branchBId: string;
  /** Messages unique to branch A */
  uniqueToA: string[];
  /** Messages unique to branch B */
  uniqueToB: string[];
  /** Common messages */
  common: string[];
  /** Divergence point message ID */
  divergencePoint: string;
}

/**
 * Visual representation of branch tree for rendering
 */
export interface BranchTreeVisual {
  /** All nodes with their visual positions */
  nodes: BranchNodeVisual[];
  /** Connections between nodes */
  connections: BranchConnection[];
  /** Total width of the tree */
  width: number;
  /** Total height of the tree */
  height: number;
}

/**
 * Visual node in the branch tree
 */
export interface BranchNodeVisual {
  /** Node ID */
  id: string;
  /** X position */
  x: number;
  /** Y position */
  y: number;
  /** Node label */
  label: string;
  /** Whether this is the active branch */
  isActive: boolean;
  /** Whether this is currently selected */
  isSelected: boolean;
  /** Number of messages in this branch segment */
  messageCount: number;
}

/**
 * Connection line between branch nodes
 */
export interface BranchConnection {
  /** Source node ID */
  from: string;
  /** Target node ID */
  to: string;
  /** Whether this is on the active path */
  isActive: boolean;
}
