'use client';

import React, { useState } from 'react';
import { UnifiedNav, MainContent } from '@/components/Navigation/UnifiedNav';
import { VoiceChat } from '@/components/Voice';
import { VoiceChatPanel } from '@/components/Voice/VoiceChatPanel';
import { useVoiceChat, type VoiceMessage, type VoiceMetrics } from '@/hooks/useVoiceChat';
import {
  Radio,
  MessageSquare,
  Clock,
  Activity,
  Volume2,
  Mic,
  History,
  Trash2,
  Download,
  ChevronDown,
} from 'lucide-react';
import clsx from 'clsx';

/**
 * Voice Chat Page with Message History
 * Connects VoiceChat to main chat API with transcript display
 */
export default function VoicePage() {
  const [viewMode, setViewMode] = useState<'full' | 'panel'>('full');
  const [messageHistory, setMessageHistory] = useState<VoiceMessage[]>([]);
  const [sessionMetrics, setSessionMetrics] = useState<VoiceMetrics | null>(null);
  const [sessions, setSessions] = useState<Array<{
    id: string;
    startTime: Date;
    endTime?: Date;
    messages: VoiceMessage[];
    metrics?: VoiceMetrics;
  }>>([]);
  const [showHistory, setShowHistory] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/voice';

  const handleSessionStart = (sessionId: string) => {
    console.log('Voice session started:', sessionId);
    setSessions(prev => [...prev, {
      id: sessionId,
      startTime: new Date(),
      messages: [],
    }]);
  };

  const handleSessionEnd = (sessionId: string, metrics: VoiceMetrics) => {
    console.log('Voice session ended:', sessionId, metrics);
    setSessionMetrics(metrics);
    setSessions(prev => prev.map(session =>
      session.id === sessionId
        ? { ...session, endTime: new Date(), metrics, messages: messageHistory }
        : session
    ));
  };

  const handleMessage = (message: VoiceMessage) => {
    setMessageHistory(prev => [...prev, message]);
  };

  const clearHistory = () => {
    setMessageHistory([]);
    setSessionMetrics(null);
  };

  const exportTranscript = () => {
    const transcript = messageHistory
      .map(m => `[${m.timestamp.toLocaleTimeString()}] ${m.role === 'user' ? 'You' : 'AI'}: ${m.text}`)
      .join('\n');

    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice-transcript-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <UnifiedNav />
      <MainContent>
        <div className="h-[calc(100vh-3.5rem)] lg:h-screen overflow-hidden bg-stone-50">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-stone-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-500/20 rounded-xl">
                <Radio className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-stone-900">Voice Chat</h1>
                <p className="text-sm text-stone-500">
                  Real-time voice conversations with AI
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* View mode toggle */}
              <div className="flex bg-stone-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('full')}
                  className={clsx(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                    viewMode === 'full'
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-500 hover:text-stone-700'
                  )}
                >
                  Full View
                </button>
                <button
                  onClick={() => setViewMode('panel')}
                  className={clsx(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                    viewMode === 'panel'
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-500 hover:text-stone-700'
                  )}
                >
                  Floating Panel
                </button>
              </div>

              {/* History toggle */}
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                  showHistory
                    ? 'bg-teal-100 text-teal-700'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                )}
              >
                <History className="w-4 h-4" />
                <span className="text-sm font-medium">History</span>
              </button>
            </div>
          </div>

          <div className="flex h-[calc(100%-4rem)] overflow-hidden">
            {/* Main content area */}
            <div className={clsx(
              'flex-1 overflow-hidden transition-all duration-300',
              showHistory ? 'pr-80' : ''
            )}>
              {viewMode === 'full' ? (
                <VoiceChat
                  apiUrl={apiUrl}
                  userId="demo-user"
                  initialConfig={{
                    ttsProvider: 'openai',
                    voice: 'alloy',
                    language: 'en',
                    responseStyle: 'conversational',
                    interruptSensitivity: 'medium',
                  }}
                  onSessionStart={handleSessionStart}
                  onSessionEnd={handleSessionEnd}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8">
                  <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Mic className="w-8 h-8 text-teal-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-stone-900 mb-2">
                      Floating Voice Panel
                    </h2>
                    <p className="text-stone-500 mb-6">
                      The voice chat is available as a floating panel in the bottom right corner.
                      Click the microphone button to start.
                    </p>
                    <div className="space-y-3 text-left bg-stone-100 rounded-xl p-4">
                      <p className="text-sm text-stone-600">
                        <strong>Features:</strong>
                      </p>
                      <ul className="text-sm text-stone-500 space-y-2">
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
                          Push-to-talk (hold SPACE)
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
                          Hands-free mode toggle
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
                          Real-time waveform visualization
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
                          Live transcript display
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Message History Sidebar */}
            {showHistory && (
              <div className="w-80 bg-white border-l border-stone-200 flex flex-col fixed right-0 top-[3.5rem] lg:top-0 h-[calc(100%-3.5rem)] lg:h-full z-40">
                <div className="p-4 border-b border-stone-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-stone-900 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Voice Message History
                    </h3>
                    <button
                      onClick={() => setShowHistory(false)}
                      className="p-1 hover:bg-stone-100 rounded transition-colors lg:hidden"
                    >
                      <ChevronDown className="w-4 h-4 text-stone-500" />
                    </button>
                  </div>

                  {/* Session metrics */}
                  {sessionMetrics && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-stone-50 rounded-lg p-2">
                        <div className="text-stone-400">Turns</div>
                        <div className="font-semibold text-stone-900">
                          {sessionMetrics.totalTurns}
                        </div>
                      </div>
                      <div className="bg-stone-50 rounded-lg p-2">
                        <div className="text-stone-400">Latency</div>
                        <div className="font-semibold text-stone-900">
                          {sessionMetrics.latency}ms
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="px-4 py-2 border-b border-stone-100 flex items-center gap-2">
                  <button
                    onClick={exportTranscript}
                    disabled={messageHistory.length === 0}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export
                  </button>
                  <button
                    onClick={clearHistory}
                    disabled={messageHistory.length === 0}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messageHistory.length === 0 ? (
                    <div className="text-center text-stone-400 py-8">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No messages yet</p>
                      <p className="text-xs mt-1">Start a voice session to see the transcript</p>
                    </div>
                  ) : (
                    messageHistory.map((message) => (
                      <div
                        key={message.id}
                        className={clsx(
                          'p-3 rounded-xl text-sm',
                          message.role === 'user'
                            ? 'bg-teal-50 text-teal-900 ml-4'
                            : 'bg-stone-100 text-stone-700 mr-4'
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-xs">
                            {message.role === 'user' ? 'You' : 'AI'}
                          </span>
                          <span className="text-xs opacity-50">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                          {message.confidence && message.confidence < 0.8 && (
                            <span className="text-xs text-yellow-600">
                              (low confidence)
                            </span>
                          )}
                        </div>
                        <p>{message.text}</p>
                        {message.emotion && (
                          <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-white/50 rounded-full">
                            {message.emotion}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Previous sessions */}
                {sessions.filter(s => s.endTime).length > 0 && (
                  <div className="border-t border-stone-200 p-4">
                    <h4 className="text-xs font-medium text-stone-400 mb-2">
                      Previous Sessions
                    </h4>
                    <div className="space-y-2">
                      {sessions.filter(s => s.endTime).slice(-3).map((session) => (
                        <div
                          key={session.id}
                          className="p-2 bg-stone-50 rounded-lg text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-stone-600">
                              {session.startTime.toLocaleTimeString()}
                            </span>
                            <span className="text-stone-400">
                              {session.messages.length} messages
                            </span>
                          </div>
                          {session.metrics && (
                            <div className="text-stone-400 mt-1">
                              {session.metrics.totalTurns} turns, {session.metrics.latency}ms latency
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Floating panel for panel mode */}
          {viewMode === 'panel' && (
            <VoiceChatPanel
              apiUrl={apiUrl}
              userId="demo-user"
              initialConfig={{
                ttsProvider: 'openai',
                voice: 'alloy',
                language: 'en',
                responseStyle: 'conversational',
                interruptSensitivity: 'medium',
              }}
              onSessionStart={handleSessionStart}
              onSessionEnd={handleSessionEnd}
              onMessage={handleMessage}
              position="bottom-right"
            />
          )}
        </div>
      </MainContent>
    </>
  );
}
