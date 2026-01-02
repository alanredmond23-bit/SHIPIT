import { z } from 'zod';
import { Logger } from 'pino';
import { MCPClient, MCPTool, MCPToolResult } from '../mcp-client';

// Rate limiting
interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

// Web Search Input Schema
const WebSearchInputSchema = z.object({
  query: z.string().min(1).max(500).describe('The search query'),
  maxResults: z.number().min(1).max(20).default(10).describe('Maximum number of results to return'),
  safeSearch: z.enum(['off', 'moderate', 'strict']).default('moderate').describe('Safe search setting'),
  freshness: z.enum(['day', 'week', 'month', 'year', 'all']).default('all').optional().describe('Time range for results'),
  region: z.string().length(2).default('US').optional().describe('Region code (e.g., US, GB, FR)'),
});

type WebSearchInput = z.infer<typeof WebSearchInputSchema>;

// Web Search Result Types
export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  displayUrl: string;
  datePublished?: string;
  thumbnail?: string;
}

export interface WebSearchResponse {
  query: string;
  totalResults: number;
  results: WebSearchResult[];
  relatedSearches?: string[];
  timestamp: string;
}

/**
 * Web Search Tool Implementation
 * Provides web search capabilities with rate limiting and result formatting
 */
export class WebSearchTool {
  private readonly TOOL_NAME = 'web_search';
  private readonly SERVER_ID = 'builtin-tools';
  private rateLimits: Map<string, RateLimitBucket> = new Map();
  private readonly MAX_REQUESTS_PER_MINUTE = 10;
  private readonly TOKEN_REFILL_RATE = this.MAX_REQUESTS_PER_MINUTE / 60; // tokens per second

  constructor(
    private mcpClient: MCPClient,
    private logger: Logger
  ) {
    this.registerTool();
  }

  /**
   * Register the web search tool with the MCP client
   */
  private registerTool(): void {
    const tool: MCPTool = {
      name: this.TOOL_NAME,
      description: 'Search the web for information. Returns a list of search results with titles, URLs, and snippets.',
      inputSchema: WebSearchInputSchema,
      server: this.SERVER_ID,
    };

    try {
      this.mcpClient.registerTool(tool);
      this.logger.info({ toolName: this.TOOL_NAME }, 'Web search tool registered');
    } catch (error: any) {
      this.logger.error({ error: error.message }, 'Failed to register web search tool');
      throw error;
    }
  }

  /**
   * Execute a web search
   */
  async search(input: WebSearchInput, userId?: string): Promise<WebSearchResponse> {
    // Validate input
    const validatedInput = WebSearchInputSchema.parse(input);

    // Rate limiting
    if (userId && !this.checkRateLimit(userId)) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    this.logger.info({ query: validatedInput.query, userId }, 'Executing web search');

    try {
      // In production, this would call an actual search API (e.g., Brave Search, Google Custom Search, etc.)
      const results = await this.performSearch(validatedInput);

      // Format and return results
      const response: WebSearchResponse = {
        query: validatedInput.query,
        totalResults: results.length,
        results: results.slice(0, validatedInput.maxResults),
        relatedSearches: this.generateRelatedSearches(validatedInput.query),
        timestamp: new Date().toISOString(),
      };

      this.logger.info({ query: validatedInput.query, resultCount: response.results.length }, 'Web search completed');

      return response;
    } catch (error: any) {
      this.logger.error({ error: error.message, query: validatedInput.query }, 'Web search failed');
      throw new Error(`Web search failed: ${error.message}`);
    }
  }

