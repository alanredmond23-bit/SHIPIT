'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Thermometer,
  Sparkles,
  Hash,
  Repeat,
  Plus,
  Minus,
  RotateCcw,
  Info,
  X,
  Dices,
  StopCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ModelParameters {
  temperature: number;
  top_p: number;
  top_k: number;
  frequency_penalty: number;
  presence_penalty: number;
  max_output_tokens: number;
  seed: number | null;
  stop_sequences: string[];
}

interface ParameterSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  icon: React.ReactNode;
  tooltip: string;
  hiddenByCompetitors: string;
  onChange: (value: number) => void;
  onReset: () => void;
  formatValue?: (value: number) => string;
  warningThreshold?: { min?: number; max?: number; message: string };
}

interface StopSequenceInputProps {
  sequences: string[];
  onChange: (sequences: string[]) => void;
}

interface ModelParametersProps {
  parameters: ModelParameters;
  onChange: (parameters: ModelParameters) => void;
  modelName?: string;
  showAdvanced?: boolean;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_PARAMETERS: ModelParameters = {
  temperature: 0.7,
  top_p: 1.0,
  top_k: 40,
  frequency_penalty: 0.0,
  presence_penalty: 0.0,
  max_output_tokens: 4096,
  seed: null,
  stop_sequences: [],
};

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

function HiddenByCompetitorsBadge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded-full">
      <EyeOff className="w-3 h-3" />
      {text}
    </span>
  );
}

// ============================================================================
// PARAMETER SLIDER COMPONENT
// ============================================================================

