/**
 * Joanna AI Assistant - API Client Library
 *
 * This module provides a comprehensive, type-safe wrapper for all Edge Functions
 * with built-in error handling, retry logic, and request/response validation.
 *
 * @module lib/api/client
 * @example
 * ```typescript
 * import { JoannaClient } from '@/lib/api/client';
 *
 * const client = new JoannaClient({
 *   supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
 *   supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
 *   authToken: session.access_token,
 * });
 *
 * // Prioritize a task
 * const result = await client.tasks.prioritize('task-id');
 *
 * // Start a workflow
 * const instance = await client.workflows.start('workflow-id', { userId: 'user-123' });
 *
 * // Chat with AI
 * const response = await client.ai.chat('Help me organize my tasks');
 * ```
 */

// ============================================
// Type Definitions
// ============================================

/**
 * Configuration options for the Joanna API client
 */
export interface JoannaClientConfig {
  /** Supabase project URL */
  supabaseUrl: string;
  /** Supabase anonymous key */
  supabaseAnonKey: string;
  /** User authentication token (JWT) */
  authToken?: string;
  /** Custom timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Number of retry attempts for failed requests (default: 3) */
  maxRetries?: number;
  /** Base delay for exponential backoff in ms (default: 1000) */
  retryDelay?: number;
  /** Enable debug logging (default: false) */
  debug?: boolean;
}

/**
 * Standard API error response
 */
export interface ApiError {
  error: string;
  details?: any;
  code?: string;
  statusCode?: number;
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  success: boolean;
}

// ============================================
// Task Processor Types
// ============================================

/**
 * Request to prioritize a task
 */
export interface PrioritizeTaskRequest {
  action: 'prioritize';
  taskId: string;
}

/**
 * Response from task prioritization
 */
export interface PrioritizeTaskResponse {
  taskId: string;
  currentPriority: number;
  suggestedPriority: number;
  reasoning: string;
}

/**
 * Request to suggest task breakdown
 */
export interface SuggestBreakdownRequest {
  action: 'suggest_breakdown';
  taskTitle: string;
  taskDescription: string;
}

/**
 * Suggested subtask
 */
export interface SubtaskSuggestion {
  title: string;
  priority: number;
  description?: string;
}

/**
 * Response from task breakdown suggestion
 */
export interface SuggestBreakdownResponse {
  suggestions: SubtaskSuggestion[];
}

/**
 * Request to detect task dependencies
 */
export interface DetectDependenciesRequest {
  action: 'detect_dependencies';
  taskId: string;
}

/**
 * Potential task dependency
 */
export interface TaskDependency {
  taskId: string;
  title: string;
  confidence: number;
}

/**
 * Response from dependency detection
 */
export interface DetectDependenciesResponse {
  potentialDependencies: TaskDependency[];
  confidence: number;
}

// ============================================
// Workflow Engine Types
// ============================================

/**
 * Base workflow request
 */
export interface WorkflowRequest {
  action: 'start' | 'transition' | 'pause' | 'resume' | 'complete';
  workflowId: string;
  instanceId?: string;
  context?: Record<string, any>;
}

/**
 * Workflow instance
 */
export interface WorkflowInstance {
  id: string;
  workflow_id: string;
  user_id: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
  current_state_id: string;
  context: Record<string, any>;
  started_at: string;
  completed_at?: string;
}

/**
 * Workflow state
 */
export interface WorkflowState {
  id: string;
  name: string;
  state_type: 'start' | 'action' | 'decision' | 'end';
  configuration: Record<string, any>;
}

/**
 * Response from workflow start
 */
export interface WorkflowStartResponse {
  instance: WorkflowInstance;
  message: string;
}

/**
 * Response from workflow transition
 */
export interface WorkflowTransitionResponse {
  instanceId: string;
  newState: WorkflowState;
  message: string;
}

/**
 * Response from workflow status change
 */
export interface WorkflowStatusResponse {
  instanceId: string;
  status: WorkflowInstance['status'];
}

// ============================================
// AI Orchestrator Types
// ============================================

/**
 * Request to AI orchestrator
 */
export interface AiChatRequest {
  message: string;
  conversationId?: string;
  agentType?: 'task_manager' | 'workflow_engine' | 'researcher' | 'general';
  context?: Record<string, any>;
}

/**
 * Response from AI orchestrator
 */
export interface AiChatResponse {
  conversationId: string;
  agent: string;
  response: string;
  metadata: {
    agent_id?: string;
    model?: string;
    tokens?: number;
    [key: string]: any;
  };
}

// ============================================
// HTTP Client
// ============================================

/**
 * Internal HTTP client for making requests to Edge Functions
 */
