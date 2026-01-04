'use client';

import React, { useState } from 'react';
import {
  Brain,
  Search,
  SlidersHorizontal,
  Database,
  Wrench,
  Info,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Sparkles,
  Zap,
  Settings2,
  FileCode,
  Server,
  Check,
  X,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { AccentButton } from '@/components/ui/AccentButton';

// Types for the comparison data
interface FeatureStatus {
  status: 'hidden' | 'partial' | 'full';
  details?: string;
  tooltip?: string;
}

interface CompetitorFeature {
  name: string;
  description: string;
  importance: 'critical' | 'high' | 'medium';
  educationalContent: string;
  chatgpt: FeatureStatus;
  claude: FeatureStatus;
  gemini: FeatureStatus;
  perplexity: FeatureStatus;
  deepseek: FeatureStatus;
  metaAgent: FeatureStatus;
}

interface FeatureCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  features: CompetitorFeature[];
}

// Comprehensive comparison data
const COMPETITOR_DATA: FeatureCategory[] = [
  {
    id: 'reasoning',
    name: 'Deep Reasoning / Extended Thinking',
    icon: Brain,
    description: 'Control over how the AI thinks through complex problems',
    features: [
      {
        name: 'Thinking Budget / Turns',
        description: 'Control number of reasoning steps',
        importance: 'critical',
        educationalContent: 'More thinking turns = better answers for complex problems. Without control, the AI might stop thinking too early on hard questions or waste resources on simple ones.',
        chatgpt: { status: 'hidden', tooltip: 'o1 uses fixed internal reasoning, no user control' },
        claude: { status: 'partial', details: 'API only', tooltip: 'Extended thinking available but requires API access' },
        gemini: { status: 'hidden', tooltip: 'Thinking model exists but budget not exposed' },
        perplexity: { status: 'hidden', tooltip: 'Uses reasoning internally, no control' },
        deepseek: { status: 'partial', details: 'R1 shows', tooltip: 'R1 shows thinking but limited control' },
        metaAgent: { status: 'full', details: '1-10 slider', tooltip: 'Full control over thinking depth with visual slider' },
      },
      {
        name: 'Visible Thought Process',
        description: 'See the AI reasoning in real-time',
        importance: 'high',
        educationalContent: 'Seeing HOW the AI thinks helps you understand if it\'s on the right track. Hidden reasoning means you can\'t catch mistakes until the final answer.',
        chatgpt: { status: 'hidden', tooltip: 'o1 thinking is completely hidden from users' },
        claude: { status: 'partial', details: 'Collapsed', tooltip: 'Thinking shown but collapsed by default' },
        gemini: { status: 'hidden', tooltip: 'Flash Thinking exists but process hidden' },
        perplexity: { status: 'hidden', tooltip: 'No visibility into reasoning process' },
        deepseek: { status: 'full', details: 'Streaming', tooltip: 'Full streaming visibility of R1 thinking' },
        metaAgent: { status: 'full', details: 'Tree view', tooltip: 'Interactive thinking tree with expandable branches' },
      },
      {
        name: 'Reflection Loops',
        description: 'AI reviews and corrects its own thinking',
        importance: 'high',
        educationalContent: 'Self-reflection catches errors before they compound. Models that don\'t self-review tend to confidently give wrong answers.',
        chatgpt: { status: 'partial', details: 'Internal', tooltip: 'Happens internally in o1, not controllable' },
        claude: { status: 'partial', details: 'Implicit', tooltip: 'Part of thinking but not explicit' },
        gemini: { status: 'hidden', tooltip: 'No explicit reflection mechanism' },
        perplexity: { status: 'hidden', tooltip: 'Focus is on search, not reflection' },
        deepseek: { status: 'full', details: 'Explicit', tooltip: 'R1 explicitly shows reflection steps' },
        metaAgent: { status: 'full', details: 'Configurable', tooltip: 'Control number of reflection passes' },
      },
      {
        name: 'Inflection Points',
        description: 'Moments where reasoning changes direction',
        importance: 'medium',
        educationalContent: 'Inflection points show when the AI changes its mind or considers alternatives. This is where the most important reasoning happens.',
        chatgpt: { status: 'hidden', tooltip: 'Direction changes hidden in o1' },
        claude: { status: 'hidden', tooltip: 'Not explicitly surfaced' },
        gemini: { status: 'hidden', tooltip: 'No visibility into direction changes' },
        perplexity: { status: 'hidden', tooltip: 'Not applicable to search focus' },
        deepseek: { status: 'partial', details: 'Some', tooltip: 'Some visibility in R1 thinking' },
        metaAgent: { status: 'full', details: 'Highlighted', tooltip: 'Key decision points highlighted in thinking view' },
      },
    ],
  },
  {
    id: 'search',
    name: 'Search / Research Capabilities',
    icon: Search,
    description: 'How the AI gathers and processes information from the web',
    features: [
      {
        name: 'Search Iterations',
        description: 'Number of search rounds performed',
        importance: 'critical',
        educationalContent: 'More iterations = more comprehensive research. Single-pass search often misses important context that follow-up queries would catch.',
        chatgpt: { status: 'hidden', tooltip: 'Browse uses opaque search process' },
        claude: { status: 'hidden', tooltip: 'No native search capability' },
        gemini: { status: 'partial', details: 'Grounding', tooltip: 'Search grounding but iterations hidden' },
        perplexity: { status: 'partial', details: '1-2 shown', tooltip: 'Shows some iterations, limit not configurable' },
        deepseek: { status: 'hidden', tooltip: 'Limited search integration' },
        metaAgent: { status: 'full', details: '1-5 configurable', tooltip: 'Control exactly how many search rounds to perform' },
      },
      {
        name: 'Source Count Control',
        description: 'How many sources to consult',
        importance: 'high',
        educationalContent: 'More sources = less bias, more perspectives. But too many can slow things down. You should control this tradeoff.',
        chatgpt: { status: 'hidden', tooltip: 'No control over source count' },
        claude: { status: 'hidden', tooltip: 'N/A - no search' },
        gemini: { status: 'hidden', tooltip: 'Source count not exposed' },
        perplexity: { status: 'partial', details: 'Pro=more', tooltip: 'Pro tier gets more but count not configurable' },
        deepseek: { status: 'hidden', tooltip: 'No source count control' },
        metaAgent: { status: 'full', details: '5-50 slider', tooltip: 'Set exact number of sources to consult' },
      },
      {
        name: 'Search Depth Control',
        description: 'How deep to go into each source',
        importance: 'medium',
        educationalContent: 'Shallow search = quick answers. Deep search = comprehensive understanding. Different tasks need different depths.',
        chatgpt: { status: 'hidden', tooltip: 'Depth determined internally' },
        claude: { status: 'hidden', tooltip: 'N/A - no search' },
        gemini: { status: 'hidden', tooltip: 'No depth control exposed' },
        perplexity: { status: 'hidden', tooltip: 'Depth controlled by Perplexity, not user' },
        deepseek: { status: 'hidden', tooltip: 'No depth settings' },
        metaAgent: { status: 'full', details: 'Quick/Normal/Deep', tooltip: 'Three modes: Quick scan, Normal read, Deep analysis' },
      },
      {
        name: 'Source Visibility',
        description: 'See exactly which sources were used',
        importance: 'high',
        educationalContent: 'Knowing sources lets you verify claims and understand potential bias. Hidden sources = hidden reliability.',
        chatgpt: { status: 'partial', details: 'Links only', tooltip: 'Shows links but not how they were used' },
        claude: { status: 'hidden', tooltip: 'N/A' },
        gemini: { status: 'partial', details: 'Citations', tooltip: 'Inline citations but limited context' },
        perplexity: { status: 'full', details: 'Inline refs', tooltip: 'Good inline references with snippets' },
        deepseek: { status: 'partial', details: 'Basic', tooltip: 'Basic source attribution' },
        metaAgent: { status: 'full', details: 'Rich cards', tooltip: 'Source cards with reliability scores and key excerpts' },
      },
    ],
  },
  {
    id: 'parameters',
    name: 'Model Parameters',
    icon: SlidersHorizontal,
    description: 'Fine-tune how the model generates responses',
    features: [
      {
        name: 'Temperature',
        description: 'Controls creativity vs consistency',
        importance: 'critical',
        educationalContent: 'Low temp = consistent, safe answers. High temp = creative, varied answers. Code needs low temp; brainstorming needs high.',
        chatgpt: { status: 'hidden', tooltip: 'Playground only, not in ChatGPT UI' },
        claude: { status: 'hidden', tooltip: 'API only, not in claude.ai' },
        gemini: { status: 'hidden', tooltip: 'Not exposed in consumer UI' },
        perplexity: { status: 'hidden', tooltip: 'No temperature control' },
        deepseek: { status: 'partial', details: 'API', tooltip: 'API access only' },
        metaAgent: { status: 'full', details: '0-2 slider', tooltip: 'Visual slider with presets for common use cases' },
      },
      {
        name: 'Top-P (Nucleus Sampling)',
        description: 'Controls response diversity',
        importance: 'high',
        educationalContent: 'Top-P limits the "word pool" the AI picks from. Lower = more focused, higher = more diverse vocabulary.',
        chatgpt: { status: 'hidden', tooltip: 'Not accessible in UI' },
        claude: { status: 'hidden', tooltip: 'API only' },
        gemini: { status: 'hidden', tooltip: 'Not exposed' },
        perplexity: { status: 'hidden', tooltip: 'No control' },
        deepseek: { status: 'partial', details: 'API', tooltip: 'API only' },
        metaAgent: { status: 'full', details: '0-1 slider', tooltip: 'Fine-tune response diversity' },
      },
      {
        name: 'Top-K',
        description: 'Limits vocabulary choices',
        importance: 'medium',
        educationalContent: 'Top-K sets a hard limit on word options. Useful for preventing bizarre outputs while maintaining some variety.',
        chatgpt: { status: 'hidden', tooltip: 'Not available' },
        claude: { status: 'hidden', tooltip: 'Not exposed' },
        gemini: { status: 'hidden', tooltip: 'Not in UI' },
        perplexity: { status: 'hidden', tooltip: 'No access' },
        deepseek: { status: 'hidden', tooltip: 'Not available' },
        metaAgent: { status: 'full', details: '1-100', tooltip: 'Set exact vocabulary limit' },
      },
      {
        name: 'Frequency/Presence Penalty',
        description: 'Controls repetition',
        importance: 'medium',
        educationalContent: 'Penalties reduce repetition. Frequency penalizes words used often. Presence penalizes any reuse. Critical for long-form content.',
        chatgpt: { status: 'hidden', tooltip: 'Playground only' },
        claude: { status: 'hidden', tooltip: 'Not exposed' },
        gemini: { status: 'hidden', tooltip: 'Not available' },
        perplexity: { status: 'hidden', tooltip: 'No control' },
        deepseek: { status: 'partial', details: 'API', tooltip: 'API only' },
        metaAgent: { status: 'full', details: 'Both sliders', tooltip: 'Independent control of both penalty types' },
      },
      {
        name: 'Max Tokens',
        description: 'Response length limit',
        importance: 'high',
        educationalContent: 'Without control, the AI might stop mid-thought or ramble endlessly. Token limits let you match response length to task.',
        chatgpt: { status: 'hidden', tooltip: 'No control in UI' },
        claude: { status: 'hidden', tooltip: 'API only' },
        gemini: { status: 'hidden', tooltip: 'Not exposed' },
        perplexity: { status: 'hidden', tooltip: 'No limit setting' },
        deepseek: { status: 'partial', details: 'API', tooltip: 'API only' },
        metaAgent: { status: 'full', details: 'Up to model max', tooltip: 'Set exact token limit or use presets' },
      },
    ],
  },
  {
    id: 'rag',
    name: 'RAG / Retrieval Settings',
    icon: Database,
    description: 'How the AI retrieves and uses your documents',
    features: [
      {
        name: 'Chunk Size',
        description: 'How documents are split for retrieval',
        importance: 'critical',
        educationalContent: 'Small chunks = precise but may miss context. Large chunks = more context but may retrieve irrelevant info. The optimal size depends on your documents.',
        chatgpt: { status: 'hidden', tooltip: 'GPTs use fixed chunking' },
        claude: { status: 'hidden', tooltip: 'Projects use opaque chunking' },
        gemini: { status: 'hidden', tooltip: 'Not exposed' },
        perplexity: { status: 'hidden', tooltip: 'N/A - search focused' },
        deepseek: { status: 'hidden', tooltip: 'No RAG interface' },
        metaAgent: { status: 'full', details: '256-2048 tokens', tooltip: 'Adjust chunk size based on document type' },
      },
      {
        name: 'Chunk Overlap',
        description: 'Overlap between document chunks',
        importance: 'high',
        educationalContent: 'Overlap prevents losing information at chunk boundaries. Critical for documents where context spans multiple sections.',
        chatgpt: { status: 'hidden', tooltip: 'Fixed, not configurable' },
        claude: { status: 'hidden', tooltip: 'Not exposed' },
        gemini: { status: 'hidden', tooltip: 'No control' },
        perplexity: { status: 'hidden', tooltip: 'N/A' },
        deepseek: { status: 'hidden', tooltip: 'No RAG' },
        metaAgent: { status: 'full', details: '0-50%', tooltip: 'Control overlap percentage' },
      },
      {
        name: 'Similarity Threshold',
        description: 'Minimum relevance score for retrieval',
        importance: 'high',
        educationalContent: 'Too high = misses relevant context. Too low = retrieves noise. Finding the right threshold is crucial for accuracy.',
        chatgpt: { status: 'hidden', tooltip: 'Internal threshold' },
        claude: { status: 'hidden', tooltip: 'Not configurable' },
        gemini: { status: 'hidden', tooltip: 'Hidden' },
        perplexity: { status: 'hidden', tooltip: 'N/A' },
        deepseek: { status: 'hidden', tooltip: 'No RAG' },
        metaAgent: { status: 'full', details: '0.5-0.95', tooltip: 'Fine-tune retrieval precision' },
      },
      {
        name: 'Top-K Retrieved',
        description: 'Number of chunks to retrieve',
        importance: 'medium',
        educationalContent: 'More chunks = more context but higher cost and potential for confusion. Fewer = faster but might miss info.',
        chatgpt: { status: 'hidden', tooltip: 'Fixed by OpenAI' },
        claude: { status: 'hidden', tooltip: 'Not exposed' },
        gemini: { status: 'hidden', tooltip: 'Hidden' },
        perplexity: { status: 'hidden', tooltip: 'N/A' },
        deepseek: { status: 'hidden', tooltip: 'No RAG' },
        metaAgent: { status: 'full', details: '3-20 chunks', tooltip: 'Balance context vs performance' },
      },
      {
        name: 'Embedding Model Choice',
        description: 'Which model creates document embeddings',
        importance: 'medium',
        educationalContent: 'Different embedding models have different strengths. Technical docs need different embeddings than conversational text.',
        chatgpt: { status: 'hidden', tooltip: 'Uses ada-002/3-small fixed' },
        claude: { status: 'hidden', tooltip: 'Voyage fixed' },
        gemini: { status: 'hidden', tooltip: 'Gecko fixed' },
        perplexity: { status: 'hidden', tooltip: 'N/A' },
        deepseek: { status: 'hidden', tooltip: 'No RAG' },
        metaAgent: { status: 'full', details: 'Multi-model', tooltip: 'Choose from OpenAI, Cohere, Voyage embeddings' },
      },
    ],
  },
  {
    id: 'tools',
    name: 'Agent & Tool Configuration',
    icon: Wrench,
    description: 'Control over AI agents and external tool integrations',
    features: [
      {
        name: 'YAML Agent Editing',
        description: 'Define agent behavior in readable YAML',
        importance: 'critical',
        educationalContent: 'YAML configuration lets you precisely define agent personas, constraints, and behaviors. It\'s the difference between hoping the AI does what you want vs ensuring it.',
        chatgpt: { status: 'hidden', tooltip: 'GPT Builder is limited GUI only' },
        claude: { status: 'hidden', tooltip: 'Projects have basic instructions only' },
        gemini: { status: 'hidden', tooltip: 'Gems are GUI-only' },
        perplexity: { status: 'hidden', tooltip: 'No agent customization' },
        deepseek: { status: 'hidden', tooltip: 'No agent system' },
        metaAgent: { status: 'full', details: 'Full YAML', tooltip: 'Edit complete agent YAML with syntax highlighting' },
      },
      {
        name: 'MCP Server Configuration',
        description: 'Connect to Model Context Protocol servers',
        importance: 'critical',
        educationalContent: 'MCP lets AI connect to databases, APIs, and tools seamlessly. Without MCP, you\'re copying data back and forth manually.',
        chatgpt: { status: 'hidden', tooltip: 'No MCP support' },
        claude: { status: 'partial', details: 'Desktop only', tooltip: 'Claude Desktop supports MCP' },
        gemini: { status: 'hidden', tooltip: 'No MCP' },
        perplexity: { status: 'hidden', tooltip: 'No MCP' },
        deepseek: { status: 'hidden', tooltip: 'No MCP' },
        metaAgent: { status: 'full', details: 'Visual config', tooltip: 'Visual MCP server manager with one-click setup' },
      },
      {
        name: 'Function Definitions',
        description: 'Define custom functions the AI can call',
        importance: 'high',
        educationalContent: 'Custom functions extend what the AI can do. Without this, you\'re limited to what the provider decided to build.',
        chatgpt: { status: 'partial', details: 'Actions', tooltip: 'GPT Actions but complex to set up' },
        claude: { status: 'partial', details: 'Tool use', tooltip: 'API tool use but not in UI' },
        gemini: { status: 'partial', details: 'Extensions', tooltip: 'Extensions exist but limited' },
        perplexity: { status: 'hidden', tooltip: 'No custom functions' },
        deepseek: { status: 'partial', details: 'API', tooltip: 'API function calling only' },
        metaAgent: { status: 'full', details: 'Visual builder', tooltip: 'Drag-and-drop function builder' },
      },
      {
        name: 'Tool Permission Control',
        description: 'Control which tools each agent can access',
        importance: 'high',
        educationalContent: 'Not every agent should have access to every tool. A research agent doesn\'t need code execution. Permission control = safety.',
        chatgpt: { status: 'hidden', tooltip: 'All-or-nothing in GPTs' },
        claude: { status: 'hidden', tooltip: 'No fine-grained control' },
        gemini: { status: 'hidden', tooltip: 'Fixed extensions' },
        perplexity: { status: 'hidden', tooltip: 'N/A' },
        deepseek: { status: 'hidden', tooltip: 'No tool system' },
        metaAgent: { status: 'full', details: 'Per-agent', tooltip: 'Whitelist/blacklist tools per agent' },
      },
      {
        name: 'Multi-Agent Orchestration',
        description: 'Multiple agents working together',
        importance: 'medium',
        educationalContent: 'Complex tasks need specialized agents working together. One agent researches, another analyzes, another writes. Orchestration makes this seamless.',
        chatgpt: { status: 'hidden', tooltip: 'Single agent only' },
        claude: { status: 'hidden', tooltip: 'No multi-agent' },
        gemini: { status: 'hidden', tooltip: 'Single agent' },
        perplexity: { status: 'hidden', tooltip: 'No agents' },
        deepseek: { status: 'hidden', tooltip: 'Single model' },
        metaAgent: { status: 'full', details: 'Workflow builder', tooltip: 'Visual multi-agent workflow designer' },
      },
    ],
  },
];

