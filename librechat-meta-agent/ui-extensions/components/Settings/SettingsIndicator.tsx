'use client';

import React from 'react';
import Link from 'next/link';
import { Settings, Thermometer, Brain, Loader2 } from 'lucide-react';
import { useSettings } from '@/lib/settings-context';

/**
 * Compact settings indicator for chat header
 * Shows current temperature and reasoning effort at a glance
 * Links to full settings page
 */
export function SettingsIndicator() {
  const { settings, isLoading, isSaving } = useSettings();

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-warm-100 text-warm-400">
        <Loader2 className="w-3 h-3 animate-spin" />
      </div>
    );
  }

  const { modelParameters, reasoningConfig } = settings;

  return (
    <Link
      href="/settings"
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-warm-100 hover:bg-warm-200 transition-colors group"
      title="Click to adjust settings"
    >
      {/* Temperature indicator */}
      <div className="flex items-center gap-1">
        <Thermometer className="w-3.5 h-3.5 text-teal-500" />
        <span className="text-xs font-mono text-warm-600">
          {modelParameters.temperature.toFixed(1)}
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-3 bg-warm-300" />

      {/* Reasoning indicator */}
      <div className="flex items-center gap-1">
        <Brain className="w-3.5 h-3.5 text-purple-500" />
        <span className="text-xs text-warm-600 capitalize">
          {reasoningConfig.reasoning_effort === 'max' ? 'Max' :
           reasoningConfig.reasoning_effort === 'high' ? 'Hi' :
           reasoningConfig.reasoning_effort === 'medium' ? 'Med' : 'Lo'}
        </span>
      </div>

      {/* Settings icon */}
      <Settings className="w-3.5 h-3.5 text-warm-400 group-hover:text-teal-500 transition-colors" />

      {/* Saving indicator */}
      {isSaving && (
        <Loader2 className="w-3 h-3 animate-spin text-teal-500" />
      )}
    </Link>
  );
}

/**
 * Expanded settings indicator with more details
 * For use in sidebars or larger spaces
 */
export function SettingsIndicatorExpanded() {
  const { settings, isLoading, isSaving } = useSettings();

  if (isLoading) {
    return (
      <div className="p-3 rounded-xl bg-warm-100 animate-pulse">
        <div className="h-4 bg-warm-200 rounded w-24 mb-2" />
        <div className="h-3 bg-warm-200 rounded w-32" />
      </div>
    );
  }

  const { modelParameters, reasoningConfig } = settings;

  return (
    <Link
      href="/settings"
      className="block p-3 rounded-xl bg-warm-50 hover:bg-warm-100 border border-warm-200 transition-colors group"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-warm-700">Current Settings</span>
        <Settings className="w-4 h-4 text-warm-400 group-hover:text-teal-500 transition-colors" />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <Thermometer className="w-3.5 h-3.5 text-teal-500" />
          <span className="text-warm-500">Temp:</span>
          <span className="font-mono text-warm-700">{modelParameters.temperature.toFixed(2)}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5 text-purple-500" />
          <span className="text-warm-500">Effort:</span>
          <span className="text-warm-700 capitalize">{reasoningConfig.reasoning_effort}</span>
        </div>

        <div className="col-span-2 flex items-center gap-1.5">
          <span className="text-warm-500">Tokens:</span>
          <span className="font-mono text-warm-700">
            {modelParameters.max_output_tokens.toLocaleString()}
          </span>
          <span className="text-warm-400">|</span>
          <span className="text-warm-500">Budget:</span>
          <span className="font-mono text-warm-700">
            {(reasoningConfig.thinking_budget / 1000).toFixed(0)}K
          </span>
        </div>
      </div>

      {isSaving && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-teal-600">
          <Loader2 className="w-3 h-3 animate-spin" />
          Saving...
        </div>
      )}
    </Link>
  );
}

export default SettingsIndicator;
