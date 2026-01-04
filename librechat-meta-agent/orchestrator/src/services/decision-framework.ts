// Decision Framework Service
// World-class decision-making frameworks from Fortune 100 leaders

import {
  DecisionFramework,
  FrameworkSource,
  FrameworkCategory,
  DecisionSession,
  DecisionOption,
  RegretMinimizationResult,
  Type1Type2Analysis,
  InversionAnalysis,
  BiasCheck,
  MECEBreakdown,
  BCGMatrixPosition,
  McKinsey7S,
  PorterFiveForces,
  MentalModel,
  ChecklistItem,
  IDEA_TO_LAUNCH_DECISION_POINTS,
} from '../types/decision-frameworks';

// ============================================================================
// Pre-built Frameworks from Thought Leaders
// ============================================================================

export const DECISION_FRAMEWORKS: DecisionFramework[] = [
  // Jeff Bezos Frameworks
  {
    id: 'regret_minimization',
    name: 'Regret Minimization Framework',
    description: 'Project yourself to age 80 and ask: will I regret not doing this?',
    source: 'bezos',
    category: 'strategic',
    best_for: ['Major life decisions', 'Career changes', 'Big bets', 'Irreversible choices'],
    complexity_level: 'complex',
    time_horizon: 'long_term',
    steps: [
      { order: 1, name: 'Define the decision', description: 'Clearly state what you\'re deciding', duration_estimate: '5 min', outputs: ['Decision statement'] },
      { order: 2, name: 'Project to age 80', description: 'Imagine yourself at 80 looking back', duration_estimate: '10 min', outputs: ['Future perspective'] },
      { order: 3, name: 'Assess regret of inaction', description: 'Will you regret NOT doing this?', duration_estimate: '10 min', outputs: ['Regret assessment'] },
      { order: 4, name: 'Assess regret of action', description: 'Will you regret doing this if it fails?', duration_estimate: '10 min', outputs: ['Failure regret assessment'] },
      { order: 5, name: 'Compare and decide', description: 'Which regret is worse?', duration_estimate: '5 min', outputs: ['Final decision'] },
    ],
    questions: [
      { id: 'q1', question: 'In 10 years, will I regret not trying this?', category: 'regret', importance: 'critical', answer_type: 'scale' },
      { id: 'q2', question: 'Is this a once-in-a-lifetime opportunity?', category: 'opportunity', importance: 'important', answer_type: 'yes_no' },
      { id: 'q3', question: 'Can I live with failure?', category: 'risk', importance: 'critical', answer_type: 'yes_no' },
    ],
    criteria: [
      { id: 'c1', name: 'Regret of Inaction', description: 'How much will you regret not doing this?', weight: 40, scoring_guide: [{ score: 1, description: 'No regret' }, { score: 5, description: 'Moderate regret' }, { score: 10, description: 'Devastating regret' }] },
      { id: 'c2', name: 'Regret of Action', description: 'How much will you regret doing this if it fails?', weight: 30, scoring_guide: [{ score: 1, description: 'No regret' }, { score: 5, description: 'Moderate regret' }, { score: 10, description: 'Devastating regret' }] },
      { id: 'c3', name: 'Reversibility', description: 'Can you undo this decision?', weight: 30, scoring_guide: [{ score: 1, description: 'Easily reversible' }, { score: 5, description: 'Difficult' }, { score: 10, description: 'Irreversible' }] },
    ],
    origin_story: 'Bezos used this framework when deciding to leave his hedge fund job to start Amazon in 1994.',
    famous_examples: ['Bezos leaving D.E. Shaw to start Amazon', 'Quitting a stable job for a startup'],
    resources: [
      { type: 'video', title: 'Bezos explains Regret Minimization', url: 'https://www.youtube.com/watch?v=jwG_qR6XmDQ' },
    ],
  },
  {
    id: 'type1_type2',
    name: 'Type 1 vs Type 2 Decisions',
    description: 'Distinguish between irreversible (Type 1) and reversible (Type 2) decisions',
    source: 'bezos',
    category: 'operational',
    best_for: ['Day-to-day decisions', 'Process optimization', 'Delegation', 'Speed vs. caution'],
    complexity_level: 'simple',
    time_horizon: 'immediate',
    steps: [
      { order: 1, name: 'Identify the decision', description: 'What decision needs to be made?', duration_estimate: '2 min', outputs: ['Decision statement'] },
      { order: 2, name: 'Assess reversibility', description: 'Can this be undone? At what cost?', duration_estimate: '5 min', outputs: ['Reversibility assessment'] },
      { order: 3, name: 'Classify the decision', description: 'Is it Type 1 (irreversible) or Type 2 (reversible)?', duration_estimate: '2 min', outputs: ['Decision type'] },
      { order: 4, name: 'Choose process', description: 'Type 1: deliberate. Type 2: move fast.', duration_estimate: '1 min', outputs: ['Decision process'] },
    ],
    questions: [
      { id: 'q1', question: 'Can this decision be easily reversed?', category: 'reversibility', importance: 'critical', answer_type: 'yes_no' },
      { id: 'q2', question: 'What is the cost of reversing this decision?', category: 'cost', importance: 'important', answer_type: 'scale' },
      { id: 'q3', question: 'How long would it take to undo?', category: 'time', importance: 'helpful', answer_type: 'text' },
    ],
    criteria: [],
    tree: {
      root: {
        id: 'start',
        question: 'Can this decision be easily reversed?',
        yes: {
          id: 'type2',
          recommendation: 'TYPE 2: Move fast. Decide quickly with high-judgment individuals or small groups.',
        },
        no: {
          id: 'cost_check',
          question: 'Would reversing be extremely costly (>50% of original investment)?',
          yes: {
            id: 'type1',
            recommendation: 'TYPE 1: Deliberate carefully. Use full analysis, get input from many stakeholders.',
          },
          no: {
            id: 'type2_cautious',
            recommendation: 'TYPE 2 (with caution): Move reasonably fast but document your reasoning.',
          },
        },
      },
    },
    origin_story: 'Bezos introduced this in his 2015 shareholder letter to explain Amazon\'s decision-making speed.',
  },

  // Charlie Munger Frameworks
  {
    id: 'inversion',
    name: 'Inversion',
    description: 'Instead of asking how to succeed, ask how you could fail, then avoid that',
    source: 'munger',
    category: 'risk',
    best_for: ['Risk assessment', 'Problem solving', 'Avoiding mistakes', 'Strategy'],
    complexity_level: 'moderate',
    time_horizon: 'medium_term',
    steps: [
      { order: 1, name: 'Define success', description: 'What does success look like?', duration_estimate: '5 min', outputs: ['Success definition'] },
      { order: 2, name: 'Invert the question', description: 'Ask: How could this fail spectacularly?', duration_estimate: '10 min', outputs: ['Failure scenarios'] },
      { order: 3, name: 'List failure modes', description: 'Enumerate all ways to fail', duration_estimate: '15 min', outputs: ['Failure mode list'] },
      { order: 4, name: 'Create avoidance strategies', description: 'For each failure mode, how do you prevent it?', duration_estimate: '15 min', outputs: ['Prevention strategies'] },
      { order: 5, name: 'Build guardrails', description: 'Implement safeguards against top risks', duration_estimate: '10 min', outputs: ['Guardrails list'] },
    ],
    questions: [
      { id: 'q1', question: 'What would guarantee failure?', category: 'failure', importance: 'critical', answer_type: 'text' },
      { id: 'q2', question: 'What assumptions, if wrong, would doom this?', category: 'assumptions', importance: 'critical', answer_type: 'text' },
      { id: 'q3', question: 'What has caused similar projects to fail?', category: 'history', importance: 'important', answer_type: 'text' },
    ],
    criteria: [],
    origin_story: 'Munger borrowed this from mathematician Carl Jacobi who said "Invert, always invert."',
    famous_examples: ['Berkshire avoiding bad investments', 'Medical "first, do no harm"'],
  },
  {
    id: 'mental_models',
    name: 'Mental Models Lattice',
    description: 'Apply multiple mental models from different disciplines to see the full picture',
    source: 'munger',
    category: 'strategic',
    best_for: ['Complex problems', 'Strategic analysis', 'Avoiding blind spots', 'Learning'],
    complexity_level: 'complex',
    time_horizon: 'long_term',
    steps: [
      { order: 1, name: 'Define the problem', description: 'Clearly state the problem or decision', duration_estimate: '5 min', outputs: ['Problem statement'] },
      { order: 2, name: 'Select relevant models', description: 'Choose 5-10 mental models that apply', duration_estimate: '10 min', outputs: ['Model selection'] },
      { order: 3, name: 'Apply each model', description: 'Analyze the problem through each lens', duration_estimate: '30 min', outputs: ['Multi-model analysis'] },
      { order: 4, name: 'Synthesize insights', description: 'Combine insights from all models', duration_estimate: '15 min', outputs: ['Synthesized view'] },
      { order: 5, name: 'Identify blind spots', description: 'What might you still be missing?', duration_estimate: '10 min', outputs: ['Blind spot check'] },
    ],
    questions: [],
    criteria: [],
    origin_story: 'Munger developed ~100 mental models across psychology, physics, biology, economics, and more.',
  },
  {
    id: 'checklist',
    name: 'Checklist Thinking',
    description: 'Use checklists to avoid missing critical steps and cognitive biases',
    source: 'munger',
    category: 'operational',
    best_for: ['Repetitive decisions', 'Complex processes', 'Avoiding errors', 'Quality control'],
    complexity_level: 'simple',
    time_horizon: 'immediate',
    steps: [
      { order: 1, name: 'Identify decision type', description: 'What category of decision is this?', duration_estimate: '2 min', outputs: ['Decision category'] },
      { order: 2, name: 'Pull relevant checklist', description: 'Get or create the appropriate checklist', duration_estimate: '5 min', outputs: ['Checklist'] },
      { order: 3, name: 'Work through items', description: 'Systematically check each item', duration_estimate: '15 min', outputs: ['Completed checklist'] },
      { order: 4, name: 'Note anomalies', description: 'Flag anything unusual or concerning', duration_estimate: '5 min', outputs: ['Anomaly list'] },
      { order: 5, name: 'Make decision', description: 'Proceed if all critical items check', duration_estimate: '2 min', outputs: ['Go/No-go decision'] },
    ],
    questions: [],
    criteria: [],
    origin_story: 'Inspired by aviation checklists and surgeon Atul Gawande\'s "Checklist Manifesto".',
  },

  // Ray Dalio Frameworks
  {
    id: 'believability_weighted',
    name: 'Believability-Weighted Decision Making',
    description: 'Weight opinions by the believability/expertise of the person giving them',
    source: 'dalio',
    category: 'people',
    best_for: ['Group decisions', 'Expert input', 'Reducing bias', 'High-stakes choices'],
    complexity_level: 'moderate',
    time_horizon: 'medium_term',
    steps: [
      { order: 1, name: 'Define the question', description: 'What specific question needs answering?', duration_estimate: '5 min', outputs: ['Question statement'] },
      { order: 2, name: 'Identify relevant experts', description: 'Who has demonstrated expertise in this area?', duration_estimate: '10 min', outputs: ['Expert list'] },
      { order: 3, name: 'Assign believability scores', description: 'Rate each person\'s credibility (0-100)', duration_estimate: '10 min', outputs: ['Believability scores'] },
      { order: 4, name: 'Collect opinions', description: 'Get each person\'s view and reasoning', duration_estimate: '20 min', outputs: ['Opinion collection'] },
      { order: 5, name: 'Calculate weighted average', description: 'Weight opinions by believability', duration_estimate: '10 min', outputs: ['Weighted decision'] },
    ],
    questions: [
      { id: 'q1', question: 'Has this person demonstrated success in this specific domain?', category: 'track_record', importance: 'critical', answer_type: 'yes_no' },
      { id: 'q2', question: 'Can they explain their reasoning clearly?', category: 'reasoning', importance: 'important', answer_type: 'yes_no' },
      { id: 'q3', question: 'Have they been wrong before and admitted it?', category: 'humility', importance: 'helpful', answer_type: 'yes_no' },
    ],
    criteria: [],
    origin_story: 'Dalio developed this at Bridgewater to make better investment decisions by leveraging collective intelligence.',
  },
  {
    id: 'principles',
    name: 'Principle-Based Decision Making',
    description: 'Document principles from experience, then apply them consistently to similar situations',
    source: 'dalio',
    category: 'strategic',
    best_for: ['Recurring decisions', 'Building culture', 'Consistency', 'Learning from mistakes'],
    complexity_level: 'moderate',
    time_horizon: 'long_term',
    steps: [
      { order: 1, name: 'Identify the situation type', description: 'What category of situation is this?', duration_estimate: '5 min', outputs: ['Situation category'] },
      { order: 2, name: 'Find applicable principles', description: 'What principles have you established for this?', duration_estimate: '10 min', outputs: ['Applicable principles'] },
      { order: 3, name: 'Apply the principles', description: 'What do the principles say to do?', duration_estimate: '10 min', outputs: ['Principled recommendation'] },
      { order: 4, name: 'Check for exceptions', description: 'Is this situation truly different?', duration_estimate: '5 min', outputs: ['Exception check'] },
      { order: 5, name: 'Update principles', description: 'Did you learn something new to add?', duration_estimate: '5 min', outputs: ['Principle updates'] },
    ],
    questions: [],
    criteria: [],
    origin_story: 'Dalio wrote his principles over 40 years, culminating in his book "Principles".',
    resources: [
      { type: 'book', title: 'Principles', author: 'Ray Dalio' },
    ],
  },

  // McKinsey Frameworks
  {
    id: 'mece',
    name: 'MECE Framework',
    description: 'Break problems into Mutually Exclusive, Collectively Exhaustive categories',
    source: 'mckinsey',
    category: 'strategic',
    best_for: ['Problem structuring', 'Analysis', 'Communication', 'Completeness'],
    complexity_level: 'moderate',
    time_horizon: 'medium_term',
    steps: [
      { order: 1, name: 'State the problem', description: 'Clearly define what you\'re solving', duration_estimate: '5 min', outputs: ['Problem statement'] },
      { order: 2, name: 'Brainstorm categories', description: 'List all possible categories', duration_estimate: '15 min', outputs: ['Category list'] },
      { order: 3, name: 'Check mutual exclusivity', description: 'Ensure no overlap between categories', duration_estimate: '10 min', outputs: ['Exclusivity check'] },
      { order: 4, name: 'Check collective exhaustiveness', description: 'Ensure all possibilities are covered', duration_estimate: '10 min', outputs: ['Exhaustiveness check'] },
      { order: 5, name: 'Refine and finalize', description: 'Adjust categories as needed', duration_estimate: '10 min', outputs: ['Final MECE structure'] },
    ],
    questions: [
      { id: 'q1', question: 'Do any items fit in multiple categories?', category: 'exclusivity', importance: 'critical', answer_type: 'yes_no' },
      { id: 'q2', question: 'Is there anything not covered by any category?', category: 'exhaustiveness', importance: 'critical', answer_type: 'yes_no' },
    ],
    criteria: [],
    origin_story: 'Developed by McKinsey consultant Barbara Minto in the 1960s.',
  },
  {
    id: 'mckinsey_7s',
    name: 'McKinsey 7-S Model',
    description: 'Analyze organizational effectiveness through 7 interconnected elements',
    source: 'mckinsey',
    category: 'strategic',
    best_for: ['Organizational change', 'Strategy alignment', 'M&A integration', 'Transformation'],
    complexity_level: 'complex',
    time_horizon: 'long_term',
    steps: [
      { order: 1, name: 'Assess each S', description: 'Evaluate all 7 elements independently', duration_estimate: '60 min', outputs: ['7-S assessment'] },
      { order: 2, name: 'Identify misalignments', description: 'Where are elements not aligned?', duration_estimate: '30 min', outputs: ['Misalignment map'] },
      { order: 3, name: 'Prioritize gaps', description: 'Which misalignments matter most?', duration_estimate: '15 min', outputs: ['Priority list'] },
      { order: 4, name: 'Design interventions', description: 'How will you close each gap?', duration_estimate: '30 min', outputs: ['Intervention plan'] },
    ],
    questions: [],
    criteria: [
      { id: 'strategy', name: 'Strategy', description: 'Plan for competitive advantage', weight: 15, scoring_guide: [] },
      { id: 'structure', name: 'Structure', description: 'Organization chart and reporting', weight: 15, scoring_guide: [] },
      { id: 'systems', name: 'Systems', description: 'Daily processes and procedures', weight: 14, scoring_guide: [] },
      { id: 'shared_values', name: 'Shared Values', description: 'Core values and culture', weight: 14, scoring_guide: [] },
      { id: 'skills', name: 'Skills', description: 'Capabilities and competencies', weight: 14, scoring_guide: [] },
      { id: 'staff', name: 'Staff', description: 'Employee numbers and types', weight: 14, scoring_guide: [] },
      { id: 'style', name: 'Style', description: 'Leadership and management style', weight: 14, scoring_guide: [] },
    ],
    origin_story: 'Developed by Tom Peters and Robert Waterman at McKinsey in the 1980s.',
  },

  // BCG Frameworks
  {
    id: 'bcg_matrix',
    name: 'BCG Growth-Share Matrix',
    description: 'Classify products/business units by market growth and relative market share',
    source: 'bcg',
    category: 'investment',
    best_for: ['Portfolio management', 'Resource allocation', 'Product strategy', 'M&A'],
    complexity_level: 'moderate',
    time_horizon: 'medium_term',
    steps: [
      { order: 1, name: 'List products/units', description: 'Identify all products or business units', duration_estimate: '10 min', outputs: ['Product list'] },
      { order: 2, name: 'Assess market growth', description: 'Rate market growth for each (high/low)', duration_estimate: '20 min', outputs: ['Growth ratings'] },
      { order: 3, name: 'Assess market share', description: 'Rate relative market share for each (high/low)', duration_estimate: '20 min', outputs: ['Share ratings'] },
      { order: 4, name: 'Plot on matrix', description: 'Place each in appropriate quadrant', duration_estimate: '10 min', outputs: ['BCG matrix'] },
      { order: 5, name: 'Determine strategies', description: 'Apply quadrant-specific strategies', duration_estimate: '15 min', outputs: ['Strategy recommendations'] },
    ],
    questions: [],
    criteria: [],
    matrix: {
      x_axis: { name: 'Relative Market Share', low_label: 'Low', high_label: 'High' },
      y_axis: { name: 'Market Growth Rate', low_label: 'Low', high_label: 'High' },
      quadrants: [
        { position: 'top_left', name: 'Question Marks', recommendation: 'Invest selectively or divest', color: '#f59e0b' },
        { position: 'top_right', name: 'Stars', recommendation: 'Invest for growth', color: '#22c55e' },
        { position: 'bottom_left', name: 'Dogs', recommendation: 'Divest or harvest', color: '#ef4444' },
        { position: 'bottom_right', name: 'Cash Cows', recommendation: 'Milk for cash, maintain', color: '#3b82f6' },
      ],
    },
    origin_story: 'Created by Bruce Henderson for BCG in 1970.',
  },

  // Porter Frameworks
  {
    id: 'porter_five_forces',
    name: 'Porter\'s Five Forces',
    description: 'Analyze industry competitive dynamics through five forces',
    source: 'academic',
    category: 'strategic',
    best_for: ['Industry analysis', 'Market entry', 'Competitive strategy', 'Investment decisions'],
    complexity_level: 'complex',
    time_horizon: 'long_term',
    steps: [
      { order: 1, name: 'Define the industry', description: 'Clearly scope the industry being analyzed', duration_estimate: '10 min', outputs: ['Industry definition'] },
      { order: 2, name: 'Analyze each force', description: 'Rate each of the 5 forces (1-10)', duration_estimate: '45 min', outputs: ['Force ratings'] },
      { order: 3, name: 'Identify key factors', description: 'List main drivers of each force', duration_estimate: '20 min', outputs: ['Key factors'] },
      { order: 4, name: 'Assess overall attractiveness', description: 'How attractive is this industry?', duration_estimate: '10 min', outputs: ['Attractiveness score'] },
      { order: 5, name: 'Develop strategic implications', description: 'What does this mean for strategy?', duration_estimate: '15 min', outputs: ['Strategic implications'] },
    ],
    questions: [],
    criteria: [
      { id: 'rivalry', name: 'Competitive Rivalry', description: 'Intensity of competition among existing players', weight: 20, scoring_guide: [{ score: 1, description: 'Low rivalry' }, { score: 5, description: 'Moderate' }, { score: 10, description: 'Intense rivalry' }] },
      { id: 'suppliers', name: 'Supplier Power', description: 'Bargaining power of suppliers', weight: 20, scoring_guide: [{ score: 1, description: 'Low power' }, { score: 10, description: 'High power' }] },
      { id: 'buyers', name: 'Buyer Power', description: 'Bargaining power of customers', weight: 20, scoring_guide: [{ score: 1, description: 'Low power' }, { score: 10, description: 'High power' }] },
      { id: 'substitutes', name: 'Threat of Substitutes', description: 'Availability of alternative products', weight: 20, scoring_guide: [{ score: 1, description: 'Low threat' }, { score: 10, description: 'High threat' }] },
      { id: 'new_entrants', name: 'Threat of New Entrants', description: 'Barriers to entry', weight: 20, scoring_guide: [{ score: 1, description: 'High barriers' }, { score: 10, description: 'Low barriers' }] },
    ],
    origin_story: 'Michael Porter introduced this framework in his 1979 HBR article.',
    resources: [
      { type: 'book', title: 'Competitive Strategy', author: 'Michael Porter' },
    ],
  },
];

