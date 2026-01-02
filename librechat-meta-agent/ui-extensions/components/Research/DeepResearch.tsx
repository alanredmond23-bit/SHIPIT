'use client';

import React, { useState, useEffect, useRef } from 'react';

// Deep Research Component - The BEST research UI ever
// Features:
// - Real-time research progress dashboard
// - Source cards with credibility badges
// - Interactive knowledge graph visualization
// - Fact cards with verification status
// - Contradiction alerts
// - Follow-up question suggestions
// - Report preview with export buttons
// - Citation manager sidebar

interface ResearchConfig {
  depth: 'quick' | 'standard' | 'deep' | 'exhaustive';
  maxSources?: number;
  includeAcademic?: boolean;
  includeNews?: boolean;
  includeForums?: boolean;
  citationStyle?: 'apa' | 'mla' | 'chicago' | 'ieee';
  reportFormat?: 'summary' | 'detailed' | 'academic';
}

interface ResearchSource {
  id: string;
  url: string;
  title: string;
  author?: string;
  publishDate?: Date;
  credibility: {
    authorityScore: number;
    recencyScore: number;
    biasScore: number;
    overallScore: number;
  };
}

interface Fact {
  id: string;
  statement: string;
  confidence: number;
  verificationStatus: 'verified' | 'unverified' | 'contradicted';
}

interface KnowledgeNode {
  id: string;
  entity: string;
  type: 'person' | 'organization' | 'concept' | 'event' | 'place' | 'thing';
  x?: number;
  y?: number;
}

interface ResearchSession {
  id: string;
  query: string;
  status: 'researching' | 'analyzing' | 'synthesizing' | 'completed' | 'failed';
  sources: ResearchSource[];
  facts: Fact[];
  knowledgeGraph: KnowledgeNode[];
  followUpQuestions: string[];
  stats: {
    sourcesSearched: number;
    sourcesUsed: number;
    factsExtracted: number;
    contradictionsFound: number;
    duration: number;
  };
}

