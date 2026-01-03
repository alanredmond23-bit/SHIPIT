// Benchmark Service
// Real-time AI model performance tracking and comparison

import {
  Benchmark,
  BenchmarkCategory,
  ModelScore,
  AIModel,
  ModelProvider,
  ModelComparison,
  ModelRecommendation,
  BenchmarkLeaderboard,
  KEY_BENCHMARKS,
  LATEST_MODEL_SCORES,
  AI_MODELS,
} from '../types/benchmarks';

// ============================================================================
// Benchmark Service
// ============================================================================

export class BenchmarkService {
  private supabase: any;

  constructor(supabase?: any) {
    this.supabase = supabase;
  }

  // ============================================================================
  // Benchmark Management
  // ============================================================================

  getBenchmarks(filters?: {
    category?: BenchmarkCategory;
    difficulty?: string;
  }): Benchmark[] {
    let benchmarks = KEY_BENCHMARKS;

    if (filters?.category) {
      benchmarks = benchmarks.filter((b) => b.category === filters.category);
    }
    if (filters?.difficulty) {
      benchmarks = benchmarks.filter((b) => b.difficulty === filters.difficulty);
    }

    return benchmarks;
  }

  getBenchmark(id: string): Benchmark | undefined {
    return KEY_BENCHMARKS.find((b) => b.id === id);
  }

  // ============================================================================
  // Model Management
  // ============================================================================

  getModels(filters?: { provider?: ModelProvider }): AIModel[] {
    let models = AI_MODELS;

    if (filters?.provider) {
      models = models.filter((m) => m.provider === filters.provider);
    }

    return models;
  }

  getModel(id: string): AIModel | undefined {
    return AI_MODELS.find((m) => m.id === id);
  }

  // ============================================================================
  // Score Retrieval
  // ============================================================================

  getScores(filters?: {
    model_id?: string;
    benchmark_id?: string;
    provider?: ModelProvider;
  }): ModelScore[] {
    let scores = LATEST_MODEL_SCORES;

    if (filters?.model_id) {
      scores = scores.filter((s) => s.model_id === filters.model_id);
    }
    if (filters?.benchmark_id) {
      scores = scores.filter((s) => s.benchmark_id === filters.benchmark_id);
    }
    if (filters?.provider) {
      scores = scores.filter((s) => s.provider === filters.provider);
    }

    return scores;
  }

  // ============================================================================
  // Leaderboards
  // ============================================================================

  getLeaderboard(benchmarkId: string): BenchmarkLeaderboard | null {
    const benchmark = this.getBenchmark(benchmarkId);
    if (!benchmark) return null;

    const scores = this.getScores({ benchmark_id: benchmarkId });
    const sorted = scores.sort((a, b) => b.score - a.score);

    const topScore = sorted[0]?.score || 0;

    return {
      benchmark_id: benchmarkId,
      benchmark_name: benchmark.name,
      category: benchmark.category,
      entries: sorted.map((s, i) => ({
        rank: i + 1,
        model_id: s.model_id,
        model_name: s.model_name,
        provider: s.provider,
        score: s.score,
        delta_from_top: topScore - s.score,
        measured_at: s.measured_at,
      })),
      last_updated: new Date().toISOString(),
    };
  }

  getOverallLeaderboard(): {
    rank: number;
    model_id: string;
    model_name: string;
    provider: ModelProvider;
    avg_score: number;
    benchmarks_counted: number;
  }[] {
    const modelScores: Record<
      string,
      { total: number; count: number; name: string; provider: ModelProvider }
    > = {};

    for (const score of LATEST_MODEL_SCORES) {
      if (!modelScores[score.model_id]) {
        modelScores[score.model_id] = {
          total: 0,
          count: 0,
          name: score.model_name,
          provider: score.provider,
        };
      }
      modelScores[score.model_id].total += score.score;
      modelScores[score.model_id].count += 1;
    }

    const results = Object.entries(modelScores)
      .map(([id, data]) => ({
        model_id: id,
        model_name: data.name,
        provider: data.provider,
        avg_score: data.total / data.count,
        benchmarks_counted: data.count,
      }))
      .sort((a, b) => b.avg_score - a.avg_score)
      .map((r, i) => ({ ...r, rank: i + 1 }));

    return results;
  }

