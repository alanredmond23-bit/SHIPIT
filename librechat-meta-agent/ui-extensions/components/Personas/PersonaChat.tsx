'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  User,
  Loader2,
  MoreVertical,
  Trash2,
  Copy,
  RefreshCw,
  ChevronDown,
  MessageSquare,
  Heart,
  GitFork,
  Settings,
  Info,
  Code,
  Search,
  Image as ImageIcon,
  FileText,
  Mic,
  Monitor,
  CheckCircle2,
} from 'lucide-react';
import clsx from 'clsx';

/**
 * Persona Chat - Chat interface for interacting with a custom persona
 *
 * Features:
 * - Persona info header with avatar
 * - Starter prompt buttons
 * - Standard chat interface with streaming
 * - Capability indicators
 * - Message actions (copy, regenerate)
 * - Conversation management
 */

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Persona {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  avatar_url: string | null;
  creator_id: string;
  personality: {
    tone: string;
    verbosity: string;
    creativity: number;
  };
  capabilities: {
    web_search: boolean;
    code_execution: boolean;
    image_generation: boolean;
    file_analysis: boolean;
    voice_chat: boolean;
    computer_use: boolean;
  };
  starter_prompts: string[];
  stats: {
    conversations_count: number;
    messages_count: number;
    likes_count: number;
    forks_count: number;
  };
}

interface PersonaChatProps {
  personaId: string;
  userId: string;
  apiUrl?: string;
  onClose?: () => void;
}

