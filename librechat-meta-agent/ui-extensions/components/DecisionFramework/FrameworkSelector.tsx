'use client';

import React, { useState } from 'react';
import {
  Brain,
  Scale,
  Target,
  AlertTriangle,
  Users,
  TrendingUp,
  CheckSquare,
  Lightbulb,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Star,
  Clock,
  Info,
} from 'lucide-react';

// Types
interface DecisionFramework {
  id: string;
  name: string;
  description: string;
  source: string;
  category: string;
  best_for: string[];
  complexity_level: string;
  time_horizon: string;
}

// Sample frameworks
const FRAMEWORKS: DecisionFramework[] = [
  {
    id: 'regret_minimization',
    name: 'Regret Minimization Framework',
    description: 'Project yourself to age 80 and ask: will I regret not doing this?',
    source: 'bezos',
    category: 'strategic',
    best_for: ['Major life decisions', 'Career changes', 'Big bets'],
    complexity_level: 'complex',
    time_horizon: 'long_term',
  },
  {
    id: 'type1_type2',
    name: 'Type 1 vs Type 2 Decisions',
    description: 'Distinguish between irreversible and reversible decisions',
    source: 'bezos',
    category: 'operational',
    best_for: ['Day-to-day decisions', 'Process optimization', 'Delegation'],
    complexity_level: 'simple',
    time_horizon: 'immediate',
  },
  {
    id: 'inversion',
    name: 'Inversion',
    description: 'Instead of asking how to succeed, ask how you could fail',
    source: 'munger',
    category: 'risk',
    best_for: ['Risk assessment', 'Problem solving', 'Strategy'],
    complexity_level: 'moderate',
    time_horizon: 'medium_term',
  },
  {
    id: 'believability_weighted',
    name: 'Believability-Weighted Decision Making',
    description: 'Weight opinions by expertise of the person giving them',
    source: 'dalio',
    category: 'people',
    best_for: ['Group decisions', 'Expert input', 'High-stakes choices'],
    complexity_level: 'moderate',
    time_horizon: 'medium_term',
  },
  {
    id: 'mece',
    name: 'MECE Framework',
    description: 'Break problems into Mutually Exclusive, Collectively Exhaustive categories',
    source: 'mckinsey',
    category: 'strategic',
    best_for: ['Problem structuring', 'Analysis', 'Communication'],
    complexity_level: 'moderate',
    time_horizon: 'medium_term',
  },
  {
    id: 'bcg_matrix',
    name: 'BCG Growth-Share Matrix',
    description: 'Classify products by market growth and relative market share',
    source: 'bcg',
    category: 'investment',
    best_for: ['Portfolio management', 'Resource allocation', 'Product strategy'],
    complexity_level: 'moderate',
    time_horizon: 'medium_term',
  },
];

const SOURCE_INFO: Record<string, { name: string; icon: React.ElementType; color: string }> = {
  bezos: { name: 'Jeff Bezos', icon: Target, color: 'text-orange-500' },
  munger: { name: 'Charlie Munger', icon: Brain, color: 'text-purple-500' },
  dalio: { name: 'Ray Dalio', icon: Scale, color: 'text-blue-500' },
  mckinsey: { name: 'McKinsey', icon: TrendingUp, color: 'text-green-500' },
  bcg: { name: 'BCG', icon: Target, color: 'text-indigo-500' },
};

const CATEGORY_INFO: Record<string, { name: string; icon: React.ElementType }> = {
  strategic: { name: 'Strategic', icon: Target },
  operational: { name: 'Operational', icon: CheckSquare },
  risk: { name: 'Risk', icon: AlertTriangle },
  people: { name: 'People', icon: Users },
  investment: { name: 'Investment', icon: TrendingUp },
};

interface FrameworkSelectorProps {
  onSelect: (frameworkId: string) => void;
  selectedId?: string;
}

export function FrameworkSelector({ onSelect, selectedId }: FrameworkSelectorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const filteredFrameworks = FRAMEWORKS.filter((f) => {
    if (filterSource && f.source !== filterSource) return false;
    if (filterCategory && f.category !== filterCategory) return false;
    return true;
  });

  const sources = [...new Set(FRAMEWORKS.map((f) => f.source))];
  const categories = [...new Set(FRAMEWORKS.map((f) => f.category))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-500" />
          Decision Frameworks
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          World-class frameworks from Fortune 100 leaders and top consultancies
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Source Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Source
          </label>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setFilterSource(null)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                filterSource === null
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}
            >
              All
            </button>
            {sources.map((source) => {
              const info = SOURCE_INFO[source];
              return (
                <button
                  key={source}
                  onClick={() => setFilterSource(source)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    filterSource === source
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {info?.name || source}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Category
          </label>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setFilterCategory(null)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                filterCategory === null
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}
            >
              All
            </button>
            {categories.map((cat) => {
              const info = CATEGORY_INFO[cat];
              return (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    filterCategory === cat
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {info?.name || cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Framework List */}
      <div className="space-y-3">
        {filteredFrameworks.map((framework) => {
          const sourceInfo = SOURCE_INFO[framework.source];
          const categoryInfo = CATEGORY_INFO[framework.category];
          const isExpanded = expandedId === framework.id;
          const isSelected = selectedId === framework.id;
          const SourceIcon = sourceInfo?.icon || Lightbulb;
          const CategoryIcon = categoryInfo?.icon || Target;

          return (
            <div
              key={framework.id}
              className={`rounded-xl border transition-all ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {framework.name}
                      </h4>
                      {framework.id === 'regret_minimization' && (
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {framework.description}
                    </p>

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
                      <span className={`flex items-center gap-1 ${sourceInfo?.color}`}>
                        <SourceIcon className="w-3.5 h-3.5" />
                        {sourceInfo?.name}
                      </span>
                      <span className="flex items-center gap-1 text-gray-500">
                        <CategoryIcon className="w-3.5 h-3.5" />
                        {categoryInfo?.name}
                      </span>
                      <span className="flex items-center gap-1 text-gray-500">
                        <Clock className="w-3.5 h-3.5" />
                        {framework.time_horizon.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : framework.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => onSelect(framework.id)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {isSelected ? 'Selected' : 'Use'}
                      {!isSelected && <ArrowRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                      Best For
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {framework.best_for.map((use) => (
                        <span
                          key={use}
                          className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm"
                        >
                          {use}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Help Text */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          These frameworks are used by Jeff Bezos (Amazon), Charlie Munger (Berkshire
          Hathaway), Ray Dalio (Bridgewater), and top consulting firms like McKinsey and BCG.
        </p>
      </div>
    </div>
  );
}

export default FrameworkSelector;
