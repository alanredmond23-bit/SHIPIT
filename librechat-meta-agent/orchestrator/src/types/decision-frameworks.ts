// Decision Framework Types
// World-class decision-making frameworks from Fortune 100 leaders and MBB consultancies

// ============================================================================
// Core Framework Types
// ============================================================================

export type FrameworkCategory =
  | 'strategic'      // High-level strategic decisions
  | 'operational'    // Day-to-day operational decisions
  | 'investment'     // Resource allocation and investment
  | 'innovation'     // Product and technology decisions
  | 'risk'           // Risk assessment and mitigation
  | 'people';        // Hiring, team, and organizational decisions

export type FrameworkSource =
  | 'bezos'          // Jeff Bezos / Amazon
  | 'munger'         // Charlie Munger / Berkshire
  | 'dalio'          // Ray Dalio / Bridgewater
  | 'mckinsey'       // McKinsey & Company
  | 'bcg'            // Boston Consulting Group
  | 'bain'           // Bain & Company
  | 'musk'           // Elon Musk / Tesla / SpaceX
  | 'grove'          // Andy Grove / Intel
  | 'drucker'        // Peter Drucker
  | 'academic';      // Academic research-backed

export type DecisionComplexity = 'simple' | 'moderate' | 'complex' | 'critical';
export type TimeHorizon = 'immediate' | 'short_term' | 'medium_term' | 'long_term' | 'generational';
export type Reversibility = 'easily_reversible' | 'reversible' | 'difficult_to_reverse' | 'irreversible';

// ============================================================================
// Decision Framework
// ============================================================================

export interface DecisionFramework {
  id: string;
  name: string;
  description: string;
  source: FrameworkSource;
  category: FrameworkCategory;

  // When to use this framework
  best_for: string[];
  complexity_level: DecisionComplexity;
  time_horizon: TimeHorizon;

  // Framework structure
  steps: FrameworkStep[];
  questions: FrameworkQuestion[];
  criteria: EvaluationCriterion[];

  // Visual representation
  matrix?: MatrixFramework;
  tree?: DecisionTree;

  // Meta
  origin_story?: string;
  famous_examples?: string[];
  resources?: Resource[];

  // Effectiveness
  success_rate?: number;
  adoption_by_fortune_500?: number;
}

export interface FrameworkStep {
  order: number;
  name: string;
  description: string;
  duration_estimate?: string;
  outputs: string[];
  tools?: string[];
}

export interface FrameworkQuestion {
  id: string;
  question: string;
  category: string;
  importance: 'critical' | 'important' | 'helpful';
  answer_type: 'yes_no' | 'scale' | 'text' | 'multiple_choice';
  options?: string[];
  follow_up?: FrameworkQuestion[];
}

export interface EvaluationCriterion {
  id: string;
  name: string;
  description: string;
  weight: number; // 0-100
  scoring_guide: {
    score: number;
    description: string;
  }[];
}

export interface MatrixFramework {
  x_axis: {
    name: string;
    low_label: string;
    high_label: string;
  };
  y_axis: {
    name: string;
    low_label: string;
    high_label: string;
  };
  quadrants: {
    position: 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right';
    name: string;
    recommendation: string;
    color: string;
  }[];
}

export interface DecisionTree {
  root: DecisionNode;
}

export interface DecisionNode {
  id: string;
  question?: string;
  recommendation?: string;
  yes?: DecisionNode;
  no?: DecisionNode;
  options?: {
    label: string;
    next: DecisionNode;
  }[];
}

export interface Resource {
  type: 'book' | 'article' | 'video' | 'course' | 'tool';
  title: string;
  author?: string;
  url?: string;
}

// ============================================================================
// Bezos Frameworks
// ============================================================================

export interface RegretMinimizationResult {
  decision: string;
  will_regret_not_doing: boolean;
  regret_score: number; // 1-10
  time_horizon_years: number;
  conclusion: 'do_it' | 'dont_do_it' | 'need_more_info';
}

export interface Type1Type2Analysis {
  decision: string;
  is_reversible: boolean;
  reversal_cost: 'none' | 'low' | 'medium' | 'high' | 'extreme';
  decision_type: 'type_1' | 'type_2';
  recommended_process: string;
  decision_speed: 'immediate' | 'within_hours' | 'within_days' | 'take_time';
}

// ============================================================================
// Munger Frameworks
// ============================================================================

export interface MentalModel {
  id: string;
  name: string;
  domain: string;
  description: string;
  application: string;
  example: string;
}

export interface InversionAnalysis {
  goal: string;
  inverted_question: string; // "How could this fail?"
  failure_modes: string[];
  avoidance_strategies: string[];
}

export interface ChecklistItem {
  id: string;
  category: string;
  item: string;
  rationale: string;
  checked: boolean;
}

export interface BiasCheck {
  bias_name: string;
  description: string;
  warning_signs: string[];
  mitigation: string;
  detected: boolean;
  notes?: string;
}

// ============================================================================
// Dalio Frameworks
// ============================================================================

export interface PrincipledDecision {
  situation: string;
  applicable_principles: string[];
  believability_weighted_input: BelievabilityInput[];
  synthesized_decision: string;
  confidence_level: number;
}

export interface BelievabilityInput {
  person: string;
  expertise_areas: string[];
  believability_score: number; // 0-100
  opinion: string;
  reasoning: string;
}

export interface RadicalTransparencyLog {
  decision: string;
  participants: string[];
  dissenting_opinions: string[];
  final_decision: string;
  decision_owner: string;
  timestamp: string;
}

