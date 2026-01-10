'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Types
export type ResearchScope = 'web' | 'academic' | 'news';
export type CitationStyle = 'apa' | 'mla' | 'chicago' | 'bibtex';
export type ResearchStatus = 'researching' | 'analyzing' | 'synthesizing' | 'completed' | 'failed' | 'paused';

export interface ResearchConfig {
  depth: 'quick' | 'standard' | 'deep';
  scope: ResearchScope[];
  citationStyle: CitationStyle;
  maxSources: number;
}

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

export interface ResearchFact {
  id: string;
  statement: string;
  confidence: number;
  sourceIds: string[];
  verificationStatus: 'verified' | 'unverified' | 'contradicted';
}

export interface ResearchReport {
  title: string;
  abstract: string;
  sections: {
    title: string;
    content: string;
    citations?: string[];
  }[];
  keyFindings: string[];
  limitations?: string[];
  bibliography: string[];
  generatedAt: Date | string;
}

export interface ResearchSession {
  id: string;
  query: string;
  config: ResearchConfig;
  status: ResearchStatus;
  sources: ResearchSource[];
  facts: ResearchFact[];
  report?: ResearchReport;
  stats: {
    sourcesSearched: number;
    sourcesUsed: number;
    factsExtracted: number;
    contradictionsFound: number;
    duration: number;
  };
  createdAt: Date | string;
  completedAt?: Date | string;
}

export interface ResearchEvent {
  type: 'status_change' | 'source_found' | 'fact_extracted' | 'contradiction_detected' | 'progress' | 'complete' | 'error';
  data: any;
  timestamp: Date;
}

interface UseResearchReturn {
  // State
  sessions: ResearchSession[];
  activeSession: ResearchSession | null;
  loading: boolean;
  error: string | null;

  // Actions
  startResearch: (query: string, config: ResearchConfig) => Promise<ResearchSession>;
  pauseResearch: () => void;
  resumeResearch: () => void;
  cancelResearch: () => void;
  deleteSession: (id: string) => Promise<void>;
  refreshSessions: () => Promise<void>;
  getSession: (id: string) => Promise<ResearchSession | null>;

  // Source management
  toggleSource: (sessionId: string, sourceId: string) => void;

  // Export
  exportReport: (sessionId: string, format: 'pdf' | 'md' | 'docx') => Promise<Blob>;
}

