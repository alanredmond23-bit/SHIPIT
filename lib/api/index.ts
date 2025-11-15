/**
 * Joanna API Client Library
 *
 * Re-exports all client functionality for convenient importing.
 *
 * @module lib/api
 */

export {
  JoannaClient,
  createClient,
  type JoannaClientConfig,
  type ApiError,
  type ApiResponse,
  type PrioritizeTaskRequest,
  type PrioritizeTaskResponse,
  type SuggestBreakdownRequest,
  type SuggestBreakdownResponse,
  type SubtaskSuggestion,
  type DetectDependenciesRequest,
  type DetectDependenciesResponse,
  type TaskDependency,
  type WorkflowRequest,
  type WorkflowInstance,
  type WorkflowState,
  type WorkflowStartResponse,
  type WorkflowTransitionResponse,
  type WorkflowStatusResponse,
  type AiChatRequest,
  type AiChatResponse,
  TaskProcessorClient,
  WorkflowEngineClient,
  AiOrchestratorClient,
} from './client';

export default from './client';
