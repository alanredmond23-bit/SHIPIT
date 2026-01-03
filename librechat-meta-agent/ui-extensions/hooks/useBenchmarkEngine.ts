'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

export type ModelProvider = 'openai' | 'anthropic' | 'google' | 'xai' | 'deepseek' | 'meta';

export type BenchmarkCategory = 'coding' | 'math' | 'reasoning' | 'knowledge' | 'multimodal';

export interface ModelScore {
  modelId: string;
  modelName: string;
  provider: ModelProvider;
  benchmarkId: string;
  score: number;
  rank: number;
  measuredAt: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: ModelProvider;
  contextWindow: number;
  maxOutput: number;
  pricing: { input: number; output: number };
  capabilities: string[];
  releaseDate: string;
  strengths: string[];
  weaknesses: string[];
}

export interface Benchmark {
  id: string;
  name: string;
  fullName: string;
  category: BenchmarkCategory;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert' | 'frontier';
  humanBaseline?: number;
  maxScore: number;
}

export interface ModelComparison {
  models: string[];
  benchmarks: string[];
  scores: Record<string, Record<string, number>>;
  winner: string;
  pricePerformanceWinner: string;
}

export interface UseCase {
  id: string;
  name: string;
  description: string;
  recommendedModel: string;
  reason: string;
  keyBenchmarks: string[];
  alternatives: string[];
}

// ============================================================================
// Static Data (January 2025)
// ============================================================================

const MODELS: AIModel[] = [
  {
    id: 'gpt-5',
    name: 'GPT-5',
    provider: 'openai',
    contextWindow: 256000,
    maxOutput: 32768,
    pricing: { input: 5.0, output: 15.0 },
    capabilities: ['text', 'vision', 'audio', 'video', 'code', 'tools'],
    releaseDate: '2025-01',
    strengths: ['Multimodal', 'Reasoning', 'Math', 'Code'],
    weaknesses: ['Cost', 'Latency'],
  },
  {
    id: 'o3',
    name: 'o3',
    provider: 'openai',
    contextWindow: 200000,
    maxOutput: 100000,
    pricing: { input: 10.0, output: 40.0 },
    capabilities: ['text', 'vision', 'code', 'tools', 'extended_thinking'],
    releaseDate: '2024-12',
    strengths: ['Deep reasoning', 'Math', 'Science', 'ARC-AGI'],
    weaknesses: ['Very expensive', 'Slow', 'No audio/video'],
  },
  {
    id: 'claude-opus-4-5',
    name: 'Claude Opus 4.5',
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutput: 32768,
    pricing: { input: 15.0, output: 75.0 },
    capabilities: ['text', 'vision', 'code', 'tools', 'extended_thinking'],
    releaseDate: '2025-02',
    strengths: ['Coding', 'Writing', 'Analysis', 'Long context'],
    weaknesses: ['No web search', 'No audio', 'Expensive'],
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    contextWindow: 2000000,
    maxOutput: 65536,
    pricing: { input: 1.25, output: 5.0 },
    capabilities: ['text', 'vision', 'audio', 'video', 'code', 'tools', 'web_search'],
    releaseDate: '2025-01',
    strengths: ['Massive context', 'Multimodal', 'Cost effective', 'Real-time'],
    weaknesses: ['Less consistent', 'Weaker reasoning'],
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    provider: 'deepseek',
    contextWindow: 64000,
    maxOutput: 8192,
    pricing: { input: 0.55, output: 2.19 },
    capabilities: ['text', 'code', 'tools', 'extended_thinking'],
    releaseDate: '2025-01',
    strengths: ['Very cheap', 'Good math', 'Open weights'],
    weaknesses: ['No multimodal', 'Smaller context'],
  },
  {
    id: 'grok-4',
    name: 'Grok 4',
    provider: 'xai',
    contextWindow: 128000,
    maxOutput: 32768,
    pricing: { input: 3.0, output: 15.0 },
    capabilities: ['text', 'vision', 'code', 'tools', 'web_search'],
    releaseDate: '2025-01',
    strengths: ['Real-time info', 'Math', 'Humor'],
    weaknesses: ['Limited availability'],
  },
];

