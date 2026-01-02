'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Brain,
  Pause,
  Play,
  GitBranch,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Search,
  Target,
  HelpCircle,
  FileQuestion,
  Rocket,
  Zap,
  Star,
  BookmarkPlus,
  ChevronDown,
  ChevronRight,
  Activity,
  TrendingUp,
  Sparkles,
  Settings,
  Download,
  Maximize2,
} from 'lucide-react';
import clsx from 'clsx';

// ============================================================================
// Types
// ============================================================================

export type ThoughtType =
  | 'observation'
  | 'hypothesis'
  | 'analysis'
  | 'critique'
  | 'conclusion'
  | 'question'
  | 'evidence'
  | 'alternative'
  | 'synthesis';

export type SessionStatus = 'thinking' | 'paused' | 'completed' | 'error';

export interface ThoughtNode {
  id: string;
  parentId: string | null;
  sessionId: string;
  content: string;
  type: ThoughtType;
  confidence: number;
  depth: number;
  children: string[];
  metadata: {
    tokens: number;
    duration: number;
    model: string;
    timestamp: Date;
  };
  status: string;
  reasoning?: string;
  alternatives?: string[];
}

export interface ThinkingSession {
  id: string;
  userId: string | null;
  projectId: string;
  query: string;
  rootNodeId: string;
  currentNodeId: string;
  config: {
    maxTokens: number;
    maxDepth: number;
    maxBranches: number;
    minConfidenceThreshold: number;
    enableSelfCritique: boolean;
    enableParallelExploration: boolean;
    autoExpand: boolean;
    thinkingStyle: string;
    template?: string;
    model?: string;
  };
  status: SessionStatus;
  stats: {
    totalTokens: number;
    totalDuration: number;
    branchesExplored: number;
    revisionsCount: number;
    averageConfidence: number;
    confidenceProgression: number[];
    thoughtsByType: Record<ThoughtType, number>;
    maxDepthReached: number;
  };
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  finalConclusion?: string;
}

export interface ReasoningTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

const getTypeIcon = (type: ThoughtType) => {
  const iconMap: Record<ThoughtType, any> = {
    observation: Search,
    hypothesis: Lightbulb,
    analysis: Target,
    critique: AlertCircle,
    conclusion: CheckCircle2,
    question: HelpCircle,
    evidence: FileQuestion,
    alternative: GitBranch,
    synthesis: Sparkles,
  };
  return iconMap[type] || Brain;
};

const getTypeColor = (type: ThoughtType): string => {
  const colorMap: Record<ThoughtType, string> = {
    observation: 'blue',
    hypothesis: 'yellow',
    analysis: 'purple',
    critique: 'orange',
    conclusion: 'green',
    question: 'pink',
    evidence: 'cyan',
    alternative: 'indigo',
    synthesis: 'violet',
  };
  return colorMap[type] || 'gray';
};

const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 80) return 'green';
  if (confidence >= 60) return 'blue';
  if (confidence >= 40) return 'yellow';
  return 'orange';
};

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

// ============================================================================
// Tree Node Component
// ============================================================================

interface TreeNodeProps {
  node: ThoughtNode;
  allNodes: Map<string, ThoughtNode>;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: (nodeId: string) => void;
  onExpand: (nodeId: string) => void;
  onCritique: (nodeId: string) => void;
  onAlternatives: (nodeId: string) => void;
  onBookmark: (nodeId: string) => void;
  depth: number;
}