  getCategoryLeaderboard(category: BenchmarkCategory): {
    rank: number;
    model_id: string;
    model_name: string;
    provider: ModelProvider;
    avg_score: number;
    benchmarks: { id: string; score: number }[];
  }[] {
    const categoryBenchmarks = KEY_BENCHMARKS.filter(
      (b) => b.category === category
    );
    const benchmarkIds = categoryBenchmarks.map((b) => b.id);

    const modelScores: Record<
      string,
      {
        total: number;
        count: number;
        name: string;
        provider: ModelProvider;
        benchmarks: { id: string; score: number }[];
      }
    > = {};

    for (const score of LATEST_MODEL_SCORES) {
      if (!benchmarkIds.includes(score.benchmark_id)) continue;

      if (!modelScores[score.model_id]) {
        modelScores[score.model_id] = {
          total: 0,
          count: 0,
          name: score.model_name,
          provider: score.provider,
          benchmarks: [],
        };
      }
      modelScores[score.model_id].total += score.score;
      modelScores[score.model_id].count += 1;
      modelScores[score.model_id].benchmarks.push({
        id: score.benchmark_id,
        score: score.score,
      });
    }

    return Object.entries(modelScores)
      .map(([id, data]) => ({
        model_id: id,
        model_name: data.name,
        provider: data.provider,
        avg_score: data.total / data.count,
        benchmarks: data.benchmarks,
      }))
      .sort((a, b) => b.avg_score - a.avg_score)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }

  // ============================================================================
  // Model Comparison
  // ============================================================================

