'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ChevronDown,
  Check,
  Search,
  Star,
  StarOff,
  Zap,
  Brain,
  Sparkles,
  Wind,
  Bot,
  Rocket,
  Layers,
  Eye,
  Wrench,
  Code,
  Monitor,
  FileText,
  Info,
  Clock,
  DollarSign,
  X,
  Settings2,
  History,
  Heart,
} from 'lucide-react';
import clsx from 'clsx';
import {
  type ModelInfo,
  type ModelProvider,
  type ModelCapability,
  type ProviderInfo,
  providers,
  getModelById,
  getRecommendedModels,
  formatContextWindow,
  loadModelPreferences,
  saveModelPreferences,
  addToRecentModels,
  toggleFavoriteModel,
  setDefaultModel,
  getCapabilityInfo,
} from '@/lib/models';

// ============================================================================
// TYPES
// ============================================================================

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  showCapabilities?: boolean;
  showPricing?: boolean;
  compact?: boolean;
  disabled?: boolean;
}

// ============================================================================
// ICON MAPPING
// ============================================================================

const providerIcons: Record<string, React.ReactNode> = {
  brain: <Brain className="w-4 h-4" />,
  zap: <Zap className="w-4 h-4" />,
  sparkles: <Sparkles className="w-4 h-4" />,
  search: <Search className="w-4 h-4" />,
  wind: <Wind className="w-4 h-4" />,
  bot: <Bot className="w-4 h-4" />,
  rocket: <Rocket className="w-4 h-4" />,
  layers: <Layers className="w-4 h-4" />,
};

const capabilityIcons: Record<string, React.ReactNode> = {
  eye: <Eye className="w-3 h-3" />,
  wrench: <Wrench className="w-3 h-3" />,
  brain: <Brain className="w-3 h-3" />,
  code: <Code className="w-3 h-3" />,
  braces: <Code className="w-3 h-3" />,
  play: <Zap className="w-3 h-3" />,
  upload: <FileText className="w-3 h-3" />,
  monitor: <Monitor className="w-3 h-3" />,
  'file-text': <FileText className="w-3 h-3" />,
};

// ============================================================================
// CAPABILITY BADGE
// ============================================================================

function CapabilityBadge({ capability }: { capability: ModelCapability }) {
  const info = getCapabilityInfo(capability);

  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded"
      title={info.description}
    >
      {capabilityIcons[info.icon]}
      {info.label}
    </span>
  );
}

// ============================================================================
// MODEL OPTION
// ============================================================================

interface ModelOptionProps {
  model: ModelInfo;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  showCapabilities: boolean;
  showPricing: boolean;
}

