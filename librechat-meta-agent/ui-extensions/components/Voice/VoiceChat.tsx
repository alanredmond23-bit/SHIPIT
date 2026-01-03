'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Settings,
  Volume2,
  VolumeX,
  Loader2,
  Radio,
  Activity,
  MessageSquare,
  Clock,
  Wifi,
  WifiOff,
  Heart,
  Smile,
  Frown,
  Meh,
  ChevronDown,
  Languages,
} from 'lucide-react';
import clsx from 'clsx';

/**
 * Voice session status
 */
type SessionStatus = 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'thinking' | 'error';

/**
 * Transcript entry
 */
interface TranscriptEntry {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  emotion?: string;
  confidence?: number;
}

/**
 * Voice configuration
 */
interface VoiceConfig {
  sttProvider: 'whisper' | 'deepgram' | 'assemblyai';
  ttsProvider: 'openai' | 'elevenlabs' | 'playht';
  voice: string;
  language: string;
  interruptSensitivity: 'low' | 'medium' | 'high';
  responseStyle: 'concise' | 'conversational' | 'detailed';
  enableEmotionDetection: boolean;
  systemPrompt?: string;
}

/**
 * Voice info
 */
interface VoiceInfo {
  id: string;
  name: string;
  description?: string;
  preview_url?: string;
  language?: string;
  gender?: string;
}

/**
 * Session metrics
 */
interface SessionMetrics {
  totalTurns: number;
  userSpeakTime: number;
  aiSpeakTime: number;
  latency: number;
}

export interface VoiceChatProps {
  /** API base URL */
  apiUrl?: string;
  /** User ID */
  userId?: string;
  /** Initial configuration */
  initialConfig?: Partial<VoiceConfig>;
  /** Callback when session starts */
  onSessionStart?: (sessionId: string) => void;
  /** Callback when session ends */
  onSessionEnd?: (sessionId: string, metrics: SessionMetrics) => void;
}

/**
 * Beautiful Voice Chat Interface
 * Features real-time voice conversation with AI
 */