// ============================================================================
// MBB Frameworks
// ============================================================================

export interface MECEBreakdown {
  problem: string;
  categories: {
    name: string;
    items: string[];
    is_mutually_exclusive: boolean;
  }[];
  is_collectively_exhaustive: boolean;
  gaps_identified: string[];
}

export interface BCGMatrixPosition {
  product_or_unit: string;
  market_share: 'low' | 'high';
  market_growth: 'low' | 'high';
  quadrant: 'star' | 'cash_cow' | 'question_mark' | 'dog';
  recommendation: string;
}

export interface McKinsey7S {
  strategy: string;
  structure: string;
  systems: string;
  shared_values: string;
  skills: string;
  staff: string;
  style: string;
  alignment_score: number;
  gaps: string[];
}

export interface PorterFiveForces {
  industry: string;
  competitive_rivalry: { score: number; factors: string[] };
  supplier_power: { score: number; factors: string[] };
  buyer_power: { score: number; factors: string[] };
  threat_of_substitution: { score: number; factors: string[] };
  threat_of_new_entry: { score: number; factors: string[] };
  overall_attractiveness: number;
  strategic_implications: string[];
}

// ============================================================================
// Decision Session
// ============================================================================

export interface DecisionSession {
  id: string;
  user_id?: string;
  project_id?: string;

  // The decision being made
  decision_title: string;
  decision_description: string;
  context: string;

  // Framework selection
  selected_frameworks: string[];
  framework_results: Record<string, any>;

  // Analysis
  options: DecisionOption[];
  criteria_scores: Record<string, Record<string, number>>;
  weighted_scores: Record<string, number>;

  // Biases and blindspots
  bias_checks: BiasCheck[];
  devil_advocate_arguments: string[];

  // Outcome
  recommended_option?: string;
  final_decision?: string;
  decision_rationale?: string;
  confidence_level?: number;

  // Follow-up
  success_metrics: string[];
  review_date?: string;
  actual_outcome?: string;
  lessons_learned?: string;

  created_at: string;
  updated_at: string;
}

export interface DecisionOption {
  id: string;
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  risks: string[];
  resources_required: string[];
  time_to_implement: string;
  reversibility: Reversibility;
  estimated_success_probability?: number;
}

// ============================================================================
// Framework Templates for Idea-to-Launch
// ============================================================================

export interface IdeaToLaunchDecisionPoint {
  phase: string;
  decision_point: string;
  recommended_frameworks: string[];
  key_questions: string[];
  common_pitfalls: string[];
  success_criteria: string[];
}

export const IDEA_TO_LAUNCH_DECISION_POINTS: IdeaToLaunchDecisionPoint[] = [
  {
    phase: 'discovery',
    decision_point: 'Should we pursue this problem?',
    recommended_frameworks: ['regret_minimization', 'inversion', 'porter_five_forces'],
    key_questions: [
      'Is this a problem worth solving?',
      'Is the market large enough?',
      'Do we have unique insight?',
    ],
    common_pitfalls: ['Confirmation bias', 'Solution-first thinking', 'Overconfidence'],
    success_criteria: ['Clear problem statement', 'Validated market need', 'Differentiated approach'],
  },
  {
    phase: 'ideation',
    decision_point: 'Which solution approach should we take?',
    recommended_frameworks: ['type1_type2', 'bcg_matrix', 'mece'],
    key_questions: [
      'What are all possible solutions?',
      'Which is most feasible?',
      'What are the trade-offs?',
    ],
    common_pitfalls: ['Premature optimization', 'Analysis paralysis', 'Not enough options'],
    success_criteria: ['Multiple options evaluated', 'Clear winner identified', 'Trade-offs understood'],
  },
  {
    phase: 'specification',
    decision_point: 'What should we build?',
    recommended_frameworks: ['mckinsey_7s', 'checklist', 'believability_weighted'],
    key_questions: [
      'What are the must-have features?',
      'What is the right architecture?',
      'What are the technical risks?',
    ],
    common_pitfalls: ['Scope creep', 'Over-engineering', 'Ignoring constraints'],
    success_criteria: ['Clear spec document', 'Tech stack decided', 'MVP defined'],
  },
  {
    phase: 'planning',
    decision_point: 'How should we build it?',
    recommended_frameworks: ['mece', 'principles', 'inversion'],
    key_questions: [
      'What are all the tasks?',
      'What could go wrong?',
      'What are the dependencies?',
    ],
    common_pitfalls: ['Underestimating complexity', 'Missing dependencies', 'No buffer'],
    success_criteria: ['Complete task breakdown', 'Realistic timeline', 'Risk mitigations'],
  },
  {
    phase: 'implementation',
    decision_point: 'Are we on track?',
    recommended_frameworks: ['type1_type2', 'feedback_loops', 'checklist'],
    key_questions: [
      'Are we hitting milestones?',
      'What blockers exist?',
      'Should we pivot?',
    ],
    common_pitfalls: ['Sunk cost fallacy', 'Ignoring signals', 'Perfectionism'],
    success_criteria: ['Tests passing', 'Quality metrics met', 'On schedule'],
  },
  {
    phase: 'launch',
    decision_point: 'Are we ready to launch?',
    recommended_frameworks: ['checklist', 'inversion', 'regret_minimization'],
    key_questions: [
      'Have we tested thoroughly?',
      'What could go wrong on launch day?',
      'Do we have rollback plan?',
    ],
    common_pitfalls: ['Launching too early', 'Launching too late', 'No monitoring'],
    success_criteria: ['All checks passed', 'Team ready', 'Monitoring in place'],
  },
];
