'use client';

import React, { useState, useMemo } from 'react';
import { ResearchSource } from './SourcePanel';

// Icons
const Icons = {
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
  Download: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  BookOpen: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
};

export type CitationStyle = 'apa' | 'mla' | 'chicago' | 'bibtex';

interface CitationManagerProps {
  sources: ResearchSource[];
  citationStyle: CitationStyle;
  onStyleChange: (style: CitationStyle) => void;
}

export function CitationManager({ sources, citationStyle, onStyleChange }: CitationManagerProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Generate citations based on selected style
  const citations = useMemo(() => {
    return sources
      .filter(s => s.isIncluded !== false)
      .map((source, index) => ({
        index: index + 1,
        source,
        formatted: formatCitation(source, citationStyle, index + 1),
        inline: getInlineMarker(citationStyle, index + 1, source),
      }));
  }, [sources, citationStyle]);

  // Generate bibliography
  const bibliography = useMemo(() => {
    return citations.map(c => c.formatted).join('\n\n');
  }, [citations]);

  const handleCopyCitation = async (index: number, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyAll = async () => {
    await navigator.clipboard.writeText(bibliography);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleExport = (format: 'txt' | 'bib') => {
    const content = format === 'bib'
      ? sources.filter(s => s.isIncluded !== false).map((s, i) => generateBibTeX(s, i + 1)).join('\n\n')
      : bibliography;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bibliography.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const styleOptions: { id: CitationStyle; label: string; description: string }[] = [
    { id: 'apa', label: 'APA 7th', description: 'American Psychological Association' },
    { id: 'mla', label: 'MLA 9th', description: 'Modern Language Association' },
    { id: 'chicago', label: 'Chicago 17th', description: 'Chicago Manual of Style' },
    { id: 'bibtex', label: 'BibTeX', description: 'LaTeX Bibliography Format' },
  ];

  return (
    <div className="bg-[var(--bg-1)] border border-[var(--border-light)] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-light)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
              <Icons.BookOpen />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Citation Manager
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                {citations.length} citations generated
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopyAll}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-2)] text-[var(--text-secondary)] rounded-xl hover:bg-[var(--bg-3)] transition-colors"
            >
              {copiedAll ? <Icons.Check /> : <Icons.Copy />}
              {copiedAll ? 'Copied!' : 'Copy All'}
            </button>
            <button
              onClick={() => handleExport('txt')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-xl hover:bg-purple-500/30 transition-colors"
            >
              <Icons.Download />
              Export
            </button>
          </div>
        </div>

        {/* Style Selector */}
        <div className="flex gap-2 flex-wrap">
          {styleOptions.map((style) => (
            <button
              key={style.id}
              onClick={() => onStyleChange(style.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                citationStyle === style.id
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'bg-[var(--bg-2)] text-[var(--text-secondary)] border border-transparent hover:bg-[var(--bg-3)]'
              }`}
            >
              <span className="font-semibold">{style.label}</span>
              <span className="hidden sm:inline text-xs ml-1 opacity-70">
                ({style.description})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Inline Citation Reference */}
      <div className="p-4 border-b border-[var(--border-light)] bg-[var(--bg-2)]">
        <div className="text-xs uppercase tracking-wide text-[var(--text-tertiary)] mb-2">
          Inline Citation Format
        </div>
        <div className="flex flex-wrap gap-2">
          {citations.slice(0, 5).map((citation) => (
            <button
              key={citation.index}
              onClick={() => handleCopyCitation(citation.index, citation.inline)}
              className="px-3 py-1.5 bg-[var(--bg-1)] border border-[var(--border-light)] rounded-lg text-sm text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-colors group"
              title="Click to copy"
            >
              {citation.inline}
              <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Icons.Copy />
              </span>
            </button>
          ))}
          {citations.length > 5 && (
            <span className="px-3 py-1.5 text-sm text-[var(--text-tertiary)]">
              +{citations.length - 5} more
            </span>
          )}
        </div>
      </div>

      {/* Citation List */}
      <div className="divide-y divide-[var(--border-light)] max-h-[400px] overflow-y-auto">
        {citations.length > 0 ? (
          citations.map((citation) => (
            <CitationCard
              key={citation.index}
              index={citation.index}
              formatted={citation.formatted}
              inline={citation.inline}
              source={citation.source}
              isCopied={copiedIndex === citation.index}
              onCopy={() => handleCopyCitation(citation.index, citation.formatted)}
            />
          ))
        ) : (
          <div className="p-8 text-center text-[var(--text-tertiary)]">
            No citations to display. Include sources to generate citations.
          </div>
        )}
      </div>

      {/* Full Bibliography Preview */}
      <div className="p-4 border-t border-[var(--border-light)] bg-[var(--bg-2)]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
            Bibliography Preview
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('txt')}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Export as TXT
            </button>
            <span className="text-[var(--text-tertiary)]">|</span>
            <button
              onClick={() => handleExport('bib')}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Export as BibTeX
            </button>
          </div>
        </div>
        <div className="p-4 bg-[var(--bg-1)] rounded-xl max-h-[200px] overflow-y-auto">
          <pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap font-mono">
            {bibliography || 'No citations available'}
          </pre>
        </div>
      </div>
    </div>
  );
}

// Citation Card Component
function CitationCard({
  index,
  formatted,
  inline,
  source,
  isCopied,
  onCopy,
}: {
  index: number;
  formatted: string;
  inline: string;
  source: ResearchSource;
  isCopied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="p-4 hover:bg-[var(--bg-2)] transition-colors group">
      <div className="flex items-start gap-4">
        {/* Index Badge */}
        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 font-semibold text-sm flex-shrink-0">
          {index}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="text-sm text-[var(--text-primary)] leading-relaxed">
              {formatted}
            </p>
            <button
              onClick={onCopy}
              className={`flex-shrink-0 p-2 rounded-lg transition-all ${
                isCopied
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-[var(--bg-2)] text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 hover:bg-[var(--bg-3)]'
              }`}
              title="Copy citation"
            >
              {isCopied ? <Icons.Check /> : <Icons.Copy />}
            </button>
          </div>

          {/* Meta Info */}
          <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
            <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded">
              Inline: {inline}
            </span>
            <span className="truncate max-w-[200px]">
              {new URL(source.url).hostname.replace('www.', '')}
            </span>
            <span>
              Credibility: {Math.round(source.credibility.overallScore * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Citation Formatting Functions
function formatCitation(source: ResearchSource, style: CitationStyle, index: number): string {
  const author = source.author || 'Unknown Author';
  const title = source.title;
  const url = source.url;
  const date = source.publishDate
    ? new Date(source.publishDate)
    : null;
  const year = date?.getFullYear() || 'n.d.';
  const accessDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  switch (style) {
    case 'apa':
      return `${author}. (${year}). ${title}. Retrieved ${accessDate}, from ${url}`;

    case 'mla':
      return `${author}. "${title}." Web. ${year}. <${url}>.`;

    case 'chicago':
      return `${author}. "${title}." Accessed ${accessDate}. ${url}.`;

    case 'bibtex':
      return generateBibTeX(source, index);

    default:
      return `${author} (${year}). ${title}. ${url}`;
  }
}

function getInlineMarker(style: CitationStyle, index: number, source: ResearchSource): string {
  const author = source.author?.split(' ').pop() || 'Unknown';
  const year = source.publishDate
    ? new Date(source.publishDate).getFullYear()
    : 'n.d.';

  switch (style) {
    case 'apa':
      return `(${author}, ${year})`;

    case 'mla':
      return `(${author})`;

    case 'chicago':
      return `[${index}]`;

    case 'bibtex':
      return `\\cite{source${index}}`;

    default:
      return `[${index}]`;
  }
}

function generateBibTeX(source: ResearchSource, index: number): string {
  const author = source.author || 'Unknown';
  const title = source.title.replace(/[{}]/g, '');
  const year = source.publishDate
    ? new Date(source.publishDate).getFullYear()
    : new Date().getFullYear();
  const url = source.url;
  const domain = new URL(url).hostname.replace('www.', '');

  return `@online{source${index},
  author = {${author}},
  title = {${title}},
  year = {${year}},
  url = {${url}},
  urldate = {${new Date().toISOString().split('T')[0]}},
  publisher = {${domain}}
}`;
}

export default CitationManager;
