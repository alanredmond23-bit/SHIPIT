'use client';

import React, { useState, useCallback } from 'react';
import {
  Brain,
  Zap,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Info,
  Sparkles,
  GitBranch,
  Repeat,
  Target,
  Gauge,
  Clock,
  AlertCircle,
  Check,
  Lightbulb,
  TrendingUp,
  RotateCcw,
} from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ReasoningConfig {
  reasoning_effort: 'low' | 'medium' | 'high' | 'max';
  thinking_budget: number;
  show_thinking: boolean;
  max_inflections: number;
  max_reflections: number;
  confidence_threshold: number;
}

interface ReasoningControlsProps {
  config: ReasoningConfig;
  onChange: (config: ReasoningConfig) => void;
  modelName?: string;
  supportsReasoning?: boolean;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_REASONING_CONFIG: ReasoningConfig = {
  reasoning_effort: 'medium',
  thinking_budget: 16384,
  show_thinking: true,
  max_inflections: 5,
  max_reflections: 3,
  confidence_threshold: 0.7,
};

// ============================================================================
// REASONING EFFORT LEVELS
// ============================================================================

const EFFORT_LEVELS = [
  {
    id: 'low' as const,
    name: 'Low',
    description: 'Quick responses, minimal reasoning',
    icon: <Zap className="w-5 h-5" />,
    color: 'from-green-400 to-emerald-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
    thinkingBudget: 4096,
    inflections: 2,
    reflections: 1,
  },
  {
    id: 'medium' as const,
    name: 'Medium',
    description: 'Balanced thinking for most tasks',
    icon: <Gauge className="w-5 h-5" />,
    color: 'from-blue-400 to-cyan-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    thinkingBudget: 16384,
    inflections: 5,
    reflections: 3,
  },
  {
    id: 'high' as const,
    name: 'High',
    description: 'Deep analysis for complex problems',
    icon: <Brain className="w-5 h-5" />,
    color: 'from-purple-400 to-violet-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    thinkingBudget: 32768,
    inflections: 10,
    reflections: 5,
  },
  {
    id: 'max' as const,
    name: 'Maximum',
    description: 'Exhaustive reasoning for hardest tasks',
    icon: <Sparkles className="w-5 h-5" />,
    color: 'from-amber-400 to-orange-500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    thinkingBudget: 65536,
    inflections: 20,
    reflections: 10,
  },
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function Tooltip({ content, children }: { content: string; children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-flex">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {isVisible && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs bg-warm-900 text-white rounded-lg shadow-lg max-w-xs whitespace-normal">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-warm-900" />
        </div>
      )}
    </div>
  );
}

function AdvancedBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 rounded-full">
      <Sparkles className="w-3 h-3" />
      Advanced
    </span>
  );
}

// ============================================================================
// EFFORT SELECTOR COMPONENT
// ============================================================================

interface EffortSelectorProps {
  value: ReasoningConfig['reasoning_effort'];
  onChange: (effort: ReasoningConfig['reasoning_effort']) => void;
}

