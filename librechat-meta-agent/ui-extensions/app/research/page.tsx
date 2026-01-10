'use client';

import React, { useState, useEffect } from 'react';
import { UnifiedNav, MainContent } from '@/components/Navigation/UnifiedNav';
import { ResearchWorkflow } from '@/components/Research/ResearchWorkflow';
import { ResearchReport } from '@/components/Research/ResearchReport';
import { useResearch, ResearchSession } from '@/hooks/useResearch';

// Icons
const Icons = {
  Plus: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Search: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  CheckCircle: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Loader: () => (
    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Document: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  ArrowRight: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  Filter: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  ),
};

type ViewMode = 'browser' | 'workflow' | 'report';

export default function ResearchPage() {
  const { sessions, loading, error, refreshSessions, deleteSession } = useResearch();
  const [viewMode, setViewMode] = useState<ViewMode>('browser');
  const [selectedSession, setSelectedSession] = useState<ResearchSession | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Filter sessions based on search and status
  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.query.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all'
      ? true
      : statusFilter === 'active'
        ? ['researching', 'analyzing', 'synthesizing'].includes(session.status)
        : session.status === 'completed';
    return matchesSearch && matchesStatus;
  });

  // Separate active and completed sessions
  const activeSessions = filteredSessions.filter(s =>
    ['researching', 'analyzing', 'synthesizing'].includes(s.status)
  );
  const completedSessions = filteredSessions.filter(s => s.status === 'completed');

  const handleNewResearch = () => {
    setViewMode('workflow');
    setSelectedSession(null);
  };

  const handleViewReport = (session: ResearchSession) => {
    setSelectedSession(session);
    setViewMode('report');
  };

  const handleWorkflowComplete = (session: ResearchSession) => {
    refreshSessions();
    setSelectedSession(session);
    setViewMode('report');
  };

  const handleBackToBrowser = () => {
    setViewMode('browser');
    setSelectedSession(null);
  };

  return (
    <>
      <UnifiedNav />
      <MainContent>
        <div className="min-h-screen bg-[var(--bg-0)]">
          {viewMode === 'browser' && (
            <ResearchBrowser
              activeSessions={activeSessions}
              completedSessions={completedSessions}
              searchQuery={searchQuery}
              statusFilter={statusFilter}
              loading={loading}
              onSearchChange={setSearchQuery}
              onStatusFilterChange={setStatusFilter}
              onNewResearch={handleNewResearch}
              onViewReport={handleViewReport}
              onDeleteSession={deleteSession}
            />
          )}

          {viewMode === 'workflow' && (
            <ResearchWorkflow
              onComplete={handleWorkflowComplete}
              onCancel={handleBackToBrowser}
            />
          )}

          {viewMode === 'report' && selectedSession && (
            <ResearchReport
              session={selectedSession}
              onBack={handleBackToBrowser}
              onNewResearch={handleNewResearch}
            />
          )}
        </div>
      </MainContent>
    </>
  );
}

// Research Browser Component
interface ResearchBrowserProps {
  activeSessions: ResearchSession[];
  completedSessions: ResearchSession[];
  searchQuery: string;
  statusFilter: 'all' | 'active' | 'completed';
  loading: boolean;
  onSearchChange: (query: string) => void;
  onStatusFilterChange: (filter: 'all' | 'active' | 'completed') => void;
  onNewResearch: () => void;
  onViewReport: (session: ResearchSession) => void;
  onDeleteSession: (id: string) => void;
}

