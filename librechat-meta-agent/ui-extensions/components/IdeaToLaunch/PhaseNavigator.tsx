'use client';

import React from 'react';
import {
  Search,
  Lightbulb,
  FileText,
  ClipboardList,
  Code,
  Rocket,
  Check,
  Lock,
  Circle,
  ChevronRight,
} from 'lucide-react';

type ProjectPhase =
  | 'discovery'
  | 'ideation'
  | 'specification'
  | 'planning'
  | 'implementation'
  | 'launch';

type PhaseStatus = 'locked' | 'active' | 'completed' | 'skipped';

interface PhaseData {
  phase: ProjectPhase;
  status: PhaseStatus;
  gate_status?: string;
}

interface PhaseNavigatorProps {
  phases: PhaseData[];
  currentPhase: ProjectPhase;
  onPhaseSelect: (phase: ProjectPhase) => void;
}

const PHASE_CONFIG: Record<
  ProjectPhase,
  { icon: React.ElementType; label: string; color: string }
> = {
  discovery: {
    icon: Search,
    label: 'Discovery',
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30',
  },
  ideation: {
    icon: Lightbulb,
    label: 'Ideation',
    color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/30',
  },
  specification: {
    icon: FileText,
    label: 'Specification',
    color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/30',
  },
  planning: {
    icon: ClipboardList,
    label: 'Planning',
    color: 'text-green-500 bg-green-50 dark:bg-green-900/30',
  },
  implementation: {
    icon: Code,
    label: 'Implementation',
    color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/30',
  },
  launch: {
    icon: Rocket,
    label: 'Launch',
    color: 'text-red-500 bg-red-50 dark:bg-red-900/30',
  },
};

const PHASE_ORDER: ProjectPhase[] = [
  'discovery',
  'ideation',
  'specification',
  'planning',
  'implementation',
  'launch',
];

export function PhaseNavigator({
  phases,
  currentPhase,
  onPhaseSelect,
}: PhaseNavigatorProps) {
  const getPhaseData = (phase: ProjectPhase): PhaseData | undefined => {
    return phases.find((p) => p.phase === phase);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
        Project Phases
      </h3>

      <div className="space-y-1">
        {PHASE_ORDER.map((phase, index) => {
          const config = PHASE_CONFIG[phase];
          const phaseData = getPhaseData(phase);
          const status = phaseData?.status || 'locked';
          const isActive = currentPhase === phase;
          const Icon = config.icon;

          const isClickable = status !== 'locked';

          return (
            <div key={phase}>
              <button
                onClick={() => isClickable && onPhaseSelect(phase)}
                disabled={!isClickable}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                  isActive
                    ? config.color
                    : status === 'completed'
                    ? 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                    : status === 'locked'
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                {/* Status Indicator */}
                <div
                  className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    status === 'completed'
                      ? 'bg-green-100 dark:bg-green-900/50'
                      : status === 'active'
                      ? 'bg-indigo-100 dark:bg-indigo-900/50'
                      : status === 'skipped'
                      ? 'bg-gray-100 dark:bg-gray-700'
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                >
                  {status === 'completed' ? (
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                  ) : status === 'locked' ? (
                    <Lock className="w-4 h-4 text-gray-400" />
                  ) : status === 'skipped' ? (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Circle
                      className={`w-4 h-4 ${
                        isActive
                          ? 'text-indigo-600 fill-current'
                          : 'text-gray-400'
                      }`}
                    />
                  )}
                </div>

                {/* Phase Info */}
                <div className="flex-1 text-left">
                  <div
                    className={`font-medium ${
                      isActive
                        ? 'text-gray-900 dark:text-white'
                        : status === 'locked'
                        ? 'text-gray-400 dark:text-gray-500'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {config.label}
                  </div>
                  {status === 'completed' && (
                    <div className="text-xs text-green-600 dark:text-green-400">
                      Completed
                    </div>
                  )}
                  {status === 'skipped' && (
                    <div className="text-xs text-gray-400">Skipped</div>
                  )}
                </div>

                {/* Phase Icon */}
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive
                      ? 'text-current'
                      : status === 'locked'
                      ? 'text-gray-300 dark:text-gray-600'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                />
              </button>

              {/* Connector Line */}
              {index < PHASE_ORDER.length - 1 && (
                <div className="ml-7 h-2 border-l-2 border-dashed border-gray-200 dark:border-gray-700" />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Progress</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {phases.filter((p) => p.status === 'completed').length}/
            {phases.length} phases
          </span>
        </div>
        <div className="mt-2 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{
              width: `${
                (phases.filter((p) => p.status === 'completed').length /
                  phases.length) *
                100
              }%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default PhaseNavigator;
