'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';

// ============================================================================
// TYPE DEFINITIONS - Based on BATTLE_PLAN.md requirements
// ============================================================================

export interface ModelParameters {
  temperature: number;        // 0-2
  top_p: number;              // 0-1
  top_k: number;              // 1-100
  frequency_penalty: number;  // -2 to 2
  presence_penalty: number;   // -2 to 2
  max_output_tokens: number;  // 1-128000
  seed: number | null;
  stop_sequences: string[];
}

export interface ReasoningConfig {
  reasoning_effort: 'low' | 'medium' | 'high' | 'max' | 'custom';
  thinking_budget: number;    // 1000-128000
  show_thinking: boolean;
  max_inflections: number;
  max_reflections: number;
  confidence_threshold: number;
}

export interface RAGConfig {
  chunk_size: number;
  chunk_overlap: number;
  similarity_threshold: number;
  max_chunks: number;
  embedding_model: string;
}

export interface SearchConfig {
  search_depth: number;       // 1-10
  max_sources: number;        // 1-500
  source_quality: 'any' | 'verified' | 'academic';
  include_domains: string[];
  exclude_domains: string[];
}

export interface UserSettings {
  modelParameters: ModelParameters;
  reasoningConfig: ReasoningConfig;
  ragConfig: RAGConfig;
  searchConfig: SearchConfig;
  selectedModel: string;
  selectedPreset: string | null;
  theme: 'light' | 'dark' | 'system';
}

// ============================================================================
// DEFAULT VALUES - Competitive targets from BATTLE_PLAN.md
// ============================================================================

export const DEFAULT_MODEL_PARAMETERS: ModelParameters = {
  temperature: 0.7,
  top_p: 1.0,
  top_k: 40,
  frequency_penalty: 0.0,
  presence_penalty: 0.0,
  max_output_tokens: 8192,
  seed: null,
  stop_sequences: [],
};

export const DEFAULT_REASONING_CONFIG: ReasoningConfig = {
  reasoning_effort: 'medium',
  thinking_budget: 16384,
  show_thinking: true,
  max_inflections: 5,
  max_reflections: 3,
  confidence_threshold: 0.7,
};

export const DEFAULT_RAG_CONFIG: RAGConfig = {
  chunk_size: 512,
  chunk_overlap: 50,
  similarity_threshold: 0.7,
  max_chunks: 10,
  embedding_model: 'text-embedding-3-small',
};

export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  search_depth: 5,
  max_sources: 100,
  source_quality: 'any',
  include_domains: [],
  exclude_domains: [],
};

export const DEFAULT_USER_SETTINGS: UserSettings = {
  modelParameters: DEFAULT_MODEL_PARAMETERS,
  reasoningConfig: DEFAULT_REASONING_CONFIG,
  ragConfig: DEFAULT_RAG_CONFIG,
  searchConfig: DEFAULT_SEARCH_CONFIG,
  selectedModel: 'claude-opus-4-5-20251101',
  selectedPreset: null,
  theme: 'system',
};

// ============================================================================
// PRESET DEFINITIONS - Quick configuration presets
// ============================================================================

export interface SettingsPreset {
  id: string;
  name: string;
  description: string;
  category: 'creative' | 'precise' | 'balanced' | 'research' | 'code';
  settings: Partial<UserSettings>;
}

export const BUILT_IN_PRESETS: SettingsPreset[] = [
  {
    id: 'creative-writer',
    name: 'Creative Writer',
    description: 'High temperature for imaginative writing and brainstorming',
    category: 'creative',
    settings: {
      modelParameters: {
        ...DEFAULT_MODEL_PARAMETERS,
        temperature: 1.2,
        top_p: 0.95,
        frequency_penalty: 0.3,
        presence_penalty: 0.3,
      },
    },
  },
  {
    id: 'code-assistant',
    name: 'Code Assistant',
    description: 'Low temperature for precise, deterministic code generation',
    category: 'code',
    settings: {
      modelParameters: {
        ...DEFAULT_MODEL_PARAMETERS,
        temperature: 0.2,
        top_p: 0.9,
        max_output_tokens: 16384,
      },
      reasoningConfig: {
        ...DEFAULT_REASONING_CONFIG,
        reasoning_effort: 'high',
        thinking_budget: 32768,
      },
    },
  },
  {
    id: 'deep-researcher',
    name: 'Deep Researcher',
    description: 'Maximum sources and deep analysis for research tasks',
    category: 'research',
    settings: {
      searchConfig: {
        ...DEFAULT_SEARCH_CONFIG,
        search_depth: 10,
        max_sources: 500,
        source_quality: 'verified',
      },
      reasoningConfig: {
        ...DEFAULT_REASONING_CONFIG,
        reasoning_effort: 'max',
        thinking_budget: 65536,
        max_inflections: 15,
        max_reflections: 8,
      },
    },
  },
  {
    id: 'precise-analyst',
    name: 'Precise Analyst',
    description: 'Maximum accuracy for critical analysis tasks',
    category: 'precise',
    settings: {
      modelParameters: {
        ...DEFAULT_MODEL_PARAMETERS,
        temperature: 0.1,
        top_p: 0.8,
      },
      reasoningConfig: {
        ...DEFAULT_REASONING_CONFIG,
        reasoning_effort: 'high',
        confidence_threshold: 0.9,
        max_reflections: 5,
      },
    },
  },
  {
    id: 'balanced-default',
    name: 'Balanced Default',
    description: 'Well-rounded settings for general use',
    category: 'balanced',
    settings: DEFAULT_USER_SETTINGS,
  },
];

