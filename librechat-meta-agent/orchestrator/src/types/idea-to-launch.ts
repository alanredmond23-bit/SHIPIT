// Idea-to-Launch Framework Types
// Structured project workflow from ideation to deployment

// ============================================================================
// Core Enums and Types
// ============================================================================

export type ProjectPhase =
  | 'discovery'      // Problem identification, needs analysis
  | 'ideation'       // Brainstorming, solution exploration
  | 'specification'  // Technical spec, architecture decisions
  | 'planning'       // Task breakdown, timeline, resources
  | 'implementation' // Building, coding, creating
  | 'launch';        // Deployment, go-live, handoff

export type PhaseStatus = 'locked' | 'active' | 'completed' | 'skipped';
export type GateDecision = 'approved' | 'rejected' | 'needs_revision' | 'pending';
export type ProjectType = 'product' | 'marketing' | 'lead_gen' | 'workflow' | 'bot' | 'integration' | 'custom';

// ============================================================================
// Project Template
// ============================================================================

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  project_type: ProjectType;
  icon: string;
  color: string;
  // Phase configurations
  phases: PhaseTemplate[];
  // Default settings
  default_platform?: string;
  suggested_stack?: string[];
  estimated_duration?: string;
  // Metadata
  is_featured: boolean;
  use_count: number;
  created_at: string;
}

export interface PhaseTemplate {
  phase: ProjectPhase;
  name: string;
  description: string;
  // Required inputs for this phase
  required_inputs: PhaseInput[];
  // Expected outputs/artifacts
  expected_outputs: PhaseOutput[];
  // AI prompts for this phase
  ai_prompts: AIPrompt[];
  // Gate criteria to pass
  gate_criteria: GateCriterion[];
  // Estimated time
  estimated_minutes?: number;
}

export interface PhaseInput {
  id: string;
  name: string;
  description: string;
  input_type: 'text' | 'textarea' | 'select' | 'multi_select' | 'checklist' | 'file';
  options?: string[];
  required: boolean;
  placeholder?: string;
  ai_assisted: boolean; // Can AI help fill this?
}

export interface PhaseOutput {
  id: string;
  name: string;
  description: string;
  output_type: 'document' | 'diagram' | 'checklist' | 'code' | 'config' | 'artifact';
  format: 'markdown' | 'json' | 'yaml' | 'mermaid' | 'typescript' | 'sql';
  template?: string; // Template content for this output
}

export interface AIPrompt {
  id: string;
  name: string;
  description: string;
  prompt_template: string;
  input_variables: string[];
  output_format: 'text' | 'json' | 'markdown' | 'code';
  model_preference?: string;
  use_extended_thinking?: boolean;
}

export interface GateCriterion {
  id: string;
  name: string;
  description: string;
  criterion_type: 'checklist' | 'approval' | 'metric' | 'artifact_exists';
  required: boolean;
  auto_check?: boolean; // Can be automatically verified
}

// ============================================================================
// Project Instance
// ============================================================================

export interface IdeaToLaunchProject {
  id: string;
  user_id?: string;
  template_id: string;
  name: string;
  description?: string;
  project_type: ProjectType;
  // Current state
  current_phase: ProjectPhase;
  overall_status: 'active' | 'paused' | 'completed' | 'archived';
  // Phase data
  phases: ProjectPhaseData[];
  // Context and decisions
  context: ProjectContext;
  decisions: ProjectDecision[];
  // Metadata
  started_at: string;
  completed_at?: string;
  last_activity_at: string;
}

export interface ProjectPhaseData {
  phase: ProjectPhase;
  status: PhaseStatus;
  // User inputs for this phase
  inputs: Record<string, any>;
  // Generated outputs/artifacts
  outputs: PhaseArtifact[];
  // AI conversations within this phase
  conversations: PhaseConversation[];
  // Gate status
  gate_status: GateDecision;
  gate_notes?: string;
  // Timing
  started_at?: string;
  completed_at?: string;
  time_spent_minutes: number;
}

export interface PhaseArtifact {
  id: string;
  output_id: string; // Reference to PhaseOutput
  name: string;
  content: string;
  format: string;
  version: number;
  // Generation metadata
  generated_by: 'user' | 'ai' | 'hybrid';
  ai_model?: string;
  // History
  revisions: ArtifactRevision[];
  created_at: string;
  updated_at: string;
}

export interface ArtifactRevision {
  version: number;
  content: string;
  change_summary?: string;
  revised_by: 'user' | 'ai';
  created_at: string;
}

export interface PhaseConversation {
  id: string;
  prompt_id?: string; // Reference to AIPrompt if used
  topic: string;
  messages: ConversationMessage[];
  outcome?: string;
  created_at: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinking?: string; // Extended thinking content
  created_at: string;
}

// ============================================================================
// Project Context and Decisions
// ============================================================================

export interface ProjectContext {
  // Problem/Opportunity
  problem_statement?: string;
  target_audience?: string;
  success_metrics?: string[];
  // Technical choices
  platform?: string;
  tech_stack?: string[];
  integrations?: string[];
  // Business context
  budget?: string;
  timeline?: string;
  stakeholders?: string[];
  // Constraints
  constraints?: string[];
  assumptions?: string[];
  risks?: string[];
}

