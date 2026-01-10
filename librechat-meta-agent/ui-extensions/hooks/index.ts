// Functional Engine Hooks
export { useDecisionEngine } from './useDecisionEngine';
export { useBenchmarkEngine } from './useBenchmarkEngine';
export { useMCPManager } from './useMCPManager';
export { useStreamingChat, getStatusDisplay } from './useStreamingChat';
export { useModelPreferences, useModelPreferencesWithSupabase } from './useModelPreferences';
export { useVoiceChat } from './useVoiceChat';
export { useArtifacts } from './useArtifacts';
export { useImageGeneration } from './useImageGeneration';
export {
  useTasks,
  useTaskExecutions,
  useTaskStatistics,
  useCalendarTasks,
  parseCronExpression,
  getNextRunTime,
  formatDuration,
  formatRelativeTime,
} from './useTasks';
export { usePersonas } from './usePersonas';

// Auto-save Hooks
export {
  useAutoSave,
  useAutoSaveForm,
  DraftRecoveryBanner,
} from './useAutoSave';

// Project Management Hooks
export {
  useProjectsList,
  useRecentProjects,
  useProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useArchiveProject,
  usePinProject,
  useAddConversationToProject,
  useRemoveConversationFromProject,
  useProjectConversations,
  useProjectMemories,
  useCreateProjectMemory,
  useUpdateProjectMemory,
  useDeleteProjectMemory,
  useProjectContext,
  useActiveProject,
  ActiveProjectProvider,
  useProjectsManagement,
} from './useProjects';

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

export type {
  Persona,
  PersonaCategory,
  PersonaCapabilities,
  PersonaPersonality,
  PersonaVoiceConfig,
  PersonaStats,
  PersonaSampleResponse,
  CreatePersonaInput,
  UpdatePersonaInput,
  UsePersonasOptions,
  UsePersonasReturn,
} from './usePersonas';

export type {
  AutoSaveOptions,
  AutoSaveReturn,
  SavedData,
  FormAutoSaveOptions,
  FormAutoSaveReturn,
  DraftRecoveryBannerProps,
} from './useAutoSave';
