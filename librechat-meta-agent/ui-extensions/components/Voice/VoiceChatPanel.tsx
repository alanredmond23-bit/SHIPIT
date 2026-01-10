'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
  Settings,
  X,
  Radio,
  Wifi,
  WifiOff,
  Clock,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Hand,
  Zap,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';
import { useVoiceChat, type VoiceConfig, type VoiceMessage } from '@/hooks/useVoiceChat';

export interface VoiceChatPanelProps {
  /** API base URL */
  apiUrl?: string;
  /** User ID */
  userId?: string;
  /** Initial configuration */
  initialConfig?: Partial<VoiceConfig>;
  /** Panel position */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Callback when session starts */
  onSessionStart?: (sessionId: string) => void;
  /** Callback when session ends */
  onSessionEnd?: (sessionId: string, metrics: any) => void;
  /** Callback when message is received */
  onMessage?: (message: VoiceMessage) => void;
  /** Custom class name */
  className?: string;
}

/**
 * VoiceChatPanel - Floating voice chat panel component
 * Features push-to-talk, hands-free mode, waveform visualization
 */
export function VoiceChatPanel({
  apiUrl = '/api/voice',
  userId = 'default-user',
  initialConfig,
  position = 'bottom-right',
  onSessionStart,
  onSessionEnd,
  onMessage,
  className,
}: VoiceChatPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const {
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
    startSession,
    endSession,
    toggleMute,
    toggleHandsFree,
    setPushToTalk,
    setConfig,
    clearMessages,
  } = useVoiceChat({
    apiUrl,
    userId,
    initialConfig,
    onSessionStart,
    onSessionEnd,
    onMessage,
  });

  const isActive = status !== 'idle' && status !== 'error' && status !== 'connecting';
  const isConnecting = status === 'connecting';

  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-scroll transcript
  useEffect(() => {
    if (showTranscript) {
      transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showTranscript]);

  // Collapsed floating button
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={clsx(
          'fixed z-50 p-4 rounded-full shadow-2xl transition-all duration-300',
          'hover:scale-110 active:scale-95',
          isActive
            ? 'bg-gradient-to-br from-blue-500 to-teal-500 animate-pulse'
            : 'bg-gradient-to-br from-teal-500 to-blue-500 hover:from-teal-400 hover:to-blue-400',
          positionClasses[position],
          className
        )}
        title={isActive ? 'Voice chat active' : 'Start voice chat'}
      >
        {isActive ? (
          <Radio className="w-6 h-6 text-white animate-pulse" />
        ) : (
          <Mic className="w-6 h-6 text-white" />
        )}

        {/* Active indicator ring */}
        {isActive && (
          <span className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping" />
        )}
      </button>
    );
  }

  return (
    <div
      className={clsx(
        'fixed z-50 w-80 bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden',
        'transition-all duration-300',
        positionClasses[position],
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-teal-500 to-blue-500">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-white" />
          <span className="font-semibold text-white">Voice Chat</span>
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <>
              {/* Network quality */}
              {networkQuality === 'excellent' ? (
                <Wifi className="w-4 h-4 text-green-200" />
              ) : networkQuality === 'good' ? (
                <Wifi className="w-4 h-4 text-yellow-200" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-200" />
              )}
              {/* Duration */}
              <span className="text-xs text-white/80 font-mono">
                {formatDuration(callDuration)}
              </span>
            </>
          )}
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Status indicator */}
      <div className="px-4 py-2 bg-stone-50 border-b border-stone-100">
        <div className="flex items-center justify-between">
          <span className="text-sm text-stone-600">
            {status === 'idle' && 'Ready to start'}
            {isConnecting && 'Connecting...'}
            {status === 'connected' && (isHandsFree ? 'Listening...' : 'Hold space to talk')}
            {status === 'listening' && 'Processing...'}
            {status === 'processing' && 'Thinking...'}
            {status === 'speaking' && 'Speaking...'}
            {status === 'error' && 'Connection error'}
          </span>
          {metrics.totalTurns > 0 && (
            <span className="text-xs text-stone-400">
              {metrics.totalTurns} turns
            </span>
          )}
        </div>
      </div>

      {/* Waveform visualization */}
      <div className="px-4 py-3 bg-stone-50">
        <div className="flex items-end justify-center gap-0.5 h-12">
          {waveformData.values.map((value, index) => (
            <div
              key={index}
              className={clsx(
                'w-1 rounded-full transition-all duration-75',
                status === 'listening' || status === 'speaking'
                  ? 'bg-gradient-to-t from-teal-500 to-blue-500'
                  : isPushToTalk
                  ? 'bg-gradient-to-t from-blue-500 to-teal-500'
                  : 'bg-stone-200'
              )}
              style={{
                height: `${Math.max(4, value * 100)}%`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Transcript */}
      {showTranscript && messages.length > 0 && (
        <div className="max-h-40 overflow-y-auto border-t border-stone-100">
          <div className="p-3 space-y-2">
            {messages.slice(-5).map((message) => (
              <div
                key={message.id}
                className={clsx(
                  'text-xs p-2 rounded-lg',
                  message.role === 'user'
                    ? 'bg-blue-50 text-blue-900 ml-4'
                    : 'bg-stone-100 text-stone-700 mr-4'
                )}
              >
                <span className="font-medium">
                  {message.role === 'user' ? 'You' : 'AI'}:
                </span>{' '}
                {message.text}
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="p-4 bg-white border-t border-stone-100">
        {/* Main action button */}
        <div className="flex justify-center mb-4">
          {!isActive ? (
            <button
              onClick={startSession}
              disabled={isConnecting}
              className={clsx(
                'w-16 h-16 rounded-full flex items-center justify-center transition-all',
                'bg-gradient-to-br from-teal-500 to-blue-500 hover:from-teal-400 hover:to-blue-400',
                'shadow-lg hover:shadow-xl active:scale-95',
                isConnecting && 'opacity-75 cursor-wait'
              )}
            >
              {isConnecting ? (
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              ) : (
                <Phone className="w-8 h-8 text-white" />
              )}
            </button>
          ) : (
            <button
              onClick={endSession}
              className={clsx(
                'w-16 h-16 rounded-full flex items-center justify-center transition-all',
                'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-400 hover:to-red-500',
                'shadow-lg hover:shadow-xl active:scale-95'
              )}
            >
              <PhoneOff className="w-8 h-8 text-white" />
            </button>
          )}
        </div>

        {/* Secondary controls */}
        {isActive && (
          <div className="flex items-center justify-center gap-3">
            {/* Mute toggle */}
            <button
              onClick={toggleMute}
              className={clsx(
                'p-3 rounded-full transition-all',
                isMuted
                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              )}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>

            {/* Hands-free toggle */}
            <button
              onClick={toggleHandsFree}
              className={clsx(
                'p-3 rounded-full transition-all',
                isHandsFree
                  ? 'bg-teal-100 text-teal-600 hover:bg-teal-200'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              )}
              title={isHandsFree ? 'Switch to push-to-talk' : 'Switch to hands-free'}
            >
              {isHandsFree ? (
                <Zap className="w-5 h-5" />
              ) : (
                <Hand className="w-5 h-5" />
              )}
            </button>

            {/* Volume toggle (AI responses) */}
            <button
              onClick={toggleMute}
              className={clsx(
                'p-3 rounded-full transition-all',
                'bg-stone-100 text-stone-600 hover:bg-stone-200'
              )}
              title="Toggle AI voice"
            >
              <Volume2 className="w-5 h-5" />
            </button>

            {/* Transcript toggle */}
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className={clsx(
                'p-3 rounded-full transition-all',
                showTranscript
                  ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              )}
              title={showTranscript ? 'Hide transcript' : 'Show transcript'}
            >
              <MessageSquare className="w-5 h-5" />
            </button>

            {/* Settings */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={clsx(
                'p-3 rounded-full transition-all',
                'bg-stone-100 text-stone-600 hover:bg-stone-200'
              )}
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Push-to-talk indicator */}
        {isActive && !isHandsFree && (
          <div className="mt-3 text-center">
            <div
              className={clsx(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                isPushToTalk
                  ? 'bg-blue-500 text-white'
                  : 'bg-stone-100 text-stone-500'
              )}
            >
              <span className={clsx(
                'w-2 h-2 rounded-full',
                isPushToTalk ? 'bg-white animate-pulse' : 'bg-stone-400'
              )} />
              {isPushToTalk ? 'Recording...' : 'Hold SPACE to talk'}
            </div>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="border-t border-stone-100 p-4 bg-stone-50 max-h-60 overflow-y-auto">
          <div className="space-y-4">
            {/* Voice Provider */}
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Voice Provider
              </label>
              <select
                value={config.ttsProvider}
                onChange={(e) => setConfig({ ttsProvider: e.target.value as any })}
                disabled={isActive}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="openai">OpenAI</option>
                <option value="elevenlabs">ElevenLabs</option>
                <option value="playht">PlayHT</option>
              </select>
            </div>

            {/* Voice Selection */}
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Voice
              </label>
              <select
                value={config.voice}
                onChange={(e) => setConfig({ voice: e.target.value })}
                disabled={isActive}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="alloy">Alloy</option>
                <option value="echo">Echo</option>
                <option value="fable">Fable</option>
                <option value="onyx">Onyx</option>
                <option value="nova">Nova</option>
                <option value="shimmer">Shimmer</option>
              </select>
            </div>

            {/* Response Style */}
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Response Style
              </label>
              <select
                value={config.responseStyle}
                onChange={(e) => setConfig({ responseStyle: e.target.value as any })}
                disabled={isActive}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="concise">Concise</option>
                <option value="conversational">Conversational</option>
                <option value="detailed">Detailed</option>
              </select>
            </div>

            {/* Clear messages button */}
            {messages.length > 0 && (
              <button
                onClick={clearMessages}
                className="w-full px-3 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              >
                Clear Transcript
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default VoiceChatPanel;
