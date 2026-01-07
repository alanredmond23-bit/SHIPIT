'use client';

import React from 'react';
import { ModelParametersPanel, DEFAULT_PARAMETERS, type ModelParameters } from '@/components/Settings/ModelParameters';
import { ReasoningControls, DEFAULT_REASONING_CONFIG, type ReasoningConfig } from '@/components/Settings/ReasoningControls';
import { useSettings } from '@/lib/settings-context';
import { Save, Cloud, CloudOff, Loader2 } from 'lucide-react';

/**
 * Connected Model Controls Panel
 *
 * This component wraps ModelParametersPanel and ReasoningControls
 * and connects them to the SettingsContext for automatic persistence.
 *
 * Usage:
 * <ConnectedModelControls />
 *
 * All changes are automatically saved to the backend via the context.
 */
export function ConnectedModelControls() {
  const {
    settings,
    updateModelParameters,
    updateReasoningConfig,
    isLoading,
    isSaving,
    lastSaved,
    error,
  } = useSettings();

  // Convert context settings to component format
  const modelParams: ModelParameters = {
    temperature: settings.modelParameters.temperature,
    top_p: settings.modelParameters.top_p,
    top_k: settings.modelParameters.top_k,
    frequency_penalty: settings.modelParameters.frequency_penalty,
    presence_penalty: settings.modelParameters.presence_penalty,
    max_output_tokens: settings.modelParameters.max_output_tokens,
    seed: settings.modelParameters.seed,
    stop_sequences: settings.modelParameters.stop_sequences,
  };

  const reasoningConfig: ReasoningConfig = {
    reasoning_effort: settings.reasoningConfig.reasoning_effort as ReasoningConfig['reasoning_effort'],
    thinking_budget: settings.reasoningConfig.thinking_budget,
    show_thinking: settings.reasoningConfig.show_thinking,
    max_inflections: settings.reasoningConfig.max_inflections,
    max_reflections: settings.reasoningConfig.max_reflections,
    confidence_threshold: settings.reasoningConfig.confidence_threshold,
  };

  // Handle model parameter changes
  const handleModelParamsChange = (params: ModelParameters) => {
    updateModelParameters(params);
  };

  // Handle reasoning config changes
  const handleReasoningChange = (config: ReasoningConfig) => {
    updateReasoningConfig(config);
  };

  // Check if model supports reasoning
  const supportsReasoning =
    settings.selectedModel.includes('claude') ||
    settings.selectedModel.includes('o1') ||
    settings.selectedModel.includes('o3') ||
    settings.selectedModel.includes('deepseek-r1') ||
    settings.selectedModel.includes('gemini');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
        <span className="ml-3 text-warm-500">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Status Bar */}
      <div className="flex items-center justify-between p-3 bg-warm-50 rounded-xl border border-warm-200">
        <div className="flex items-center gap-3">
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
              <span className="text-sm text-warm-600">Saving...</span>
            </>
          ) : error ? (
            <>
              <CloudOff className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-600">{error}</span>
            </>
          ) : (
            <>
              <Cloud className="w-4 h-4 text-teal-500" />
              <span className="text-sm text-warm-600">
                {lastSaved
                  ? `Last saved ${lastSaved.toLocaleTimeString()}`
                  : 'Auto-save enabled'}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-warm-400 bg-warm-100 px-2 py-1 rounded">
            Model: {settings.selectedModel.split('-').slice(0, 2).join(' ')}
          </span>
        </div>
      </div>

      {/* Model Parameters */}
      <ModelParametersPanel
        parameters={modelParams}
        onChange={handleModelParamsChange}
        modelName={settings.selectedModel}
        showAdvanced={false}
      />

      {/* Reasoning Controls */}
      <ReasoningControls
        config={reasoningConfig}
        onChange={handleReasoningChange}
        modelName={settings.selectedModel}
        supportsReasoning={supportsReasoning}
      />

      {/* Settings Summary */}
      <div className="p-4 bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl">
        <h4 className="font-medium text-teal-900 mb-3 flex items-center gap-2">
          <Save className="w-4 h-4" />
          Current Settings Summary
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-teal-600 text-xs uppercase tracking-wide">Temperature</div>
            <div className="font-mono text-teal-800">{modelParams.temperature.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-teal-600 text-xs uppercase tracking-wide">Max Tokens</div>
            <div className="font-mono text-teal-800">{modelParams.max_output_tokens.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-teal-600 text-xs uppercase tracking-wide">Thinking Budget</div>
            <div className="font-mono text-teal-800">{(reasoningConfig.thinking_budget / 1000).toFixed(0)}K</div>
          </div>
          <div>
            <div className="text-teal-600 text-xs uppercase tracking-wide">Effort Level</div>
            <div className="font-mono text-teal-800 capitalize">{reasoningConfig.reasoning_effort}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConnectedModelControls;
