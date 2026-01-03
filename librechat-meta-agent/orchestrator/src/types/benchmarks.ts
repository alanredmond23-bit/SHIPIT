// AI Model Benchmark Types
// Real-time performance tracking across major benchmarks

// ============================================================================
// Benchmark Categories
// ============================================================================

export type BenchmarkCategory =
  | 'coding'         // SWE-bench, HumanEval, MBPP
  | 'math'           // AIME, Math500, GSM8K, MGSM
  | 'reasoning'      // GPQA, ARC-AGI, BBH
  | 'knowledge'      // MMLU, MMLU-Pro, TriviaQA
  | 'multimodal'     // MMMU, MathVista
  | 'safety'         // TruthfulQA, BBQ
  | 'legal'          // LegalBench, BarExam
  | 'medical'        // MedQA, PubMedQA
  | 'science'        // GPQA Diamond, SciQ
  | 'language'       // Translation, Summarization
  | 'agentic';       // SWE-Agent, WebArena

export type ModelProvider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'meta'
  | 'deepseek'
  | 'xai'
  | 'mistral'
  | 'cohere';

// ============================================================================
// Benchmark Definitions
// ============================================================================

export interface Benchmark {
  id: string;
  name: string;
  full_name: string;
  category: BenchmarkCategory;
  description: string;

  // Scoring
  metric: 'accuracy' | 'pass_rate' | 'elo' | 'score' | 'percentage';
  max_score: number;
  higher_is_better: boolean;

  // Difficulty
  difficulty: 'easy' | 'medium' | 'hard' | 'expert' | 'frontier';
  human_baseline?: number;
  expert_baseline?: number;

  // Meta
  paper_url?: string;
  dataset_url?: string;
  num_problems: number;
  last_updated: string;

  // Tags
  tags: string[];
}

export interface ModelScore {
  model_id: string;
  model_name: string;
  provider: ModelProvider;
  benchmark_id: string;
  score: number;
  rank?: number;
  percentile?: number;
  measured_at: string;
  source: string;
  source_url?: string;
  notes?: string;
}

// ============================================================================
// Model Profiles
// ============================================================================

export interface AIModel {
  id: string;
  name: string;
  provider: ModelProvider;
  model_family: string;
  version: string;

  // Capabilities
  capabilities: {
    text: boolean;
    vision: boolean;
    audio: boolean;
    video: boolean;
    code_execution: boolean;
    tool_use: boolean;
    extended_thinking: boolean;
    web_search: boolean;
  };

  // Specs
  context_window: number;
  max_output_tokens: number;
  training_cutoff: string;
  release_date: string;

  // Pricing (per million tokens)
  pricing: {
    input: number;
    output: number;
    cached_input?: number;
  };

  // Performance profile
  strengths: string[];
  weaknesses: string[];
  best_for: string[];

  // Latest scores
  benchmark_scores: Record<string, number>;
  overall_ranking?: number;
  category_rankings?: Record<BenchmarkCategory, number>;
}

// ============================================================================
// Key Benchmarks (2025)
// ============================================================================

