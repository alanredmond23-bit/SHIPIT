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
  Wifi,
  WifiOff,
  AlertCircle,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import clsx from 'clsx';
import { ConversationSidebar, ThinkingPanel } from '@/components/Chat';
import { ArtifactPanel } from '@/components/Artifacts';
import { useChatPersistence } from '@/hooks/useConversations';
import { useStreamingChat, getStatusDisplay } from '@/hooks/useStreamingChat';
import { useArtifacts } from '@/hooks/useArtifacts';
import type { ConnectionStatus, StreamingError, ThinkingStartEvent, ThinkingChunkEvent, ThinkingStopEvent } from '@/hooks/useStreamingChat';
import type { ChatMessage, ChatAttachment, ChatArtifact, ThinkingBlockData } from '@/types/conversations';
import type { ThinkingBlock } from '@/types/thinking';

// Types
type Attachment = ChatAttachment;
type Artifact = ChatArtifact;
type Message = ChatMessage;

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
  meta: { color: 'text-blue-500', bg: 'bg-blue-600/20', icon: '🦙' },
  mistral: { color: 'text-orange-400', bg: 'bg-orange-500/20', icon: '🌀' },
  xai: { color: 'text-gray-400', bg: 'bg-gray-500/20', icon: '✖️' },
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
  // Local UI state for current conversation messages
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [enabledTools, setEnabledTools] = useState<Set<string>>(new Set(['artifacts']));
  const [showTools, setShowTools] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [lastError, setLastError] = useState<StreamingError | null>(null);
  // Extended thinking state
  const [currentThinkingBlocks, setCurrentThinkingBlocks] = useState<ThinkingBlock[]>([]);
  const [thinkingStartTime, setThinkingStartTime] = useState<Date | null>(null);
  const [currentThinkingTokenCount, setCurrentThinkingTokenCount] = useState(0);
  const [showThinking, setShowThinking] = useState(true); // Global toggle for showing thinking

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Artifacts management hook
  const {
    artifacts,
    activeArtifact,
    selectedVersion,
    isPanelOpen,
    isFullscreen,
    addArtifact,
    updateArtifact,
    removeArtifact,
    selectArtifact,
    closeArtifact,
    openPanel,
    closePanel,
    togglePanel,
    toggleFullscreen,
    selectVersion,
    revertToVersion,
    clearAll,
  } = useArtifacts();

  // Streaming chat hook with reconnection and error handling
  const {
    status: connectionStatus,
    error: streamingError,
    isStreaming,
    isThinking,
    retryCount,
    streamChat,
    abort: abortStream,
    reset: resetStream,
  } = useStreamingChat({
    onContent: (chunk, fullContent) => {
      // Update the streaming message with new content
      if (streamingMessageId) {
        setLocalMessages(prev => prev.map(m =>
          m.id === streamingMessageId ? { ...m, content: fullContent } : m
        ));
      }
    },
    onArtifacts: (receivedArtifacts) => {
      // Add each received artifact to the artifacts panel
      receivedArtifacts.forEach((artifact) => {
        addArtifact({
          title: artifact.title || 'Untitled',
          content: artifact.content,
          type: artifact.type as any,
          language: artifact.language as any,
        });
      });
      // Open the panel if we received artifacts
      if (receivedArtifacts.length > 0) {
        openPanel();
      }
    },
    onError: (error) => {
      setLastError(error);
      setShowErrorToast(true);
      // Auto-hide toast after 5 seconds
      setTimeout(() => setShowErrorToast(false), 5000);
    },
    onComplete: (result) => {
      // Mark message as no longer streaming and save thinking blocks
      if (streamingMessageId) {
        setLocalMessages(prev => prev.map(m =>
          m.id === streamingMessageId ? {
            ...m,
            isStreaming: false,
            isThinking: false,
            thinkingBlocks: currentThinkingBlocks.length > 0 ? currentThinkingBlocks.map(b => ({
              id: b.id,
              content: b.content,
              timestamp: b.timestamp,
              tokenCount: b.tokenCount,
              durationMs: b.durationMs,
              isStreaming: false,
            })) : undefined,
          } : m
        ));
        setStreamingMessageId(null);
        // Reset thinking state
        setCurrentThinkingBlocks([]);
        setThinkingStartTime(null);
        setCurrentThinkingTokenCount(0);
      }
    },
    // Extended thinking callbacks
    onThinkingStart: (event: ThinkingStartEvent) => {
      const newBlock: ThinkingBlock = {
        id: event.blockId,
        content: '',
        timestamp: new Date(event.timestamp),
        tokenCount: 0,
        durationMs: 0,
        isStreaming: true,
      };
      setCurrentThinkingBlocks(prev => [...prev, newBlock]);
      setThinkingStartTime(new Date());
      setCurrentThinkingTokenCount(0);
      // Update message to show thinking
      if (streamingMessageId) {
        setLocalMessages(prev => prev.map(m =>
          m.id === streamingMessageId ? { ...m, isThinking: true, thinkingStartTime: new Date() } : m
        ));
      }
    },
    onThinking: (event: ThinkingChunkEvent, fullThinkingContent: string) => {
      setCurrentThinkingTokenCount(event.tokenCount);
      // Update the last thinking block with new content
      setCurrentThinkingBlocks(prev => {
        if (prev.length === 0) return prev;
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        updated[lastIndex] = {
          ...updated[lastIndex],
          content: fullThinkingContent,
          tokenCount: event.tokenCount,
        };
        return updated;
      });
    },
    onThinkingStop: (event: ThinkingStopEvent) => {
      // Finalize the last thinking block
      setCurrentThinkingBlocks(prev => {
        if (prev.length === 0) return prev;
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        updated[lastIndex] = {
          ...updated[lastIndex],
          tokenCount: event.tokenCount,
          durationMs: event.durationMs,
          isStreaming: false,
        };
        return updated;
      });
      // Update message thinking state
      if (streamingMessageId) {
        setLocalMessages(prev => prev.map(m =>
          m.id === streamingMessageId ? { ...m, isThinking: false, thinkingTokenCount: event.tokenCount } : m
        ));
      }
    },
  });

  // Chat persistence hook
  const {
    currentConversationId,
    conversations,
    messages: persistedMessages,
    isLoadingConversations,
    isLoadingMessages,
    isSaving,
    startNewConversation,
    loadConversation,
    saveUserMessage,
    saveAssistantMessage,
    updateTitle,
    deleteConversation,
    archive,
    pin,
    refreshConversations,
  } = useChatPersistence({
    modelId: selectedModel?.id,
    agentType: 'general',
  });

  // Sync persisted messages to local state when conversation loads
  useEffect(() => {
    if (!isLoadingMessages && persistedMessages.length > 0) {
      setLocalMessages(persistedMessages);
    }
  }, [persistedMessages, isLoadingMessages]);

  // Clear local messages when starting new conversation
  const handleNewConversation = useCallback(async () => {
    await startNewConversation();
    setLocalMessages([]);
  }, [startNewConversation]);

  // Load conversation and its messages
  const handleSelectConversation = useCallback(async (conversationId: string) => {
    await loadConversation(conversationId);
  }, [loadConversation]);

  // Handle rename conversation
  const handleRenameConversation = useCallback(async (id: string, title: string) => {
    if (id === currentConversationId) {
      await updateTitle(title);
    }
  }, [currentConversationId, updateTitle]);

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
  }, [localMessages]);

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
    if (isStreaming) return; // Prevent sending while streaming

    const userContent = input.trim();
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userContent,
      timestamp: new Date(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
      tools: Array.from(enabledTools),
    };

    // Add user message to local state immediately
    setLocalMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachments([]);

    // Save user message to database (creates conversation if needed)
    let conversationId: string;
    try {
      const result = await saveUserMessage(userContent, {
        tools: Array.from(enabledTools),
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      conversationId = result.conversationId;
    } catch (error) {
      console.error('Failed to save user message:', error);
      // Continue with chat even if save fails
      conversationId = currentConversationId || '';
    }

    // Create placeholder for assistant message
    const assistantId = crypto.randomUUID();
    setStreamingMessageId(assistantId);
    setLocalMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      model: selectedModel.name,
    }]);

    try {
      // Use the streaming hook with automatic reconnection
      const result = await streamChat({
        messages: [...localMessages, userMessage].map(m => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        })),
        model: selectedModel.id,
        stream: true,
      });

      // Handle the result
      if (result.error && !result.aborted) {
        // Update message with error state
        const errorMessage = result.error?.message || 'Unknown error';
        setLocalMessages(prev => prev.map(m =>
          m.id === assistantId ? {
            ...m,
            content: result.content || `Error: ${errorMessage}`,
            isStreaming: false,
          } : m
        ));
      } else if (result.aborted) {
        // User cancelled - keep partial content if any
        setLocalMessages(prev => prev.map(m =>
          m.id === assistantId ? {
            ...m,
            content: result.content || 'Message was cancelled.',
            isStreaming: false,
          } : m
        ));
      }

      // Save assistant message to database if we got content
      if (result.content && conversationId && !result.aborted) {
        try {
          await saveAssistantMessage(result.content, {
            model: selectedModel.id,
            usage: result.usage || undefined,
          });
        } catch (error) {
          console.error('Failed to save assistant message:', error);
        }
      }

    } catch (error) {
      console.error('Chat error:', error);
      setLocalMessages(prev => prev.map(m =>
        m.id === assistantId ? {
          ...m,
          content: 'Sorry, something went wrong. Please try again.',
          isStreaming: false
        } : m
      ));
    } finally {
      setStreamingMessageId(null);
    }
  };

  // Handle stop/cancel streaming
  const handleStop = useCallback(() => {
    if (isStreaming) {
      abortStream();
    }
  }, [isStreaming, abortStream]);

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
    <div className="h-screen flex bg-stone-100 dark:bg-stone-900">
      {/* Conversation Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        isLoading={isLoadingConversations}
        onNewConversation={handleNewConversation}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={deleteConversation}
        onArchiveConversation={archive}
        onPinConversation={pin}
        onRenameConversation={handleRenameConversation}
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
      />

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700 px-4 py-3 flex items-center gap-3 shadow-sm">
          <button onClick={() => setShowSidebar(!showSidebar)} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg lg:hidden text-stone-600 dark:text-stone-400">
            <Menu className="w-5 h-5" />
          </button>

          {/* Model Selector */}
          <div className="relative">
            <button
              onClick={() => setShowModelSelector(!showModelSelector)}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-stone-50 dark:bg-stone-700 hover:bg-stone-100 dark:hover:bg-stone-600 border border-stone-200 dark:border-stone-600 rounded-xl transition-all duration-200"
            >
              {selectedModel && (
                <>
                  <span className="text-lg">{PROVIDER_CONFIG[selectedModel.provider]?.icon || '🤖'}</span>
                  <span className="font-medium text-stone-900 dark:text-white">{selectedModel.name}</span>
                  {selectedModel.tier && TIER_CONFIG[selectedModel.tier] && (
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full', TIER_CONFIG[selectedModel.tier].color, 'bg-stone-100 dark:bg-stone-600')}>
                      {TIER_CONFIG[selectedModel.tier].label}
                    </span>
                  )}
                </>
              )}
              <ChevronDown className="w-4 h-4 text-stone-500" />
            </button>

            {/* Model Dropdown */}
            {showModelSelector && (
              <div className="absolute top-full mt-2 left-0 w-96 bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-xl z-50 overflow-hidden">
                {/* Search */}
                <div className="p-3 border-b border-stone-200 dark:border-stone-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Search models..."
                      value={modelSearchQuery}
                      onChange={(e) => setModelSearchQuery(e.target.value)}
                      className="w-full bg-stone-50 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-lg pl-10 pr-4 py-2 text-sm text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors"
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

          {/* Connection Status Indicator */}
          <ConnectionStatusIndicator
            status={connectionStatus}
            retryCount={retryCount}
          />

          {/* Saving indicator */}
          {isSaving && (
            <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
              <div className="w-3 h-3 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              Saving...
            </div>
          )}

          {/* Tools Toggle */}
          <button
            onClick={() => setShowTools(!showTools)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 border',
              enabledTools.size > 0
                ? 'bg-teal-50 dark:bg-teal-900/30 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300'
                : 'bg-stone-50 dark:bg-stone-700 border-stone-200 dark:border-stone-600 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-600'
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

          {/* Artifact Panel Toggle */}
          <button
            onClick={togglePanel}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 border',
              isPanelOpen
                ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                : 'bg-stone-50 dark:bg-stone-700 border-stone-200 dark:border-stone-600 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-600'
            )}
            title={isPanelOpen ? 'Hide artifacts panel' : 'Show artifacts panel'}
          >
            {isPanelOpen ? (
              <PanelRightClose className="w-4 h-4" />
            ) : (
              <PanelRightOpen className="w-4 h-4" />
            )}
            <span className="text-sm font-medium hidden sm:inline">Artifacts</span>
            {artifacts.length > 0 && (
              <span className={clsx(
                'px-1.5 py-0.5 text-white text-xs rounded-full',
                isPanelOpen ? 'bg-indigo-500' : 'bg-stone-500'
              )}>
                {artifacts.length}
              </span>
            )}
          </button>
        </header>

        {/* Tools Panel */}
        {showTools && (
          <div className="bg-white dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700 p-4 shadow-sm">
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
                        ? 'bg-stone-100 dark:bg-stone-700 border-stone-300 dark:border-stone-600 shadow-sm'
                        : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700'
                    )}
                  >
                    <Icon className={clsx('w-4 h-4', isEnabled ? tool.color : 'text-stone-400')} />
                    <span className={clsx('text-sm', isEnabled ? 'text-stone-900 dark:text-white' : 'text-stone-500 dark:text-stone-400')}>
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
          {isLoadingMessages ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-stone-500 dark:text-stone-400">Loading conversation...</p>
              </div>
            </div>
          ) : localMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center px-4">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-3xl bg-teal-500 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-12 h-12 text-white" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center shadow-md">
                  <Zap className="w-4 h-4 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-center mb-3 text-stone-900 dark:text-white">
                How can I help you today?
              </h2>
              <p className="text-stone-500 dark:text-stone-400 text-center max-w-lg mb-8">
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
                    className="group flex flex-col items-center gap-3 p-5 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 rounded-2xl transition-all duration-200 shadow-sm"
                  >
                    <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center shadow-md', color)}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-stone-600 dark:text-stone-400 group-hover:text-stone-900 dark:group-hover:text-white transition-colors">
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
              <div className="max-w-4xl mx-auto py-6 px-4">
              {localMessages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onCopy={copyToClipboard}
                  onArtifactClick={(artifact) => {
                    // Add the artifact if it's not already in the list, then select it
                    const existingArtifact = artifacts.find(a =>
                      a.title === artifact.title && a.content === artifact.content
                    );
                    if (existingArtifact) {
                      selectArtifact(existingArtifact.id);
                    } else {
                      addArtifact({
                        title: artifact.title || 'Untitled',
                        content: artifact.content,
                        type: artifact.type as any,
                        language: artifact.language as any,
                      });
                    }
                    openPanel();
                  }}
                  // Pass thinking props for the currently streaming message
                  thinkingBlocks={message.id === streamingMessageId ? currentThinkingBlocks : undefined}
                  isThinkingActive={message.id === streamingMessageId ? isThinking : false}
                  thinkingStartTime={message.id === streamingMessageId ? thinkingStartTime : null}
                  currentThinkingTokenCount={message.id === streamingMessageId ? currentThinkingTokenCount : 0}
                  showThinking={showThinking}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-4 shadow-lg">
          <div className="max-w-4xl mx-auto">
            {/* Attachments Preview */}
            {attachments.length > 0 && (
              <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                {attachments.map(att => (
                  <div key={att.id} className="relative flex-shrink-0 group">
                    {att.type === 'image' ? (
                      <img src={att.url} alt={att.name} className="h-20 w-20 object-cover rounded-xl border border-stone-200 dark:border-stone-600" />
                    ) : (
                      <div className="h-20 w-20 bg-stone-100 dark:bg-stone-700 rounded-xl border border-stone-200 dark:border-stone-600 flex items-center justify-center">
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
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-100 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-lg text-xs"
                    >
                      <Icon className={clsx('w-3 h-3', tool.color)} />
                      <span className="text-stone-600 dark:text-stone-400">{tool.name}</span>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Input Box */}
            <div className="flex items-end gap-3">
              <div className="flex-1 bg-stone-50 dark:bg-stone-700 rounded-2xl border border-stone-200 dark:border-stone-600 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20 transition-all duration-200">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message Meta Agent..."
                  rows={1}
                  className="w-full bg-transparent px-4 py-3.5 resize-none focus:outline-none text-stone-900 dark:text-white placeholder:text-stone-400 max-h-48"
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
                      className="p-2 hover:bg-stone-200 dark:hover:bg-stone-600 rounded-lg transition-colors"
                      title="Attach files"
                    >
                      <Paperclip className="w-5 h-5 text-stone-500" />
                    </button>
                    <button
                      onClick={toggleVoice}
                      className={clsx(
                        'p-2 rounded-lg transition-colors',
                        isRecording ? 'bg-red-100 dark:bg-red-900/30 text-red-500' : 'hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-500'
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
                onClick={isStreaming ? handleStop : handleSend}
                disabled={!isStreaming && !input.trim() && attachments.length === 0}
                className={clsx(
                  'p-4 rounded-xl transition-all duration-200 shadow-md text-white',
                  isStreaming
                    ? 'bg-red-500 hover:bg-red-600'
                    : input.trim() || attachments.length > 0
                      ? 'bg-teal-500 hover:bg-teal-600'
                      : 'bg-stone-300 dark:bg-stone-600 text-stone-500 dark:text-stone-400 cursor-not-allowed'
                )}
                title={isStreaming ? 'Stop generation' : 'Send message'}
              >
                {isStreaming ? (
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

      {/* Error Toast */}
      <ErrorToast
        error={lastError}
        show={showErrorToast}
        onDismiss={() => setShowErrorToast(false)}
        onRetry={lastError?.retryable ? handleSend : undefined}
      />

      {/* Artifact Panel - Split Pane */}
      <ArtifactPanel
        artifacts={artifacts}
        activeArtifact={activeArtifact}
        selectedVersion={selectedVersion}
        isOpen={isPanelOpen}
        isFullscreen={isFullscreen}
        onClose={closePanel}
        onSelectArtifact={selectArtifact}
        onCloseArtifact={closeArtifact}
        onRemoveArtifact={removeArtifact}
        onToggleFullscreen={toggleFullscreen}
        onSelectVersion={selectVersion}
        onRevertToVersion={revertToVersion}
      />
    </div>
  );
}

// Connection Status Indicator Component
function ConnectionStatusIndicator({
  status,
  retryCount,
}: {
  status: ConnectionStatus;
  retryCount: number;
}) {
  const { text, color, pulse } = getStatusDisplay(status);

  // Only show for relevant states
  if (status === 'idle') return null;

  const getIcon = () => {
    switch (status) {
      case 'connecting':
      case 'reconnecting':
        return <Loader2 className={clsx('w-3.5 h-3.5', color, pulse && 'animate-spin')} />;
      case 'connected':
      case 'streaming':
        return <Wifi className={clsx('w-3.5 h-3.5', color)} />;
      case 'disconnected':
        return <WifiOff className={clsx('w-3.5 h-3.5', color)} />;
      case 'error':
        return <AlertCircle className={clsx('w-3.5 h-3.5', color)} />;
      default:
        return null;
    }
  };

  return (
    <div className={clsx(
      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
      status === 'streaming' && 'bg-teal-500/10 border border-teal-500/20',
      status === 'reconnecting' && 'bg-amber-500/10 border border-amber-500/20',
      status === 'error' && 'bg-red-500/10 border border-red-500/20',
      status === 'connected' && 'bg-green-500/10 border border-green-500/20',
      status === 'connecting' && 'bg-blue-500/10 border border-blue-500/20',
    )}>
      {getIcon()}
      <span className={color}>{text}</span>
      {retryCount > 0 && status === 'reconnecting' && (
        <span className="text-amber-400">
          (attempt {retryCount})
        </span>
      )}
    </div>
  );
}

// Error Toast Component
function ErrorToast({
  error,
  show,
  onDismiss,
  onRetry,
}: {
  error: StreamingError | null;
  show: boolean;
  onDismiss: () => void;
  onRetry?: () => void;
}) {
  if (!show || !error) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-3 px-4 py-3 bg-red-500/95 text-white rounded-xl shadow-lg backdrop-blur-sm max-w-md">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{error.message}</p>
          {error.retryable && (
            <p className="text-xs text-red-200 mt-0.5">This error may be temporary. You can try again.</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {error.retryable && onRetry && (
            <button
              onClick={onRetry}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              title="Retry"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onDismiss}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
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
        isSelected ? 'bg-teal-50 dark:bg-teal-900/30 border border-teal-300 dark:border-teal-700' : 'hover:bg-stone-100 dark:hover:bg-stone-700'
      )}
    >
      <span className="text-lg">{PROVIDER_CONFIG[model.provider]?.icon || '🤖'}</span>
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className={clsx('font-medium text-sm', isSelected ? 'text-teal-700 dark:text-teal-300' : 'text-stone-700 dark:text-stone-300')}>
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
          <p className="text-xs text-stone-500 dark:text-stone-400 truncate">{model.description}</p>
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
  thinkingBlocks,
  isThinkingActive,
  thinkingStartTime,
  currentThinkingTokenCount,
  showThinking,
}: {
  message: Message;
  onCopy: (text: string) => void;
  onArtifactClick: (artifact: Artifact) => void;
  thinkingBlocks?: ThinkingBlock[];
  isThinkingActive?: boolean;
  thinkingStartTime?: Date | null;
  currentThinkingTokenCount?: number;
  showThinking?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await onCopy(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Determine if we should show the thinking panel
  const hasThinkingContent = (thinkingBlocks && thinkingBlocks.length > 0) ||
    (message.thinkingBlocks && message.thinkingBlocks.length > 0) ||
    isThinkingActive;

  // Get thinking blocks - use passed props for streaming, or message data for completed
  const displayThinkingBlocks: ThinkingBlock[] = thinkingBlocks && thinkingBlocks.length > 0
    ? thinkingBlocks
    : (message.thinkingBlocks || []).map(b => ({
        id: b.id,
        content: b.content,
        timestamp: new Date(b.timestamp),
        tokenCount: b.tokenCount,
        durationMs: b.durationMs,
        isStreaming: b.isStreaming,
      }));

  return (
    <div className={clsx('mb-6 group', message.role === 'user' ? 'pl-12' : 'pr-12')}>
      <div className={clsx(
        'flex gap-4',
        message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
      )}>
        {/* Avatar */}
        <div className={clsx(
          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md',
          message.role === 'user'
            ? 'bg-teal-500'
            : 'bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600'
        )}>
          {message.role === 'user' ? (
            <span className="text-white font-medium">U</span>
          ) : (
            <Sparkles className="w-5 h-5 text-teal-500" />
          )}
        </div>

        {/* Content */}
        <div className={clsx('flex-1 min-w-0', message.role === 'user' ? 'text-right' : 'text-left')}>
          {/* Thinking Panel - shown above the message for assistant messages */}
          {message.role === 'assistant' && showThinking !== false && hasThinkingContent && (
            <div className="mb-3">
              <ThinkingPanel
                thinkingBlocks={displayThinkingBlocks}
                isThinking={isThinkingActive || message.isThinking || false}
                thinkingStartTime={thinkingStartTime || message.thinkingStartTime || null}
                currentTokenCount={currentThinkingTokenCount || message.thinkingTokenCount || 0}
                defaultExpanded={false}
                maxHeight="400px"
              />
            </div>
          )}

          <div className={clsx(
            'inline-block max-w-full',
            message.role === 'user'
              ? 'bg-teal-500 text-white rounded-2xl rounded-tr-md px-4 py-3 shadow-md'
              : 'bg-white dark:bg-stone-800 rounded-2xl rounded-tl-md px-4 py-3 border border-stone-200 dark:border-stone-700 shadow-sm'
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
                message.role === 'user' ? 'prose-invert' : 'prose-stone dark:prose-invert'
              )}>
                {message.content}
              </div>
            )}
          </div>

          {/* Artifact */}
          {message.artifact && (
            <button
              onClick={() => onArtifactClick(message.artifact!)}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors shadow-sm"
            >
              <Code2 className="w-4 h-4 text-teal-500" />
              <span className="text-sm text-stone-700 dark:text-stone-300">{message.artifact.title}</span>
            </button>
          )}

          {/* Actions */}
          {message.role === 'assistant' && !message.isStreaming && (
            <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleCopy}
                className="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors"
                title="Copy"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-stone-400" />
                )}
              </button>
              <button className="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors" title="Regenerate">
                <RefreshCw className="w-4 h-4 text-stone-400" />
              </button>
              <button className="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors" title="Good response">
                <ThumbsUp className="w-4 h-4 text-stone-400" />
              </button>
              <button className="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors" title="Bad response">
                <ThumbsDown className="w-4 h-4 text-stone-400" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
