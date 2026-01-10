'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  type ModelInfo,
  type ModelProvider,
  type ModelPreferences,
  loadModelPreferences,
  saveModelPreferences,
  addToRecentModels,
  toggleFavoriteModel as toggleFavorite,
  setDefaultModel as setDefault,
  getModelById,
  getRecommendedModels,
  getAllModels,
  getModelsByProvider,
  getModelsWithCapability,
  type ModelCapability,
} from '@/lib/models';

// ============================================================================
// TYPES
// ============================================================================

export interface UseModelPreferencesReturn {
  // Current preferences
  preferences: ModelPreferences;

  // Selected model
  selectedModel: ModelInfo | undefined;
  selectedModelId: string;

  // Actions
  selectModel: (modelId: string) => void;
  setDefaultModel: (modelId: string) => void;
  toggleFavoriteModel: (modelId: string) => boolean;
  clearRecentModels: () => void;
  clearFavoriteModels: () => void;

  // Computed
  recentModels: ModelInfo[];
  favoriteModels: ModelInfo[];
  recommendedModels: ModelInfo[];

  // Helpers
  isFavorite: (modelId: string) => boolean;
  isDefault: (modelId: string) => boolean;
  getModelsForProvider: (provider: ModelProvider) => ModelInfo[];
  getModelsWithCapabilities: (capabilities: ModelCapability[]) => ModelInfo[];
}

// ============================================================================
// HOOK
// ============================================================================

export function useModelPreferences(
  initialModelId?: string
): UseModelPreferencesReturn {
  // Load preferences
  const [preferences, setPreferences] = useState<ModelPreferences>(() =>
    loadModelPreferences()
  );

  // Track selected model (can differ from default)
  const [selectedModelId, setSelectedModelId] = useState<string>(
    initialModelId || preferences.defaultModelId
  );

  // Reload preferences on mount (for SSR hydration)
  useEffect(() => {
    const loaded = loadModelPreferences();
    setPreferences(loaded);
    if (!initialModelId) {
      setSelectedModelId(loaded.defaultModelId);
    }
  }, [initialModelId]);

  // Get current model info
  const selectedModel = useMemo(
    () => getModelById(selectedModelId),
    [selectedModelId]
  );

  // Select a model (and add to recent)
  const selectModel = useCallback((modelId: string) => {
    setSelectedModelId(modelId);
    addToRecentModels(modelId);
    setPreferences(loadModelPreferences());
  }, []);

  // Set as default model
  const setDefaultModel = useCallback((modelId: string) => {
    setDefault(modelId);
    setPreferences(loadModelPreferences());
  }, []);

  // Toggle favorite
  const toggleFavoriteModel = useCallback((modelId: string): boolean => {
    const isFav = toggleFavorite(modelId);
    setPreferences(loadModelPreferences());
    return isFav;
  }, []);

  // Clear recent models
  const clearRecentModels = useCallback(() => {
    saveModelPreferences({ recentModels: [] });
    setPreferences(loadModelPreferences());
  }, []);

  // Clear favorite models
  const clearFavoriteModels = useCallback(() => {
    saveModelPreferences({ favoriteModels: [] });
    setPreferences(loadModelPreferences());
  }, []);

  // Computed: Recent models
  const recentModels = useMemo(
    () =>
      preferences.recentModels
        .map((id) => getModelById(id))
        .filter((m): m is ModelInfo => m !== undefined),
    [preferences.recentModels]
  );

  // Computed: Favorite models
  const favoriteModels = useMemo(
    () =>
      preferences.favoriteModels
        .map((id) => getModelById(id))
        .filter((m): m is ModelInfo => m !== undefined),
    [preferences.favoriteModels]
  );

  // Computed: Recommended models
  const recommendedModels = useMemo(() => getRecommendedModels(), []);

  // Helper: Check if model is favorite
  const isFavorite = useCallback(
    (modelId: string) => preferences.favoriteModels.includes(modelId),
    [preferences.favoriteModels]
  );

  // Helper: Check if model is default
  const isDefault = useCallback(
    (modelId: string) => preferences.defaultModelId === modelId,
    [preferences.defaultModelId]
  );

  // Helper: Get models for provider
  const getModelsForProvider = useCallback(
    (provider: ModelProvider) => getModelsByProvider(provider),
    []
  );

  // Helper: Get models with capabilities
  const getModelsWithCapabilities = useCallback(
    (capabilities: ModelCapability[]) => {
      let models = getAllModels();
      for (const cap of capabilities) {
        models = models.filter((m) => m.capabilities.includes(cap));
      }
      return models;
    },
    []
  );

  return {
    preferences,
    selectedModel,
    selectedModelId,
    selectModel,
    setDefaultModel,
    toggleFavoriteModel,
    clearRecentModels,
    clearFavoriteModels,
    recentModels,
    favoriteModels,
    recommendedModels,
    isFavorite,
    isDefault,
    getModelsForProvider,
    getModelsWithCapabilities,
  };
}

// ============================================================================
// SUPABASE PERSISTENCE HOOK (for authenticated users)
// ============================================================================

export interface UseModelPreferencesWithSupabaseOptions {
  userId?: string;
  projectId?: string;
}

export function useModelPreferencesWithSupabase(
  options: UseModelPreferencesWithSupabaseOptions = {}
): UseModelPreferencesReturn & {
  isSyncing: boolean;
  syncError: Error | null;
} {
  const localPrefs = useModelPreferences();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<Error | null>(null);

  // Sync to Supabase when preferences change (if user is authenticated)
  useEffect(() => {
    if (!options.userId) return;

    const syncToSupabase = async () => {
      setIsSyncing(true);
      setSyncError(null);

      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

        await fetch(`${API_BASE}/api/user-preferences`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: options.userId,
            project_id: options.projectId || 'default',
            preferences: {
              model: localPrefs.preferences,
            },
          }),
        });
      } catch (error) {
        setSyncError(error as Error);
        console.warn('Failed to sync model preferences to Supabase:', error);
      } finally {
        setIsSyncing(false);
      }
    };

    // Debounce sync
    const timeout = setTimeout(syncToSupabase, 1000);
    return () => clearTimeout(timeout);
  }, [options.userId, options.projectId, localPrefs.preferences]);

  // Load from Supabase on mount
  useEffect(() => {
    if (!options.userId) return;

    const loadFromSupabase = async () => {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

        const response = await fetch(
          `${API_BASE}/api/user-preferences?user_id=${options.userId}&project_id=${options.projectId || 'default'}`
        );

        if (response.ok) {
          const data = await response.json();
          if (data?.preferences?.model) {
            saveModelPreferences(data.preferences.model);
          }
        }
      } catch (error) {
        console.warn('Failed to load model preferences from Supabase:', error);
      }
    };

    loadFromSupabase();
  }, [options.userId, options.projectId]);

  return {
    ...localPrefs,
    isSyncing,
    syncError,
  };
}

export default useModelPreferences;
