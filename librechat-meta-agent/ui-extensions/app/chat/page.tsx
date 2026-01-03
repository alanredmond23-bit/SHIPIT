'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Paperclip,
  Mic,
  MicOff,
  Globe,
  Code2,
  ImageIcon,
  BrainCircuit,
  Wand2,
  FileSearch,
  Calculator,
  Terminal,
  ChevronDown,
  Copy,
  Check,
  RefreshCw,
  StopCircle,
  Menu,
  Plus,
  Settings,
  X,
  Sparkles,
  Zap,
  Crown,
  Gauge,
  Search,
  MoreHorizontal,
  ThumbsUp,
  ThumbsDown,
  Share,
  Bookmark,
  Cpu,
  Bot,
} from 'lucide-react';
import clsx from 'clsx';

// Types
type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
  artifact?: Artifact;
  isStreaming?: boolean;
  model?: string;
  tools?: string[];
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
  provider: string;
  description?: string;
  context_window?: number;
  supports_vision?: boolean;
  tier?: string;
};

type Tool = {
  id: string;
  name: string;
  icon: any;
  description: string;
  color: string;
};

// Available tools
const TOOLS: Tool[] = [
  { id: 'web_search', name: 'Web Search', icon: Globe, description: 'Search the internet', color: 'text-blue-400' },
  { id: 'code_interpreter', name: 'Code', icon: Code2, description: 'Execute Python code', color: 'text-green-400' },
  { id: 'image_gen', name: 'Create Image', icon: ImageIcon, description: 'Generate images', color: 'text-pink-400' },
  { id: 'deep_research', name: 'Deep Research', icon: BrainCircuit, description: 'In-depth analysis', color: 'text-purple-400' },
  { id: 'file_search', name: 'Analyze Files', icon: FileSearch, description: 'Search documents', color: 'text-yellow-400' },
  { id: 'calculator', name: 'Math', icon: Calculator, description: 'Complex calculations', color: 'text-cyan-400' },
  { id: 'computer_use', name: 'Computer Use', icon: Terminal, description: 'Control desktop', color: 'text-orange-400' },
  { id: 'artifacts', name: 'Artifacts', icon: Wand2, description: 'Create documents', color: 'text-indigo-400' },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

// Provider colors and icons - Teal accent theme
const PROVIDER_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  anthropic: { color: 'text-teal-400', bg: 'bg-teal-500/20', icon: '🟠' },
  openai: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', icon: '🟢' },
  google: { color: 'text-blue-400', bg: 'bg-blue-500/20', icon: '🔵' },
  deepseek: { color: 'text-purple-400', bg: 'bg-purple-500/20', icon: '🟣' },
};

