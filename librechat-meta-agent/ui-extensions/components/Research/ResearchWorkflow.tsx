'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useResearch, ResearchSession, ResearchConfig, ResearchScope } from '@/hooks/useResearch';
import { SourcePanel } from './SourcePanel';
import { CitationManager } from './CitationManager';

// Icons
const Icons = {
  ArrowLeft: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  ArrowRight: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  Check: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Search: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Globe: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Academic: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  News: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
    </svg>
  ),
  Zap: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  Target: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Layers: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  ),
  Play: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Pause: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

interface ResearchWorkflowProps {
  onComplete: (session: ResearchSession) => void;
  onCancel: () => void;
}

export function ResearchWorkflow({ onComplete, onCancel }: ResearchWorkflowProps) {
  const { startResearch, activeSession, pauseResearch, resumeResearch } = useResearch();

  const [step, setStep] = useState(1);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<ResearchScope[]>(['web', 'academic', 'news']);
  const [depth, setDepth] = useState<'quick' | 'standard' | 'deep'>('standard');
  const [isResearching, setIsResearching] = useState(false);

  const totalSteps = 4;

  // Handle research completion
  useEffect(() => {
    if (activeSession?.status === 'completed') {
      onComplete(activeSession);
    }
  }, [activeSession?.status, onComplete]);

  const handleStartResearch = async () => {
    if (!query.trim()) return;

    setIsResearching(true);
    setStep(5); // Progress view

    const config: ResearchConfig = {
      depth,
      scope,
      citationStyle: 'apa',
      maxSources: depth === 'quick' ? 10 : depth === 'standard' ? 25 : 50,
    };

    await startResearch(query, config);
  };

  const canProceed = () => {
    switch (step) {
      case 1: return query.trim().length >= 10;
      case 2: return scope.length > 0;
      case 3: return true;
      case 4: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < 4 && canProceed()) {
      setStep(step + 1);
    } else if (step === 4) {
      handleStartResearch();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const toggleScope = (s: ResearchScope) => {
    setScope(prev =>
      prev.includes(s)
        ? prev.filter(x => x !== s)
        : [...prev, s]
    );
  };

  // Progress View (Step 5)
  if (isResearching && activeSession) {
    return (
      <ResearchProgress
        session={activeSession}
        onPause={pauseResearch}
        onResume={resumeResearch}
        onCancel={onCancel}
      />
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onCancel}
            className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Icons.ArrowLeft />
            <span>Back</span>
          </button>
          <div className="text-sm text-[var(--text-tertiary)]">
            Step {step} of {totalSteps}
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-12 px-4">
          {[1, 2, 3, 4].map((s) => (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    s < step
                      ? 'bg-cyan-500 text-white'
                      : s === step
                      ? 'bg-cyan-500/20 text-cyan-400 border-2 border-cyan-500'
                      : 'bg-[var(--bg-2)] text-[var(--text-tertiary)] border border-[var(--border-light)]'
                  }`}
                >
                  {s < step ? <Icons.Check /> : s}
                </div>
                <span className={`text-xs mt-2 ${s === step ? 'text-cyan-400 font-medium' : 'text-[var(--text-tertiary)]'}`}>
                  {s === 1 ? 'Topic' : s === 2 ? 'Scope' : s === 3 ? 'Depth' : 'Review'}
                </span>
              </div>
              {s < 4 && (
                <div className={`flex-1 h-0.5 mx-2 ${s < step ? 'bg-cyan-500' : 'bg-[var(--border-light)]'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-[var(--bg-1)] border border-[var(--border-light)] rounded-2xl p-8">
          {step === 1 && (
            <StepTopic query={query} onQueryChange={setQuery} />
          )}
          {step === 2 && (
            <StepScope scope={scope} onToggleScope={toggleScope} />
          )}
          {step === 3 && (
            <StepDepth depth={depth} onDepthChange={setDepth} />
          )}
          {step === 4 && (
            <StepReview query={query} scope={scope} depth={depth} />
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              step === 1
                ? 'opacity-50 cursor-not-allowed text-[var(--text-tertiary)]'
                : 'bg-[var(--bg-1)] text-[var(--text-secondary)] hover:bg-[var(--bg-2)] border border-[var(--border-light)]'
            }`}
          >
            <Icons.ArrowLeft />
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
              canProceed()
                ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-600 hover:to-teal-600 shadow-lg shadow-cyan-500/25'
                : 'bg-[var(--bg-2)] text-[var(--text-tertiary)] cursor-not-allowed'
            }`}
          >
            {step === 4 ? (
              <>
                <Icons.Play />
                Start Research
              </>
            ) : (
              <>
                Continue
                <Icons.ArrowRight />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Step 1: Define Topic
function StepTopic({ query, onQueryChange }: { query: string; onQueryChange: (q: string) => void }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
          <Icons.Search />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            What do you want to research?
          </h2>
          <p className="text-[var(--text-secondary)]">
            Enter a detailed question or topic for comprehensive research
          </p>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="e.g., What are the latest developments in quantum computing and their potential impact on cryptography?"
        className="w-full h-40 p-4 bg-[var(--bg-2)] border border-[var(--border-light)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
      />

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className={`${query.length >= 10 ? 'text-green-400' : 'text-[var(--text-tertiary)]'}`}>
          {query.length} characters (minimum 10)
        </span>
        <div className="flex gap-2">
          {['Quantum computing', 'AI in healthcare', 'Climate solutions'].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => onQueryChange(suggestion)}
              className="px-3 py-1 bg-[var(--bg-2)] text-[var(--text-secondary)] rounded-lg text-xs hover:bg-[var(--bg-3)] transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Step 2: Set Scope
function StepScope({ scope, onToggleScope }: { scope: ResearchScope[]; onToggleScope: (s: ResearchScope) => void }) {
  const scopes: { id: ResearchScope; label: string; description: string; icon: React.ReactNode }[] = [
    { id: 'web', label: 'Web Search', description: 'General web pages, blogs, and articles', icon: <Icons.Globe /> },
    { id: 'academic', label: 'Academic Papers', description: 'Peer-reviewed research and journals', icon: <Icons.Academic /> },
    { id: 'news', label: 'News Articles', description: 'Recent news and current events', icon: <Icons.News /> },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
          <Icons.Target />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            Select research scope
          </h2>
          <p className="text-[var(--text-secondary)]">
            Choose which types of sources to search
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {scopes.map((s) => (
          <button
            key={s.id}
            onClick={() => onToggleScope(s.id)}
            className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left ${
              scope.includes(s.id)
                ? 'border-cyan-500 bg-cyan-500/10'
                : 'border-[var(--border-light)] bg-[var(--bg-2)] hover:border-[var(--border-medium)]'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              scope.includes(s.id) ? 'bg-cyan-500/20 text-cyan-400' : 'bg-[var(--bg-3)] text-[var(--text-tertiary)]'
            }`}>
              {s.icon}
            </div>
            <div className="flex-1">
              <div className={`font-semibold ${scope.includes(s.id) ? 'text-cyan-400' : 'text-[var(--text-primary)]'}`}>
                {s.label}
              </div>
              <div className="text-sm text-[var(--text-secondary)]">
                {s.description}
              </div>
            </div>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
              scope.includes(s.id) ? 'border-cyan-500 bg-cyan-500' : 'border-[var(--border-light)]'
            }`}>
              {scope.includes(s.id) && <Icons.Check />}
            </div>
          </button>
        ))}
      </div>

      {scope.length === 0 && (
        <p className="mt-4 text-sm text-red-400">
          Please select at least one source type
        </p>
      )}
    </div>
  );
}

// Step 3: Configure Depth
function StepDepth({ depth, onDepthChange }: { depth: 'quick' | 'standard' | 'deep'; onDepthChange: (d: 'quick' | 'standard' | 'deep') => void }) {
  const depths = [
    {
      id: 'quick' as const,
      label: 'Quick Search',
      description: '10 sources, ~2 minutes',
      icon: <Icons.Zap />,
      color: 'green',
      sources: 10,
      time: '1-2 min',
    },
    {
      id: 'standard' as const,
      label: 'Standard Research',
      description: '25 sources, ~5 minutes',
      icon: <Icons.Target />,
      color: 'cyan',
      sources: 25,
      time: '3-5 min',
      recommended: true,
    },
    {
      id: 'deep' as const,
      label: 'Deep Dive',
      description: '50 sources, ~10 minutes',
      icon: <Icons.Layers />,
      color: 'purple',
      sources: 50,
      time: '8-12 min',
    },
  ];

  const getColorClasses = (d: typeof depths[0], isSelected: boolean) => {
    const colors: Record<string, string> = {
      green: isSelected ? 'border-green-500 bg-green-500/10' : '',
      cyan: isSelected ? 'border-cyan-500 bg-cyan-500/10' : '',
      purple: isSelected ? 'border-purple-500 bg-purple-500/10' : '',
    };
    const iconColors: Record<string, string> = {
      green: isSelected ? 'bg-green-500/20 text-green-400' : 'bg-[var(--bg-3)] text-[var(--text-tertiary)]',
      cyan: isSelected ? 'bg-cyan-500/20 text-cyan-400' : 'bg-[var(--bg-3)] text-[var(--text-tertiary)]',
      purple: isSelected ? 'bg-purple-500/20 text-purple-400' : 'bg-[var(--bg-3)] text-[var(--text-tertiary)]',
    };
    return { border: colors[d.color], icon: iconColors[d.color] };
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-green-400">
          <Icons.Layers />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            Research depth
          </h2>
          <p className="text-[var(--text-secondary)]">
            Choose how thorough the research should be
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {depths.map((d) => {
          const isSelected = depth === d.id;
          const colors = getColorClasses(d, isSelected);

          return (
            <button
              key={d.id}
              onClick={() => onDepthChange(d.id)}
              className={`w-full p-5 rounded-xl border-2 transition-all flex items-center gap-4 text-left relative ${
                isSelected
                  ? colors.border
                  : 'border-[var(--border-light)] bg-[var(--bg-2)] hover:border-[var(--border-medium)]'
              }`}
            >
              {d.recommended && (
                <span className="absolute -top-2 right-4 px-2 py-0.5 bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-xs font-semibold rounded-full">
                  Recommended
                </span>
              )}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors.icon}`}>
                {d.icon}
              </div>
              <div className="flex-1">
                <div className={`font-semibold text-lg ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-primary)]'}`}>
                  {d.label}
                </div>
                <div className="text-sm text-[var(--text-secondary)]">
                  {d.description}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[var(--text-primary)]">{d.sources}</div>
                <div className="text-xs text-[var(--text-tertiary)]">sources</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Step 4: Review and Start
function StepReview({ query, scope, depth }: { query: string; scope: ResearchScope[]; depth: 'quick' | 'standard' | 'deep' }) {
  const scopeLabels = {
    web: 'Web',
    academic: 'Academic',
    news: 'News',
  };

  const depthConfig = {
    quick: { label: 'Quick Search', sources: 10, time: '1-2 min' },
    standard: { label: 'Standard Research', sources: 25, time: '3-5 min' },
    deep: { label: 'Deep Dive', sources: 50, time: '8-12 min' },
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400">
          <Icons.Check />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            Ready to start
          </h2>
          <p className="text-[var(--text-secondary)]">
            Review your research configuration
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Query */}
        <div className="p-4 bg-[var(--bg-2)] rounded-xl">
          <div className="text-xs uppercase tracking-wide text-[var(--text-tertiary)] mb-2">Research Topic</div>
          <p className="text-[var(--text-primary)] font-medium">{query}</p>
        </div>

        {/* Scope and Depth */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-[var(--bg-2)] rounded-xl">
            <div className="text-xs uppercase tracking-wide text-[var(--text-tertiary)] mb-2">Scope</div>
            <div className="flex flex-wrap gap-2">
              {scope.map((s) => (
                <span key={s} className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-sm font-medium">
                  {scopeLabels[s]}
                </span>
              ))}
            </div>
          </div>
          <div className="p-4 bg-[var(--bg-2)] rounded-xl">
            <div className="text-xs uppercase tracking-wide text-[var(--text-tertiary)] mb-2">Depth</div>
            <p className="text-[var(--text-primary)] font-medium">{depthConfig[depth].label}</p>
            <p className="text-sm text-[var(--text-tertiary)]">
              {depthConfig[depth].sources} sources, ~{depthConfig[depth].time}
            </p>
          </div>
        </div>

        {/* Estimated Results */}
        <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border border-cyan-500/20 rounded-xl">
          <div className="text-sm text-cyan-400 font-medium mb-1">What you'll get:</div>
          <ul className="text-sm text-[var(--text-secondary)] space-y-1">
            <li>- Comprehensive research report with citations</li>
            <li>- Verified facts from multiple sources</li>
            <li>- Knowledge graph of key entities and relationships</li>
            <li>- Contradiction detection and confidence scores</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Research Progress View
interface ResearchProgressProps {
  session: ResearchSession;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

function ResearchProgress({ session, onPause, onResume, onCancel }: ResearchProgressProps) {
  const [showSources, setShowSources] = useState(true);
  const isPaused = session.status === 'paused';

  const stages = [
    { id: 'researching', label: 'Searching Sources', icon: <Icons.Search /> },
    { id: 'analyzing', label: 'Analyzing Content', icon: <Icons.Target /> },
    { id: 'synthesizing', label: 'Generating Report', icon: <Icons.Layers /> },
  ];

  const currentStageIndex = stages.findIndex(s => s.id === session.status);

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
              Research in Progress
            </h1>
            <p className="text-[var(--text-secondary)] line-clamp-1">
              {session.query}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={isPaused ? onResume : onPause}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-1)] border border-[var(--border-light)] rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-2)] transition-colors"
            >
              {isPaused ? <Icons.Play /> : <Icons.Pause />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Progress Timeline */}
        <div className="bg-[var(--bg-1)] border border-[var(--border-light)] rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            {stages.map((stage, index) => {
              const isCompleted = index < currentStageIndex;
              const isCurrent = index === currentStageIndex;

              return (
                <React.Fragment key={stage.id}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : isCurrent
                          ? 'bg-cyan-500/20 text-cyan-400 border-2 border-cyan-500 animate-pulse'
                          : 'bg-[var(--bg-2)] text-[var(--text-tertiary)]'
                      }`}
                    >
                      {isCompleted ? <Icons.Check /> : stage.icon}
                    </div>
                    <span className={`text-sm mt-3 font-medium ${
                      isCurrent ? 'text-cyan-400' : isCompleted ? 'text-green-400' : 'text-[var(--text-tertiary)]'
                    }`}>
                      {stage.label}
                    </span>
                  </div>
                  {index < stages.length - 1 && (
                    <div className={`flex-1 h-1 mx-4 rounded-full ${
                      isCompleted ? 'bg-green-500' : 'bg-[var(--border-light)]'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Sources Found"
            value={session.stats.sourcesSearched}
            color="cyan"
            animate={session.status === 'researching'}
          />
          <StatCard
            label="Sources Used"
            value={session.stats.sourcesUsed}
            color="green"
          />
          <StatCard
            label="Facts Extracted"
            value={session.stats.factsExtracted}
            color="purple"
            animate={session.status === 'analyzing'}
          />
          <StatCard
            label="Contradictions"
            value={session.stats.contradictionsFound}
            color="red"
          />
        </div>

        {/* Sources Panel Toggle */}
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setShowSources(true)}
            className={`px-4 py-2 rounded-xl font-medium transition-colors ${
              showSources ? 'bg-cyan-500/20 text-cyan-400' : 'bg-[var(--bg-1)] text-[var(--text-secondary)]'
            }`}
          >
            Sources ({session.sources.length})
          </button>
          <button
            onClick={() => setShowSources(false)}
            className={`px-4 py-2 rounded-xl font-medium transition-colors ${
              !showSources ? 'bg-cyan-500/20 text-cyan-400' : 'bg-[var(--bg-1)] text-[var(--text-secondary)]'
            }`}
          >
            Citations ({session.sources.length})
          </button>
        </div>

        {/* Content Panel */}
        {showSources ? (
          <SourcePanel
            sources={session.sources}
            onToggleSource={() => {}}
            onViewSource={(url) => window.open(url, '_blank')}
          />
        ) : (
          <CitationManager
            sources={session.sources}
            citationStyle="apa"
            onStyleChange={() => {}}
          />
        )}
      </div>
    </div>
  );
}

// Stat Card
function StatCard({ label, value, color, animate = false }: {
  label: string;
  value: number;
  color: 'cyan' | 'green' | 'purple' | 'red';
  animate?: boolean;
}) {
  const colorClasses = {
    cyan: 'from-cyan-500 to-cyan-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    red: 'from-red-500 to-red-600',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-5 text-white shadow-lg relative overflow-hidden`}>
      {animate && (
        <div className="absolute inset-0 bg-white/10 animate-pulse" />
      )}
      <div className="text-3xl font-bold mb-1">{value.toLocaleString()}</div>
      <div className="text-sm opacity-90">{label}</div>
    </div>
  );
}

export default ResearchWorkflow;