const BENCHMARKS: Benchmark[] = [
  { id: 'swe-bench', name: 'SWE-bench', fullName: 'Software Engineering Benchmark', category: 'coding', description: 'Fix real GitHub issues', difficulty: 'expert', humanBaseline: 100, maxScore: 100 },
  { id: 'aime-2025', name: 'AIME 2025', fullName: 'American Invitational Mathematics Examination', category: 'math', description: 'High school math competition', difficulty: 'expert', humanBaseline: 50, maxScore: 100 },
  { id: 'math-500', name: 'Math 500', fullName: 'MATH 500 Benchmark', category: 'math', description: '500 challenging math problems', difficulty: 'hard', maxScore: 100 },
  { id: 'gpqa-diamond', name: 'GPQA Diamond', fullName: 'Graduate-Level Q&A Diamond', category: 'reasoning', description: 'PhD-level science questions', difficulty: 'frontier', humanBaseline: 34, maxScore: 100 },
  { id: 'arc-agi', name: 'ARC-AGI', fullName: 'Abstraction and Reasoning Corpus', category: 'reasoning', description: 'Abstract reasoning puzzles', difficulty: 'frontier', humanBaseline: 85, maxScore: 100 },
  { id: 'mmlu-pro', name: 'MMLU Pro', fullName: 'Massive Multitask Language Understanding Pro', category: 'knowledge', description: 'Enhanced knowledge test', difficulty: 'hard', humanBaseline: 89, maxScore: 100 },
  { id: 'mmmu', name: 'MMMU', fullName: 'Massive Multi-discipline Multimodal Understanding', category: 'multimodal', description: 'Expert multimodal understanding', difficulty: 'hard', humanBaseline: 88, maxScore: 100 },
];

const SCORES: ModelScore[] = [
  // GPT-5
  { modelId: 'gpt-5', modelName: 'GPT-5', provider: 'openai', benchmarkId: 'aime-2025', score: 100, rank: 1, measuredAt: '2025-01' },
  { modelId: 'gpt-5', modelName: 'GPT-5', provider: 'openai', benchmarkId: 'swe-bench', score: 72.8, rank: 2, measuredAt: '2025-01' },
  { modelId: 'gpt-5', modelName: 'GPT-5', provider: 'openai', benchmarkId: 'gpqa-diamond', score: 78.3, rank: 2, measuredAt: '2025-01' },
  { modelId: 'gpt-5', modelName: 'GPT-5', provider: 'openai', benchmarkId: 'math-500', score: 93.1, rank: 3, measuredAt: '2025-01' },
  // o3
  { modelId: 'o3', modelName: 'o3', provider: 'openai', benchmarkId: 'gpqa-diamond', score: 87.7, rank: 1, measuredAt: '2025-01' },
  { modelId: 'o3', modelName: 'o3', provider: 'openai', benchmarkId: 'arc-agi', score: 87.5, rank: 1, measuredAt: '2024-12' },
  { modelId: 'o3', modelName: 'o3', provider: 'openai', benchmarkId: 'mmlu-pro', score: 92.3, rank: 1, measuredAt: '2025-01' },
  { modelId: 'o3', modelName: 'o3', provider: 'openai', benchmarkId: 'swe-bench', score: 71.7, rank: 3, measuredAt: '2025-01' },
  // Claude Opus 4.5
  { modelId: 'claude-opus-4-5', modelName: 'Claude Opus 4.5', provider: 'anthropic', benchmarkId: 'swe-bench', score: 75.2, rank: 1, measuredAt: '2025-01' },
  { modelId: 'claude-opus-4-5', modelName: 'Claude Opus 4.5', provider: 'anthropic', benchmarkId: 'aime-2025', score: 93.3, rank: 3, measuredAt: '2025-01' },
  { modelId: 'claude-opus-4-5', modelName: 'Claude Opus 4.5', provider: 'anthropic', benchmarkId: 'gpqa-diamond', score: 74.8, rank: 4, measuredAt: '2025-01' },
  // Gemini 2.5 Pro
  { modelId: 'gemini-2.5-pro', modelName: 'Gemini 2.5 Pro', provider: 'google', benchmarkId: 'math-500', score: 95.2, rank: 1, measuredAt: '2025-01' },
  { modelId: 'gemini-2.5-pro', modelName: 'Gemini 2.5 Pro', provider: 'google', benchmarkId: 'mmmu', score: 82.1, rank: 1, measuredAt: '2025-01' },
  { modelId: 'gemini-2.5-pro', modelName: 'Gemini 2.5 Pro', provider: 'google', benchmarkId: 'mmlu-pro', score: 88.5, rank: 3, measuredAt: '2025-01' },
  // DeepSeek R1
  { modelId: 'deepseek-r1', modelName: 'DeepSeek R1', provider: 'deepseek', benchmarkId: 'math-500', score: 93.8, rank: 2, measuredAt: '2025-01' },
  { modelId: 'deepseek-r1', modelName: 'DeepSeek R1', provider: 'deepseek', benchmarkId: 'aime-2025', score: 91.2, rank: 4, measuredAt: '2025-01' },
  // Grok 4
  { modelId: 'grok-4', modelName: 'Grok 4', provider: 'xai', benchmarkId: 'aime-2025', score: 96.7, rank: 2, measuredAt: '2025-01' },
  { modelId: 'grok-4', modelName: 'Grok 4', provider: 'xai', benchmarkId: 'math-500', score: 94.2, rank: 2, measuredAt: '2025-01' },
];

