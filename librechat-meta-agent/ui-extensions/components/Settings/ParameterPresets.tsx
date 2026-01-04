'use client';

import React, { useState, useCallback } from 'react';
import {
  Sparkles,
  Target,
  Scale,
  Brain,
  Save,
  Trash2,
  Check,
  Plus,
  ChevronRight,
  Zap,
  Palette,
  Code2,
  BookOpen,
  MessageSquare,
  Wand2,
  Layers,
  Edit3,
  X,
} from 'lucide-react';
import type { ModelParameters } from './ModelParameters';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ParameterPreset {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  parameters: Partial<ModelParameters>;
  isBuiltIn?: boolean;
  isCustom?: boolean;
  color?: string;
}

interface ParameterPresetsProps {
  currentParameters: ModelParameters;
  onApplyPreset: (preset: ParameterPreset) => void;
  onSaveCustomPreset?: (name: string, parameters: ModelParameters) => void;
  onDeleteCustomPreset?: (presetId: string) => void;
  customPresets?: ParameterPreset[];
}

// ============================================================================
// BUILT-IN PRESETS
// ============================================================================

const BUILT_IN_PRESETS: ParameterPreset[] = [
  {
    id: 'creative',
    name: 'Creative',
    description: 'High temperature, diverse outputs for brainstorming & storytelling',
    icon: <Sparkles className="w-5 h-5" />,
    color: 'from-purple-400 to-pink-500',
    isBuiltIn: true,
    parameters: {
      temperature: 1.2,
      top_p: 0.95,
      top_k: 60,
      frequency_penalty: 0.5,
      presence_penalty: 0.6,
    },
  },
  {
    id: 'precise',
    name: 'Precise',
    description: 'Low temperature, focused outputs for code & factual tasks',
    icon: <Target className="w-5 h-5" />,
    color: 'from-blue-400 to-cyan-500',
    isBuiltIn: true,
    parameters: {
      temperature: 0.3,
      top_p: 0.85,
      top_k: 20,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    },
  },
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Default settings for general-purpose conversations',
    icon: <Scale className="w-5 h-5" />,
    color: 'from-teal-400 to-emerald-500',
    isBuiltIn: true,
    parameters: {
      temperature: 0.7,
      top_p: 1.0,
      top_k: 40,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    },
  },
  {
    id: 'maximum-reasoning',
    name: 'Maximum Reasoning',
    description: 'Optimized for o1/o3/DeepSeek R1 extended thinking',
    icon: <Brain className="w-5 h-5" />,
    color: 'from-amber-400 to-orange-500',
    isBuiltIn: true,
    parameters: {
      temperature: 0.5,
      top_p: 0.9,
      top_k: 30,
      frequency_penalty: 0.2,
      presence_penalty: 0.1,
      max_output_tokens: 32768,
    },
  },
  {
    id: 'coding',
    name: 'Coding',
    description: 'Optimized for generating clean, accurate code',
    icon: <Code2 className="w-5 h-5" />,
    color: 'from-green-400 to-emerald-500',
    isBuiltIn: true,
    parameters: {
      temperature: 0.2,
      top_p: 0.9,
      top_k: 15,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
      max_output_tokens: 8192,
    },
  },
  {
    id: 'writing',
    name: 'Writing',
    description: 'Natural, flowing prose for articles & essays',
    icon: <Edit3 className="w-5 h-5" />,
    color: 'from-rose-400 to-red-500',
    isBuiltIn: true,
    parameters: {
      temperature: 0.8,
      top_p: 0.92,
      top_k: 50,
      frequency_penalty: 0.4,
      presence_penalty: 0.3,
      max_output_tokens: 4096,
    },
  },
  {
    id: 'analysis',
    name: 'Analysis',
    description: 'Thorough, methodical reasoning for research',
    icon: <BookOpen className="w-5 h-5" />,
    color: 'from-indigo-400 to-violet-500',
    isBuiltIn: true,
    parameters: {
      temperature: 0.4,
      top_p: 0.88,
      top_k: 25,
      frequency_penalty: 0.1,
      presence_penalty: 0.2,
      max_output_tokens: 16384,
    },
  },
  {
    id: 'chat',
    name: 'Chat',
    description: 'Friendly, conversational responses',
    icon: <MessageSquare className="w-5 h-5" />,
    color: 'from-cyan-400 to-blue-500',
    isBuiltIn: true,
    parameters: {
      temperature: 0.75,
      top_p: 0.95,
      top_k: 45,
      frequency_penalty: 0.3,
      presence_penalty: 0.2,
      max_output_tokens: 2048,
    },
  },
];

