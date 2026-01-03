'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  AlertTriangle,
  Download,
  Plus,
  Trash2,
  Brain,
  GitBranch,
  Target,
  Grid,
  Lightbulb,
  Scale,
} from 'lucide-react';
import { useDecisionEngine, DecisionFrameworkType } from '@/hooks/useDecisionEngine';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { AccentButton } from '@/components/ui/AccentButton';
import { MinimalButton } from '@/components/ui/MinimalButton';
import { GeometricDecor } from '@/components/ui/GeometricDecor';

const FRAMEWORKS: { id: DecisionFrameworkType; name: string; icon: React.ElementType; description: string }[] = [
  {
    id: 'regret_minimization',
    name: 'Regret Minimization',
    icon: Brain,
    description: 'Jeff Bezos method: What will you regret NOT doing at age 80?',
  },
  {
    id: 'type1_type2',
    name: 'Type 1 / Type 2',
    icon: GitBranch,
    description: 'Amazon framework: Reversible vs irreversible decisions',
  },
  {
    id: 'inversion',
    name: 'Inversion',
    icon: Target,
    description: 'Charlie Munger method: Think about what could go wrong first',
  },
  {
    id: 'mece',
    name: 'MECE Analysis',
    icon: Grid,
    description: 'McKinsey method: Mutually Exclusive, Collectively Exhaustive',
  },
  {
    id: 'bcg_matrix',
    name: 'BCG Matrix',
    icon: Lightbulb,
    description: 'Portfolio analysis: Stars, Cash Cows, Question Marks, Dogs',
  },
  {
    id: 'checklist',
    name: 'Decision Checklist',
    icon: Scale,
    description: 'Ray Dalio approach: Systematic principle-based evaluation',
  },
];