  compareModels(modelIds: string[], benchmarkIds?: string[]): ModelComparison {
    const benchmarksToCompare =
      benchmarkIds || KEY_BENCHMARKS.map((b) => b.id);

    const comparison_matrix: Record<string, Record<string, number>> = {};
    const winner_by_benchmark: Record<string, string> = {};

    for (const benchmarkId of benchmarksToCompare) {
      comparison_matrix[benchmarkId] = {};
      let maxScore = -1;
      let winner = '';

      for (const modelId of modelIds) {
        const score = LATEST_MODEL_SCORES.find(
          (s) => s.model_id === modelId && s.benchmark_id === benchmarkId
        )?.score;

        if (score !== undefined) {
          comparison_matrix[benchmarkId][modelId] = score;
          if (score > maxScore) {
            maxScore = score;
            winner = modelId;
          }
        }
      }

      if (winner) {
        winner_by_benchmark[benchmarkId] = winner;
      }
    }

    // Calculate overall winner (most benchmark wins)
    const winCounts: Record<string, number> = {};
    for (const winner of Object.values(winner_by_benchmark)) {
      winCounts[winner] = (winCounts[winner] || 0) + 1;
    }
    const overall_winner =
      Object.entries(winCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

    // Calculate price-performance winner
    let bestPricePerformance = '';
    let bestRatio = 0;

    for (const modelId of modelIds) {
      const model = AI_MODELS.find((m) => m.id === modelId);
      if (!model) continue;

      const avgScore =
        Object.values(comparison_matrix)
          .map((bm) => bm[modelId] || 0)
          .reduce((a, b) => a + b, 0) / benchmarksToCompare.length;

      const avgPrice = (model.pricing.input + model.pricing.output) / 2;
      const ratio = avgScore / avgPrice;

      if (ratio > bestRatio) {
        bestRatio = ratio;
        bestPricePerformance = modelId;
      }
    }

    return {
      models: modelIds,
      benchmarks: benchmarksToCompare,
      comparison_matrix,
      winner_by_benchmark,
      overall_winner,
      price_performance_winner: bestPricePerformance,
    };
  }

  // ============================================================================
  // Recommendations
  // ============================================================================

  recommendModel(useCase: {
    task_type:
      | 'coding'
      | 'math'
      | 'reasoning'
      | 'writing'
      | 'multimodal'
      | 'general';
    priority: 'quality' | 'speed' | 'cost' | 'balanced';
    context_needs: 'small' | 'medium' | 'large' | 'massive';
    capabilities_needed?: string[];
  }): ModelRecommendation {
    let relevantBenchmarks: string[] = [];

    // Map task type to benchmarks
    switch (useCase.task_type) {
      case 'coding':
        relevantBenchmarks = ['swe-bench-verified', 'humaneval'];
        break;
      case 'math':
        relevantBenchmarks = ['aime-2025', 'math-500', 'gsm8k'];
        break;
      case 'reasoning':
        relevantBenchmarks = ['gpqa-diamond', 'arc-agi', 'mmlu-pro'];
        break;
      case 'multimodal':
        relevantBenchmarks = ['mmmu'];
        break;
      default:
        relevantBenchmarks = ['mmlu-pro', 'gpqa-diamond', 'swe-bench-verified'];
    }

    // Score each model
    const modelScores: {
      model: AIModel;
      score: number;
      reason: string;
    }[] = [];

    for (const model of AI_MODELS) {
      let score = 0;
      const reasons: string[] = [];

      // Benchmark performance
      for (const benchId of relevantBenchmarks) {
        const benchScore = LATEST_MODEL_SCORES.find(
          (s) => s.model_id === model.id && s.benchmark_id === benchId
        )?.score;
        if (benchScore) {
          score += benchScore;
          reasons.push(`${benchId}: ${benchScore}%`);
        }
      }

      // Context window needs
      if (useCase.context_needs === 'massive' && model.context_window >= 1000000) {
        score += 20;
        reasons.push('Massive context window');
      } else if (
        useCase.context_needs === 'large' &&
        model.context_window >= 200000
      ) {
        score += 10;
      }

      // Priority adjustments
      if (useCase.priority === 'cost') {
        const avgCost = (model.pricing.input + model.pricing.output) / 2;
        score -= avgCost * 5; // Penalize expensive models
        if (avgCost < 3) {
          reasons.push('Cost effective');
        }
      }

      // Capability requirements
      if (useCase.capabilities_needed) {
        for (const cap of useCase.capabilities_needed) {
          if ((model.capabilities as any)[cap]) {
            score += 5;
          } else {
            score -= 10;
          }
        }
      }

      modelScores.push({
        model,
        score,
        reason: reasons.join('; '),
      });
    }

    // Sort by score
    modelScores.sort((a, b) => b.score - a.score);

    const winner = modelScores[0];
    const alternatives = modelScores.slice(1, 4);

    // Estimate cost based on typical usage
    const tokensPer1k = useCase.context_needs === 'massive' ? 100000 : 10000;
    const estimatedCost = `$${(
      (winner.model.pricing.input * tokensPer1k) / 1000000 +
      (winner.model.pricing.output * (tokensPer1k / 4)) / 1000000
    ).toFixed(4)} per request`;

    return {
      use_case: useCase.task_type,
      recommended_model: winner.model.id,
      reasoning: winner.reason,
      alternatives: alternatives.map((a) => ({
        model: a.model.id,
        reason: a.reason,
      })),
      key_benchmarks: relevantBenchmarks,
      estimated_cost: estimatedCost,
    };
  }

  // ============================================================================
  // Use Case Templates
  // ============================================================================

  getUseCaseRecommendations(): {
    use_case: string;
    description: string;
    recommended_model: string;
    why: string;
    key_benchmark: string;
    alternatives: string[];
  }[] {
    return [
      {
        use_case: 'Complex Software Development',
        description: 'Building production applications, fixing bugs, code review',
        recommended_model: 'claude-opus-4-5',
        why: 'Highest SWE-bench score (75.2%), best at understanding large codebases',
        key_benchmark: 'swe-bench-verified',
        alternatives: ['gpt-5', 'o3'],
      },
      {
        use_case: 'Advanced Mathematics',
        description: 'Competition math, proofs, complex calculations',
        recommended_model: 'gpt-5',
        why: 'Perfect AIME 2025 score (100%), exceptional mathematical reasoning',
        key_benchmark: 'aime-2025',
        alternatives: ['o3', 'gemini-2.5-pro'],
      },
      {
        use_case: 'PhD-Level Science Questions',
        description: 'Graduate-level physics, chemistry, biology questions',
        recommended_model: 'o3',
        why: 'Highest GPQA Diamond score (87.7%), built for deep reasoning',
        key_benchmark: 'gpqa-diamond',
        alternatives: ['gpt-5', 'gemini-2.5-pro'],
      },
      {
        use_case: 'Long Document Analysis',
        description: 'Analyzing books, legal documents, research papers',
        recommended_model: 'gemini-2.5-pro',
        why: '2M context window, excellent at synthesizing long documents',
        key_benchmark: 'mmmu',
        alternatives: ['claude-opus-4-5', 'gpt-5'],
      },
      {
        use_case: 'Medical & Legal Professional',
        description: 'Medical diagnosis support, legal research',
        recommended_model: 'gemini-2.5-pro',
        why: 'Top MedQA (93%) and LegalBench (91.2%) scores',
        key_benchmark: 'medqa',
        alternatives: ['gpt-5', 'claude-opus-4-5'],
      },
      {
        use_case: 'Budget-Conscious Applications',
        description: 'High volume, cost-sensitive applications',
        recommended_model: 'deepseek-r1',
        why: 'Excellent performance at ~1/20th the cost of GPT-5',
        key_benchmark: 'math-500',
        alternatives: ['gemini-2.5-flash', 'o4-mini'],
      },
      {
        use_case: 'Real-time Voice/Video',
        description: 'Live conversations, video analysis, streaming',
        recommended_model: 'gemini-2.5-pro',
        why: 'Native multimodal with real-time streaming support',
        key_benchmark: 'mmmu',
        alternatives: ['gpt-5'],
      },
      {
        use_case: 'Abstract Reasoning & Novel Problems',
        description: 'Puzzles, novel problem solving, AGI-like tasks',
        recommended_model: 'o3',
        why: 'ARC-AGI score of 87.5%, best at novel reasoning',
        key_benchmark: 'arc-agi',
        alternatives: ['gpt-5', 'claude-opus-4-5'],
      },
    ];
  }

  // ============================================================================
  // Performance Trends
  // ============================================================================

  getPerformanceTrends(
    benchmarkId: string
  ): {
    date: string;
    top_score: number;
    top_model: string;
    gap_to_human: number;
  }[] {
    const benchmark = this.getBenchmark(benchmarkId);
    if (!benchmark) return [];

    // Simulated historical data - in production, fetch from database
    const humanBaseline = benchmark.human_baseline || 100;

    return [
      { date: '2023-01', top_score: 15, top_model: 'gpt-4', gap_to_human: humanBaseline - 15 },
      { date: '2023-06', top_score: 25, top_model: 'gpt-4', gap_to_human: humanBaseline - 25 },
      { date: '2024-01', top_score: 45, top_model: 'claude-3-opus', gap_to_human: humanBaseline - 45 },
      { date: '2024-06', top_score: 55, top_model: 'gpt-4o', gap_to_human: humanBaseline - 55 },
      { date: '2024-12', top_score: 71.7, top_model: 'o3', gap_to_human: humanBaseline - 71.7 },
      { date: '2025-01', top_score: 75.2, top_model: 'claude-opus-4-5', gap_to_human: humanBaseline - 75.2 },
    ];
  }
}

export default BenchmarkService;