// ============================================================================
// Munger's Key Mental Models
// ============================================================================

export const MENTAL_MODELS: MentalModel[] = [
  // From Psychology
  { id: 'confirmation_bias', name: 'Confirmation Bias', domain: 'Psychology', description: 'Tendency to search for info that confirms existing beliefs', application: 'Actively seek disconfirming evidence', example: 'Bezos hires people to argue against decisions' },
  { id: 'incentives', name: 'Incentive-Caused Bias', domain: 'Psychology', description: 'People do what they\'re incentivized to do', application: 'Design incentives carefully', example: 'Sales commissions causing bad behavior' },
  { id: 'social_proof', name: 'Social Proof', domain: 'Psychology', description: 'Following the crowd', application: 'Question consensus, be contrarian when right', example: 'Buffett avoiding dot-com bubble' },
  { id: 'availability', name: 'Availability Heuristic', domain: 'Psychology', description: 'Overweighting easily recalled information', application: 'Use data, not anecdotes', example: 'Fear of flying vs driving' },
  { id: 'sunk_cost', name: 'Sunk Cost Fallacy', domain: 'Psychology', description: 'Continuing because of past investment', application: 'Only consider future costs/benefits', example: 'Staying in bad investment too long' },

  // From Economics
  { id: 'opportunity_cost', name: 'Opportunity Cost', domain: 'Economics', description: 'The cost of the next best alternative', application: 'Always compare to alternatives', example: 'Time spent on Project A can\'t be spent on B' },
  { id: 'comparative_advantage', name: 'Comparative Advantage', domain: 'Economics', description: 'Focus on what you do relatively better', application: 'Outsource non-core activities', example: 'Countries specializing in trade' },
  { id: 'supply_demand', name: 'Supply and Demand', domain: 'Economics', description: 'Prices set by supply and demand intersection', application: 'Find demand/supply imbalances', example: 'Talent shortage driving up salaries' },

  // From Mathematics
  { id: 'compound_interest', name: 'Compound Interest', domain: 'Mathematics', description: 'Growth accelerates over time', application: 'Start early, be patient', example: 'Buffett\'s wealth accumulation' },
  { id: 'probability', name: 'Probabilistic Thinking', domain: 'Mathematics', description: 'Think in probabilities, not certainties', application: 'Assign probabilities to outcomes', example: 'Expected value calculations' },
  { id: 'pareto', name: 'Pareto Principle (80/20)', domain: 'Mathematics', description: '80% of effects from 20% of causes', application: 'Focus on the vital few', example: '20% of customers = 80% of revenue' },

  // From Physics
  { id: 'critical_mass', name: 'Critical Mass', domain: 'Physics', description: 'Minimum amount needed for chain reaction', application: 'Build to critical mass before expecting results', example: 'Network effects in social platforms' },
  { id: 'leverage', name: 'Leverage', domain: 'Physics', description: 'Small input, large output', application: 'Find high-leverage activities', example: 'Writing code vs manual work' },
  { id: 'feedback_loops', name: 'Feedback Loops', domain: 'Systems', description: 'Outputs become inputs', application: 'Design positive feedback loops', example: 'Customer reviews driving more sales' },

  // From Biology
  { id: 'evolution', name: 'Evolution/Adaptation', domain: 'Biology', description: 'What survives reproduces', application: 'Build adaptable systems', example: 'Companies that pivot survive' },
  { id: 'red_queen', name: 'Red Queen Effect', domain: 'Biology', description: 'Must keep running to stay in place', application: 'Continuous improvement is required', example: 'Competitive markets requiring constant innovation' },
];