// ============================================================================
// CONTEXT DEFINITION
// ============================================================================

interface SettingsContextType {
  // Current settings
  settings: UserSettings;

  // Loading and error state
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  lastSaved: Date | null;

  // Update functions - granular updates for each section
  updateModelParameters: (params: Partial<ModelParameters>) => void;
  updateReasoningConfig: (config: Partial<ReasoningConfig>) => void;
  updateRAGConfig: (config: Partial<RAGConfig>) => void;
  updateSearchConfig: (config: Partial<SearchConfig>) => void;

  // Bulk updates
  setSettings: (settings: Partial<UserSettings>) => void;

  // Model selection
  setSelectedModel: (model: string) => void;

  // Preset management
  applyPreset: (presetId: string) => void;
  saveAsPreset: (name: string, description: string) => Promise<void>;
  customPresets: SettingsPreset[];

  // Reset functions
  resetModelParameters: () => void;
  resetReasoningConfig: () => void;
  resetRAGConfig: () => void;
  resetSearchConfig: () => void;
  resetAllSettings: () => void;

  // Persistence
  saveSettings: () => Promise<void>;
  loadSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// ============================================================================
// DEBOUNCE HELPER
// ============================================================================

function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );

  return debouncedCallback as T;
}

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

interface SettingsProviderProps {
  children: ReactNode;
  initialSettings?: Partial<UserSettings>;
}

export function SettingsProvider({ children, initialSettings }: SettingsProviderProps) {
  // State
  const [settings, setSettingsState] = useState<UserSettings>({
    ...DEFAULT_USER_SETTINGS,
    ...initialSettings,
  });
  const [customPresets, setCustomPresets] = useState<SettingsPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Ref to track if settings have been modified since last save
  const isDirtyRef = useRef(false);

  // ========================================================================
  // PERSISTENCE FUNCTIONS
  // ========================================================================

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/settings');

      if (!response.ok) {
        if (response.status === 404) {
          // No saved settings, use defaults
          console.log('No saved settings found, using defaults');
          return;
        }
        throw new Error(`Failed to load settings: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.settings) {
        setSettingsState((prev) => ({
          ...prev,
          ...data.settings,
        }));
      }

      if (data.customPresets) {
        setCustomPresets(data.customPresets);
      }

      setLastSaved(data.updatedAt ? new Date(data.updatedAt) : null);
    } catch (err) {
      console.error('Error loading settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveSettings = useCallback(async () => {
    if (isSaving) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings,
          customPresets,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save settings: ${response.statusText}`);
      }

      setLastSaved(new Date());
      isDirtyRef.current = false;
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [settings, customPresets, isSaving]);

  // Debounced auto-save (2 second delay)
  const debouncedSave = useDebouncedCallback(saveSettings, 2000);

  // Auto-save when settings change
  useEffect(() => {
    if (!isLoading && isDirtyRef.current) {
      debouncedSave();
    }
  }, [settings, isLoading, debouncedSave]);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // ========================================================================
  // UPDATE FUNCTIONS
  // ========================================================================

  const updateModelParameters = useCallback((params: Partial<ModelParameters>) => {
    setSettingsState((prev) => ({
      ...prev,
      modelParameters: {
        ...prev.modelParameters,
        ...params,
      },
    }));
    isDirtyRef.current = true;
  }, []);

  const updateReasoningConfig = useCallback((config: Partial<ReasoningConfig>) => {
    setSettingsState((prev) => ({
      ...prev,
      reasoningConfig: {
        ...prev.reasoningConfig,
        ...config,
      },
    }));
    isDirtyRef.current = true;
  }, []);

  const updateRAGConfig = useCallback((config: Partial<RAGConfig>) => {
    setSettingsState((prev) => ({
      ...prev,
      ragConfig: {
        ...prev.ragConfig,
        ...config,
      },
    }));
    isDirtyRef.current = true;
  }, []);

  const updateSearchConfig = useCallback((config: Partial<SearchConfig>) => {
    setSettingsState((prev) => ({
      ...prev,
      searchConfig: {
        ...prev.searchConfig,
        ...config,
      },
    }));
    isDirtyRef.current = true;
  }, []);

  const setSettings = useCallback((newSettings: Partial<UserSettings>) => {
    setSettingsState((prev) => ({
      ...prev,
      ...newSettings,
    }));
    isDirtyRef.current = true;
  }, []);

  const setSelectedModel = useCallback((model: string) => {
    setSettingsState((prev) => ({
      ...prev,
      selectedModel: model,
    }));
    isDirtyRef.current = true;
  }, []);

  // ========================================================================
  // PRESET FUNCTIONS
  // ========================================================================

  const applyPreset = useCallback((presetId: string) => {
    // Check built-in presets first
    let preset = BUILT_IN_PRESETS.find((p) => p.id === presetId);

    // Then check custom presets
    if (!preset) {
      preset = customPresets.find((p) => p.id === presetId);
    }

    if (!preset) {
      console.warn(`Preset ${presetId} not found`);
      return;
    }

    setSettingsState((prev) => ({
      ...prev,
      ...preset.settings,
      selectedPreset: presetId,
    }));
    isDirtyRef.current = true;
  }, [customPresets]);

  const saveAsPreset = useCallback(async (name: string, description: string) => {
    const newPreset: SettingsPreset = {
      id: `custom-${Date.now()}`,
      name,
      description,
      category: 'balanced',
      settings: { ...settings },
    };

    const updatedPresets = [...customPresets, newPreset];
    setCustomPresets(updatedPresets);

    // Save to backend
    try {
      await fetch('/api/settings/presets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPreset),
      });
    } catch (err) {
      console.error('Error saving preset:', err);
      // Revert on error
      setCustomPresets(customPresets);
      throw err;
    }
  }, [settings, customPresets]);

  // ========================================================================
  // RESET FUNCTIONS
  // ========================================================================

  const resetModelParameters = useCallback(() => {
    setSettingsState((prev) => ({
      ...prev,
      modelParameters: { ...DEFAULT_MODEL_PARAMETERS },
    }));
    isDirtyRef.current = true;
  }, []);

  const resetReasoningConfig = useCallback(() => {
    setSettingsState((prev) => ({
      ...prev,
      reasoningConfig: { ...DEFAULT_REASONING_CONFIG },
    }));
    isDirtyRef.current = true;
  }, []);

  const resetRAGConfig = useCallback(() => {
    setSettingsState((prev) => ({
      ...prev,
      ragConfig: { ...DEFAULT_RAG_CONFIG },
    }));
    isDirtyRef.current = true;
  }, []);

  const resetSearchConfig = useCallback(() => {
    setSettingsState((prev) => ({
      ...prev,
      searchConfig: { ...DEFAULT_SEARCH_CONFIG },
    }));
    isDirtyRef.current = true;
  }, []);

  const resetAllSettings = useCallback(() => {
    setSettingsState({ ...DEFAULT_USER_SETTINGS });
    isDirtyRef.current = true;
  }, []);

  // ========================================================================
  // CONTEXT VALUE
  // ========================================================================

  const contextValue: SettingsContextType = {
    settings,
    isLoading,
    isSaving,
    error,
    lastSaved,
    updateModelParameters,
    updateReasoningConfig,
    updateRAGConfig,
    updateSearchConfig,
    setSettings,
    setSelectedModel,
    applyPreset,
    saveAsPreset,
    customPresets,
    resetModelParameters,
    resetReasoningConfig,
    resetRAGConfig,
    resetSearchConfig,
    resetAllSettings,
    saveSettings,
    loadSettings,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);

  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }

  return context;
}