export const KEY_BENCHMARKS: Benchmark[] = [
  // Coding
  {
    id: 'swe-bench-verified',
    name: 'SWE-bench Verified',
    full_name: 'Software Engineering Benchmark - Verified',
    category: 'coding',
    description: 'Tests ability to resolve real GitHub issues from popular repositories',
    metric: 'pass_rate',
    max_score: 100,
    higher_is_better: true,
    difficulty: 'expert',
    human_baseline: 100,
    num_problems: 500,
    last_updated: '2025-01',
    tags: ['coding', 'software-engineering', 'github'],
  },
  {
    id: 'humaneval',
    name: 'HumanEval',
    full_name: 'Human Evaluation of Code Generation',
    category: 'coding',
    description: 'Hand-crafted programming problems to evaluate code synthesis',
    metric: 'pass_rate',
    max_score: 100,
    higher_is_better: true,
    difficulty: 'medium',
    human_baseline: 100,
    num_problems: 164,
    last_updated: '2024-12',
    tags: ['coding', 'python'],
  },

  // Math
  {
    id: 'aime-2025',
    name: 'AIME 2025',
    full_name: 'American Invitational Mathematics Examination 2025',
    category: 'math',
    description: 'Prestigious high school math competition, second level of AMC',
    metric: 'accuracy',
    max_score: 100,
    higher_is_better: true,
    difficulty: 'expert',
    human_baseline: 50,
    expert_baseline: 80,
    num_problems: 30,
    last_updated: '2025-01',
    tags: ['math', 'competition', 'high-school'],
  },
  {
    id: 'math-500',
    name: 'Math 500',
    full_name: 'MATH 500 Benchmark',
    category: 'math',
    description: '500 challenging math problems across various domains',
    metric: 'accuracy',
    max_score: 100,
    higher_is_better: true,
    difficulty: 'hard',
    num_problems: 500,
    last_updated: '2025-01',
    tags: ['math', 'problem-solving'],
  },
  {
    id: 'gsm8k',
    name: 'GSM8K',
    full_name: 'Grade School Math 8K',
    category: 'math',
    description: 'Grade school math word problems',
    metric: 'accuracy',
    max_score: 100,
    higher_is_better: true,
    difficulty: 'easy',
    human_baseline: 95,
    num_problems: 8500,
    last_updated: '2024-12',
    tags: ['math', 'word-problems', 'elementary'],
  },
  {
    id: 'usamo',
    name: 'USAMO',
    full_name: 'USA Mathematical Olympiad',
    category: 'math',
    description: 'Most prestigious high school math competition in the US',
    metric: 'accuracy',
    max_score: 100,
    higher_is_better: true,
    difficulty: 'frontier',
    human_baseline: 30,
    expert_baseline: 60,
    num_problems: 6,
    last_updated: '2024-06',
    tags: ['math', 'olympiad', 'proof-based'],
  },

  // Reasoning
  {
    id: 'gpqa-diamond',
    name: 'GPQA Diamond',
    full_name: 'Graduate-Level Google-Proof Q&A - Diamond',
    category: 'reasoning',
    description: 'PhD-level science questions that experts struggle with',
    metric: 'accuracy',
    max_score: 100,
    higher_is_better: true,
    difficulty: 'frontier',
    human_baseline: 34,
    expert_baseline: 65,
    num_problems: 198,
    last_updated: '2025-01',
    tags: ['science', 'phd-level', 'reasoning'],
  },
  {
    id: 'arc-agi',
    name: 'ARC-AGI',
    full_name: 'Abstraction and Reasoning Corpus for AGI',
    category: 'reasoning',
    description: 'Abstract reasoning puzzles designed to be hard for AI',
    metric: 'accuracy',
    max_score: 100,
    higher_is_better: true,
    difficulty: 'frontier',
    human_baseline: 85,
    num_problems: 400,
    last_updated: '2024-12',
    tags: ['reasoning', 'abstraction', 'agi'],
  },
  {
    id: 'humanity-last-exam',
    name: 'Humanity\'s Last Exam',
    full_name: 'Humanity\'s Last Exam',
    category: 'reasoning',
    description: 'The ultimate test of AI capabilities across all domains',
    metric: 'accuracy',
    max_score: 100,
    higher_is_better: true,
    difficulty: 'frontier',
    human_baseline: 50,
    num_problems: 3000,
    last_updated: '2025-01',
    tags: ['comprehensive', 'frontier', 'agi'],
  },

  // Knowledge
  {
    id: 'mmlu-pro',
    name: 'MMLU Pro',
    full_name: 'Massive Multitask Language Understanding - Pro',
    category: 'knowledge',
    description: 'Enhanced version of MMLU with harder questions',
    metric: 'accuracy',
    max_score: 100,
    higher_is_better: true,
    difficulty: 'hard',
    human_baseline: 89,
    num_problems: 12000,
    last_updated: '2025-01',
    tags: ['knowledge', 'multitask'],
  },

  // Multimodal
  {
    id: 'mmmu',
    name: 'MMMU',
    full_name: 'Massive Multi-discipline Multimodal Understanding',
    category: 'multimodal',
    description: 'Expert-level multimodal understanding across 30 subjects',
    metric: 'accuracy',
    max_score: 100,
    higher_is_better: true,
    difficulty: 'hard',
    human_baseline: 88,
    num_problems: 11500,
    last_updated: '2025-01',
    tags: ['multimodal', 'vision', 'expert'],
  },

  // Legal
  {
    id: 'legalbench',
    name: 'LegalBench',
    full_name: 'Legal Reasoning Benchmark',
    category: 'legal',
    description: 'Legal reasoning tasks across multiple practice areas',
    metric: 'accuracy',
    max_score: 100,
    higher_is_better: true,
    difficulty: 'expert',
    human_baseline: 85,
    num_problems: 162,
    last_updated: '2024-12',
    tags: ['legal', 'reasoning', 'professional'],
  },
  {
    id: 'bar-exam',
    name: 'Bar Exam',
    full_name: 'US Bar Examination',
    category: 'legal',
    description: 'Simulated US Bar Examination questions',
    metric: 'accuracy',
    max_score: 100,
    higher_is_better: true,
    difficulty: 'expert',
    human_baseline: 68,
    expert_baseline: 75,
    num_problems: 200,
    last_updated: '2024-12',
    tags: ['legal', 'bar', 'professional'],
  },

  // Medical
  {
    id: 'medqa',
    name: 'MedQA',
    full_name: 'Medical Question Answering',
    category: 'medical',
    description: 'USMLE-style medical licensing exam questions',
    metric: 'accuracy',
    max_score: 100,
    higher_is_better: true,
    difficulty: 'expert',
    human_baseline: 60,
    expert_baseline: 87,
    num_problems: 1273,
    last_updated: '2024-12',
    tags: ['medical', 'usmle', 'professional'],
  },

  // Agentic
  {
    id: 'webarena',
    name: 'WebArena',
    full_name: 'Web Agent Arena',
    category: 'agentic',
    description: 'Tests ability to complete tasks on real websites',
    metric: 'pass_rate',
    max_score: 100,
    higher_is_better: true,
    difficulty: 'hard',
    human_baseline: 78,
    num_problems: 812,
    last_updated: '2024-12',
    tags: ['agentic', 'web', 'automation'],
  },
];

