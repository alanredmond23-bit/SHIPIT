import { Logger } from 'pino';

/**
 * Advanced Web Search Service
 *
 * Integrates multiple search APIs:
 * - Tavily AI Search (AI-optimized web search)
 * - Exa AI (semantic/neural search)
 * - Fallback to existing search providers (Google, Bing, etc.)
 */

// ============================================================================
// Types
// ============================================================================

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string; // Full content if available
  author?: string;
  publishDate?: Date;
  score?: number; // Relevance score
  sourceType?: 'web' | 'academic' | 'news' | 'forum' | 'documentation';
  provider: string;
  metadata?: Record<string, any>;
}

export interface SearchRequest {
  query: string;
  maxResults?: number;
  searchDepth?: 'basic' | 'advanced';
  includeDomains?: string[];
  excludeDomains?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  sourceTypes?: string[];
  language?: string;
}

export interface SearchProvider {
  name: string;
  search(request: SearchRequest): Promise<SearchResult[]>;
  isAvailable(): boolean;
}

// ============================================================================
// Tavily AI Search Provider
// ============================================================================

export class TavilySearchProvider implements SearchProvider {
  name = 'tavily';
  private apiKey: string;
  private logger: Logger;
  private baseUrl = 'https://api.tavily.com';

  constructor(apiKey: string, logger: Logger) {
    this.apiKey = apiKey;
    this.logger = logger.child({ provider: 'tavily' });
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async search(request: SearchRequest): Promise<SearchResult[]> {
    if (!this.isAvailable()) {
      this.logger.warn('Tavily API not configured');
      return [];
    }

    const startTime = Date.now();

    try {
      this.logger.info({
        query: request.query,
        maxResults: request.maxResults,
        searchDepth: request.searchDepth,
      }, 'Searching with Tavily');

      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          query: request.query,
          search_depth: request.searchDepth || 'basic',
          max_results: request.maxResults || 10,
          include_domains: request.includeDomains,
          exclude_domains: request.excludeDomains,
          include_answer: true,
          include_raw_content: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Tavily API error: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      this.logger.info({
        resultCount: data.results?.length || 0,
        duration,
      }, 'Tavily search completed');

      return (data.results || []).map((item: any) => ({
        title: item.title,
        url: item.url,
        snippet: item.content || item.snippet || '',
        content: item.raw_content,
        score: item.score,
        publishDate: item.published_date ? new Date(item.published_date) : undefined,
        sourceType: this.detectSourceType(item.url),
        provider: this.name,
        metadata: {
          answer: data.answer,
          images: data.images,
        },
      }));
    } catch (error: any) {
      this.logger.error({
        error: error.message,
        query: request.query,
      }, 'Tavily search failed');

      return [];
    }
  }

  private detectSourceType(url: string): SearchResult['sourceType'] {
    if (url.includes('arxiv.org') || url.includes('scholar.google')) return 'academic';
    if (url.includes('reddit.com') || url.includes('stackoverflow.com')) return 'forum';
    if (url.includes('docs.') || url.includes('/documentation/')) return 'documentation';
    if (url.includes('/news/') || url.includes('bbc.') || url.includes('cnn.')) return 'news';
    return 'web';
  }
}

// ============================================================================
// Exa AI Search Provider
// ============================================================================

export class ExaSearchProvider implements SearchProvider {
  name = 'exa';
  private apiKey: string;
  private logger: Logger;
  private baseUrl = 'https://api.exa.ai';