function ResearchBrowser({
  activeSessions,
  completedSessions,
  searchQuery,
  statusFilter,
  loading,
  onSearchChange,
  onStatusFilterChange,
  onNewResearch,
  onViewReport,
  onDeleteSession,
}: ResearchBrowserProps) {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">
              Deep Research
            </h1>
            <p className="text-[var(--text-secondary)] mt-1">
              AI-powered comprehensive research with multi-source verification
            </p>
          </div>
          <button
            onClick={onNewResearch}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl font-semibold hover:from-cyan-600 hover:to-teal-600 transition-all shadow-lg shadow-cyan-500/25 active:scale-95"
          >
            <Icons.Plus />
            New Research
          </button>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[280px] relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
              <Icons.Search />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search past research..."
              className="w-full pl-12 pr-4 py-3 bg-[var(--bg-1)] border border-[var(--border-light)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'active', 'completed'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => onStatusFilterChange(filter)}
                className={`px-4 py-3 rounded-xl font-medium transition-all ${
                  statusFilter === filter
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-[var(--bg-1)] text-[var(--text-secondary)] border border-[var(--border-light)] hover:bg-[var(--bg-2)]'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Research Sessions */}
      {activeSessions.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            Active Research
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeSessions.map((session) => (
              <ActiveSessionCard
                key={session.id}
                session={session}
                onView={() => onViewReport(session)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Completed Research Sessions */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Icons.CheckCircle />
          Completed Research
        </h2>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : completedSessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedSessions.map((session) => (
              <CompletedSessionCard
                key={session.id}
                session={session}
                onView={() => onViewReport(session)}
                onDelete={() => onDeleteSession(session.id)}
              />
            ))}
          </div>
        ) : (
          <EmptyState onNewResearch={onNewResearch} />
        )}
      </section>
    </div>
  );
}

// Active Session Card
function ActiveSessionCard({ session, onView }: { session: ResearchSession; onView: () => void }) {
  const statusConfig = {
    researching: { label: 'Searching Sources', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
    analyzing: { label: 'Analyzing Content', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
    synthesizing: { label: 'Generating Report', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  };

  const config = statusConfig[session.status as keyof typeof statusConfig] || statusConfig.researching;

  // Calculate progress percentage
  const progressSteps = { researching: 33, analyzing: 66, synthesizing: 90 };
  const progress = progressSteps[session.status as keyof typeof progressSteps] || 0;

  return (
    <div
      onClick={onView}
      className="bg-[var(--bg-1)] border border-[var(--border-light)] rounded-2xl p-5 cursor-pointer hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
          {config.label}
        </div>
        <div className="text-[var(--text-tertiary)]">
          <Icons.Loader />
        </div>
      </div>

      <h3 className="font-semibold text-[var(--text-primary)] mb-2 line-clamp-2 group-hover:text-cyan-400 transition-colors">
        {session.query}
      </h3>

      <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)] mb-4">
        <span className="flex items-center gap-1">
          <Icons.Document />
          {session.stats.sourcesSearched} sources
        </span>
        <span className="flex items-center gap-1">
          <Icons.Clock />
          {formatDuration(session.stats.duration)}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 bg-[var(--bg-2)] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// Completed Session Card
function CompletedSessionCard({
  session,
  onView,
  onDelete,
}: {
  session: ResearchSession;
  onView: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-[var(--bg-1)] border border-[var(--border-light)] rounded-2xl p-5 hover:border-[var(--border-medium)] transition-all group">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs text-[var(--text-tertiary)]">
          {formatDate(session.createdAt)}
        </span>
        <div className="flex items-center gap-1">
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
            Completed
          </span>
        </div>
      </div>

      <h3 className="font-semibold text-[var(--text-primary)] mb-3 line-clamp-2">
        {session.query}
      </h3>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 bg-[var(--bg-2)] rounded-lg">
          <div className="text-lg font-bold text-cyan-400">{session.stats.sourcesUsed}</div>
          <div className="text-xs text-[var(--text-tertiary)]">Sources</div>
        </div>
        <div className="text-center p-2 bg-[var(--bg-2)] rounded-lg">
          <div className="text-lg font-bold text-purple-400">{session.stats.factsExtracted}</div>
          <div className="text-xs text-[var(--text-tertiary)]">Facts</div>
        </div>
        <div className="text-center p-2 bg-[var(--bg-2)] rounded-lg">
          <div className="text-lg font-bold text-green-400">{session.stats.contradictionsFound}</div>
          <div className="text-xs text-[var(--text-tertiary)]">Issues</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onView}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-500/20 text-cyan-400 rounded-xl font-medium hover:bg-cyan-500/30 transition-colors"
        >
          View Report
          <Icons.ArrowRight />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="px-3 py-2.5 bg-[var(--bg-2)] text-[var(--text-tertiary)] rounded-xl hover:bg-red-500/20 hover:text-red-400 transition-colors"
          title="Delete"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Empty State
function EmptyState({ onNewResearch }: { onNewResearch: () => void }) {
  return (
    <div className="text-center py-16 px-6">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center">
        <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
        No research yet
      </h3>
      <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
        Start your first deep research session. Our AI will search multiple sources, verify facts, and generate a comprehensive report.
      </p>
      <button
        onClick={onNewResearch}
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl font-semibold hover:from-cyan-600 hover:to-teal-600 transition-all shadow-lg shadow-cyan-500/25"
      >
        <Icons.Plus />
        Start Research
      </button>
    </div>
  );
}

// Helper functions
function formatDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return '< 1s';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}