// ============================================================================
// Latest Model Scores (January 2025)
// ============================================================================

export const LATEST_MODEL_SCORES: ModelScore[] = [
  // GPT-5
  { model_id: 'gpt-5', model_name: 'GPT-5', provider: 'openai', benchmark_id: 'aime-2025', score: 100, rank: 1, measured_at: '2025-01', source: 'OpenAI' },
  { model_id: 'gpt-5', model_name: 'GPT-5', provider: 'openai', benchmark_id: 'swe-bench-verified', score: 72.8, rank: 2, measured_at: '2025-01', source: 'OpenAI' },
  { model_id: 'gpt-5', model_name: 'GPT-5', provider: 'openai', benchmark_id: 'gpqa-diamond', score: 78.3, rank: 2, measured_at: '2025-01', source: 'OpenAI' },

  // o3
  { model_id: 'o3', model_name: 'o3', provider: 'openai', benchmark_id: 'mmlu-pro', score: 92.3, rank: 1, measured_at: '2025-01', source: 'LM Council' },
  { model_id: 'o3', model_name: 'o3', provider: 'openai', benchmark_id: 'gpqa-diamond', score: 87.7, rank: 1, measured_at: '2025-01', source: 'LM Council' },
  { model_id: 'o3', model_name: 'o3', provider: 'openai', benchmark_id: 'arc-agi', score: 87.5, rank: 1, measured_at: '2024-12', source: 'ARC Prize' },
  { model_id: 'o3', model_name: 'o3', provider: 'openai', benchmark_id: 'swe-bench-verified', score: 71.7, rank: 3, measured_at: '2025-01', source: 'SWE-bench' },

  // o4-mini
  { model_id: 'o4-mini', model_name: 'o4 Mini', provider: 'openai', benchmark_id: 'math-500', score: 94.8, rank: 4, measured_at: '2025-01', source: 'LM Council' },
  { model_id: 'o4-mini', model_name: 'o4 Mini', provider: 'openai', benchmark_id: 'mmmu', score: 81.2, rank: 2, measured_at: '2025-01', source: 'LM Council' },

  // Claude Opus 4.5
  { model_id: 'claude-opus-4-5', model_name: 'Claude Opus 4.5', provider: 'anthropic', benchmark_id: 'swe-bench-verified', score: 75.2, rank: 1, measured_at: '2025-01', source: 'Anthropic' },
  { model_id: 'claude-opus-4-5', model_name: 'Claude Opus 4.5', provider: 'anthropic', benchmark_id: 'aime-2025', score: 93.3, rank: 3, measured_at: '2025-01', source: 'Anthropic' },
  { model_id: 'claude-opus-4-5', model_name: 'Claude Opus 4.5', provider: 'anthropic', benchmark_id: 'gpqa-diamond', score: 74.8, rank: 4, measured_at: '2025-01', source: 'Anthropic' },

  // Claude Sonnet 4
  { model_id: 'claude-sonnet-4', model_name: 'Claude Sonnet 4', provider: 'anthropic', benchmark_id: 'swe-bench-verified', score: 72.7, rank: 2, measured_at: '2025-01', source: 'Anthropic' },
  { model_id: 'claude-sonnet-4', model_name: 'Claude Sonnet 4', provider: 'anthropic', benchmark_id: 'aime-2025', score: 85.0, rank: 5, measured_at: '2025-01', source: 'Anthropic' },

  // Gemini 2.5 Pro
  { model_id: 'gemini-2.5-pro', model_name: 'Gemini 2.5 Pro', provider: 'google', benchmark_id: 'math-500', score: 95.2, rank: 1, measured_at: '2025-01', source: 'Google' },
  { model_id: 'gemini-2.5-pro', model_name: 'Gemini 2.5 Pro', provider: 'google', benchmark_id: 'medqa', score: 93.0, rank: 1, measured_at: '2025-01', source: 'Google' },
  { model_id: 'gemini-2.5-pro', model_name: 'Gemini 2.5 Pro', provider: 'google', benchmark_id: 'legalbench', score: 91.2, rank: 1, measured_at: '2025-01', source: 'Google' },
  { model_id: 'gemini-2.5-pro', model_name: 'Gemini 2.5 Pro', provider: 'google', benchmark_id: 'mmmu', score: 82.1, rank: 1, measured_at: '2025-01', source: 'Google' },

  // Gemini 2.5 Flash
  { model_id: 'gemini-2.5-flash', model_name: 'Gemini 2.5 Flash', provider: 'google', benchmark_id: 'math-500', score: 91.4, rank: 6, measured_at: '2025-01', source: 'Google' },

  // Grok 4
  { model_id: 'grok-4', model_name: 'Grok 4', provider: 'xai', benchmark_id: 'aime-2025', score: 96.7, rank: 2, measured_at: '2025-01', source: 'xAI' },
  { model_id: 'grok-4', model_name: 'Grok 4', provider: 'xai', benchmark_id: 'math-500', score: 94.2, rank: 2, measured_at: '2025-01', source: 'xAI' },

  // DeepSeek R1
  { model_id: 'deepseek-r1', model_name: 'DeepSeek R1', provider: 'deepseek', benchmark_id: 'math-500', score: 93.8, rank: 3, measured_at: '2025-01', source: 'DeepSeek' },
  { model_id: 'deepseek-r1', model_name: 'DeepSeek R1', provider: 'deepseek', benchmark_id: 'aime-2025', score: 91.2, rank: 4, measured_at: '2025-01', source: 'DeepSeek' },
  { model_id: 'deepseek-r1', model_name: 'DeepSeek R1', provider: 'deepseek', benchmark_id: 'swe-bench-verified', score: 49.2, rank: 8, measured_at: '2025-01', source: 'SWE-bench' },
];

