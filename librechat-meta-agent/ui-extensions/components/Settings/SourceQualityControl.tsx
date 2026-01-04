'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Shield,
  Globe,
  Clock,
  Filter,
  Plus,
  X,
  Check,
  AlertTriangle,
  Info,
  Star,
  Calendar,
  Link2,
  BookOpen,
  FileText,
  Quote,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Ban,
  CheckCircle2,
  Search
} from 'lucide-react';

// ============================================================================
// INTERFACES
// ============================================================================

interface SourceQualityConfig {
  quality_threshold: number; // 0.0 - 1.0
  domain_whitelist: string[];
  domain_blacklist: string[];
  recency_weight: number; // 0.0 - 1.0 (how much to prefer newer sources)
  citation_format: 'apa' | 'mla' | 'chicago' | 'ieee' | 'harvard';
  source_types: {
    academic: boolean;
    news: boolean;
    government: boolean;
    forums: boolean;
    blogs: boolean;
    social: boolean;
  };
}

interface SourceQualityControlProps {
  config: SourceQualityConfig;
  onChange: (config: Partial<SourceQualityConfig>) => void;
  disabled?: boolean;
  className?: string;
}

interface CitationFormat {
  id: 'apa' | 'mla' | 'chicago' | 'ieee' | 'harvard';
  name: string;
  description: string;
  example: string;
}

// ============================================================================
// CITATION FORMATS
// ============================================================================

const CITATION_FORMATS: CitationFormat[] = [
  {
    id: 'apa',
    name: 'APA 7th Edition',
    description: 'American Psychological Association - Common in social sciences',
    example: 'Author, A. A. (Year). Title of work. Publisher.',
  },
  {
    id: 'mla',
    name: 'MLA 9th Edition',
    description: 'Modern Language Association - Common in humanities',
    example: 'Author. "Title." Source, Date, URL.',
  },
  {
    id: 'chicago',
    name: 'Chicago/Turabian',
    description: 'Chicago Manual of Style - Versatile for many fields',
    example: 'Author. Title. Place: Publisher, Year.',
  },
  {
    id: 'ieee',
    name: 'IEEE',
    description: 'Institute of Electrical and Electronics Engineers - Engineering/CS',
    example: '[1] A. Author, "Title," Journal, vol. X, no. X, pp. X-X, Year.',
  },
  {
    id: 'harvard',
    name: 'Harvard',
    description: 'Author-date system - Popular in UK/Australia',
    example: 'Author (Year) Title. Place: Publisher.',
  },
];

// ============================================================================
// TOOLTIP COMPONENT
// ============================================================================