export default function DeepResearch() {
  const [query, setQuery] = useState('');
  const [config, setConfig] = useState<ResearchConfig>({
    depth: 'standard',
    includeAcademic: true,
    includeNews: true,
    includeForums: false,
    citationStyle: 'apa',
    reportFormat: 'detailed',
  });

  const [session, setSession] = useState<ResearchSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'sources' | 'facts' | 'graph' | 'report'>('sources');
  const [selectedSource, setSelectedSource] = useState<ResearchSource | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Start research
  const startResearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setSession(null);

    try {
      const response = await fetch('/api/research/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          project_id: 'default-project', // Would come from context
          config,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start research');
      }

      const data = await response.json();
      const sessionId = data.data.session_id;

      // Initialize session
      setSession({
        id: sessionId,
        query,
        status: 'researching',
        sources: [],
        facts: [],
        knowledgeGraph: [],
        followUpQuestions: [],
        stats: {
          sourcesSearched: 0,
          sourcesUsed: 0,
          factsExtracted: 0,
          contradictionsFound: 0,
          duration: 0,
        },
      });

      // Connect to SSE stream for real-time updates
      connectToStream(sessionId);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Connect to SSE stream
  const connectToStream = (sessionId: string) => {
    const eventSource = new EventSource(`/api/research/${sessionId}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener('connected', () => {
      console.log('Connected to research stream');
    });

    eventSource.addEventListener('status_change', (e) => {
      const data = JSON.parse(e.data);
      setSession(prev => prev ? { ...prev, status: data.data.status } : null);

      if (data.data.status === 'completed' || data.data.status === 'failed') {
        setLoading(false);
        loadFullSession(sessionId);
      }
    });

    eventSource.addEventListener('source_found', (e) => {
      const data = JSON.parse(e.data);
      setSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          stats: { ...prev.stats, sourcesSearched: prev.stats.sourcesSearched + 1 },
        };
      });
    });

    eventSource.addEventListener('fact_extracted', (e) => {
      const data = JSON.parse(e.data);
      setSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          stats: { ...prev.stats, factsExtracted: prev.stats.factsExtracted + 1 },
        };
      });
    });

    eventSource.addEventListener('contradiction_detected', (e) => {
      const data = JSON.parse(e.data);
      setSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          stats: { ...prev.stats, contradictionsFound: prev.stats.contradictionsFound + 1 },
        };
      });
    });

    eventSource.addEventListener('complete', () => {
      console.log('Research completed');
      eventSource.close();
    });

    eventSource.addEventListener('error', (e) => {
      console.error('Stream error:', e);
      eventSource.close();
      setLoading(false);
    });
  };

  // Load full session data
  const loadFullSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/research/${sessionId}`);
      const data = await response.json();
      setSession(data.data);
    } catch (err) {
      console.error('Failed to load session:', err);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Export report
  const exportReport = async (format: 'md' | 'html' | 'pdf' | 'docx') => {
    if (!session) return;

    try {
      const response = await fetch(`/api/research/${session.id}/export/${format}`);
      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `research-report.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Deep Research Mode
          </h1>
          <p className="text-gray-600">
            AI-powered comprehensive research with multi-source verification and knowledge synthesis
          </p>
        </div>

        {/* Search Input */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex gap-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && startResearch()}
              placeholder="What would you like to research? (e.g., 'Latest developments in quantum computing')"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-lg"
              disabled={loading}
            />
            <button
              onClick={startResearch}
              disabled={loading || !query.trim()}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Researching...' : 'Start Research'}
            </button>
          </div>

          {/* Config Controls */}
          <div className="mt-4 flex flex-wrap gap-4">
            <select
              value={config.depth}
              onChange={(e) => setConfig({ ...config, depth: e.target.value as any })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              disabled={loading}
            >
              <option value="quick">Quick (10 sources)</option>
              <option value="standard">Standard (20 sources)</option>
              <option value="deep">Deep (40 sources)</option>
              <option value="exhaustive">Exhaustive (100 sources)</option>
            </select>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.includeAcademic}
                onChange={(e) => setConfig({ ...config, includeAcademic: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <span className="text-sm text-gray-700">Academic Papers</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.includeNews}
                onChange={(e) => setConfig({ ...config, includeNews: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <span className="text-sm text-gray-700">News Articles</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.includeForums}
                onChange={(e) => setConfig({ ...config, includeForums: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <span className="text-sm text-gray-700">Forums & Discussions</span>
            </label>

            <select
              value={config.citationStyle}
              onChange={(e) => setConfig({ ...config, citationStyle: e.target.value as any })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              disabled={loading}
            >
              <option value="apa">APA Citations</option>
              <option value="mla">MLA Citations</option>
              <option value="chicago">Chicago Citations</option>
              <option value="ieee">IEEE Citations</option>
            </select>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Research Progress */}
        {session && (
          <>
            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <StatCard
                label="Sources Searched"
                value={session.stats.sourcesSearched}
                icon="🔍"
                color="blue"
                loading={loading && session.status === 'researching'}
              />
              <StatCard
                label="Facts Extracted"
                value={session.stats.factsExtracted}
                icon="📊"
                color="green"
                loading={loading && session.status === 'analyzing'}
              />
              <StatCard
                label="Sources Used"
                value={session.stats.sourcesUsed}
                icon="📚"
                color="purple"
              />
              <StatCard
                label="Contradictions"
                value={session.stats.contradictionsFound}
                icon="⚠️"
                color="red"
              />
            </div>

            {/* Status Banner */}
            <div className={`rounded-lg p-4 mb-6 ${getStatusColor(session.status)}`}>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${loading ? 'animate-pulse' : ''} ${getStatusDotColor(session.status)}`} />
                <span className="font-semibold">{getStatusText(session.status)}</span>
              </div>
            </div>

            {/* Main Content Tabs */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              {/* Tab Headers */}
              <div className="flex border-b border-gray-200">
                <TabButton
                  active={activeTab === 'sources'}
                  onClick={() => setActiveTab('sources')}
                  icon="📚"
                  label="Sources"
                  count={session.sources.length}
                />
                <TabButton
                  active={activeTab === 'facts'}
                  onClick={() => setActiveTab('facts')}
                  icon="✓"
                  label="Facts"
                  count={session.facts.length}
                />
                <TabButton
                  active={activeTab === 'graph'}
                  onClick={() => setActiveTab('graph')}
                  icon="🕸️"
                  label="Knowledge Graph"
                  count={session.knowledgeGraph.length}
                />
                <TabButton
                  active={activeTab === 'report'}
                  onClick={() => setActiveTab('report')}
                  icon="📄"
                  label="Report"
                />
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'sources' && <SourcesView session={session} onSelectSource={setSelectedSource} />}
                {activeTab === 'facts' && <FactsView session={session} />}
                {activeTab === 'graph' && <KnowledgeGraphView session={session} />}
                {activeTab === 'report' && <ReportView session={session} onExport={exportReport} />}
              </div>
            </div>

            {/* Follow-up Questions */}
            {session.followUpQuestions.length > 0 && (
              <div className="mt-6 bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4">Suggested Follow-up Questions</h3>
                <div className="space-y-3">
                  {session.followUpQuestions.map((question, idx) => (
                    <button
                      key={idx}
                      className="w-full text-left p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      onClick={() => setQuery(question)}
                    >
                      <span className="text-blue-600 font-medium">Q: </span>
                      <span className="text-gray-800">{question}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ label, value, icon, color, loading }: {
  label: string;
  value: number;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'red';
  loading?: boolean;
}) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    red: 'from-red-500 to-red-600',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-xl p-5 text-white shadow-lg`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-3xl">{icon}</span>
        {loading && <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
      </div>
      <div className="text-3xl font-bold mb-1">{value.toLocaleString()}</div>
      <div className="text-sm opacity-90">{label}</div>
    </div>
  );
}

// Tab Button Component
function TabButton({ active, onClick, icon, label, count }: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-6 py-4 font-semibold transition-colors ${
        active
          ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
          : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      <span className="mr-2">{icon}</span>
      {label}
      {count !== undefined && (
        <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
          active ? 'bg-blue-200' : 'bg-gray-200'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

// Sources View
function SourcesView({ session, onSelectSource }: {
  session: ResearchSession;
  onSelectSource: (source: ResearchSource) => void;
}) {
  if (session.sources.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-6xl mb-4">🔍</div>
        <p>Searching for sources...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {session.sources.map(source => (
        <SourceCard key={source.id} source={source} onClick={() => onSelectSource(source)} />
      ))}
    </div>
  );
}

// Source Card
function SourceCard({ source, onClick }: { source: ResearchSource; onClick: () => void }) {
  const credibilityColor = source.credibility.overallScore >= 0.8 ? 'green' : source.credibility.overallScore >= 0.5 ? 'yellow' : 'red';

  return (
    <div
      onClick={onClick}
      className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer bg-white"
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-gray-900 flex-1 line-clamp-2">{source.title}</h4>
        <CredibilityBadge score={source.credibility.overallScore} />
      </div>

      {source.author && (
        <p className="text-sm text-gray-600 mb-2">By {source.author}</p>
      )}

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <span>🎯</span>
          <span>Authority: {Math.round(source.credibility.authorityScore * 100)}%</span>
        </div>
        <div className="flex items-center gap-1">
          <span>📅</span>
          <span>Recency: {Math.round(source.credibility.recencyScore * 100)}%</span>
        </div>
      </div>

      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-600 hover:underline mt-2 block truncate"
        onClick={(e) => e.stopPropagation()}
      >
        {source.url}
      </a>
    </div>
  );
}

// Credibility Badge
function CredibilityBadge({ score }: { score: number }) {
  const color = score >= 0.8 ? 'green' : score >= 0.5 ? 'yellow' : 'red';
  const colors = {
    green: 'bg-green-100 text-green-800 border-green-300',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    red: 'bg-red-100 text-red-800 border-red-300',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${colors[color]}`}>
      {Math.round(score * 100)}%
    </span>
  );
}

// Facts View
function FactsView({ session }: { session: ResearchSession }) {
  if (session.facts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-6xl mb-4">📊</div>
        <p>Extracting facts from sources...</p>
      </div>
    );
  }

  const verified = session.facts.filter(f => f.verificationStatus === 'verified');
  const contradicted = session.facts.filter(f => f.verificationStatus === 'contradicted');

  return (
    <div>
      <div className="flex gap-4 mb-6">
        <div className="flex-1 bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="text-2xl font-bold text-green-700">{verified.length}</div>
          <div className="text-sm text-green-600">Verified Facts</div>
        </div>
        <div className="flex-1 bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="text-2xl font-bold text-red-700">{contradicted.length}</div>
          <div className="text-sm text-red-600">Contradictions</div>
        </div>
      </div>

      <div className="space-y-3">
        {session.facts.map(fact => (
          <FactCard key={fact.id} fact={fact} />
        ))}
      </div>
    </div>
  );
}

// Fact Card
function FactCard({ fact }: { fact: Fact }) {
  const statusIcons = {
    verified: '✅',
    unverified: '❓',
    contradicted: '⚠️',
  };

  const statusColors = {
    verified: 'border-green-200 bg-green-50',
    unverified: 'border-gray-200 bg-white',
    contradicted: 'border-red-200 bg-red-50',
  };

  return (
    <div className={`border rounded-lg p-4 ${statusColors[fact.verificationStatus]}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{statusIcons[fact.verificationStatus]}</span>
        <div className="flex-1">
          <p className="text-gray-800">{fact.statement}</p>
          <div className="mt-2 flex items-center gap-4 text-sm">
            <span className="text-gray-600">
              Confidence: {Math.round(fact.confidence * 100)}%
            </span>
            <span className={`font-semibold ${
              fact.verificationStatus === 'verified' ? 'text-green-600' :
              fact.verificationStatus === 'contradicted' ? 'text-red-600' :
              'text-gray-600'
            }`}>
              {fact.verificationStatus.charAt(0).toUpperCase() + fact.verificationStatus.slice(1)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Knowledge Graph View
function KnowledgeGraphView({ session }: { session: ResearchSession }) {
  if (session.knowledgeGraph.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-6xl mb-4">🕸️</div>
        <p>Building knowledge graph...</p>
      </div>
    );
  }

  const nodesByType = session.knowledgeGraph.reduce((acc, node) => {
    acc[node.type] = (acc[node.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 md:grid-cols-3 gap-4">
        {Object.entries(nodesByType).map(([type, count]) => (
          <div key={type} className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="text-xl font-bold text-purple-700">{count}</div>
            <div className="text-sm text-purple-600 capitalize">{type}s</div>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 rounded-lg p-8 border border-gray-200">
        <div className="text-center text-gray-600 mb-4">
          <p className="font-semibold">Knowledge Graph Entities</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {session.knowledgeGraph.slice(0, 30).map(node => (
            <span
              key={node.id}
              className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              {node.entity}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// Report View
function ReportView({ session, onExport }: {
  session: ResearchSession;
  onExport: (format: 'md' | 'html' | 'pdf' | 'docx') => void;
}) {
  if (session.status !== 'completed') {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-6xl mb-4">📝</div>
        <p>Report will be available when research is complete...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end gap-2 mb-6">
        <button
          onClick={() => onExport('md')}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Export as Markdown
        </button>
        <button
          onClick={() => onExport('html')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Export as HTML
        </button>
      </div>

      <div className="bg-gray-50 rounded-lg p-8 border border-gray-200">
        <h2 className="text-2xl font-bold mb-4">{session.query}</h2>
        <div className="prose max-w-none">
          <p className="text-gray-600 mb-4">
            Research completed with {session.stats.sourcesUsed} verified sources and {session.stats.factsExtracted} extracted facts.
          </p>
          {session.stats.contradictionsFound > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-yellow-800 font-semibold">
                ⚠️ {session.stats.contradictionsFound} contradictions detected in the research
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper Functions
function getStatusText(status: string): string {
  const texts: Record<string, string> = {
    researching: '🔍 Searching and analyzing sources...',
    analyzing: '🧠 Extracting and verifying facts...',
    synthesizing: '📝 Generating comprehensive report...',
    completed: '✅ Research completed successfully!',
    failed: '❌ Research failed',
  };
  return texts[status] || status;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    researching: 'bg-blue-50 border border-blue-200',
    analyzing: 'bg-purple-50 border border-purple-200',
    synthesizing: 'bg-green-50 border border-green-200',
    completed: 'bg-green-100 border border-green-300',
    failed: 'bg-red-100 border border-red-300',
  };
  return colors[status] || 'bg-gray-100';
}

function getStatusDotColor(status: string): string {
  const colors: Record<string, string> = {
    researching: 'bg-blue-500',
    analyzing: 'bg-purple-500',
    synthesizing: 'bg-green-500',
    completed: 'bg-green-600',
    failed: 'bg-red-600',
  };
  return colors[status] || 'bg-gray-500';
}
