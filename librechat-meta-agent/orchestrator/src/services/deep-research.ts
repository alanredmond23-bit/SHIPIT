import { Pool } from 'pg';
import { Logger } from 'pino';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import { SearchOrchestrator, SearchResult } from './research/search-providers';
import { ContentExtractor, ExtractedContent } from './research/content-extractor';

// Deep Research Engine - Superior to Gemini Deep Research
// Key differentiators:
// 1. MULTI-SOURCE PARALLEL SEARCH - Search 10+ sources simultaneously
// 2. SOURCE VERIFICATION - Cross-reference facts across sources
// 3. CREDIBILITY SCORING - Rate sources by authority/recency/bias
// 4. KNOWLEDGE GRAPH - Build connected knowledge from research
// 5. ITERATIVE DEEP-DIVE - Auto-generate follow-up questions
// 6. LIVE RESEARCH FEED - Real-time updates as research progresses
// 7. CITATION MANAGEMENT - Auto-format citations (APA, MLA, Chicago)
// 8. RESEARCH REPORT - Generate comprehensive, structured reports
// 9. FACT EXTRACTION - Pull key facts with confidence scores
// 10. CONTRADICTION DETECTION - Flag conflicting information

export interface ResearchSource {
  id: string;
  url: string;
  title: string;
  content: string;
  author?: string;
  publishDate?: Date;
  credibility: {
    authorityScore: number;
    recencyScore: number;
    biasScore: number;
    overallScore: number;
  };
  extractedFacts: Fact[];
}

export interface Fact {
  id: string;
  statement: string;
  confidence: number;
  sourceIds: string[];
  verificationStatus: 'verified' | 'unverified' | 'contradicted';
  contradictingFactIds?: string[];
}

export interface KnowledgeNode {
  id: string;
  entity: string;
  type: 'person' | 'organization' | 'concept' | 'event' | 'place' | 'thing';
  properties: Record<string, any>;
  relationships: { targetId: string; type: string }[];
}

export interface ResearchSession {
  id: string;
  userId?: string;
  projectId: string;
  query: string;
  config: ResearchConfig;
  status: 'researching' | 'analyzing' | 'synthesizing' | 'completed' | 'failed';
  sources: ResearchSource[];
  facts: Fact[];
  knowledgeGraph: KnowledgeNode[];
  followUpQuestions: string[];
  report?: ResearchReport;
  stats: {
    sourcesSearched: number;
    sourcesUsed: number;
    factsExtracted: number;
    contradictionsFound: number;
    totalTokens: number;
    duration: number;
  };
  createdAt: Date;
  completedAt?: Date;
}

export interface ResearchConfig {
  depth: 'quick' | 'standard' | 'deep' | 'exhaustive';
  maxSources: number;
  includeAcademic: boolean;
  includeNews: boolean;
  includeForums: boolean;
  dateRange?: { start: Date; end: Date };
  requiredDomains?: string[];
  excludedDomains?: string[];
  citationStyle: 'apa' | 'mla' | 'chicago' | 'ieee';
  generateReport: boolean;
  reportFormat: 'summary' | 'detailed' | 'academic';
}

export interface ResearchReport {
  title: string;
  abstract: string;
  sections: {
    title: string;
    content: string;
    citations: string[];
  }[];
  keyFindings: string[];
  limitations: string[];
  bibliography: string[];
  generatedAt: Date;
}

export interface ResearchEvent {
  type: 'status_change' | 'source_found' | 'fact_extracted' | 'contradiction_detected' | 'progress';
  data: any;
  timestamp: Date;
}

export class DeepResearchEngine {
  private searchOrchestrator: SearchOrchestrator;
  private contentExtractor: ContentExtractor;
  private anthropic: Anthropic;

  constructor(
    private db: Pool,
    private logger: Logger,
    anthropicApiKey: string,
    searchConfig: {
      googleApiKey?: string;
      googleSearchEngineId?: string;
      bingApiKey?: string;
      serpApiKey?: string;
      newsApiKey?: string;
    }
  ) {
    this.anthropic = new Anthropic({ apiKey: anthropicApiKey });
    this.searchOrchestrator = new SearchOrchestrator(logger, searchConfig);
    this.contentExtractor = new ContentExtractor(logger);
  }

