'use client';

import React, { useState } from 'react';
import {
  FileText,
  MessageSquare,
  Wand2,
  Check,
  ChevronRight,
  AlertCircle,
  Sparkles,
  Edit3,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';

type ProjectPhase =
  | 'discovery'
  | 'ideation'
  | 'specification'
  | 'planning'
  | 'implementation'
  | 'launch';

interface PhaseInput {
  id: string;
  name: string;
  description?: string;
  input_type: string;
  options?: string[];
  required: boolean;
  placeholder?: string;
  ai_assisted: boolean;
}

interface PhaseOutput {
  id: string;
  name: string;
  description?: string;
  output_type: string;
  format: string;
}

interface GateCriterion {
  id: string;
  name: string;
  description?: string;
  criterion_type: string;
  required: boolean;
}

interface PhaseArtifact {
  id: string;
  output_id: string;
  name: string;
  content: string;
  format: string;
  version: number;
  generated_by: string;
  created_at: string;
}

interface PhaseTemplate {
  phase: ProjectPhase;
  name: string;
  description: string;
  required_inputs: PhaseInput[];
  expected_outputs: PhaseOutput[];
  gate_criteria: GateCriterion[];
}

interface PhaseData {
  phase: ProjectPhase;
  status: string;
  inputs: Record<string, any>;
  outputs: PhaseArtifact[];
  gate_status: string;
}

interface PhaseViewProps {
  template: PhaseTemplate;
  data: PhaseData;
  onInputChange: (inputId: string, value: any) => void;
  onGenerateArtifact: (outputId: string) => void;
  onViewArtifact: (artifactId: string) => void;
  onEditArtifact: (artifactId: string) => void;
  onAdvancePhase: () => void;
  onAIAssist: (inputId: string) => void;
  isGenerating?: boolean;
}

export function PhaseView({
  template,
  data,
  onInputChange,
  onGenerateArtifact,
  onViewArtifact,
  onEditArtifact,
  onAdvancePhase,
  onAIAssist,
  isGenerating = false,
}: PhaseViewProps) {
  const [activeTab, setActiveTab] = useState<'inputs' | 'outputs' | 'gate'>(
    'inputs'
  );

  const getArtifactForOutput = (outputId: string): PhaseArtifact | undefined => {
    return data.outputs?.find((a) => a.output_id === outputId);
  };

  const isGateReady = (): boolean => {
    // Check if required criteria are met
    const requiredCriteria = template.gate_criteria.filter((c) => c.required);

    for (const criterion of requiredCriteria) {
      if (criterion.criterion_type === 'artifact_exists') {
        // Check if all expected outputs have artifacts
        const missingArtifacts = template.expected_outputs.filter(
          (o) => !getArtifactForOutput(o.id)
        );
        if (missingArtifacts.length > 0) return false;
      }
      if (criterion.criterion_type === 'checklist') {
        // For now, assume checklist items need to be checked
        // This would be tracked in a separate state
      }
    }

    return true;
  };

  const allRequiredInputsFilled = (): boolean => {
    const required = template.required_inputs.filter((i) => i.required);
    return required.every((input) => {
      const value = data.inputs?.[input.id];
      return value !== undefined && value !== '' && value !== null;
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Phase Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {template.name}
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          {template.description}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('inputs')}
          className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'inputs'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Edit3 className="w-4 h-4" />
            Inputs
            {!allRequiredInputsFilled() && (
              <span className="w-2 h-2 bg-amber-500 rounded-full" />
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('outputs')}
          className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'outputs'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <FileText className="w-4 h-4" />
            Artifacts
            <span className="text-xs text-gray-400">
              ({data.outputs?.length || 0}/{template.expected_outputs.length})
            </span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('gate')}
          className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'gate'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Gate Review
          </div>
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* Inputs Tab */}
        {activeTab === 'inputs' && (
          <div className="space-y-6">
            {template.required_inputs.map((input) => (
              <div key={input.id}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {input.name}
                  {input.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </label>

                {input.description && (
                  <p className="text-xs text-gray-500 mb-2">
                    {input.description}
                  </p>
                )}

                <div className="relative">
                  {input.input_type === 'textarea' ? (
                    <textarea
                      value={data.inputs?.[input.id] || ''}
                      onChange={(e) => onInputChange(input.id, e.target.value)}
                      placeholder={input.placeholder}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    />
                  ) : input.input_type === 'select' ? (
                    <select
                      value={data.inputs?.[input.id] || ''}
                      onChange={(e) => onInputChange(input.id, e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">Select...</option>
                      {input.options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : input.input_type === 'multi_select' ? (
                    <div className="flex flex-wrap gap-2">
                      {input.options?.map((opt) => {
                        const selected = (
                          data.inputs?.[input.id] || []
                        ).includes(opt);
                        return (
                          <button
                            key={opt}
                            onClick={() => {
                              const current = data.inputs?.[input.id] || [];
                              const updated = selected
                                ? current.filter((v: string) => v !== opt)
                                : [...current, opt];
                              onInputChange(input.id, updated);
                            }}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                              selected
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={data.inputs?.[input.id] || ''}
                      onChange={(e) => onInputChange(input.id, e.target.value)}
                      placeholder={input.placeholder}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  )}

                  {/* AI Assist Button */}
                  {input.ai_assisted && (
                    <button
                      onClick={() => onAIAssist(input.id)}
                      className="absolute right-2 top-2 p-1.5 text-gray-400 hover:text-indigo-500 transition-colors"
                      title="AI Assist"
                    >
                      <Wand2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {template.required_inputs.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No inputs required for this phase. Proceed to artifacts.
              </div>
            )}
          </div>
        )}

        {/* Outputs Tab */}
        {activeTab === 'outputs' && (
          <div className="space-y-4">
            {template.expected_outputs.map((output) => {
              const artifact = getArtifactForOutput(output.id);

              return (
                <div
                  key={output.id}
                  className={`p-4 rounded-lg border ${
                    artifact
                      ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {output.name}
                        </h4>
                        {artifact && (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <Check className="w-3 h-3" />
                            Created
                          </span>
                        )}
                      </div>
                      {output.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                          {output.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                          {output.format}
                        </span>
                        <span>{output.output_type}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {artifact ? (
                        <>
                          <button
                            onClick={() => onViewArtifact(artifact.id)}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEditArtifact(artifact.id)}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => onGenerateArtifact(output.id)}
                          disabled={isGenerating || !allRequiredInputsFilled()}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isGenerating || !allRequiredInputsFilled()
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-300'
                          }`}
                        >
                          <Sparkles className="w-4 h-4" />
                          {isGenerating ? 'Generating...' : 'Generate with AI'}
                        </button>
                      )}
                    </div>
                  </div>

                  {artifact && (
                    <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(artifact.created_at).toLocaleDateString()}
                        </span>
                        <span>v{artifact.version}</span>
                        <span className="capitalize">
                          {artifact.generated_by}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Gate Tab */}
        {activeTab === 'gate' && (
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                Gate Criteria
              </h4>
              <div className="space-y-3">
                {template.gate_criteria.map((criterion) => {
                  // Determine if criterion is met
                  let isMet = false;

                  if (criterion.criterion_type === 'artifact_exists') {
                    isMet =
                      template.expected_outputs.every((o) =>
                        getArtifactForOutput(o.id)
                      );
                  }

                  return (
                    <div
                      key={criterion.id}
                      className="flex items-center gap-3"
                    >
                      {isMet ? (
                        <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-300 dark:text-gray-600 shrink-0" />
                      )}
                      <div>
                        <p
                          className={`text-sm ${
                            isMet
                              ? 'text-gray-900 dark:text-white'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {criterion.name}
                          {criterion.required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </p>
                        {criterion.description && (
                          <p className="text-xs text-gray-400">
                            {criterion.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Advance Button */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                {!isGateReady() && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Complete all required criteria to advance
                  </p>
                )}
              </div>
              <button
                onClick={onAdvancePhase}
                disabled={!isGateReady()}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
                  isGateReady()
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Advance to Next Phase
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PhaseView;