// ============================================================================
// UTILITY HOOKS - For specific settings sections
// ============================================================================

export function useModelParameters() {
  const { settings, updateModelParameters, resetModelParameters } = useSettings();
  return {
    parameters: settings.modelParameters,
    update: updateModelParameters,
    reset: resetModelParameters,
  };
}

export function useReasoningConfig() {
  const { settings, updateReasoningConfig, resetReasoningConfig } = useSettings();
  return {
    config: settings.reasoningConfig,
    update: updateReasoningConfig,
    reset: resetReasoningConfig,
  };
}

export function useRAGConfig() {
  const { settings, updateRAGConfig, resetRAGConfig } = useSettings();
  return {
    config: settings.ragConfig,
    update: updateRAGConfig,
    reset: resetRAGConfig,
  };
}

export function useSearchConfig() {
  const { settings, updateSearchConfig, resetSearchConfig } = useSettings();
  return {
    config: settings.searchConfig,
    update: updateSearchConfig,
    reset: resetSearchConfig,
  };
}

export function useSelectedModel() {
  const { settings, setSelectedModel } = useSettings();
  return {
    model: settings.selectedModel,
    setModel: setSelectedModel,
  };
}

// ============================================================================
// HELPER - Get settings for API calls
// ============================================================================

export function getSettingsForAPI(settings: UserSettings) {
  return {
    model: settings.selectedModel,
    temperature: settings.modelParameters.temperature,
    top_p: settings.modelParameters.top_p,
    top_k: settings.modelParameters.top_k,
    frequency_penalty: settings.modelParameters.frequency_penalty,
    presence_penalty: settings.modelParameters.presence_penalty,
    max_tokens: settings.modelParameters.max_output_tokens,
    seed: settings.modelParameters.seed,
    stop: settings.modelParameters.stop_sequences.length > 0
      ? settings.modelParameters.stop_sequences
      : undefined,
    // Extended thinking (for Claude)
    thinking: settings.reasoningConfig.show_thinking ? {
      type: 'enabled',
      budget_tokens: settings.reasoningConfig.thinking_budget,
    } : undefined,
  };
}

export default SettingsProvider;
