'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { 
  Search, 
  Zap, 
  Clock, 
  DollarSign, 
  Info, 
  Sparkles,
  Layers,
  Target,
  Brain,
  Microscope
} from 'lucide-react';

// ============================================================================
// INTERFACES
// ============================================================================

interface SearchConfig {
  search_depth: number; // 1-10
  max_sources: number;
  max_iterations: number;
  fact_verification: boolean;
  source_quality_threshold: number;
}

interface SearchDepthLevel {
  level: number;
  name: string;
  description: string;
  sources: string;
  time: string;
  cost: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface SearchDepthSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  showComparison?: boolean;
  className?: string;
}

// ============================================================================
// DEPTH LEVEL DEFINITIONS
// ============================================================================

const DEPTH_LEVELS: SearchDepthLevel[] = [
  {
    level: 1,
    name: 'Lightning',
    description: 'Instant surface-level scan. Best for quick facts and simple queries.',
    sources: '3-5 sources',
    time: '~5 seconds',
    cost: '$0.001',
    icon: <Zap className="w-5 h-5" />,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  {
    level: 2,
    name: 'Quick',
    description: 'Fast overview with basic verification. Good for general questions.',
    sources: '5-10 sources',
    time: '~15 seconds',
    cost: '$0.005',
    icon: <Zap className="w-5 h-5" />,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  {
    level: 3,
    name: 'Standard',
    description: 'Balanced search with fact-checking. This is what ChatGPT typically uses.',
    sources: '10-15 sources',
    time: '~30 seconds',
    cost: '$0.01',
    icon: <Search className="w-5 h-5" />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
  },
  {
    level: 4,
    name: 'Enhanced',
    description: 'Extended search with cross-referencing. Better accuracy than standard.',
    sources: '15-25 sources',
    time: '~1 minute',
    cost: '$0.02',
    icon: <Search className="w-5 h-5" />,
    color: 'text-teal-500',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
  },
  {
    level: 5,
    name: 'Deep',
    description: 'Thorough research with multiple verification passes. Great for important topics.',
    sources: '25-40 sources',
    time: '~2 minutes',
    cost: '$0.05',
    icon: <Layers className="w-5 h-5" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    level: 6,
    name: 'Thorough',
    description: 'Multi-source verification with contradiction detection. Professional grade.',
    sources: '40-60 sources',
    time: '~3 minutes',
    cost: '$0.10',
    icon: <Layers className="w-5 h-5" />,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    level: 7,
    name: 'Comprehensive',
    description: 'Expert-level analysis with academic sources. Includes synthesis and insights.',
    sources: '60-80 sources',
    time: '~5 minutes',
    cost: '$0.20',
    icon: <Target className="w-5 h-5" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  {
    level: 8,
    name: 'Research',
    description: 'Academic-grade research with peer-reviewed sources and full citation mapping.',
    sources: '80-100 sources',
    time: '~8 minutes',
    cost: '$0.35',
    icon: <Target className="w-5 h-5" />,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  {
    level: 9,
    name: 'Exhaustive',
    description: 'Maximum depth with complete knowledge graph construction and expert synthesis.',
    sources: '100-150 sources',
    time: '~12 minutes',
    cost: '$0.50',
    icon: <Brain className="w-5 h-5" />,
    color: 'text-warm-600',
    bgColor: 'bg-warm-50',
    borderColor: 'border-warm-200',
  },
  {
    level: 10,
    name: 'Ultimate',
    description: 'Doctoral-level analysis. Full literature review with novel insight generation.',
    sources: '150+ sources',
    time: '~20 minutes',
    cost: '$1.00',
    icon: <Microscope className="w-5 h-5" />,
    color: 'text-warm-700',
    bgColor: 'bg-warm-100',
    borderColor: 'border-warm-300',
  },
];

// ============================================================================
// TOOLTIP COMPONENT
// ============================================================================

function Tooltip({ 
  children, 
  content 
}: { 
  children: React.ReactNode; 
  content: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-flex">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {children}
      </div>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-warm-900 text-white text-xs rounded-lg whitespace-nowrap z-50 shadow-lg">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-warm-900" />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// DEPTH PREVIEW CARD
// ============================================================================

function DepthPreviewCard({ level }: { level: SearchDepthLevel }) {
  return (
    <div 
      className={`
        rounded-xl p-5 border-2 transition-all duration-300
        ${level.bgColor} ${level.borderColor}
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2.5 rounded-lg bg-white shadow-sm ${level.color}`}>
          {level.icon}
        </div>
        <div>
          <h4 className={`font-semibold text-lg ${level.color}`}>
            Level {level.level}: {level.name}
          </h4>
          <p className="text-warm-500 text-sm">Search Depth</p>
        </div>
      </div>

      {/* Description */}
      <p className="text-warm-700 text-sm mb-4 leading-relaxed">
        {level.description}
      </p>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/70 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-warm-500 text-xs mb-1">
            <Search className="w-3 h-3" />
            <span>Sources</span>
          </div>
          <div className="font-semibold text-warm-800 text-sm">{level.sources}</div>
        </div>
        <div className="bg-white/70 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-warm-500 text-xs mb-1">
            <Clock className="w-3 h-3" />
            <span>Time</span>
          </div>
          <div className="font-semibold text-warm-800 text-sm">{level.time}</div>
        </div>
        <div className="bg-white/70 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-warm-500 text-xs mb-1">
            <DollarSign className="w-3 h-3" />
            <span>Est. Cost</span>
          </div>
          <div className="font-semibold text-warm-800 text-sm">{level.cost}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CHATGPT COMPARISON BADGE
// ============================================================================

function ChatGPTComparisonBadge({ currentLevel }: { currentLevel: number }) {
  const chatgptLevel = 3;
  const difference = currentLevel - chatgptLevel;

  let message: string;
  let bgColor: string;
  let textColor: string;

  if (difference < 0) {
    message = `${Math.abs(difference)} level${Math.abs(difference) > 1 ? 's' : ''} faster than ChatGPT`;
    bgColor = 'bg-yellow-100';
    textColor = 'text-yellow-700';
  } else if (difference === 0) {
    message = 'Same depth as ChatGPT Search';
    bgColor = 'bg-teal-100';
    textColor = 'text-teal-700';
  } else if (difference <= 2) {
    message = `${difference} level${difference > 1 ? 's' : ''} deeper than ChatGPT`;
    bgColor = 'bg-blue-100';
    textColor = 'text-blue-700';
  } else if (difference <= 5) {
    message = `${difference} levels deeper - Professional grade`;
    bgColor = 'bg-purple-100';
    textColor = 'text-purple-700';
  } else {
    message = `${difference} levels deeper - Research grade`;
    bgColor = 'bg-warm-100';
    textColor = 'text-warm-700';
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
      <Sparkles className="w-3.5 h-3.5" />
      <span>{message}</span>
    </div>
  );
}

// ============================================================================
// VISUAL DEPTH INDICATOR
// ============================================================================

function VisualDepthIndicator({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 10 }).map((_, i) => {
        const isActive = i < level;
        const isChatGPT = i === 2; // Level 3 is ChatGPT's level

        return (
          <div
            key={i}
            className={`
              relative h-8 flex-1 rounded-sm transition-all duration-300
              ${isActive 
                ? i < 2 
                  ? 'bg-yellow-400' 
                  : i < 4 
                    ? 'bg-teal-400' 
                    : i < 6 
                      ? 'bg-blue-400' 
                      : i < 8 
                        ? 'bg-purple-400' 
                        : 'bg-warm-400'
                : 'bg-warm-100'
              }
            `}
          >
            {isChatGPT && (
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className="text-[10px] text-warm-400 font-medium">ChatGPT</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT: SearchDepthSlider
// ============================================================================

export function SearchDepthSlider({
  value,
  onChange,
  disabled = false,
  showComparison = true,
  className = '',
}: SearchDepthSliderProps) {
  const currentLevel = useMemo(
    () => DEPTH_LEVELS.find(l => l.level === value) || DEPTH_LEVELS[2],
    [value]
  );

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(parseInt(e.target.value, 10));
    },
    [onChange]
  );

  return (
    <div className={`bg-white rounded-2xl border border-warm-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-warm-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Search className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h3 className="font-semibold text-warm-900 text-lg">Search Depth</h3>
              <p className="text-warm-500 text-sm">Control how deep the AI searches</p>
            </div>
          </div>
          <Tooltip content="ChatGPT uses level 3. Higher levels search more sources with better verification.">
            <button className="p-2 hover:bg-warm-50 rounded-lg transition-colors">
              <Info className="w-5 h-5 text-warm-400" />
            </button>
          </Tooltip>
        </div>

        {showComparison && (
          <div className="mt-3">
            <ChatGPTComparisonBadge currentLevel={value} />
          </div>
        )}
      </div>

      {/* Slider Section */}
      <div className="p-6">
        {/* Visual Depth Indicator */}
        <div className="mb-8">
          <VisualDepthIndicator level={value} />
        </div>

        {/* Slider */}
        <div className="relative mb-6">
          <input
            type="range"
            min="1"
            max="10"
            value={value}
            onChange={handleSliderChange}
            disabled={disabled}
            className={`
              w-full h-3 rounded-full appearance-none cursor-pointer
              bg-gradient-to-r from-yellow-200 via-teal-200 via-blue-200 via-purple-200 to-warm-300
              disabled:opacity-50 disabled:cursor-not-allowed
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-7
              [&::-webkit-slider-thumb]:h-7
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-white
              [&::-webkit-slider-thumb]:border-4
              [&::-webkit-slider-thumb]:border-teal-500
              [&::-webkit-slider-thumb]:shadow-lg
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-all
              [&::-webkit-slider-thumb]:hover:scale-110
              [&::-moz-range-thumb]:w-7
              [&::-moz-range-thumb]:h-7
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-white
              [&::-moz-range-thumb]:border-4
              [&::-moz-range-thumb]:border-teal-500
              [&::-moz-range-thumb]:shadow-lg
              [&::-moz-range-thumb]:cursor-pointer
            `}
          />

          {/* Level Labels */}
          <div className="flex justify-between mt-2 px-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
              <button
                key={level}
                onClick={() => !disabled && onChange(level)}
                className={`
                  text-xs font-medium transition-all
                  ${value === level 
                    ? 'text-teal-600 scale-125' 
                    : 'text-warm-400 hover:text-warm-600'
                  }
                  ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Select Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { level: 1, label: 'Quick', icon: <Zap className="w-3.5 h-3.5" /> },
            { level: 3, label: 'Standard', icon: <Search className="w-3.5 h-3.5" /> },
            { level: 5, label: 'Deep', icon: <Layers className="w-3.5 h-3.5" /> },
            { level: 7, label: 'Comprehensive', icon: <Target className="w-3.5 h-3.5" /> },
            { level: 10, label: 'Ultimate', icon: <Microscope className="w-3.5 h-3.5" /> },
          ].map(({ level, label, icon }) => (
            <button
              key={level}
              onClick={() => !disabled && onChange(level)}
              disabled={disabled}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                transition-all duration-200
                ${value === level
                  ? 'bg-teal-500 text-white shadow-md'
                  : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Current Level Preview */}
        <DepthPreviewCard level={currentLevel} />
      </div>

      {/* Footer Info */}
      <div className="px-6 py-4 bg-warm-50 border-t border-warm-100">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-warm-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-warm-500 leading-relaxed">
            <strong className="text-warm-600">Pro tip:</strong> Start with level 3-5 for most queries. 
            Use level 7+ for academic research or when accuracy is critical. 
            Higher levels take longer but provide better verification and more sources.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SearchDepthSlider;

// ============================================================================
// EXPORTS
// ============================================================================

export { DEPTH_LEVELS };
export type { SearchConfig, SearchDepthLevel, SearchDepthSliderProps };
