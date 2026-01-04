'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Lightbulb,
  RotateCcw,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  Brain,
  Target,
  AlertCircle,
  CheckCircle2,
  Filter,
  Search,
  Copy,
  Check,
} from 'lucide-react';
import clsx from 'clsx';

// ============================================================================
// Types
// ============================================================================

export interface Thought {
  type: 'turn' | 'reflection' | 'conclusion';
  content: string;
  timestamp: number;
  confidence?: number;
  tokens?: number;
}

export interface ThoughtStreamProps {
  thoughts: Thought[];
  isThinking?: boolean;
  showTimestamps?: boolean;
  showFilters?: boolean;
  maxHeight?: string;
  autoScroll?: boolean;
  onThoughtClick?: (thought: Thought, index: number) => void;
  className?: string;
}

// ============================================================================
// Thought Type Styles
// ============================================================================

const thoughtTypeConfig = {
  turn: {
    icon: Lightbulb,
    label: 'Turn',
    bgLight: 'bg-stone-50',
    bgDark: 'dark:bg-stone-800/50',
    borderLight: 'border-stone-200',
    borderDark: 'dark:border-stone-700',
    iconColor: 'text-teal-500',
    labelColor: 'text-teal-600 dark:text-teal-400',
    accentBg: 'bg-teal-500',
  },
  reflection: {
    icon: RotateCcw,
    label: 'Reflection',
    bgLight: 'bg-purple-50',
    bgDark: 'dark:bg-purple-900/20',
    borderLight: 'border-purple-200',
    borderDark: 'dark:border-purple-800',
    iconColor: 'text-purple-500',
    labelColor: 'text-purple-600 dark:text-purple-400',
    accentBg: 'bg-purple-500',
  },
  conclusion: {
    icon: CheckCircle2,
    label: 'Conclusion',
    bgLight: 'bg-green-50',
    bgDark: 'dark:bg-green-900/20',
    borderLight: 'border-green-200',
    borderDark: 'dark:border-green-800',
    iconColor: 'text-green-500',
    labelColor: 'text-green-600 dark:text-green-400',
    accentBg: 'bg-green-500',
  },
};

// ============================================================================
// Individual Thought Bubble Component
// ============================================================================

interface ThoughtBubbleProps {
  thought: Thought;
  index: number;
  isLast: boolean;
  showTimestamp: boolean;
  onClick?: () => void;
}

