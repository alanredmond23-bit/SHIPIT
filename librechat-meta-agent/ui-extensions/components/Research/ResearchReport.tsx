'use client';

import React, { useState, useRef } from 'react';
import { ResearchSession } from '@/hooks/useResearch';
import { CitationManager, CitationStyle } from './CitationManager';
import { SourcePanel } from './SourcePanel';

// Icons
const Icons = {
  ArrowLeft: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  Download: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  Share: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  ),
  Copy: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Plus: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  List: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  ),
  ExternalLink: () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
  Warning: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
};

interface ResearchReportProps {
  session: ResearchSession;
  onBack: () => void;
  onNewResearch: () => void;
}

type TabType = 'report' | 'sources' | 'citations';

export function ResearchReport({ session, onBack, onNewResearch }: ResearchReportProps) {
  const [activeTab, setActiveTab] = useState<TabType>('report');
  const [citationStyle, setCitationStyle] = useState<CitationStyle>('apa');
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleCopyReport = async () => {
    if (!session.report) return;

    const reportText = generateReportText(session);
    await navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async (format: 'pdf' | 'md' | 'docx') => {
    const reportText = generateReportText(session);

    if (format === 'md') {
      const blob = new Blob([reportText], { type: 'text/markdown' });
      downloadBlob(blob, `research-report.md`);
    } else if (format === 'pdf') {
      // In production, this would use a PDF library
      alert('PDF export would be implemented with a PDF library like jsPDF or react-pdf');
    } else {
      // In production, this would use a DOCX library
      alert('DOCX export would be implemented with a library like docx');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: session.report?.title || session.query,
          text: session.report?.abstract || 'Research Report',
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
    }
  };

  const sections = session.report?.sections || [];

  return (
    <div className="min-h-screen bg-[var(--bg-0)]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--bg-0)]/95 backdrop-blur-lg border-b border-[var(--border-light)]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <Icons.ArrowLeft />
              <span>Back to Research</span>
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCopyReport}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-1)] border border-[var(--border-light)] rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-2)] transition-colors"
              >
                {copied ? <Icons.Check /> : <Icons.Copy />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-1)] border border-[var(--border-light)] rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-2)] transition-colors"
              >
                <Icons.Share />
                Share
              </button>
              <div className="relative group">
                <button className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-xl hover:bg-cyan-500/30 transition-colors">
                  <Icons.Download />
                  Export
                </button>
                <div className="absolute right-0 top-full mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all bg-[var(--bg-1)] border border-[var(--border-light)] rounded-xl shadow-xl overflow-hidden min-w-[120px]">
                  <button
                    onClick={() => handleExport('md')}
                    className="w-full px-4 py-2.5 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-2)] transition-colors"
                  >
                    Markdown
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="w-full px-4 py-2.5 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-2)] transition-colors"
                  >
                    PDF
                  </button>
                  <button
                    onClick={() => handleExport('docx')}
                    className="w-full px-4 py-2.5 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-2)] transition-colors"
                  >
                    Word
                  </button>
                </div>
              </div>
              <button
                onClick={onNewResearch}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl font-medium hover:from-cyan-600 hover:to-teal-600 transition-all"
              >
                <Icons.Plus />
                New Research
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-[var(--bg-1)] p-1 rounded-xl w-fit">
            {(['report', 'sources', 'citations'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-[var(--bg-0)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'sources' && (
                  <span className="ml-2 px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded-full">
                    {session.sources.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'report' && (
          <ReportContent
            session={session}
            sections={sections}
            activeSection={activeSection}
            onScrollToSection={scrollToSection}
            reportRef={reportRef}
          />
        )}

        {activeTab === 'sources' && (
          <SourcePanel
            sources={session.sources}
            onToggleSource={() => {}}
            onViewSource={(url) => window.open(url, '_blank')}
          />
        )}

        {activeTab === 'citations' && (
          <CitationManager
            sources={session.sources}
            citationStyle={citationStyle}
            onStyleChange={setCitationStyle}
          />
        )}
      </div>
    </div>
  );
}

// Report Content Component
interface ReportContentProps {
  session: ResearchSession;
  sections: { title: string; content: string; citations?: string[] }[];
  activeSection: string | null;
  onScrollToSection: (id: string) => void;
  reportRef: React.RefObject<HTMLDivElement>;
}

function ReportContent({ session, sections, activeSection, onScrollToSection, reportRef }: ReportContentProps) {
  const report = session.report;

  if (!report) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-yellow-500/20 flex items-center justify-center text-yellow-400">
          <Icons.Warning />
        </div>
        <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
          Report not ready
        </h3>
        <p className="text-[var(--text-secondary)]">
          The research report is still being generated or was not completed.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-8">
      {/* Section Navigation Sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <div className="sticky top-32">
          <div className="text-xs uppercase tracking-wide text-[var(--text-tertiary)] mb-3 flex items-center gap-2">
            <Icons.List />
            Contents
          </div>
          <nav className="space-y-1">
            <button
              onClick={() => onScrollToSection('abstract')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                activeSection === 'abstract'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-1)]'
              }`}
            >
              Abstract
            </button>
            {sections.map((section, index) => (
              <button
                key={index}
                onClick={() => onScrollToSection(`section-${index}`)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors line-clamp-1 ${
                  activeSection === `section-${index}`
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-1)]'
                }`}
              >
                {section.title}
              </button>
            ))}
            <button
              onClick={() => onScrollToSection('key-findings')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                activeSection === 'key-findings'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-1)]'
              }`}
            >
              Key Findings
            </button>
            <button
              onClick={() => onScrollToSection('bibliography')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                activeSection === 'bibliography'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-1)]'
              }`}
            >
              Bibliography
            </button>
          </nav>

          {/* Stats */}
          <div className="mt-8 p-4 bg-[var(--bg-1)] rounded-xl border border-[var(--border-light)]">
            <div className="text-xs uppercase tracking-wide text-[var(--text-tertiary)] mb-3">
              Research Stats
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Sources</span>
                <span className="text-sm font-semibold text-cyan-400">{session.stats.sourcesUsed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Facts</span>
                <span className="text-sm font-semibold text-purple-400">{session.stats.factsExtracted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Contradictions</span>
                <span className="text-sm font-semibold text-red-400">{session.stats.contradictionsFound}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Duration</span>
                <span className="text-sm font-semibold text-green-400">{formatDuration(session.stats.duration)}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Report */}
      <div ref={reportRef} className="flex-1 max-w-3xl">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
            {report.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-[var(--text-tertiary)]">
            <span>Generated {new Date(report.generatedAt).toLocaleDateString()}</span>
            <span>|</span>
            <span>{session.stats.sourcesUsed} sources</span>
            <span>|</span>
            <span>{session.stats.factsExtracted} facts verified</span>
          </div>
        </div>

        {/* Abstract */}
        <section id="abstract" className="mb-10">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <div className="w-1 h-6 bg-gradient-to-b from-cyan-500 to-teal-500 rounded-full" />
            Abstract
          </h2>
          <div className="p-6 bg-[var(--bg-1)] border border-[var(--border-light)] rounded-xl">
            <p className="text-[var(--text-secondary)] leading-relaxed italic">
              {report.abstract}
            </p>
          </div>
        </section>

        {/* Sections */}
        {sections.map((section, index) => (
          <section key={index} id={`section-${index}`} className="mb-10">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-cyan-500 to-teal-500 rounded-full" />
              {section.title}
            </h2>
            <div className="prose prose-invert max-w-none">
              <MarkdownContent content={section.content} />
            </div>
            {section.citations && section.citations.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {section.citations.map((citation, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-cyan-500/10 text-cyan-400 text-xs rounded-full cursor-pointer hover:bg-cyan-500/20"
                    title={citation}
                  >
                    [{i + 1}]
                  </span>
                ))}
              </div>
            )}
          </section>
        ))}

        {/* Key Findings */}
        <section id="key-findings" className="mb-10">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full" />
            Key Findings
          </h2>
          <div className="space-y-3">
            {report.keyFindings.map((finding, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-4 bg-[var(--bg-1)] border border-[var(--border-light)] rounded-xl"
              >
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-sm font-semibold flex-shrink-0">
                  {index + 1}
                </div>
                <p className="text-[var(--text-secondary)]">{finding}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Limitations */}
        {report.limitations && report.limitations.length > 0 && (
          <section id="limitations" className="mb-10">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-yellow-500 to-orange-500 rounded-full" />
              Limitations
            </h2>
            <div className="p-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <ul className="space-y-2">
                {report.limitations.map((limitation, index) => (
                  <li key={index} className="flex items-start gap-2 text-[var(--text-secondary)]">
                    <span className="text-yellow-400 mt-1">-</span>
                    {limitation}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Bibliography */}
        <section id="bibliography" className="mb-10">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full" />
            Bibliography
          </h2>
          <div className="p-6 bg-[var(--bg-1)] border border-[var(--border-light)] rounded-xl">
            <ol className="space-y-3 list-decimal list-inside">
              {report.bibliography.map((citation, index) => (
                <li key={index} className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {citation}
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </div>
  );
}

// Markdown Content Renderer (simplified)
function MarkdownContent({ content }: { content: string }) {
  // Simple markdown parsing for citations [1], [2], etc.
  const parsedContent = content.replace(/\[(\d+)\]/g, (match, num) => {
    return `<span class="inline-flex items-center justify-center w-5 h-5 bg-cyan-500/20 text-cyan-400 text-xs rounded-full cursor-pointer hover:bg-cyan-500/30" title="Citation ${num}">${num}</span>`;
  });

  return (
    <div
      className="text-[var(--text-secondary)] leading-relaxed"
      dangerouslySetInnerHTML={{ __html: parsedContent }}
    />
  );
}

// Helper functions
function generateReportText(session: ResearchSession): string {
  if (!session.report) return '';

  const { report } = session;
  let text = `# ${report.title}\n\n`;
  text += `## Abstract\n\n${report.abstract}\n\n`;

  for (const section of report.sections) {
    text += `## ${section.title}\n\n${section.content}\n\n`;
  }

  text += `## Key Findings\n\n`;
  for (const finding of report.keyFindings) {
    text += `- ${finding}\n`;
  }

  if (report.limitations && report.limitations.length > 0) {
    text += `\n## Limitations\n\n`;
    for (const limitation of report.limitations) {
      text += `- ${limitation}\n`;
    }
  }

  text += `\n## Bibliography\n\n`;
  for (let i = 0; i < report.bibliography.length; i++) {
    text += `${i + 1}. ${report.bibliography[i]}\n`;
  }

  return text;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return '< 1s';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export default ResearchReport;
