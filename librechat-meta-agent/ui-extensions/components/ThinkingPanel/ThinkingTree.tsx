'use client';

import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Brain,
  Search,
  Lightbulb,
  Target,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  FileQuestion,
  GitBranch,
  Sparkles,
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

export interface ThoughtNode {
  id: string;
  parentId: string | null;
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
  expandedNodes: Set<string>;
  onToggle: (nodeId: string) => void;
  onNodeClick?: (nodeId: string) => void;
  depth: number;
  isMobile?: boolean;
}

function TreeNode({
  node,
  allNodes,
  isActive,
  expandedNodes,
  onToggle,
  onNodeClick,
  depth,
  isMobile = false,
}: TreeNodeProps) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);
  const Icon = getTypeIcon(node.type);
  const typeColor = getTypeColor(node.type);
  const confidenceColor = getConfidenceColor(node.confidence);

  // Mobile: Use horizontal layout for siblings
  const isHorizontal = isMobile && depth > 0;

  return (
    <div className={clsx(
      'relative',
      isHorizontal ? 'inline-block' : 'block'
    )}>
      {/* Connection Line */}
      {depth > 0 && !isHorizontal && (
        <div className="absolute left-[-20px] top-0 w-[20px] h-[24px] border-l-2 border-b-2 border-slate-700 rounded-bl-lg" />
      )}

      {/* Node Card */}
      <div
        className={clsx(
          'relative rounded-xl border-2 transition-all duration-200',
          'touch-manipulation active:scale-98',
          isActive && 'ring-2 ring-indigo-500/50 shadow-xl shadow-indigo-500/20',
          hasChildren && isExpanded && !isHorizontal && 'mb-4',
          isMobile ? 'w-[280px] sm:w-auto' : 'w-full',
          {
            'bg-slate-800/50 border-slate-700': !isActive,
            'bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border-indigo-500': isActive,
          }
        )}
        style={{
          marginLeft: !isHorizontal && depth > 0 ? '40px' : isHorizontal ? '16px' : '0',
        }}
        onClick={() => onNodeClick?.(node.id)}
      >
        {/* Header */}
        <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4">
          {/* Expand/Collapse Button */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle(node.id);
              }}
              className="flex-shrink-0 p-1 hover:bg-slate-700/50 rounded touch-manipulation min-w-[32px] min-h-[32px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}

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
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Type & Confidence */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
                {node.type}
              </span>
              <div className="flex items-center gap-1">
                <div className="w-12 sm:w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
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
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed mb-2 line-clamp-3 sm:line-clamp-none">
              {node.content}
            </p>

            {/* Metadata */}
            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-500 flex-wrap">
              <span>{node.metadata.tokens} tokens</span>
              <span>•</span>
              <span>{formatDuration(node.metadata.duration)}</span>
              <span>•</span>
              <span>Depth {node.depth}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Children - Horizontal scroll on mobile */}
      {hasChildren && isExpanded && (
        <div className={clsx(
          isMobile && depth === 0 ? 'horizontal-scroll mt-4 -mx-4 px-4' : 'mt-4 space-y-4',
          isMobile && depth > 0 && 'flex gap-4'
        )}>
          {node.children.map((childId) => {
            const childNode = allNodes.get(childId);
            if (!childNode) return null;

            return (
              <TreeNode
                key={childId}
                node={childNode}
                allNodes={allNodes}
                isActive={false}
                expandedNodes={expandedNodes}
                onToggle={onToggle}
                onNodeClick={onNodeClick}
                depth={depth + 1}
                isMobile={isMobile}
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

export interface ThinkingTreeProps {
  nodes: Map<string, ThoughtNode>;
  rootNodeId: string;
  activeNodeId?: string;
  onNodeClick?: (nodeId: string) => void;
  className?: string;
}

export function ThinkingTree({
  nodes,
  rootNodeId,
  activeNodeId,
  onNodeClick,
  className = '',
}: ThinkingTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([rootNodeId]));
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  const rootNode = nodes.get(rootNodeId);
  if (!rootNode) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center text-slate-400">
          <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No thought tree available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full overflow-x-auto overscroll-contain ${className}`}>
      <div className="min-w-full p-4 sm:p-6">
        <TreeNode
          node={rootNode}
          allNodes={nodes}
          isActive={activeNodeId === rootNode.id}
          expandedNodes={expandedNodes}
          onToggle={toggleNode}
          onNodeClick={onNodeClick}
          depth={0}
          isMobile={isMobile}
        />
      </div>

      {/* Expand/Collapse All - Mobile friendly */}
      <div className="sticky bottom-4 left-0 right-0 flex justify-center mt-4 pb-safe">
        <div className="flex gap-2 bg-slate-900/95 backdrop-blur-xl rounded-full shadow-lg p-2 border border-slate-800">
          <button
            onClick={() => {
              const allIds = Array.from(nodes.keys());
              setExpandedNodes(new Set(allIds));
            }}
            className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 active:bg-indigo-600/40 text-indigo-400 rounded-full text-xs sm:text-sm font-medium transition-colors touch-manipulation"
          >
            Expand All
          </button>
          <button
            onClick={() => setExpandedNodes(new Set([rootNodeId]))}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 rounded-full text-xs sm:text-sm font-medium transition-colors touch-manipulation"
          >
            Collapse All
          </button>
        </div>
      </div>
    </div>
  );
}

export default ThinkingTree;