  // Start comprehensive research
  async startResearch(
    query: string,
    projectId: string,
    config: Partial<ResearchConfig> = {},
    userId?: string
  ): Promise<ResearchSession> {
    const sessionId = uuidv4();
    const fullConfig: ResearchConfig = {
      depth: config.depth || 'standard',
      maxSources: config.maxSources || this.getMaxSourcesByDepth(config.depth || 'standard'),
      includeAcademic: config.includeAcademic !== false,
      includeNews: config.includeNews !== false,
      includeForums: config.includeForums || false,
      dateRange: config.dateRange,
      requiredDomains: config.requiredDomains,
      excludedDomains: config.excludedDomains,
      citationStyle: config.citationStyle || 'apa',
      generateReport: config.generateReport !== false,
      reportFormat: config.reportFormat || 'detailed',
    };

    // Create session in database
    await this.db.query(
      `INSERT INTO research_sessions
       (id, user_id, project_id, query, status, depth, max_sources, include_academic,
        include_news, include_forums, date_range_start, date_range_end, required_domains,
        excluded_domains, citation_style, generate_report, report_format)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        sessionId,
        userId || null,
        projectId,
        query,
        'researching',
        fullConfig.depth,
        fullConfig.maxSources,
        fullConfig.includeAcademic,
        fullConfig.includeNews,
        fullConfig.includeForums,
        fullConfig.dateRange?.start || null,
        fullConfig.dateRange?.end || null,
        fullConfig.requiredDomains || null,
        fullConfig.excludedDomains || null,
        fullConfig.citationStyle,
        fullConfig.generateReport,
        fullConfig.reportFormat,
      ]
    );

    this.logger.info({ sessionId, query }, 'Research session started');
    this.emitEvent(sessionId, 'status_change', { status: 'researching' });

    // Start background research process
    this.conductResearch(sessionId, query, fullConfig).catch(error => {
      this.logger.error({ sessionId, error: error.message }, 'Research failed');
      this.updateSessionStatus(sessionId, 'failed');
    });

    return {
      id: sessionId,
      userId,
      projectId,
      query,
      config: fullConfig,
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
        totalTokens: 0,
        duration: 0,
      },
      createdAt: new Date(),
    };
  }

  // Main research conductor
  private async conductResearch(sessionId: string, query: string, config: ResearchConfig): Promise<void> {
    const startTime = Date.now();

    try {
      // Phase 1: Search sources
      const searchResults = await this.searchSources(sessionId, query, config);
      this.logger.info({ sessionId, count: searchResults.length }, 'Sources found');

      // Phase 2: Extract content from sources
      await this.updateSessionStatus(sessionId, 'analyzing');
      const extractedSources = await this.extractSourceContent(sessionId, searchResults, config);
      this.logger.info({ sessionId, count: extractedSources.length }, 'Content extracted');

      // Phase 3: Extract and verify facts
      const facts = await this.extractAndVerifyFacts(sessionId, extractedSources);
      this.logger.info({ sessionId, count: facts.length }, 'Facts extracted');

      // Phase 4: Build knowledge graph
      const knowledgeGraph = await this.buildKnowledgeGraph(sessionId, facts, extractedSources);
      this.logger.info({ sessionId, nodes: knowledgeGraph.length }, 'Knowledge graph built');

      // Phase 5: Detect contradictions
      const contradictions = await this.detectContradictions(sessionId, facts);
      this.logger.info({ sessionId, count: contradictions.length }, 'Contradictions detected');

      // Phase 6: Generate follow-up questions
      const followUps = await this.generateFollowUps(sessionId, query, facts);
      this.logger.info({ sessionId, count: followUps.length }, 'Follow-up questions generated');

      // Phase 7: Generate report if requested
      await this.updateSessionStatus(sessionId, 'synthesizing');
      if (config.generateReport) {
        await this.generateReport(sessionId);
        this.logger.info({ sessionId }, 'Report generated');
      }

      // Update stats and complete
      const duration = Date.now() - startTime;
      await this.db.query(
        `UPDATE research_sessions
         SET status = 'completed', completed_at = NOW(), duration_ms = $2
         WHERE id = $1`,
        [sessionId, duration]
      );

      this.emitEvent(sessionId, 'status_change', { status: 'completed' });
      this.logger.info({ sessionId, duration }, 'Research completed');
    } catch (error: any) {
      this.logger.error({ sessionId, error: error.message }, 'Research failed');
      await this.updateSessionStatus(sessionId, 'failed');
      throw error;
    }
  }

  // Search multiple sources in parallel
  async searchSources(sessionId: string, query: string, config: ResearchConfig): Promise<SearchResult[]> {
    const searchOptions = {
      maxResults: config.maxSources,
      dateRange: config.dateRange,
      domains: config.requiredDomains,
    };

    const results = await this.searchOrchestrator.searchAll(query, searchOptions);

    // Filter by excluded domains
    const filtered = config.excludedDomains
      ? results.filter(r => !config.excludedDomains!.some(d => r.url.includes(d)))
      : results;

    // Update stats
    await this.db.query(
      'UPDATE research_sessions SET sources_searched = $2 WHERE id = $1',
      [sessionId, filtered.length]
    );

    return filtered.slice(0, config.maxSources);
  }

  // Extract content from search results
  private async extractSourceContent(
    sessionId: string,
    searchResults: SearchResult[],
    config: ResearchConfig
  ): Promise<ResearchSource[]> {
    const sources: ResearchSource[] = [];

    // Extract content with concurrency limit
    const extractedMap = await this.contentExtractor.extractBatch(
      searchResults.map(r => r.url),
      5 // concurrency
    );

    for (const searchResult of searchResults) {
      const extracted = extractedMap.get(searchResult.url);

      if (!extracted || extracted.quality.score < 0.3) {
        this.logger.debug({ url: searchResult.url }, 'Skipping low-quality source');
        continue;
      }

      // Calculate credibility scores
      const credibility = await this.calculateCredibility(searchResult, extracted);

      const sourceId = uuidv4();
      const source: ResearchSource = {
        id: sourceId,
        url: searchResult.url,
        title: extracted.title,
        content: extracted.content,
        author: extracted.author || searchResult.author,
        publishDate: extracted.publishDate || searchResult.publishDate,
        credibility,
        extractedFacts: [], // Will be populated later
      };

      // Save to database
      await this.db.query(
        `INSERT INTO research_sources
         (id, session_id, url, title, content, snippet, author, publish_date, source_type, provider,
          authority_score, recency_score, bias_score, overall_credibility, is_processed)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          sourceId,
          sessionId,
          source.url,
          source.title,
          source.content,
          extracted.excerpt,
          source.author || null,
          source.publishDate || null,
          searchResult.sourceType,
          searchResult.provider,
          credibility.authorityScore,
          credibility.recencyScore,
          credibility.biasScore,
          credibility.overallScore,
          true,
        ]
      );