// ============================================================================
// Model Profiles (2025)
// ============================================================================

export const AI_MODELS: AIModel[] = [
  {
    id: 'gpt-5',
    name: 'GPT-5',
    provider: 'openai',
    model_family: 'GPT',
    version: '5.0',
    capabilities: {
      text: true, vision: true, audio: true, video: true,
      code_execution: true, tool_use: true, extended_thinking: true, web_search: true,
    },
    context_window: 256000,
    max_output_tokens: 32768,
    training_cutoff: '2025-01',
    release_date: '2025-01',
    pricing: { input: 5.0, output: 15.0, cached_input: 2.5 },
    strengths: ['Multimodal', 'Reasoning', 'Code', 'Math', 'General knowledge'],
    weaknesses: ['Cost', 'Latency on complex tasks'],
    best_for: ['Complex reasoning', 'Research', 'Code generation', 'Analysis'],
    benchmark_scores: { 'aime-2025': 100, 'swe-bench-verified': 72.8, 'gpqa-diamond': 78.3 },
    overall_ranking: 1,
  },
  {
    id: 'o3',
    name: 'o3',
    provider: 'openai',
    model_family: 'o-series',
    version: '3.0',
    capabilities: {
      text: true, vision: true, audio: false, video: false,
      code_execution: true, tool_use: true, extended_thinking: true, web_search: true,
    },
    context_window: 200000,
    max_output_tokens: 100000,
    training_cutoff: '2024-12',
    release_date: '2024-12',
    pricing: { input: 10.0, output: 40.0 },
    strengths: ['Deep reasoning', 'Math', 'Science', 'Complex problem solving'],
    weaknesses: ['High cost', 'Slow on simple tasks', 'No audio/video'],
    best_for: ['PhD-level problems', 'Mathematical proofs', 'Complex coding'],
    benchmark_scores: { 'gpqa-diamond': 87.7, 'arc-agi': 87.5, 'mmlu-pro': 92.3 },
    overall_ranking: 2,
  },
  {
    id: 'claude-opus-4-5',
    name: 'Claude Opus 4.5',
    provider: 'anthropic',
    model_family: 'Claude',
    version: '4.5',
    capabilities: {
      text: true, vision: true, audio: false, video: false,
      code_execution: true, tool_use: true, extended_thinking: true, web_search: false,
    },
    context_window: 200000,
    max_output_tokens: 32768,
    training_cutoff: '2025-01',
    release_date: '2025-02',
    pricing: { input: 15.0, output: 75.0, cached_input: 1.875 },
    strengths: ['Coding', 'Writing', 'Analysis', 'Extended thinking', 'Instruction following'],
    weaknesses: ['No web search', 'No audio', 'Higher cost'],
    best_for: ['Software development', 'Complex analysis', 'Long documents'],
    benchmark_scores: { 'swe-bench-verified': 75.2, 'aime-2025': 93.3, 'gpqa-diamond': 74.8 },
    overall_ranking: 3,
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    model_family: 'Gemini',
    version: '2.5',
    capabilities: {
      text: true, vision: true, audio: true, video: true,
      code_execution: true, tool_use: true, extended_thinking: true, web_search: true,
    },
    context_window: 2000000,
    max_output_tokens: 65536,
    training_cutoff: '2025-01',
    release_date: '2025-01',
    pricing: { input: 1.25, output: 5.0, cached_input: 0.3125 },
    strengths: ['Massive context', 'Multimodal', 'Cost effective', 'Real-time'],
    weaknesses: ['Less consistent', 'Weaker on some reasoning tasks'],
    best_for: ['Long documents', 'Video analysis', 'Real-time applications'],
    benchmark_scores: { 'math-500': 95.2, 'medqa': 93.0, 'legalbench': 91.2, 'mmmu': 82.1 },
    overall_ranking: 4,
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    provider: 'deepseek',
    model_family: 'R-series',
    version: '1.0',
    capabilities: {
      text: true, vision: false, audio: false, video: false,
      code_execution: true, tool_use: true, extended_thinking: true, web_search: false,
    },
    context_window: 64000,
    max_output_tokens: 8192,
    training_cutoff: '2024-12',
    release_date: '2025-01',
    pricing: { input: 0.55, output: 2.19 },
    strengths: ['Cost effective', 'Math', 'Reasoning', 'Open weights'],
    weaknesses: ['No multimodal', 'Smaller context', 'Less polished'],
    best_for: ['Budget-conscious', 'Math problems', 'Self-hosting'],
    benchmark_scores: { 'math-500': 93.8, 'aime-2025': 91.2, 'swe-bench-verified': 49.2 },
    overall_ranking: 6,
  },
];

// ============================================================================
// Comparison and Recommendation Types
// ============================================================================

export interface ModelComparison {
  models: string[];
  benchmarks: string[];
  comparison_matrix: Record<string, Record<string, number>>;
  winner_by_benchmark: Record<string, string>;
  overall_winner: string;
  price_performance_winner: string;
}

export interface ModelRecommendation {
  use_case: string;
  recommended_model: string;
  reasoning: string;
  alternatives: {
    model: string;
    reason: string;
  }[];
  key_benchmarks: string[];
  estimated_cost: string;
}

export interface BenchmarkLeaderboard {
  benchmark_id: string;
  benchmark_name: string;
  category: BenchmarkCategory;
  entries: {
    rank: number;
    model_id: string;
    model_name: string;
    provider: ModelProvider;
    score: number;
    delta_from_top?: number;
    measured_at: string;
  }[];
  last_updated: string;
}