export interface ProjectDecision {
  id: string;
  phase: ProjectPhase;
  decision_type: 'technical' | 'business' | 'design' | 'scope' | 'timeline';
  question: string;
  options: DecisionOption[];
  selected_option?: string;
  rationale?: string;
  decided_at?: string;
  decided_by?: 'user' | 'ai_suggested';
}

export interface DecisionOption {
  id: string;
  name: string;
  description: string;
  pros?: string[];
  cons?: string[];
  effort?: 'low' | 'medium' | 'high';
  risk?: 'low' | 'medium' | 'high';
}

// ============================================================================
// Discovery Phase Specifics
// ============================================================================

export interface DiscoveryInputs {
  initial_idea: string;
  problem_description?: string;
  target_users?: string;
  existing_solutions?: string;
  unique_value?: string;
  constraints?: string[];
}

export interface DiscoveryOutputs {
  problem_statement: string;
  opportunity_tree?: OpportunityTree;
  user_personas?: UserPersona[];
  competitive_analysis?: CompetitiveAnalysis;
}

export interface OpportunityTree {
  outcome: string;
  opportunities: Opportunity[];
}

export interface Opportunity {
  id: string;
  description: string;
  potential_solutions: string[];
  experiments?: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface UserPersona {
  name: string;
  role: string;
  goals: string[];
  pain_points: string[];
  behaviors: string[];
}

export interface CompetitiveAnalysis {
  competitors: Competitor[];
  differentiators: string[];
  gaps: string[];
}

export interface Competitor {
  name: string;
  strengths: string[];
  weaknesses: string[];
  pricing?: string;
}

// ============================================================================
// Specification Phase Specifics
// ============================================================================

export interface SpecificationInputs {
  selected_solution: string;
  technical_requirements?: string[];
  non_functional_requirements?: string[];
  integration_requirements?: string[];
}

export interface SpecificationOutputs {
  spec_document: string; // Full spec.md content
  architecture_diagram?: string; // Mermaid diagram
  api_spec?: string; // OpenAPI or similar
  data_model?: string; // Entity definitions
  tech_stack_decision: TechStackDecision;
}

export interface TechStackDecision {
  frontend?: string;
  backend?: string;
  database?: string;
  hosting?: string;
  services?: string[];
  rationale: string;
}

// ============================================================================
// Planning Phase Specifics
// ============================================================================

export interface PlanningInputs {
  approved_spec: boolean;
  team_size?: number;
  timeline_constraint?: string;
}

export interface PlanningOutputs {
  plan_document: string; // Full plan.md content
  task_breakdown: TaskBreakdown[];
  milestones: Milestone[];
  resource_allocation?: ResourceAllocation;
}

export interface TaskBreakdown {
  id: string;
  title: string;
  description: string;
  phase: string;
  estimated_hours: number;
  dependencies: string[];
  assignee?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  target_date?: string;
  deliverables: string[];
  success_criteria: string[];
}

export interface ResourceAllocation {
  roles: RoleAllocation[];
  tools: string[];
  budget_breakdown?: Record<string, number>;
}

export interface RoleAllocation {
  role: string;
  responsibilities: string[];
  time_commitment: string;
}

// ============================================================================
// Implementation Phase Specifics
// ============================================================================

export interface ImplementationInputs {
  approved_plan: boolean;
  repository_url?: string;
  environment_setup?: boolean;
}

export interface ImplementationOutputs {
  code_artifacts: CodeArtifact[];
  deployment_config?: string;
  documentation?: string;
  test_results?: TestResults;
}

export interface CodeArtifact {
  file_path: string;
  content: string;
  language: string;
  purpose: string;
  generated_at: string;
}

export interface TestResults {
  total: number;
  passed: number;
  failed: number;
  coverage?: number;
  report_url?: string;
}

// ============================================================================
// Launch Phase Specifics
// ============================================================================

export interface LaunchInputs {
  implementation_complete: boolean;
  tests_passing: boolean;
  documentation_ready: boolean;
}

export interface LaunchOutputs {
  deployment_url?: string;
  launch_checklist: LaunchChecklistItem[];
  post_launch_monitoring?: string;
  handoff_document?: string;
}

export interface LaunchChecklistItem {
  id: string;
  category: 'technical' | 'marketing' | 'legal' | 'operations';
  item: string;
  completed: boolean;
  notes?: string;
}

// ============================================================================
// API Requests/Responses
// ============================================================================

export interface CreateProjectRequest {
  template_id: string;
  name: string;
  description?: string;
  initial_context?: Partial<ProjectContext>;
}

export interface UpdatePhaseRequest {
  project_id: string;
  phase: ProjectPhase;
  inputs?: Record<string, any>;
  outputs?: PhaseArtifact[];
}

export interface AdvancePhaseRequest {
  project_id: string;
  gate_decision: GateDecision;
  gate_notes?: string;
}

export interface GenerateArtifactRequest {
  project_id: string;
  phase: ProjectPhase;
  output_id: string;
  prompt_id?: string;
  additional_context?: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  project_type: ProjectType;
  current_phase: ProjectPhase;
  overall_status: string;
  progress_percentage: number;
  phases_completed: number;
  total_phases: number;
  last_activity_at: string;
}