export function DecisionWizard() {
  const {
    session,
    isProcessing,
    startSession,
    updateStepData,
    completeStep,
    previousStep,
    addOption,
    removeOption,
    updateOptionScore,
    calculateRegretMinimization,
    calculateType1Type2,
    detectBiases,
    generateResult,
    exportToMarkdown,
    resetSession,
  } = useDecisionEngine();

  const [selectedFramework, setSelectedFramework] = useState<DecisionFrameworkType | null>(null);
  const [optionInput, setOptionInput] = useState('');

  // Start a new session with selected framework
  const handleStartSession = () => {
    if (selectedFramework) {
      startSession(selectedFramework);
    }
  };

  // Handle option add
  const handleAddOption = () => {
    if (optionInput.trim()) {
      addOption(optionInput.trim());
      setOptionInput('');
    }
  };

  // Export and download
  const handleExport = () => {
    const markdown = exportToMarkdown();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `decision-${session?.id || 'export'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Framework Selection View
  if (!session) {
    return (
      <div className="min-h-screen bg-warm-50">
        <GeometricDecor variant="radial" size="lg" position="bottom-right" opacity={0.1} />

        <div className="relative max-w-4xl mx-auto px-6 py-12 lg:px-12 lg:py-16">
          <SectionHeader
            label="Decision Frameworks"
            title="Make Better Decisions"
            subtitle="Choose a proven framework used by world-class leaders and organizations"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FRAMEWORKS.map((framework) => {
              const Icon = framework.icon;
              const isSelected = selectedFramework === framework.id;

              return (
                <button
                  key={framework.id}
                  onClick={() => setSelectedFramework(framework.id)}
                  className={`text-left p-6 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-warm-200 bg-white hover:border-teal-300'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isSelected ? 'bg-teal-500' : 'bg-warm-100'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-warm-600'}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-warm-900">{framework.name}</h3>
                      <p className="text-sm text-warm-500 mt-1">{framework.description}</p>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex justify-center">
            <AccentButton
              onClick={handleStartSession}
              disabled={!selectedFramework}
              icon={<ArrowRight className="w-4 h-4" />}
              size="lg"
            >
              Start Framework
            </AccentButton>
          </div>
        </div>
      </div>
    );
  }

  const currentStep = session.steps[session.currentStep];
  const biases = detectBiases();
  const progress = ((session.currentStep + 1) / session.steps.length) * 100;

  // Decision Wizard View
  return (
    <div className="min-h-screen bg-warm-50">
      <GeometricDecor variant="lines" size="sm" position="top-right" opacity={0.08} />

      <div className="relative max-w-3xl mx-auto px-6 py-12 lg:px-12 lg:py-16">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-warm-600">
              Step {session.currentStep + 1} of {session.steps.length}
            </span>
            <MinimalButton onClick={resetSession}>
              Start Over
            </MinimalButton>
          </div>
          <div className="h-2 bg-warm-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Current Step */}
        <div className="bg-white border border-warm-200 rounded-2xl p-8 mb-6">
          <h2 className="text-2xl font-light text-warm-900 mb-2">{currentStep.title}</h2>
          <p className="text-warm-500 mb-6">{currentStep.description}</p>

          {/* Step Content based on type */}
          {currentStep.type === 'input' && (
            <div className="space-y-4">
              <textarea
                value={(currentStep.data as { value?: string })?.value || ''}
                onChange={(e) => updateStepData({ value: e.target.value })}
                placeholder="Enter your response..."
                className="w-full h-32 px-4 py-3 border border-warm-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              />
            </div>
          )}

          {currentStep.type === 'options' && (
            <div className="space-y-4">
              {session.options.map((option) => (
                <div
                  key={option.id}
                  className="flex items-center gap-4 p-4 bg-warm-50 rounded-xl"
                >
                  <span className="flex-1 text-warm-800">{option.name}</span>
                  <button
                    onClick={() => removeOption(option.id)}
                    className="p-2 text-warm-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={optionInput}
                  onChange={(e) => setOptionInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
                  placeholder="Add an option..."
                  className="flex-1 px-4 py-3 border border-warm-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <AccentButton onClick={handleAddOption} icon={<Plus className="w-4 h-4" />}>
                  Add
                </AccentButton>
              </div>
            </div>
          )}

          {currentStep.type === 'scoring' && (
            <div className="space-y-4">
              {session.options.map((option) => (
                <div key={option.id} className="p-4 bg-warm-50 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-warm-800">{option.name}</span>
                    <span className="text-teal-600 font-semibold">
                      {option.scores[currentStep.id] || 0}/10
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={option.scores[currentStep.id] || 0}
                    onChange={(e) =>
                      updateOptionScore(option.id, currentStep.id, parseInt(e.target.value))
                    }
                    className="w-full h-2 bg-warm-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-teal-500"
                  />
                </div>
              ))}
            </div>
          )}

          {currentStep.type === 'analysis' && (
            <div className="space-y-4">
              {session.frameworkType === 'regret_minimization' && (
                <div className="p-4 bg-teal-50 border border-teal-100 rounded-xl">
                  <p className="text-sm text-teal-700">
                    Imagine yourself at age 80, looking back. Which choice would you regret NOT making?
                  </p>
                </div>
              )}
              {session.frameworkType === 'type1_type2' && (
                <div className="space-y-2">
                  {calculateType1Type2() && (
                    <div className={`p-4 rounded-xl ${
                      calculateType1Type2()?.decisionType === 'type1'
                        ? 'bg-amber-50 border border-amber-100'
                        : 'bg-teal-50 border border-teal-100'
                    }`}>
                      <p className="font-medium">
                        {calculateType1Type2()?.decisionType === 'type1'
                          ? 'Type 1 Decision (Irreversible)'
                          : 'Type 2 Decision (Reversible)'}
                      </p>
                      <p className="text-sm mt-1 text-warm-600">
                        {calculateType1Type2()?.recommendation}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {currentStep.type === 'result' && session.result && (
            <div className="space-y-4">
              <div className="p-6 bg-teal-50 border border-teal-100 rounded-xl">
                <h3 className="font-medium text-teal-900 mb-2">Recommendation</h3>
                <p className="text-lg text-teal-800">{session.result.recommendation}</p>
                <p className="text-sm text-teal-600 mt-2">
                  Confidence: {(session.result.confidence * 100).toFixed(0)}%
                </p>
              </div>

              {session.result.reasoning.length > 0 && (
                <div className="p-4 bg-warm-50 rounded-xl">
                  <h4 className="font-medium text-warm-900 mb-2">Reasoning</h4>
                  <ul className="space-y-1">
                    {session.result.reasoning.map((reason, i) => (
                      <li key={i} className="text-sm text-warm-600 flex items-start gap-2">
                        <span className="text-teal-500">•</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bias Warnings */}
        {biases.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800">Potential Bias Detected</h4>
                <ul className="mt-2 space-y-1">
                  {biases.map((bias, i) => (
                    <li key={i} className="text-sm text-amber-700">
                      <strong>{bias.type}:</strong> {bias.suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <MinimalButton
            onClick={previousStep}
            disabled={session.currentStep === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </MinimalButton>

          <div className="flex items-center gap-3">
            {session.currentStep === session.steps.length - 1 ? (
              <>
                <MinimalButton onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </MinimalButton>
                <AccentButton onClick={resetSession}>
                  New Decision
                </AccentButton>
              </>
            ) : (
              <AccentButton
                onClick={() => {
                  completeStep();
                  if (session.currentStep === session.steps.length - 2) {
                    generateResult();
                  }
                }}
                loading={isProcessing}
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </AccentButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DecisionWizard;