export function useResearch(): UseResearchReturn {
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [activeSession, setActiveSession] = useState<ResearchSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load sessions on mount
  useEffect(() => {
    refreshSessions();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Refresh all sessions
  const refreshSessions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/research/sessions');
      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (err: any) {
      // Use mock data for demo
      setSessions(getMockSessions());
      console.warn('Using mock research sessions:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get single session
  const getSession = useCallback(async (id: string): Promise<ResearchSession | null> => {
    try {
      const response = await fetch(`/api/research/sessions/${id}`);
      if (!response.ok) {
        throw new Error('Session not found');
      }
      const data = await response.json();
      return data.session;
    } catch (err) {
      // Check mock sessions
      const mockSession = getMockSessions().find(s => s.id === id);
      return mockSession || null;
    }
  }, []);

  // Start new research
  const startResearch = useCallback(async (query: string, config: ResearchConfig): Promise<ResearchSession> => {
    setError(null);

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/research/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, config }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to start research');
      }

      const data = await response.json();
      const sessionId = data.sessionId;

      // Create initial session
      const newSession: ResearchSession = {
        id: sessionId,
        query,
        config,
        status: 'researching',
        sources: [],
        facts: [],
        stats: {
          sourcesSearched: 0,
          sourcesUsed: 0,
          factsExtracted: 0,
          contradictionsFound: 0,
          duration: 0,
        },
        createdAt: new Date(),
      };

      setActiveSession(newSession);
      setSessions(prev => [newSession, ...prev]);

      // Connect to SSE stream
      connectToStream(sessionId);

      return newSession;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Research cancelled');
      }

      // Create mock session for demo
      const mockSession = createMockResearchSession(query, config);
      setActiveSession(mockSession);
      setSessions(prev => [mockSession, ...prev]);

      // Simulate research progress
      simulateResearchProgress(mockSession.id);

      return mockSession;
    }
  }, []);

  // Connect to SSE stream for real-time updates
  const connectToStream = useCallback((sessionId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`/api/research/${sessionId}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener('status_change', (e) => {
      const data = JSON.parse(e.data);
      updateSession(sessionId, { status: data.status });

      if (data.status === 'completed' || data.status === 'failed') {
        eventSource.close();
        eventSourceRef.current = null;
        loadFullSession(sessionId);
      }
    });

    eventSource.addEventListener('source_found', (e) => {
      const data = JSON.parse(e.data);
      updateSession(sessionId, (session) => ({
        ...session,
        sources: [...session.sources, data.source],
        stats: {
          ...session.stats,
          sourcesSearched: session.stats.sourcesSearched + 1,
        },
      }));
    });

    eventSource.addEventListener('fact_extracted', (e) => {
      const data = JSON.parse(e.data);
      updateSession(sessionId, (session) => ({
        ...session,
        facts: [...session.facts, data.fact],
        stats: {
          ...session.stats,
          factsExtracted: session.stats.factsExtracted + 1,
        },
      }));
    });

    eventSource.addEventListener('contradiction_detected', () => {
      updateSession(sessionId, (session) => ({
        ...session,
        stats: {
          ...session.stats,
          contradictionsFound: session.stats.contradictionsFound + 1,
        },
      }));
    });

    eventSource.addEventListener('complete', (e) => {
      const data = JSON.parse(e.data);
      updateSession(sessionId, {
        status: 'completed',
        report: data.report,
        completedAt: new Date(),
      });
      eventSource.close();
      eventSourceRef.current = null;
    });

    eventSource.addEventListener('error', () => {
      eventSource.close();
      eventSourceRef.current = null;
    });
  }, []);

  // Update session helper
  const updateSession = useCallback((
    sessionId: string,
    updates: Partial<ResearchSession> | ((session: ResearchSession) => ResearchSession)
  ) => {
    const updater = typeof updates === 'function' ? updates : (s: ResearchSession) => ({ ...s, ...updates });

    setSessions(prev => prev.map(s => s.id === sessionId ? updater(s) : s));
    setActiveSession(prev => prev?.id === sessionId ? updater(prev) : prev);
  }, []);

  // Load full session data
  const loadFullSession = useCallback(async (sessionId: string) => {
    const session = await getSession(sessionId);
    if (session) {
      updateSession(sessionId, session);
    }
  }, [getSession, updateSession]);

  // Pause research
  const pauseResearch = useCallback(() => {
    if (!activeSession) return;

    fetch(`/api/research/${activeSession.id}/pause`, { method: 'POST' })
      .catch(() => {});

    updateSession(activeSession.id, { status: 'paused' });
  }, [activeSession, updateSession]);

  // Resume research
  const resumeResearch = useCallback(() => {
    if (!activeSession) return;

    fetch(`/api/research/${activeSession.id}/resume`, { method: 'POST' })
      .catch(() => {});

    updateSession(activeSession.id, { status: 'researching' });
    connectToStream(activeSession.id);
  }, [activeSession, updateSession, connectToStream]);

  // Cancel research
  const cancelResearch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (activeSession) {
      fetch(`/api/research/${activeSession.id}/cancel`, { method: 'POST' })
        .catch(() => {});

      updateSession(activeSession.id, { status: 'failed' });
    }
    setActiveSession(null);
  }, [activeSession, updateSession]);

  // Delete session
  const deleteSession = useCallback(async (id: string) => {
    try {
      await fetch(`/api/research/sessions/${id}`, { method: 'DELETE' });
    } catch (err) {
      // Continue with local delete
    }

    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSession?.id === id) {
      setActiveSession(null);
    }
  }, [activeSession]);

  // Toggle source inclusion
  const toggleSource = useCallback((sessionId: string, sourceId: string) => {
    updateSession(sessionId, (session) => ({
      ...session,
      sources: session.sources.map(s =>
        s.id === sourceId
          ? { ...s, isIncluded: s.isIncluded === false ? true : false }
          : s
      ),
    }));
  }, [updateSession]);

  // Export report
  const exportReport = useCallback(async (sessionId: string, format: 'pdf' | 'md' | 'docx'): Promise<Blob> => {
    const response = await fetch(`/api/research/${sessionId}/export/${format}`);
    if (!response.ok) {
      throw new Error('Export failed');
    }
    return response.blob();
  }, []);

  // Simulate research progress (for demo)
  const simulateResearchProgress = useCallback((sessionId: string) => {
    let sourcesFound = 0;
    let factsExtracted = 0;
    const maxSources = 15;
    const maxFacts = 20;

    const sourceInterval = setInterval(() => {
      if (sourcesFound >= maxSources) {
        clearInterval(sourceInterval);
        updateSession(sessionId, { status: 'analyzing' });

        // Start fact extraction phase
        const factInterval = setInterval(() => {
          if (factsExtracted >= maxFacts) {
            clearInterval(factInterval);
            updateSession(sessionId, { status: 'synthesizing' });

            // Complete after synthesis
            setTimeout(() => {
              const session = sessions.find(s => s.id === sessionId) || getMockSessions()[0];
              updateSession(sessionId, {
                status: 'completed',
                report: generateMockReport(session.query),
                completedAt: new Date(),
                stats: {
                  sourcesSearched: maxSources,
                  sourcesUsed: Math.floor(maxSources * 0.8),
                  factsExtracted: maxFacts,
                  contradictionsFound: 2,
                  duration: 45000,
                },
              });
              setActiveSession(null);
            }, 2000);
            return;
          }

          factsExtracted++;
          updateSession(sessionId, (session) => ({
            ...session,
            facts: [...session.facts, generateMockFact(factsExtracted)],
            stats: { ...session.stats, factsExtracted },
          }));
        }, 300);

        return;
      }

      sourcesFound++;
      updateSession(sessionId, (session) => ({
        ...session,
        sources: [...session.sources, generateMockSource(sourcesFound)],
        stats: { ...session.stats, sourcesSearched: sourcesFound },
      }));
    }, 400);

    // Cleanup on unmount
    return () => {
      clearInterval(sourceInterval);
    };
  }, [sessions, updateSession]);

  return {
    sessions,
    activeSession,
    loading,
    error,
    startResearch,
    pauseResearch,
    resumeResearch,
    cancelResearch,
    deleteSession,
    refreshSessions,
    getSession,
    toggleSource,
    exportReport,
  };
}

// Mock data generators
function getMockSessions(): ResearchSession[] {
  return [
    {
      id: 'session-1',
      query: 'What are the latest developments in quantum computing and their potential impact on cryptography?',
      config: { depth: 'deep', scope: ['web', 'academic'], citationStyle: 'apa', maxSources: 50 },
      status: 'completed',
      sources: Array.from({ length: 12 }, (_, i) => generateMockSource(i + 1)),
      facts: Array.from({ length: 8 }, (_, i) => generateMockFact(i + 1)),
      report: generateMockReport('quantum computing and cryptography'),
      stats: { sourcesSearched: 25, sourcesUsed: 12, factsExtracted: 8, contradictionsFound: 1, duration: 68000 },
      createdAt: new Date(Date.now() - 86400000),
      completedAt: new Date(Date.now() - 86400000 + 68000),
    },
    {
      id: 'session-2',
      query: 'How is artificial intelligence being used in modern healthcare diagnostics?',
      config: { depth: 'standard', scope: ['web', 'academic', 'news'], citationStyle: 'apa', maxSources: 25 },
      status: 'completed',
      sources: Array.from({ length: 8 }, (_, i) => generateMockSource(i + 1)),
      facts: Array.from({ length: 6 }, (_, i) => generateMockFact(i + 1)),
      report: generateMockReport('AI in healthcare diagnostics'),
      stats: { sourcesSearched: 18, sourcesUsed: 8, factsExtracted: 6, contradictionsFound: 0, duration: 42000 },
      createdAt: new Date(Date.now() - 172800000),
      completedAt: new Date(Date.now() - 172800000 + 42000),
    },
  ];
}

function createMockResearchSession(query: string, config: ResearchConfig): ResearchSession {
  return {
    id: `session-${Date.now()}`,
    query,
    config,
    status: 'researching',
    sources: [],
    facts: [],
    stats: {
      sourcesSearched: 0,
      sourcesUsed: 0,
      factsExtracted: 0,
      contradictionsFound: 0,
      duration: 0,
    },
    createdAt: new Date(),
  };
}

function generateMockSource(index: number): ResearchSource {
  const sources = [
    { title: 'Nature: Quantum Computing Advances', url: 'https://nature.com/quantum-2024', author: 'Dr. Sarah Chen', type: 'academic' as const },
    { title: 'MIT Technology Review: Cryptography in the Quantum Era', url: 'https://technologyreview.com/crypto', author: 'James Wilson', type: 'news' as const },
    { title: 'IEEE: Post-Quantum Cryptographic Standards', url: 'https://ieee.org/pqc', author: 'IEEE Working Group', type: 'academic' as const },
    { title: 'Science Daily: Quantum Supremacy Implications', url: 'https://sciencedaily.com/quantum', author: 'Science Daily Staff', type: 'news' as const },
    { title: 'arXiv: Quantum-Safe Encryption Methods', url: 'https://arxiv.org/quantum-safe', author: 'Dr. Michael Brown', type: 'academic' as const },
  ];

  const sourceData = sources[(index - 1) % sources.length];

  return {
    id: `source-${index}`,
    url: sourceData.url,
    title: sourceData.title,
    snippet: `This article discusses key developments in quantum computing and its implications for modern cryptographic systems...`,
    author: sourceData.author,
    publishDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
    sourceType: sourceData.type,
    isIncluded: true,
    credibility: {
      authorityScore: 0.7 + Math.random() * 0.25,
      recencyScore: 0.6 + Math.random() * 0.35,
      biasScore: Math.random() * 0.3,
      overallScore: 0.7 + Math.random() * 0.25,
    },
  };
}

function generateMockFact(index: number): ResearchFact {
  const facts = [
    'Quantum computers can theoretically break RSA encryption in polynomial time using Shor\'s algorithm.',
    'NIST has standardized three post-quantum cryptographic algorithms in 2024.',
    'Current quantum computers have achieved up to 1,000 qubits in laboratory settings.',
    'Quantum key distribution provides theoretically unbreakable encryption.',
    'Major tech companies are investing billions in quantum computing research.',
    'Lattice-based cryptography is considered the most promising post-quantum approach.',
    'Quantum supremacy was first claimed by Google in 2019.',
    'The timeline for cryptographically relevant quantum computers remains uncertain.',
  ];

  return {
    id: `fact-${index}`,
    statement: facts[(index - 1) % facts.length],
    confidence: 0.7 + Math.random() * 0.25,
    sourceIds: [`source-${(index % 5) + 1}`],
    verificationStatus: Math.random() > 0.2 ? 'verified' : 'unverified',
  };
}

function generateMockReport(topic: string): ResearchReport {
  return {
    title: `Comprehensive Analysis: ${topic.charAt(0).toUpperCase() + topic.slice(1)}`,
    abstract: `This research report provides a comprehensive analysis of ${topic}, synthesizing information from multiple peer-reviewed sources, news articles, and expert opinions. The findings indicate significant developments in the field with important implications for future applications.`,
    sections: [
      {
        title: 'Introduction',
        content: `The field of ${topic} has seen remarkable progress in recent years. This section provides background context and establishes the scope of our research. [1] Multiple factors have contributed to this advancement, including increased investment and technological breakthroughs. [2]`,
        citations: ['1', '2'],
      },
      {
        title: 'Current State of the Field',
        content: `Our analysis reveals several key trends in ${topic}. First, there has been a significant increase in research output, with publications growing by 40% year-over-year. [3] Second, commercial applications are beginning to emerge, though widespread adoption remains limited. [4]`,
        citations: ['3', '4'],
      },
      {
        title: 'Key Challenges and Opportunities',
        content: `Despite progress, significant challenges remain. Technical limitations continue to constrain practical applications. [5] However, emerging solutions show promise for addressing these limitations. [6] The intersection of multiple technologies creates new opportunities for innovation.`,
        citations: ['5', '6'],
      },
      {
        title: 'Future Outlook',
        content: `Looking ahead, experts predict continued growth in ${topic}. [7] Investment is expected to increase as commercial viability improves. The next five years will be critical for establishing industry standards and best practices. [8]`,
        citations: ['7', '8'],
      },
    ],
    keyFindings: [
      'Significant progress has been made in the field over the past two years',
      'Commercial applications are emerging but widespread adoption requires further development',
      'Investment in research and development continues to grow',
      'Technical challenges remain but solutions are being developed',
      'Industry standards are still evolving',
    ],
    limitations: [
      'Research primarily focused on English-language sources',
      'Some recent developments may not be fully captured',
      'Commercial data was limited in availability',
    ],
    bibliography: [
      'Chen, S. (2024). Advances in Quantum Computing. Nature, 589, 234-240.',
      'Wilson, J. (2024). Cryptography in the Quantum Era. MIT Technology Review.',
      'IEEE Working Group. (2024). Post-Quantum Cryptographic Standards. IEEE.',
      'Science Daily. (2024). Quantum Supremacy Implications. Science Daily.',
      'Brown, M. (2024). Quantum-Safe Encryption Methods. arXiv preprint.',
      'Johnson, A. (2024). The Future of Quantum Security. ACM Computing Surveys.',
      'Tech Industry Report. (2024). Quantum Computing Investment Trends.',
      'National Academy of Sciences. (2024). Quantum Computing Roadmap.',
    ],
    generatedAt: new Date(),
  };
}

export default useResearch;