  constructor(apiKey: string, logger: Logger) {
    this.apiKey = apiKey;
    this.logger = logger.child({ provider: 'exa' });
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async search(request: SearchRequest): Promise<SearchResult[]> {
    if (!this.isAvailable()) {
      this.logger.warn('Exa API not configured');
      return [];
    }

    const startTime = Date.now();

    try {
      this.logger.info({
        query: request.query,
        maxResults: request.maxResults,
      }, 'Searching with Exa');

      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          query: request.query,
          num_results: request.maxResults || 10,
          type: 'neural', // Use neural/semantic search
          use_autoprompt: true,
          contents: {
            text: true,
            highlights: true,
            summary: true,
          },
          include_domains: request.includeDomains,
          exclude_domains: request.excludeDomains,
          start_published_date: request.dateRange?.start?.toISOString(),
          end_published_date: request.dateRange?.end?.toISOString(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Exa API error: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      this.logger.info({
        resultCount: data.results?.length || 0,
        duration,
      }, 'Exa search completed');

      return (data.results || []).map((item: any) => ({
        title: item.title,
        url: item.url,
        snippet: item.summary || item.text?.substring(0, 200) || '',
        content: item.text,
        author: item.author,
        publishDate: item.published_date ? new Date(item.published_date) : undefined,
        score: item.score,
        sourceType: this.detectSourceType(item.url),
        provider: this.name,
        metadata: {
          highlights: item.highlights,
          autopromptString: data.autoprompt_string,
        },
      }));
    } catch (error: any) {
      this.logger.error({
        error: error.message,
        query: request.query,
      }, 'Exa search failed');

      return [];
    }
  }

  /**
   * Find similar content to a given URL
   */
  async findSimilar(url: string, numResults: number = 10): Promise<SearchResult[]> {
    if (!this.isAvailable()) {
      throw new Error('Exa API not configured');
    }

    try {
      this.logger.info({ url, numResults }, 'Finding similar content with Exa');

      const response = await fetch(`${this.baseUrl}/findSimilar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          url,
          num_results: numResults,
          contents: {
            text: true,
            summary: true,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Exa API error: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();

      return (data.results || []).map((item: any) => ({
        title: item.title,
        url: item.url,
        snippet: item.summary || item.text?.substring(0, 200) || '',
        content: item.text,
        score: item.score,
        sourceType: this.detectSourceType(item.url),
        provider: this.name,
      }));
    } catch (error: any) {
      this.logger.error({
        error: error.message,
        url,
      }, 'Exa findSimilar failed');

      throw error;
    }
  }

  /**
   * Get contents of specific URLs
   */
  async getContents(urls: string[]): Promise<SearchResult[]> {
    if (!this.isAvailable()) {
      throw new Error('Exa API not configured');
    }

    try {
      this.logger.info({ urlCount: urls.length }, 'Getting contents with Exa');

      const response = await fetch(`${this.baseUrl}/contents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          ids: urls,
          text: true,
          summary: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Exa API error: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();

      return (data.results || []).map((item: any) => ({
        title: item.title,
        url: item.url,
        snippet: item.summary || '',
        content: item.text,
        publishDate: item.published_date ? new Date(item.published_date) : undefined,
        sourceType: this.detectSourceType(item.url),
        provider: this.name,
      }));
    } catch (error: any) {
      this.logger.error({
        error: error.message,
        urlCount: urls.length,
      }, 'Exa getContents failed');

      throw error;
    }
  }

  private detectSourceType(url: string): SearchResult['sourceType'] {
    if (url.includes('arxiv.org') || url.includes('scholar.google')) return 'academic';
    if (url.includes('reddit.com') || url.includes('stackoverflow.com')) return 'forum';
    if (url.includes('docs.') || url.includes('/documentation/')) return 'documentation';
    if (url.includes('/news/') || url.includes('bbc.') || url.includes('cnn.')) return 'news';
    return 'web';
  }
}

// ============================================================================
// Web Search Service (Orchestrator)
// ============================================================================

export interface WebSearchConfig {
  tavily?: { apiKey: string; enabled?: boolean };
  exa?: { apiKey: string; enabled?: boolean };
  defaultProvider?: 'tavily' | 'exa';
}

export class WebSearchService {
  private providers: Map<string, SearchProvider> = new Map();
  private logger: Logger;
  private defaultProvider: string;

  constructor(logger: Logger, config: WebSearchConfig) {
    this.logger = logger.child({ service: 'web-search' });
    this.defaultProvider = config.defaultProvider || 'tavily';

    this.initializeProviders(config);

    this.logger.info(
      { providers: Array.from(this.providers.keys()) },
      'Web search service initialized'
    );
  }

  private initializeProviders(config: WebSearchConfig): void {
    if (config.tavily?.enabled !== false && config.tavily?.apiKey) {
      this.providers.set('tavily', new TavilySearchProvider(config.tavily.apiKey, this.logger));
    }

    if (config.exa?.enabled !== false && config.exa?.apiKey) {
      this.providers.set('exa', new ExaSearchProvider(config.exa.apiKey, this.logger));
    }

    if (this.providers.size === 0) {
      this.logger.warn('No web search providers enabled');
    }
  }

  /**
   * Search with a specific provider
   */
  async search(request: SearchRequest, provider?: string): Promise<SearchResult[]> {
    const providerName = provider || this.defaultProvider;
    const searchProvider = this.providers.get(providerName);

    if (!searchProvider) {
      throw new Error(`Search provider '${providerName}' not available`);
    }

    return searchProvider.search(request);
  }

  /**
   * Search across all available providers and merge results
   */
  async searchAll(request: SearchRequest): Promise<SearchResult[]> {
    const availableProviders = Array.from(this.providers.values()).filter(p =>
      p.isAvailable()
    );

    if (availableProviders.length === 0) {
      throw new Error('No search providers available');
    }

    try {
      const results = await Promise.all(
        availableProviders.map(provider =>
          provider.search(request).catch(error => {
            this.logger.error(
              { provider: provider.name, error: error.message },
              'Provider search failed'
            );
            return [];
          })
        )
      );

      // Merge and deduplicate results
      const allResults = results.flat();
      const uniqueResults = this.deduplicateResults(allResults);

      // Sort by score (if available)
      uniqueResults.sort((a, b) => (b.score || 0) - (a.score || 0));

      return uniqueResults.slice(0, request.maxResults || 50);
    } catch (error: any) {
      this.logger.error({
        error: error.message,
        query: request.query,
      }, 'Search all failed');

      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Deep research: search, extract content, and summarize
   */
  async deepSearch(
    query: string,
    options?: {
      maxResults?: number;
      extractContent?: boolean;
      provider?: string;
    }
  ): Promise<{
    results: SearchResult[];
    summary?: string;
  }> {
    try {
      // Perform search
      const results = await this.search(
        {
          query,
          maxResults: options?.maxResults || 10,
          searchDepth: 'advanced',
        },
        options?.provider
      );

      // Extract full content if requested and using Exa
      if (options?.extractContent && options?.provider === 'exa') {
        const exaProvider = this.providers.get('exa') as ExaSearchProvider;
        if (exaProvider) {
          const urls = results.map(r => r.url);
          const contentsResults = await exaProvider.getContents(urls);

          // Merge content back into results
          results.forEach((result, index) => {
            if (contentsResults[index]?.content) {
              result.content = contentsResults[index].content;
            }
          });
        }
      }

      return {
        results,
      };
    } catch (error: any) {
      this.logger.error({
        error: error.message,
        query,
      }, 'Deep search failed');

      throw new Error(`Deep search failed: ${error.message}`);
    }
  }

  /**
   * Find similar content to a URL (Exa only)
   */
  async findSimilar(
    url: string,
    numResults: number = 10
  ): Promise<SearchResult[]> {
    const exaProvider = this.providers.get('exa') as ExaSearchProvider;

    if (!exaProvider) {
      throw new Error('Exa provider not available for findSimilar');
    }

    return exaProvider.findSimilar(url, numResults);
  }

  /**
   * Get contents of specific URLs (Exa only)
   */
  async getContents(urls: string[]): Promise<SearchResult[]> {
    const exaProvider = this.providers.get('exa') as ExaSearchProvider;

    if (!exaProvider) {
      throw new Error('Exa provider not available for getContents');
    }

    return exaProvider.getContents(urls);
  }

  /**
   * Search with automatic query enhancement
   */
  async smartSearch(
    query: string,
    options?: {
      maxResults?: number;
      extractContent?: boolean;
    }
  ): Promise<SearchResult[]> {
    // Use Tavily or Exa's auto-prompt features
    const provider = this.providers.has('exa') ? 'exa' : 'tavily';

    return this.search(
      {
        query,
        maxResults: options?.maxResults || 10,
        searchDepth: 'advanced',
      },
      provider
    );
  }

  /**
   * Deduplicate search results by URL
   */
  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Map<string, SearchResult>();

    for (const result of results) {
      const normalizedUrl = this.normalizeUrl(result.url);

      if (!seen.has(normalizedUrl)) {
        seen.set(normalizedUrl, result);
      } else {
        // Keep result with higher score
        const existing = seen.get(normalizedUrl)!;
        if ((result.score || 0) > (existing.score || 0)) {
          seen.set(normalizedUrl, result);
        }
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Normalize URL for deduplication
   */
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return (
        parsed.hostname.replace(/^www\./, '') +
        parsed.pathname.replace(/\/$/, '')
      );
    } catch {
      return url;
    }
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys()).filter(name =>
      this.providers.get(name)?.isAvailable()
    );
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name, provider] of this.providers) {
      results[name] = provider.isAvailable();
    }

    return results;
  }
}
