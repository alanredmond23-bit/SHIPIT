'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  RefreshCw,
  Layers,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Info,
  Play,
  Pause,
  RotateCcw,
  TrendingUp,
  Shield,
  Sparkles,
  Target,
  Gauge
} from 'lucide-react';

// ============================================================================
// INTERFACES
// ============================================================================

interface ResearchIterationConfig {
  current_iteration: number;
  max_iterations: number;
  sources_found: number;
  sources_verified: number;
  fact_verification: boolean;
  quality_threshold: number; // 0.0 - 1.0
  auto_continue: boolean;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
}

interface ResearchIterationsProps {
  config: ResearchIterationConfig;
  onChange: (config: Partial<ResearchIterationConfig>) => void;
  onStart?: () => void;
  onPause?: () => void;
  onReset?: () => void;
  disabled?: boolean;
  className?: string;
}

interface IterationStep {
  iteration: number;
  status: 'pending' | 'active' | 'completed' | 'skipped';
  sourcesFound: number;
  factsVerified: number;
  qualityScore: number;
}

// ============================================================================
// TOOLTIP COMPONENT
// ============================================================================

function Tooltip({ 
  children, 
  content,
  position = 'top'
}: { 
  children: React.ReactNode; 
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}) {
  const [show, setShow] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-warm-900',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-warm-900',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-warm-900',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-warm-900',
  };

  return (
    <div className="relative inline-flex">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {children}
      </div>
      {show && (
        <div className={`absolute ${positionClasses[position]} px-3 py-2 bg-warm-900 text-white text-xs rounded-lg whitespace-nowrap z-50 shadow-lg max-w-xs`}>
          {content}
          <div className={`absolute border-4 border-transparent ${arrowClasses[position]}`} />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ITERATION PROGRESS RING
// ============================================================================

function IterationProgressRing({ 
  current, 
  max, 
  status 
}: { 
  current: number; 
  max: number; 
  status: string;
}) {
  const percentage = max > 0 ? (current / max) * 100 : 0;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const statusColors = {
    idle: 'text-warm-300',
    running: 'text-teal-500',
    paused: 'text-yellow-500',
    completed: 'text-green-500',
    error: 'text-red-500',
  };

  return (
    <div className="relative w-32 h-32">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-warm-100"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={`${statusColors[status as keyof typeof statusColors]} transition-all duration-500`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-warm-900">{current}</span>
        <span className="text-sm text-warm-500">of {max}</span>
      </div>
    </div>
  );
}

// ============================================================================
// ITERATION TIMELINE
// ============================================================================

function IterationTimeline({ 
  current, 
  max, 
  steps 
}: { 
  current: number; 
  max: number; 
  steps: IterationStep[];
}) {
  return (
    <div className="relative">
      {/* Progress line */}
      <div className="absolute top-4 left-4 right-4 h-1 bg-warm-100 rounded-full">
        <div 
          className="h-full bg-gradient-to-r from-teal-400 to-teal-500 rounded-full transition-all duration-500"
          style={{ width: `${(current / max) * 100}%` }}
        />
      </div>

      {/* Steps */}
      <div className="relative flex justify-between">
        {Array.from({ length: Math.min(max, 10) }).map((_, i) => {
          const stepNum = i + 1;
          const isCompleted = stepNum < current;
          const isActive = stepNum === current;
          const isPending = stepNum > current;
          const step = steps[i];

          return (
            <div key={i} className="flex flex-col items-center">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  transition-all duration-300 z-10
                  ${isCompleted 
                    ? 'bg-teal-500 text-white' 
                    : isActive 
                      ? 'bg-teal-100 text-teal-600 ring-4 ring-teal-200 animate-pulse' 
                      : 'bg-warm-100 text-warm-400'
                  }
                `}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  stepNum
                )}
              </div>
              {step && isCompleted && (
                <div className="mt-2 text-center">
                  <div className="text-xs text-warm-500">{step.sourcesFound} src</div>
                  <div className="text-xs text-teal-500">{Math.round(step.qualityScore * 100)}%</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {max > 10 && (
        <div className="text-center mt-4 text-xs text-warm-400">
          Showing first 10 of {max} iterations
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STAT CARD
// ============================================================================

function StatCard({ 
  icon, 
  label, 
  value, 
  subValue, 
  color = 'teal' 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number; 
  subValue?: string;
  color?: 'teal' | 'blue' | 'green' | 'purple' | 'warm';
}) {
  const colors = {
    teal: 'bg-teal-50 text-teal-600 border-teal-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    warm: 'bg-warm-50 text-warm-600 border-warm-100',
  };

  return (
    <div className={`rounded-xl p-4 border ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium opacity-75">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subValue && (
        <div className="text-xs opacity-60 mt-1">{subValue}</div>
      )}
    </div>
  );
}

// ============================================================================
// QUALITY THRESHOLD SLIDER
// ============================================================================

function QualityThresholdSlider({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const percentage = Math.round(value * 100);

  const getQualityLabel = (v: number) => {
    if (v < 0.3) return { label: 'Lenient', color: 'text-yellow-600' };
    if (v < 0.5) return { label: 'Balanced', color: 'text-teal-600' };
    if (v < 0.7) return { label: 'Strict', color: 'text-blue-600' };
    if (v < 0.9) return { label: 'Rigorous', color: 'text-purple-600' };
    return { label: 'Maximum', color: 'text-warm-600' };
  };

  const { label, color } = getQualityLabel(value);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-warm-400" />
          <span className="text-sm font-medium text-warm-700">Quality Threshold</span>
          <Tooltip content="Minimum quality score required for sources to be included. Higher values mean stricter filtering.">
            <Info className="w-3.5 h-3.5 text-warm-300 cursor-help" />
          </Tooltip>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${color}`}>{label}</span>
          <span className="text-sm text-warm-500">({percentage}%)</span>
        </div>
      </div>

      <div className="relative">
        <input
          type="range"
          min="0"
          max="100"
          value={percentage}
          onChange={(e) => onChange(parseInt(e.target.value, 10) / 100)}
          disabled={disabled}
          className={`
            w-full h-2 rounded-full appearance-none cursor-pointer
            bg-gradient-to-r from-yellow-200 via-teal-200 via-blue-200 to-purple-200
            disabled:opacity-50 disabled:cursor-not-allowed
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:border-3
            [&::-webkit-slider-thumb]:border-teal-500
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-moz-range-thumb]:w-5
            [&::-moz-range-thumb]:h-5
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-white
            [&::-moz-range-thumb]:border-3
            [&::-moz-range-thumb]:border-teal-500
            [&::-moz-range-thumb]:shadow-md
          `}
        />
      </div>

      {/* Quality scale labels */}
      <div className="flex justify-between text-xs text-warm-400">
        <span>Lenient</span>
        <span>Balanced</span>
        <span>Strict</span>
        <span>Maximum</span>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT: ResearchIterations
// ============================================================================

export function ResearchIterations({
  config,
  onChange,
  onStart,
  onPause,
  onReset,
  disabled = false,
  className = '',
}: ResearchIterationsProps) {
  // Mock iteration steps for visualization
  const [steps, setSteps] = useState<IterationStep[]>([]);

  // Generate mock steps when config changes
  useEffect(() => {
    const newSteps: IterationStep[] = Array.from({ length: config.max_iterations }).map((_, i) => ({
      iteration: i + 1,
      status: i + 1 < config.current_iteration 
        ? 'completed' 
        : i + 1 === config.current_iteration 
          ? 'active' 
          : 'pending',
      sourcesFound: i + 1 < config.current_iteration ? Math.floor(Math.random() * 15) + 5 : 0,
      factsVerified: i + 1 < config.current_iteration ? Math.floor(Math.random() * 10) + 2 : 0,
      qualityScore: i + 1 < config.current_iteration ? Math.random() * 0.3 + 0.6 : 0,
    }));
    setSteps(newSteps);
  }, [config.current_iteration, config.max_iterations]);

  const handleMaxIterationsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ max_iterations: parseInt(e.target.value, 10) });
  }, [onChange]);

  const statusConfig = {
    idle: { label: 'Ready', color: 'bg-warm-100 text-warm-600', icon: <Target className="w-4 h-4" /> },
    running: { label: 'Researching...', color: 'bg-teal-100 text-teal-600', icon: <RefreshCw className="w-4 h-4 animate-spin" /> },
    paused: { label: 'Paused', color: 'bg-yellow-100 text-yellow-600', icon: <Pause className="w-4 h-4" /> },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-600', icon: <CheckCircle2 className="w-4 h-4" /> },
    error: { label: 'Error', color: 'bg-red-100 text-red-600', icon: <AlertCircle className="w-4 h-4" /> },
  };

  const currentStatus = statusConfig[config.status];

  return (
    <div className={`bg-white rounded-2xl border border-warm-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-warm-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <RefreshCw className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-warm-900 text-lg">Research Iterations</h3>
              <p className="text-warm-500 text-sm">Live iteration progress and controls</p>
            </div>
          </div>

          {/* Status Badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${currentStatus.color}`}>
            {currentStatus.icon}
            <span>{currentStatus.label}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Progress Ring and Stats */}
        <div className="flex items-center gap-8 mb-8">
          <IterationProgressRing 
            current={config.current_iteration} 
            max={config.max_iterations}
            status={config.status}
          />

          <div className="flex-1 grid grid-cols-2 gap-4">
            <StatCard
              icon={<BookOpen className="w-4 h-4" />}
              label="Sources Found"
              value={config.sources_found}
              subValue="Total discovered"
              color="teal"
            />
            <StatCard
              icon={<CheckCircle2 className="w-4 h-4" />}
              label="Verified"
              value={config.sources_verified}
              subValue={`${config.sources_found > 0 ? Math.round((config.sources_verified / config.sources_found) * 100) : 0}% verified`}
              color="green"
            />
          </div>
        </div>

        {/* Iteration Timeline */}
        <div className="mb-8">
          <h4 className="text-sm font-medium text-warm-700 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-warm-400" />
            Iteration Progress
          </h4>
          <IterationTimeline 
            current={config.current_iteration} 
            max={config.max_iterations}
            steps={steps}
          />
        </div>

        {/* Max Iterations Slider */}
        <div className="mb-6 p-4 bg-warm-50 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-warm-400" />
              <span className="text-sm font-medium text-warm-700">Max Iterations</span>
              <Tooltip content="Maximum number of research cycles. Each iteration deepens the search and verifies findings.">
                <Info className="w-3.5 h-3.5 text-warm-300 cursor-help" />
              </Tooltip>
            </div>
            <span className="text-lg font-bold text-warm-900">{config.max_iterations}</span>
          </div>

          <input
            type="range"
            min="1"
            max="20"
            value={config.max_iterations}
            onChange={handleMaxIterationsChange}
            disabled={disabled || config.status === 'running'}
            className={`
              w-full h-2 rounded-full appearance-none cursor-pointer bg-warm-200
              disabled:opacity-50 disabled:cursor-not-allowed
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-teal-500
              [&::-webkit-slider-thumb]:shadow-md
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-moz-range-thumb]:w-5
              [&::-moz-range-thumb]:h-5
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-teal-500
              [&::-moz-range-thumb]:shadow-md
            `}
          />

          <div className="flex justify-between mt-2 text-xs text-warm-400">
            <span>1 (Quick)</span>
            <span>5</span>
            <span>10</span>
            <span>15</span>
            <span>20 (Exhaustive)</span>
          </div>
        </div>

        {/* Quality Threshold */}
        <div className="mb-6 p-4 bg-warm-50 rounded-xl">
          <QualityThresholdSlider
            value={config.quality_threshold}
            onChange={(v) => onChange({ quality_threshold: v })}
            disabled={disabled || config.status === 'running'}
          />
        </div>

        {/* Toggle Options */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Fact Verification Toggle */}
          <label className={`
            flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all
            ${config.fact_verification 
              ? 'border-teal-300 bg-teal-50' 
              : 'border-warm-200 bg-white hover:border-warm-300'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}>
            <input
              type="checkbox"
              checked={config.fact_verification}
              onChange={(e) => onChange({ fact_verification: e.target.checked })}
              disabled={disabled}
              className="sr-only"
            />
            <div className={`
              w-10 h-6 rounded-full relative transition-colors
              ${config.fact_verification ? 'bg-teal-500' : 'bg-warm-300'}
            `}>
              <div className={`
                absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all
                ${config.fact_verification ? 'left-5' : 'left-1'}
              `} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-teal-500" />
                <span className="text-sm font-medium text-warm-700">Fact Verification</span>
              </div>
              <span className="text-xs text-warm-500">Cross-check facts across sources</span>
            </div>
          </label>

          {/* Auto Continue Toggle */}
          <label className={`
            flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all
            ${config.auto_continue 
              ? 'border-blue-300 bg-blue-50' 
              : 'border-warm-200 bg-white hover:border-warm-300'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}>
            <input
              type="checkbox"
              checked={config.auto_continue}
              onChange={(e) => onChange({ auto_continue: e.target.checked })}
              disabled={disabled}
              className="sr-only"
            />
            <div className={`
              w-10 h-6 rounded-full relative transition-colors
              ${config.auto_continue ? 'bg-blue-500' : 'bg-warm-300'}
            `}>
              <div className={`
                absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all
                ${config.auto_continue ? 'left-5' : 'left-1'}
              `} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-warm-700">Auto Continue</span>
              </div>
              <span className="text-xs text-warm-500">Continue until quality met</span>
            </div>
          </label>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-3">
          {config.status === 'idle' || config.status === 'paused' ? (
            <button
              onClick={onStart}
              disabled={disabled}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                bg-teal-500 text-white font-medium
                hover:bg-teal-600 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <Play className="w-5 h-5" />
              <span>{config.status === 'paused' ? 'Resume' : 'Start Research'}</span>
            </button>
          ) : config.status === 'running' ? (
            <button
              onClick={onPause}
              disabled={disabled}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                bg-yellow-500 text-white font-medium
                hover:bg-yellow-600 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <Pause className="w-5 h-5" />
              <span>Pause</span>
            </button>
          ) : null}

          <button
            onClick={onReset}
            disabled={disabled || config.status === 'running'}
            className={`
              flex items-center justify-center gap-2 px-4 py-3 rounded-xl
              bg-warm-100 text-warm-600 font-medium
              hover:bg-warm-200 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <RotateCcw className="w-5 h-5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-6 py-4 bg-warm-50 border-t border-warm-100">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-warm-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-warm-500 leading-relaxed">
            <strong className="text-warm-600">How it works:</strong> Each iteration searches for new sources, 
            extracts facts, and verifies information against previous findings. 
            More iterations = deeper research but takes longer.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ResearchIterations;

// ============================================================================
// EXPORTS
// ============================================================================

export type { ResearchIterationConfig, ResearchIterationsProps, IterationStep };