function EffortSelector({ value, onChange }: EffortSelectorProps) {
  const selectedLevel = EFFORT_LEVELS.find((l) => l.id === value) || EFFORT_LEVELS[1];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <span className="font-medium text-warm-900 text-sm">Reasoning Effort</span>
            <Tooltip content="Controls how much computational effort the model puts into reasoning. Higher effort = better results for complex problems, but slower.">
              <Info className="w-3.5 h-3.5 text-warm-400 ml-1.5 inline" />
            </Tooltip>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-lg font-medium text-sm ${selectedLevel.bgColor} ${selectedLevel.textColor}`}>
          {selectedLevel.name}
        </div>
      </div>

      {/* Effort level cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {EFFORT_LEVELS.map((level) => {
          const isSelected = value === level.id;
          return (
            <button
              key={level.id}
              onClick={() => onChange(level.id)}
              className={`
                relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all duration-200
                ${isSelected
                  ? `${level.borderColor} ${level.bgColor} shadow-lg`
                  : 'border-warm-200 bg-white hover:border-warm-300'
                }
              `}
            >
              {/* Gradient bar */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${level.color}`} />

              {/* Icon */}
              <div className={`
                w-10 h-10 rounded-xl flex items-center justify-center mb-3
                ${isSelected ? level.bgColor : 'bg-warm-100'}
                ${isSelected ? level.textColor : 'text-warm-500'}
              `}>
                {level.icon}
              </div>

              {/* Content */}
              <h4 className={`font-semibold text-sm ${isSelected ? level.textColor : 'text-warm-900'}`}>
                {level.name}
              </h4>
              <p className="text-xs text-warm-500 mt-1 line-clamp-2">
                {level.description}
              </p>

              {/* Selected indicator */}
              {isSelected && (
                <div className={`absolute top-3 right-3 w-5 h-5 rounded-full ${level.textColor} flex items-center justify-center`}>
                  <Check className="w-3.5 h-3.5" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Effort description */}
      <div className={`p-3 rounded-xl ${selectedLevel.bgColor} ${selectedLevel.borderColor} border`}>
        <div className="flex items-start gap-3">
          <Lightbulb className={`w-5 h-5 ${selectedLevel.textColor} flex-shrink-0 mt-0.5`} />
          <div>
            <p className={`text-sm ${selectedLevel.textColor}`}>
              {value === 'low' && 'Best for simple questions, quick lookups, and straightforward tasks. Minimal processing time.'}
              {value === 'medium' && 'Ideal for most tasks. Balances speed and quality for everyday reasoning needs.'}
              {value === 'high' && 'Recommended for complex problems requiring multi-step reasoning, analysis, or creative work.'}
              {value === 'max' && 'Maximum cognitive power for the hardest problems. Expect longer response times but superior reasoning.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// THINKING BUDGET SLIDER COMPONENT
// ============================================================================

interface ThinkingBudgetSliderProps {
  value: number;
  onChange: (value: number) => void;
}

function ThinkingBudgetSlider({ value, onChange }: ThinkingBudgetSliderProps) {
  const budgetPresets = [4096, 8192, 16384, 32768, 65536, 100000];
  const fillPercentage = (value / 100000) * 100;

  const formatBudget = (tokens: number) => {
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(0)}K`;
    }
    return tokens.toString();
  };

  return (
    <div className="bg-white border border-warm-200 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-warm-900 text-sm">Thinking Budget</span>
              <Tooltip content="Maximum tokens the model can use for internal reasoning. More budget = more thorough thinking but higher latency and cost.">
                <Info className="w-3.5 h-3.5 text-warm-400" />
              </Tooltip>
            </div>
            <AdvancedBadge />
          </div>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 font-mono text-sm font-medium">
          {formatBudget(value)} tokens
        </div>
      </div>

      {/* Slider */}
      <div className="relative mb-3">
        <input
          type="range"
          min={1024}
          max={100000}
          step={1024}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #14B8A6 0%, #14B8A6 ${fillPercentage}%, #E5E7EB ${fillPercentage}%, #E5E7EB 100%)`,
          }}
        />
        <div className="flex justify-between mt-1.5 text-[10px] text-warm-400">
          <span>1K</span>
          <span>100K</span>
        </div>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {budgetPresets.map((preset) => (
          <button
            key={preset}
            onClick={() => onChange(preset)}
            className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
              value === preset
                ? 'bg-teal-500 text-white'
                : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
            }`}
          >
            {formatBudget(preset)}
          </button>
        ))}
      </div>

      {/* Estimate */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-warm-100 text-xs text-warm-500">
        <TrendingUp className="w-3.5 h-3.5" />
        <span>
          Estimated thinking time: {value < 8000 ? '2-5s' : value < 32000 ? '5-15s' : value < 65000 ? '15-45s' : '45s-2min'}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// INFLECTIONS/REFLECTIONS SLIDER COMPONENT
// ============================================================================

interface ReasoningSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  defaultValue: number;
  icon: React.ReactNode;
  tooltip: string;
  onChange: (value: number) => void;
  onReset: () => void;
}

function ReasoningSlider({
  label,
  value,
  min,
  max,
  defaultValue,
  icon,
  tooltip,
  onChange,
  onReset,
}: ReasoningSliderProps) {
  const isModified = value !== defaultValue;
  const fillPercentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="bg-white border border-warm-200 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-warm-900 text-sm">{label}</span>
              <Tooltip content={tooltip}>
                <Info className="w-3.5 h-3.5 text-warm-400" />
              </Tooltip>
            </div>
            <AdvancedBadge />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isModified && (
            <button
              onClick={onReset}
              className="p-1.5 rounded-lg text-warm-400 hover:text-warm-600 hover:bg-warm-100 transition-colors"
              title="Reset to default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <div className={`px-2.5 py-1 rounded-lg font-mono text-sm ${
            isModified ? 'bg-teal-50 text-teal-700' : 'bg-warm-100 text-warm-600'
          }`}>
            {value}
          </div>
        </div>
      </div>

      {/* Slider */}
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #14B8A6 0%, #14B8A6 ${fillPercentage}%, #E5E7EB ${fillPercentage}%, #E5E7EB 100%)`,
        }}
      />
      <div className="flex justify-between mt-1 text-[10px] text-warm-400">
        <span>{min}</span>
        <span className="text-warm-300">default: {defaultValue}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

// ============================================================================
// CONFIDENCE THRESHOLD SLIDER
// ============================================================================

interface ConfidenceSliderProps {
  value: number;
  onChange: (value: number) => void;
  onReset: () => void;
}

function ConfidenceSlider({ value, onChange, onReset }: ConfidenceSliderProps) {
  const isModified = value !== DEFAULT_REASONING_CONFIG.confidence_threshold;
  const fillPercentage = value * 100;

  const getConfidenceLabel = (val: number) => {
    if (val < 0.3) return 'Very Low';
    if (val < 0.5) return 'Low';
    if (val < 0.7) return 'Medium';
    if (val < 0.9) return 'High';
    return 'Very High';
  };

  return (
    <div className="bg-white border border-warm-200 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-warm-900 text-sm">Confidence Threshold</span>
              <Tooltip content="Minimum confidence required before providing an answer. Higher values mean the model will think longer and be more certain.">
                <Info className="w-3.5 h-3.5 text-warm-400" />
              </Tooltip>
            </div>
            <AdvancedBadge />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isModified && (
            <button
              onClick={onReset}
              className="p-1.5 rounded-lg text-warm-400 hover:text-warm-600 hover:bg-warm-100 transition-colors"
              title="Reset to default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <div className={`px-2.5 py-1 rounded-lg text-sm ${
            isModified ? 'bg-teal-50 text-teal-700' : 'bg-warm-100 text-warm-600'
          }`}>
            {(value * 100).toFixed(0)}% <span className="text-warm-400 text-xs">({getConfidenceLabel(value)})</span>
          </div>
        </div>
      </div>

      {/* Slider */}
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #14B8A6 0%, #14B8A6 ${fillPercentage}%, #E5E7EB ${fillPercentage}%, #E5E7EB 100%)`,
        }}
      />
      <div className="flex justify-between mt-1 text-[10px] text-warm-400">
        <span>0%</span>
        <span>100%</span>
      </div>

      {/* Description */}
      <p className="text-xs text-warm-500 mt-2">
        {value < 0.5
          ? 'Lower threshold: Faster responses, but may be less accurate.'
          : value < 0.8
            ? 'Balanced threshold: Good for most tasks.'
            : 'Higher threshold: More accurate but may take longer to respond.'}
      </p>
    </div>
  );
}