export default function PersonaChat({
  personaId,
  userId,
  apiUrl = '/api/personas',
  onClose,
}: PersonaChatProps) {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load persona
  useEffect(() => {
    loadPersona();
    checkLikeStatus();
  }, [personaId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const loadPersona = async () => {
    try {
      const response = await fetch(`${apiUrl}/${personaId}`);
      const { data } = await response.json();
      setPersona(data);
    } catch (err) {
      console.error('Failed to load persona:', err);
      setError('Failed to load persona');
    }
  };

  const checkLikeStatus = async () => {
    try {
      const response = await fetch(`${apiUrl}/${personaId}/liked?user_id=${userId}`);
      const { data } = await response.json();
      setIsLiked(data.liked);
    } catch (err) {
      console.error('Failed to check like status:', err);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isStreaming) return;

    const userMessage: Message = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsStreaming(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/${personaId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          message: content.trim(),
          conversation_id: conversationId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      let assistantMessage: Message = {
        id: Math.random().toString(36).substring(7),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'chunk') {
                assistantMessage.content += data.data;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { ...assistantMessage };
                  return updated;
                });
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      // Remove the empty assistant message if there was an error
      setMessages((prev) => prev.filter((m) => m.content !== ''));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleStarterPrompt = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleLike = async () => {
    try {
      const response = await fetch(`${apiUrl}/${personaId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });

      const { data } = await response.json();
      setIsLiked(data.liked);
    } catch (err) {
      console.error('Failed to like persona:', err);
    }
  };

  const handleFork = async () => {
    try {
      const response = await fetch(`${apiUrl}/${personaId}/fork`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });

      if (response.ok) {
        alert('Persona forked successfully!');
      }
    } catch (err) {
      console.error('Failed to fork persona:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputMessage);
    }
  };

  if (!persona) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  const getCapabilityIcon = (capability: string) => {
    switch (capability) {
      case 'web_search':
        return <Search className="w-3.5 h-3.5" />;
      case 'code_execution':
        return <Code className="w-3.5 h-3.5" />;
      case 'image_generation':
        return <ImageIcon className="w-3.5 h-3.5" />;
      case 'file_analysis':
        return <FileText className="w-3.5 h-3.5" />;
      case 'voice_chat':
        return <Mic className="w-3.5 h-3.5" />;
      case 'computer_use':
        return <Monitor className="w-3.5 h-3.5" />;
      default:
        return null;
    }
  };

  const enabledCapabilities = Object.entries(persona.capabilities)
    .filter(([_, enabled]) => enabled)
    .map(([key]) => key);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center overflow-hidden">
              {persona.avatar_url ? (
                <img src={persona.avatar_url} alt={persona.name} className="w-full h-full object-cover" />
              ) : (
                <Sparkles className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <h1 className="text-lg font-semibold">{persona.name}</h1>
              <p className="text-sm text-slate-400 line-clamp-1">{persona.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Capabilities Badge */}
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-1">
                {enabledCapabilities.slice(0, 3).map((cap) => (
                  <span key={cap} className="text-indigo-400">
                    {getCapabilityIcon(cap)}
                  </span>
                ))}
                {enabledCapabilities.length > 3 && (
                  <span className="text-xs text-slate-400">+{enabledCapabilities.length - 3}</span>
                )}
              </div>
              <ChevronDown className={clsx('w-4 h-4 transition-transform', showInfo && 'rotate-180')} />
            </button>

            {/* Like Button */}
            <button
              onClick={handleLike}
              className={clsx(
                'p-2 rounded-lg transition-colors',
                isLiked
                  ? 'text-red-400 bg-red-500/20 hover:bg-red-500/30'
                  : 'hover:bg-slate-800'
              )}
            >
              <Heart className={clsx('w-5 h-5', isLiked && 'fill-current')} />
            </button>

            {/* Fork Button */}
            <button
              onClick={handleFork}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <GitFork className="w-5 h-5" />
            </button>

            {/* Close Button */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Info Panel */}
        {showInfo && (
          <div className="px-6 py-4 border-t border-slate-800 bg-slate-800/30">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Capabilities */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 mb-2">CAPABILITIES</h3>
                <div className="flex flex-wrap gap-1">
                  {enabledCapabilities.map((cap) => (
                    <span
                      key={cap}
                      className="flex items-center gap-1 px-2 py-1 bg-indigo-500/20 text-indigo-400 text-xs rounded-full"
                    >
                      {getCapabilityIcon(cap)}
                      <span className="capitalize">{cap.replace('_', ' ')}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Personality */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 mb-2">PERSONALITY</h3>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tone:</span>
                    <span className="capitalize">{persona.personality.tone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Style:</span>
                    <span className="capitalize">{persona.personality.verbosity}</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 mb-2">STATS</h3>
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                    <span>{persona.stats.conversations_count} chats</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="w-3.5 h-3.5 text-slate-400" />
                    <span>{persona.stats.likes_count} likes</span>
                  </div>
                </div>
              </div>

              {/* Category */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 mb-2">CATEGORY</h3>
                <span className="inline-block px-3 py-1 bg-slate-700 rounded-full text-sm capitalize">
                  {persona.category}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 scroll-container">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6">
              {persona.avatar_url ? (
                <img src={persona.avatar_url} alt={persona.name} className="w-full h-full object-cover rounded-full" />
              ) : (
                <Sparkles className="w-10 h-10 text-white" />
              )}
            </div>
            <h2 className="text-2xl font-bold mb-2">Chat with {persona.name}</h2>
            <p className="text-slate-400 text-center max-w-md mb-8">
              {persona.description}
            </p>

            {/* Starter Prompts */}
            {persona.starter_prompts.length > 0 && (
              <div className="w-full max-w-2xl">
                <p className="text-sm text-slate-400 mb-3">Try these prompts:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {persona.starter_prompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => handleStarterPrompt(prompt)}
                      className="px-4 py-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500 rounded-xl transition-all text-left text-sm group"
                    >
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                        <span className="group-hover:text-indigo-400 transition-colors">{prompt}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={clsx(
                  'flex gap-4',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    {persona.avatar_url ? (
                      <img src={persona.avatar_url} alt={persona.name} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-white" />
                    )}
                  </div>
                )}

                <div
                  className={clsx(
                    'group relative max-w-[70%] rounded-2xl px-4 py-3',
                    message.role === 'user'
                      ? 'bg-indigo-600'
                      : 'bg-slate-800/50 border border-slate-700'
                  )}
                >
                  <div className="prose prose-invert prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>

                  {/* Message Actions */}
                  <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1">
                      <button
                        onClick={() => handleCopyMessage(message.content)}
                        className="p-1 hover:bg-slate-700 rounded"
                        title="Copy"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                    <span>{message.timestamp.toLocaleTimeString()}</span>
                  </div>
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}

            {isStreaming && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="px-6 py-3 bg-red-500/10 border-t border-red-500/30">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-slate-800 bg-slate-900/50 backdrop-blur-sm px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${persona.name}...`}
              rows={1}
              disabled={isStreaming}
              className="w-full px-4 py-3 pr-12 bg-slate-800 rounded-xl border border-slate-700 focus:border-indigo-500 focus:outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                minHeight: '52px',
                maxHeight: '200px',
              }}
            />
            <button
              onClick={() => handleSendMessage(inputMessage)}
              disabled={!inputMessage.trim() || isStreaming}
              className={clsx(
                'absolute right-2 bottom-2 p-2 rounded-lg transition-all',
                inputMessage.trim() && !isStreaming
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              )}
            >
              {isStreaming ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