// ============================================================================
// PRESET CARD COMPONENT
// ============================================================================

interface PresetCardProps {
  preset: ParameterPreset;
  isActive: boolean;
  onApply: () => void;
  onDelete?: () => void;
}

function PresetCard({ preset, isActive, onApply, onDelete }: PresetCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border-2 transition-all duration-200 cursor-pointer
        ${isActive
          ? 'border-teal-500 bg-teal-50/50 shadow-lg shadow-teal-100'
          : 'border-warm-200 bg-white hover:border-warm-300 hover:shadow-md'
        }
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onApply}
    >
      {/* Gradient bar */}
      <div className={`h-1.5 bg-gradient-to-r ${preset.color || 'from-warm-300 to-warm-400'}`} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className={`
              w-10 h-10 rounded-xl flex items-center justify-center
              ${isActive
                ? 'bg-teal-500 text-white'
                : 'bg-warm-100 text-warm-600'
              }
            `}>
              {preset.icon}
            </div>
            <div>
              <h4 className="font-semibold text-warm-900 flex items-center gap-2">
                {preset.name}
                {isActive && <Check className="w-4 h-4 text-teal-500" />}
              </h4>
              {preset.isCustom && (
                <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded-full">
                  Custom
                </span>
              )}
            </div>
          </div>

          {/* Delete button for custom presets */}
          {preset.isCustom && onDelete && isHovered && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 text-warm-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-warm-500 mb-3">{preset.description}</p>

        {/* Parameter pills */}
        <div className="flex flex-wrap gap-1">
          {preset.parameters.temperature !== undefined && (
            <span className="text-[10px] px-2 py-0.5 bg-warm-100 text-warm-600 rounded-full">
              temp: {preset.parameters.temperature}
            </span>
          )}
          {preset.parameters.top_p !== undefined && (
            <span className="text-[10px] px-2 py-0.5 bg-warm-100 text-warm-600 rounded-full">
              top_p: {preset.parameters.top_p}
            </span>
          )}
          {preset.parameters.max_output_tokens !== undefined && (
            <span className="text-[10px] px-2 py-0.5 bg-warm-100 text-warm-600 rounded-full">
              {(preset.parameters.max_output_tokens / 1000).toFixed(0)}K tokens
            </span>
          )}
        </div>
      </div>

      {/* Apply indicator */}
      {isHovered && !isActive && (
        <div className="absolute inset-0 bg-teal-500/5 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <span className="px-4 py-2 bg-teal-500 text-white text-sm font-medium rounded-lg shadow-lg flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Apply
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// QUICK PRESETS BAR COMPONENT
// ============================================================================

function QuickPresetsBar({
  presets,
  activePresetId,
  onApply,
}: {
  presets: ParameterPreset[];
  activePresetId: string | null;
  onApply: (preset: ParameterPreset) => void;
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {presets.slice(0, 4).map((preset) => (
        <button
          key={preset.id}
          onClick={() => onApply(preset)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all
            ${activePresetId === preset.id
              ? 'bg-teal-500 text-white shadow-lg shadow-teal-200'
              : 'bg-warm-100 text-warm-700 hover:bg-warm-200'
            }
          `}
        >
          {preset.icon}
          <span className="text-sm font-medium">{preset.name}</span>
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// SAVE PRESET MODAL COMPONENT
// ============================================================================

interface SavePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
}

function SavePresetModal({ isOpen, onClose, onSave }: SavePresetModalProps) {
  const [name, setName] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
      setName('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-warm-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
              <Save className="w-5 h-5 text-teal-600" />
            </div>
            <h3 className="font-semibold text-warm-900">Save Custom Preset</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-warm-400 hover:text-warm-600 hover:bg-warm-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-warm-700 mb-1">
              Preset Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Custom Preset"
              className="w-full px-4 py-3 border border-warm-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              autoFocus
            />
          </div>
          <p className="text-sm text-warm-500">
            Your current parameter settings will be saved with this preset.
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-warm-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-warm-600 hover:bg-warm-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:bg-warm-200 disabled:text-warm-400 transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Preset
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PARAMETER PRESETS COMPONENT
// ============================================================================

export function ParameterPresets({
  currentParameters,
  onApplyPreset,
  onSaveCustomPreset,
  onDeleteCustomPreset,
  customPresets = [],
}: ParameterPresetsProps) {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'quick' | 'all' | 'custom'>('quick');

  // Find active preset
  const findActivePreset = useCallback(() => {
    const allPresets = [...BUILT_IN_PRESETS, ...customPresets];
    return allPresets.find((preset) => {
      return Object.entries(preset.parameters).every(([key, value]) => {
        return currentParameters[key as keyof ModelParameters] === value;
      });
    });
  }, [currentParameters, customPresets]);

  const activePreset = findActivePreset();

  const handleApplyPreset = (preset: ParameterPreset) => {
    onApplyPreset(preset);
  };

  const handleSaveCustomPreset = (name: string) => {
    if (onSaveCustomPreset) {
      onSaveCustomPreset(name, currentParameters);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-warm-900">Parameter Presets</h3>
          <p className="text-sm text-warm-500">
            One-click configurations for different use cases
          </p>
        </div>
        <button
          onClick={() => setShowSaveModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-warm-100 text-warm-700 rounded-lg hover:bg-warm-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Save Current
        </button>
      </div>

      {/* Quick Access Bar */}
      <div className="bg-gradient-to-r from-warm-50 to-teal-50 rounded-xl p-4 border border-warm-200">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-teal-600" />
          <span className="text-sm font-medium text-warm-700">Quick Access</span>
        </div>
        <QuickPresetsBar
          presets={BUILT_IN_PRESETS}
          activePresetId={activePreset?.id || null}
          onApply={handleApplyPreset}
        />
      </div>

      {/* Section Toggle */}
      <div className="flex gap-2 border-b border-warm-200">
        {[
          { id: 'all', label: 'All Presets', icon: Layers },
          { id: 'custom', label: 'My Presets', icon: Palette },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setExpandedSection(id as 'all' | 'custom')}
            className={`
              flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-[2px]
              ${expandedSection === id
                ? 'text-teal-600 border-teal-500'
                : 'text-warm-500 border-transparent hover:text-warm-700'
              }
            `}
          >
            <Icon className="w-4 h-4" />
            {label}
            {id === 'custom' && customPresets.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-teal-100 text-teal-600 rounded-full">
                {customPresets.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* All Presets Grid */}
      {expandedSection === 'all' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {BUILT_IN_PRESETS.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              isActive={activePreset?.id === preset.id}
              onApply={() => handleApplyPreset(preset)}
            />
          ))}
        </div>
      )}

      {/* Custom Presets Grid */}
      {expandedSection === 'custom' && (
        <>
          {customPresets.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-warm-100 flex items-center justify-center">
                <Wand2 className="w-8 h-8 text-warm-400" />
              </div>
              <h4 className="font-medium text-warm-900 mb-2">No custom presets yet</h4>
              <p className="text-sm text-warm-500 mb-4">
                Customize parameters to your liking, then save them as a preset for quick access.
              </p>
              <button
                onClick={() => setShowSaveModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create First Preset
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customPresets.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={{ ...preset, isCustom: true }}
                  isActive={activePreset?.id === preset.id}
                  onApply={() => handleApplyPreset(preset)}
                  onDelete={() => onDeleteCustomPreset?.(preset.id)}
                />
              ))}

              {/* Add new preset card */}
              <button
                onClick={() => setShowSaveModal(true)}
                className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-warm-200 rounded-xl hover:border-teal-400 hover:bg-teal-50/30 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-warm-100 group-hover:bg-teal-100 flex items-center justify-center transition-colors">
                  <Plus className="w-6 h-6 text-warm-400 group-hover:text-teal-500" />
                </div>
                <span className="text-sm font-medium text-warm-500 group-hover:text-teal-600">
                  Save Current Settings
                </span>
              </button>
            </div>
          )}
        </>
      )}

      {/* Active Preset Indicator */}
      {activePreset && (
        <div className="flex items-center gap-3 p-4 bg-teal-50 border border-teal-200 rounded-xl">
          <div className="w-10 h-10 rounded-xl bg-teal-500 text-white flex items-center justify-center">
            {activePreset.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-teal-900">
                Active: {activePreset.name}
              </span>
              <Check className="w-4 h-4 text-teal-500" />
            </div>
            <p className="text-sm text-teal-700">{activePreset.description}</p>
          </div>
        </div>
      )}

      {/* Save Modal */}
      <SavePresetModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveCustomPreset}
      />
    </div>
  );
}

export { BUILT_IN_PRESETS };
export default ParameterPresets;