// ============================================================================
// Cognitive Bias Checklist
// ============================================================================

export const COGNITIVE_BIASES: BiasCheck[] = [
  { bias_name: 'Confirmation Bias', description: 'Seeking information that confirms existing beliefs', warning_signs: ['Only talking to people who agree', 'Ignoring negative data'], mitigation: 'Actively seek disconfirming evidence', detected: false },
  { bias_name: 'Anchoring', description: 'Over-relying on first piece of information', warning_signs: ['Fixating on initial numbers', 'Not adjusting estimates enough'], mitigation: 'Generate multiple anchors independently', detected: false },
  { bias_name: 'Sunk Cost Fallacy', description: 'Continuing because of past investment', warning_signs: ['Saying "we\'ve come too far"', 'Ignoring new information'], mitigation: 'Ask: if starting fresh, would we do this?', detected: false },
  { bias_name: 'Overconfidence', description: 'Being too certain about predictions', warning_signs: ['Narrow confidence intervals', 'Not considering alternatives'], mitigation: 'Assign probabilities, track accuracy', detected: false },
  { bias_name: 'Availability Heuristic', description: 'Overweighting easily recalled examples', warning_signs: ['Citing recent events heavily', 'Ignoring base rates'], mitigation: 'Use statistical data, not anecdotes', detected: false },
  { bias_name: 'Groupthink', description: 'Conforming to group opinion', warning_signs: ['No dissent in meetings', 'Quick consensus'], mitigation: 'Assign devil\'s advocate role', detected: false },
  { bias_name: 'Status Quo Bias', description: 'Preferring current state', warning_signs: ['Resistance to change', '"This is how we\'ve always done it"'], mitigation: 'Compare to ideal state, not current', detected: false },
  { bias_name: 'Hindsight Bias', description: 'Believing past events were predictable', warning_signs: ['"I knew it all along"', 'Not learning from surprises'], mitigation: 'Document predictions before outcomes', detected: false },
  { bias_name: 'Authority Bias', description: 'Over-trusting experts/authority figures', warning_signs: ['Not questioning leadership', 'Deferring without analysis'], mitigation: 'Evaluate arguments, not sources', detected: false },
  { bias_name: 'Recency Bias', description: 'Overweighting recent events', warning_signs: ['Short-term focus', 'Ignoring long-term patterns'], mitigation: 'Look at longer time horizons', detected: false },
];

