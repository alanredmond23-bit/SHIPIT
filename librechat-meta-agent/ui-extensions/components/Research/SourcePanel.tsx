'use client';

import React, { useState } from 'react';

// Icons
const Icons = {
  ExternalLink: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  X: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Shield: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Search: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Filter: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  ),
  SortAsc: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
    </svg>
  ),
};

export interface ResearchSource {
  id: string;
  url: string;
  title: string;
  snippet?: string;
  author?: string;
  publishDate?: Date | string;
  sourceType?: 'web' | 'academic' | 'news' | 'forum';
  isIncluded?: boolean;
  credibility: {
    authorityScore: number;
    recencyScore: number;
    biasScore: number;
    overallScore: number;
  };
}

interface SourcePanelProps {
  sources: ResearchSource[];
  onToggleSource: (id: string) => void;
  onViewSource: (url: string) => void;
}

type SortOption = 'relevance' | 'authority' | 'recency' | 'title';
type FilterOption = 'all' | 'included' | 'excluded';

export function SourcePanel({ sources, onToggleSource, onViewSource }: SourcePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Filter sources
  const filteredSources = sources.filter(source => {
    const matchesSearch =
      source.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      source.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (source.snippet && source.snippet.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter =
      filterBy === 'all' ? true :
      filterBy === 'included' ? source.isIncluded !== false :
      source.isIncluded === false;

    return matchesSearch && matchesFilter;
  });

  // Sort sources
  const sortedSources = [...filteredSources].sort((a, b) => {
    switch (sortBy) {
      case 'authority':
        return b.credibility.authorityScore - a.credibility.authorityScore;
      case 'recency':
        return b.credibility.recencyScore - a.credibility.recencyScore;
      case 'title':
        return a.title.localeCompare(b.title);
      default:
        return b.credibility.overallScore - a.credibility.overallScore;
    }
  });

  const includedCount = sources.filter(s => s.isIncluded !== false).length;
  const excludedCount = sources.filter(s => s.isIncluded === false).length;

  return (
    <div className="bg-[var(--bg-1)] border border-[var(--border-light)] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-light)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            Sources ({sources.length})
          </h3>
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
              {includedCount} included
            </span>
            {excludedCount > 0 && (
              <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full">
                {excludedCount} excluded
              </span>
            )}
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
              <Icons.Search />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sources..."
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-2)] border border-[var(--border-light)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors ${
              showFilters ? 'bg-cyan-500/20 text-cyan-400' : 'bg-[var(--bg-2)] text-[var(--text-secondary)]'
            }`}
          >
            <Icons.Filter />
            Filters
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="mt-4 flex flex-wrap gap-4 p-4 bg-[var(--bg-2)] rounded-xl">
            {/* Sort By */}
            <div>
              <label className="block text-xs text-[var(--text-tertiary)] uppercase tracking-wide mb-2">
                Sort by
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-2 bg-[var(--bg-1)] border border-[var(--border-light)] rounded-lg text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                <option value="relevance">Relevance Score</option>
                <option value="authority">Authority</option>
                <option value="recency">Recency</option>
                <option value="title">Title (A-Z)</option>
              </select>
            </div>

            {/* Filter By */}
            <div>
              <label className="block text-xs text-[var(--text-tertiary)] uppercase tracking-wide mb-2">
                Show
              </label>
              <div className="flex gap-2">
                {(['all', 'included', 'excluded'] as FilterOption[]).map((option) => (
                  <button
                    key={option}
                    onClick={() => setFilterBy(option)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filterBy === option
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'bg-[var(--bg-1)] text-[var(--text-secondary)] hover:bg-[var(--bg-3)]'
                    }`}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Source List */}
      <div className="divide-y divide-[var(--border-light)] max-h-[500px] overflow-y-auto">
        {sortedSources.length > 0 ? (
          sortedSources.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
              onToggle={() => onToggleSource(source.id)}
              onView={() => onViewSource(source.url)}
            />
          ))
        ) : (
          <div className="p-8 text-center text-[var(--text-tertiary)]">
            {searchQuery ? 'No sources match your search' : 'No sources found'}
          </div>
        )}
      </div>
    </div>
  );
}

// Source Card Component
function SourceCard({
  source,
  onToggle,
  onView
}: {
  source: ResearchSource;
  onToggle: () => void;
  onView: () => void;
}) {
  const isIncluded = source.isIncluded !== false;
  const credibilityScore = Math.round(source.credibility.overallScore * 100);

  const getCredibilityColor = (score: number) => {
    if (score >= 80) return 'text-green-400 bg-green-500/20';
    if (score >= 60) return 'text-yellow-400 bg-yellow-500/20';
    return 'text-red-400 bg-red-500/20';
  };

  const getSourceTypeLabel = (type?: string) => {
    switch (type) {
      case 'academic': return { label: 'Academic', color: 'text-purple-400 bg-purple-500/20' };
      case 'news': return { label: 'News', color: 'text-blue-400 bg-blue-500/20' };
      case 'forum': return { label: 'Forum', color: 'text-orange-400 bg-orange-500/20' };
      default: return { label: 'Web', color: 'text-gray-400 bg-gray-500/20' };
    }
  };

  const sourceTypeInfo = getSourceTypeLabel(source.sourceType);
  const domain = new URL(source.url).hostname.replace('www.', '');

  return (
    <div className={`p-4 hover:bg-[var(--bg-2)] transition-colors ${!isIncluded ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-4">
        {/* Include/Exclude Toggle */}
        <button
          onClick={onToggle}
          className={`mt-1 w-6 h-6 rounded-md flex items-center justify-center transition-colors flex-shrink-0 ${
            isIncluded
              ? 'bg-green-500 text-white'
              : 'bg-[var(--bg-3)] text-[var(--text-tertiary)] hover:bg-red-500/20 hover:text-red-400'
          }`}
          title={isIncluded ? 'Click to exclude' : 'Click to include'}
        >
          {isIncluded ? <Icons.Check /> : <Icons.X />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h4 className="font-medium text-[var(--text-primary)] line-clamp-2 flex-1">
              {source.title}
            </h4>
            <div className={`px-2 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${getCredibilityColor(credibilityScore)}`}>
              {credibilityScore}%
            </div>
          </div>

          {source.snippet && (
            <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-3">
              {source.snippet}
            </p>
          )}

          {/* Meta Info */}
          <div className="flex items-center flex-wrap gap-3 text-xs text-[var(--text-tertiary)]">
            <span className={`px-2 py-0.5 rounded-full ${sourceTypeInfo.color}`}>
              {sourceTypeInfo.label}
            </span>
            <span className="flex items-center gap-1">
              <Icons.Shield />
              Authority: {Math.round(source.credibility.authorityScore * 100)}%
            </span>
            <span className="flex items-center gap-1">
              <Icons.Clock />
              Recency: {Math.round(source.credibility.recencyScore * 100)}%
            </span>
            {source.author && (
              <span className="truncate max-w-[150px]">
                By {source.author}
              </span>
            )}
          </div>

          {/* URL and View Button */}
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-[var(--text-tertiary)] truncate max-w-[250px]">
              {domain}
            </span>
            <button
              onClick={onView}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-2)] text-cyan-400 rounded-lg text-xs font-medium hover:bg-cyan-500/20 transition-colors"
            >
              View source
              <Icons.ExternalLink />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SourcePanel;
