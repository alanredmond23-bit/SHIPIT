'use client';

import React, { useState } from 'react';
import {
  BarChart3,
  Trophy,
  Zap,
  Brain,
  Code,
  Calculator,
  ChevronRight,
  Check,
  DollarSign,
  Clock,
  Target,
  Info,
  X,
} from 'lucide-react';
import { useBenchmarkEngine } from '@/hooks/useBenchmarkEngine';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { AccentButton } from '@/components/ui/AccentButton';
import { MinimalButton } from '@/components/ui/MinimalButton';
import { GeometricDecor } from '@/components/ui/GeometricDecor';
import { Skeleton, TableSkeleton } from '@/components/ui/Skeleton';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  coding: Code,
  math: Calculator,
  reasoning: Brain,
  knowledge: Zap,
};

const PROVIDER_ACCENT: Record<string, string> = {
  OpenAI: 'bg-teal-500',
  Anthropic: 'bg-amber-500',
  Google: 'bg-blue-500',
  xAI: 'bg-warm-600',
  DeepSeek: 'bg-indigo-500',
};

export function BenchmarkDashboard() {
  const {
    models,
    benchmarks,
    overallLeaderboard,
    comparison,
    selectedModels,
    selectedBenchmarks,
    toggleModel,
    toggleBenchmark,
    clearSelection,
    getCategoryLeaderboard,
    recommendModel,
    calculateCost,
    isLoading,
  } = useBenchmarkEngine();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedUseCase, setExpandedUseCase] = useState<string | null>(null);
  const [showCompare, setShowCompare] = useState(false);

  const categories = ['coding', 'math', 'reasoning', 'knowledge'];

  // Get leaderboard based on category filter
  const displayLeaderboard = selectedCategory
    ? getCategoryLeaderboard(selectedCategory)
    : overallLeaderboard;

  // Use cases with recommendations
  const useCases = [
    { id: 'coding', label: 'Software Development', desc: 'Building apps, fixing bugs' },
    { id: 'math', label: 'Advanced Mathematics', desc: 'Competition math, proofs' },
    { id: 'reasoning', label: 'PhD-Level Science', desc: 'Graduate-level questions' },
    { id: 'budget', label: 'Budget Applications', desc: 'High volume, cost-sensitive' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-warm-50 p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <Skeleton variant="text" width="40%" height={32} />
          <Skeleton variant="text" width="60%" height={16} />
          <TableSkeleton rows={6} cols={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-50">
      <GeometricDecor variant="dots" size="md" position="top-right" opacity={0.1} />

      <div className="relative max-w-6xl mx-auto px-6 py-12 lg:px-12 lg:py-16">
        {/* Header */}
        <SectionHeader
          label="Live Data"
          title="AI Model Benchmarks"
          subtitle="Real-time performance tracking across major benchmarks. Updated January 2025."
          action={
            selectedModels.length > 0 && (
              <AccentButton onClick={() => setShowCompare(true)} size="sm">
                Compare ({selectedModels.length})
              </AccentButton>
            )
          }
        />

        {/* Category Filters */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedCategory === null
                ? 'bg-teal-500 text-white'
                : 'bg-white border border-warm-200 text-warm-600 hover:border-teal-300'
            }`}
          >
            All
          </button>
          {categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat];
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-teal-500 text-white'
                    : 'bg-white border border-warm-200 text-warm-600 hover:border-teal-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            );
          })}
        </div>

        {/* Leaderboard */}
        <div className="bg-white border border-warm-200 rounded-2xl overflow-hidden mb-8">
          <div className="flex items-center justify-between px-6 py-4 border-b border-warm-100">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h3 className="font-medium text-warm-900">
                {selectedCategory
                  ? `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Leaderboard`
                  : 'Overall Leaderboard'}
              </h3>
            </div>
            <span className="text-xs text-warm-400">Click to select for comparison</span>
          </div>

          <table className="w-full">
            <thead className="bg-warm-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-warm-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-warm-500 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-warm-500 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-warm-500 uppercase tracking-wider">
                  Avg Score
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-warm-500 uppercase tracking-wider w-16">
                  Select
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {displayLeaderboard.map((entry, index) => {
                const isSelected = selectedModels.includes(entry.modelId);
                return (
                  <tr
                    key={entry.modelId}
                    onClick={() => toggleModel(entry.modelId)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-teal-50'
                        : 'hover:bg-warm-50'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-warm-100">
                        {index === 0 ? (
                          <span className="text-amber-500 text-sm">1</span>
                        ) : index === 1 ? (
                          <span className="text-warm-400 text-sm">2</span>
                        ) : index === 2 ? (
                          <span className="text-amber-700 text-sm">3</span>
                        ) : (
                          <span className="text-warm-500 text-sm">{index + 1}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-warm-900">{entry.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${
                          PROVIDER_ACCENT[entry.provider] || 'bg-warm-500'
                        }`}
                      >
                        {entry.provider}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-semibold text-warm-900">
                        {entry.avgScore.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mx-auto transition-colors ${
                          isSelected
                            ? 'bg-teal-500 border-teal-500'
                            : 'border-warm-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Use Case Recommendations */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Target className="w-5 h-5 text-teal-500" />
            <h3 className="font-medium text-warm-900">Which Model Should You Use?</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {useCases.map((useCase) => {
              const recommendation = recommendModel(useCase.id);
              const isExpanded = expandedUseCase === useCase.id;

              return (
                <div
                  key={useCase.id}
                  className="bg-white border border-warm-200 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedUseCase(isExpanded ? null : useCase.id)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-warm-50 transition-colors"
                  >
                    <div className="text-left">
                      <h4 className="font-medium text-warm-900">{useCase.label}</h4>
                      <p className="text-sm text-warm-500">{useCase.desc}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {recommendation && (
                        <span className="text-sm font-medium text-teal-600">
                          {recommendation.modelName}
                        </span>
                      )}
                      <ChevronRight
                        className={`w-4 h-4 text-warm-400 transition-transform ${
                          isExpanded ? 'rotate-90' : ''
                        }`}
                      />
                    </div>
                  </button>

                  {isExpanded && recommendation && (
                    <div className="px-5 pb-4 pt-0 border-t border-warm-100 bg-warm-50">
                      <div className="py-4 space-y-3">
                        <div>
                          <span className="text-xs text-warm-500 uppercase">Why?</span>
                          <p className="text-sm text-warm-700">{recommendation.reason}</p>
                        </div>
                        {recommendation.score && (
                          <div>
                            <span className="text-xs text-warm-500 uppercase">Score</span>
                            <p className="text-sm font-medium text-warm-900">
                              {recommendation.score.toFixed(1)}%
                            </p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          {recommendation.alternatives.map((alt) => (
                            <span
                              key={alt}
                              className="px-2 py-1 text-xs bg-white border border-warm-200 rounded-full text-warm-600"
                            >
                              {alt}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Cost Calculator */}
        <div className="bg-gradient-to-br from-teal-50 to-warm-50 border border-teal-100 rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-5 h-5 text-teal-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-warm-900 mb-1">Cost Estimator</h3>
              <p className="text-sm text-warm-500 mb-4">
                Compare pricing across models for your use case
              </p>

              <div className="grid grid-cols-3 gap-4">
                {['gpt-5', 'claude-opus-4-5', 'deepseek-r1'].map((modelId) => {
                  const cost = calculateCost(modelId, 100000, 50000);
                  const model = models.find((m) => m.id === modelId);
                  return (
                    <div key={modelId} className="bg-white rounded-lg p-4 border border-warm-200">
                      <p className="text-sm font-medium text-warm-900">{model?.name || modelId}</p>
                      <p className="text-2xl font-light text-teal-600 mt-1">
                        ${cost.toFixed(2)}
                      </p>
                      <p className="text-xs text-warm-400">per 100K in / 50K out</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Benchmark Info */}
        <div className="bg-white border border-warm-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Info className="w-5 h-5 text-warm-400" />
            <h3 className="font-medium text-warm-900">Understanding Benchmarks</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {benchmarks.slice(0, 4).map((benchmark) => (
              <div key={benchmark.id} className="p-4 bg-warm-50 rounded-xl">
                <h4 className="font-medium text-warm-900 text-sm">{benchmark.name}</h4>
                <p className="text-xs text-warm-500 mt-1">{benchmark.description}</p>
                {benchmark.humanBaseline && (
                  <p className="text-xs text-teal-600 mt-2">
                    Human baseline: {benchmark.humanBaseline}%
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Source Attribution */}
        <div className="text-xs text-warm-400 text-center mt-8">
          Data sourced from official benchmarks, Artificial Analysis, and LM Arena
        </div>
      </div>

      {/* Comparison Modal */}
      {showCompare && comparison && (
        <div className="fixed inset-0 bg-warm-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-warm-100">
              <h3 className="font-medium text-warm-900">Model Comparison</h3>
              <button
                onClick={() => {
                  setShowCompare(false);
                  clearSelection();
                }}
                className="p-2 hover:bg-warm-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-warm-500" />
              </button>
            </div>

            <div className="p-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-warm-100">
                    <th className="px-4 py-3 text-left text-sm font-medium text-warm-500">
                      Benchmark
                    </th>
                    {comparison.models.map((modelId) => {
                      const model = models.find((m) => m.id === modelId);
                      return (
                        <th
                          key={modelId}
                          className="px-4 py-3 text-center text-sm font-medium text-warm-900"
                        >
                          {model?.name || modelId}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-100">
                  {Object.entries(comparison.scores).map(([benchmarkId, modelScores]) => {
                    const benchmark = benchmarks.find((b) => b.id === benchmarkId);
                    const scores = Object.values(modelScores as Record<string, number>);
                    const maxScore = Math.max(...scores);

                    return (
                      <tr key={benchmarkId}>
                        <td className="px-4 py-3 text-sm text-warm-700">
                          {benchmark?.name || benchmarkId}
                        </td>
                        {comparison.models.map((modelId) => {
                          const score = (modelScores as Record<string, number>)[modelId];
                          const isMax = score === maxScore;

                          return (
                            <td key={modelId} className="px-4 py-3 text-center">
                              <span
                                className={`text-sm font-medium ${
                                  isMax ? 'text-teal-600' : 'text-warm-600'
                                }`}
                              >
                                {score !== undefined ? `${score.toFixed(1)}%` : '-'}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="mt-6 pt-6 border-t border-warm-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-warm-500">Winner by category count:</span>
                  <span className="font-medium text-teal-600">
                    {comparison.winner
                      ? models.find((m) => m.id === comparison.winner)?.name
                      : 'Tie'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BenchmarkDashboard;