// ============================================================================
// SHOW THINKING TOGGLE
// ============================================================================

interface ShowThinkingToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

function ShowThinkingToggle({ value, onChange }: ShowThinkingToggleProps) {
  return (
    <div className="bg-white border border-warm-200 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
            {value ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-warm-900">Show Thinking Process</span>
              <Tooltip content="When enabled, you can see the model's internal reasoning and thought process as it works through the problem.">
                <Info className="w-3.5 h-3.5 text-warm-400" />
              </Tooltip>
            </div>
            <p className="text-sm text-warm-500">
              {value
                ? 'Reasoning steps will be visible'
                : 'Only final answer will be shown'}
            </p>
          </div>
        </div>
        <button
          onClick={() => onChange(!value)}
          className={`relative w-14 h-8 rounded-full transition-colors ${
            value ? 'bg-teal-500' : 'bg-warm-200'
          }`}
        >
          <span
            className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
              value ? 'left-7' : 'left-1'
            }`}
          />
        </button>
      </div>

      {value && (
        <div className="mt-4 p-3 bg-teal-50 rounded-lg border border-teal-200">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-teal-600 mt-0.5" />
            <div className="text-sm text-teal-700">
              <strong>Tip:</strong> The thinking panel will show each step of the model&apos;s reasoning.
              This helps you understand how it arrived at its answer and catch any errors in logic.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN REASONING CONTROLS COMPONENT
// ============================================================================

export function ReasoningControls({
  config,
  onChange,
  modelName = 'o1',
  supportsReasoning = true,
}: ReasoningControlsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = useCallback(
    <K extends keyof ReasoningConfig>(key: K, value: ReasoningConfig[K]) => {
      onChange({ ...config, [key]: value });
    },
    [config, onChange]
  );

  const resetToDefaults = () => {
    onChange({ ...DEFAULT_REASONING_CONFIG });
  };

  // Check if any values are modified
  const isModified = Object.keys(config).some(
    (key) => config[key as keyof ReasoningConfig] !== DEFAULT_REASONING_CONFIG[key as keyof ReasoningConfig]
  );

  if (!supportsReasoning) {
    return (
      <div className="bg-warm-50 border border-warm-200 rounded-xl p-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-warm-100 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-warm-400" />
        </div>
        <h4 className="font-medium text-warm-900 mb-2">Reasoning Not Supported</h4>
        <p className="text-sm text-warm-500 max-w-sm mx-auto">
          The current model ({modelName}) doesn&apos;t support extended reasoning.
          Try switching to o1, o3, or DeepSeek R1 for advanced reasoning capabilities.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-warm-900 flex items-center gap-2">
            <Brain className="w-5 h-5 text-teal-500" />
            Reasoning Controls
          </h3>
          <p className="text-sm text-warm-500">
            Configure extended thinking for {modelName}
          </p>
        </div>
        {isModified && (
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-warm-600 hover:text-warm-900 hover:bg-warm-100 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset All
          </button>
        )}
      </div>

      {/* Effort Selector */}
      <EffortSelector
        value={config.reasoning_effort}
        onChange={(effort) => handleChange('reasoning_effort', effort)}
      />

      {/* Show Thinking Toggle */}
      <ShowThinkingToggle
        value={config.show_thinking}
        onChange={(value) => handleChange('show_thinking', value)}
      />

      {/* Advanced Section Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full flex items-center justify-center gap-2 py-3 text-sm text-warm-500 hover:text-warm-700 border border-dashed border-warm-200 rounded-xl hover:border-warm-300 transition-colors"
      >
        {showAdvanced ? (
          <>
            <ChevronUp className="w-4 h-4" />
            Hide Advanced Controls
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            Show Advanced Controls
          </>
        )}
      </button>

      {/* Advanced Controls */}
      {showAdvanced && (
        <div className="space-y-4 pt-2">
          {/* Thinking Budget */}
          <ThinkingBudgetSlider
            value={config.thinking_budget}
            onChange={(value) => handleChange('thinking_budget', value)}
          />

          {/* Inflections and Reflections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReasoningSlider
              label="Max Inflections"
              value={config.max_inflections}
              min={1}
              max={20}
              defaultValue={DEFAULT_REASONING_CONFIG.max_inflections}
              icon={<GitBranch className="w-4 h-4" />}
              tooltip="Maximum number of reasoning path changes. More inflections allow the model to explore more approaches."
              onChange={(value) => handleChange('max_inflections', value)}
              onReset={() => handleChange('max_inflections', DEFAULT_REASONING_CONFIG.max_inflections)}
            />

            <ReasoningSlider
              label="Max Reflections"
              value={config.max_reflections}
              min={1}
              max={10}
              defaultValue={DEFAULT_REASONING_CONFIG.max_reflections}
              icon={<Repeat className="w-4 h-4" />}
              tooltip="Maximum times the model can review and revise its reasoning. More reflections = more thorough self-checking."
              onChange={(value) => handleChange('max_reflections', value)}
              onReset={() => handleChange('max_reflections', DEFAULT_REASONING_CONFIG.max_reflections)}
            />
          </div>

          {/* Confidence Threshold */}
          <ConfidenceSlider
            value={config.confidence_threshold}
            onChange={(value) => handleChange('confidence_threshold', value)}
            onReset={() => handleChange('confidence_threshold', DEFAULT_REASONING_CONFIG.confidence_threshold)}
          />
        </div>
      )}

      {/* Current Config Summary */}
      <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-teal-600" />
          <span className="font-medium text-teal-900 text-sm">Current Configuration</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-2 bg-white/60 rounded-lg">
            <div className="text-lg font-semibold text-teal-700 capitalize">{config.reasoning_effort}</div>
            <div className="text-xs text-teal-600">Effort</div>
          </div>
          <div className="text-center p-2 bg-white/60 rounded-lg">
            <div className="text-lg font-semibold text-teal-700">{(config.thinking_budget / 1000).toFixed(0)}K</div>
            <div className="text-xs text-teal-600">Budget</div>
          </div>
          <div className="text-center p-2 bg-white/60 rounded-lg">
            <div className="text-lg font-semibold text-teal-700">{config.max_inflections}</div>
            <div className="text-xs text-teal-600">Inflections</div>
          </div>
          <div className="text-center p-2 bg-white/60 rounded-lg">
            <div className="text-lg font-semibold text-teal-700">{(config.confidence_threshold * 100).toFixed(0)}%</div>
            <div className="text-xs text-teal-600">Confidence</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { EFFORT_LEVELS };
export default ReasoningControls;