function ParameterSlider({
  label,
  value,
  min,
  max,
  step,
  defaultValue,
  icon,
  tooltip,
  hiddenByCompetitors,
  onChange,
  onReset,
  formatValue = (v) => v.toFixed(2),
  warningThreshold,
}: ParameterSliderProps) {
  const isModified = value !== defaultValue;
  const showWarning = warningThreshold && (
    (warningThreshold.min !== undefined && value < warningThreshold.min) ||
    (warningThreshold.max !== undefined && value > warningThreshold.max)
  );

  // Calculate fill percentage for the slider track
  const fillPercentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="bg-white border border-warm-200 rounded-xl p-4 transition-all hover:border-warm-300">
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
            <HiddenByCompetitorsBadge text={hiddenByCompetitors} />
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
            {formatValue(value)}
          </div>
        </div>
      </div>

      {/* Slider */}
      <div className="relative mt-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #14B8A6 0%, #14B8A6 ${fillPercentage}%, #E5E7EB ${fillPercentage}%, #E5E7EB 100%)`,
          }}
        />
        {/* Min/Max labels */}
        <div className="flex justify-between mt-1 text-[10px] text-warm-400">
          <span>{formatValue(min)}</span>
          <span className="text-warm-300">default: {formatValue(defaultValue)}</span>
          <span>{formatValue(max)}</span>
        </div>
      </div>

      {/* Warning */}
      {showWarning && (
        <div className="flex items-center gap-2 mt-2 p-2 bg-amber-50 rounded-lg text-xs text-amber-700">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{warningThreshold.message}</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STOP SEQUENCES INPUT COMPONENT
// ============================================================================

function StopSequenceInput({ sequences, onChange }: StopSequenceInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addSequence = () => {
    if (inputValue.trim() && !sequences.includes(inputValue.trim())) {
      onChange([...sequences, inputValue.trim()]);
      setInputValue('');
    }
  };

  const removeSequence = (index: number) => {
    onChange(sequences.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSequence();
    }
  };

  return (
    <div className="bg-white border border-warm-200 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
            <StopCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-warm-900 text-sm">Stop Sequences</span>
              <Tooltip content="The model will stop generating when it encounters any of these sequences. Useful for preventing unwanted continuations.">
                <Info className="w-3.5 h-3.5 text-warm-400" />
              </Tooltip>
            </div>
            <HiddenByCompetitorsBadge text="ChatGPT hides this" />
          </div>
        </div>
        <span className="text-xs text-warm-400">{sequences.length}/4 sequences</span>
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter stop sequence..."
          className="flex-1 px-3 py-2 text-sm border border-warm-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          disabled={sequences.length >= 4}
        />
        <button
          onClick={addSequence}
          disabled={!inputValue.trim() || sequences.length >= 4}
          className="px-3 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:bg-warm-200 disabled:text-warm-400 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Sequence Tags */}
      {sequences.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {sequences.map((seq, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-1 bg-warm-100 rounded-lg text-sm text-warm-700"
            >
              <code className="font-mono text-xs">{seq}</code>
              <button
                onClick={() => removeSequence(index)}
                className="p-0.5 hover:bg-warm-200 rounded transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SEED INPUT COMPONENT
// ============================================================================

function SeedInput({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const [isEnabled, setIsEnabled] = useState(value !== null);
  const [localValue, setLocalValue] = useState(value?.toString() || '');

  const handleToggle = () => {
    if (isEnabled) {
      setIsEnabled(false);
      onChange(null);
    } else {
      setIsEnabled(true);
      const newSeed = Math.floor(Math.random() * 2147483647);
      setLocalValue(newSeed.toString());
      onChange(newSeed);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(parsed);
    }
  };

  const generateRandom = () => {
    const newSeed = Math.floor(Math.random() * 2147483647);
    setLocalValue(newSeed.toString());
    onChange(newSeed);
  };

  return (
    <div className="bg-white border border-warm-200 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
            <Dices className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-warm-900 text-sm">Seed</span>
              <Tooltip content="Set a specific seed for reproducible outputs. Same seed + same prompt = same response.">
                <Info className="w-3.5 h-3.5 text-warm-400" />
              </Tooltip>
            </div>
            <HiddenByCompetitorsBadge text="ChatGPT hides this" />
          </div>
        </div>
        <button
          onClick={handleToggle}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            isEnabled ? 'bg-teal-500' : 'bg-warm-200'
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              isEnabled ? 'left-6' : 'left-1'
            }`}
          />
        </button>
      </div>

      {/* Input */}
      {isEnabled && (
        <div className="flex gap-2">
          <input
            type="number"
            value={localValue}
            onChange={handleChange}
            placeholder="Enter seed value..."
            className="flex-1 px-3 py-2 text-sm font-mono border border-warm-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
          <button
            onClick={generateRandom}
            className="px-3 py-2 bg-warm-100 text-warm-600 rounded-lg hover:bg-warm-200 transition-colors"
            title="Generate random seed"
          >
            <Dices className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAX TOKENS INPUT COMPONENT
// ============================================================================

function MaxTokensInput({
  value,
  onChange,
  modelMax = 128000,
}: {
  value: number;
  onChange: (value: number) => void;
  modelMax?: number;
}) {
  const presets = [1024, 2048, 4096, 8192, 16384, 32768];
  const fillPercentage = (value / modelMax) * 100;

  return (
    <div className="bg-white border border-warm-200 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
            <Hash className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-warm-900 text-sm">Max Output Tokens</span>
              <Tooltip content="Maximum number of tokens in the response. Higher values allow longer outputs but cost more.">
                <Info className="w-3.5 h-3.5 text-warm-400" />
              </Tooltip>
            </div>
            <HiddenByCompetitorsBadge text="ChatGPT hides this" />
          </div>
        </div>
        <div className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 font-mono text-sm">
          {value.toLocaleString()}
        </div>
      </div>

      {/* Input with stepper */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => onChange(Math.max(1, value - 1024))}
          className="p-2 bg-warm-100 rounded-lg hover:bg-warm-200 transition-colors"
        >
          <Minus className="w-4 h-4 text-warm-600" />
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Math.max(1, Math.min(modelMax, parseInt(e.target.value) || 0)))}
          className="flex-1 px-3 py-2 text-sm text-center font-mono border border-warm-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
        />
        <button
          onClick={() => onChange(Math.min(modelMax, value + 1024))}
          className="p-2 bg-warm-100 rounded-lg hover:bg-warm-200 transition-colors"
        >
          <Plus className="w-4 h-4 text-warm-600" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-warm-100 rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-gradient-to-r from-teal-400 to-teal-600 transition-all duration-300"
          style={{ width: `${fillPercentage}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-warm-400 mb-3">
        <span>0</span>
        <span>Max: {modelMax.toLocaleString()}</span>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {presets.filter(p => p <= modelMax).map((preset) => (
          <button
            key={preset}
            onClick={() => onChange(preset)}
            className={`px-2 py-1 text-xs rounded-lg transition-colors ${
              value === preset
                ? 'bg-teal-500 text-white'
                : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
            }`}
          >
            {preset >= 1000 ? `${preset / 1000}K` : preset}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN MODEL PARAMETERS COMPONENT
// ============================================================================

export function ModelParametersPanel({
  parameters,
  onChange,
  modelName = 'Claude',
  showAdvanced: initialShowAdvanced = false,
}: ModelParametersProps) {
  const [showAdvanced, setShowAdvanced] = useState(initialShowAdvanced);

  const updateParameter = useCallback(
    <K extends keyof ModelParameters>(key: K, value: ModelParameters[K]) => {
      onChange({ ...parameters, key: value });
    },
    [parameters, onChange]
  );

  const handleParameterChange = useCallback(
    <K extends keyof ModelParameters>(key: K) =>
      (value: ModelParameters[K]) => {
        onChange({ ...parameters, [key]: value });
      },
    [parameters, onChange]
  );

  const resetParameter = useCallback(
    <K extends keyof ModelParameters>(key: K) =>
      () => {
        onChange({ ...parameters, [key]: DEFAULT_PARAMETERS[key] });
      },
    [parameters, onChange]
  );

  const resetAll = () => {
    onChange({ ...DEFAULT_PARAMETERS });
  };

  const modifiedCount = Object.keys(parameters).filter(
    (key) => parameters[key as keyof ModelParameters] !== DEFAULT_PARAMETERS[key as keyof ModelParameters]
  ).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-warm-900">Model Parameters</h3>
          <p className="text-sm text-warm-500">
            Fine-tune {modelName}&apos;s behavior - controls that competitors hide
          </p>
        </div>
        {modifiedCount > 0 && (
          <button
            onClick={resetAll}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-warm-600 hover:text-warm-900 hover:bg-warm-100 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset All ({modifiedCount})
          </button>
        )}
      </div>

      {/* Core Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Temperature */}
        <ParameterSlider
          label="Temperature"
          value={parameters.temperature}
          min={0}
          max={2}
          step={0.01}
          defaultValue={DEFAULT_PARAMETERS.temperature}
          icon={<Thermometer className="w-4 h-4" />}
          tooltip="Controls randomness. Lower values make output more focused and deterministic. Higher values make output more creative and varied."
          hiddenByCompetitors="ChatGPT uses a locked slider"
          onChange={handleParameterChange('temperature')}
          onReset={resetParameter('temperature')}
          warningThreshold={{
            max: 1.5,
            message: 'High temperature may produce incoherent outputs',
          }}
        />

        {/* Top P (Nucleus Sampling) */}
        <ParameterSlider
          label="Top P (Nucleus Sampling)"
          value={parameters.top_p}
          min={0}
          max={1}
          step={0.01}
          defaultValue={DEFAULT_PARAMETERS.top_p}
          icon={<Sparkles className="w-4 h-4" />}
          tooltip="Only tokens with cumulative probability <= top_p are considered. Lower values make output more focused."
          hiddenByCompetitors="ChatGPT hides this completely"
          onChange={handleParameterChange('top_p')}
          onReset={resetParameter('top_p')}
        />

        {/* Top K */}
        <ParameterSlider
          label="Top K"
          value={parameters.top_k}
          min={1}
          max={100}
          step={1}
          defaultValue={DEFAULT_PARAMETERS.top_k}
          icon={<Hash className="w-4 h-4" />}
          tooltip="Limits token selection to the top K most likely tokens. Lower values increase focus and reduce randomness."
          hiddenByCompetitors="ChatGPT hides this completely"
          onChange={handleParameterChange('top_k')}
          onReset={resetParameter('top_k')}
          formatValue={(v) => v.toFixed(0)}
        />

        {/* Frequency Penalty */}
        <ParameterSlider
          label="Frequency Penalty"
          value={parameters.frequency_penalty}
          min={-2}
          max={2}
          step={0.01}
          defaultValue={DEFAULT_PARAMETERS.frequency_penalty}
          icon={<Repeat className="w-4 h-4" />}
          tooltip="Reduces repetition of tokens that have already appeared. Positive values decrease repetition, negative values increase it."
          hiddenByCompetitors="ChatGPT hides negative values"
          onChange={handleParameterChange('frequency_penalty')}
          onReset={resetParameter('frequency_penalty')}
        />

        {/* Presence Penalty */}
        <ParameterSlider
          label="Presence Penalty"
          value={parameters.presence_penalty}
          min={-2}
          max={2}
          step={0.01}
          defaultValue={DEFAULT_PARAMETERS.presence_penalty}
          icon={<Plus className="w-4 h-4" />}
          tooltip="Encourages the model to talk about new topics. Positive values increase novelty, negative values decrease it."
          hiddenByCompetitors="ChatGPT hides negative values"
          onChange={handleParameterChange('presence_penalty')}
          onReset={resetParameter('presence_penalty')}
        />

        {/* Max Output Tokens */}
        <MaxTokensInput
          value={parameters.max_output_tokens}
          onChange={handleParameterChange('max_output_tokens')}
        />
      </div>

      {/* Advanced Section Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full flex items-center justify-center gap-2 py-3 text-sm text-warm-500 hover:text-warm-700 border border-dashed border-warm-200 rounded-xl hover:border-warm-300 transition-colors"
      >
        {showAdvanced ? (
          <>
            <ChevronUp className="w-4 h-4" />
            Hide Advanced Options
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            Show Advanced Options
          </>
        )}
      </button>

      {/* Advanced Parameters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Seed */}
          <SeedInput
            value={parameters.seed}
            onChange={handleParameterChange('seed')}
          />

          {/* Stop Sequences */}
          <StopSequenceInput
            sequences={parameters.stop_sequences}
            onChange={handleParameterChange('stop_sequences')}
          />
        </div>
      )}

      {/* Live Preview Card */}
      <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="w-4 h-4 text-teal-600" />
          <span className="font-medium text-teal-900 text-sm">Live Preview</span>
        </div>
        <p className="text-sm text-teal-700">
          {parameters.temperature < 0.3 ? (
            'Highly deterministic - Best for factual responses, code generation, and precise tasks.'
          ) : parameters.temperature < 0.7 ? (
            'Balanced - Good for general conversation and most tasks.'
          ) : parameters.temperature < 1.2 ? (
            'Creative - Great for brainstorming, storytelling, and generating diverse ideas.'
          ) : (
            'Highly random - May produce unexpected or incoherent outputs. Use with caution.'
          )}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {parameters.seed !== null && (
            <span className="text-xs px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full">
              Reproducible (seed: {parameters.seed})
            </span>
          )}
          {parameters.stop_sequences.length > 0 && (
            <span className="text-xs px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full">
              {parameters.stop_sequences.length} stop sequence{parameters.stop_sequences.length > 1 ? 's' : ''}
            </span>
          )}
          {parameters.max_output_tokens < 2048 && (
            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
              Short responses
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ModelParametersPanel;