// Status indicator component
function StatusBadge({ status, details, tooltip }: FeatureStatus) {
  const [showTooltip, setShowTooltip] = useState(false);

  const getStatusStyle = () => {
    switch (status) {
      case 'hidden':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-700',
          icon: <X className="w-3.5 h-3.5" />,
          label: 'Hidden',
        };
      case 'partial':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-700',
          icon: <AlertTriangle className="w-3.5 h-3.5" />,
          label: details || 'Partial',
        };
      case 'full':
        return {
          bg: 'bg-teal-50',
          border: 'border-teal-200',
          text: 'text-teal-700',
          icon: <Check className="w-3.5 h-3.5" />,
          label: details || 'Yes',
        };
    }
  };

  const style = getStatusStyle();

  return (
    <div className="relative">
      <button
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${style.bg} ${style.border} ${style.text} hover:shadow-sm`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
      >
        {style.icon}
        <span className="max-w-[80px] truncate">{style.label}</span>
      </button>

      {/* Tooltip */}
      {showTooltip && tooltip && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-warm-900 text-white text-xs rounded-lg shadow-lg max-w-[200px] text-center whitespace-normal">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-warm-900" />
        </div>
      )}
    </div>
  );
}

// Importance badge
function ImportanceBadge({ level }: { level: 'critical' | 'high' | 'medium' }) {
  const styles = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-amber-100 text-amber-700 border-amber-200',
    medium: 'bg-warm-100 text-warm-600 border-warm-200',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide border ${styles[level]}`}>
      {level}
    </span>
  );
}

