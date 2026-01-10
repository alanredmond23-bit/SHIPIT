// Functional Engine Hooks
export { useDecisionEngine } from './useDecisionEngine';
export { useBenchmarkEngine } from './useBenchmarkEngine';
export { useMCPManager } from './useMCPManager';
export { useStreamingChat, getStatusDisplay } from './useStreamingChat';
export { useModelPreferences, useModelPreferencesWithSupabase } from './useModelPreferences';

// Re-export types
export type {
  DecisionSession,
  DecisionStep,
  DecisionOption,
  DecisionResult,
  BiasAlert,
} from './useDecisionEngine';

export type {
  ModelProvider,
  BenchmarkCategory,
} from './useBenchmarkEngine';

export type {
  MCPServer,
  MCPServerConfig,
  MCPInstallation,
  MCPHealthCheck,
} from './useMCPManager';

export type {
  ConnectionStatus,
  StreamingError,
  TokenUsage,
  StreamingConfig,
  StreamingRequest,
  StreamingResult,
  UseStreamingChatOptions,
} from './useStreamingChat';

export type {
  UseModelPreferencesReturn,
  UseModelPreferencesWithSupabaseOptions,
} from './useModelPreferences';