// ============================================================================
// Decision Framework Service
// ============================================================================

export class DecisionFrameworkService {
  private supabase: any;
  private aiClient: any;

  constructor(supabase: any, aiClient?: any) {
    this.supabase = supabase;
    this.aiClient = aiClient;
  }

  // Get all frameworks
  getFrameworks(filters?: {
    source?: FrameworkSource;
    category?: FrameworkCategory;
  }): DecisionFramework[] {
    let frameworks = DECISION_FRAMEWORKS;

    if (filters?.source) {
      frameworks = frameworks.filter((f) => f.source === filters.source);
    }
    if (filters?.category) {
      frameworks = frameworks.filter((f) => f.category === filters.category);
    }

    return frameworks;
  }

  // Get framework by ID
  getFramework(id: string): DecisionFramework | undefined {
    return DECISION_FRAMEWORKS.find((f) => f.id === id);
  }

  // Get recommended frameworks for a decision
  recommendFrameworks(decision: {
    description: string;
    complexity: 'simple' | 'moderate' | 'complex' | 'critical';
    time_horizon: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
    reversibility: 'easily_reversible' | 'reversible' | 'difficult_to_reverse' | 'irreversible';
  }): DecisionFramework[] {
    // Score each framework based on fit
    const scored = DECISION_FRAMEWORKS.map((f) => {
      let score = 0;

      // Complexity match
      if (f.complexity_level === decision.complexity) score += 3;
      else if (
        (f.complexity_level === 'simple' && decision.complexity === 'moderate') ||
        (f.complexity_level === 'moderate' && decision.complexity === 'complex')
      ) {
        score += 1;
      }

      // Time horizon match
      if (f.time_horizon === decision.time_horizon) score += 3;

      // Reversibility considerations
      if (decision.reversibility === 'irreversible' && f.id === 'regret_minimization') {
        score += 5;
      }
      if (decision.reversibility === 'easily_reversible' && f.id === 'type1_type2') {
        score += 5;
      }

      return { framework: f, score };
    });

    // Sort by score and return top 3
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((s) => s.framework);
  }

