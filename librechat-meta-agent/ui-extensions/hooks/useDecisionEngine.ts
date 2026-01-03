'use client';

import { useState, useCallback, useMemo } from 'react';

// ============================================================================
// Types
// ============================================================================

export type FrameworkType =
  | 'regret_minimization'
  | 'type1_type2'
  | 'inversion'
  | 'mece'
  | 'bcg_matrix'
  | 'checklist';

export type DecisionStep = {
  id: string;
  name: string;
  description: string;
  completed: boolean;
  data: Record<string, any>;
};

export type BiasAlert = {
  id: string;
  name: string;
  description: string;
  detected: boolean;
  severity: 'low' | 'medium' | 'high';
  mitigation: string;
};

export type DecisionOption = {
  id: string;
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  score: number;
};

export type DecisionResult = {
  framework: FrameworkType;
  recommendation: string;
  confidence: number;
  reasoning: string;
  scores: Record<string, number>;
  biasAlerts: BiasAlert[];
  timestamp: string;
};

export type DecisionSession = {
  id: string;
  title: string;
  description: string;
  framework: FrameworkType;
  currentStep: number;
  steps: DecisionStep[];
  options: DecisionOption[];
  result: DecisionResult | null;
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// Framework Definitions
// ============================================================================

const FRAMEWORK_STEPS: Record<FrameworkType, Omit<DecisionStep, 'completed' | 'data'>[]> = {
  regret_minimization: [
    { id: 'define', name: 'Define the Decision', description: 'Clearly state what you are deciding' },
    { id: 'project', name: 'Project to Age 80', description: 'Imagine yourself at 80 looking back' },
    { id: 'inaction', name: 'Regret of Inaction', description: 'Rate: How much will you regret NOT doing this?' },
    { id: 'action', name: 'Regret of Action', description: 'Rate: How much will you regret doing this if it fails?' },
    { id: 'compare', name: 'Compare & Decide', description: 'Which regret is worse? Make your decision' },
  ],
  type1_type2: [
    { id: 'identify', name: 'Identify Decision', description: 'What decision needs to be made?' },
    { id: 'reversibility', name: 'Assess Reversibility', description: 'Can this decision be undone?' },
    { id: 'cost', name: 'Reversal Cost', description: 'What would it cost to reverse this decision?' },
    { id: 'classify', name: 'Classify', description: 'Is this Type 1 (irreversible) or Type 2 (reversible)?' },
    { id: 'process', name: 'Choose Process', description: 'Determine the appropriate decision process' },
  ],
  inversion: [
    { id: 'goal', name: 'Define Success', description: 'What does success look like?' },
    { id: 'invert', name: 'Invert the Question', description: 'How could this fail spectacularly?' },
    { id: 'failures', name: 'List Failure Modes', description: 'Enumerate all ways this could fail' },
    { id: 'avoid', name: 'Avoidance Strategies', description: 'How do you prevent each failure mode?' },
    { id: 'guardrails', name: 'Build Guardrails', description: 'Implement safeguards against top risks' },
  ],
  mece: [
    { id: 'problem', name: 'State the Problem', description: 'Clearly define what you are solving' },
    { id: 'brainstorm', name: 'Brainstorm Categories', description: 'List all possible categories' },
    { id: 'exclusive', name: 'Check Mutual Exclusivity', description: 'Ensure no overlap between categories' },
    { id: 'exhaustive', name: 'Check Exhaustiveness', description: 'Ensure all possibilities are covered' },
    { id: 'refine', name: 'Refine Structure', description: 'Adjust categories as needed' },
  ],
  bcg_matrix: [
    { id: 'list', name: 'List Items', description: 'Identify all products, projects, or options' },
    { id: 'growth', name: 'Assess Growth', description: 'Rate market/opportunity growth (low/high)' },
    { id: 'share', name: 'Assess Share/Strength', description: 'Rate relative strength (low/high)' },
    { id: 'plot', name: 'Plot on Matrix', description: 'Place each in appropriate quadrant' },
    { id: 'strategy', name: 'Determine Strategy', description: 'Apply quadrant-specific strategies' },
  ],
  checklist: [
    { id: 'type', name: 'Identify Decision Type', description: 'What category of decision is this?' },
    { id: 'criteria', name: 'Define Criteria', description: 'List all criteria that must be checked' },
    { id: 'check', name: 'Work Through Items', description: 'Systematically check each item' },
    { id: 'anomalies', name: 'Note Anomalies', description: 'Flag anything unusual or concerning' },
    { id: 'decide', name: 'Make Decision', description: 'Proceed if all critical items pass' },
  ],
};

const BIAS_CHECKS: Omit<BiasAlert, 'detected'>[] = [
  {
    id: 'confirmation',
    name: 'Confirmation Bias',
    description: 'Are you only seeking information that confirms your existing beliefs?',
    severity: 'high',
    mitigation: 'Actively seek disconfirming evidence',
  },
  {
    id: 'anchoring',
    name: 'Anchoring Bias',
    description: 'Are you over-relying on the first piece of information?',
    severity: 'medium',
    mitigation: 'Generate multiple anchors independently',
  },
  {
    id: 'sunk_cost',
    name: 'Sunk Cost Fallacy',
    description: 'Are you continuing because of past investment rather than future value?',
    severity: 'high',
    mitigation: 'Ask: if starting fresh, would you do this?',
  },
  {
    id: 'overconfidence',
    name: 'Overconfidence',
    description: 'Are you too certain about your predictions?',
    severity: 'medium',
    mitigation: 'Assign probabilities and track accuracy',
  },
  {
    id: 'groupthink',
    name: 'Groupthink',
    description: 'Is everyone agreeing without genuine debate?',
    severity: 'medium',
    mitigation: 'Assign a devil\'s advocate role',
  },
];

// ============================================================================
// Decision Engine Hook
// ============================================================================

export function useDecisionEngine() {
  // State
  const [session, setSession] = useState<DecisionSession | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start a new decision session
  const startSession = useCallback(
    (title: string, description: string, framework: FrameworkType) => {
      const steps = FRAMEWORK_STEPS[framework].map((step) => ({
        ...step,
        completed: false,
        data: {},
      }));

      const newSession: DecisionSession = {
        id: `session_${Date.now()}`,
        title,
        description,
        framework,
        currentStep: 0,
        steps,
        options: [],
        result: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setSession(newSession);
      setError(null);
      return newSession;
    },
    []
  );

  // Update step data
  const updateStepData = useCallback(
    (stepId: string, data: Record<string, any>) => {
      if (!session) return;

      setSession((prev) => {
        if (!prev) return prev;

        const updatedSteps = prev.steps.map((step) =>
          step.id === stepId
            ? { ...step, data: { ...step.data, ...data } }
            : step
        );

        return {
          ...prev,
          steps: updatedSteps,
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [session]
  );

  // Complete current step and move to next
  const completeStep = useCallback(() => {
    if (!session) return;

    setSession((prev) => {
      if (!prev) return prev;

      const updatedSteps = prev.steps.map((step, index) =>
        index === prev.currentStep ? { ...step, completed: true } : step
      );

      const nextStep = Math.min(prev.currentStep + 1, prev.steps.length - 1);

      return {
        ...prev,
        steps: updatedSteps,
        currentStep: nextStep,
        updatedAt: new Date().toISOString(),
      };
    });
  }, [session]);

  // Go back to previous step
  const previousStep = useCallback(() => {
    if (!session || session.currentStep === 0) return;

    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        currentStep: prev.currentStep - 1,
        updatedAt: new Date().toISOString(),
      };
    });
  }, [session]);

  // Add a decision option
  const addOption = useCallback(
    (option: Omit<DecisionOption, 'id' | 'score'>) => {
      if (!session) return;

      const newOption: DecisionOption = {
        ...option,
        id: `option_${Date.now()}`,
        score: 0,
      };

      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          options: [...prev.options, newOption],
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [session]
  );

  // Update option score
  const updateOptionScore = useCallback(
    (optionId: string, score: number) => {
      if (!session) return;

      setSession((prev) => {
        if (!prev) return prev;

        const updatedOptions = prev.options.map((opt) =>
          opt.id === optionId ? { ...opt, score } : opt
        );

        return {
          ...prev,
          options: updatedOptions,
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [session]
  );

  // Calculate Regret Minimization result
  const calculateRegretMinimization = useCallback(() => {
    if (!session || session.framework !== 'regret_minimization') return null;

    const inactionData = session.steps.find((s) => s.id === 'inaction')?.data;
    const actionData = session.steps.find((s) => s.id === 'action')?.data;

    const inactionScore = inactionData?.score || 0;
    const actionScore = actionData?.score || 0;

    const shouldDo = inactionScore > actionScore;
    const confidence = Math.abs(inactionScore - actionScore) * 10;

    return {
      shouldDo,
      inactionScore,
      actionScore,
      confidence: Math.min(confidence, 100),
      recommendation: shouldDo
        ? 'DO IT - You will regret not trying more than you will regret failing'
        : 'DON\'T DO IT - The potential regret of action outweighs inaction',
    };
  }, [session]);

  // Calculate Type 1/Type 2 result
  const calculateType1Type2 = useCallback(() => {
    if (!session || session.framework !== 'type1_type2') return null;

    const reversibilityData = session.steps.find((s) => s.id === 'reversibility')?.data;
    const costData = session.steps.find((s) => s.id === 'cost')?.data;

    const isReversible = reversibilityData?.isReversible ?? false;
    const reversalCost = costData?.cost || 'unknown';

    const isType2 = isReversible && ['none', 'low'].includes(reversalCost);

    return {
      decisionType: isType2 ? 'Type 2' : 'Type 1',
      isReversible,
      reversalCost,
      recommendation: isType2
        ? 'MOVE FAST - This is a Type 2 decision. Decide quickly with high-judgment individuals.'
        : 'DELIBERATE - This is a Type 1 decision. Take your time, get broad input, analyze thoroughly.',
      process: isType2
        ? ['Decide within hours/days', 'Small group decision', 'Bias toward action']
        : ['Full stakeholder input', 'Thorough analysis', 'Consider all alternatives'],
    };
  }, [session]);

  // Detect biases based on session data
  const detectBiases = useCallback((): BiasAlert[] => {
    if (!session) return [];

    // Simple heuristic bias detection
    const alerts: BiasAlert[] = BIAS_CHECKS.map((bias) => ({
      ...bias,
      detected: false,
    }));

    // Check for confirmation bias (only pros, no cons)
    const allPros = session.options.flatMap((o) => o.pros).length;
    const allCons = session.options.flatMap((o) => o.cons).length;
    if (allPros > 0 && allCons === 0) {
      const confirmationIndex = alerts.findIndex((a) => a.id === 'confirmation');
      if (confirmationIndex >= 0) {
        alerts[confirmationIndex].detected = true;
      }
    }

    // Check for overconfidence (all options have same high score)
    const scores = session.options.map((o) => o.score);
    if (scores.length > 1 && scores.every((s) => s > 8)) {
      const overconfidenceIndex = alerts.findIndex((a) => a.id === 'overconfidence');
      if (overconfidenceIndex >= 0) {
        alerts[overconfidenceIndex].detected = true;
      }
    }

    return alerts;
  }, [session]);

  // Generate final result
  const generateResult = useCallback(() => {
    if (!session) return;

    setIsProcessing(true);

    // Simulate processing time
    setTimeout(() => {
      let recommendation = '';
      let confidence = 0;
      let reasoning = '';
      const scores: Record<string, number> = {};

      // Framework-specific calculations
      if (session.framework === 'regret_minimization') {
        const result = calculateRegretMinimization();
        if (result) {
          recommendation = result.recommendation;
          confidence = result.confidence;
          reasoning = `Inaction regret: ${result.inactionScore}/10, Action regret: ${result.actionScore}/10`;
          scores['inaction_regret'] = result.inactionScore;
          scores['action_regret'] = result.actionScore;
        }
      } else if (session.framework === 'type1_type2') {
        const result = calculateType1Type2();
        if (result) {
          recommendation = result.recommendation;
          confidence = result.isReversible ? 80 : 60;
          reasoning = `Decision Type: ${result.decisionType}, Reversible: ${result.isReversible}, Cost: ${result.reversalCost}`;
        }
      } else {
        // Default for other frameworks
        const topOption = [...session.options].sort((a, b) => b.score - a.score)[0];
        if (topOption) {
          recommendation = `Recommended: ${topOption.name}`;
          confidence = Math.min(topOption.score * 10, 100);
          reasoning = `Highest scored option with ${topOption.pros.length} pros and ${topOption.cons.length} cons`;
        }
      }

      const biasAlerts = detectBiases();

      const result: DecisionResult = {
        framework: session.framework,
        recommendation,
        confidence,
        reasoning,
        scores,
        biasAlerts,
        timestamp: new Date().toISOString(),
      };

      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          result,
          updatedAt: new Date().toISOString(),
        };
      });

      setIsProcessing(false);
    }, 500);
  }, [session, calculateRegretMinimization, calculateType1Type2, detectBiases]);

  // Export session to markdown
  const exportToMarkdown = useCallback(() => {
    if (!session) return '';

    let md = `# Decision: ${session.title}\n\n`;
    md += `**Framework:** ${session.framework.replace('_', ' ').toUpperCase()}\n`;
    md += `**Created:** ${new Date(session.createdAt).toLocaleString()}\n\n`;
    md += `## Description\n${session.description}\n\n`;

    md += `## Analysis Steps\n`;
    session.steps.forEach((step, i) => {
      md += `### ${i + 1}. ${step.name}\n`;
      md += `${step.description}\n`;
      if (Object.keys(step.data).length > 0) {
        md += `**Data:** ${JSON.stringify(step.data, null, 2)}\n`;
      }
      md += '\n';
    });

    if (session.options.length > 0) {
      md += `## Options\n`;
      session.options.forEach((opt) => {
        md += `### ${opt.name} (Score: ${opt.score}/10)\n`;
        md += `${opt.description}\n`;
        if (opt.pros.length > 0) {
          md += `**Pros:** ${opt.pros.join(', ')}\n`;
        }
        if (opt.cons.length > 0) {
          md += `**Cons:** ${opt.cons.join(', ')}\n`;
        }
        md += '\n';
      });
    }

    if (session.result) {
      md += `## Result\n`;
      md += `**Recommendation:** ${session.result.recommendation}\n`;
      md += `**Confidence:** ${session.result.confidence}%\n`;
      md += `**Reasoning:** ${session.result.reasoning}\n\n`;

      const detectedBiases = session.result.biasAlerts.filter((b) => b.detected);
      if (detectedBiases.length > 0) {
        md += `### Bias Warnings\n`;
        detectedBiases.forEach((bias) => {
          md += `- **${bias.name}:** ${bias.mitigation}\n`;
        });
      }
    }

    return md;
  }, [session]);

  // Computed values
  const progress = useMemo(() => {
    if (!session) return 0;
    const completed = session.steps.filter((s) => s.completed).length;
    return (completed / session.steps.length) * 100;
  }, [session]);

  const currentStepData = useMemo(() => {
    if (!session) return null;
    return session.steps[session.currentStep];
  }, [session]);

  const isComplete = useMemo(() => {
    if (!session) return false;
    return session.steps.every((s) => s.completed);
  }, [session]);

  return {
    // State
    session,
    isProcessing,
    error,
    progress,
    currentStepData,
    isComplete,

    // Actions
    startSession,
    updateStepData,
    completeStep,
    previousStep,
    addOption,
    updateOptionScore,
    generateResult,
    exportToMarkdown,

    // Utilities
    detectBiases,
    calculateRegretMinimization,
    calculateType1Type2,
  };
}

export default useDecisionEngine;