function ThoughtBubble({
  thought,
  index,
  isLast,
  showTimestamp,
  onClick,
}: ThoughtBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const config = thoughtTypeConfig[thought.type];
  const Icon = config.icon;

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(thought.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div
      className={clsx(
        'relative group transition-all duration-300',
        'animate-slide-in-left'
      )}
      style={{
        animationDelay: `${index * 50}ms`,
        animationFillMode: 'both',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Connection line to next thought */}
      {!isLast && (
        <div className="absolute left-[19px] top-12 bottom-0 w-0.5 bg-gradient-to-b from-stone-200 to-transparent dark:from-stone-700" />
      )}

      {/* Thought bubble */}
      <div
        className={clsx(
          'flex gap-3 p-4 rounded-xl border transition-all duration-200 cursor-pointer',
          config.bgLight,
          config.bgDark,
          config.borderLight,
          config.borderDark,
          isHovered && 'shadow-md transform scale-[1.01]',
          thought.type === 'conclusion' && 'ring-2 ring-green-500/20'
        )}
        onClick={onClick}
      >
        {/* Icon with accent dot */}
        <div className="relative flex-shrink-0">
          <div
            className={clsx(
              'p-2 rounded-lg transition-colors',
              config.bgLight,
              config.bgDark
            )}
          >
            <Icon className={clsx('w-5 h-5', config.iconColor)} />
          </div>
          {/* Pulsing dot for active thinking */}
          {isLast && (
            <div
              className={clsx(
                'absolute -top-1 -right-1 w-3 h-3 rounded-full',
                config.accentBg,
                'animate-pulse'
              )}
            />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className={clsx(
                'text-xs font-semibold uppercase tracking-wider',
                config.labelColor
              )}
            >
              {config.label}
            </span>
            {showTimestamp && (
              <span className="text-xs text-stone-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTimestamp(thought.timestamp)}
              </span>
            )}
            {thought.confidence !== undefined && (
              <span
                className={clsx(
                  'text-xs px-2 py-0.5 rounded-full',
                  thought.confidence >= 80
                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                    : thought.confidence >= 50
                    ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                )}
              >
                {thought.confidence}% confidence
              </span>
            )}
            {thought.tokens && (
              <span className="text-xs text-stone-400">
                {thought.tokens} tokens
              </span>
            )}
          </div>

          {/* Thought content */}
          <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-wrap">
            {thought.content}
          </p>
        </div>

        {/* Copy button (visible on hover) */}
        <button
          onClick={handleCopy}
          className={clsx(
            'flex-shrink-0 p-2 rounded-lg transition-all duration-200',
            'hover:bg-stone-200 dark:hover:bg-stone-700',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
          title="Copy thought"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4 text-stone-400" />
          )}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Thinking Indicator Component
// ============================================================================

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-3 p-4 animate-fade-in">
      <div className="relative">
        <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
          <Brain className="w-5 h-5 text-teal-500 animate-pulse" />
        </div>
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-teal-500 rounded-full animate-ping" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-stone-500 dark:text-stone-400">
          Thinking
        </span>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-stone-400">
      <Brain className="w-12 h-12 mb-3 opacity-30" />
      <p className="text-sm font-medium">No thoughts yet</p>
      <p className="text-xs mt-1">Start a conversation to see the AI think</p>
    </div>
  );
}

// ============================================================================
// Conclusion Card Component
// ============================================================================

interface ConclusionCardProps {
  thought: Thought;
}

function ConclusionCard({ thought }: ConclusionCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(thought.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="mt-4 p-5 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 animate-fade-in">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-green-500 rounded-xl shadow-lg shadow-green-500/30">
          <TrendingUp className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <h4 className="text-lg font-bold text-green-700 dark:text-green-400">
              Final Conclusion
            </h4>
            {thought.confidence && (
              <span className="px-2 py-1 text-xs font-medium bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300 rounded-full">
                {thought.confidence}% confidence
              </span>
            )}
          </div>
          <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
            {thought.content}
          </p>
          <button
            onClick={handleCopy}
            className="mt-3 flex items-center gap-2 px-3 py-1.5 text-sm text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy conclusion
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main ThoughtStream Component
// ============================================================================

export default function ThoughtStream({
  thoughts,
  isThinking = false,
  showTimestamps = true,
  showFilters = false,
  maxHeight = '400px',
  autoScroll = true,
  onThoughtClick,
  className,
}: ThoughtStreamProps) {
  const [filter, setFilter] = useState<'all' | 'turn' | 'reflection' | 'conclusion'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new thoughts arrive
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current && isThinking) {
      const container = scrollContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [thoughts, isThinking, autoScroll]);

  // Filter thoughts
  const filteredThoughts = thoughts.filter((thought) => {
    const matchesFilter = filter === 'all' || thought.type === filter;
    const matchesSearch =
      searchQuery === '' ||
      thought.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Separate conclusion from other thoughts
  const conclusionThought = filteredThoughts.find((t) => t.type === 'conclusion');
  const regularThoughts = filteredThoughts.filter((t) => t.type !== 'conclusion');

  // Stats
  const stats = {
    turns: thoughts.filter((t) => t.type === 'turn').length,
    reflections: thoughts.filter((t) => t.type === 'reflection').length,
    conclusions: thoughts.filter((t) => t.type === 'conclusion').length,
  };

  return (
    <div
      className={clsx(
        'rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-700 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-stone-900 dark:text-stone-100">
              Thought Stream
            </h3>
            <div className="flex items-center gap-3 text-xs text-stone-500">
              <span>{stats.turns} turns</span>
              <span>{stats.reflections} reflections</span>
              {stats.conclusions > 0 && (
                <span className="text-green-500">{stats.conclusions} conclusion</span>
              )}
            </div>
          </div>
        </div>
        <button className="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-stone-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-stone-500" />
          )}
        </button>
      </div>

      {isExpanded && (
        <>
          {/* Filters */}
          {showFilters && thoughts.length > 0 && (
            <div className="p-3 border-b border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50">
              <div className="flex flex-wrap items-center gap-2">
                {/* Filter buttons */}
                <div className="flex items-center gap-1 bg-white dark:bg-stone-800 rounded-lg p-1 border border-stone-200 dark:border-stone-700">
                  {(['all', 'turn', 'reflection', 'conclusion'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilter(type)}
                      className={clsx(
                        'px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize',
                        filter === type
                          ? 'bg-teal-500 text-white'
                          : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700'
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search thoughts..."
                    className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Thought list */}
          <div
            ref={scrollContainerRef}
            className="overflow-y-auto p-4 space-y-3"
            style={{ maxHeight }}
          >
            {filteredThoughts.length === 0 && !isThinking ? (
              <EmptyState />
            ) : (
              <>
                {regularThoughts.map((thought, index) => (
                  <ThoughtBubble
                    key={`${thought.timestamp}-${index}`}
                    thought={thought}
                    index={index}
                    isLast={index === regularThoughts.length - 1 && isThinking}
                    showTimestamp={showTimestamps}
                    onClick={() => onThoughtClick?.(thought, index)}
                  />
                ))}

                {isThinking && <ThinkingIndicator />}

                {conclusionThought && (
                  <ConclusionCard thought={conclusionThought} />
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Custom styles */}
      <style jsx>{`
        @keyframes slide-in-left {
          0% {
            opacity: 0;
            transform: translateX(-20px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fade-in {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }

        .animate-slide-in-left {
          animation: slide-in-left 0.3s ease-out;
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