  // Apply Regret Minimization Framework
  applyRegretMinimization(input: {
    decision: string;
    regret_of_inaction_score: number; // 1-10
    regret_of_action_score: number; // 1-10
    years_to_consider: number;
  }): RegretMinimizationResult {
    const willRegret = input.regret_of_inaction_score > input.regret_of_action_score;

    return {
      decision: input.decision,
      will_regret_not_doing: willRegret,
      regret_score: input.regret_of_inaction_score - input.regret_of_action_score,
      time_horizon_years: input.years_to_consider,
      conclusion: willRegret
        ? 'do_it'
        : input.regret_of_inaction_score === input.regret_of_action_score
        ? 'need_more_info'
        : 'dont_do_it',
    };
  }

  // Apply Type 1 vs Type 2 Analysis
  applyType1Type2(input: {
    decision: string;
    is_reversible: boolean;
    reversal_cost: 'none' | 'low' | 'medium' | 'high' | 'extreme';
  }): Type1Type2Analysis {
    const isType2 =
      input.is_reversible &&
      (input.reversal_cost === 'none' || input.reversal_cost === 'low');

    return {
      decision: input.decision,
      is_reversible: input.is_reversible,
      reversal_cost: input.reversal_cost,
      decision_type: isType2 ? 'type_2' : 'type_1',
      recommended_process: isType2
        ? 'Move fast. Decide quickly with high-judgment individuals or small groups.'
        : 'Deliberate carefully. Get broad input, analyze thoroughly, take your time.',
      decision_speed: isType2 ? 'within_hours' : 'take_time',
    };
  }