class HttpClient {
  private config: Required<JoannaClientConfig>;

  constructor(config: JoannaClientConfig) {
    this.config = {
      supabaseUrl: config.supabaseUrl,
      supabaseAnonKey: config.supabaseAnonKey,
      authToken: config.authToken || '',
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      debug: config.debug || false,
    };
  }

  /**
   * Update the authentication token
   */
  setAuthToken(token: string): void {
    this.config.authToken = token;
  }

  /**
   * Make a POST request to an Edge Function with retry logic
   */
  async post<TRequest, TResponse>(
    functionName: string,
    body: TRequest,
    options: {
      timeout?: number;
      retries?: number;
    } = {}
  ): Promise<ApiResponse<TResponse>> {
    const timeout = options.timeout || this.config.timeout;
    const maxRetries = options.retries !== undefined ? options.retries : this.config.maxRetries;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (this.config.debug && attempt > 0) {
          console.log(`[JoannaClient] Retry attempt ${attempt}/${maxRetries} for ${functionName}`);
        }

        const response = await this.makeRequest<TRequest, TResponse>(
          functionName,
          body,
          timeout
        );

        if (this.config.debug) {
          console.log(`[JoannaClient] Success: ${functionName}`, response);
        }

        return { data: response, success: true };
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (
          error instanceof Error &&
          'statusCode' in error &&
          typeof error.statusCode === 'number'
        ) {
          const statusCode = error.statusCode;
          if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
            break; // Don't retry client errors
          }
        }

        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          if (this.config.debug) {
            console.log(`[JoannaClient] Waiting ${delay}ms before retry...`);
          }
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    const apiError: ApiError = {
      error: lastError?.message || 'Unknown error occurred',
      details: lastError,
      statusCode: 'statusCode' in (lastError || {}) ? (lastError as any).statusCode : 500,
    };

    if (this.config.debug) {
      console.error(`[JoannaClient] Failed: ${functionName}`, apiError);
    }

