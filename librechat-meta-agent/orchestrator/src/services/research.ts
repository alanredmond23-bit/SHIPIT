import { Pool } from 'pg';
import { Logger } from 'pino';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';

// Research Orchestration Service
// Provides a simplified interface for multi-step research workflows
// Key features:
// 1. WEB SEARCH INTEGRATION - Placeholder for multiple search providers
// 2. SOURCE RANKING - Score and deduplicate sources
// 3. REPORT GENERATION - AI-powered research report synthesis
// 4. CITATION EXTRACTION - Extract and format citations automatically
// 5. SESSION MANAGEMENT - Track research sessions and progress

// ============================================================================
// TYPES
// ============================================================================

export type ResearchScope = 'web' | 'academic' | 'news';
export type ResearchDepth = 'quick' | 'standard' | 'deep';
export type ResearchStatus = 'queued' | 'researching' | 'analyzing' | 'synthesizing' | 'completed' | 'failed' | 'paused';
export type CitationStyle = 'apa' | 'mla' | 'chicago' | 'bibtex';
export type SourceType = 'web' | 'academic' | 'news' | 'forum';

export interface ResearchConfig {
  depth: ResearchDepth;
  scopes: ResearchScope[];
  maxSources: number;
  citationStyle: CitationStyle;
  dateRange?: { start: Date; end: Date };
  includeDomains?: string[];
  excludeDomains?: string[];
}

export interface SourceCredibility {
  authorityScore: number;  // 0-1: Domain authority, author expertise
  recencyScore: number;    // 0-1: How recent the content is
  biasScore: number;       // 0-1: Neutrality of content (1 = neutral)
  overallScore: number;    // 0-1: Weighted combination
}

export interface ResearchSource {
  id: string;
  url: string;
  title: string;
  snippet: string;
  content?: string;
  author?: string;
  publishDate?: Date;
  sourceType: SourceType;
  credibility: SourceCredibility;
  isIncluded: boolean;
  extractedCitations?: string[];
}

export interface ResearchFinding {
  id: string;
  statement: string;
  confidence: number;
  sourceIds: string[];
  category: 'fact' | 'opinion' | 'statistic' | 'quote';
}

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  citations: string[];
  order: number;
}

export interface ResearchReport {
  title: string;
  abstract: string;
  sections: ReportSection[];
  keyFindings: string[];
  limitations: string[];
  bibliography: string[];
  generatedAt: Date;
  wordCount: number;
}

export interface ResearchSession {
  id: string;
  userId?: string;
  projectId?: string;
  query: string;
  config: ResearchConfig;
  status: ResearchStatus;
  progress: number;
  currentPhase: string;
  sources: ResearchSource[];
  findings: ResearchFinding[];
  report?: ResearchReport;
  stats: {
    sourcesSearched: number;
    sourcesUsed: number;
    findingsExtracted: number;
    tokensUsed: number;
    durationMs: number;
  };
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface ResearchEvent {
  type: 'status_change' | 'source_found' | 'finding_extracted' | 'progress' | 'phase_change' | 'error';
  sessionId: string;
  data: any;
  timestamp: Date;
}

export type EventCallback = (event: ResearchEvent) => void;

// ============================================================================
// RESEARCH ORCHESTRATOR SERVICE
// ============================================================================

export class ResearchOrchestrator {
  private anthropic: Anthropic;
  private eventListeners: Map<string, Set<EventCallback>> = new Map();
  private activeSessions: Map<string, ResearchSession> = new Map();

  constructor(
    private db: Pool,
    private logger: Logger,
    anthropicApiKey: string,
    private searchConfig: {
      googleApiKey?: string;
      googleSearchEngineId?: string;
      bingApiKey?: string;
      serpApiKey?: string;
      newsApiKey?: string;
    } = {}
  ) {
    this.anthropic = new Anthropic({ apiKey: anthropicApiKey });
  }

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  async createSession(
    query: string,
    config: Partial<ResearchConfig> = {},
    userId?: string,
    projectId?: string
  ): Promise<ResearchSession> {
    const sessionId = uuidv4();
    const now = new Date();

    const fullConfig: ResearchConfig = {
      depth: config.depth || 'standard',
      scopes: config.scopes || ['web', 'academic', 'news'],
      maxSources: config.maxSources || this.getMaxSourcesByDepth(config.depth || 'standard'),
      citationStyle: config.citationStyle || 'apa',
      dateRange: config.dateRange,
      includeDomains: config.includeDomains,
      excludeDomains: config.excludeDomains,
    };

    const session: ResearchSession = {
      id: sessionId,
      userId,
      projectId,
      query,
      config: fullConfig,
      status: 'queued',
      progress: 0,
      currentPhase: 'Initializing',
      sources: [],
      findings: [],
      stats: {
        sourcesSearched: 0,
        sourcesUsed: 0,
        findingsExtracted: 0,
        tokensUsed: 0,
        durationMs: 0,
      },
      createdAt: now,
      updatedAt: now,
    };

    // Store in database
    await this.saveSession(session);

    // Cache in memory
    this.activeSessions.set(sessionId, session);

    this.logger.info({ sessionId, query }, 'Research session created');

    return session;
  }