  // Apply Inversion
  applyInversion(input: {
    goal: string;
    failure_modes: string[];
  }): InversionAnalysis {
    return {
      goal: input.goal,
      inverted_question: `How could we guarantee that "${input.goal}" fails?`,
      failure_modes: input.failure_modes,
      avoidance_strategies: input.failure_modes.map(
        (fm) => `Avoid: ${fm} by implementing safeguards`
      ),
    };
  }

  // Get mental models
  getMentalModels(domain?: string): MentalModel[] {
    if (domain) {
      return MENTAL_MODELS.filter((m) => m.domain === domain);
    }
    return MENTAL_MODELS;
  }

  // Get bias checklist
  getBiasChecklist(): BiasCheck[] {
    return COGNITIVE_BIASES;
  }

  // Get decision points for Idea-to-Launch phase
  getPhaseDecisionPoints(phase: string) {
    return IDEA_TO_LAUNCH_DECISION_POINTS.find((dp) => dp.phase === phase);
  }

  // Create decision session
  async createSession(input: {
    user_id?: string;
    project_id?: string;
    decision_title: string;
    decision_description: string;
    context: string;
    options: DecisionOption[];
  }): Promise<DecisionSession> {
    const session: DecisionSession = {
      id: `session_${Date.now()}`,
      ...input,
      selected_frameworks: [],
      framework_results: {},
      criteria_scores: {},
      weighted_scores: {},
      bias_checks: COGNITIVE_BIASES.map((b) => ({ ...b, detected: false })),
      devil_advocate_arguments: [],
      success_metrics: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Save to database if available
    if (this.supabase) {
      await this.supabase.from('decision_sessions').insert(session);
    }

    return session;
  }

  // Get AI recommendation for a decision
  async getAIRecommendation(session: DecisionSession): Promise<{
    recommended_option: string;
    confidence: number;
    reasoning: string;
    considerations: string[];
  }> {
    if (!this.aiClient) {
      throw new Error('AI client not configured');
    }

    const prompt = `
You are a world-class decision-making advisor, trained in the frameworks of Jeff Bezos, Charlie Munger, Ray Dalio, and top consulting firms.

# Decision to Make
${session.decision_title}

# Description
${session.decision_description}

# Context
${session.context}

# Options
${session.options
  .map(
    (o, i) => `
## Option ${i + 1}: ${o.name}
${o.description}
- Pros: ${o.pros.join(', ')}
- Cons: ${o.cons.join(', ')}
- Risks: ${o.risks.join(', ')}
- Time to implement: ${o.time_to_implement}
- Reversibility: ${o.reversibility}
`
  )
  .join('\n')}

# Your Task
1. Apply the most relevant decision frameworks to this situation
2. Consider cognitive biases that might be at play
3. Provide a clear recommendation with reasoning
4. Assign a confidence level (0-100)
5. List key considerations and risks

Respond in JSON format:
{
  "recommended_option": "name of recommended option",
  "confidence": 0-100,
  "reasoning": "detailed reasoning",
  "frameworks_applied": ["framework names"],
  "considerations": ["list of key considerations"],
  "potential_biases": ["biases to watch for"]
}`;

    const response = await this.aiClient.chat({
      model: 'claude-sonnet-4-20250514',
      messages: [{ role: 'user', content: prompt }],
      thinking: { type: 'enabled', budget_tokens: 8000 },
    });

    try {
      const result = JSON.parse(response.content[0].text);
      return result;
    } catch {
      return {
        recommended_option: session.options[0]?.name || 'Unknown',
        confidence: 50,
        reasoning: response.content[0].text,
        considerations: [],
      };
    }
  }
}

export default DecisionFrameworkService;
