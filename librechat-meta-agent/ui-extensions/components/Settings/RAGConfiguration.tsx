'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Database,
  Layers,
  GitMerge,
  Percent,
  Hash,
  Cpu,
  Info,
  Power,
  Eye,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
  Target,
  FileText,
  Scissors
} from 'lucide-react';

// ============================================================================
// INTERFACES
// ============================================================================

interface RAGConfig {
  enabled: boolean;
  chunk_size: number; // 256-2048 tokens
  chunk_overlap: number; // 0-512 tokens
  similarity_threshold: number; // 0.0-1.0
  max_chunks: number; // 1-50
  embedding_model: string;
}

interface RAGConfigurationProps {
  config: RAGConfig;
  onChange: (config: Partial<RAGConfig>) => void;
  disabled?: boolean;
  className?: string;
}

interface EmbeddingModel {
  id: string;
  name: string;
  description: string;
  dimensions: number;
  speed: 'fast' | 'medium' | 'slow';
  quality: 'good' | 'better' | 'best';
  costPer1k: string;
}

// ============================================================================
// EMBEDDING MODELS
// ============================================================================

const EMBEDDING_MODELS: EmbeddingModel[] = [
  {
    id: 'text-embedding-3-small',
    name: 'Embedding 3 Small',
    description: 'Fast and cost-effective. Great for most use cases.',
    dimensions: 1536,
    speed: 'fast',
    quality: 'good',
    costPer1k: '$0.00002',
  },
  {
    id: 'text-embedding-3-large',
    name: 'Embedding 3 Large',
    description: 'Higher quality embeddings with more dimensions.',
    dimensions: 3072,
    speed: 'medium',
    quality: 'best',
    costPer1k: '$0.00013',
  },
  {
    id: 'text-embedding-ada-002',
    name: 'Ada 002 (Legacy)',
    description: 'Previous generation model. Still reliable.',
    dimensions: 1536,
    speed: 'fast',
    quality: 'better',
    costPer1k: '$0.0001',
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
// CHUNK SIZE VISUALIZATION
// ============================================================================

function ChunkSizeVisualization({ 
  chunkSize, 
  overlap 
}: { 
  chunkSize: number; 
  overlap: number;
}) {
  // Simulate document chunking
  const documentLength = 1500; // tokens
  const numChunks = Math.ceil((documentLength - overlap) / (chunkSize - overlap));
  const effectiveChunkSize = (chunkSize / 2048) * 100; // percentage width

  return (
    <div className="bg-warm-50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-warm-400" />
        <span className="text-xs font-medium text-warm-600">Document Chunking Preview</span>
      </div>

      {/* Document representation */}
      <div className="relative h-12 bg-warm-200 rounded-lg overflow-hidden mb-3">
        <div className="absolute inset-0 flex">
          {Array.from({ length: Math.min(numChunks, 6) }).map((_, i) => {
            const leftPosition = i === 0 ? 0 : (i * (chunkSize - overlap) / documentLength) * 100;
            const overlapIndicator = overlap > 0 && i > 0;
            
            return (
              <div
                key={i}
                className="absolute h-full flex items-center justify-center transition-all duration-300"
                style={{
                  left: `${leftPosition}%`,
                  width: `${(chunkSize / documentLength) * 100}%`,
                  maxWidth: '100%',
                }}
              >
                <div 
                  className={`
                    h-10 w-full rounded mx-0.5 flex items-center justify-center text-xs font-medium
                    ${i % 2 === 0 ? 'bg-teal-400 text-teal-900' : 'bg-blue-400 text-blue-900'}
                  `}
                >
                  {i + 1}
                </div>
                {overlapIndicator && (
                  <div 
                    className="absolute left-0 h-full bg-purple-400/50 border-l-2 border-dashed border-purple-500"
                    style={{ width: `${(overlap / chunkSize) * 100}%` }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs text-warm-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-teal-400" />
            <span>Chunk</span>
          </div>
          {overlap > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-purple-400/50 border border-dashed border-purple-500" />
              <span>Overlap</span>
            </div>
          )}
        </div>
        <span>{numChunks} chunks from ~1500 token doc</span>
      </div>
    </div>
  );
}

// ============================================================================
// OVERLAP VISUALIZATION
// ============================================================================

function OverlapVisualization({ 
  chunkSize, 
  overlap 
}: { 
  chunkSize: number; 
  overlap: number;
}) {
  const overlapPercent = (overlap / chunkSize) * 100;

  return (
    <div className="bg-warm-50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <GitMerge className="w-4 h-4 text-warm-400" />
        <span className="text-xs font-medium text-warm-600">Overlap Visualization</span>
      </div>

      {/* Two chunks with overlap */}
      <div className="relative h-16 mb-3">
        {/* Chunk 1 */}
        <div 
          className="absolute left-0 h-8 bg-teal-300 rounded-lg flex items-center justify-center text-xs font-medium text-teal-800 transition-all duration-300"
          style={{ width: '60%' }}
        >
          Chunk 1
        </div>
        
        {/* Chunk 2 */}
        <div 
          className="absolute bottom-0 h-8 bg-blue-300 rounded-lg flex items-center justify-center text-xs font-medium text-blue-800 transition-all duration-300"
          style={{ 
            left: `${60 - (overlapPercent * 0.6)}%`,
            width: '60%' 
          }}
        >
          Chunk 2
        </div>

        {/* Overlap indicator */}
        {overlap > 0 && (
          <div 
            className="absolute top-0 h-full flex items-center justify-center transition-all duration-300"
            style={{
              left: `${60 - (overlapPercent * 0.6)}%`,
              width: `${overlapPercent * 0.6}%`,
            }}
          >
            <div className="absolute inset-y-0 left-0 right-0 bg-purple-500/30 border-l-2 border-r-2 border-dashed border-purple-500 rounded" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-warm-500">
          {overlap} tokens shared between chunks
        </span>
        <span className="text-purple-600 font-medium">
          {Math.round(overlapPercent)}% overlap
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// SIMILARITY THRESHOLD VISUALIZATION
// ============================================================================

function SimilarityVisualization({ 
  threshold 
}: { 
  threshold: number;
}) {
  // Generate mock similarity scores
  const mockResults = useMemo(() => [
    { score: 0.95, label: 'Perfect match', included: true },
    { score: 0.85, label: 'Strong match', included: true },
    { score: 0.72, label: 'Good match', included: true },
    { score: 0.58, label: 'Weak match', included: false },
    { score: 0.42, label: 'Poor match', included: false },
    { score: 0.25, label: 'Irrelevant', included: false },
  ].map(r => ({ ...r, included: r.score >= threshold })), [threshold]);

  const includedCount = mockResults.filter(r => r.included).length;

  return (
    <div className="bg-warm-50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-warm-400" />
          <span className="text-xs font-medium text-warm-600">Similarity Matching Preview</span>
        </div>
        <span className="text-xs text-teal-600 font-medium">
          {includedCount} of {mockResults.length} chunks included
        </span>
      </div>

      {/* Results list */}
      <div className="space-y-2">
        {mockResults.map((result, i) => (
          <div 
            key={i}
            className={`
              flex items-center gap-3 p-2 rounded-lg transition-all duration-300
              ${result.included 
                ? 'bg-teal-100 border border-teal-200' 
                : 'bg-warm-100 border border-warm-200 opacity-50'
              }
            `}
          >
            <div 
              className={`
                w-12 h-2 rounded-full overflow-hidden bg-warm-200
              `}
            >
              <div 
                className={`h-full transition-all ${result.included ? 'bg-teal-500' : 'bg-warm-400'}`}
                style={{ width: `${result.score * 100}%` }}
              />
            </div>
            <span className={`text-xs font-medium ${result.included ? 'text-teal-700' : 'text-warm-500'}`}>
              {Math.round(result.score * 100)}%
            </span>
            <span className={`text-xs ${result.included ? 'text-teal-600' : 'text-warm-400'}`}>
              {result.label}
            </span>
            {result.included && (
              <span className="ml-auto text-xs text-teal-500 font-medium">Included</span>
            )}
          </div>
        ))}
      </div>

      {/* Threshold line indicator */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-2 bg-warm-200 rounded-full relative">
          <div 
            className="absolute top-0 w-1 h-full bg-purple-500 rounded-full transform -translate-x-1/2 transition-all duration-300"
            style={{ left: `${threshold * 100}%` }}
          />
          <div 
            className="h-full bg-gradient-to-r from-red-300 via-yellow-300 to-teal-300 rounded-full"
          />
        </div>
        <span className="text-xs text-purple-600 font-medium whitespace-nowrap">
          Threshold: {Math.round(threshold * 100)}%
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// EMBEDDING MODEL SELECTOR
// ============================================================================

function EmbeddingModelSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const selectedModel = EMBEDDING_MODELS.find(m => m.id === value) || EMBEDDING_MODELS[0];

  const speedColors = {
    fast: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    slow: 'bg-red-100 text-red-700',
  };

  const qualityColors = {
    good: 'bg-blue-100 text-blue-700',
    better: 'bg-purple-100 text-purple-700',
    best: 'bg-teal-100 text-teal-700',
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Cpu className="w-4 h-4 text-warm-400" />
        <span className="text-sm font-medium text-warm-700">Embedding Model</span>
        <Tooltip content="The model used to convert text into vector embeddings for semantic search.">
          <Info className="w-3.5 h-3.5 text-warm-300 cursor-help" />
        </Tooltip>
      </div>

      {/* Selected Model Card */}
      <button
        onClick={() => !disabled && setExpanded(!expanded)}
        disabled={disabled}
        className={`
          w-full p-4 rounded-xl border-2 text-left transition-all
          ${expanded ? 'border-teal-300 bg-teal-50' : 'border-warm-200 bg-white hover:border-warm-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-warm-900">{selectedModel.name}</div>
            <div className="text-sm text-warm-500">{selectedModel.description}</div>
          </div>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-warm-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-warm-400" />
          )}
        </div>

        <div className="flex items-center gap-2 mt-3">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${speedColors[selectedModel.speed]}`}>
            {selectedModel.speed}
          </span>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${qualityColors[selectedModel.quality]}`}>
            {selectedModel.quality}
          </span>
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-warm-100 text-warm-600">
            {selectedModel.dimensions}d
          </span>
          <span className="text-xs text-warm-400 ml-auto">
            {selectedModel.costPer1k}/1K tokens
          </span>
        </div>
      </button>

      {/* Expanded Model List */}
      {expanded && (
        <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
          {EMBEDDING_MODELS.filter(m => m.id !== value).map((model) => (
            <button
              key={model.id}
              onClick={() => {
                onChange(model.id);
                setExpanded(false);
              }}
              disabled={disabled}
              className={`
                w-full p-4 rounded-xl border-2 text-left transition-all
                border-warm-200 bg-white hover:border-teal-300 hover:bg-teal-50
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="font-medium text-warm-900">{model.name}</div>
              <div className="text-sm text-warm-500">{model.description}</div>

              <div className="flex items-center gap-2 mt-3">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${speedColors[model.speed]}`}>
                  {model.speed}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${qualityColors[model.quality]}`}>
                  {model.quality}
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-warm-100 text-warm-600">
                  {model.dimensions}d
                </span>
                <span className="text-xs text-warm-400 ml-auto">
                  {model.costPer1k}/1K tokens
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SLIDER WITH LABEL
// ============================================================================

function LabeledSlider({
  icon,
  label,
  tooltip,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  disabled = false,
  marks,
  formatValue,
}: {
  icon: React.ReactNode;
  label: string;
  tooltip: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  disabled?: boolean;
  marks?: { value: number; label: string }[];
  formatValue?: (v: number) => string;
}) {
  const displayValue = formatValue ? formatValue(value) : `${value}${unit}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-warm-700">{label}</span>
          <Tooltip content={tooltip}>
            <Info className="w-3.5 h-3.5 text-warm-300 cursor-help" />
          </Tooltip>
        </div>
        <span className="text-lg font-bold text-warm-900">{displayValue}</span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
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

      {marks && (
        <div className="flex justify-between text-xs text-warm-400">
          {marks.map((mark) => (
            <button
              key={mark.value}
              onClick={() => !disabled && onChange(mark.value)}
              className={`
                transition-colors
                ${value === mark.value ? 'text-teal-600 font-medium' : 'hover:text-warm-600'}
                ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {mark.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT: RAGConfiguration
// ============================================================================

export function RAGConfiguration({
  config,
  onChange,
  disabled = false,
  className = '',
}: RAGConfigurationProps) {
  const [showVisualizations, setShowVisualizations] = useState(true);

  const handleToggle = useCallback(() => {
    onChange({ enabled: !config.enabled });
  }, [config.enabled, onChange]);

  return (
    <div className={`bg-white rounded-2xl border border-warm-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-warm-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Database className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-warm-900 text-lg">RAG Configuration</h3>
              <p className="text-warm-500 text-sm">Retrieval-Augmented Generation settings</p>
            </div>
          </div>

          {/* Enable/Disable Toggle */}
          <button
            onClick={handleToggle}
            disabled={disabled}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full transition-all
              ${config.enabled 
                ? 'bg-teal-100 text-teal-700' 
                : 'bg-warm-100 text-warm-500'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
            `}
          >
            <Power className={`w-4 h-4 ${config.enabled ? 'text-teal-600' : 'text-warm-400'}`} />
            <span className="font-medium text-sm">{config.enabled ? 'Enabled' : 'Disabled'}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`p-6 transition-opacity ${!config.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Visualization Toggle */}
        <div className="flex items-center justify-end mb-4">
          <button
            onClick={() => setShowVisualizations(!showVisualizations)}
            className="flex items-center gap-2 text-sm text-warm-500 hover:text-warm-700 transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span>{showVisualizations ? 'Hide' : 'Show'} visualizations</span>
          </button>
        </div>

        {/* Chunk Size */}
        <div className="mb-8">
          <div className="p-4 bg-warm-50 rounded-xl mb-4">
            <LabeledSlider
              icon={<Scissors className="w-4 h-4 text-warm-400" />}
              label="Chunk Size"
              tooltip="The number of tokens per chunk. Smaller chunks = more precise retrieval. Larger chunks = more context."
              value={config.chunk_size}
              min={256}
              max={2048}
              step={64}
              unit=" tokens"
              onChange={(v) => onChange({ chunk_size: v })}
              disabled={disabled || !config.enabled}
              marks={[
                { value: 256, label: '256' },
                { value: 512, label: '512' },
                { value: 1024, label: '1024' },
                { value: 2048, label: '2048' },
              ]}
            />
          </div>

          {showVisualizations && (
            <ChunkSizeVisualization 
              chunkSize={config.chunk_size} 
              overlap={config.chunk_overlap} 
            />
          )}
        </div>

        {/* Chunk Overlap */}
        <div className="mb-8">
          <div className="p-4 bg-warm-50 rounded-xl mb-4">
            <LabeledSlider
              icon={<GitMerge className="w-4 h-4 text-warm-400" />}
              label="Chunk Overlap"
              tooltip="Tokens shared between adjacent chunks. Helps maintain context across chunk boundaries."
              value={config.chunk_overlap}
              min={0}
              max={Math.min(512, config.chunk_size / 2)}
              step={16}
              unit=" tokens"
              onChange={(v) => onChange({ chunk_overlap: v })}
              disabled={disabled || !config.enabled}
              marks={[
                { value: 0, label: '0' },
                { value: 128, label: '128' },
                { value: 256, label: '256' },
                { value: Math.min(512, config.chunk_size / 2), label: `${Math.min(512, config.chunk_size / 2)}` },
              ]}
            />
          </div>

          {showVisualizations && (
            <OverlapVisualization 
              chunkSize={config.chunk_size} 
              overlap={config.chunk_overlap} 
            />
          )}
        </div>

        {/* Similarity Threshold */}
        <div className="mb-8">
          <div className="p-4 bg-warm-50 rounded-xl mb-4">
            <LabeledSlider
              icon={<Percent className="w-4 h-4 text-warm-400" />}
              label="Similarity Threshold"
              tooltip="Minimum cosine similarity score for a chunk to be included in results. Higher = stricter matching."
              value={config.similarity_threshold}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => onChange({ similarity_threshold: v })}
              disabled={disabled || !config.enabled}
              formatValue={(v) => `${Math.round(v * 100)}%`}
              marks={[
                { value: 0, label: '0%' },
                { value: 0.25, label: '25%' },
                { value: 0.5, label: '50%' },
                { value: 0.75, label: '75%' },
                { value: 1, label: '100%' },
              ]}
            />
          </div>

          {showVisualizations && (
            <SimilarityVisualization threshold={config.similarity_threshold} />
          )}
        </div>

        {/* Max Chunks */}
        <div className="mb-8">
          <div className="p-4 bg-warm-50 rounded-xl">
            <LabeledSlider
              icon={<Hash className="w-4 h-4 text-warm-400" />}
              label="Max Retrieved Chunks"
              tooltip="Maximum number of chunks to retrieve and include in the context. More chunks = more context but higher cost."
              value={config.max_chunks}
              min={1}
              max={50}
              step={1}
              unit=" chunks"
              onChange={(v) => onChange({ max_chunks: v })}
              disabled={disabled || !config.enabled}
              marks={[
                { value: 1, label: '1' },
                { value: 10, label: '10' },
                { value: 25, label: '25' },
                { value: 50, label: '50' },
              ]}
            />

            <div className="mt-4 flex items-center gap-4 text-xs text-warm-500">
              <div className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                <span>Est. context tokens: ~{config.max_chunks * config.chunk_size}</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-teal-500" />
                <span>Effective with {config.max_chunks <= 10 ? 'GPT-3.5' : config.max_chunks <= 25 ? 'GPT-4' : 'GPT-4 128K'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Embedding Model */}
        <div className="p-4 bg-warm-50 rounded-xl">
          <EmbeddingModelSelector
            value={config.embedding_model}
            onChange={(v) => onChange({ embedding_model: v })}
            disabled={disabled || !config.enabled}
          />
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-6 py-4 bg-warm-50 border-t border-warm-100">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-warm-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-warm-500 leading-relaxed">
            <strong className="text-warm-600">RAG Tips:</strong> Start with 512 token chunks and 64 token overlap. 
            Use higher similarity thresholds (70%+) for precise retrieval. 
            Increase max chunks if you need more context but watch token costs.
          </p>
        </div>
      </div>
    </div>
  );
}

export default RAGConfiguration;

// ============================================================================
// EXPORTS
// ============================================================================

export { EMBEDDING_MODELS };
export type { RAGConfig, RAGConfigurationProps, EmbeddingModel };