function ModelOption({
  model,
  isSelected,
  isFavorite,
  onSelect,
  onToggleFavorite,
  showCapabilities,
  showPricing,
}: ModelOptionProps) {
  const tierColors = {
    flagship: 'border-l-amber-500',
    standard: 'border-l-teal-500',
    fast: 'border-l-blue-500',
    economy: 'border-l-green-500',
  };

  return (
    <div
      className={clsx(
        'relative flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all border-l-2',
        tierColors[model.tier],
        isSelected
          ? 'bg-teal-50 dark:bg-teal-900/30'
          : 'hover:bg-stone-50 dark:hover:bg-stone-800/50',
        model.deprecated && 'opacity-50'
      )}
      onClick={onSelect}
    >
      {/* Selection indicator */}
      <div
        className={clsx(
          'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
          isSelected
            ? 'border-teal-500 bg-teal-500'
            : 'border-stone-300 dark:border-stone-600'
        )}
      >
        {isSelected && <Check className="w-3 h-3 text-white" />}
      </div>

      {/* Model info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-stone-900 dark:text-white text-sm">
            {model.name}
          </span>
          {model.recommended && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 rounded">
              Recommended
            </span>
          )}
          {model.deprecated && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded">
              Deprecated
            </span>
          )}
        </div>

        <p className="text-xs text-stone-500 dark:text-stone-400 mb-2 line-clamp-1">
          {model.description}
        </p>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-[10px] text-stone-400 dark:text-stone-500">
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {formatContextWindow(model.contextWindow)}
          </span>
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {formatContextWindow(model.maxOutputTokens)} out
          </span>
          {showPricing && (
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              ${model.pricing.input}/${model.pricing.output}
            </span>
          )}
        </div>

        {/* Capabilities */}
        {showCapabilities && model.capabilities.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {model.capabilities.slice(0, 4).map((cap) => (
              <CapabilityBadge key={cap} capability={cap} />
            ))}
            {model.capabilities.length > 4 && (
              <span className="text-[10px] text-stone-400">
                +{model.capabilities.length - 4} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Favorite button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        className={clsx(
          'p-1.5 rounded-lg transition-colors',
          isFavorite
            ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30'
            : 'text-stone-300 dark:text-stone-600 hover:text-amber-500 hover:bg-stone-100 dark:hover:bg-stone-800'
        )}
      >
        {isFavorite ? (
          <Star className="w-4 h-4 fill-current" />
        ) : (
          <StarOff className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}

// ============================================================================
// PROVIDER TAB
// ============================================================================

interface ProviderTabProps {
  provider: ProviderInfo;
  isSelected: boolean;
  modelCount: number;
  onClick: () => void;
}

function ProviderTab({ provider, isSelected, modelCount, onClick }: ProviderTabProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
        isSelected
          ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900'
          : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
      )}
    >
      <span style={{ color: isSelected ? undefined : provider.color }}>
        {providerIcons[provider.icon]}
      </span>
      <span>{provider.name}</span>
      <span
        className={clsx(
          'px-1.5 py-0.5 text-[10px] rounded-full',
          isSelected
            ? 'bg-white/20 text-white dark:bg-stone-900/30 dark:text-stone-900'
            : 'bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-400'
        )}
      >
        {modelCount}
      </span>
    </button>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ModelSelector({
  value,
  onChange,
  showCapabilities = true,
  showPricing = true,
  compact = false,
  disabled = false,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<ModelProvider | 'all' | 'favorites' | 'recent'>('all');
  const [preferences, setPreferences] = useState(loadModelPreferences());

  // Load preferences on mount
  useEffect(() => {
    setPreferences(loadModelPreferences());
  }, []);

  // Get current model
  const currentModel = useMemo(() => getModelById(value), [value]);

  // Filter models based on search and provider
  const filteredModels = useMemo(() => {
    let models: ModelInfo[] = [];

    if (selectedProvider === 'favorites') {
      models = preferences.favoriteModels
        .map((id) => getModelById(id))
        .filter((m): m is ModelInfo => m !== undefined);
    } else if (selectedProvider === 'recent') {
      models = preferences.recentModels
        .map((id) => getModelById(id))
        .filter((m): m is ModelInfo => m !== undefined);
    } else if (selectedProvider === 'all') {
      models = providers.flatMap((p) => p.models);
    } else {
      const provider = providers.find((p) => p.id === selectedProvider);
      models = provider?.models || [];
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      models = models.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.description.toLowerCase().includes(query) ||
          m.id.toLowerCase().includes(query)
      );
    }

    return models;
  }, [selectedProvider, searchQuery, preferences]);

  // Handle model selection
  const handleSelect = useCallback(
    (modelId: string) => {
      onChange(modelId);
      addToRecentModels(modelId);
      setPreferences(loadModelPreferences());
      setIsOpen(false);
    },
    [onChange]
  );

  // Handle favorite toggle
  const handleToggleFavorite = useCallback((modelId: string) => {
    toggleFavoriteModel(modelId);
    setPreferences(loadModelPreferences());
  }, []);

  // Handle set as default
  const handleSetDefault = useCallback(() => {
    if (currentModel) {
      setDefaultModel(currentModel.id);
      setPreferences(loadModelPreferences());
    }
  }, [currentModel]);

  // Get provider for current model
  const currentProvider = currentModel
    ? providers.find((p) => p.id === currentModel.provider)
    : undefined;

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={clsx(
          'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
          disabled
            ? 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 cursor-not-allowed opacity-50'
            : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 hover:border-teal-500 cursor-pointer',
          compact ? 'text-sm' : ''
        )}
      >
        {currentProvider && (
          <span style={{ color: currentProvider.color }}>
            {providerIcons[currentProvider.icon]}
          </span>
        )}
        <span className="font-medium text-stone-900 dark:text-white">
          {currentModel?.name || 'Select Model'}
        </span>
        <ChevronDown
          className={clsx(
            'w-4 h-4 text-stone-400 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute top-full left-0 mt-2 w-[480px] max-h-[600px] bg-white dark:bg-stone-900 rounded-xl shadow-2xl border border-stone-200 dark:border-stone-700 z-50 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-stone-200 dark:border-stone-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-stone-900 dark:text-white">
                  Select Model
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  <X className="w-4 h-4 text-stone-500" />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search models..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-stone-100 dark:bg-stone-800 border-0 rounded-lg text-sm text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Provider tabs */}
            <div className="p-3 border-b border-stone-200 dark:border-stone-700 overflow-x-auto">
              <div className="flex gap-2">
                {/* Special tabs */}
                <button
                  onClick={() => setSelectedProvider('all')}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                    selectedProvider === 'all'
                      ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                  )}
                >
                  <Sparkles className="w-4 h-4" />
                  All
                </button>
                <button
                  onClick={() => setSelectedProvider('favorites')}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                    selectedProvider === 'favorites'
                      ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                  )}
                >
                  <Heart className="w-4 h-4" />
                  Favorites
                  {preferences.favoriteModels.length > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-stone-200 dark:bg-stone-700">
                      {preferences.favoriteModels.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setSelectedProvider('recent')}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                    selectedProvider === 'recent'
                      ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                  )}
                >
                  <History className="w-4 h-4" />
                  Recent
                </button>

                {/* Divider */}
                <div className="w-px h-8 bg-stone-200 dark:bg-stone-700 self-center" />

                {/* Provider tabs */}
                {providers.map((provider) => (
                  <ProviderTab
                    key={provider.id}
                    provider={provider}
                    isSelected={selectedProvider === provider.id}
                    modelCount={provider.models.filter((m) => !m.deprecated).length}
                    onClick={() => setSelectedProvider(provider.id)}
                  />
                ))}
              </div>
            </div>

            {/* Model list */}
            <div className="max-h-[400px] overflow-y-auto p-3">
              {filteredModels.length === 0 ? (
                <div className="py-8 text-center text-stone-500 dark:text-stone-400">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No models found</p>
                  <p className="text-xs mt-1">Try a different search or provider</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredModels.map((model) => (
                    <ModelOption
                      key={model.id}
                      model={model}
                      isSelected={model.id === value}
                      isFavorite={preferences.favoriteModels.includes(model.id)}
                      onSelect={() => handleSelect(model.id)}
                      onToggleFavorite={() => handleToggleFavorite(model.id)}
                      showCapabilities={showCapabilities}
                      showPricing={showPricing}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer with current model info */}
            {currentModel && (
              <div className="p-3 border-t border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
                    <Info className="w-4 h-4" />
                    <span>
                      Current: <span className="font-medium text-stone-900 dark:text-white">{currentModel.name}</span>
                    </span>
                  </div>
                  <button
                    onClick={handleSetDefault}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded transition-colors"
                  >
                    <Settings2 className="w-3 h-3" />
                    Set as default
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// COMPACT SELECTOR (for chat header)
// ============================================================================

export function CompactModelSelector({
  value,
  onChange,
  disabled = false,
}: Pick<ModelSelectorProps, 'value' | 'onChange' | 'disabled'>) {
  return (
    <ModelSelector
      value={value}
      onChange={onChange}
      compact
      showCapabilities={false}
      showPricing={false}
      disabled={disabled}
    />
  );
}

export default ModelSelector;
