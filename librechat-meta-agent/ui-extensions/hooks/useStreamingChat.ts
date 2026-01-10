/**
 * useStreamingChat - Production-grade SSE streaming hook with reconnection logic
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Connection status tracking (connected/reconnecting/disconnected/error)
 * - Token limit handling with graceful degradation
 * - Proper abort/cancel support
 * - Error boundaries for streaming failures
 * - Heartbeat detection for stale connections
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ChatMessage, ChatArtifact } from '@/types/conversations';

// ============================================================================
// Types
// ============================================================================

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'streaming'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

export interface StreamingError {
  code: string;
  message: string;
  retryable: boolean;
  details?: Record<string, any>;
}

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

export interface StreamingConfig {
  maxRetries?: number;
  baseRetryDelay?: number;
  maxRetryDelay?: number;
  connectionTimeout?: number;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
}

export interface StreamingMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamingRequest {
  messages: StreamingMessage[];
  model: string;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  system_prompt?: string;
  tools?: string[];
}

export interface StreamingResult {
  content: string;
  usage: TokenUsage | null;
  artifacts: ChatArtifact[];
  error: StreamingError | null;
  aborted: boolean;
}

// Thinking event types
export interface ThinkingStartEvent {
  blockId: string;
  timestamp: string;
}

export interface ThinkingChunkEvent {
  content: string;
  tokenCount: number;
  chunkIndex: number;
}

export interface ThinkingStopEvent {
  tokenCount: number;
  durationMs: number;
  totalThinkingContent: number;
}

export interface UseStreamingChatOptions {
  apiUrl?: string;
  config?: StreamingConfig;
  onContent?: (content: string, fullContent: string) => void;
  onUsage?: (usage: TokenUsage) => void;
  onArtifacts?: (artifacts: ChatArtifact[]) => void;
  onError?: (error: StreamingError) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
  onComplete?: (result: StreamingResult) => void;
  // Extended thinking callbacks
  onThinkingStart?: (event: ThinkingStartEvent) => void;
  onThinking?: (event: ThinkingChunkEvent, fullThinkingContent: string) => void;
  onThinkingStop?: (event: ThinkingStopEvent) => void;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: Required<StreamingConfig> = {
  maxRetries: 3,
  baseRetryDelay: 1000,
  maxRetryDelay: 10000,
  connectionTimeout: 30000,
  heartbeatInterval: 15000,
  heartbeatTimeout: 30000,
};

// ============================================================================
// Error Codes
// ============================================================================

const ERROR_CODES = {
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  STREAM_INTERRUPTED: 'STREAM_INTERRUPTED',
  TOKEN_LIMIT_EXCEEDED: 'TOKEN_LIMIT_EXCEEDED',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVER_ERROR: 'SERVER_ERROR',
  TIMEOUT: 'TIMEOUT',
  ABORTED: 'ABORTED',
  PARSE_ERROR: 'PARSE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN: 'UNKNOWN',
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

function isRetryableError(error: StreamingError): boolean {
  const retryableCodes = [
    ERROR_CODES.CONNECTION_FAILED,
    ERROR_CODES.STREAM_INTERRUPTED,
    ERROR_CODES.RATE_LIMITED,
    ERROR_CODES.TIMEOUT,
    ERROR_CODES.NETWORK_ERROR,
  ];
  return retryableCodes.includes(error.code as any);
}

function parseSSELine(line: string): { event?: string; data?: any } | null {
  if (!line.trim()) return null;

  if (line.startsWith('event: ')) {
    return { event: line.slice(7).trim() };
  }

  if (line.startsWith('data: ')) {
    const dataStr = line.slice(6);
    if (dataStr === '[DONE]') {
      return { event: 'done', data: null };
    }
    try {
      return { data: JSON.parse(dataStr) };
    } catch {
      return { data: dataStr };
    }
  }

  return null;
}

function createError(
  code: string,
  message: string,
  retryable: boolean = false,
  details?: Record<string, any>
): StreamingError {
  return { code, message, retryable, details };
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useStreamingChat(options: UseStreamingChatOptions = {}) {
  const {
    apiUrl = process.env.NEXT_PUBLIC_API_URL || '',
    config: userConfig,
    onContent,
    onUsage,
    onArtifacts,
    onError,
    onStatusChange,
    onComplete,
    onThinkingStart,
    onThinking,
    onThinkingStop,
  } = options;

  const config = { ...DEFAULT_CONFIG, ...userConfig };

  // State
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [error, setError] = useState<StreamingError | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentContent, setCurrentContent] = useState('');
  const [usage, setUsage] = useState<TokenUsage | null>(null);
  const [artifacts, setArtifacts] = useState<ChatArtifact[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  // Thinking state
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingContent, setThinkingContent] = useState('');

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const thinkingContentRef = useRef<string>('');

  // Update status and notify
  const updateStatus = useCallback((newStatus: ConnectionStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  // Clear timers
  const clearTimers = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  // Abort current stream
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    clearTimers();
    setIsStreaming(false);
    updateStatus('idle');
  }, [clearTimers, updateStatus]);

  // Reset state for new request
  const reset = useCallback(() => {
    abort();
    setError(null);
    setCurrentContent('');
    setUsage(null);
    setArtifacts([]);
    setRetryCount(0);
    // Reset thinking state
    setIsThinking(false);
    setThinkingContent('');
    thinkingContentRef.current = '';
  }, [abort]);

  // Start heartbeat monitoring
  const startHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
    }

    heartbeatTimerRef.current = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      if (timeSinceActivity > config.heartbeatTimeout) {
        console.warn('[useStreamingChat] Connection stale, no activity for', timeSinceActivity, 'ms');
        // Don't abort here, just log - the stream might still be working
      }
    }, config.heartbeatInterval);
  }, [config.heartbeatInterval, config.heartbeatTimeout]);

  // Calculate retry delay with exponential backoff
  const getRetryDelay = useCallback((attempt: number): number => {
    const delay = config.baseRetryDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 1000;
    return Math.min(delay + jitter, config.maxRetryDelay);
  }, [config.baseRetryDelay, config.maxRetryDelay]);

  // Main streaming function
  const streamChat = useCallback(async (
    request: StreamingRequest,
    resumeFromContent: string = ''
  ): Promise<StreamingResult> => {
    // Abort any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    // Reset state
    setError(null);
    let fullContent = resumeFromContent;
    setCurrentContent(fullContent);
    let finalUsage: TokenUsage | null = null;
    let finalArtifacts: ChatArtifact[] = [];
    let streamError: StreamingError | null = null;
    let wasAborted = false;
    // Reset thinking state
    thinkingContentRef.current = '';
    setThinkingContent('');
    setIsThinking(false);

    updateStatus('connecting');
    setIsStreaming(true);
    lastActivityRef.current = Date.now();

    try {
      // Create timeout for connection
      const timeoutId = setTimeout(() => {
        if (abortControllerRef.current && !signal.aborted) {
          abortControllerRef.current.abort();
          streamError = createError(
            ERROR_CODES.TIMEOUT,
            'Connection timeout - server took too long to respond',
            true
          );
        }
      }, config.connectionTimeout);

      const response = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          ...request,
          stream: true,
        }),
        signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unknown error');

        // Check for specific error types
        if (response.status === 429) {
          throw createError(
            ERROR_CODES.RATE_LIMITED,
            'Rate limit exceeded. Please wait before sending more messages.',
            true,
            { retryAfter: response.headers.get('Retry-After') }
          );
        }

        if (response.status === 413 || errorBody.includes('token')) {
          throw createError(
            ERROR_CODES.TOKEN_LIMIT_EXCEEDED,
            'The conversation is too long. Try starting a new conversation or removing some messages.',
            false,
            { status: response.status }
          );
        }

        if (response.status >= 500) {
          throw createError(
            ERROR_CODES.SERVER_ERROR,
            `Server error: ${response.status}`,
            true,
            { status: response.status, body: errorBody }
          );
        }

        throw createError(
          ERROR_CODES.CONNECTION_FAILED,
          `Failed to connect: ${response.status} - ${errorBody}`,
          response.status >= 500,
          { status: response.status }
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw createError(
          ERROR_CODES.CONNECTION_FAILED,
          'Response body is not readable',
          true
        );
      }

      updateStatus('connected');
      startHeartbeat();

      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';

      while (true) {
        if (signal.aborted) {
          wasAborted = true;
          break;
        }

        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        lastActivityRef.current = Date.now();
        updateStatus('streaming');

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const parsed = parseSSELine(line);
          if (!parsed) continue;

          if (parsed.event) {
            currentEvent = parsed.event;

            if (parsed.event === 'connected') {
              console.log('[useStreamingChat] SSE connected');
              continue;
            }

            if (parsed.event === 'done') {
              console.log('[useStreamingChat] Stream complete');
              continue;
            }

            if (parsed.event === 'error') {
              continue; // Error data will come in next line
            }

            if (parsed.event === 'aborted') {
              wasAborted = true;
              break;
            }

            // Thinking events
            if (parsed.event === 'thinking_start') {
              continue; // Data will come in next line
            }

            if (parsed.event === 'thinking') {
              continue; // Data will come in next line
            }

            if (parsed.event === 'thinking_stop') {
              continue; // Data will come in next line
            }
          }

          if (parsed.data !== undefined) {
            // Handle thinking events
            if (currentEvent === 'thinking_start') {
              setIsThinking(true);
              setThinkingContent('');
              onThinkingStart?.({
                blockId: parsed.data.blockId,
                timestamp: parsed.data.timestamp,
              });
              currentEvent = '';
              continue;
            }

            if (currentEvent === 'thinking') {
              const newContent = thinkingContentRef.current + (parsed.data.content || '');
              thinkingContentRef.current = newContent;
              setThinkingContent(newContent);
              onThinking?.(
                {
                  content: parsed.data.content || '',
                  tokenCount: parsed.data.tokenCount || 0,
                  chunkIndex: parsed.data.chunkIndex || 0,
                },
                newContent
              );
              currentEvent = '';
              continue;
            }

            if (currentEvent === 'thinking_stop') {
              setIsThinking(false);
              onThinkingStop?.({
                tokenCount: parsed.data.tokenCount || 0,
                durationMs: parsed.data.durationMs || 0,
                totalThinkingContent: parsed.data.totalThinkingContent || 0,
              });
              currentEvent = '';
              continue;
            }

            // Handle different event types
            if (currentEvent === 'error') {
              streamError = createError(
                ERROR_CODES.SERVER_ERROR,
                parsed.data.error || 'Server error during streaming',
                true,
                parsed.data
              );
              break;
            }

            if (currentEvent === 'usage' || parsed.data.input_tokens !== undefined) {
              finalUsage = {
                input_tokens: parsed.data.input_tokens || 0,
                output_tokens: parsed.data.output_tokens || 0,
                total_tokens: parsed.data.total_tokens ||
                  (parsed.data.input_tokens || 0) + (parsed.data.output_tokens || 0),
              };
              setUsage(finalUsage);
              onUsage?.(finalUsage);
              continue;
            }

            if (currentEvent === 'artifacts' || parsed.data.artifacts) {
              finalArtifacts = parsed.data.artifacts || [];
              setArtifacts(finalArtifacts);
              onArtifacts?.(finalArtifacts);
              continue;
            }

            // Content chunk
            if (parsed.data.content) {
              fullContent += parsed.data.content;
              setCurrentContent(fullContent);
              onContent?.(parsed.data.content, fullContent);
            }

            // Artifact inline
            if (parsed.data.artifact) {
              finalArtifacts = [...finalArtifacts, parsed.data.artifact];
              setArtifacts(finalArtifacts);
              onArtifacts?.(finalArtifacts);
            }

            currentEvent = ''; // Reset after processing data
          }
        }

        if (streamError || wasAborted) break;
      }

      reader.releaseLock();

    } catch (err: any) {
      if (err.name === 'AbortError' || signal.aborted) {
        wasAborted = true;
        streamError = createError(
          ERROR_CODES.ABORTED,
          'Request was cancelled',
          false
        );
      } else if (err.code && err.message) {
        // Already a StreamingError
        streamError = err;
      } else if (err.message?.includes('fetch')) {
        streamError = createError(
          ERROR_CODES.NETWORK_ERROR,
          'Network error - check your internet connection',
          true,
          { originalError: err.message }
        );
      } else {
        streamError = createError(
          ERROR_CODES.UNKNOWN,
          err.message || 'An unexpected error occurred',
          false,
          { originalError: err.message }
        );
      }
    } finally {
      clearTimers();
      setIsStreaming(false);

      if (streamError) {
        setError(streamError);
        onError?.(streamError);
        updateStatus('error');
      } else if (wasAborted) {
        updateStatus('idle');
      } else {
        updateStatus('idle');
      }
    }

    const result: StreamingResult = {
      content: fullContent,
      usage: finalUsage,
      artifacts: finalArtifacts,
      error: streamError,
      aborted: wasAborted,
    };

    onComplete?.(result);
    return result;
  }, [
    apiUrl,
    config.connectionTimeout,
    updateStatus,
    startHeartbeat,
    clearTimers,
    onContent,
    onUsage,
    onArtifacts,
    onError,
    onComplete,
    onThinkingStart,
    onThinking,
    onThinkingStop,
  ]);

  // Stream with automatic retry
  const streamWithRetry = useCallback(async (
    request: StreamingRequest
  ): Promise<StreamingResult> => {
    let lastResult: StreamingResult | null = null;
    let attempts = 0;

    while (attempts <= config.maxRetries) {
      const result = await streamChat(
        request,
        lastResult?.content || ''
      );

      if (!result.error || !isRetryableError(result.error) || result.aborted) {
        return result;
      }

      lastResult = result;
      attempts++;
      setRetryCount(attempts);

      if (attempts <= config.maxRetries) {
        const delay = getRetryDelay(attempts);
        console.log(`[useStreamingChat] Retrying in ${delay}ms (attempt ${attempts}/${config.maxRetries})`);
        updateStatus('reconnecting');

        await new Promise<void>((resolve) => {
          reconnectTimerRef.current = setTimeout(resolve, delay);
        });

        // Check if aborted during wait
        if (abortControllerRef.current?.signal.aborted) {
          return {
            content: lastResult.content,
            usage: lastResult.usage,
            artifacts: lastResult.artifacts,
            error: createError(ERROR_CODES.ABORTED, 'Retry cancelled', false),
            aborted: true,
          };
        }
      }
    }

    // All retries exhausted
    return lastResult || {
      content: '',
      usage: null,
      artifacts: [],
      error: createError(
        ERROR_CODES.CONNECTION_FAILED,
        `Failed after ${config.maxRetries} retry attempts`,
        false
      ),
      aborted: false,
    };
  }, [config.maxRetries, streamChat, getRetryDelay, updateStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abort();
    };
  }, [abort]);

  return {
    // State
    status,
    error,
    isStreaming,
    currentContent,
    usage,
    artifacts,
    retryCount,
    // Thinking state
    isThinking,
    thinkingContent,

    // Actions
    streamChat: streamWithRetry,
    abort,
    reset,

    // Direct stream (no retry)
    streamChatDirect: streamChat,
  };
}

// ============================================================================
// Connection Status Component Helper
// ============================================================================

export function getStatusDisplay(status: ConnectionStatus): {
  text: string;
  color: string;
  pulse: boolean;
} {
  switch (status) {
    case 'idle':
      return { text: 'Ready', color: 'text-stone-400', pulse: false };
    case 'connecting':
      return { text: 'Connecting...', color: 'text-blue-400', pulse: true };
    case 'connected':
      return { text: 'Connected', color: 'text-green-400', pulse: false };
    case 'streaming':
      return { text: 'Streaming', color: 'text-teal-400', pulse: true };
    case 'reconnecting':
      return { text: 'Reconnecting...', color: 'text-amber-400', pulse: true };
    case 'disconnected':
      return { text: 'Disconnected', color: 'text-stone-500', pulse: false };
    case 'error':
      return { text: 'Error', color: 'text-red-400', pulse: false };
    default:
      return { text: 'Unknown', color: 'text-stone-400', pulse: false };
  }
}

export default useStreamingChat;