const USE_CASES: UseCase[] = [
  {
    id: 'coding',
    name: 'Complex Software Development',
    description: 'Building production apps, fixing bugs, code review',
    recommendedModel: 'claude-opus-4-5',
    reason: 'Highest SWE-bench score (75.2%)',
    keyBenchmarks: ['swe-bench'],
    alternatives: ['gpt-5', 'o3'],
  },
  {
    id: 'math',
    name: 'Advanced Mathematics',
    description: 'Competition math, proofs, calculations',
    recommendedModel: 'gpt-5',
    reason: 'Perfect AIME 2025 score (100%)',
    keyBenchmarks: ['aime-2025', 'math-500'],
    alternatives: ['o3', 'gemini-2.5-pro'],
  },
  {
    id: 'reasoning',
    name: 'PhD-Level Science',
    description: 'Graduate-level science questions',
    recommendedModel: 'o3',
    reason: 'Highest GPQA Diamond (87.7%)',
    keyBenchmarks: ['gpqa-diamond', 'arc-agi'],
    alternatives: ['gpt-5', 'claude-opus-4-5'],
  },
  {
    id: 'long-context',
    name: 'Long Document Analysis',
    description: 'Books, legal docs, research papers',
    recommendedModel: 'gemini-2.5-pro',
    reason: '2M context window, cost effective',
    keyBenchmarks: ['mmmu'],
    alternatives: ['claude-opus-4-5'],
  },
  {
    id: 'budget',
    name: 'Budget Applications',
    description: 'High volume, cost-sensitive',
    recommendedModel: 'deepseek-r1',
    reason: '~1/20th the cost of GPT-5',
    keyBenchmarks: ['math-500'],
    alternatives: ['gemini-2.5-pro'],
  },
];

// ============================================================================
// Benchmark Engine Hook
// ============================================================================