function TreeNode({
  node,
  allNodes,
  isActive,
  isExpanded,
  onToggle,
  onExpand,
  onCritique,
  onAlternatives,
  onBookmark,
  depth,
}: TreeNodeProps) {
  const hasChildren = node.children && node.children.length > 0;
  const Icon = getTypeIcon(node.type);
  const typeColor = getTypeColor(node.type);
  const confidenceColor = getConfidenceColor(node.confidence);

  return (
    <div className="relative">
      {/* Connection Line */}
      {depth > 0 && (
        <div className="absolute left-[-20px] top-0 w-[20px] h-[24px] border-l-2 border-b-2 border-slate-700 rounded-bl-lg" />
      )}

      {/* Node Card */}
      <div
        className={clsx(
          'relative rounded-xl border-2 transition-all duration-300',
          'hover:shadow-lg hover:scale-[1.02]',
          isActive && 'ring-4 ring-indigo-500/50 shadow-xl shadow-indigo-500/20',
          hasChildren && isExpanded && 'mb-4',
          {
            'bg-slate-800/50 border-slate-700': !isActive,
            'bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border-indigo-500': isActive,
          }
        )}
        style={{
          marginLeft: depth > 0 ? '40px' : '0',
          animation: isActive ? 'pulse-glow 2s ease-in-out infinite' : undefined,
        }}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-4">
          {/* Type Icon */}
          <div
            className={clsx(
              'flex-shrink-0 p-2 rounded-lg',
              `bg-${typeColor}-500/20 text-${typeColor}-400`
            )}
            style={{
              backgroundColor: `var(--${typeColor}-500-20)`,
              color: `var(--${typeColor}-400)`,
            }}
          >
            <Icon className="w-5 h-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Type & Confidence */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {node.type}
              </span>
              <div className="flex items-center gap-1">
                <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={clsx(
                      'h-full transition-all duration-500',
                      `bg-${confidenceColor}-500`
                    )}
                    style={{
                      width: `${node.confidence}%`,
                      backgroundColor: `var(--${confidenceColor}-500)`,
                    }}
                  />
                </div>
                <span className={clsx('text-xs font-bold', `text-${confidenceColor}-400`)}>
                  {node.confidence}%
                </span>
              </div>
            </div>

            {/* Thought Content */}
            <p className="text-sm text-slate-200 leading-relaxed mb-2">{node.content}</p>

            {/* Reasoning (if available) */}
            {node.reasoning && (
              <div className="text-xs text-slate-400 italic border-l-2 border-slate-600 pl-2 mb-2">
                {node.reasoning}
              </div>
            )}

            {/* Metadata */}
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>{node.metadata.tokens} tokens</span>
              <span>•</span>
              <span>{formatDuration(node.metadata.duration)}</span>
              <span>•</span>
              <span>Depth {node.depth}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1">
            <button
              onClick={() => onBookmark(node.id)}
              className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
              title="Bookmark"
            >
              <Star className="w-4 h-4 text-yellow-400" />
            </button>
            {hasChildren && (
              <button
                onClick={() => onToggle(node.id)}
                className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 px-4 pb-3 border-t border-slate-700/50 pt-3">
          <button
            onClick={() => onExpand(node.id)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-lg text-xs font-medium transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            Expand
          </button>
          <button
            onClick={() => onCritique(node.id)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 rounded-lg text-xs font-medium transition-colors"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Critique
          </button>
          <button
            onClick={() => onAlternatives(node.id)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg text-xs font-medium transition-colors"
          >
            <GitBranch className="w-3.5 h-3.5" />
            Alternatives
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="mt-4 space-y-4">
          {node.children.map((childId) => {
            const childNode = allNodes.get(childId);
            if (!childNode) return null;

            return (
              <TreeNode
                key={childId}
                node={childNode}
                allNodes={allNodes}
                isActive={false}
                isExpanded={isExpanded}
                onToggle={onToggle}
                onExpand={onExpand}
                onCritique={onCritique}
                onAlternatives={onAlternatives}
                onBookmark={onBookmark}
                depth={depth + 1}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export interface ExtendedThinkingProps {
  apiBaseUrl?: string;
  onComplete?: (conclusion: string) => void;
}

export default function ExtendedThinking({
  apiBaseUrl = '/api',
  onComplete,
}: ExtendedThinkingProps) {
  // State
  const [session, setSession] = useState<ThinkingSession | null>(null);
  const [nodes, setNodes] = useState<Map<string, ThoughtNode>>(new Map());
  const [templates, setTemplates] = useState<ReasoningTemplate[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [query, setQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [maxTokens, setMaxTokens] = useState(10000);
  const [maxDepth, setMaxDepth] = useState(10);
  const [thinkingStyle, setThinkingStyle] = useState<string>('thorough');

  const eventSourceRef = useRef<EventSource | null>(null);

  // Load templates on mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/thinking/templates`);
      const data = await response.json();
      setTemplates(data.data || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  // Start thinking session
  const startThinking = async () => {
    if (!query.trim()) {
      setError('Please enter a question');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/thinking/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          config: {
            maxTokens,
            maxDepth,
            thinkingStyle,
            template: selectedTemplate || undefined,
            autoExpand: true,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start thinking');
      }

      const data = await response.json();
      const newSession = data.data;
      setSession(newSession);

      // Load the tree
      await loadThoughtTree(newSession.id);

      // Start streaming updates
      startEventStream(newSession.id);

      // Auto-expand root node
      setExpandedNodes(new Set([newSession.rootNodeId]));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load thought tree
  const loadThoughtTree = async (sessionId: string) => {
    try {
      const response = await fetch(`${apiBaseUrl}/thinking/${sessionId}/tree`);
      const data = await response.json();
      const nodeMap = new Map<string, ThoughtNode>();

      data.data.forEach((node: ThoughtNode) => {
        nodeMap.set(node.id, node);
      });

      setNodes(nodeMap);
    } catch (err) {
      console.error('Failed to load tree:', err);
    }
  };

  // Start SSE stream
  const startEventStream = (sessionId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`${apiBaseUrl}/thinking/${sessionId}/stream`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'node_created') {
        // Add new node to tree
        setNodes((prev) => {
          const updated = new Map(prev);
          updated.set(data.nodeId, data.data);
          return updated;
        });

        // Auto-expand parent
        if (data.data.parentId) {
          setExpandedNodes((prev) => new Set([...prev, data.data.parentId]));
        }
      } else if (data.type === 'session_completed') {
        loadSession(sessionId);
        eventSource.close();

        if (data.data?.conclusion && onComplete) {
          onComplete(data.data.conclusion);
        }
      } else if (data.type === 'stream_end' || data.type === 'error') {
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      eventSourceRef.current = null;
    };

    eventSourceRef.current = eventSource;
  };

  // Load session
  const loadSession = async (sessionId: string) => {
    try {
      const response = await fetch(`${apiBaseUrl}/thinking/${sessionId}`);
      const data = await response.json();
      setSession(data.data);
    } catch (err) {
      console.error('Failed to load session:', err);
    }
  };

  // Expand thought
  const expandThought = async (nodeId: string) => {
    if (!session) return;

    try {
      const response = await fetch(`${apiBaseUrl}/thinking/${session.id}/expand`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node_id: nodeId, count: 1 }),
      });

      if (!response.ok) {
        throw new Error('Failed to expand thought');
      }

      await loadThoughtTree(session.id);
      await loadSession(session.id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Critique
  const critiqueThought = async (nodeId: string) => {
    if (!session) return;

    try {
      const response = await fetch(`${apiBaseUrl}/thinking/${session.id}/critique`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node_id: nodeId }),
      });

      if (!response.ok) {
        throw new Error('Failed to critique thought');
      }

      await loadThoughtTree(session.id);
      await loadSession(session.id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Explore alternatives
  const exploreAlternatives = async (nodeId: string) => {
    if (!session) return;

    try {
      const response = await fetch(`${apiBaseUrl}/thinking/${session.id}/alternatives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node_id: nodeId, count: 3 }),
      });

      if (!response.ok) {
        throw new Error('Failed to explore alternatives');
      }

      await loadThoughtTree(session.id);
      await loadSession(session.id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Bookmark
  const bookmarkThought = async (nodeId: string) => {
    if (!session) return;

    try {
      await fetch(`${apiBaseUrl}/thinking/${session.id}/bookmark/${nodeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      // Visual feedback
      alert('Thought bookmarked!');
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Toggle node expansion
  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const updated = new Set(prev);
      if (updated.has(nodeId)) {
        updated.delete(nodeId);
      } else {
        updated.add(nodeId);
      }
      return updated;
    });
  };

  // Pause/Resume
  const togglePause = async () => {
    if (!session) return;

    try {
      const endpoint =
        session.status === 'thinking'
          ? `${apiBaseUrl}/thinking/${session.id}/pause`
          : `${apiBaseUrl}/thinking/${session.id}/resume`;

      await fetch(endpoint, { method: 'POST' });
      await loadSession(session.id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Conclude
  const concludeThinking = async () => {
    if (!session) return;

    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/thinking/${session.id}/conclude`, {
        method: 'POST',
      });

      const data = await response.json();
      await loadSession(session.id);

      if (onComplete && data.data?.conclusion) {
        onComplete(data.data.conclusion);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Get root node
  const rootNode = session ? nodes.get(session.rootNodeId) : null;

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Extended Thinking Engine
              </h2>
              <p className="text-sm text-slate-400">Visual reasoning with confidence tracking</p>
            </div>
          </div>

          {session && (
            <div className="flex items-center gap-3">
              <button
                onClick={togglePause}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                {session.status === 'thinking' ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Resume</span>
                  </>
                )}
              </button>

              {session.status !== 'completed' && (
                <button
                  onClick={concludeThinking}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 rounded-lg transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Conclude</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Session Stats */}
        {session && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-6 pb-4">
            <div className="flex items-center gap-2 text-sm">
              <Activity className="w-4 h-4 text-indigo-400" />
              <span className="text-slate-400">Thoughts:</span>
              <span className="font-bold text-white">{session.stats.branchesExplored}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-slate-400">Avg Confidence:</span>
              <span className="font-bold text-white">
                {session.stats.averageConfidence.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-slate-400">Tokens:</span>
              <span className="font-bold text-white">
                {session.stats.totalTokens}/{session.config.maxTokens}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Target className="w-4 h-4 text-purple-400" />
              <span className="text-slate-400">Max Depth:</span>
              <span className="font-bold text-white">
                {session.stats.maxDepthReached}/{session.config.maxDepth}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {!session ? (
          /* Start Form */
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">Start Thinking Session</h3>

              {/* Query Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Your Question</label>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="What would you like to think about?"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={4}
                />
              </div>

              {/* Template Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Reasoning Template</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">No template (free-form)</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} - {t.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Config */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Max Tokens</label>
                  <input
                    type="number"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Max Depth</label>
                  <input
                    type="number"
                    value={maxDepth}
                    onChange={(e) => setMaxDepth(parseInt(e.target.value))}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Thinking Style</label>
                <select
                  value={thinkingStyle}
                  onChange={(e) => setThinkingStyle(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="thorough">Thorough</option>
                  <option value="fast">Fast</option>
                  <option value="creative">Creative</option>
                  <option value="analytical">Analytical</option>
                  <option value="methodical">Methodical</option>
                </select>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={startThinking}
                disabled={loading || !query.trim()}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-slate-700 disabled:to-slate-700 rounded-xl font-medium transition-all"
              >
                <Rocket className="w-5 h-5" />
                {loading ? 'Starting...' : 'Start Thinking'}
              </button>
            </div>

            {/* Features */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="card p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-indigo-500/20 rounded-lg">
                    <GitBranch className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Visual Thought Tree</h4>
                    <p className="text-sm text-slate-400">
                      See branching reasoning paths in real-time
                    </p>
                  </div>
                </div>
              </div>

              <div className="card p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Confidence Scoring</h4>
                    <p className="text-sm text-slate-400">Each thought has a confidence level</p>
                  </div>
                </div>
              </div>

              <div className="card p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-orange-500/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Self-Critique</h4>
                    <p className="text-sm text-slate-400">
                      Automatic review and revision of reasoning
                    </p>
                  </div>
                </div>
              </div>

              <div className="card p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Parallel Exploration</h4>
                    <p className="text-sm text-slate-400">
                      Explore multiple solution paths simultaneously
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Thought Tree */
          <div className="max-w-6xl mx-auto">
            {rootNode && (
              <TreeNode
                node={rootNode}
                allNodes={nodes}
                isActive={session.currentNodeId === rootNode.id}
                isExpanded={expandedNodes.has(rootNode.id)}
                onToggle={toggleNode}
                onExpand={expandThought}
                onCritique={critiqueThought}
                onAlternatives={exploreAlternatives}
                onBookmark={bookmarkThought}
                depth={0}
              />
            )}

            {/* Final Conclusion */}
            {session.finalConclusion && (
              <div className="mt-8 card p-6 bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-500/30">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <CheckCircle2 className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-green-400">Final Conclusion</h3>
                    <p className="text-sm text-slate-400">
                      Synthesized from {session.stats.branchesExplored} thoughts
                    </p>
                  </div>
                </div>
                <div className="prose prose-invert max-w-none">
                  <p className="text-slate-200 whitespace-pre-wrap">{session.finalConclusion}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes pulse-glow {
          0%,
          100% {
            box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
          }
          50% {
            box-shadow: 0 0 30px rgba(99, 102, 241, 0.5);
          }
        }

        /* Color variables for dynamic styling */
        :global(:root) {
          --blue-500-20: rgba(59, 130, 246, 0.2);
          --blue-400: rgb(96, 165, 250);
          --blue-500: rgb(59, 130, 246);
          --yellow-500-20: rgba(234, 179, 8, 0.2);
          --yellow-400: rgb(250, 204, 21);
          --yellow-500: rgb(234, 179, 8);
          --purple-500-20: rgba(168, 85, 247, 0.2);
          --purple-400: rgb(192, 132, 252);
          --purple-500: rgb(168, 85, 247);
          --orange-500-20: rgba(249, 115, 22, 0.2);
          --orange-400: rgb(251, 146, 60);
          --orange-500: rgb(249, 115, 22);
          --green-500-20: rgba(34, 197, 94, 0.2);
          --green-400: rgb(74, 222, 128);
          --green-500: rgb(34, 197, 94);
          --pink-500-20: rgba(236, 72, 153, 0.2);
          --pink-400: rgb(244, 114, 182);
          --pink-500: rgb(236, 72, 153);
          --cyan-500-20: rgba(6, 182, 212, 0.2);
          --cyan-400: rgb(34, 211, 238);
          --cyan-500: rgb(6, 182, 212);
          --indigo-500-20: rgba(99, 102, 241, 0.2);
          --indigo-400: rgb(129, 140, 248);
          --indigo-500: rgb(99, 102, 241);
          --violet-500-20: rgba(139, 92, 246, 0.2);
          --violet-400: rgb(167, 139, 250);
          --violet-500: rgb(139, 92, 246);
          --gray-500-20: rgba(107, 114, 128, 0.2);
          --gray-400: rgb(156, 163, 175);
          --gray-500: rgb(107, 114, 128);
        }
      `}</style>
    </div>
  );
}
