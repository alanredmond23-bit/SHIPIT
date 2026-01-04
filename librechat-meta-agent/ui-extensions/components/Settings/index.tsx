'use client';

// ============================================================================
// SETTINGS COMPONENTS - Search, Research, and RAG Configuration
// ============================================================================
// 
// This module exports all settings components for the Meta Agent platform:
// - SearchDepthSlider: Control search depth from 1-10 (ChatGPT uses 3)
// - ResearchIterations: Live iteration progress and controls
// - RAGConfiguration: Retrieval-Augmented Generation settings
// - SourceQualityControl: Source filtering and prioritization
//
// ============================================================================

// Search Depth Slider
export {
  SearchDepthSlider,
  DEPTH_LEVELS,
} from './SearchDepthSlider';

export type {
  SearchConfig,
  SearchDepthLevel,
  SearchDepthSliderProps,
} from './SearchDepthSlider';

// Research Iterations
export {
  ResearchIterations,
} from './ResearchIterations';

export type {
  ResearchIterationConfig,
  ResearchIterationsProps,
  IterationStep,
} from './ResearchIterations';

// RAG Configuration
export {
  RAGConfiguration,
  EMBEDDING_MODELS,
} from './RAGConfiguration';

export type {
  RAGConfig,
  RAGConfigurationProps,
  EmbeddingModel,
} from './RAGConfiguration';

// Source Quality Control
export {
  SourceQualityControl,
  CITATION_FORMATS,
} from './SourceQualityControl';

export type {
  SourceQualityConfig,
  SourceQualityControlProps,
  CitationFormat,
} from './SourceQualityControl';

// ============================================================================
// COMBINED SETTINGS TYPES
// ============================================================================

/**
 * Complete settings configuration for search and research
 */
export interface MetaAgentSettings {
  search: {
    search_depth: number;
    max_sources: number;
    max_iterations: number;
    fact_verification: boolean;
    source_quality_threshold: number;
  };
  research: {
    current_iteration: number;
    max_iterations: number;
    sources_found: number;
    sources_verified: number;
    fact_verification: boolean;
    quality_threshold: number;
    auto_continue: boolean;
    status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  };
  rag: {
    enabled: boolean;
    chunk_size: number;
    chunk_overlap: number;
    similarity_threshold: number;
    max_chunks: number;
    embedding_model: string;
  };
  sources: {
    quality_threshold: number;
    domain_whitelist: string[];
    domain_blacklist: string[];
    recency_weight: number;
    citation_format: 'apa' | 'mla' | 'chicago' | 'ieee' | 'harvard';
    source_types: {
      academic: boolean;
      news: boolean;
      government: boolean;
      forums: boolean;
      blogs: boolean;
      social: boolean;
    };
  };
}

/**
 * Default settings configuration
 */
export const DEFAULT_META_AGENT_SETTINGS: MetaAgentSettings = {
  search: {
    search_depth: 5,
    max_sources: 25,
    max_iterations: 5,
    fact_verification: true,
    source_quality_threshold: 0.5,
  },
  research: {
    current_iteration: 0,
    max_iterations: 10,
    sources_found: 0,
    sources_verified: 0,
    fact_verification: true,
    quality_threshold: 0.6,
    auto_continue: true,
    status: 'idle',
  },
  rag: {
    enabled: true,
    chunk_size: 512,
    chunk_overlap: 64,
    similarity_threshold: 0.7,
    max_chunks: 10,
    embedding_model: 'text-embedding-3-small',
  },
  sources: {
    quality_threshold: 0.5,
    domain_whitelist: [],
    domain_blacklist: [],
    recency_weight: 0.5,
    citation_format: 'apa',
    source_types: {
      academic: true,
      news: true,
      government: true,
      forums: false,
      blogs: true,
      social: false,
    },
  },
};

// ============================================================================
// AGENT YAML EDITOR & MCP MANAGER
// ============================================================================

// Agent YAML Editor
export { default as AgentYAMLEditor } from './AgentYAMLEditor';
export type {
  AgentYAMLEditorProps,
  AgentDefinition,
  ValidationError,
  VersionHistoryItem,
  AgentTemplate,
} from './AgentYAMLEditor';

// MCP Manager
export { default as MCPManager } from './MCPManager';
export type { MCPManagerProps, ViewMode, FilterStatus } from './MCPManager';

// MCP Server Card
export { default as MCPServerCard } from './MCPServerCard';
export type { MCPServerCardProps } from './MCPServerCard';

// MCP Config Modal
export { default as MCPConfigModal } from './MCPConfigModal';
export type { MCPConfigModalProps, AdvancedSettings } from './MCPConfigModal';

// Function Builder
export { default as FunctionBuilder } from './FunctionBuilder';
export type {
  FunctionBuilderProps,
  FunctionDefinition,
  FunctionParameter,
  TestResult,
} from './FunctionBuilder';

// MCP Server Data
export {
  MCP_SERVERS,
  MCP_CATEGORIES,
  getServersByCategory,
  getEnabledServers,
  getHealthyServers,
  searchServers,
} from './mcpServersData';
export type {
  MCPServer,
  MCPCategory,
  MCPHealthStatus,
  MCPConfigField,
} from './mcpServersData';
