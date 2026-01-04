'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Database,
  Trash2,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  FileText,
  Image,
  Code2,
  Zap,
  RefreshCw,
  Clock,
  Layers,
  TrendingUp,
  Eye,
  EyeOff,
} from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface ContextBlock {
  id: string;
  type: 'system' | 'user' | 'assistant' | 'tool' | 'file' | 'image';
  tokens: number;
  content: string;
  timestamp: number;
  isCollapsible?: boolean;
}

interface ModelContextLimits {
  [modelId: string]: {
    name: string;
    maxContext: number;
    maxOutput: number;
    provider: string;
  };
}

interface ContextManagerProps {
  currentModel: string;
  contextBlocks: ContextBlock[];
  onClearContext?: () => void;
  onRemoveBlock?: (blockId: string) => void;
  showDetails?: boolean;
}

// ============================================================================
// MODEL CONTEXT LIMITS
// ============================================================================

const MODEL_CONTEXT_LIMITS: ModelContextLimits = {
  // OpenAI
  'gpt-4o': { name: 'GPT-4o', maxContext: 128000, maxOutput: 16384, provider: 'OpenAI' },
  'gpt-4o-mini': { name: 'GPT-4o Mini', maxContext: 128000, maxOutput: 16384, provider: 'OpenAI' },
  'gpt-4-turbo': { name: 'GPT-4 Turbo', maxContext: 128000, maxOutput: 4096, provider: 'OpenAI' },
  'o1': { name: 'o1', maxContext: 200000, maxOutput: 100000, provider: 'OpenAI' },
  'o1-mini': { name: 'o1 Mini', maxContext: 128000, maxOutput: 65536, provider: 'OpenAI' },
  'o1-pro': { name: 'o1 Pro', maxContext: 200000, maxOutput: 100000, provider: 'OpenAI' },
  'o3': { name: 'o3', maxContext: 200000, maxOutput: 100000, provider: 'OpenAI' },
  'o3-mini': { name: 'o3 Mini', maxContext: 200000, maxOutput: 100000, provider: 'OpenAI' },

  // Anthropic
  'claude-3-5-sonnet-20241022': { name: 'Claude 3.5 Sonnet', maxContext: 200000, maxOutput: 8192, provider: 'Anthropic' },
  'claude-3-5-haiku-20241022': { name: 'Claude 3.5 Haiku', maxContext: 200000, maxOutput: 8192, provider: 'Anthropic' },
  'claude-3-opus-20240229': { name: 'Claude 3 Opus', maxContext: 200000, maxOutput: 4096, provider: 'Anthropic' },
  'claude-sonnet-4-20250514': { name: 'Claude Sonnet 4', maxContext: 200000, maxOutput: 16384, provider: 'Anthropic' },
  'claude-opus-4-5-20251101': { name: 'Claude Opus 4.5', maxContext: 200000, maxOutput: 32000, provider: 'Anthropic' },

  // Google
  'gemini-2.0-ultra': { name: 'Gemini 2.0 Ultra', maxContext: 2000000, maxOutput: 8192, provider: 'Google' },
  'gemini-2.0-pro': { name: 'Gemini 2.0 Pro', maxContext: 2000000, maxOutput: 8192, provider: 'Google' },
  'gemini-2.0-flash': { name: 'Gemini 2.0 Flash', maxContext: 1000000, maxOutput: 8192, provider: 'Google' },
  'gemini-2.0-flash-thinking': { name: 'Gemini 2.0 Flash Thinking', maxContext: 1000000, maxOutput: 32768, provider: 'Google' },

  // DeepSeek
  'deepseek-r1': { name: 'DeepSeek R1', maxContext: 128000, maxOutput: 8192, provider: 'DeepSeek' },
  'deepseek-r1-zero': { name: 'DeepSeek R1 Zero', maxContext: 128000, maxOutput: 8192, provider: 'DeepSeek' },
  'deepseek-v3': { name: 'DeepSeek V3', maxContext: 128000, maxOutput: 8192, provider: 'DeepSeek' },
  'deepseek-chat': { name: 'DeepSeek Chat', maxContext: 64000, maxOutput: 4096, provider: 'DeepSeek' },

  // Default
  'default': { name: 'Default', maxContext: 128000, maxOutput: 4096, provider: 'Unknown' },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}