export function useBenchmarkEngine() {
  // State
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedBenchmarks, setSelectedBenchmarks] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<BenchmarkCategory | null>(null);
  const [providerFilter, setProviderFilter] = useState<ModelProvider | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());

  // Fetch live data (simulated - in production, call actual APIs)
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    setLastUpdated(new Date().toISOString());
    setIsLoading(false);
  }, []);

  // Get all models (with optional filter)
  const models = useMemo(() => {
    if (!providerFilter) return MODELS;
    return MODELS.filter((m) => m.provider === providerFilter);
  }, [providerFilter]);

  // Get all benchmarks (with optional filter)
  const benchmarks = useMemo(() => {
    if (!categoryFilter) return BENCHMARKS;
    return BENCHMARKS.filter((b) => b.category === categoryFilter);
  }, [categoryFilter]);

  // Get model by ID
  const getModel = useCallback((id: string) => {
    return MODELS.find((m) => m.id === id);
  }, []);

  // Get benchmark by ID
  const getBenchmark = useCallback((id: string) => {
    return BENCHMARKS.find((b) => b.id === id);
  }, []);

  // Get scores for a model
  const getModelScores = useCallback((modelId: string) => {
    return SCORES.filter((s) => s.modelId === modelId);
  }, []);

  // Get scores for a benchmark (leaderboard)
  const getBenchmarkLeaderboard = useCallback((benchmarkId: string) => {
    return SCORES
      .filter((s) => s.benchmarkId === benchmarkId)
      .sort((a, b) => b.score - a.score);
  }, []);

  // Overall leaderboard
  const overallLeaderboard = useMemo(() => {
    const modelAverages: Record<string, { total: number; count: number; name: string; provider: ModelProvider }> = {};

    SCORES.forEach((score) => {
      if (!modelAverages[score.modelId]) {
        modelAverages[score.modelId] = {
          total: 0,
          count: 0,
          name: score.modelName,
          provider: score.provider,
        };
      }
      modelAverages[score.modelId].total += score.score;
      modelAverages[score.modelId].count += 1;
    });

    return Object.entries(modelAverages)
      .map(([id, data]) => ({
        modelId: id,
        modelName: data.name,
        provider: data.provider,
        avgScore: data.total / data.count,
        benchmarkCount: data.count,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }, []);

  // Category leaderboard
  const getCategoryLeaderboard = useCallback((category: BenchmarkCategory) => {
    const categoryBenchmarks = BENCHMARKS.filter((b) => b.category === category);
    const benchmarkIds = categoryBenchmarks.map((b) => b.id);

    const modelScores: Record<string, { total: number; count: number; name: string; provider: ModelProvider }> = {};

    SCORES
      .filter((s) => benchmarkIds.includes(s.benchmarkId))
      .forEach((score) => {
        if (!modelScores[score.modelId]) {
          modelScores[score.modelId] = {
            total: 0,
            count: 0,
            name: score.modelName,
            provider: score.provider,
          };
        }
        modelScores[score.modelId].total += score.score;
        modelScores[score.modelId].count += 1;
      });

    return Object.entries(modelScores)
      .map(([id, data]) => ({
        modelId: id,
        modelName: data.name,
        provider: data.provider,
        avgScore: data.total / data.count,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }, []);

  // Compare selected models
  const comparison = useMemo((): ModelComparison | null => {
    if (selectedModels.length < 2) return null;

    const benchmarksToCompare = selectedBenchmarks.length > 0
      ? selectedBenchmarks
      : BENCHMARKS.map((b) => b.id);

    const scores: Record<string, Record<string, number>> = {};
    const winCount: Record<string, number> = {};

    benchmarksToCompare.forEach((benchmarkId) => {
      scores[benchmarkId] = {};
      let maxScore = -1;
      let winner = '';

      selectedModels.forEach((modelId) => {
        const score = SCORES.find(
          (s) => s.modelId === modelId && s.benchmarkId === benchmarkId
        )?.score;

        if (score !== undefined) {
          scores[benchmarkId][modelId] = score;
          if (score > maxScore) {
            maxScore = score;
            winner = modelId;
          }
        }
      });

      if (winner) {
        winCount[winner] = (winCount[winner] || 0) + 1;
      }
    });

    // Overall winner by most benchmark wins
    const winner = Object.entries(winCount).sort((a, b) => b[1] - a[1])[0]?.[0] || selectedModels[0];

    // Price-performance winner
    let bestRatio = 0;
    let pricePerformanceWinner = selectedModels[0];

    selectedModels.forEach((modelId) => {
      const model = getModel(modelId);
      if (!model) return;

      const avgScore = Object.values(scores)
        .map((bm) => bm[modelId] || 0)
        .reduce((a, b) => a + b, 0) / benchmarksToCompare.length;

      const avgPrice = (model.pricing.input + model.pricing.output) / 2;
      const ratio = avgScore / avgPrice;

      if (ratio > bestRatio) {
        bestRatio = ratio;
        pricePerformanceWinner = modelId;
      }
    });

    return {
      models: selectedModels,
      benchmarks: benchmarksToCompare,
      scores,
      winner,
      pricePerformanceWinner,
    };
  }, [selectedModels, selectedBenchmarks, getModel]);

  // Recommend model for use case
  const recommendModel = useCallback(
    (useCaseId: string) => {
      return USE_CASES.find((uc) => uc.id === useCaseId);
    },
    []
  );

  // Calculate cost estimate
  const calculateCost = useCallback(
    (modelId: string, inputTokens: number, outputTokens: number) => {
      const model = getModel(modelId);
      if (!model) return 0;

      return (
        (model.pricing.input * inputTokens) / 1_000_000 +
        (model.pricing.output * outputTokens) / 1_000_000
      );
    },
    [getModel]
  );

  // Toggle model selection
  const toggleModel = useCallback((modelId: string) => {
    setSelectedModels((prev) =>
      prev.includes(modelId)
        ? prev.filter((id) => id !== modelId)
        : [...prev, modelId]
    );
  }, []);

  // Toggle benchmark selection
  const toggleBenchmark = useCallback((benchmarkId: string) => {
    setSelectedBenchmarks((prev) =>
      prev.includes(benchmarkId)
        ? prev.filter((id) => id !== benchmarkId)
        : [...prev, benchmarkId]
    );
  }, []);

  return {
    // State
    models,
    benchmarks,
    selectedModels,
    selectedBenchmarks,
    categoryFilter,
    providerFilter,
    isLoading,
    lastUpdated,
    comparison,
    overallLeaderboard,
    useCases: USE_CASES,

    // Actions
    setSelectedModels,
    setSelectedBenchmarks,
    setCategoryFilter,
    setProviderFilter,
    toggleModel,
    toggleBenchmark,
    refreshData,

    // Queries
    getModel,
    getBenchmark,
    getModelScores,
    getBenchmarkLeaderboard,
    getCategoryLeaderboard,
    recommendModel,
    calculateCost,
  };
}

export default useBenchmarkEngine;
