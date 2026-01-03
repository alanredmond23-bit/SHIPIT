'use client';

import React, { useState } from 'react';
import {
  BarChart3,
  Trophy,
  Zap,
  Brain,
  Code,
  Calculator,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  DollarSign,
  Clock,
  Target,
  Info,
} from 'lucide-react';

// Types
interface ModelScore {
  model_id: string;
  model_name: string;
  provider: string;
  benchmark_id: string;
  score: number;
  rank?: number;
}

interface Benchmark {
  id: string;
  name: string;
  category: string;
  description: string;
  difficulty: string;
  human_baseline?: number;
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
  strengths: string[];
  pricing: { input: number; output: number };
  context_window: number;
}

interface UseCase {
  use_case: string;
  description: string;
  recommended_model: string;
  why: string;
  key_benchmark: string;
  alternatives: string[];
}

// Sample data - in production, fetch from API
const SAMPLE_LEADERBOARD = [
  { rank: 1, model: 'GPT-5', provider: 'OpenAI', avg_score: 91.2, benchmarks: 8 },
  { rank: 2, model: 'o3', provider: 'OpenAI', avg_score: 89.1, benchmarks: 6 },
  { rank: 3, model: 'Claude Opus 4.5', provider: 'Anthropic', avg_score: 87.4, benchmarks: 5 },
  { rank: 4, model: 'Gemini 2.5 Pro', provider: 'Google', avg_score: 86.8, benchmarks: 7 },
  { rank: 5, model: 'Grok 4', provider: 'xAI', avg_score: 85.2, benchmarks: 4 },
  { rank: 6, model: 'DeepSeek R1', provider: 'DeepSeek', avg_score: 78.1, benchmarks: 4 },
];

const SAMPLE_USE_CASES: UseCase[] = [
  {
    use_case: 'Complex Software Development',
    description: 'Building production applications, fixing bugs',
    recommended_model: 'Claude Opus 4.5',
    why: 'Highest SWE-bench score (75.2%)',
    key_benchmark: 'swe-bench-verified',
    alternatives: ['GPT-5', 'o3'],
  },
  {
    use_case: 'Advanced Mathematics',
    description: 'Competition math, proofs',
    recommended_model: 'GPT-5',
    why: 'Perfect AIME 2025 score (100%)',
    key_benchmark: 'aime-2025',
    alternatives: ['o3', 'Gemini 2.5 Pro'],
  },
  {
    use_case: 'PhD-Level Science',
    description: 'Graduate-level science questions',
    recommended_model: 'o3',
    why: 'Highest GPQA Diamond (87.7%)',
    key_benchmark: 'gpqa-diamond',
    alternatives: ['GPT-5', 'Gemini 2.5 Pro'],
  },
  {
    use_case: 'Long Document Analysis',
    description: 'Books, legal docs, research papers',
    recommended_model: 'Gemini 2.5 Pro',
    why: '2M context window',
    key_benchmark: 'mmmu',
    alternatives: ['Claude Opus 4.5'],
  },
  {
    use_case: 'Budget Applications',
    description: 'High volume, cost-sensitive',
    recommended_model: 'DeepSeek R1',
    why: '~1/20th the cost of GPT-5',
    key_benchmark: 'math-500',
    alternatives: ['Gemini 2.5 Flash'],
  },
];

const BENCHMARK_CATEGORIES = [
  { id: 'coding', name: 'Coding', icon: Code, color: 'text-blue-500' },
  { id: 'math', name: 'Math', icon: Calculator, color: 'text-green-500' },
  { id: 'reasoning', name: 'Reasoning', icon: Brain, color: 'text-purple-500' },
  { id: 'knowledge', name: 'Knowledge', icon: Lightbulb, color: 'text-yellow-500' },
];

const PROVIDER_COLORS: Record<string, string> = {
  OpenAI: 'bg-emerald-500',
  Anthropic: 'bg-orange-500',
  Google: 'bg-blue-500',
  xAI: 'bg-gray-700',
  DeepSeek: 'bg-indigo-500',
};

export function BenchmarkDashboard() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedUseCase, setExpandedUseCase] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-indigo-500" />
            AI Model Benchmarks
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Real-time performance tracking across major benchmarks (January 2025)
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          Updated daily
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedCategory === null
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          All Benchmarks
        </button>
        {BENCHMARK_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
              }`}
            >
              <Icon className={`w-4 h-4 ${cat.color}`} />
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Overall Leaderboard */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Overall Leaderboard
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Rank
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Model
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Provider
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Avg Score
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Benchmarks
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {SAMPLE_LEADERBOARD.map((entry, index) => (
                <tr
                  key={entry.model}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700">
                      {index === 0 ? (
                        <span className="text-yellow-500 font-bold">🥇</span>
                      ) : index === 1 ? (
                        <span className="text-gray-400 font-bold">🥈</span>
                      ) : index === 2 ? (
                        <span className="text-amber-600 font-bold">🥉</span>
                      ) : (
                        <span className="text-gray-500 text-sm font-medium">
                          {entry.rank}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {entry.model}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${
                        PROVIDER_COLORS[entry.provider] || 'bg-gray-500'
                      }`}
                    >
                      {entry.provider}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {entry.avg_score.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right text-gray-500 dark:text-gray-400">
                    {entry.benchmarks}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Use Case Recommendations */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-green-500" />
            Which Model Should You Use?
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Best models for specific use cases based on benchmark performance
          </p>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {SAMPLE_USE_CASES.map((useCase) => (
            <div key={useCase.use_case}>
              <button
                onClick={() =>
                  setExpandedUseCase(
                    expandedUseCase === useCase.use_case ? null : useCase.use_case
                  )
                }
                className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/50">
                    <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {useCase.use_case}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {useCase.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {useCase.recommended_model}
                    </div>
                    <div className="text-xs text-gray-500">Recommended</div>
                  </div>
                  {expandedUseCase === useCase.use_case ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {expandedUseCase === useCase.use_case && (
                <div className="px-4 pb-4 pt-0 bg-gray-50 dark:bg-gray-700/30">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
                    <div>
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                        Why This Model?
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {useCase.why}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                        Key Benchmark
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {useCase.key_benchmark}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                        Alternatives
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {useCase.alternatives.map((alt) => (
                          <span
                            key={alt}
                            className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 rounded"
                          >
                            {alt}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Key Benchmarks Explained */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between"
        >
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" />
            Understanding the Benchmarks
          </h3>
          {showDetails ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {showDetails && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white">SWE-bench</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Tests ability to fix real GitHub issues. Top score: Claude Opus 4.5 (75.2%)
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white">AIME 2025</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                American math competition (high school). GPT-5 achieved perfect 100%.
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white">GPQA Diamond</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                PhD-level science questions. Human experts score ~65%. o3 leads with 87.7%.
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white">ARC-AGI</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Abstract reasoning puzzles for AGI evaluation. o3 achieved 87.5%.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Source Attribution */}
      <div className="text-xs text-gray-400 text-center">
        Data sourced from:{' '}
        <a href="https://lmcouncil.ai/benchmarks" className="text-indigo-500 hover:underline">
          LM Council
        </a>
        ,{' '}
        <a href="https://artificialanalysis.ai" className="text-indigo-500 hover:underline">
          Artificial Analysis
        </a>
        ,{' '}
        <a href="https://llm-stats.com" className="text-indigo-500 hover:underline">
          LLM Stats
        </a>
      </div>
    </div>
  );
}

export default BenchmarkDashboard;