function getBlockIcon(type: ContextBlock['type']) {
  switch (type) {
    case 'system':
      return <Zap className="w-3.5 h-3.5" />;
    case 'user':
      return <MessageSquare className="w-3.5 h-3.5" />;
    case 'assistant':
      return <Layers className="w-3.5 h-3.5" />;
    case 'tool':
      return <Code2 className="w-3.5 h-3.5" />;
    case 'file':
      return <FileText className="w-3.5 h-3.5" />;
    case 'image':
      return <Image className="w-3.5 h-3.5" />;
    default:
      return <Database className="w-3.5 h-3.5" />;
  }
}

function getBlockColor(type: ContextBlock['type']) {
  switch (type) {
    case 'system':
      return 'bg-purple-100 text-purple-600';
    case 'user':
      return 'bg-blue-100 text-blue-600';
    case 'assistant':
      return 'bg-teal-100 text-teal-600';
    case 'tool':
      return 'bg-amber-100 text-amber-600';
    case 'file':
      return 'bg-green-100 text-green-600';
    case 'image':
      return 'bg-pink-100 text-pink-600';
    default:
      return 'bg-warm-100 text-warm-600';
  }
}

// ============================================================================
// ANIMATED PROGRESS BAR COMPONENT
// ============================================================================

interface AnimatedProgressBarProps {
  percentage: number;
  warningThreshold?: number;
  dangerThreshold?: number;
  showGradient?: boolean;
  height?: string;
}

