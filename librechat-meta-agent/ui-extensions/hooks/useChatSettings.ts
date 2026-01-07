'use client';

import { useCallback, useMemo } from 'react';
import { useSettings, getSettingsForAPI } from '@/lib/settings-context';
import type { UserSettings, ModelParameters, ReasoningConfig } from '@/lib/settings-context';

// ============================================================================
// TYPES
// ============================================================================

export interface ChatRequestSettings {
  model: string;
  temperature: number;
  top_p: number;
  top_k: number;
  frequency_penalty: number;
  presence_penalty: number;
  max_tokens: number;
  seed?: number;
  stop?: string[];
  thinking?: {
    type: 'enabled';
    budget_tokens: number;
  };
}

export interface UseChatSettingsReturn {
  // Current settings ready for API
  chatSettings: ChatRequestSettings;

  // Individual settings for display
  modelParameters: ModelParameters;
  reasoningConfig: ReasoningConfig;
  selectedModel: string;

  // Loading state
  isLoading: boolean;
  isSaving: boolean;

  // Actions
  setModel: (model: string) => void;
  updateTemperature: (temp: number) => void;
  updateTopP: (topP: number) => void;
  updateMaxTokens: (tokens: number) => void;
  updateThinkingBudget: (budget: number) => void;
  toggleThinking: () => void;

  // Presets
  applyPreset: (presetId: string) => void;
  resetToDefaults: () => void;

  // For sending with fetch
  getAPISettings: () => ChatRequestSettings;
}

// ============================================================================
// HOOK
// ============================================================================

export function useChatSettings(): UseChatSettingsReturn {
  const {
    settings,
    isLoading,
    isSaving,
    setSelectedModel,
    updateModelParameters,
    updateReasoningConfig,
    applyPreset,
    resetAllSettings,
  } = useSettings();

  // Memoize chat settings to prevent unnecessary re-renders
  const chatSettings = useMemo(() => {
    return getSettingsForAPI(settings);
  }, [settings]);

  // Actions
  const setModel = useCallback((model: string) => {
    setSelectedModel(model);
  }, [setSelectedModel]);

  const updateTemperature = useCallback((temp: number) => {
    updateModelParameters({ temperature: temp });
  }, [updateModelParameters]);

  const updateTopP = useCallback((topP: number) => {
    updateModelParameters({ top_p: topP });
  }, [updateModelParameters]);

  const updateMaxTokens = useCallback((tokens: number) => {
    updateModelParameters({ max_output_tokens: tokens });
  }, [updateModelParameters]);

  const updateThinkingBudget = useCallback((budget: number) => {
    updateReasoningConfig({ thinking_budget: budget });
  }, [updateReasoningConfig]);

  const toggleThinking = useCallback(() => {
    updateReasoningConfig({ show_thinking: !settings.reasoningConfig.show_thinking });
  }, [updateReasoningConfig, settings.reasoningConfig.show_thinking]);

  // For directly getting settings to send with fetch
  const getAPISettings = useCallback(() => {
    return getSettingsForAPI(settings);
  }, [settings]);

  return {
    chatSettings,
    modelParameters: settings.modelParameters,
    reasoningConfig: settings.reasoningConfig,
    selectedModel: settings.selectedModel,
    isLoading,
    isSaving,
    setModel,
    updateTemperature,
    updateTopP,
    updateMaxTokens,
    updateThinkingBudget,
    toggleThinking,
    applyPreset,
    resetToDefaults: resetAllSettings,
    getAPISettings,
  };
}

// ============================================================================
// HELPER - Build chat request body
// ============================================================================

export function buildChatRequest(
  messages: Array<{ role: string; content: string }>,
  settings: ChatRequestSettings,
  options?: {
    tools?: string[];
    stream?: boolean;
  }
) {
  return {
    messages,
    model: settings.model,
    stream: options?.stream ?? true,
    tools: options?.tools || [],
    settings: {
      modelParameters: {
        temperature: settings.temperature,
        top_p: settings.top_p,
        top_k: settings.top_k,
        frequency_penalty: settings.frequency_penalty,
        presence_penalty: settings.presence_penalty,
        max_output_tokens: settings.max_tokens,
        seed: settings.seed || null,
        stop_sequences: settings.stop || [],
      },
      reasoningConfig: settings.thinking ? {
        reasoning_effort: 'medium',
        thinking_budget: settings.thinking.budget_tokens,
        show_thinking: true,
        max_inflections: 5,
        max_reflections: 3,
        confidence_threshold: 0.7,
      } : {
        reasoning_effort: 'medium',
        thinking_budget: 16384,
        show_thinking: false,
        max_inflections: 5,
        max_reflections: 3,
        confidence_threshold: 0.7,
      },
      selectedModel: settings.model,
    },
  };
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

/*
function ChatComponent() {
  const { chatSettings, setModel, updateTemperature, getAPISettings } = useChatSettings();

  const sendMessage = async (content: string) => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildChatRequest(
        [...messages, { role: 'user', content }],
        getAPISettings(),
        { tools: ['web_search'], stream: true }
      )),
    });

    // Handle streaming response...
  };

  return (
    <div>
      <ModelSelector value={chatSettings.model} onChange={setModel} />
      <TemperatureSlider value={chatSettings.temperature} onChange={updateTemperature} />
      <ChatInput onSend={sendMessage} />
    </div>
  );
}
*/

export default useChatSettings;
