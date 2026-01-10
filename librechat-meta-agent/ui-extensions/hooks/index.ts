// Functional Engine Hooks
export { useDecisionEngine } from './useDecisionEngine';
export { useBenchmarkEngine } from './useBenchmarkEngine';
export { useMCPManager } from './useMCPManager';
export { useStreamingChat, getStatusDisplay } from './useStreamingChat';
export { useModelPreferences, useModelPreferencesWithSupabase } from './useModelPreferences';
export { useVoiceChat } from './useVoiceChat';
export { useArtifacts } from './useArtifacts';
export { useImageGeneration } from './useImageGeneration';

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

export type {
  VoiceStatus,
  VoiceMessage,
  VoiceConfig,
  VoiceMetrics,
  WaveformData,
  UseVoiceChatOptions,
  UseVoiceChatReturn,
} from './useVoiceChat';

export type {
  Artifact,
  ArtifactVersion,
  UseArtifactsReturn,
} from './useArtifacts';

export type {
  GeneratedImage,
  ImageProvider,
  ImageStyle,
  ImageSize,
  ImageGenerationRequest,
  GenerationStatus,
  GenerationError,
  GenerationCost,
  UseImageGenerationOptions,
  UseImageGenerationReturn,
} from './useImageGeneration';