  async startResearch(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== 'queued' && session.status !== 'paused') {
      throw new Error(`Session ${sessionId} cannot be started from status ${session.status}`);
    }

    // Start background research process
    this.conductResearch(session).catch(error => {
      this.logger.error({ sessionId, error: error.message }, 'Research failed');
      this.updateSession(sessionId, { status: 'failed', error: error.message });
    });
  }

  async pauseResearch(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== 'researching' && session.status !== 'analyzing') {
      throw new Error(`Session ${sessionId} cannot be paused from status ${session.status}`);
    }

    await this.updateSession(sessionId, { status: 'paused' });
    this.emitEvent(sessionId, 'status_change', { status: 'paused' });
  }

  async resumeResearch(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== 'paused') {
      throw new Error(`Session ${sessionId} cannot be resumed from status ${session.status}`);
    }

    // Resume research
    this.conductResearch(session).catch(error => {
      this.logger.error({ sessionId, error: error.message }, 'Research failed');
      this.updateSession(sessionId, { status: 'failed', error: error.message });
    });
  }

  async cancelResearch(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    await this.updateSession(sessionId, { status: 'failed', error: 'Cancelled by user' });
    this.emitEvent(sessionId, 'status_change', { status: 'failed', reason: 'cancelled' });
    this.activeSessions.delete(sessionId);
  }

  async getSession(sessionId: string): Promise<ResearchSession | null> {
    // Check memory cache first
    if (this.activeSessions.has(sessionId)) {
      return this.activeSessions.get(sessionId)!;
    }

    // Load from database
    const result = await this.db.query(
      'SELECT * FROM research_sessions WHERE id = $1',
      [sessionId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.rowToSession(result.rows[0]);
  }

  async getSessions(userId?: string, projectId?: string): Promise<ResearchSession[]> {
    let query = 'SELECT * FROM research_sessions WHERE 1=1';
    const params: any[] = [];

    if (userId) {
      params.push(userId);
      query += ` AND user_id = $${params.length}`;
    }

    if (projectId) {
      params.push(projectId);
      query += ` AND project_id = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.db.query(query, params);
    return result.rows.map(row => this.rowToSession(row));
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.db.query('DELETE FROM research_sessions WHERE id = $1', [sessionId]);
    this.activeSessions.delete(sessionId);
    this.logger.info({ sessionId }, 'Research session deleted');
  }

  // ============================================================================
  // RESEARCH CONDUCTOR
  // ============================================================================

  private async conductResearch(session: ResearchSession): Promise<void> {
    const startTime = Date.now();
    const sessionId = session.id;

    try {
      // Phase 1: Search Sources
      await this.updateSession(sessionId, {
        status: 'researching',
        currentPhase: 'Searching sources',
        progress: 10,
      });
      this.emitEvent(sessionId, 'phase_change', { phase: 'Searching sources' });

      const sources = await this.searchSources(session);
      await this.updateSession(sessionId, {
        sources,
        progress: 30,
        stats: { ...session.stats, sourcesSearched: sources.length },
      });

      // Phase 2: Rank and Deduplicate
      await this.updateSession(sessionId, {
        currentPhase: 'Ranking sources',
        progress: 40,
      });
      this.emitEvent(sessionId, 'phase_change', { phase: 'Ranking sources' });

      const rankedSources = await this.rankAndDeduplicateSources(sources, session.config);
      const includedSources = rankedSources.filter(s => s.isIncluded);
      await this.updateSession(sessionId, {
        sources: rankedSources,
        stats: { ...session.stats, sourcesUsed: includedSources.length },
      });

      // Phase 3: Extract Content and Citations
      await this.updateSession(sessionId, {
        status: 'analyzing',
        currentPhase: 'Extracting content',
        progress: 50,
      });
      this.emitEvent(sessionId, 'phase_change', { phase: 'Extracting content' });

      const enrichedSources = await this.extractContent(includedSources);
      await this.updateSession(sessionId, { sources: enrichedSources, progress: 60 });

      // Phase 4: Extract Findings
      await this.updateSession(sessionId, {
        currentPhase: 'Extracting findings',
        progress: 70,
      });
      this.emitEvent(sessionId, 'phase_change', { phase: 'Extracting findings' });

      const findings = await this.extractFindings(session.query, enrichedSources);
      await this.updateSession(sessionId, {
        findings,
        stats: { ...session.stats, findingsExtracted: findings.length },
        progress: 80,
      });

      // Phase 5: Generate Report
      await this.updateSession(sessionId, {
        status: 'synthesizing',
        currentPhase: 'Generating report',
        progress: 90,
      });
      this.emitEvent(sessionId, 'phase_change', { phase: 'Generating report' });

      const report = await this.generateReport(session.query, enrichedSources, findings, session.config);

      // Complete
      const durationMs = Date.now() - startTime;
      await this.updateSession(sessionId, {
        status: 'completed',
        currentPhase: 'Complete',
        progress: 100,
        report,
        stats: { ...session.stats, durationMs },
        completedAt: new Date(),
      });

      this.emitEvent(sessionId, 'status_change', { status: 'completed' });
      this.logger.info({ sessionId, durationMs }, 'Research completed');

    } catch (error: any) {
      this.logger.error({ sessionId, error: error.message }, 'Research failed');
      await this.updateSession(sessionId, {
        status: 'failed',
        error: error.message,
      });
      this.emitEvent(sessionId, 'error', { message: error.message });
      throw error;
    }
  }

  // ============================================================================
  // WEB SEARCH INTEGRATION (PLACEHOLDER)
  // ============================================================================

  private async searchSources(session: ResearchSession): Promise<ResearchSource[]> {
    const sources: ResearchSource[] = [];
    const { query, config } = session;

    // Web search
    if (config.scopes.includes('web')) {
      const webSources = await this.searchWeb(query, config);
      sources.push(...webSources);
    }

    // Academic search
    if (config.scopes.includes('academic')) {
      const academicSources = await this.searchAcademic(query, config);
      sources.push(...academicSources);
    }

    // News search
    if (config.scopes.includes('news')) {
      const newsSources = await this.searchNews(query, config);
      sources.push(...newsSources);
    }

    return sources;
  }

  private async searchWeb(query: string, config: ResearchConfig): Promise<ResearchSource[]> {
    // TODO: Integrate with Google Custom Search API, Bing API, or SerpAPI
    // For now, return placeholder indicating where integration would happen
    this.logger.info({ query }, 'Web search placeholder - integrate with search API');

    // Placeholder: In production, this would call actual search APIs
    // Example with Google Custom Search:
    // const response = await fetch(
    //   `https://www.googleapis.com/customsearch/v1?key=${this.searchConfig.googleApiKey}&cx=${this.searchConfig.googleSearchEngineId}&q=${encodeURIComponent(query)}`
    // );

    return [];
  }

  private async searchAcademic(query: string, config: ResearchConfig): Promise<ResearchSource[]> {
    // TODO: Integrate with Google Scholar, Semantic Scholar, arXiv APIs
    this.logger.info({ query }, 'Academic search placeholder - integrate with academic APIs');

    // Placeholder: In production, integrate with:
    // - Semantic Scholar API (free)
    // - arXiv API (free)
    // - CrossRef API (free)
    // - Google Scholar (scraping or SerpAPI)

    return [];
  }

  private async searchNews(query: string, config: ResearchConfig): Promise<ResearchSource[]> {
    // TODO: Integrate with NewsAPI, Google News, etc.
    this.logger.info({ query }, 'News search placeholder - integrate with news APIs');

    // Placeholder: In production, integrate with:
    // - NewsAPI (paid)
    // - Google News RSS
    // - Bing News API

    return [];
  }

  // ============================================================================
  // SOURCE RANKING AND DEDUPLICATION
  // ============================================================================

  private async rankAndDeduplicateSources(
    sources: ResearchSource[],
    config: ResearchConfig
  ): Promise<ResearchSource[]> {
    // Deduplicate by URL
    const urlMap = new Map<string, ResearchSource>();
    for (const source of sources) {
      const normalizedUrl = this.normalizeUrl(source.url);
      if (!urlMap.has(normalizedUrl)) {
        urlMap.set(normalizedUrl, source);
      }
    }

    const deduped = Array.from(urlMap.values());

    // Calculate credibility scores
    for (const source of deduped) {
      source.credibility = this.calculateCredibility(source);
    }

    // Sort by overall score
    deduped.sort((a, b) => b.credibility.overallScore - a.credibility.overallScore);

    // Mark top sources as included
    const maxSources = config.maxSources;
    for (let i = 0; i < deduped.length; i++) {
      deduped[i].isIncluded = i < maxSources;
    }

    // Apply domain filters
    for (const source of deduped) {
      const domain = new URL(source.url).hostname;

      if (config.includeDomains && config.includeDomains.length > 0) {
        source.isIncluded = config.includeDomains.some(d => domain.includes(d));
      }

      if (config.excludeDomains) {
        if (config.excludeDomains.some(d => domain.includes(d))) {
          source.isIncluded = false;
        }
      }
    }

    return deduped;
  }

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove trailing slash, www prefix, and query params for deduplication
      return `${parsed.hostname.replace('www.', '')}${parsed.pathname.replace(/\/$/, '')}`;
    } catch {
      return url;
    }
  }

  private calculateCredibility(source: ResearchSource): SourceCredibility {
    // Authority score based on domain reputation
    const authorityScore = this.calculateAuthorityScore(source);

    // Recency score based on publish date
    const recencyScore = this.calculateRecencyScore(source);

    // Bias score (placeholder - would use ML model in production)
    const biasScore = 0.7; // Default neutral-ish

    // Weighted overall score
    const overallScore = authorityScore * 0.4 + recencyScore * 0.3 + biasScore * 0.3;

    return { authorityScore, recencyScore, biasScore, overallScore };
  }

  private calculateAuthorityScore(source: ResearchSource): number {
    const domain = new URL(source.url).hostname.toLowerCase();

    // High authority domains
    const highAuthority = [
      '.gov', '.edu', 'nature.com', 'science.org', 'nejm.org', 'bmj.com',
      'nytimes.com', 'washingtonpost.com', 'reuters.com', 'apnews.com',
      'bbc.com', 'theguardian.com', 'economist.com', 'wsj.com',
      'scholar.google.com', 'pubmed.', 'arxiv.org',
    ];

    // Medium authority
    const mediumAuthority = [
      'wikipedia.org', 'stackoverflow.com', 'github.com', 'medium.com',
    ];

    // Low authority (user-generated, forums)
    const lowAuthority = ['reddit.com', 'quora.com', 'yahoo.com/answers'];

    if (highAuthority.some(d => domain.includes(d))) return 0.9;
    if (mediumAuthority.some(d => domain.includes(d))) return 0.7;
    if (lowAuthority.some(d => domain.includes(d))) return 0.4;

    // Academic source type gets bonus
    if (source.sourceType === 'academic') return 0.85;

    return 0.6; // Default for unknown domains
  }

  private calculateRecencyScore(source: ResearchSource): number {
    if (!source.publishDate) return 0.5; // Unknown date

    const now = new Date();
    const publishDate = new Date(source.publishDate);
    const ageInDays = (now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24);

    if (ageInDays < 7) return 1.0;      // Last week
    if (ageInDays < 30) return 0.9;     // Last month
    if (ageInDays < 90) return 0.8;     // Last quarter
    if (ageInDays < 365) return 0.7;    // Last year
    if (ageInDays < 730) return 0.5;    // Last 2 years
    return 0.3;                          // Older
  }

  // ============================================================================
  // CONTENT EXTRACTION
  // ============================================================================

  private async extractContent(sources: ResearchSource[]): Promise<ResearchSource[]> {
    // TODO: Integrate with content extraction service
    // For now, use snippet as content placeholder

    for (const source of sources) {
      if (!source.content) {
        source.content = source.snippet;
      }

      // Extract citations from content
      source.extractedCitations = this.extractCitationsFromContent(source.content || '');
    }

    return sources;
  }

  private extractCitationsFromContent(content: string): string[] {
    const citations: string[] = [];

    // Extract quoted text
    const quotePattern = /"([^"]{20,200})"/g;
    let match;
    while ((match = quotePattern.exec(content)) !== null) {
      citations.push(match[1]);
    }

    // Extract statistics patterns (e.g., "42%", "$1.5 million")
    const statsPattern = /(\d+(?:\.\d+)?%|\$[\d,.]+(?:\s*(?:million|billion|trillion))?)/gi;
    while ((match = statsPattern.exec(content)) !== null) {
      citations.push(match[1]);
    }

    return citations;
  }

  // ============================================================================
  // FINDINGS EXTRACTION
  // ============================================================================

  private async extractFindings(
    query: string,
    sources: ResearchSource[]
  ): Promise<ResearchFinding[]> {
    const combinedContent = sources
      .map(s => `[Source: ${s.title}]\n${s.content || s.snippet}`)
      .join('\n\n---\n\n');

    const prompt = `Analyze the following research sources and extract key findings related to the query: "${query}"

Sources:
${combinedContent}

Extract 5-10 key findings. For each finding, provide:
1. A clear statement of the finding
2. A confidence score (0.0-1.0) based on source reliability and corroboration
3. The category: fact, opinion, statistic, or quote
4. Which sources support this finding (by title)

Format as JSON array:
[
  {
    "statement": "...",
    "confidence": 0.8,
    "category": "fact",
    "sourceTitles": ["Source 1", "Source 2"]
  }
]`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') return [];

      // Parse JSON from response
      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.map((f: any, index: number) => ({
        id: uuidv4(),
        statement: f.statement,
        confidence: f.confidence,
        category: f.category,
        sourceIds: sources
          .filter(s => f.sourceTitles?.includes(s.title))
          .map(s => s.id),
      }));
    } catch (error) {
      this.logger.error({ error }, 'Failed to extract findings');
      return [];
    }
  }

  // ============================================================================
  // REPORT GENERATION
  // ============================================================================

  private async generateReport(
    query: string,
    sources: ResearchSource[],
    findings: ResearchFinding[],
    config: ResearchConfig
  ): Promise<ResearchReport> {
    const sourcesSummary = sources
      .map((s, i) => `[${i + 1}] ${s.title} - ${s.url}`)
      .join('\n');

    const findingsSummary = findings
      .map(f => `- ${f.statement} (confidence: ${Math.round(f.confidence * 100)}%)`)
      .join('\n');

    const prompt = `Generate a comprehensive research report for the query: "${query}"

Available Sources:
${sourcesSummary}

Key Findings:
${findingsSummary}

Generate a well-structured research report with:
1. A compelling title
2. An executive abstract (2-3 sentences)
3. 3-5 main sections with relevant content
4. Key findings summary (bullet points)
5. Limitations and areas for further research
6. Bibliography in ${config.citationStyle.toUpperCase()} format

Format the response as JSON:
{
  "title": "...",
  "abstract": "...",
  "sections": [
    {"title": "...", "content": "...", "citations": ["[1]", "[2]"]}
  ],
  "keyFindings": ["...", "..."],
  "limitations": ["...", "..."],
  "bibliography": ["...", "..."]
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        return this.createDefaultReport(query);
      }

      // Parse JSON from response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.createDefaultReport(query);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const wordCount = this.countWords(JSON.stringify(parsed));

      return {
        title: parsed.title || `Research Report: ${query}`,
        abstract: parsed.abstract || '',
        sections: (parsed.sections || []).map((s: any, i: number) => ({
          id: uuidv4(),
          title: s.title,
          content: s.content,
          citations: s.citations || [],
          order: i,
        })),
        keyFindings: parsed.keyFindings || [],
        limitations: parsed.limitations || [],
        bibliography: parsed.bibliography || [],
        generatedAt: new Date(),
        wordCount,
      };
    } catch (error) {
      this.logger.error({ error }, 'Failed to generate report');
      return this.createDefaultReport(query);
    }
  }

  private createDefaultReport(query: string): ResearchReport {
    return {
      title: `Research Report: ${query}`,
      abstract: 'Report generation encountered an issue. Please try again.',
      sections: [],
      keyFindings: [],
      limitations: ['Report could not be fully generated'],
      bibliography: [],
      generatedAt: new Date(),
      wordCount: 0,
    };
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(w => w.length > 0).length;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private getMaxSourcesByDepth(depth: ResearchDepth): number {
    switch (depth) {
      case 'quick': return 5;
      case 'standard': return 15;
      case 'deep': return 30;
      default: return 15;
    }
  }

  private async updateSession(
    sessionId: string,
    updates: Partial<ResearchSession>
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      Object.assign(session, updates, { updatedAt: new Date() });
      this.activeSessions.set(sessionId, session);
    }

    // Update database
    await this.saveSession({ ...session, ...updates } as ResearchSession);

    // Emit progress event if progress changed
    if (updates.progress !== undefined) {
      this.emitEvent(sessionId, 'progress', { progress: updates.progress });
    }
  }

  private async saveSession(session: ResearchSession): Promise<void> {
    await this.db.query(
      `INSERT INTO research_sessions (
        id, user_id, project_id, query, config, status, progress, current_phase,
        sources, findings, report, stats, error, created_at, updated_at, completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        progress = EXCLUDED.progress,
        current_phase = EXCLUDED.current_phase,
        sources = EXCLUDED.sources,
        findings = EXCLUDED.findings,
        report = EXCLUDED.report,
        stats = EXCLUDED.stats,
        error = EXCLUDED.error,
        updated_at = EXCLUDED.updated_at,
        completed_at = EXCLUDED.completed_at`,
      [
        session.id,
        session.userId,
        session.projectId,
        session.query,
        JSON.stringify(session.config),
        session.status,
        session.progress,
        session.currentPhase,
        JSON.stringify(session.sources),
        JSON.stringify(session.findings),
        session.report ? JSON.stringify(session.report) : null,
        JSON.stringify(session.stats),
        session.error,
        session.createdAt,
        session.updatedAt,
        session.completedAt,
      ]
    );
  }

  private rowToSession(row: any): ResearchSession {
    return {
      id: row.id,
      userId: row.user_id,
      projectId: row.project_id,
      query: row.query,
      config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
      status: row.status,
      progress: row.progress || 0,
      currentPhase: row.current_phase || '',
      sources: typeof row.sources === 'string' ? JSON.parse(row.sources) : (row.sources || []),
      findings: typeof row.findings === 'string' ? JSON.parse(row.findings) : (row.findings || []),
      report: row.report ? (typeof row.report === 'string' ? JSON.parse(row.report) : row.report) : undefined,
      stats: typeof row.stats === 'string' ? JSON.parse(row.stats) : (row.stats || {}),
      error: row.error,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    };
  }

  // ============================================================================
  // EVENT STREAMING
  // ============================================================================

  subscribe(sessionId: string, callback: EventCallback): () => void {
    if (!this.eventListeners.has(sessionId)) {
      this.eventListeners.set(sessionId, new Set());
    }
    this.eventListeners.get(sessionId)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.eventListeners.get(sessionId)?.delete(callback);
    };
  }

  private emitEvent(sessionId: string, type: ResearchEvent['type'], data: any): void {
    const event: ResearchEvent = {
      type,
      sessionId,
      data,
      timestamp: new Date(),
    };

    const listeners = this.eventListeners.get(sessionId);
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(event);
        } catch (error) {
          this.logger.error({ error }, 'Event callback error');
        }
      }
    }
  }

  // Create SSE stream for a session
  createEventStream(sessionId: string): ReadableStream {
    const encoder = new TextEncoder();
    let unsubscribe: (() => void) | null = null;

    return new ReadableStream({
      start: (controller) => {
        unsubscribe = this.subscribe(sessionId, (event) => {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        });
      },
      cancel: () => {
        if (unsubscribe) {
          unsubscribe();
        }
      },
    });
  }
}

// ============================================================================
// CITATION FORMATTER UTILITY
// ============================================================================

export class CitationFormatter {
  static format(
    source: ResearchSource,
    style: CitationStyle,
    index: number
  ): string {
    const author = source.author || 'Unknown Author';
    const title = source.title;
    const url = source.url;
    const date = source.publishDate ? new Date(source.publishDate) : null;
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
        const domain = new URL(url).hostname.replace('www.', '');
        return `@online{source${index},
  author = {${author}},
  title = {${title.replace(/[{}]/g, '')}},
  year = {${year}},
  url = {${url}},
  urldate = {${new Date().toISOString().split('T')[0]}},
  publisher = {${domain}}
}`;

      default:
        return `${author} (${year}). ${title}. ${url}`;
    }
  }

  static getInlineMarker(
    style: CitationStyle,
    index: number,
    source: ResearchSource
  ): string {
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
}

export default ResearchOrchestrator;