const TIER_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  flagship: { label: 'Flagship', icon: Crown, color: 'text-amber-400' },
  balanced: { label: 'Balanced', icon: Zap, color: 'text-blue-400' },
  fast: { label: 'Fast', icon: Gauge, color: 'text-green-400' },
  reasoning: { label: 'Reasoning', icon: BrainCircuit, color: 'text-purple-400' },
  legacy: { label: 'Legacy', icon: Bot, color: 'text-stone-500' },
  specialized: { label: 'Specialized', icon: Cpu, color: 'text-cyan-400' },
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);
  const [enabledTools, setEnabledTools] = useState<Set<string>>(new Set(['artifacts']));
  const [showTools, setShowTools] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch models from API
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/models`);
        const data = await response.json();
        if (data.data) {
          setModels(data.data);
          // Set default to Claude Opus 4.5 or first available
          const defaultModel = data.data.find((m: Model) => m.id.includes('opus-4-5')) || data.data[0];
          setSelectedModel(defaultModel);
        }
      } catch (error) {
        console.error('Failed to fetch models:', error);
      }
    };
    fetchModels();
  }, []);

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

  const toggleTool = (toolId: string) => {
    setEnabledTools(prev => {
      const newSet = new Set(prev);
      if (newSet.has(toolId)) {
        newSet.delete(toolId);
      } else {
        newSet.add(toolId);
      }
      return newSet;
    });
  };

  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return;
    if (!selectedModel) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
      tools: Array.from(enabledTools),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    const assistantId = crypto.randomUUID();
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      model: selectedModel.name,
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
          tools: Array.from(enabledTools),
        }),
      });

      if (!response.ok) throw new Error('Chat failed');

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
            } catch (e) {}
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
    setIsRecording(!isRecording);
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  // Group models by provider
  const groupedModels = models.reduce((acc, model) => {
    const provider = model.provider || 'other';
    if (!acc[provider]) acc[provider] = [];
    acc[provider].push(model);
    return acc;
  }, {} as Record<string, Model[]>);

  // Filter models by search
  const filteredModels = modelSearchQuery
    ? models.filter(m =>
        m.name.toLowerCase().includes(modelSearchQuery.toLowerCase()) ||
        m.id.toLowerCase().includes(modelSearchQuery.toLowerCase())
      )
    : null;

  return (
    <div className="h-screen flex bg-stone-100">
      {/* Sidebar */}
      <div className={clsx(
        'fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-stone-200 transform transition-transform duration-300 lg:relative lg:translate-x-0 shadow-soft',
        showSidebar ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-stone-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center shadow-soft">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-stone-900">Meta Agent</h1>
                <p className="text-xs text-stone-500">AI Orchestrator</p>
              </div>
            </div>
            <button className="w-full py-3 px-4 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-soft">
              <Plus className="w-5 h-5" />
              New Chat
            </button>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto p-3 scroll-container">
            <div className="text-xs font-medium text-stone-400 px-2 py-2 uppercase tracking-wider">Recent</div>
            <div className="space-y-1">
              {['Code review assistant', 'API design discussion', 'Debug React hooks'].map((title, i) => (
                <button
                  key={i}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-stone-100 transition-colors text-sm text-stone-700 truncate"
                >
                  {title}
                </button>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div className="p-3 border-t border-stone-200">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-stone-100 transition-colors">
              <Settings className="w-5 h-5 text-stone-500" />
              <span className="text-stone-700">Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {showSidebar && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setShowSidebar(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-stone-200 px-4 py-3 flex items-center gap-3 shadow-soft">
          <button onClick={() => setShowSidebar(!showSidebar)} className="p-2 hover:bg-stone-100 rounded-lg lg:hidden text-stone-600">
            <Menu className="w-5 h-5" />
          </button>

          {/* Model Selector */}
          <div className="relative">
            <button
              onClick={() => setShowModelSelector(!showModelSelector)}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl transition-all duration-200"
            >
              {selectedModel && (
                <>
                  <span className="text-lg">{PROVIDER_CONFIG[selectedModel.provider]?.icon || '🤖'}</span>
                  <span className="font-medium text-stone-900">{selectedModel.name}</span>
                  {selectedModel.tier && TIER_CONFIG[selectedModel.tier] && (
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full', TIER_CONFIG[selectedModel.tier].color, 'bg-stone-100')}>
                      {TIER_CONFIG[selectedModel.tier].label}
                    </span>
                  )}
                </>
              )}
              <ChevronDown className="w-4 h-4 text-stone-500" />
            </button>

            {/* Model Dropdown */}
            {showModelSelector && (
              <div className="absolute top-full mt-2 left-0 w-96 bg-white rounded-2xl border border-stone-200 shadow-card z-50 overflow-hidden">
                {/* Search */}
                <div className="p-3 border-b border-stone-200">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Search models..."
                      value={modelSearchQuery}
                      onChange={(e) => setModelSearchQuery(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg pl-10 pr-4 py-2 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors"
                    />
                  </div>
                </div>

                {/* Models List */}
                <div className="max-h-96 overflow-y-auto p-2">
                  {filteredModels ? (
                    // Search results
                    filteredModels.map(model => (
                      <ModelItem
                        key={model.id}
                        model={model}
                        isSelected={model.id === selectedModel?.id}
                        onClick={() => {
                          setSelectedModel(model);
                          setShowModelSelector(false);
                          setModelSearchQuery('');
                        }}
                      />
                    ))
                  ) : (
                    // Grouped by provider
                    Object.entries(groupedModels).map(([provider, providerModels]) => (
                      <div key={provider} className="mb-3">
                        <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-stone-500 uppercase tracking-wider">
                          <span>{PROVIDER_CONFIG[provider]?.icon || '🤖'}</span>
                          {provider}
                        </div>
                        {providerModels.map(model => (
                          <ModelItem
                            key={model.id}
                            model={model}
                            isSelected={model.id === selectedModel?.id}
                            onClick={() => {
                              setSelectedModel(model);
                              setShowModelSelector(false);
                            }}
                          />
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1" />

          {/* Tools Toggle */}
          <button
            onClick={() => setShowTools(!showTools)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 border',
              enabledTools.size > 0
                ? 'bg-teal-50 border-teal-300 text-teal-700'
                : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
            )}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Tools</span>
            {enabledTools.size > 0 && (
              <span className="px-1.5 py-0.5 bg-teal-500 text-white text-xs rounded-full">
                {enabledTools.size}
              </span>
            )}
          </button>
        </header>

        {/* Tools Panel */}
        {showTools && (
          <div className="bg-white border-b border-stone-200 p-4 shadow-soft">
            <div className="flex flex-wrap gap-2 max-w-4xl mx-auto">
              {TOOLS.map(tool => {
                const Icon = tool.icon;
                const isEnabled = enabledTools.has(tool.id);
                return (
                  <button
                    key={tool.id}
                    onClick={() => toggleTool(tool.id)}
                    className={clsx(
                      'flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 border',
                      isEnabled
                        ? 'bg-stone-100 border-stone-300 shadow-soft'
                        : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                    )}
                  >
                    <Icon className={clsx('w-4 h-4', isEnabled ? tool.color : 'text-stone-400')} />
                    <span className={clsx('text-sm', isEnabled ? 'text-stone-900' : 'text-stone-500')}>
                      {tool.name}
                    </span>
                    {isEnabled && <Check className="w-4 h-4 text-green-500" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scroll-container">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center px-4">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-3xl bg-teal-500 flex items-center justify-center shadow-card">
                  <Sparkles className="w-12 h-12 text-white" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center shadow-soft">
                  <Zap className="w-4 h-4 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-center mb-3 text-stone-900">
                How can I help you today?
              </h2>
              <p className="text-stone-500 text-center max-w-lg mb-8">
                I'm powered by {selectedModel?.name || 'multiple AI models'}. Toggle tools above to enable web search, code execution, image generation, and more.
              </p>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-2xl">
                {[
                  { icon: Code2, label: 'Write Code', prompt: 'Help me write a React component', color: 'bg-teal-500' },
                  { icon: Globe, label: 'Web Search', prompt: 'Search the web for the latest AI news', color: 'bg-blue-500' },
                  { icon: ImageIcon, label: 'Create Image', prompt: 'Generate an image of a sunset over mountains', color: 'bg-pink-500' },
                  { icon: BrainCircuit, label: 'Analyze', prompt: 'Help me analyze this problem', color: 'bg-purple-500' },
                ].map(({ icon: Icon, label, prompt, color }) => (
                  <button
                    key={label}
                    onClick={() => setInput(prompt)}
                    className="group flex flex-col items-center gap-3 p-5 bg-white hover:bg-stone-50 border border-stone-200 hover:border-stone-300 rounded-2xl transition-all duration-200 shadow-soft"
                  >
                    <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center shadow-soft', color)}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-stone-600 group-hover:text-stone-900 transition-colors">
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
              <div className="max-w-4xl mx-auto py-6 px-4">
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
        <div className="border-t border-stone-200 bg-white p-4 shadow-soft">
          <div className="max-w-4xl mx-auto">
            {/* Attachments Preview */}
            {attachments.length > 0 && (
              <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                {attachments.map(att => (
                  <div key={att.id} className="relative flex-shrink-0 group">
                    {att.type === 'image' ? (
                      <img src={att.url} alt={att.name} className="h-20 w-20 object-cover rounded-xl border border-stone-200" />
                    ) : (
                      <div className="h-20 w-20 bg-stone-100 rounded-xl border border-stone-200 flex items-center justify-center">
                        <FileSearch className="w-8 h-8 text-stone-400" />
                      </div>
                    )}
                    <button
                      onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))}
                      className="absolute -top-2 -right-2 p-1.5 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Enabled Tools Pills */}
            {enabledTools.size > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {Array.from(enabledTools).map(toolId => {
                  const tool = TOOLS.find(t => t.id === toolId);
                  if (!tool) return null;
                  const Icon = tool.icon;
                  return (
                    <span
                      key={toolId}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-100 border border-stone-200 rounded-lg text-xs"
                    >
                      <Icon className={clsx('w-3 h-3', tool.color)} />
                      <span className="text-stone-600">{tool.name}</span>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Input Box */}
            <div className="flex items-end gap-3">
              <div className="flex-1 bg-stone-50 rounded-2xl border border-stone-200 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20 transition-all duration-200">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message Meta Agent..."
                  rows={1}
                  className="w-full bg-transparent px-4 py-3.5 resize-none focus:outline-none text-stone-900 placeholder:text-stone-400 max-h-48"
                />
                <div className="flex items-center justify-between px-3 pb-3">
                  <div className="flex items-center gap-1">
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
                      className="p-2 hover:bg-stone-200 rounded-lg transition-colors"
                      title="Attach files"
                    >
                      <Paperclip className="w-5 h-5 text-stone-500" />
                    </button>
                    <button
                      onClick={toggleVoice}
                      className={clsx(
                        'p-2 rounded-lg transition-colors',
                        isRecording ? 'bg-red-100 text-red-500' : 'hover:bg-stone-200 text-stone-500'
                      )}
                      title="Voice input"
                    >
                      {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                  </div>
                  <div className="text-xs text-stone-400">
                    {selectedModel?.name}
                  </div>
                </div>
              </div>

              <button
                onClick={isLoading ? undefined : handleSend}
                className={clsx(
                  'p-4 rounded-xl transition-all duration-200 shadow-soft text-white',
                  isLoading
                    ? 'bg-red-500 hover:bg-red-600'
                    : input.trim() || attachments.length > 0
                      ? 'bg-teal-500 hover:bg-teal-600'
                      : 'bg-stone-300 text-stone-500'
                )}
              >
                {isLoading ? (
                  <StopCircle className="w-5 h-5" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>

            <p className="text-xs text-stone-400 text-center mt-3">
              Meta Agent can make mistakes. Consider verifying important information.
            </p>
          </div>
        </div>
      </div>

      {/* Artifact Panel */}
      {activeArtifact && (
        <div className="w-[480px] border-l border-stone-200 bg-white flex flex-col hidden lg:flex shadow-soft">
          <div className="p-4 border-b border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                <Code2 className="w-4 h-4 text-teal-600" />
              </div>
              <h3 className="font-medium text-stone-900">{activeArtifact.title}</h3>
            </div>
            <button onClick={() => setActiveArtifact(null)} className="p-2 hover:bg-stone-100 rounded-lg text-stone-500">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4 bg-stone-50">
            <pre className="text-sm font-mono bg-stone-900 text-stone-100 p-4 rounded-xl overflow-x-auto border border-stone-200">
              <code>{activeArtifact.content}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// Model Item Component
function ModelItem({ model, isSelected, onClick }: { model: Model; isSelected: boolean; onClick: () => void }) {
  const tier = model.tier ? TIER_CONFIG[model.tier] : null;
  const TierIcon = tier?.icon;

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
        isSelected ? 'bg-teal-50 border border-teal-300' : 'hover:bg-stone-100'
      )}
    >
      <span className="text-lg">{PROVIDER_CONFIG[model.provider]?.icon || '🤖'}</span>
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className={clsx('font-medium text-sm', isSelected ? 'text-teal-700' : 'text-stone-700')}>
            {model.name}
          </span>
          {tier && TierIcon && (
            <span className={clsx('flex items-center gap-1 text-xs', tier.color)}>
              <TierIcon className="w-3 h-3" />
              {tier.label}
            </span>
          )}
        </div>
        {model.description && (
          <p className="text-xs text-stone-500 truncate">{model.description}</p>
        )}
      </div>
      {model.supports_vision && (
        <span title="Supports vision">
          <ImageIcon className="w-4 h-4 text-stone-400" />
        </span>
      )}
    </button>
  );
}

// Message Bubble Component
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
    <div className={clsx('mb-6 group', message.role === 'user' ? 'pl-12' : 'pr-12')}>
      <div className={clsx(
        'flex gap-4',
        message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
      )}>
        {/* Avatar */}
        <div className={clsx(
          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-soft',
          message.role === 'user'
            ? 'bg-teal-500'
            : 'bg-white border border-stone-200'
        )}>
          {message.role === 'user' ? (
            <span className="text-white font-medium">U</span>
          ) : (
            <Sparkles className="w-5 h-5 text-teal-500" />
          )}
        </div>

        {/* Content */}
        <div className={clsx('flex-1 min-w-0', message.role === 'user' ? 'text-right' : 'text-left')}>
          <div className={clsx(
            'inline-block max-w-full',
            message.role === 'user'
              ? 'bg-teal-500 text-white rounded-2xl rounded-tr-md px-4 py-3 shadow-soft'
              : 'bg-white rounded-2xl rounded-tl-md px-4 py-3 border border-stone-200 shadow-soft'
          )}>
            {/* Model badge */}
            {message.role === 'assistant' && message.model && (
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-xs text-stone-400">{message.model}</span>
              </div>
            )}

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex gap-2 mb-3">
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
            {message.isStreaming && !message.content ? (
              <div className="flex gap-1 py-2">
                <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            ) : (
              <div className={clsx(
                'prose prose-sm max-w-none whitespace-pre-wrap',
                message.role === 'user' ? 'prose-invert' : 'prose-stone'
              )}>
                {message.content}
              </div>
            )}
          </div>

          {/* Artifact */}
          {message.artifact && (
            <button
              onClick={() => onArtifactClick(message.artifact!)}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors shadow-soft"
            >
              <Code2 className="w-4 h-4 text-teal-500" />
              <span className="text-sm text-stone-700">{message.artifact.title}</span>
            </button>
          )}

          {/* Actions */}
          {message.role === 'assistant' && !message.isStreaming && (
            <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleCopy}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
                title="Copy"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-stone-400" />
                )}
              </button>
              <button className="p-2 hover:bg-stone-100 rounded-lg transition-colors" title="Regenerate">
                <RefreshCw className="w-4 h-4 text-stone-400" />
              </button>
              <button className="p-2 hover:bg-stone-100 rounded-lg transition-colors" title="Good response">
                <ThumbsUp className="w-4 h-4 text-stone-400" />
              </button>
              <button className="p-2 hover:bg-stone-100 rounded-lg transition-colors" title="Bad response">
                <ThumbsDown className="w-4 h-4 text-stone-400" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
