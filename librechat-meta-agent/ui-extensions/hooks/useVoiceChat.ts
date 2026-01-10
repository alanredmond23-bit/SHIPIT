'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Voice chat session status
 */
export type VoiceStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'error';

/**
 * Voice message in the conversation
 */
export interface VoiceMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  audioUrl?: string;
  timestamp: Date;
  duration?: number;
  emotion?: string;
  confidence?: number;
}

/**
 * Voice configuration options
 */
export interface VoiceConfig {
  sttProvider: 'whisper' | 'deepgram' | 'assemblyai';
  ttsProvider: 'openai' | 'elevenlabs' | 'playht';
  voice: string;
  language: string;
  speed?: number;
  interruptSensitivity: 'low' | 'medium' | 'high';
  responseStyle: 'concise' | 'conversational' | 'detailed';
  enableEmotionDetection?: boolean;
  systemPrompt?: string;
}

/**
 * Session metrics
 */
export interface VoiceMetrics {
  totalTurns: number;
  userSpeakTime: number;
  aiSpeakTime: number;
  latency: number;
  tokensUsed?: number;
}

/**
 * Waveform data for visualization
 */
export interface WaveformData {
  values: number[];
  isActive: boolean;
}

/**
 * Voice chat hook options
 */
export interface UseVoiceChatOptions {
  apiUrl?: string;
  userId?: string;
  initialConfig?: Partial<VoiceConfig>;
  onSessionStart?: (sessionId: string) => void;
  onSessionEnd?: (sessionId: string, metrics: VoiceMetrics) => void;
  onMessage?: (message: VoiceMessage) => void;
  onError?: (error: Error) => void;
}

/**
 * Voice chat hook return type
 */
export interface UseVoiceChatReturn {
  // State
  status: VoiceStatus;
  sessionId: string | null;
  messages: VoiceMessage[];
  config: VoiceConfig;
  metrics: VoiceMetrics;
  waveformData: WaveformData;
  isMuted: boolean;
  isHandsFree: boolean;
  isPushToTalk: boolean;
  networkQuality: 'excellent' | 'good' | 'poor';
  callDuration: number;

  // Actions
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
  toggleMute: () => void;
  toggleHandsFree: () => void;
  setPushToTalk: (active: boolean) => void;
  setConfig: (config: Partial<VoiceConfig>) => void;
  clearMessages: () => void;

  // Refs for advanced usage
  audioContextRef: React.RefObject<AudioContext | null>;
  analyserRef: React.RefObject<AnalyserNode | null>;
}

const DEFAULT_CONFIG: VoiceConfig = {
  sttProvider: 'whisper',
  ttsProvider: 'openai',
  voice: 'alloy',
  language: 'en',
  speed: 1.0,
  interruptSensitivity: 'medium',
  responseStyle: 'conversational',
  enableEmotionDetection: false,
};

/**
 * useVoiceChat - Comprehensive voice chat hook
 * Manages microphone access, audio recording, STT streaming, and TTS playback
 */
