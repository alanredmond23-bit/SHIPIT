/**
 * Shared types for Voice Conversation System
 */

/**
 * Voice session status
 */
export type VoiceSessionStatus = 'connecting' | 'active' | 'paused' | 'ended' | 'error';

/**
 * STT provider types
 */
export type STTProviderType = 'whisper' | 'deepgram' | 'assemblyai';

/**
 * TTS provider types
 */
export type TTSProviderType = 'openai' | 'elevenlabs' | 'playht';

/**
 * Voice configuration
 */
export interface VoiceConfiguration {
  sttProvider: STTProviderType;
  ttsProvider: TTSProviderType;
  voice: string;
  language: string;
  interruptSensitivity: 'low' | 'medium' | 'high';
  responseStyle: 'concise' | 'conversational' | 'detailed';
  enableEmotionDetection: boolean;
  systemPrompt?: string;
}

/**
 * Transcript entry
 */
export interface VoiceTranscript {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  text: string;
  audioUrl?: string;
  timestamp: Date;
  durationMs: number;
  emotion?: string;
  confidence: number;
  language?: string;
  wordTimestamps?: WordTimestamp[];
}

/**
 * Word-level timestamp
 */
export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

/**
 * Voice session
 */
export interface VoiceSessionData {
  id: string;
  userId: string;
  status: VoiceSessionStatus;
  config: VoiceConfiguration;
  startedAt: Date;
  endedAt?: Date;
  durationSeconds?: number;
  stats: VoiceSessionStats;
  metadata?: Record<string, any>;
}

/**
 * Session statistics
 */
export interface VoiceSessionStats {
  duration: number;
  userSpeakTime: number;
  aiSpeakTime: number;
  interruptions: number;
  totalTurns: number;
  avgLatency?: number;
  avgConfidence?: number;
}

/**
 * Voice information
 */
export interface VoiceMetadata {
  id: string;
  name: string;
  description?: string;
  previewUrl?: string;
  language?: string;
  gender?: 'male' | 'female' | 'neutral';
  age?: string;
  accent?: string;
  useCase?: string;
  labels?: Record<string, string>;
}

/**
 * Custom voice
 */
export interface CustomVoice {
  id: string;
  userId: string;
  provider: TTSProviderType;
  providerVoiceId: string;
  name: string;
  description?: string;
  previewUrl?: string;
  language?: string;
  gender?: string;
  age?: string;
  accent?: string;
  useCase?: string;
  sampleCount: number;
  trainingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  isPublic: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Voice analytics
 */
export interface VoiceAnalytics {
  id: string;
  sessionId: string;
  userId: string;
  sttProvider: STTProviderType;
  ttsProvider: TTSProviderType;
  charactersTranscribed: number;
  charactersSynthesized: number;
  audioSecondsProcessed: number;
  audioSecondsGenerated: number;
  estimatedCostUsd?: number;
  recordedAt: Date;
}

/**
 * Voice cloning request
 */
export interface VoiceCloneRequest {
  userId: string;
  name: string;
  description?: string;
  provider: TTSProviderType;
  audioSamples: Buffer[];
  language?: string;
  gender?: string;
}

/**
 * API response types
 */

export interface StartSessionResponse {
  success: boolean;
  session?: {
    id: string;
    status: VoiceSessionStatus;
    config: VoiceConfiguration;
    wsUrl: string;
  };
  error?: string;
}

export interface EndSessionResponse {
  success: boolean;
  session?: {
    id: string;
    status: VoiceSessionStatus;
    stats: VoiceSessionStats;
    duration: number;
  };
  error?: string;
}

export interface GetSessionResponse {
  success: boolean;
  session?: VoiceSessionData;
  error?: string;
}

export interface GetTranscriptResponse {
  success: boolean;
  transcript?: VoiceTranscript[];
  count?: number;
  error?: string;
}

export interface GetVoicesResponse {
  success: boolean;
  provider?: string;
  voices?: VoiceMetadata[];
  count?: number;
  error?: string;
}

export interface CloneVoiceResponse {
  success: boolean;
  voice?: {
    id: string;
    name: string;
    description?: string;
    provider: string;
    providerVoiceId: string;
    status: string;
  };
  error?: string;
}

export interface GetCustomVoicesResponse {
  success: boolean;
  voices?: CustomVoice[];
  count?: number;
  error?: string;
}

export interface AnalyticsResponse {
  success: boolean;
  analytics?: {
    totalSessions: number;
    totalCharactersTranscribed: number;
    totalCharactersSynthesized: number;
    totalAudioSecondsProcessed: number;
    totalAudioSecondsGenerated: number;
    avgCostPerSession: number;
    totalEstimatedCost: number;
  };
  error?: string;
}

/**
 * WebSocket message types
 */

export enum WSMessageType {
  // Client -> Server
  AUDIO_CHUNK = 'audio_chunk',
  START_SPEAKING = 'start_speaking',
  STOP_SPEAKING = 'stop_speaking',
  INTERRUPT = 'interrupt',
  CONFIG_UPDATE = 'config_update',

  // Server -> Client
  TRANSCRIPT = 'transcript',
  AUDIO_RESPONSE = 'audio_response',
  AUDIO_START = 'audio_start',
  AUDIO_END = 'audio_end',
  STATUS = 'status',
  ERROR = 'error',
  METRICS = 'metrics',
}

export interface WSMessage {
  type: WSMessageType;
  data: any;
  timestamp: number;
}

export interface WSTranscriptMessage {
  type: WSMessageType.TRANSCRIPT;
  data: {
    role: 'user' | 'assistant';
    text: string;
    confidence?: number;
    duration?: number;
    emotion?: string;
  };
  timestamp: number;
}

export interface WSStatusMessage {
  type: WSMessageType.STATUS;
  data: {
    status: string;
    [key: string]: any;
  };
  timestamp: number;
}

export interface WSMetricsMessage {
  type: WSMessageType.METRICS;
  data: {
    totalTurns: number;
    userSpeakTime: number;
    aiSpeakTime: number;
    latency: number;
  };
  timestamp: number;
}

export interface WSErrorMessage {
  type: WSMessageType.ERROR;
  data: {
    message: string;
    code?: string;
  };
  timestamp: number;
}
