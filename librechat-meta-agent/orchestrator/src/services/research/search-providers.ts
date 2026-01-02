import { Logger } from 'pino';
import fetch from 'node-fetch';

// Common search result interface
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  author?: string;
  publishDate?: Date;
  sourceType: 'web' | 'academic' | 'news' | 'forum' | 'wikipedia' | 'reddit' | 'stackoverflow' | 'arxiv';
  provider: string;
}

export interface SearchProviderConfig {
  apiKey?: string;
  maxResults?: number;
  timeout?: number;
}

// Base search provider interface
export interface SearchProvider {
  name: string;
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  isAvailable(): boolean;
}

export interface SearchOptions {
  maxResults?: number;
  dateRange?: { start: Date; end: Date };
  domains?: string[];
  language?: string;
}

// Rate limiter utility
class RateLimiter {
  private queue: Array<() => void> = [];
  private activeRequests = 0;
  private lastRequestTime = 0;

  constructor(
    private maxRequestsPerSecond: number,
    private maxConcurrent: number = 5
  ) {}

  async throttle<T>(fn: () => Promise<T>): Promise<T> {
    while (this.activeRequests >= this.maxConcurrent) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minDelay = 1000 / this.maxRequestsPerSecond;

    if (timeSinceLastRequest < minDelay) {
      await new Promise(resolve => setTimeout(resolve, minDelay - timeSinceLastRequest));
    }

    this.activeRequests++;
    this.lastRequestTime = Date.now();

    try {
      return await fn();
    } finally {
      this.activeRequests--;
    }
  }
}

// Google Custom Search API Provider
export class GoogleSearchProvider implements SearchProvider {
  name = 'google';
  private rateLimiter = new RateLimiter(10, 5);

  constructor(
    private apiKey: string,
    private searchEngineId: string,
    private logger: Logger
  ) {}

  isAvailable(): boolean {
    return !!this.apiKey && !!this.searchEngineId;
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!this.isAvailable()) {
      this.logger.warn('Google Search API not configured');
      return [];
    }

    return this.rateLimiter.throttle(async () => {
      try {
        const maxResults = options.maxResults || 10;
        const url = new URL('https://www.googleapis.com/customsearch/v1');
        url.searchParams.set('key', this.apiKey);
        url.searchParams.set('cx', this.searchEngineId);
        url.searchParams.set('q', query);
        url.searchParams.set('num', Math.min(maxResults, 10).toString());

        if (options.dateRange) {
          const sort = `date:r:${this.formatDate(options.dateRange.start)}:${this.formatDate(options.dateRange.end)}`;
          url.searchParams.set('sort', sort);
        }

        if (options.domains && options.domains.length > 0) {
          const siteQuery = options.domains.map(d => `site:${d}`).join(' OR ');
          url.searchParams.set('q', `${query} (${siteQuery})`);
        }

        const response = await fetch(url.toString(), {
          timeout: 30000,
        });

        if (!response.ok) {
          throw new Error(`Google Search API error: ${response.statusText}`);
        }

        const data = await response.json() as any;

        return (data.items || []).map((item: any) => ({
          title: item.title,
          url: item.link,
          snippet: item.snippet,
          sourceType: this.detectSourceType(item.link),
          provider: this.name,
        }));
      } catch (error: any) {
        this.logger.error({ error: error.message }, 'Google search failed');
        return [];
      }
    });
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0].replace(/-/g, '');
  }

  private detectSourceType(url: string): SearchResult['sourceType'] {
    if (url.includes('wikipedia.org')) return 'wikipedia';
    if (url.includes('reddit.com')) return 'reddit';
    if (url.includes('stackoverflow.com')) return 'stackoverflow';
    if (url.includes('arxiv.org')) return 'arxiv';
    return 'web';
  }
}

// Bing Search API Provider
export class BingSearchProvider implements SearchProvider {
  name = 'bing';
  private rateLimiter = new RateLimiter(3, 3);