export function useVoiceChat(options: UseVoiceChatOptions = {}): UseVoiceChatReturn {
  const {
    apiUrl = '/api/voice',
    userId = 'default-user',
    initialConfig,
    onSessionStart,
    onSessionEnd,
    onMessage,
    onError,
  } = options;

  // Core state
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [config, setConfigState] = useState<VoiceConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });
  const [metrics, setMetrics] = useState<VoiceMetrics>({
    totalTurns: 0,
    userSpeakTime: 0,
    aiSpeakTime: 0,
    latency: 0,
  });

  // UI state
  const [isMuted, setIsMuted] = useState(false);
  const [isHandsFree, setIsHandsFree] = useState(true);
  const [isPushToTalk, setIsPushToTalk] = useState(false);
  const [networkQuality, setNetworkQuality] = useState<'excellent' | 'good' | 'poor'>('excellent');
  const [callDuration, setCallDuration] = useState(0);
  const [waveformData, setWaveformData] = useState<WaveformData>({
    values: new Array(50).fill(0),
    isActive: false,
  });

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const callStartTimeRef = useRef<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  /**
   * Start waveform animation
   */
  const startWaveformAnimation = useCallback(() => {
    const animate = () => {
      if (!analyserRef.current) return;

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);

      // Downsample to 50 bars
      const bars = 50;
      const barData: number[] = [];
      const samplesPerBar = Math.floor(dataArray.length / bars);

      for (let i = 0; i < bars; i++) {
        let sum = 0;
        for (let j = 0; j < samplesPerBar; j++) {
          sum += dataArray[i * samplesPerBar + j];
        }
        barData.push(sum / samplesPerBar / 255); // Normalize to 0-1
      }

      setWaveformData({ values: barData, isActive: true });

      if (status !== 'idle' && status !== 'error') {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animate();
  }, [status]);

  /**
   * Stop waveform animation
   */
  const stopWaveformAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setWaveformData({ values: new Array(50).fill(0), isActive: false });
  }, []);

  /**
   * Handle WebSocket messages
   */
  const handleWebSocketMessage = useCallback(async (data: string | Blob) => {
    if (typeof data === 'string') {
      try {
        const message = JSON.parse(data);

        switch (message.type) {
          case 'status':
            handleStatusUpdate(message.data.status);
            break;

          case 'transcript':
            const newMessage: VoiceMessage = {
              id: Math.random().toString(36).substring(7),
              role: message.data.role,
              text: message.data.text,
              timestamp: new Date(),
              emotion: message.data.emotion,
              confidence: message.data.confidence,
            };
            setMessages((prev) => [...prev, newMessage]);
            onMessage?.(newMessage);
            break;

          case 'audio_start':
            setStatus('speaking');
            break;

          case 'audio_end':
            setStatus('connected');
            break;

          case 'metrics':
            setMetrics(message.data);
            updateNetworkQuality(message.data.latency);
            break;

          case 'error':
            console.error('Server error:', message.data.message);
            setStatus('error');
            onError?.(new Error(message.data.message));
            break;
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    } else {
      // Binary audio data - play it
      await playAudioChunk(data);
    }
  }, [onMessage, onError]);

  /**
   * Handle status updates from server
   */
  const handleStatusUpdate = (statusText: string) => {
    switch (statusText) {
      case 'transcribing':
        setStatus('listening');
        break;
      case 'thinking':
      case 'synthesizing':
        setStatus('processing');
        break;
      case 'connected':
        setStatus('connected');
        break;
    }
  };

  /**
   * Update network quality based on latency
   */
  const updateNetworkQuality = (latency: number) => {
    if (latency < 500) {
      setNetworkQuality('excellent');
    } else if (latency < 1500) {
      setNetworkQuality('good');
    } else {
      setNetworkQuality('poor');
    }
  };

  /**
   * Play audio chunk from server
   */
  const playAudioChunk = async (blob: Blob) => {
    if (isMuted) return;

    try {
      const audioContext = new AudioContext();
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  };

  /**
   * Start voice session
   */
  const startSession = useCallback(async () => {
    try {
      setStatus('connecting');

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      streamRef.current = stream;

      // Setup audio context for visualization
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Setup media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4',
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);

          // Send audio chunk to server via WebSocket
          if (wsRef.current?.readyState === WebSocket.OPEN && !isMuted) {
            wsRef.current.send(event.data);
          }
        }
      };

      // Start voice session on server
      const response = await fetch(`${apiUrl}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          ...config,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start session');
      }

      const data = await response.json();
      const { session } = data;

      setSessionId(session.id);
      callStartTimeRef.current = Date.now();
      onSessionStart?.(session.id);

      // Connect WebSocket
      const wsUrl = session.wsUrl || `${apiUrl.replace('http', 'ws')}/ws/${session.id}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        console.log('Voice WebSocket connected');
      };

      ws.onmessage = (event) => {
        handleWebSocketMessage(event.data);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('error');
        setNetworkQuality('poor');
        onError?.(new Error('WebSocket connection error'));
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        if (status !== 'idle') {
          endSession();
        }
      };

      // Start recording
      mediaRecorder.start(100); // Send chunks every 100ms

      // Start waveform animation
      startWaveformAnimation();

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        if (callStartTimeRef.current) {
          setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
        }
      }, 1000);

    } catch (error) {
      console.error('Failed to start session:', error);
      setStatus('error');
      onError?.(error instanceof Error ? error : new Error('Failed to start session'));
    }
  }, [apiUrl, userId, config, isMuted, handleWebSocketMessage, startWaveformAnimation, onSessionStart, onError, status]);

  /**
   * End voice session
   */
  const endSession = useCallback(async () => {
    try {
      // Stop media recorder
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stop();
      }

      // Stop all audio tracks
      streamRef.current?.getTracks().forEach(track => track.stop());

      // Close WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }

      // Stop audio context
      if (audioContextRef.current?.state !== 'closed') {
        await audioContextRef.current?.close();
      }

      // Clear duration interval
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      // Stop waveform animation
      stopWaveformAnimation();

      // End session on server
      if (sessionId) {
        await fetch(`${apiUrl}/${sessionId}/end`, {
          method: 'POST',
        });
        onSessionEnd?.(sessionId, metrics);
      }

      // Reset state
      setStatus('idle');
      setSessionId(null);
      callStartTimeRef.current = null;
      setCallDuration(0);
      audioChunksRef.current = [];

    } catch (error) {
      console.error('Failed to end session:', error);
    }
  }, [sessionId, apiUrl, metrics, stopWaveformAnimation, onSessionEnd]);

  /**
   * Toggle mute
   */
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;
      // Mute/unmute the audio track
      streamRef.current?.getAudioTracks().forEach(track => {
        track.enabled = !newMuted;
      });
      return newMuted;
    });
  }, []);

  /**
   * Toggle hands-free mode
   */
  const toggleHandsFree = useCallback(() => {
    setIsHandsFree(prev => !prev);
  }, []);

  /**
   * Set push-to-talk state
   */
  const setPushToTalkState = useCallback((active: boolean) => {
    setIsPushToTalk(active);

    if (!isHandsFree && streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = active && !isMuted;
      });
    }
  }, [isHandsFree, isMuted]);

  /**
   * Update configuration
   */
  const setConfig = useCallback((newConfig: Partial<VoiceConfig>) => {
    setConfigState(prev => ({ ...prev, ...newConfig }));
  }, []);

  /**
   * Clear messages
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (sessionId) {
        endSession();
      }
    };
  }, [sessionId, endSession]);

  /**
   * Handle space key for push-to-talk
   */
  useEffect(() => {
    if (!isHandsFree && status === 'connected') {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space' && !e.repeat) {
          e.preventDefault();
          setPushToTalkState(true);
        }
      };

      const handleKeyUp = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
          e.preventDefault();
          setPushToTalkState(false);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      };
    }
  }, [isHandsFree, status, setPushToTalkState]);

  return {
    // State
    status,
    sessionId,
    messages,
    config,
    metrics,
    waveformData,
    isMuted,
    isHandsFree,
    isPushToTalk,
    networkQuality,
    callDuration,

    // Actions
    startSession,
    endSession,
    toggleMute,
    toggleHandsFree,
    setPushToTalk: setPushToTalkState,
    setConfig,
    clearMessages,

    // Refs
    audioContextRef,
    analyserRef,
  };
}

export default useVoiceChat;