function Tooltip({ 
  children, 
  content 
}: { 
  children: React.ReactNode; 
  content: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-flex">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {children}
      </div>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-warm-900 text-white text-xs rounded-lg z-50 shadow-lg max-w-xs text-center">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-warm-900" />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// QUALITY THRESHOLD SECTION
// ============================================================================

function QualityThresholdSection({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const percentage = Math.round(value * 100);

  const getQualityInfo = (v: number) => {
    if (v < 0.3) return { 
      label: 'Lenient', 
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      description: 'Accepts most sources. May include lower-quality content.',
      icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />
    };
    if (v < 0.5) return { 
      label: 'Balanced', 
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200',
      description: 'Good balance between coverage and quality.',
      icon: <Check className="w-5 h-5 text-teal-500" />
    };
    if (v < 0.7) return { 
      label: 'Strict', 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      description: 'Only accepts reputable, well-established sources.',
      icon: <Shield className="w-5 h-5 text-blue-500" />
    };
    if (v < 0.9) return { 
      label: 'Rigorous', 
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      description: 'Academic-grade filtering. Highly authoritative sources only.',
      icon: <Star className="w-5 h-5 text-purple-500" />
    };
    return { 
      label: 'Maximum', 
      color: 'text-warm-700',
      bgColor: 'bg-warm-100',
      borderColor: 'border-warm-300',
      description: 'Only top-tier sources. May significantly limit results.',
      icon: <Sparkles className="w-5 h-5 text-warm-600" />
    };
  };

  const info = getQualityInfo(value);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-warm-400" />
        <span className="text-sm font-medium text-warm-700">Source Quality Threshold</span>
        <Tooltip content="Minimum quality score required for sources to be included in research results.">
          <Info className="w-3.5 h-3.5 text-warm-300 cursor-help" />
        </Tooltip>
      </div>

      {/* Quality Level Card */}
      <div className={`p-4 rounded-xl border-2 ${info.bgColor} ${info.borderColor}`}>
        <div className="flex items-center gap-3 mb-2">
          {info.icon}
          <span className={`text-lg font-semibold ${info.color}`}>{info.label}</span>
          <span className="text-sm text-warm-500 ml-auto">{percentage}%</span>
        </div>
        <p className="text-sm text-warm-600">{info.description}</p>
      </div>

      {/* Slider */}
      <div className="px-2">
        <input
          type="range"
          min="0"
          max="100"
          value={percentage}
          onChange={(e) => onChange(parseInt(e.target.value, 10) / 100)}
          disabled={disabled}
          className={`
            w-full h-3 rounded-full appearance-none cursor-pointer
            bg-gradient-to-r from-yellow-300 via-teal-300 via-blue-300 via-purple-300 to-warm-400
            disabled:opacity-50 disabled:cursor-not-allowed
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-6
            [&::-webkit-slider-thumb]:h-6
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:border-4
            [&::-webkit-slider-thumb]:border-teal-500
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-moz-range-thumb]:w-6
            [&::-moz-range-thumb]:h-6
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-white
            [&::-moz-range-thumb]:border-4
            [&::-moz-range-thumb]:border-teal-500
            [&::-moz-range-thumb]:shadow-lg
          `}
        />

        <div className="flex justify-between mt-2 text-xs text-warm-400">
          <span>Lenient</span>
          <span>Balanced</span>
          <span>Strict</span>
          <span>Maximum</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DOMAIN LIST EDITOR
// ============================================================================

function DomainListEditor({
  title,
  icon,
  domains,
  onChange,
  placeholder,
  helperText,
  color,
  disabled = false,
}: {
  title: string;
  icon: React.ReactNode;
  domains: string[];
  onChange: (domains: string[]) => void;
  placeholder: string;
  helperText: string;
  color: 'green' | 'red';
  disabled?: boolean;
}) {
  const [inputValue, setInputValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(domains.length > 0);

  const colorClasses = {
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      badge: 'bg-green-100 text-green-700 border-green-200',
      button: 'bg-green-500 hover:bg-green-600 text-white',
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      badge: 'bg-red-100 text-red-700 border-red-200',
      button: 'bg-red-500 hover:bg-red-600 text-white',
    },
  };

  const colors = colorClasses[color];

  const handleAdd = useCallback(() => {
    const domain = inputValue.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (domain && !domains.includes(domain)) {
      onChange([...domains, domain]);
      setInputValue('');
    }
  }, [inputValue, domains, onChange]);

  const handleRemove = useCallback((domain: string) => {
    onChange(domains.filter(d => d !== domain));
  }, [domains, onChange]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  }, [handleAdd]);

  return (
    <div className={`rounded-xl border ${colors.border} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between p-4 ${colors.bg} transition-colors hover:opacity-90`}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className={`font-medium ${colors.text}`}>{title}</span>
          {domains.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.badge} border`}>
              {domains.length}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-warm-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-warm-400" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 bg-white">
          {/* Input */}
          <div className="flex gap-2 mb-3">
            <div className="flex-1 relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400" />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={placeholder}
                disabled={disabled}
                className={`
                  w-full pl-10 pr-4 py-2 border border-warm-200 rounded-lg
                  focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none
                  disabled:opacity-50 disabled:cursor-not-allowed
                  text-sm
                `}
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={disabled || !inputValue.trim()}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm transition-colors
                ${colors.button}
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Helper text */}
          <p className="text-xs text-warm-500 mb-3">{helperText}</p>

          {/* Domain list */}
          {domains.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {domains.map((domain) => (
                <span
                  key={domain}
                  className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm
                    ${colors.badge} border
                  `}
                >
                  <Link2 className="w-3 h-3" />
                  <span>{domain}</span>
                  <button
                    onClick={() => handleRemove(domain)}
                    disabled={disabled}
                    className="ml-1 hover:opacity-70 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-warm-400">
              No domains added yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// RECENCY PREFERENCE SECTION
// ============================================================================

function RecencyPreferenceSection({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const percentage = Math.round(value * 100);

  const getRecencyInfo = (v: number) => {
    if (v < 0.2) return { 
      label: 'No preference', 
      description: 'All sources weighted equally regardless of date'
    };
    if (v < 0.4) return { 
      label: 'Slight preference', 
      description: 'Slightly favors newer sources'
    };
    if (v < 0.6) return { 
      label: 'Moderate preference', 
      description: 'Balanced preference for recent content'
    };
    if (v < 0.8) return { 
      label: 'Strong preference', 
      description: 'Strongly prioritizes recent sources'
    };
    return { 
      label: 'Maximum recency', 
      description: 'Only the most recent sources prioritized'
    };
  };

  const info = getRecencyInfo(value);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-warm-400" />
          <span className="text-sm font-medium text-warm-700">Recency Preference</span>
          <Tooltip content="How much to prioritize newer sources over older ones. Higher values favor recent content.">
            <Info className="w-3.5 h-3.5 text-warm-300 cursor-help" />
          </Tooltip>
        </div>
        <div className="text-right">
          <span className="text-sm font-semibold text-warm-800">{info.label}</span>
          <span className="text-xs text-warm-500 ml-2">({percentage}%)</span>
        </div>
      </div>

      <input
        type="range"
        min="0"
        max="100"
        value={percentage}
        onChange={(e) => onChange(parseInt(e.target.value, 10) / 100)}
        disabled={disabled}
        className={`
          w-full h-2 rounded-full appearance-none cursor-pointer bg-warm-200
          disabled:opacity-50 disabled:cursor-not-allowed
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-5
          [&::-webkit-slider-thumb]:h-5
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-teal-500
          [&::-webkit-slider-thumb]:shadow-md
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-moz-range-thumb]:w-5
          [&::-moz-range-thumb]:h-5
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-teal-500
          [&::-moz-range-thumb]:shadow-md
        `}
      />

      <div className="flex items-center gap-4 text-xs text-warm-500">
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          <span>{info.description}</span>
        </div>
      </div>

      {/* Visual timeline */}
      <div className="flex items-center gap-2 p-3 bg-warm-50 rounded-lg">
        <div className="flex-1 flex items-center">
          {[5, 3, 2, 1, 0].map((yearsAgo, i) => {
            const weight = value > 0.8 ? (i === 4 ? 1 : 0.2 - i * 0.04) :
                          value > 0.5 ? (1 - i * 0.15) :
                          value > 0.2 ? (1 - i * 0.08) : 1;
            
            return (
              <div key={yearsAgo} className="flex-1 text-center">
                <div 
                  className="h-8 bg-teal-400 rounded mx-0.5 transition-all duration-300"
                  style={{ opacity: Math.max(0.2, weight) }}
                />
                <span className="text-[10px] text-warm-400 mt-1 block">
                  {yearsAgo === 0 ? 'Now' : yearsAgo === 1 ? '1yr' : `${yearsAgo}yrs`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SOURCE TYPES SECTION
// ============================================================================

function SourceTypesSection({
  sourceTypes,
  onChange,
  disabled = false,
}: {
  sourceTypes: SourceQualityConfig['source_types'];
  onChange: (types: SourceQualityConfig['source_types']) => void;
  disabled?: boolean;
}) {
  const types = [
    { key: 'academic', label: 'Academic', icon: <BookOpen className="w-4 h-4" />, description: 'Peer-reviewed papers, journals' },
    { key: 'news', label: 'News', icon: <FileText className="w-4 h-4" />, description: 'News articles, press releases' },
    { key: 'government', label: 'Government', icon: <Shield className="w-4 h-4" />, description: 'Official gov sources, .gov sites' },
    { key: 'forums', label: 'Forums', icon: <Quote className="w-4 h-4" />, description: 'Reddit, Stack Overflow, etc.' },
    { key: 'blogs', label: 'Blogs', icon: <Globe className="w-4 h-4" />, description: 'Personal and company blogs' },
    { key: 'social', label: 'Social', icon: <Sparkles className="w-4 h-4" />, description: 'Twitter, LinkedIn posts' },
  ] as const;

  const handleToggle = (key: keyof typeof sourceTypes) => {
    onChange({ ...sourceTypes, [key]: !sourceTypes[key] });
  };

  const enabledCount = Object.values(sourceTypes).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-warm-400" />
          <span className="text-sm font-medium text-warm-700">Source Types</span>
          <Tooltip content="Select which types of sources to include in research results.">
            <Info className="w-3.5 h-3.5 text-warm-300 cursor-help" />
          </Tooltip>
        </div>
        <span className="text-xs text-warm-500">{enabledCount} of {types.length} enabled</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {types.map(({ key, label, icon, description }) => (
          <button
            key={key}
            onClick={() => !disabled && handleToggle(key)}
            disabled={disabled}
            className={`
              p-3 rounded-xl border-2 text-left transition-all
              ${sourceTypes[key]
                ? 'border-teal-300 bg-teal-50'
                : 'border-warm-200 bg-white hover:border-warm-300'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={sourceTypes[key] ? 'text-teal-600' : 'text-warm-400'}>
                {icon}
              </span>
              <span className={`text-sm font-medium ${sourceTypes[key] ? 'text-teal-700' : 'text-warm-600'}`}>
                {label}
              </span>
              {sourceTypes[key] && (
                <CheckCircle2 className="w-4 h-4 text-teal-500 ml-auto" />
              )}
            </div>
            <p className="text-xs text-warm-500">{description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// CITATION FORMAT SELECTOR
// ============================================================================

function CitationFormatSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const selectedFormat = CITATION_FORMATS.find(f => f.id === value) || CITATION_FORMATS[0];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Quote className="w-4 h-4 text-warm-400" />
        <span className="text-sm font-medium text-warm-700">Citation Format</span>
        <Tooltip content="The format used for generating citations and references in research reports.">
          <Info className="w-3.5 h-3.5 text-warm-300 cursor-help" />
        </Tooltip>
      </div>

      {/* Selected Format */}
      <button
        onClick={() => !disabled && setExpanded(!expanded)}
        disabled={disabled}
        className={`
          w-full p-4 rounded-xl border-2 text-left transition-all
          ${expanded ? 'border-teal-300 bg-teal-50' : 'border-warm-200 bg-white hover:border-warm-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-warm-900">{selectedFormat.name}</span>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-warm-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-warm-400" />
          )}
        </div>
        <p className="text-sm text-warm-500 mb-2">{selectedFormat.description}</p>
        <div className="p-2 bg-warm-50 rounded-lg text-xs text-warm-600 font-mono">
          {selectedFormat.example}
        </div>
      </button>

      {/* Format Options */}
      {expanded && (
        <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
          {CITATION_FORMATS.filter(f => f.id !== value).map((format) => (
            <button
              key={format.id}
              onClick={() => {
                onChange(format.id);
                setExpanded(false);
              }}
              disabled={disabled}
              className={`
                w-full p-4 rounded-xl border-2 text-left transition-all
                border-warm-200 bg-white hover:border-teal-300 hover:bg-teal-50
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="font-medium text-warm-900 mb-1">{format.name}</div>
              <p className="text-sm text-warm-500 mb-2">{format.description}</p>
              <div className="p-2 bg-warm-50 rounded-lg text-xs text-warm-600 font-mono">
                {format.example}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT: SourceQualityControl
// ============================================================================

export function SourceQualityControl({
  config,
  onChange,
  disabled = false,
  className = '',
}: SourceQualityControlProps) {
  return (
    <div className={`bg-white rounded-2xl border border-warm-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-warm-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-warm-100 rounded-lg">
            <Filter className="w-5 h-5 text-warm-600" />
          </div>
          <div>
            <h3 className="font-semibold text-warm-900 text-lg">Source Quality Control</h3>
            <p className="text-warm-500 text-sm">Filter and prioritize sources for research</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-8">
        {/* Quality Threshold */}
        <QualityThresholdSection
          value={config.quality_threshold}
          onChange={(v) => onChange({ quality_threshold: v })}
          disabled={disabled}
        />

        {/* Source Types */}
        <SourceTypesSection
          sourceTypes={config.source_types}
          onChange={(types) => onChange({ source_types: types })}
          disabled={disabled}
        />

        {/* Domain Whitelist */}
        <DomainListEditor
          title="Trusted Domains (Whitelist)"
          icon={<CheckCircle2 className="w-4 h-4 text-green-600" />}
          domains={config.domain_whitelist}
          onChange={(domains) => onChange({ domain_whitelist: domains })}
          placeholder="e.g., nature.com, arxiv.org"
          helperText="Sources from these domains will always be included and prioritized."
          color="green"
          disabled={disabled}
        />

        {/* Domain Blacklist */}
        <DomainListEditor
          title="Blocked Domains (Blacklist)"
          icon={<Ban className="w-4 h-4 text-red-600" />}
          domains={config.domain_blacklist}
          onChange={(domains) => onChange({ domain_blacklist: domains })}
          placeholder="e.g., spam-site.com, fake-news.net"
          helperText="Sources from these domains will never be included in results."
          color="red"
          disabled={disabled}
        />

        {/* Recency Preference */}
        <RecencyPreferenceSection
          value={config.recency_weight}
          onChange={(v) => onChange({ recency_weight: v })}
          disabled={disabled}
        />

        {/* Citation Format */}
        <CitationFormatSelector
          value={config.citation_format}
          onChange={(v) => onChange({ citation_format: v as any })}
          disabled={disabled}
        />
      </div>

      {/* Footer Info */}
      <div className="px-6 py-4 bg-warm-50 border-t border-warm-100">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-warm-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-warm-500 leading-relaxed">
            <strong className="text-warm-600">Quality tips:</strong> For academic research, 
            use strict quality (60%+), enable only Academic and Government sources, and prefer APA or IEEE citations. 
            For general research, balanced quality (40-50%) with News and Blogs works well.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SourceQualityControl;

// ============================================================================
// EXPORTS
// ============================================================================

export { CITATION_FORMATS };
export type { SourceQualityConfig, SourceQualityControlProps, CitationFormat };