export default function VoiceChat({
  apiUrl = '/api/voice',
  userId = 'default-user',
  initialConfig,
}: VoiceChatProps) {
  // State
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [networkQuality, setNetworkQuality] = useState<'excellent' | 'good' | 'poor'>('excellent');
  const [metrics, setMetrics] = useState<SessionMetrics>({
    totalTurns: 0,
    userSpeakTime: 0,
    aiSpeakTime: 0,
    latency: 0,
  });

  // Config state
  const [config, setConfig] = useState<VoiceConfig>({
    sttProvider: 'whisper',
    ttsProvider: 'openai',
    voice: 'alloy',
    language: 'en',
    interruptSensitivity: 'medium',
    responseStyle: 'conversational',
    enableEmotionDetection: false,
    ...initialConfig,
  });

  const [availableVoices, setAvailableVoices] = useState<VoiceInfo[]>([]);
  const [waveformData, setWaveformData] = useState<number[]>(new Array(50).fill(0));

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const callStartTimeRef = useRef<number | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  /**
   * Start voice session
   */
  const startSession = useCallback(async () => {
    try {
      setStatus('connecting');

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

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
        mimeType: 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
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

      // Connect WebSocket
      const ws = new WebSocket(session.wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        console.log('WebSocket connected');
      };

      ws.onmessage = (event) => {
        handleWebSocketMessage(event.data);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('error');
        setNetworkQuality('poor');
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        endSession();
      };

      // Start recording
      mediaRecorder.start(100); // Send chunks every 100ms

      // Start waveform animation
      startWaveformAnimation();

      // Start duration timer
      const durationInterval = setInterval(() => {
        if (callStartTimeRef.current) {
          setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
        }
      }, 1000);

      return () => clearInterval(durationInterval);
    } catch (error) {
      console.error('Failed to start session:', error);
      setStatus('error');
    }
  }, [apiUrl, userId, config]);

  /**
   * End voice session
   */
  const endSession = useCallback(async () => {
    if (!sessionId) return;

    try {
      // Stop media recorder
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stop();
      }

      // Close WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }

      // Stop audio context
      audioContextRef.current?.close();

      // End session on server
      await fetch(`${apiUrl}/${sessionId}/end`, {
        method: 'POST',
      });

      setStatus('idle');
      setSessionId(null);
      callStartTimeRef.current = null;
      setCallDuration(0);
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  }, [sessionId, apiUrl]);

  /**
   * Handle WebSocket messages
   */
  const handleWebSocketMessage = useCallback((data: string | Blob) => {
    if (typeof data === 'string') {
      // JSON message
      try {
        const message = JSON.parse(data);

        switch (message.type) {
          case 'status':
            handleStatusUpdate(message.data.status);
            break;

          case 'transcript':
            handleTranscriptUpdate(message.data);
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
            break;
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    } else {
      // Binary audio data
      playAudioChunk(data);
    }
  }, []);

  /**
   * Handle status updates
   */
  const handleStatusUpdate = (statusText: string) => {
    switch (statusText) {
      case 'transcribing':
        setStatus('listening');
        break;
      case 'thinking':
        setStatus('thinking');
        break;
      case 'synthesizing':
        setStatus('thinking');
        break;
      case 'connected':
        setStatus('connected');
        break;
    }
  };

  /**
   * Handle transcript updates
   */
  const handleTranscriptUpdate = (data: any) => {
    const entry: TranscriptEntry = {
      id: Math.random().toString(36).substring(7),
      role: data.role,
      text: data.text,
      timestamp: new Date(),
      emotion: data.emotion,
      confidence: data.confidence,
    };

    setTranscript((prev) => [...prev, entry]);
  };

  /**
   * Play audio chunk
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
   * Start waveform animation
   */
  const startWaveformAnimation = () => {
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

      setWaveformData(barData);

      if (status !== 'idle') {
        requestAnimationFrame(animate);
      }
    };

    animate();
  };

  /**
   * Toggle mute
   */
  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  /**
   * Format duration
   */
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Get emotion icon
   */
  const getEmotionIcon = (emotion?: string) => {
    switch (emotion) {
      case 'happy':
        return <Smile className="w-4 h-4 text-green-400" />;
      case 'sad':
        return <Frown className="w-4 h-4 text-blue-400" />;
      case 'neutral':
        return <Meh className="w-4 h-4 text-stone-500" />;
      default:
        return null;
    }
  };

  /**
   * Load available voices
   */
  useEffect(() => {
    const loadVoices = async () => {
      try {
        const response = await fetch(`${apiUrl}/voices/${config.ttsProvider}`);
        const data = await response.json();
        setAvailableVoices(data.voices || []);
      } catch (error) {
        console.error('Failed to load voices:', error);
      }
    };

    loadVoices();
  }, [apiUrl, config.ttsProvider]);

  /**
   * Auto-scroll transcript
   */
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

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

  const isActive = status !== 'idle';

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-stone-50 via-stone-50 to-stone-50 text-stone-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white/50 backdrop-blur-sm border-b border-stone-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600/20 rounded-xl">
            <Radio className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Voice Chat</h1>
            <p className="text-sm text-stone-500">
              {isActive ? 'Connected' : 'Ready to connect'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Network Quality */}
          {isActive && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-100/50 rounded-lg">
              {networkQuality === 'excellent' ? (
                <Wifi className="w-4 h-4 text-green-400" />
              ) : networkQuality === 'good' ? (
                <Wifi className="w-4 h-4 text-yellow-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-400" />
              )}
              <span className="text-xs">{networkQuality}</span>
            </div>
          )}

          {/* Call Duration */}
          {isActive && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-100/50 rounded-lg">
              <Clock className="w-4 h-4 text-stone-500" />
              <span className="text-sm font-mono">{formatDuration(callDuration)}</span>
            </div>
          )}

          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            disabled={isActive}
            className={clsx(
              'p-2 rounded-lg transition-colors',
              isActive
                ? 'bg-stone-100/30 text-stone-400 cursor-not-allowed'
                : 'bg-stone-100 hover:bg-stone-200'
            )}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 overflow-hidden">
        {/* Status Indicator */}
        <div className="mb-8">
          <div
            className={clsx(
              'text-center mb-4 transition-opacity',
              status === 'idle' && 'opacity-50'
            )}
          >
            <p className="text-lg font-medium">
              {status === 'idle' && 'Ready to start'}
              {status === 'connecting' && 'Connecting...'}
              {status === 'connected' && 'Listening...'}
              {status === 'listening' && 'Processing your voice...'}
              {status === 'thinking' && 'Thinking...'}
              {status === 'speaking' && 'Speaking...'}
              {status === 'error' && 'Connection error'}
            </p>
            {metrics.totalTurns > 0 && (
              <p className="text-sm text-stone-500 mt-1">
                {metrics.totalTurns} {metrics.totalTurns === 1 ? 'turn' : 'turns'} • Latency:{' '}
                {metrics.latency}ms
              </p>
            )}
          </div>
        </div>

        {/* Waveform Visualization */}
        <div className="w-full max-w-2xl mb-8">
          <div className="flex items-end justify-center gap-1 h-32">
            {waveformData.map((value, index) => (
              <div
                key={index}
                className={clsx(
                  'flex-1 rounded-full transition-all duration-75',
                  status === 'listening' || status === 'speaking'
                    ? 'bg-gradient-to-t from-indigo-600 to-indigo-400'
                    : 'bg-stone-200'
                )}
                style={{
                  height: `${Math.max(4, value * 100)}%`,
                  opacity: status === 'idle' ? 0.3 : 1,
                }}
              />
            ))}
          </div>
        </div>

        {/* Main Action Button */}
        <div className="mb-8">
          {!isActive ? (
            <button
              onClick={startSession}
              className="group relative w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-teal-500 hover:from-indigo-400 hover:to-teal-500 transition-all duration-300 shadow-2xl shadow-indigo-500/50 hover:shadow-indigo-500/70 active:scale-95"
            >
              <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse" />
              <Phone className="w-12 h-12 text-stone-900 mx-auto" />
              <p className="text-sm font-medium mt-2">Start Call</p>
            </button>
          ) : (
            <button
              onClick={endSession}
              className="group relative w-32 h-32 rounded-full bg-gradient-to-br from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 transition-all duration-300 shadow-2xl shadow-red-500/50 hover:shadow-red-500/70 active:scale-95"
            >
              <PhoneOff className="w-12 h-12 text-stone-900 mx-auto" />
              <p className="text-sm font-medium mt-2">End Call</p>
            </button>
          )}
        </div>

        {/* Control Buttons */}
        {isActive && (
          <div className="flex items-center gap-4">
            <button
              onClick={toggleMute}
              className={clsx(
                'p-4 rounded-full transition-all',
                isMuted
                  ? 'bg-red-600 hover:bg-red-500'
                  : 'bg-stone-100 hover:bg-stone-200'
              )}
            >
              {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </button>

            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="p-4 rounded-full bg-stone-100 hover:bg-stone-200 transition-all"
            >
              <MessageSquare className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>

      {/* Transcript Panel */}
      {showTranscript && transcript.length > 0 && (
        <div className="h-64 border-t border-stone-200 bg-white/50 backdrop-blur-sm overflow-hidden flex flex-col">
          <div className="px-6 py-3 border-b border-stone-200 flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Transcript
            </h3>
            <button
              onClick={() => setShowTranscript(false)}
              className="text-stone-500 hover:text-stone-900"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto scroll-container px-6 py-4 space-y-3">
            {transcript.map((entry) => (
              <div
                key={entry.id}
                className={clsx(
                  'flex gap-3 p-3 rounded-xl',
                  entry.role === 'user'
                    ? 'bg-indigo-600/20 ml-8'
                    : 'bg-stone-100/50 mr-8'
                )}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-stone-500">
                      {entry.role === 'user' ? 'You' : 'AI'}
                    </span>
                    <span className="text-xs text-stone-400">
                      {entry.timestamp.toLocaleTimeString()}
                    </span>
                    {entry.confidence !== undefined && entry.confidence < 0.8 && (
                      <span className="text-xs text-yellow-400">Low confidence</span>
                    )}
                    {config.enableEmotionDetection && entry.emotion && (
                      <span className="flex items-center gap-1">
                        {getEmotionIcon(entry.emotion)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm">{entry.text}</p>
                </div>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && !isActive && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-2xl w-full max-h-[80vh] overflow-y-auto scroll-container">
            <div className="p-6 border-b border-stone-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Voice Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-stone-100 rounded-lg"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* TTS Provider */}
              <div>
                <label className="block text-sm font-medium mb-2">Voice Provider</label>
                <select
                  value={config.ttsProvider}
                  onChange={(e) =>
                    setConfig({ ...config, ttsProvider: e.target.value as any })
                  }
                  className="w-full px-4 py-2 bg-stone-100 rounded-lg border border-stone-200 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="openai">OpenAI</option>
                  <option value="elevenlabs">ElevenLabs</option>
                  <option value="playht">PlayHT</option>
                </select>
              </div>

              {/* Voice Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Voice</label>
                <select
                  value={config.voice}
                  onChange={(e) => setConfig({ ...config, voice: e.target.value })}
                  className="w-full px-4 py-2 bg-stone-100 rounded-lg border border-stone-200 focus:border-indigo-500 focus:outline-none"
                >
                  {availableVoices.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name}
                      {voice.description && ` - ${voice.description}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Languages className="w-4 h-4" />
                  Language
                </label>
                <select
                  value={config.language}
                  onChange={(e) => setConfig({ ...config, language: e.target.value })}
                  className="w-full px-4 py-2 bg-stone-100 rounded-lg border border-stone-200 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="it">Italian</option>
                  <option value="pt">Portuguese</option>
                  <option value="ja">Japanese</option>
                  <option value="ko">Korean</option>
                  <option value="zh">Chinese</option>
                </select>
              </div>

              {/* Response Style */}
              <div>
                <label className="block text-sm font-medium mb-2">Response Style</label>
                <select
                  value={config.responseStyle}
                  onChange={(e) =>
                    setConfig({ ...config, responseStyle: e.target.value as any })
                  }
                  className="w-full px-4 py-2 bg-stone-100 rounded-lg border border-stone-200 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="concise">Concise (Quick responses)</option>
                  <option value="conversational">Conversational (Natural flow)</option>
                  <option value="detailed">Detailed (Thorough explanations)</option>
                </select>
              </div>

              {/* Interrupt Sensitivity */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Interrupt Sensitivity
                </label>
                <select
                  value={config.interruptSensitivity}
                  onChange={(e) =>
                    setConfig({ ...config, interruptSensitivity: e.target.value as any })
                  }
                  className="w-full px-4 py-2 bg-stone-100 rounded-lg border border-stone-200 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="low">Low (Finish responses)</option>
                  <option value="medium">Medium (Balanced)</option>
                  <option value="high">High (Quick interrupts)</option>
                </select>
              </div>

              {/* System Prompt */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Custom Instructions (Optional)
                </label>
                <textarea
                  value={config.systemPrompt || ''}
                  onChange={(e) =>
                    setConfig({ ...config, systemPrompt: e.target.value })
                  }
                  placeholder="E.g., Act as a friendly tutor who explains things simply..."
                  rows={3}
                  className="w-full px-4 py-2 bg-stone-100 rounded-lg border border-stone-200 focus:border-indigo-500 focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {status === 'connecting' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium">Connecting...</p>
            <p className="text-sm text-stone-500 mt-2">Setting up voice session</p>
          </div>
        </div>
      )}
    </div>
  );
}
