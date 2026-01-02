'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Paperclip,
  Mic,
  MicOff,
  Image,
  Code,
  FileText,
  Sparkles,
  ChevronDown,
  Copy,
  Check,
  RefreshCw,
  StopCircle,
  Menu,
  Plus,
  Settings,
  X,
} from 'lucide-react';
import clsx from 'clsx';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
  artifact?: Artifact;
  isStreaming?: boolean;
};

type Attachment = {
  id: string;
  type: 'image' | 'file' | 'code';
  name: string;
  url?: string;
  content?: string;
};

type Artifact = {
  id: string;
  type: 'code' | 'document' | 'diagram';
  title: string;
  content: string;
  language?: string;
};

type Model = {
  id: string;
  name: string;
  provider: 'anthropic' | 'openai' | 'google';
  icon: string;
};

const MODELS: Model[] = [
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic', icon: '🟣' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'anthropic', icon: '🟣' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'anthropic', icon: '🟣' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', icon: '🟢' },
  { id: 'gemini-pro', name: 'Gemini Pro', provider: 'google', icon: '🔵' },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    // Create assistant message placeholder for streaming
    const assistantId = crypto.randomUUID();
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    }]);

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          model: selectedModel.id,
          stream: true,
        }),
      });

      if (!response.ok) throw new Error('Chat failed');

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                fullContent += data.content;
                setMessages(prev => prev.map(m =>
                  m.id === assistantId ? { ...m, content: fullContent } : m
                ));
              }
              if (data.artifact) {
                setActiveArtifact(data.artifact);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, isStreaming: false } : m
      ));
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? {
          ...m,
          content: 'Sorry, something went wrong. Please try again.',
          isStreaming: false
        } : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const attachment: Attachment = {
          id: crypto.randomUUID(),
          type: file.type.startsWith('image/') ? 'image' : 'file',
          name: file.name,
          url: reader.result as string,
        };
        setAttachments(prev => [...prev, attachment]);
      };
      reader.readAsDataURL(file);
    });
  };

  const toggleVoice = () => {
    if (isRecording) {
      setIsRecording(false);
      // Stop speech recognition
    } else {
      setIsRecording(true);
      // Start speech recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join('');
          setInput(transcript);
        };

        recognition.onerror = () => setIsRecording(false);
        recognition.onend = () => setIsRecording(false);
        recognition.start();
      }
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="h-screen flex bg-slate-950">
      {/* Sidebar */}
      <div className={clsx(
        'fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 lg:relative lg:translate-x-0',
        showSidebar ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-slate-800">
            <button className="w-full btn-primary flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" />
              New Chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 scroll-container">
            <div className="text-sm text-slate-500 px-2 py-1">Today</div>
            {/* Conversation list would go here */}
            <div className="text-center py-8 text-slate-500 text-sm">
              No conversations yet
            </div>
          </div>
          <div className="p-4 border-t border-slate-800">
            <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 transition-colors">
              <Settings className="w-5 h-5 text-slate-400" />
              <span className="text-slate-300">Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-slate-900/80 backdrop-blur-lg border-b border-slate-800 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 hover:bg-slate-800 rounded-lg lg:hidden tap-target"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Model Selector */}
          <div className="relative">
            <button
              onClick={() => setShowModelSelector(!showModelSelector)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"
            >
              <span>{selectedModel.icon}</span>
              <span className="font-medium text-sm">{selectedModel.name}</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {showModelSelector && (
              <div className="absolute top-full mt-2 left-0 w-64 bg-slate-800 rounded-xl border border-slate-700 shadow-xl z-50 overflow-hidden">
                {MODELS.map(model => (
                  <button
                    key={model.id}
                    onClick={() => {
                      setSelectedModel(model);
                      setShowModelSelector(false);
                    }}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 transition-colors',
                      model.id === selectedModel.id && 'bg-slate-700'
                    )}
                  >
                    <span className="text-lg">{model.icon}</span>
                    <span>{model.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1" />

          <button className="p-2 hover:bg-slate-800 rounded-lg tap-target">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scroll-container">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center px-4">
              <div className="text-4xl mb-4">✨</div>
              <h2 className="text-2xl font-bold text-center mb-2">How can I help you today?</h2>
              <p className="text-slate-400 text-center max-w-md">
                I can help you with coding, writing, analysis, and more. Just ask!
              </p>
              <div className="grid grid-cols-2 gap-3 mt-8 w-full max-w-md">
                {[
                  { icon: Code, label: 'Write code' },
                  { icon: FileText, label: 'Create document' },
                  { icon: Image, label: 'Analyze image' },
                  { icon: Sparkles, label: 'Brainstorm' },
                ].map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    onClick={() => setInput(`Help me ${label.toLowerCase()}`)}
                    className="flex items-center gap-3 p-4 bg-slate-900 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors"
                  >
                    <Icon className="w-5 h-5 text-indigo-400" />
                    <span className="text-sm">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-4">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onCopy={copyToClipboard}
                  onArtifactClick={setActiveArtifact}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-800 bg-slate-900/80 backdrop-blur-lg p-4 pb-[calc(1rem+var(--safe-area-inset-bottom))]">
          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
              {attachments.map(att => (
                <div key={att.id} className="relative flex-shrink-0">
                  {att.type === 'image' ? (
                    <img src={att.url} alt={att.name} className="h-20 w-20 object-cover rounded-lg" />
                  ) : (
                    <div className="h-20 w-20 bg-slate-800 rounded-lg flex items-center justify-center">
                      <FileText className="w-8 h-8 text-slate-400" />
                    </div>
                  )}
                  <button
                    onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))}
                    className="absolute -top-2 -right-2 p-1 bg-slate-700 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <div className="flex-1 bg-slate-800 rounded-2xl border border-slate-700 focus-within:border-indigo-500 transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message..."
                rows={1}
                className="w-full bg-transparent px-4 py-3 resize-none focus:outline-none text-white placeholder:text-slate-500 max-h-48"
              />
              <div className="flex items-center gap-1 px-2 pb-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.txt,.md,.json,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors tap-target"
                >
                  <Paperclip className="w-5 h-5 text-slate-400" />
                </button>
                <button
                  onClick={toggleVoice}
                  className={clsx(
                    'p-2 rounded-lg transition-colors tap-target',
                    isRecording ? 'bg-red-500/20 text-red-400' : 'hover:bg-slate-700 text-slate-400'
                  )}
                >
                  {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              onClick={isLoading ? undefined : handleSend}
              disabled={isLoading && false}
              className={clsx(
                'p-3 rounded-xl transition-colors tap-target',
                isLoading
                  ? 'bg-red-500 hover:bg-red-600'
                  : input.trim() || attachments.length > 0
                    ? 'bg-indigo-600 hover:bg-indigo-500'
                    : 'bg-slate-700 text-slate-500'
              )}
            >
              {isLoading ? (
                <StopCircle className="w-5 h-5" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Artifact Panel */}
      {activeArtifact && (
        <div className="w-96 border-l border-slate-800 bg-slate-900 flex flex-col hidden lg:flex">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-medium">{activeArtifact.title}</h3>
            <button
              onClick={() => setActiveArtifact(null)}
              className="p-2 hover:bg-slate-800 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <pre className="text-sm font-mono bg-slate-950 p-4 rounded-lg overflow-x-auto">
              <code>{activeArtifact.content}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  onCopy,
  onArtifactClick,
}: {
  message: Message;
  onCopy: (text: string) => void;
  onArtifactClick: (artifact: Artifact) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await onCopy(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={clsx(
      'px-4 py-3 group',
      message.role === 'user' ? 'bg-slate-900/50' : ''
    )}>
      <div className="flex gap-3">
        <div className={clsx(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          message.role === 'user' ? 'bg-indigo-600' : 'bg-purple-600'
        )}>
          {message.role === 'user' ? 'U' : '✨'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">
              {message.role === 'user' ? 'You' : 'Assistant'}
            </span>
            <span className="text-xs text-slate-500">
              {message.timestamp.toLocaleTimeString()}
            </span>
          </div>

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex gap-2 mb-2">
              {message.attachments.map(att => (
                <div key={att.id}>
                  {att.type === 'image' && att.url && (
                    <img src={att.url} alt={att.name} className="max-h-60 rounded-lg" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="prose prose-invert prose-sm max-w-none">
            {message.isStreaming && !message.content ? (
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            ) : (
              <div className="whitespace-pre-wrap">{message.content}</div>
            )}
          </div>

          {/* Artifact */}
          {message.artifact && (
            <button
              onClick={() => onArtifactClick(message.artifact!)}
              className="mt-3 flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <Code className="w-4 h-4 text-indigo-400" />
              <span className="text-sm">{message.artifact.title}</span>
            </button>
          )}

          {/* Actions */}
          {message.role === 'assistant' && !message.isStreaming && (
            <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleCopy}
                className="p-1.5 hover:bg-slate-800 rounded transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-400" />
                )}
              </button>
              <button className="p-1.5 hover:bg-slate-800 rounded transition-colors">
                <RefreshCw className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