function AnimatedProgressBar({
  percentage,
  warningThreshold = 70,
  dangerThreshold = 90,
  showGradient = true,
  height = 'h-4',
}: AnimatedProgressBarProps) {
  const getColorClass = () => {
    if (percentage >= dangerThreshold) return 'from-red-400 to-red-600';
    if (percentage >= warningThreshold) return 'from-amber-400 to-amber-600';
    return 'from-teal-400 to-teal-600';
  };

  return (
    <div className={`relative ${height} bg-warm-100 rounded-full overflow-hidden`}>
      {/* Background grid pattern */}
      <div className="absolute inset-0 opacity-10">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-warm-500"
            style={{ left: `${i * 5}%` }}
          />
        ))}
      </div>

      {/* Animated fill */}
      <div
        className={`
          absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out
          ${showGradient ? `bg-gradient-to-r ${getColorClass()}` : 'bg-teal-500'}
        `}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      >
        {/* Shimmer effect */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
            style={{ animationDuration: '2s' }}
          />
        </div>
      </div>

      {/* Tick marks */}
      <div className="absolute inset-0 flex justify-between px-1">
        {[25, 50, 75].map((mark) => (
          <div
            key={mark}
            className="w-px h-full bg-white/20"
            style={{ marginLeft: `${mark}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// CONTEXT BLOCK ITEM COMPONENT
// ============================================================================

interface ContextBlockItemProps {
  block: ContextBlock;
  onRemove?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

function ContextBlockItem({
  block,
  onRemove,
  isExpanded = false,
  onToggleExpand,
}: ContextBlockItemProps) {
  const truncatedContent = block.content.length > 100
    ? block.content.slice(0, 100) + '...'
    : block.content;

  return (
    <div className="flex items-start gap-3 p-3 bg-white border border-warm-200 rounded-xl hover:border-warm-300 transition-colors group">
      {/* Type icon */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${getBlockColor(block.type)}`}>
        {getBlockIcon(block.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-warm-900 capitalize">{block.type}</span>
          <span className="text-xs px-1.5 py-0.5 bg-warm-100 text-warm-500 rounded-full">
            {formatTokens(block.tokens)} tokens
          </span>
          <span className="text-xs text-warm-400">
            {new Date(block.timestamp).toLocaleTimeString()}
          </span>
        </div>

        {/* Content preview */}
        <p className="text-sm text-warm-600 line-clamp-2">
          {isExpanded ? block.content : truncatedContent}
        </p>

        {/* Expand toggle */}
        {block.content.length > 100 && (
          <button
            onClick={onToggleExpand}
            className="flex items-center gap-1 mt-1 text-xs text-teal-600 hover:text-teal-700"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                Show more
              </>
            )}
          </button>
        )}
      </div>

      {/* Remove button */}
      {onRemove && (
        <button
          onClick={onRemove}
          className="p-1.5 text-warm-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
          title="Remove from context"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// MAIN CONTEXT MANAGER COMPONENT
// ============================================================================

export function ContextManager({
  currentModel,
  contextBlocks,
  onClearContext,
  onRemoveBlock,
  showDetails: initialShowDetails = false,
}: ContextManagerProps) {
  const [showDetails, setShowDetails] = useState(initialShowDetails);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [isAnimating, setIsAnimating] = useState(false);

  // Get model limits
  const modelLimits = MODEL_CONTEXT_LIMITS[currentModel] || MODEL_CONTEXT_LIMITS['default'];

  // Calculate totals
  const totalTokens = useMemo(
    () => contextBlocks.reduce((sum, block) => sum + block.tokens, 0),
    [contextBlocks]
  );

  const usedPercentage = (totalTokens / modelLimits.maxContext) * 100;
  const remainingTokens = modelLimits.maxContext - totalTokens;
  const isWarning = usedPercentage >= 70;
  const isDanger = usedPercentage >= 90;

  // Token breakdown by type
  const tokensByType = useMemo(() => {
    const breakdown: Record<string, number> = {};
    contextBlocks.forEach((block) => {
      breakdown[block.type] = (breakdown[block.type] || 0) + block.tokens;
    });
    return breakdown;
  }, [contextBlocks]);

  // Handle clear context with animation
  const handleClearContext = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      onClearContext?.();
      setIsAnimating(false);
    }, 300);
  }, [onClearContext]);

  // Toggle block expansion
  const toggleBlockExpand = (blockId: string) => {
    setExpandedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) {
        next.delete(blockId);
      } else {
        next.add(blockId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-warm-900">Context Window</h3>
          <p className="text-sm text-warm-500">
            {modelLimits.name} - {formatTokens(modelLimits.maxContext)} token limit
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-warm-600 hover:text-warm-900 hover:bg-warm-100 rounded-lg transition-colors"
          >
            {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showDetails ? 'Hide' : 'Show'} Details
          </button>
          {onClearContext && (
            <button
              onClick={handleClearContext}
              disabled={contextBlocks.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:text-white hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Usage Card */}
      <div className={`
        relative overflow-hidden rounded-2xl border-2 p-6 transition-all duration-300
        ${isDanger
          ? 'border-red-200 bg-red-50'
          : isWarning
            ? 'border-amber-200 bg-amber-50'
            : 'border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50'
        }
      `}>
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
          <Database className="w-full h-full" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6 relative">
          {/* Used */}
          <div className="text-center">
            <div className={`text-3xl font-bold ${isDanger ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-teal-600'}`}>
              {formatTokens(totalTokens)}
            </div>
            <div className="text-sm text-warm-500">Tokens Used</div>
          </div>

          {/* Progress circle */}
          <div className="flex items-center justify-center">
            <div className="relative w-20 h-20">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-warm-200"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={`${usedPercentage * 2.26} 226`}
                  strokeLinecap="round"
                  className={`
                    transition-all duration-700
                    ${isDanger ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-teal-500'}
                  `}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-lg font-bold ${isDanger ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-teal-600'}`}>
                  {usedPercentage.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* Remaining */}
          <div className="text-center">
            <div className="text-3xl font-bold text-warm-400">
              {formatTokens(remainingTokens)}
            </div>
            <div className="text-sm text-warm-500">Remaining</div>
          </div>
        </div>

        {/* Progress bar */}
        <AnimatedProgressBar
          percentage={usedPercentage}
          warningThreshold={70}
          dangerThreshold={90}
        />

        {/* Labels */}
        <div className="flex justify-between mt-2 text-xs text-warm-500">
          <span>0</span>
          <span className="text-warm-400">{formatTokens(modelLimits.maxContext / 2)}</span>
          <span>{formatTokens(modelLimits.maxContext)}</span>
        </div>

        {/* Warning message */}
        {(isWarning || isDanger) && (
          <div className={`
            flex items-center gap-2 mt-4 p-3 rounded-xl
            ${isDanger ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}
          `}>
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div className="text-sm">
              {isDanger ? (
                <span>
                  <strong>Context nearly full!</strong> You may experience truncation or errors. Consider clearing old messages.
                </span>
              ) : (
                <span>
                  <strong>Approaching limit.</strong> Long conversations may be truncated soon.
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Token Breakdown by Type */}
      {showDetails && Object.keys(tokensByType).length > 0 && (
        <div className="bg-white border border-warm-200 rounded-xl p-4">
          <h4 className="font-medium text-warm-900 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-500" />
            Token Breakdown
          </h4>
          <div className="space-y-2">
            {Object.entries(tokensByType)
              .sort((a, b) => b[1] - a[1])
              .map(([type, tokens]) => {
                const typePercentage = (tokens / totalTokens) * 100;
                return (
                  <div key={type} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${getBlockColor(type as ContextBlock['type'])}`}>
                      {getBlockIcon(type as ContextBlock['type'])}
                    </div>
                    <span className="text-sm text-warm-700 capitalize w-20">{type}</span>
                    <div className="flex-1 h-2 bg-warm-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          type === 'system' ? 'bg-purple-400' :
                          type === 'user' ? 'bg-blue-400' :
                          type === 'assistant' ? 'bg-teal-400' :
                          type === 'tool' ? 'bg-amber-400' :
                          type === 'file' ? 'bg-green-400' :
                          'bg-pink-400'
                        }`}
                        style={{ width: `${typePercentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-warm-500 w-20 text-right">
                      {formatTokens(tokens)}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Context Blocks List */}
      {showDetails && contextBlocks.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-warm-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-500" />
            Context Blocks ({contextBlocks.length})
          </h4>
          <div className={`space-y-2 transition-opacity ${isAnimating ? 'opacity-50' : 'opacity-100'}`}>
            {contextBlocks.map((block) => (
              <ContextBlockItem
                key={block.id}
                block={block}
                onRemove={onRemoveBlock ? () => onRemoveBlock(block.id) : undefined}
                isExpanded={expandedBlocks.has(block.id)}
                onToggleExpand={() => toggleBlockExpand(block.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {contextBlocks.length === 0 && (
        <div className="text-center py-8 px-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-warm-100 flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-warm-400" />
          </div>
          <h4 className="font-medium text-warm-900 mb-2">No context yet</h4>
          <p className="text-sm text-warm-500">
            Start a conversation to see your context window usage.
          </p>
        </div>
      )}

      {/* Model info footer */}
      <div className="flex items-center justify-between text-xs text-warm-400 pt-2 border-t border-warm-100">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5" />
          <span>
            {modelLimits.provider} - Max output: {formatTokens(modelLimits.maxOutput)} tokens
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          <span>Updated live</span>
        </div>
      </div>
    </div>
  );
}

export { MODEL_CONTEXT_LIMITS, formatTokens };
export default ContextManager;