  constructor(
    private apiKey: string,
    private logger: Logger
  ) {}

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!this.isAvailable()) {
      this.logger.warn('Bing Search API not configured');
      return [];
    }

    return this.rateLimiter.throttle(async () => {
      try {
        const maxResults = options.maxResults || 10;
        const url = new URL('https://api.bing.microsoft.com/v7.0/search');
        url.searchParams.set('q', query);
        url.searchParams.set('count', maxResults.toString());

        const response = await fetch(url.toString(), {
          headers: {
            'Ocp-Apim-Subscription-Key': this.apiKey,
          },
          timeout: 30000,
        });

        if (!response.ok) {
          throw new Error(`Bing Search API error: ${response.statusText}`);
        }

        const data = await response.json() as any;

        return (data.webPages?.value || []).map((item: any) => ({
          title: item.name,
          url: item.url,
          snippet: item.snippet,
          publishDate: item.datePublished ? new Date(item.datePublished) : undefined,
          sourceType: this.detectSourceType(item.url),
          provider: this.name,
        }));
      } catch (error: any) {
        this.logger.error({ error: error.message }, 'Bing search failed');
        return [];
      }
    });
  }

  private detectSourceType(url: string): SearchResult['sourceType'] {
    if (url.includes('wikipedia.org')) return 'wikipedia';
    if (url.includes('reddit.com')) return 'reddit';
    if (url.includes('stackoverflow.com')) return 'stackoverflow';
    if (url.includes('arxiv.org')) return 'arxiv';
    return 'web';
  }
}

// Google Scholar Provider (via SerpAPI or similar)
export class GoogleScholarProvider implements SearchProvider {
  name = 'google-scholar';
  private rateLimiter = new RateLimiter(1, 1);

  constructor(
    private serpApiKey: string,
    private logger: Logger
  ) {}

  isAvailable(): boolean {
    return !!this.serpApiKey;
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!this.isAvailable()) {
      this.logger.warn('Google Scholar search not configured');
      return [];
    }

    return this.rateLimiter.throttle(async () => {
      try {
        const url = new URL('https://serpapi.com/search');
        url.searchParams.set('engine', 'google_scholar');
        url.searchParams.set('q', query);
        url.searchParams.set('api_key', this.serpApiKey);
        url.searchParams.set('num', (options.maxResults || 10).toString());

        const response = await fetch(url.toString(), { timeout: 30000 });

        if (!response.ok) {
          throw new Error(`Scholar search error: ${response.statusText}`);
        }

        const data = await response.json() as any;

        return (data.organic_results || []).map((item: any) => ({
          title: item.title,
          url: item.link,
          snippet: item.snippet || item.publication_info?.summary || '',
          author: item.publication_info?.authors?.[0]?.name,
          publishDate: item.publication_info?.summary ? this.extractYear(item.publication_info.summary) : undefined,
          sourceType: 'academic' as const,
          provider: this.name,
        }));
      } catch (error: any) {
        this.logger.error({ error: error.message }, 'Scholar search failed');
        return [];
      }
    });
  }

  private extractYear(summary: string): Date | undefined {
    const match = summary.match(/\b(19|20)\d{2}\b/);
    if (match) {
      return new Date(parseInt(match[0]), 0, 1);
    }
    return undefined;
  }
}

// arXiv API Provider
export class ArxivProvider implements SearchProvider {
  name = 'arxiv';
  private rateLimiter = new RateLimiter(1, 1);

  constructor(private logger: Logger) {}

  isAvailable(): boolean {
    return true; // arXiv API is free and public
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    return this.rateLimiter.throttle(async () => {
      try {
        const maxResults = options.maxResults || 10;
        const url = new URL('http://export.arxiv.org/api/query');
        url.searchParams.set('search_query', `all:${query}`);
        url.searchParams.set('start', '0');
        url.searchParams.set('max_results', maxResults.toString());

        const response = await fetch(url.toString(), { timeout: 30000 });

        if (!response.ok) {
          throw new Error(`arXiv API error: ${response.statusText}`);
        }

        const xml = await response.text();
        return this.parseArxivXML(xml);
      } catch (error: any) {
        this.logger.error({ error: error.message }, 'arXiv search failed');
        return [];
      }
    });
  }

  private parseArxivXML(xml: string): SearchResult[] {
    const results: SearchResult[] = [];

    // Simple regex-based XML parsing (in production, use proper XML parser)
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;

    while ((match = entryRegex.exec(xml)) !== null) {
      const entry = match[1];

      const titleMatch = /<title>(.*?)<\/title>/.exec(entry);
      const summaryMatch = /<summary>(.*?)<\/summary>/.exec(entry);
      const linkMatch = /<id>(.*?)<\/id>/.exec(entry);
      const publishedMatch = /<published>(.*?)<\/published>/.exec(entry);
      const authorMatch = /<name>(.*?)<\/name>/.exec(entry);

      if (titleMatch && linkMatch) {
        results.push({
          title: titleMatch[1].trim().replace(/\s+/g, ' '),
          url: linkMatch[1].trim(),
          snippet: summaryMatch ? summaryMatch[1].trim().replace(/\s+/g, ' ').substring(0, 200) : '',
          author: authorMatch ? authorMatch[1].trim() : undefined,
          publishDate: publishedMatch ? new Date(publishedMatch[1]) : undefined,
          sourceType: 'arxiv',
          provider: this.name,
        });
      }
    }

    return results;
  }
}