// Educational tooltip component
function EducationalTooltip({ content, isOpen, onToggle }: { content: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="relative inline-block">
      <button
        onClick={onToggle}
        className="p-1 rounded-full text-warm-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
        aria-label="Learn more"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute z-50 left-6 top-0 w-72 p-4 bg-white border border-warm-200 rounded-xl shadow-xl">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-warm-700 leading-relaxed">{content}</p>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="absolute top-2 right-2 p-1 rounded-full text-warm-400 hover:text-warm-600 hover:bg-warm-100"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// Main component
export function CompetitorDashboard() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('reasoning');
  const [showExplanations, setShowExplanations] = useState(true);
  const [openTooltip, setOpenTooltip] = useState<string | null>(null);

  const competitors = ['ChatGPT', 'Claude', 'Gemini', 'Perplexity', 'DeepSeek', 'Meta Agent'];
  const competitorKeys = ['chatgpt', 'claude', 'gemini', 'perplexity', 'deepseek', 'metaAgent'] as const;

  // Calculate summary stats
  const calculateStats = () => {
    let metaAgentFull = 0;
    let competitorFull = 0;
    let totalFeatures = 0;

    COMPETITOR_DATA.forEach(category => {
      category.features.forEach(feature => {
        totalFeatures++;
        if (feature.metaAgent.status === 'full') metaAgentFull++;
        // Count competitor "full" status
        competitorKeys.slice(0, -1).forEach(key => {
          if (feature[key].status === 'full') competitorFull++;
        });
      });
    });

    return {
      metaAgentFull,
      totalFeatures,
      competitorAvg: Math.round(competitorFull / 5), // 5 competitors
    };
  };

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-warm-50">
      <div className="max-w-7xl mx-auto px-6 py-12 lg:px-12 lg:py-16">
        {/* Header */}
        <SectionHeader
          label="Transparency Report"
          title="What They Hide vs What We Show"
          subtitle="Every AI platform makes choices about what to expose. See exactly what's hidden and why it matters."
          action={
            <AccentButton
              onClick={() => setShowExplanations(!showExplanations)}
              size="sm"
              icon={showExplanations ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              iconPosition="left"
            >
              {showExplanations ? 'Hide' : 'Show'} Explanations
            </AccentButton>
          }
        />

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="bg-white border border-warm-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                <Check className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-2xl font-light text-teal-600">{stats.metaAgentFull}/{stats.totalFeatures}</p>
                <p className="text-sm text-warm-500">Features exposed in Meta Agent</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-warm-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-warm-100 flex items-center justify-center">
                <EyeOff className="w-5 h-5 text-warm-500" />
              </div>
              <div>
                <p className="text-2xl font-light text-warm-600">{stats.competitorAvg}/{stats.totalFeatures}</p>
                <p className="text-sm text-warm-500">Avg features exposed by competitors</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-teal-50 to-warm-50 border border-teal-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-light text-teal-700">
                  {Math.round((stats.metaAgentFull / stats.competitorAvg) * 100 - 100)}% more
                </p>
                <p className="text-sm text-warm-600">Control vs competitor average</p>
              </div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-4">
          {COMPETITOR_DATA.map((category) => {
            const Icon = category.icon;
            const isExpanded = expandedCategory === category.id;

            return (
              <div
                key={category.id}
                className="bg-white border border-warm-200 rounded-xl overflow-hidden transition-all duration-300"
              >
                {/* Category Header */}
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                  className="w-full px-6 py-5 flex items-center justify-between hover:bg-warm-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-teal-600" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-warm-900 text-lg">{category.name}</h3>
                      <p className="text-sm text-warm-500">{category.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-warm-400">{category.features.length} features</span>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-warm-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-warm-400" />
                    )}
                  </div>
                </button>

                {/* Category Content */}
                {isExpanded && (
                  <div className="border-t border-warm-100">
                    {/* Table Header */}
                    <div className="hidden lg:grid lg:grid-cols-8 gap-4 px-6 py-3 bg-warm-50 text-xs font-medium text-warm-500 uppercase tracking-wide">
                      <div className="col-span-2">Feature</div>
                      {competitors.map((comp, i) => (
                        <div key={comp} className={`text-center ${i === competitors.length - 1 ? 'text-teal-600 font-semibold' : ''}`}>
                          {comp}
                        </div>
                      ))}
                    </div>

                    {/* Features */}
                    <div className="divide-y divide-warm-100">
                      {category.features.map((feature, featureIndex) => (
                        <div
                          key={feature.name}
                          className="px-6 py-4 hover:bg-warm-50/50 transition-colors"
                        >
                          {/* Desktop Layout */}
                          <div className="hidden lg:grid lg:grid-cols-8 gap-4 items-center">
                            <div className="col-span-2">
                              <div className="flex items-start gap-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-warm-900">{feature.name}</span>
                                    <ImportanceBadge level={feature.importance} />
                                  </div>
                                  <p className="text-sm text-warm-500">{feature.description}</p>
                                </div>
                                {showExplanations && (
                                  <EducationalTooltip
                                    content={feature.educationalContent}
                                    isOpen={openTooltip === `${category.id}-${featureIndex}`}
                                    onToggle={() => setOpenTooltip(
                                      openTooltip === `${category.id}-${featureIndex}` ? null : `${category.id}-${featureIndex}`
                                    )}
                                  />
                                )}
                              </div>
                            </div>
                            {competitorKeys.map((key, i) => (
                              <div key={key} className={`flex justify-center ${i === competitorKeys.length - 1 ? 'bg-teal-50/50 -mx-2 px-2 py-2 rounded-lg' : ''}`}>
                                <StatusBadge {...feature[key]} />
                              </div>
                            ))}
                          </div>

                          {/* Mobile Layout */}
                          <div className="lg:hidden space-y-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-warm-900">{feature.name}</span>
                                  <ImportanceBadge level={feature.importance} />
                                </div>
                                <p className="text-sm text-warm-500">{feature.description}</p>
                              </div>
                              {showExplanations && (
                                <EducationalTooltip
                                  content={feature.educationalContent}
                                  isOpen={openTooltip === `${category.id}-${featureIndex}-mobile`}
                                  onToggle={() => setOpenTooltip(
                                    openTooltip === `${category.id}-${featureIndex}-mobile` ? null : `${category.id}-${featureIndex}-mobile`
                                  )}
                                />
                              )}
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              {competitorKeys.map((key, i) => (
                                <div key={key} className={`flex flex-col items-center gap-1 p-2 rounded-lg ${i === competitorKeys.length - 1 ? 'bg-teal-50 border border-teal-200' : 'bg-warm-50'}`}>
                                  <span className="text-[10px] font-medium text-warm-500">{competitors[i]}</span>
                                  <StatusBadge {...feature[key]} />
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Educational Content (expanded) */}
                          {showExplanations && openTooltip === `${category.id}-${featureIndex}` && (
                            <div className="mt-4 p-4 bg-gradient-to-r from-teal-50 to-warm-50 rounded-lg border border-teal-100">
                              <div className="flex items-start gap-3">
                                <Sparkles className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-warm-900 mb-1">Why This Matters</p>
                                  <p className="text-sm text-warm-600 leading-relaxed">{feature.educationalContent}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-10 bg-white border border-warm-200 rounded-xl p-6">
          <h3 className="font-medium text-warm-900 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-warm-400" />
            Understanding the Status Indicators
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="px-2.5 py-1 rounded-full text-xs font-medium border bg-red-50 border-red-200 text-red-700 flex items-center gap-1.5">
                <X className="w-3.5 h-3.5" />
                Hidden
              </div>
              <p className="text-sm text-warm-600">Feature exists internally but is completely hidden from users. No control or visibility.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="px-2.5 py-1 rounded-full text-xs font-medium border bg-amber-50 border-amber-200 text-amber-700 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Partial
              </div>
              <p className="text-sm text-warm-600">Limited access - typically API-only, requires technical setup, or shows limited information.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="px-2.5 py-1 rounded-full text-xs font-medium border bg-teal-50 border-teal-200 text-teal-700 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                Full
              </div>
              <p className="text-sm text-warm-600">Complete user control with intuitive UI. No technical knowledge required.</p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-10 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-teal-500 text-white rounded-full font-medium hover:bg-teal-600 transition-colors cursor-pointer">
            <Settings2 className="w-5 h-5" />
            <span>Experience Full Control - Try Meta Agent</span>
          </div>
          <p className="mt-3 text-sm text-warm-500">
            No hidden settings. No API required. Just powerful AI with complete transparency.
          </p>
        </div>
      </div>
    </div>
  );
}

export default CompetitorDashboard;