  /**
   * Perform the actual search (stub for production API integration)
   */
  private async performSearch(input: WebSearchInput): Promise<WebSearchResult[]> {
    // In production, this would integrate with a real search API
    // For now, return mock results

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

    // Mock search results
    const mockResults: WebSearchResult[] = [
      {
        title: `${input.query} - Overview and Guide`,
        url: `https://example.com/${this.slugify(input.query)}`,
        displayUrl: `example.com › ${this.slugify(input.query)}`,
        snippet: `Comprehensive guide to ${input.query}. Learn everything you need to know about ${input.query} with our detailed documentation and examples.`,
        datePublished: new Date(Date.now() - 86400000 * 2).toISOString(),
        thumbnail: 'https://via.placeholder.com/150',
      },
      {
        title: `Understanding ${input.query}: A Complete Tutorial`,
        url: `https://tutorial-site.com/learn/${this.slugify(input.query)}`,
        displayUrl: `tutorial-site.com › learn › ${this.slugify(input.query)}`,
        snippet: `Step-by-step tutorial on ${input.query}. This tutorial covers the basics and advanced concepts with practical examples.`,
        datePublished: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
      {
        title: `${input.query} - Wikipedia`,
        url: `https://en.wikipedia.org/wiki/${this.slugify(input.query)}`,
        displayUrl: `en.wikipedia.org › wiki › ${this.slugify(input.query)}`,
        snippet: `${input.query} refers to... (From Wikipedia, the free encyclopedia) - Comprehensive information and historical context.`,
        datePublished: new Date(Date.now() - 86400000 * 30).toISOString(),
      },
      {
        title: `Best Practices for ${input.query}`,
        url: `https://bestpractices.dev/${this.slugify(input.query)}`,
        displayUrl: `bestpractices.dev › ${this.slugify(input.query)}`,
        snippet: `Industry best practices and recommendations for ${input.query}. Updated regularly with the latest insights from experts.`,
        datePublished: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        title: `${input.query} Discussion Forum`,
        url: `https://forum.example.com/topic/${this.slugify(input.query)}`,
        displayUrl: `forum.example.com › topic › ${this.slugify(input.query)}`,
        snippet: `Community discussion about ${input.query}. Join the conversation and share your experiences with thousands of users.`,
        datePublished: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
    ];

    // Filter by freshness if specified
    if (input.freshness && input.freshness !== 'all') {
      const cutoffDays = this.getFreshnessCutoff(input.freshness);
      const cutoffDate = new Date(Date.now() - cutoffDays * 86400000);

      return mockResults.filter(result => {
        if (!result.datePublished) return true;
        return new Date(result.datePublished) >= cutoffDate;
      });
    }

    return mockResults;
  }

  /**
   * Generate related search suggestions
   */
  private generateRelatedSearches(query: string): string[] {
    return [
      `${query} tutorial`,
      `${query} examples`,
      `best ${query}`,
      `${query} vs alternatives`,
      `how to use ${query}`,
    ];
  }

  /**
   * Check rate limit for a user
   */
  private checkRateLimit(userId: string): boolean {
    const now = Date.now() / 1000; // seconds
    let bucket = this.rateLimits.get(userId);

    if (!bucket) {
      bucket = {
        tokens: this.MAX_REQUESTS_PER_MINUTE,
        lastRefill: now,
      };
      this.rateLimits.set(userId, bucket);
    }

    // Refill tokens based on time passed
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = timePassed * this.TOKEN_REFILL_RATE;
    bucket.tokens = Math.min(this.MAX_REQUESTS_PER_MINUTE, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Check if we have enough tokens
    if (bucket.tokens < 1) {
      this.logger.warn({ userId }, 'Rate limit exceeded');
      return false;
    }

    // Consume a token
    bucket.tokens -= 1;
    this.rateLimits.set(userId, bucket);

    return true;
  }

  /**
   * Get rate limit status for a user
   */
  getRateLimitStatus(userId: string): { remaining: number; limit: number; resetIn: number } {
    const bucket = this.rateLimits.get(userId);

    if (!bucket) {
      return {
        remaining: this.MAX_REQUESTS_PER_MINUTE,
        limit: this.MAX_REQUESTS_PER_MINUTE,
        resetIn: 60,
      };
    }

    const now = Date.now() / 1000;
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = timePassed * this.TOKEN_REFILL_RATE;
    const currentTokens = Math.min(this.MAX_REQUESTS_PER_MINUTE, bucket.tokens + tokensToAdd);

    return {
      remaining: Math.floor(currentTokens),
      limit: this.MAX_REQUESTS_PER_MINUTE,
      resetIn: Math.ceil((this.MAX_REQUESTS_PER_MINUTE - currentTokens) / this.TOKEN_REFILL_RATE),
    };
  }

  /**
   * Clear rate limit for a user (admin function)
   */
  clearRateLimit(userId: string): void {
    this.rateLimits.delete(userId);
    this.logger.info({ userId }, 'Rate limit cleared');
  }

  /**
   * Parse and format search results for LLM consumption
   */
  formatResultsForLLM(response: WebSearchResponse): string {
    let formatted = `Search Results for: "${response.query}"\n`;
    formatted += `Total Results: ${response.totalResults}\n`;
    formatted += `Timestamp: ${response.timestamp}\n\n`;

    response.results.forEach((result, index) => {
      formatted += `[${index + 1}] ${result.title}\n`;
      formatted += `URL: ${result.url}\n`;
      formatted += `${result.snippet}\n`;
      if (result.datePublished) {
        formatted += `Published: ${new Date(result.datePublished).toLocaleDateString()}\n`;
      }
      formatted += `\n`;
    });

    if (response.relatedSearches && response.relatedSearches.length > 0) {
      formatted += `\nRelated Searches:\n`;
      response.relatedSearches.forEach(search => {
        formatted += `- ${search}\n`;
      });
    }

    return formatted;
  }

  // Helper methods

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private getFreshnessCutoff(freshness: string): number {
    switch (freshness) {
      case 'day': return 1;
      case 'week': return 7;
      case 'month': return 30;
      case 'year': return 365;
      default: return 365 * 10; // 10 years
    }
  }

  /**
   * Clean up old rate limit buckets (call periodically)
   */
  cleanupRateLimits(): void {
    const now = Date.now() / 1000;
    const staleThreshold = 3600; // 1 hour

    for (const [userId, bucket] of this.rateLimits.entries()) {
      if (now - bucket.lastRefill > staleThreshold) {
        this.rateLimits.delete(userId);
      }
    }

    this.logger.debug({ remainingBuckets: this.rateLimits.size }, 'Cleaned up stale rate limit buckets');
  }
}

/**
 * Factory function to create and initialize the web search tool
 */
export function createWebSearchTool(mcpClient: MCPClient, logger: Logger): WebSearchTool {
  const tool = new WebSearchTool(mcpClient, logger);

  // Set up periodic cleanup of rate limits (every 10 minutes)
  setInterval(() => {
    tool.cleanupRateLimits();
  }, 600000);

  return tool;
}