    return { error: apiError, success: false };
  }

  /**
   * Make the actual HTTP request
   */
  private async makeRequest<TRequest, TResponse>(
    functionName: string,
    body: TRequest,
    timeout: number
  ): Promise<TResponse> {
    const url = `${this.config.supabaseUrl}/functions/v1/${functionName}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.config.supabaseAnonKey,
          ...(this.config.authToken && { 'Authorization': `Bearer ${this.config.authToken}` }),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        const error: any = new Error(data.error || `HTTP ${response.status}`);
        error.statusCode = response.status;
        error.details = data;
        throw error;
      }

      return data as TResponse;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError: any = new Error(`Request timeout after ${timeout}ms`);
        timeoutError.statusCode = 408;
        throw timeoutError;
      }

      throw error;
    }
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================
// Task Processor Client
// ============================================

/**
 * Client for task-processor Edge Function
 */
export class TaskProcessorClient {
  constructor(private http: HttpClient) {}

  /**
   * Prioritize a task based on due date, dependencies, and workload
   *
   * @param taskId - UUID of the task to prioritize
   * @returns Suggested priority and reasoning
   *
   * @example
   * ```typescript
   * const result = await client.tasks.prioritize('task-uuid');
   * if (result.success) {
   *   console.log(`Suggested priority: ${result.data.suggestedPriority}`);
   *   console.log(`Reasoning: ${result.data.reasoning}`);
   * }
   * ```
   */
  async prioritize(taskId: string): Promise<ApiResponse<PrioritizeTaskResponse>> {
    const request: PrioritizeTaskRequest = {
      action: 'prioritize',
      taskId,
    };

    return this.http.post<PrioritizeTaskRequest, PrioritizeTaskResponse>(
      'task-processor',
      request
    );
  }

  /**
   * Get AI-powered suggestions for breaking down a task into subtasks
   *
   * @param title - Task title
   * @param description - Task description
   * @returns List of suggested subtasks
   *
   * @example
   * ```typescript
   * const result = await client.tasks.suggestBreakdown(
   *   'Build authentication system',
   *   'Implement user login, signup, and password reset'
   * );
   * if (result.success) {
   *   result.data.suggestions.forEach(subtask => {
   *     console.log(`- ${subtask.title} (priority: ${subtask.priority})`);
   *   });
   * }
   * ```
   */
  async suggestBreakdown(
    title: string,
    description: string
  ): Promise<ApiResponse<SuggestBreakdownResponse>> {
    const request: SuggestBreakdownRequest = {
      action: 'suggest_breakdown',
      taskTitle: title,
      taskDescription: description,
    };

    return this.http.post<SuggestBreakdownRequest, SuggestBreakdownResponse>(
      'task-processor',
      request
    );
  }

  /**
   * Detect potential dependencies between tasks
   *
   * @param taskId - UUID of the task to analyze
   * @returns List of potential dependencies with confidence scores
   *
   * @example
   * ```typescript
   * const result = await client.tasks.detectDependencies('task-uuid');
   * if (result.success) {
   *   result.data.potentialDependencies.forEach(dep => {
   *     console.log(`${dep.title} (confidence: ${dep.confidence})`);
   *   });
   * }
   * ```
   */
  async detectDependencies(taskId: string): Promise<ApiResponse<DetectDependenciesResponse>> {
    const request: DetectDependenciesRequest = {
      action: 'detect_dependencies',
      taskId,
    };

    return this.http.post<DetectDependenciesRequest, DetectDependenciesResponse>(
      'task-processor',
      request
    );
  }
}

// ============================================
// Workflow Engine Client
// ============================================

/**
 * Client for workflow-engine Edge Function
 */
export class WorkflowEngineClient {
  constructor(private http: HttpClient) {}

  /**
   * Start a new workflow instance
   *
   * @param workflowId - UUID of the workflow to start
   * @param context - Initial context data for the workflow
   * @returns Created workflow instance
   *
   * @example
   * ```typescript
   * const result = await client.workflows.start('workflow-uuid', {
   *   userId: 'user-123',
   *   source: 'manual',
   * });
   * if (result.success) {
   *   console.log(`Workflow started: ${result.data.instance.id}`);
   * }
   * ```
   */
  async start(
    workflowId: string,
    context: Record<string, any> = {}
  ): Promise<ApiResponse<WorkflowStartResponse>> {
    const request: WorkflowRequest = {
      action: 'start',
      workflowId,
      context,
    };

    return this.http.post<WorkflowRequest, WorkflowStartResponse>('workflow-engine', request);
  }

  /**
   * Execute the next transition in a workflow instance
   *
   * @param workflowId - UUID of the workflow
   * @param instanceId - UUID of the workflow instance
   * @returns New state after transition
   *
   * @example
   * ```typescript
   * const result = await client.workflows.transition('workflow-uuid', 'instance-uuid');
   * if (result.success) {
   *   console.log(`Transitioned to: ${result.data.newState.name}`);
   * }
   * ```
   */
  async transition(
    workflowId: string,
    instanceId: string
  ): Promise<ApiResponse<WorkflowTransitionResponse>> {
    const request: WorkflowRequest = {
      action: 'transition',
      workflowId,
      instanceId,
    };

    return this.http.post<WorkflowRequest, WorkflowTransitionResponse>('workflow-engine', request);
  }

  /**
   * Pause a running workflow instance
   *
   * @param workflowId - UUID of the workflow
   * @param instanceId - UUID of the workflow instance
   * @returns Updated status
   *
   * @example
   * ```typescript
   * const result = await client.workflows.pause('workflow-uuid', 'instance-uuid');
   * if (result.success) {
   *   console.log(`Status: ${result.data.status}`); // 'paused'
   * }
   * ```
   */
  async pause(workflowId: string, instanceId: string): Promise<ApiResponse<WorkflowStatusResponse>> {
    const request: WorkflowRequest = {
      action: 'pause',
      workflowId,
      instanceId,
    };

    return this.http.post<WorkflowRequest, WorkflowStatusResponse>('workflow-engine', request);
  }

  /**
   * Resume a paused workflow instance
   *
   * @param workflowId - UUID of the workflow
   * @param instanceId - UUID of the workflow instance
   * @returns Updated status
   *
   * @example
   * ```typescript
   * const result = await client.workflows.resume('workflow-uuid', 'instance-uuid');
   * if (result.success) {
   *   console.log(`Status: ${result.data.status}`); // 'running'
   * }
   * ```
   */
  async resume(workflowId: string, instanceId: string): Promise<ApiResponse<WorkflowStatusResponse>> {
    const request: WorkflowRequest = {
      action: 'resume',
      workflowId,
      instanceId,
    };

    return this.http.post<WorkflowRequest, WorkflowStatusResponse>('workflow-engine', request);
  }

  /**
   * Mark a workflow instance as completed
   *
   * @param workflowId - UUID of the workflow
   * @param instanceId - UUID of the workflow instance
   * @returns Updated status
   *
   * @example
   * ```typescript
   * const result = await client.workflows.complete('workflow-uuid', 'instance-uuid');
   * if (result.success) {
   *   console.log(`Status: ${result.data.status}`); // 'completed'
   * }
   * ```
   */
  async complete(
    workflowId: string,
    instanceId: string
  ): Promise<ApiResponse<WorkflowStatusResponse>> {
    const request: WorkflowRequest = {
      action: 'complete',
      workflowId,
      instanceId,
    };

    return this.http.post<WorkflowRequest, WorkflowStatusResponse>('workflow-engine', request);
  }
}

// ============================================
// AI Orchestrator Client
// ============================================

/**
 * Client for ai-orchestrator Edge Function
 */
export class AiOrchestratorClient {
  constructor(private http: HttpClient) {}

  /**
   * Send a message to the AI assistant
   *
   * @param message - User message
   * @param options - Optional parameters
   * @returns AI response
   *
   * @example
   * ```typescript
   * const result = await client.ai.chat('Help me organize my tasks');
   * if (result.success) {
   *   console.log(`Agent: ${result.data.agent}`);
   *   console.log(`Response: ${result.data.response}`);
   * }
   * ```
   */
  async chat(
    message: string,
    options: {
      conversationId?: string;
      agentType?: AiChatRequest['agentType'];
      context?: Record<string, any>;
    } = {}
  ): Promise<ApiResponse<AiChatResponse>> {
    const request: AiChatRequest = {
      message,
      conversationId: options.conversationId,
      agentType: options.agentType,
      context: options.context,
    };

    return this.http.post<AiChatRequest, AiChatResponse>('ai-orchestrator', request);
  }

  /**
   * Continue an existing conversation
   *
   * @param conversationId - UUID of the conversation
   * @param message - User message
   * @returns AI response
   *
   * @example
   * ```typescript
   * const result = await client.ai.continueConversation('conversation-uuid', 'Tell me more');
   * if (result.success) {
   *   console.log(result.data.response);
   * }
   * ```
   */
  async continueConversation(
    conversationId: string,
    message: string
  ): Promise<ApiResponse<AiChatResponse>> {
    return this.chat(message, { conversationId });
  }

  /**
   * Chat with a specific agent type
   *
   * @param agentType - Type of agent to use
   * @param message - User message
   * @param context - Additional context
   * @returns AI response
   *
   * @example
   * ```typescript
   * const result = await client.ai.chatWithAgent('task_manager', 'Create a task for tomorrow');
   * if (result.success) {
   *   console.log(result.data.response);
   * }
   * ```
   */
  async chatWithAgent(
    agentType: AiChatRequest['agentType'],
    message: string,
    context?: Record<string, any>
  ): Promise<ApiResponse<AiChatResponse>> {
    return this.chat(message, { agentType, context });
  }
}

// ============================================
// Main Client
// ============================================

/**
 * Main Joanna API Client
 *
 * Provides type-safe access to all Edge Functions with built-in
 * error handling, retry logic, and request/response validation.
 *
 * @example
 * ```typescript
 * // Initialize the client
 * const client = new JoannaClient({
 *   supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
 *   supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
 *   authToken: session.access_token,
 *   debug: true,
 * });
 *
 * // Use task processor
 * const priorityResult = await client.tasks.prioritize('task-uuid');
 *
 * // Use workflow engine
 * const workflowResult = await client.workflows.start('workflow-uuid', {});
 *
 * // Use AI orchestrator
 * const aiResult = await client.ai.chat('Help me with my tasks');
 *
 * // Update auth token
 * client.setAuthToken(newToken);
 * ```
 */
export class JoannaClient {
  private http: HttpClient;

  /** Task processor operations */
  public readonly tasks: TaskProcessorClient;

  /** Workflow engine operations */
  public readonly workflows: WorkflowEngineClient;

  /** AI orchestrator operations */
  public readonly ai: AiOrchestratorClient;

  /**
   * Create a new Joanna API client
   *
   * @param config - Client configuration
   */
  constructor(config: JoannaClientConfig) {
    this.http = new HttpClient(config);
    this.tasks = new TaskProcessorClient(this.http);
    this.workflows = new WorkflowEngineClient(this.http);
    this.ai = new AiOrchestratorClient(this.http);
  }

  /**
   * Update the authentication token
   *
   * @param token - New JWT token
   *
   * @example
   * ```typescript
   * client.setAuthToken(session.access_token);
   * ```
   */
  setAuthToken(token: string): void {
    this.http.setAuthToken(token);
  }
}

// ============================================
// Exports
// ============================================

export default JoannaClient;

/**
 * Create a Joanna client instance with environment variables
 *
 * @param authToken - Optional auth token override
 * @returns Configured JoannaClient instance
 *
 * @example
 * ```typescript
 * import { createClient } from '@/lib/api/client';
 *
 * const client = createClient(session.access_token);
 * const result = await client.tasks.prioritize('task-uuid');
 * ```
 */
export function createClient(authToken?: string): JoannaClient {
  return new JoannaClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    authToken,
  });
}