      sources.push(source);
      this.emitEvent(sessionId, 'source_found', { source: { id: sourceId, title: source.title, url: source.url } });
    }

    await this.db.query(
      'UPDATE research_sessions SET sources_used = $2 WHERE id = $1',
      [sessionId, sources.length]
    );

    return sources;
  }

  // Calculate credibility score for a source
  private async calculateCredibility(
    searchResult: SearchResult,
    extracted: ExtractedContent
  ): Promise<ResearchSource['credibility']> {
    // Authority score based on domain, author, source type
    let authorityScore = 0.5;

    if (searchResult.sourceType === 'academic' || searchResult.sourceType === 'arxiv') {
      authorityScore = 0.9;
    } else if (searchResult.sourceType === 'wikipedia') {
      authorityScore = 0.8;
    } else if (searchResult.sourceType === 'news') {
      authorityScore = 0.7;
    } else if (extracted.author) {
      authorityScore = 0.6;
    }

    // Domain authority boost
    const highAuthorityDomains = ['.edu', '.gov', '.org'];
    if (highAuthorityDomains.some(d => searchResult.url.includes(d))) {
      authorityScore = Math.min(1.0, authorityScore + 0.1);
    }

    // Recency score
    let recencyScore = 0.5;
    if (extracted.publishDate) {
      const ageInDays = (Date.now() - extracted.publishDate.getTime()) / (1000 * 60 * 60 * 24);
      if (ageInDays < 30) recencyScore = 1.0;
      else if (ageInDays < 180) recencyScore = 0.9;
      else if (ageInDays < 365) recencyScore = 0.7;
      else if (ageInDays < 730) recencyScore = 0.5;
      else recencyScore = 0.3;
    }

    // Bias score (0 = unbiased, 1 = highly biased)
    // This would use AI analysis in production
    const biasScore = 0.3; // Placeholder

    // Overall credibility (weighted average)
    const overallScore = authorityScore * 0.4 + recencyScore * 0.3 + (1.0 - biasScore) * 0.3;

    return {
      authorityScore,
      recencyScore,
      biasScore,
      overallScore,
    };
  }

  // Extract and verify facts from sources
  private async extractAndVerifyFacts(sessionId: string, sources: ResearchSource[]): Promise<Fact[]> {
    const allFacts: Fact[] = [];

    // Process sources in batches
    for (const source of sources) {
      if (source.content.length < 100) continue;

      // Use Claude to extract facts
      const extractedFacts = await this.extractFactsWithAI(source.content, source.title);

      for (const factStatement of extractedFacts) {
        const factId = uuidv4();

        // Save fact
        await this.db.query(
          `INSERT INTO research_facts
           (id, session_id, statement, confidence, verification_status, verification_count)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [factId, sessionId, factStatement, 0.7, 'unverified', 1]
        );

        // Link fact to source
        await this.db.query(
          'INSERT INTO fact_sources (fact_id, source_id) VALUES ($1, $2)',
          [factId, source.id]
        );

        const fact: Fact = {
          id: factId,
          statement: factStatement,
          confidence: 0.7,
          sourceIds: [source.id],
          verificationStatus: 'unverified',
        };

        allFacts.push(fact);
        source.extractedFacts.push(fact);

        this.emitEvent(sessionId, 'fact_extracted', { fact: { id: factId, statement: factStatement } });
      }
    }

    // Cross-verify facts across sources
    await this.crossVerifyFacts(sessionId, allFacts, sources);

    await this.db.query(
      'UPDATE research_sessions SET facts_extracted = $2 WHERE id = $1',
      [sessionId, allFacts.length]
    );

    return allFacts;
  }

  // Extract facts using AI
  private async extractFactsWithAI(content: string, title: string): Promise<string[]> {
    try {
      const truncatedContent = content.substring(0, 10000); // Limit context

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: `Extract 5-10 key factual statements from this article titled "${title}".

Content:
${truncatedContent}

Return ONLY a JSON array of fact strings, nothing else. Example:
["Fact 1", "Fact 2", "Fact 3"]

Focus on:
- Verifiable facts (not opinions)
- Important information
- Specific claims with details
- Statistics and numbers`,
          },
        ],
      });

      const content0 = response.content[0];
      if (content0.type !== 'text') return [];

      // Parse JSON array
      const jsonMatch = content0.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const facts = JSON.parse(jsonMatch[0]) as string[];
      return facts.filter(f => f.length > 10 && f.length < 500);
    } catch (error: any) {
      this.logger.error({ error: error.message }, 'Fact extraction failed');
      return [];
    }
  }

  // Cross-verify facts across sources
  private async crossVerifyFacts(sessionId: string, facts: Fact[], sources: ResearchSource[]): Promise<void> {
    // Simple verification: check if similar facts appear in multiple sources
    for (const fact of facts) {
      let verificationCount = 1;

      // Check against other sources
      for (const source of sources) {
        if (source.id !== fact.sourceIds[0]) {
          // Check if source content mentions similar fact (simple string similarity)
          if (this.calculateSimilarity(fact.statement, source.content) > 0.7) {
            verificationCount++;
            fact.sourceIds.push(source.id);

            // Update database
            await this.db.query(
              'INSERT INTO fact_sources (fact_id, source_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [fact.id, source.id]
            );
          }
        }
      }

      // Update verification status
      const status = verificationCount >= 3 ? 'verified' : verificationCount >= 2 ? 'unverified' : 'unverified';
      const confidence = Math.min(0.95, 0.5 + verificationCount * 0.15);

      fact.verificationStatus = status;
      fact.confidence = confidence;

      await this.db.query(
        'UPDATE research_facts SET verification_status = $2, confidence = $3, verification_count = $4 WHERE id = $1',
        [fact.id, status, confidence, verificationCount]
      );
    }
  }

  // Simple similarity calculation (in production, use embeddings)
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  // Build knowledge graph from extracted info
  async buildKnowledgeGraph(
    sessionId: string,
    facts: Fact[],
    sources: ResearchSource[]
  ): Promise<KnowledgeNode[]> {
    try {
      // Use Claude to extract entities and relationships
      const factsText = facts.slice(0, 50).map(f => f.statement).join('\n');

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 3000,
        messages: [
          {
            role: 'user',
            content: `Extract entities and relationships from these facts:

${factsText}

Return JSON with format:
{
  "nodes": [{"entity": "Name", "type": "person|organization|concept|event|place|thing", "properties": {}}],
  "relationships": [{"source": "Entity1", "target": "Entity2", "type": "relationship_type"}]
}`,
          },
        ],
      });

      const content0 = response.content[0];
      if (content0.type !== 'text') return [];

      const jsonMatch = content0.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return [];

      const data = JSON.parse(jsonMatch[0]) as any;

      const nodes: KnowledgeNode[] = [];
      const nodeMap = new Map<string, string>(); // entity -> id

      // Create nodes
      for (const nodeData of data.nodes || []) {
        const nodeId = uuidv4();
        nodeMap.set(nodeData.entity, nodeId);

        const node: KnowledgeNode = {
          id: nodeId,
          entity: nodeData.entity,
          type: nodeData.type,
          properties: nodeData.properties || {},
          relationships: [],
        };

        // Save to database
        await this.db.query(
          `INSERT INTO knowledge_nodes (id, session_id, entity, entity_type, properties, importance)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [nodeId, sessionId, node.entity, node.type, JSON.stringify(node.properties), 0.5]
        );

        nodes.push(node);
      }

      // Create relationships
      for (const relData of data.relationships || []) {
        const sourceId = nodeMap.get(relData.source);
        const targetId = nodeMap.get(relData.target);

        if (sourceId && targetId) {
          const relId = uuidv4();

          await this.db.query(
            `INSERT INTO knowledge_relationships (id, session_id, source_node_id, target_node_id, relationship_type, strength)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [relId, sessionId, sourceId, targetId, relData.type, 0.7]
          );

          const sourceNode = nodes.find(n => n.id === sourceId);
          if (sourceNode) {
            sourceNode.relationships.push({ targetId, type: relData.type });
          }
        }
      }

      return nodes;
    } catch (error: any) {
      this.logger.error({ error: error.message }, 'Knowledge graph building failed');
      return [];
    }
  }

  // Generate follow-up questions for deeper research
  async generateFollowUps(sessionId: string, originalQuery: string, facts: Fact[]): Promise<string[]> {
    try {
      const factsText = facts.slice(0, 30).map(f => f.statement).join('\n');

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `Original question: "${originalQuery}"

Based on these findings:
${factsText}

Generate 5 important follow-up questions for deeper research. Return as JSON array:
["Question 1?", "Question 2?", ...]`,
          },
        ],
      });

      const content0 = response.content[0];
      if (content0.type !== 'text') return [];

      const jsonMatch = content0.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const questions = JSON.parse(jsonMatch[0]) as string[];

      // Save to database
      for (const question of questions) {
        const id = uuidv4();
        await this.db.query(
          'INSERT INTO research_follow_ups (id, session_id, question, priority) VALUES ($1, $2, $3, $4)',
          [id, sessionId, question, 0.7]
        );
      }

      return questions;
    } catch (error: any) {
      this.logger.error({ error: error.message }, 'Follow-up generation failed');
      return [];
    }
  }

  // Detect contradictions between facts
  async detectContradictions(sessionId: string, facts: Fact[]): Promise<Array<{ fact1: Fact; fact2: Fact; explanation: string }>> {
    const contradictions: Array<{ fact1: Fact; fact2: Fact; explanation: string }> = [];

    // Simple approach: use AI to check pairs
    // In production, use embeddings for similarity first
    for (let i = 0; i < facts.length; i++) {
      for (let j = i + 1; j < Math.min(i + 10, facts.length); j++) {
        const contradiction = await this.checkContradiction(facts[i], facts[j]);

        if (contradiction) {
          contradictions.push({
            fact1: facts[i],
            fact2: facts[j],
            explanation: contradiction,
          });

          // Save to database
          const id = uuidv4();
          await this.db.query(
            `INSERT INTO fact_contradictions (id, session_id, fact_id_1, fact_id_2, explanation, severity)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, sessionId, facts[i].id, facts[j].id, contradiction, 'moderate']
          );

          facts[i].verificationStatus = 'contradicted';
          facts[j].verificationStatus = 'contradicted';

          this.emitEvent(sessionId, 'contradiction_detected', {
            fact1: facts[i].statement,
            fact2: facts[j].statement,
          });
        }
      }
    }

    await this.db.query(
      'UPDATE research_sessions SET contradictions_found = $2 WHERE id = $1',
      [sessionId, contradictions.length]
    );

    return contradictions;
  }

  private async checkContradiction(fact1: Fact, fact2: Fact): Promise<string | null> {
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: `Do these facts contradict each other?

Fact 1: ${fact1.statement}
Fact 2: ${fact2.statement}

If they contradict, explain briefly. If not, say "NO".`,
          },
        ],
      });

      const content0 = response.content[0];
      if (content0.type !== 'text') return null;

      const text = content0.text.trim();
      return text.toUpperCase().startsWith('NO') ? null : text;
    } catch (error: any) {
      return null;
    }
  }

  // Generate final research report
  async generateReport(sessionId: string): Promise<ResearchReport> {
    // Fetch session data
    const { rows: sessionRows } = await this.db.query(
      'SELECT * FROM research_sessions WHERE id = $1',
      [sessionId]
    );

    if (sessionRows.length === 0) {
      throw new Error('Session not found');
    }

    const session = sessionRows[0];

    // Fetch facts
    const { rows: factRows } = await this.db.query(
      `SELECT f.*, array_agg(s.url) as source_urls
       FROM research_facts f
       LEFT JOIN fact_sources fs ON f.id = fs.fact_id
       LEFT JOIN research_sources s ON fs.source_id = s.id
       WHERE f.session_id = $1
       GROUP BY f.id
       ORDER BY f.confidence DESC`,
      [sessionId]
    );

    // Fetch sources
    const { rows: sourceRows } = await this.db.query(
      `SELECT * FROM research_sources
       WHERE session_id = $1 AND is_used = true
       ORDER BY overall_credibility DESC`,
      [sessionId]
    );

    // Generate report with AI
    const report = await this.generateReportWithAI(session, factRows, sourceRows);

    // Save report
    const reportId = uuidv4();
    await this.db.query(
      `INSERT INTO research_reports
       (id, session_id, title, abstract, sections, key_findings, limitations, bibliography)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        reportId,
        sessionId,
        report.title,
        report.abstract,
        JSON.stringify(report.sections),
        report.keyFindings,
        report.limitations,
        report.bibliography,
      ]
    );

    return report;
  }

  private async generateReportWithAI(session: any, facts: any[], sources: any[]): Promise<ResearchReport> {
    const topFacts = facts.slice(0, 30).map(f => f.statement).join('\n');

    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: `Generate a research report for: "${session.query}"

Key findings:
${topFacts}

Return JSON:
{
  "title": "Report Title",
  "abstract": "Brief abstract",
  "sections": [{"title": "Section Title", "content": "Section content"}],
  "keyFindings": ["Finding 1", "Finding 2"],
  "limitations": ["Limitation 1"]
}`,
        },
      ],
    });

    const content0 = response.content[0];
    if (content0.type !== 'text') {
      throw new Error('Failed to generate report');
    }

    const jsonMatch = content0.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse report');
    }

    const reportData = JSON.parse(jsonMatch[0]);

    // Generate bibliography
    const bibliography = sources
      .slice(0, 20)
      .map((s, i) => this.formatCitation(s, session.citation_style, i + 1));

    return {
      title: reportData.title,
      abstract: reportData.abstract,
      sections: reportData.sections,
      keyFindings: reportData.keyFindings,
      limitations: reportData.limitations,
      bibliography,
      generatedAt: new Date(),
    };
  }

  private formatCitation(source: any, style: string, index: number): string {
    const author = source.author || 'Unknown';
    const title = source.title;
    const url = source.url;
    const date = source.publish_date ? new Date(source.publish_date).getFullYear() : 'n.d.';

    switch (style) {
      case 'apa':
        return `${author}. (${date}). ${title}. Retrieved from ${url}`;
      case 'mla':
        return `${author}. "${title}." Web. ${date}. <${url}>.`;
      case 'chicago':
        return `${author}. "${title}." Accessed ${date}. ${url}.`;
      case 'ieee':
        return `[${index}] ${author}, "${title}," ${date}. [Online]. Available: ${url}`;
      default:
        return `${author} (${date}). ${title}. ${url}`;
    }
  }

  // Deep dive into a follow-up question
  async deepDive(sessionId: string, question: string): Promise<void> {
    const { rows: sessionRows } = await this.db.query(
      'SELECT * FROM research_sessions WHERE id = $1',
      [sessionId]
    );

    if (sessionRows.length === 0) {
      throw new Error('Session not found');
    }

    const session = sessionRows[0];

    // Start sub-research with same config but fewer sources
    const config: ResearchConfig = {
      depth: 'quick',
      maxSources: 10,
      includeAcademic: session.include_academic,
      includeNews: session.include_news,
      includeForums: session.include_forums,
      citationStyle: session.citation_style,
      generateReport: false,
      reportFormat: 'summary',
    };

    await this.conductResearch(sessionId, question, config);
  }

  // Stream research progress via SSE
  async *streamResearch(sessionId: string): AsyncGenerator<ResearchEvent> {
    // Poll events from database
    let lastEventId: string | null = null;

    while (true) {
      const { rows } = await this.db.query(
        `SELECT * FROM research_events
         WHERE session_id = $1 AND ($2::uuid IS NULL OR created_at > (SELECT created_at FROM research_events WHERE id = $2))
         ORDER BY created_at ASC
         LIMIT 10`,
        [sessionId, lastEventId]
      );

      for (const row of rows) {
        yield {
          type: row.event_type,
          data: row.event_data,
          timestamp: row.created_at,
        };
        lastEventId = row.id;
      }

      // Check if session completed
      const { rows: sessionRows } = await this.db.query(
        'SELECT status FROM research_sessions WHERE id = $1',
        [sessionId]
      );

      if (sessionRows[0]?.status === 'completed' || sessionRows[0]?.status === 'failed') {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Get research session by ID
  async getSession(sessionId: string): Promise<ResearchSession | null> {
    const { rows } = await this.db.query(
      'SELECT * FROM research_sessions WHERE id = $1',
      [sessionId]
    );

    if (rows.length === 0) return null;

    const row = rows[0];

    // Fetch related data
    const { rows: sourceRows } = await this.db.query(
      'SELECT * FROM research_sources WHERE session_id = $1',
      [sessionId]
    );

    const { rows: factRows } = await this.db.query(
      'SELECT * FROM research_facts WHERE session_id = $1',
      [sessionId]
    );

    const { rows: nodeRows } = await this.db.query(
      'SELECT * FROM knowledge_nodes WHERE session_id = $1',
      [sessionId]
    );

    const { rows: followUpRows } = await this.db.query(
      'SELECT question FROM research_follow_ups WHERE session_id = $1',
      [sessionId]
    );

    const { rows: reportRows } = await this.db.query(
      'SELECT * FROM research_reports WHERE session_id = $1',
      [sessionId]
    );

    return {
      id: row.id,
      userId: row.user_id,
      projectId: row.project_id,
      query: row.query,
      status: row.status,
      config: {
        depth: row.depth,
        maxSources: row.max_sources,
        includeAcademic: row.include_academic,
        includeNews: row.include_news,
        includeForums: row.include_forums,
        citationStyle: row.citation_style,
        generateReport: row.generate_report,
        reportFormat: row.report_format,
      },
      sources: sourceRows.map(s => ({
        id: s.id,
        url: s.url,
        title: s.title,
        content: s.content,
        author: s.author,
        publishDate: s.publish_date,
        credibility: {
          authorityScore: s.authority_score,
          recencyScore: s.recency_score,
          biasScore: s.bias_score,
          overallScore: s.overall_credibility,
        },
        extractedFacts: [],
      })),
      facts: factRows.map(f => ({
        id: f.id,
        statement: f.statement,
        confidence: f.confidence,
        sourceIds: [],
        verificationStatus: f.verification_status,
      })),
      knowledgeGraph: nodeRows.map(n => ({
        id: n.id,
        entity: n.entity,
        type: n.entity_type,
        properties: n.properties,
        relationships: [],
      })),
      followUpQuestions: followUpRows.map(r => r.question),
      report: reportRows[0]
        ? {
            title: reportRows[0].title,
            abstract: reportRows[0].abstract,
            sections: reportRows[0].sections,
            keyFindings: reportRows[0].key_findings,
            limitations: reportRows[0].limitations,
            bibliography: reportRows[0].bibliography,
            generatedAt: reportRows[0].generated_at,
          }
        : undefined,
      stats: {
        sourcesSearched: row.sources_searched,
        sourcesUsed: row.sources_used,
        factsExtracted: row.facts_extracted,
        contradictionsFound: row.contradictions_found,
        totalTokens: row.total_tokens,
        duration: row.duration_ms,
      },
      createdAt: row.created_at,
      completedAt: row.completed_at,
    };
  }

  // Helper methods
  private getMaxSourcesByDepth(depth: ResearchConfig['depth']): number {
    switch (depth) {
      case 'quick':
        return 10;
      case 'standard':
        return 20;
      case 'deep':
        return 40;
      case 'exhaustive':
        return 100;
      default:
        return 20;
    }
  }

  private async updateSessionStatus(sessionId: string, status: ResearchSession['status']): Promise<void> {
    await this.db.query('UPDATE research_sessions SET status = $2 WHERE id = $1', [sessionId, status]);
    this.emitEvent(sessionId, 'status_change', { status });
  }

  private async emitEvent(sessionId: string, type: string, data: any): Promise<void> {
    const id = uuidv4();
    await this.db.query(
      'INSERT INTO research_events (id, session_id, event_type, event_data) VALUES ($1, $2, $3, $4)',
      [id, sessionId, type, JSON.stringify(data)]
    );
  }

  // Export report to various formats
  async exportReport(sessionId: string, format: 'pdf' | 'docx' | 'md' | 'html'): Promise<Buffer> {
    const { rows } = await this.db.query(
      'SELECT * FROM research_reports WHERE session_id = $1',
      [sessionId]
    );

    if (rows.length === 0) {
      throw new Error('Report not found');
    }

    const report = rows[0];

    switch (format) {
      case 'md':
        return this.exportAsMarkdown(report);
      case 'html':
        return this.exportAsHtml(report);
      default:
        throw new Error(`Format ${format} not yet implemented`);
    }
  }

  private exportAsMarkdown(report: any): Buffer {
    let md = `# ${report.title}\n\n`;
    md += `## Abstract\n\n${report.abstract}\n\n`;

    for (const section of report.sections) {
      md += `## ${section.title}\n\n${section.content}\n\n`;
    }

    md += `## Key Findings\n\n`;
    for (const finding of report.key_findings) {
      md += `- ${finding}\n`;
    }

    md += `\n## Bibliography\n\n`;
    for (const citation of report.bibliography) {
      md += `- ${citation}\n`;
    }

    return Buffer.from(md, 'utf-8');
  }

  private exportAsHtml(report: any): Buffer {
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${report.title}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; }
    h2 { color: #666; margin-top: 30px; }
    .abstract { font-style: italic; background: #f5f5f5; padding: 15px; }
  </style>
</head>
<body>
  <h1>${report.title}</h1>
  <div class="abstract">
    <h2>Abstract</h2>
    <p>${report.abstract}</p>
  </div>
`;

    for (const section of report.sections) {
      html += `  <h2>${section.title}</h2>\n  <p>${section.content}</p>\n`;
    }

    html += `  <h2>Key Findings</h2>\n  <ul>\n`;
    for (const finding of report.key_findings) {
      html += `    <li>${finding}</li>\n`;
    }
    html += `  </ul>\n`;

    html += `  <h2>Bibliography</h2>\n  <ol>\n`;
    for (const citation of report.bibliography) {
      html += `    <li>${citation}</li>\n`;
    }
    html += `  </ol>\n</body>\n</html>`;

    return Buffer.from(html, 'utf-8');
  }
}
