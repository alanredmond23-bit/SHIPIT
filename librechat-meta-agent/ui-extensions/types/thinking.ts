/**
 * Extended Thinking Types for Claude's Thinking Display
 * Types for streaming thinking tokens and displaying thinking blocks
 */

/**
 * Represents a single thinking block from Claude's extended thinking
 */
export interface ThinkingBlock {
  id: string;
  content: string;
  timestamp: Date;
  tokenCount: number;
  durationMs: number;
  isStreaming: boolean;
}

/**
 * Usage statistics for extended thinking
 */
export interface ThinkingUsage {
  thinkingTokens: number;
  contentTokens: number;
  totalTokens: number;
  thinkingDurationMs: number;
}

/**
 * Props for the ThinkingPanel component
 */
export interface ThinkingPanelProps {
  /** Array of thinking blocks to display */
  thinkingBlocks: ThinkingBlock[];
  /** Whether thinking is currently streaming */
  isThinking: boolean;
  /** Start time for the thinking process (for timer display) */
  thinkingStartTime: Date | null;
  /** Current token count being streamed */
  currentTokenCount: number;
  /** Whether to show the panel expanded by default */
  defaultExpanded?: boolean;
  /** Maximum height before scrolling (CSS value) */
  maxHeight?: string;
  /** Callback when panel is toggled */
  onToggle?: (isExpanded: boolean) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for the ThinkingBlock component
 */
export interface ThinkingBlockProps {
  /** The thinking block to render */
  block: ThinkingBlock;
  /** Whether this is the currently streaming block */
  isStreaming?: boolean;
  /** Callback when copy button is clicked */
  onCopy?: (content: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * State for managing thinking display in chat
 */
export interface ThinkingState {
  isThinking: boolean;
  thinkingBlocks: ThinkingBlock[];
  currentThinkingContent: string;
  thinkingStartTime: Date | null;
  thinkingTokenCount: number;
  showThinking: boolean;
}

/**
 * Settings for thinking display preferences
 */
export interface ThinkingSettings {
  /** Always show thinking panel when present */
  alwaysShowThinking: boolean;
  /** Default expanded state for thinking panels */
  defaultExpanded: boolean;
  /** Auto-scroll to new thinking content */
  autoScroll: boolean;
  /** Maximum height for thinking panel (CSS value) */
  maxHeight: string;
}

/**
 * Extended thinking event from Claude API streaming
 */
export interface ThinkingStreamEvent {
  type: 'thinking_start' | 'thinking_delta' | 'thinking_stop';
  data?: {
    content?: string;
    tokenCount?: number;
    thinkingBlockId?: string;
  };
}

/**
 * Message with thinking content
 */
export interface MessageWithThinking {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: ThinkingBlock[];
  thinkingUsage?: ThinkingUsage;
  timestamp: Date;
  isStreaming?: boolean;
}
