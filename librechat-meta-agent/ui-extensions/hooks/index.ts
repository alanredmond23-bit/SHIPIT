// Functional Engine Hooks
export { useDecisionEngine } from './useDecisionEngine';
export { useBenchmarkEngine } from './useBenchmarkEngine';
export { useMCPManager } from './useMCPManager';

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