// Wikipedia API Provider
export class WikipediaProvider implements SearchProvider {
  name = 'wikipedia';
  private rateLimiter = new RateLimiter(5, 3);

  constructor(private logger: Logger) {}

  isAvailable(): boolean {
    return true; // Wikipedia API is free
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    return this.rateLimiter.throttle(async () => {
      try {
        const maxResults = options.maxResults || 10;
        const url = new URL('https://en.wikipedia.org/w/api.php');
        url.searchParams.set('action', 'query');
        url.searchParams.set('format', 'json');
        url.searchParams.set('list', 'search');
        url.searchParams.set('srsearch', query);
        url.searchParams.set('srlimit', maxResults.toString());

        const response = await fetch(url.toString(), { timeout: 30000 });

        if (!response.ok) {
          throw new Error(`Wikipedia API error: ${response.statusText}`);
        }

        const data = await response.json() as any;

        return (data.query?.search || []).map((item: any) => ({
          title: item.title,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
          snippet: this.stripHtml(item.snippet),
          sourceType: 'wikipedia' as const,
          provider: this.name,
        }));
      } catch (error: any) {
        this.logger.error({ error: error.message }, 'Wikipedia search failed');
        return [];
      }
    });
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  }
}

// Reddit API Provider
export class RedditProvider implements SearchProvider {
  name = 'reddit';
  private rateLimiter = new RateLimiter(2, 2);

  constructor(private logger: Logger) {}

  isAvailable(): boolean {
    return true; // Using public Reddit JSON API
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    return this.rateLimiter.throttle(async () => {
      try {
        const maxResults = options.maxResults || 10;
        const url = new URL('https://www.reddit.com/search.json');
        url.searchParams.set('q', query);
        url.searchParams.set('limit', maxResults.toString());
        url.searchParams.set('sort', 'relevance');

        const response = await fetch(url.toString(), {
          headers: {
            'User-Agent': 'LibreChat-Research/1.0',
          },
          timeout: 30000,
        });

        if (!response.ok) {
          throw new Error(`Reddit API error: ${response.statusText}`);
        }

        const data = await response.json() as any;

        return (data.data?.children || []).map((item: any) => ({
          title: item.data.title,
          url: `https://www.reddit.com${item.data.permalink}`,
          snippet: item.data.selftext?.substring(0, 200) || item.data.title,
          author: item.data.author,
          publishDate: new Date(item.data.created_utc * 1000),
          sourceType: 'reddit' as const,
          provider: this.name,
        }));
      } catch (error: any) {
        this.logger.error({ error: error.message }, 'Reddit search failed');
        return [];
      }
    });
  }
}

// Stack Overflow Provider
export class StackOverflowProvider implements SearchProvider {
  name = 'stackoverflow';
  private rateLimiter = new RateLimiter(5, 3);

  constructor(private logger: Logger) {}

  isAvailable(): boolean {
    return true; // Stack Exchange API is free
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    return this.rateLimiter.throttle(async () => {
      try {
        const maxResults = options.maxResults || 10;
        const url = new URL('https://api.stackexchange.com/2.3/search/advanced');
        url.searchParams.set('order', 'desc');
        url.searchParams.set('sort', 'relevance');
        url.searchParams.set('q', query);
        url.searchParams.set('site', 'stackoverflow');
        url.searchParams.set('pagesize', maxResults.toString());

        const response = await fetch(url.toString(), { timeout: 30000 });

        if (!response.ok) {
          throw new Error(`StackOverflow API error: ${response.statusText}`);
        }

        const data = await response.json() as any;

        return (data.items || []).map((item: any) => ({
          title: item.title,
          url: item.link,
          snippet: this.stripHtml(item.body_markdown || item.title).substring(0, 200),
          author: item.owner?.display_name,
          publishDate: new Date(item.creation_date * 1000),
          sourceType: 'stackoverflow' as const,
          provider: this.name,
        }));
      } catch (error: any) {
        this.logger.error({ error: error.message }, 'StackOverflow search failed');
        return [];
      }
    });
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  }
}

// News API Provider
export class NewsApiProvider implements SearchProvider {
  name = 'newsapi';
  private rateLimiter = new RateLimiter(1, 1);

  constructor(
    private apiKey: string,
    private logger: Logger
  ) {}

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!this.isAvailable()) {
      this.logger.warn('NewsAPI not configured');
      return [];
    }

    return this.rateLimiter.throttle(async () => {
      try {
        const maxResults = options.maxResults || 10;
        const url = new URL('https://newsapi.org/v2/everything');
        url.searchParams.set('q', query);
        url.searchParams.set('pageSize', maxResults.toString());
        url.searchParams.set('sortBy', 'relevancy');
        url.searchParams.set('apiKey', this.apiKey);

        if (options.dateRange) {
          url.searchParams.set('from', options.dateRange.start.toISOString().split('T')[0]);
          url.searchParams.set('to', options.dateRange.end.toISOString().split('T')[0]);
        }

        const response = await fetch(url.toString(), { timeout: 30000 });

        if (!response.ok) {
          throw new Error(`NewsAPI error: ${response.statusText}`);
        }

        const data = await response.json() as any;

        return (data.articles || []).map((item: any) => ({
          title: item.title,
          url: item.url,
          snippet: item.description || item.content?.substring(0, 200) || '',
          author: item.author,
          publishDate: item.publishedAt ? new Date(item.publishedAt) : undefined,
          sourceType: 'news' as const,
          provider: this.name,
        }));
      } catch (error: any) {
        this.logger.error({ error: error.message }, 'NewsAPI search failed');
        return [];
      }
    });
  }
}

// Orchestrator for all search providers
export class SearchOrchestrator {
  private providers: SearchProvider[] = [];

  constructor(
    private logger: Logger,
    config: {
      googleApiKey?: string;
      googleSearchEngineId?: string;
      bingApiKey?: string;
      serpApiKey?: string;
      newsApiKey?: string;
    }
  ) {
    // Initialize available providers
    if (config.googleApiKey && config.googleSearchEngineId) {
      this.providers.push(new GoogleSearchProvider(config.googleApiKey, config.googleSearchEngineId, logger));
    }

    if (config.bingApiKey) {
      this.providers.push(new BingSearchProvider(config.bingApiKey, logger));
    }

    if (config.serpApiKey) {
      this.providers.push(new GoogleScholarProvider(config.serpApiKey, logger));
    }

    if (config.newsApiKey) {
      this.providers.push(new NewsApiProvider(config.newsApiKey, logger));
    }

    // Always add free providers
    this.providers.push(new WikipediaProvider(logger));
    this.providers.push(new ArxivProvider(logger));
    this.providers.push(new RedditProvider(logger));
    this.providers.push(new StackOverflowProvider(logger));

    logger.info({ providers: this.providers.map(p => p.name) }, 'Search providers initialized');
  }

  // Search across multiple providers in parallel
  async searchAll(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const promises = this.providers
      .filter(p => p.isAvailable())
      .map(provider =>
        provider.search(query, options).catch(error => {
          this.logger.error({ provider: provider.name, error: error.message }, 'Provider search failed');
          return [];
        })
      );

    const results = await Promise.all(promises);
    const allResults = results.flat();

    // Deduplicate by URL
    const uniqueResults = this.deduplicateByUrl(allResults);

    this.logger.info({
      total: uniqueResults.length,
      byProvider: this.countByProvider(uniqueResults)
    }, 'Search completed');

    return uniqueResults;
  }

  // Search specific providers
  async searchProviders(providerNames: string[], query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const selectedProviders = this.providers.filter(p =>
      providerNames.includes(p.name) && p.isAvailable()
    );

    const promises = selectedProviders.map(provider =>
      provider.search(query, options).catch(error => {
        this.logger.error({ provider: provider.name, error: error.message }, 'Provider search failed');
        return [];
      })
    );

    const results = await Promise.all(promises);
    return this.deduplicateByUrl(results.flat());
  }

  private deduplicateByUrl(results: SearchResult[]): SearchResult[] {
    const seen = new Map<string, SearchResult>();

    for (const result of results) {
      const normalizedUrl = this.normalizeUrl(result.url);
      if (!seen.has(normalizedUrl)) {
        seen.set(normalizedUrl, result);
      }
    }

    return Array.from(seen.values());
  }

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove trailing slashes, www, and query params for deduplication
      return parsed.hostname.replace(/^www\./, '') + parsed.pathname.replace(/\/$/, '');
    } catch {
      return url;
    }
  }

  private countByProvider(results: SearchResult[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const result of results) {
      counts[result.provider] = (counts[result.provider] || 0) + 1;
    }
    return counts;
  }

  getAvailableProviders(): string[] {
    return this.providers.filter(p => p.isAvailable()).map(p => p.name);
  }
}
