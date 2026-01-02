import { Logger } from 'pino';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import pdfParse from 'pdf-parse';

export interface ExtractedContent {
  url: string;
  title: string;
  content: string;
  author?: string;
  publishDate?: Date;
  excerpt: string;
  wordCount: number;
  images?: string[];
  links?: string[];
  metadata: {
    language?: string;
    description?: string;
    keywords?: string[];
  };
  quality: {
    score: number; // 0-1
    issues: string[];
  };
}

export class ContentExtractor {
  constructor(private logger: Logger) {}

  async extract(url: string): Promise<ExtractedContent | null> {
    try {
      this.logger.info({ url }, 'Extracting content');

      // Check if PDF
      if (url.toLowerCase().endsWith('.pdf') || url.includes('.pdf?')) {
        return await this.extractPdf(url);
      }

      // Extract HTML content
      return await this.extractHtml(url);
    } catch (error: any) {
      this.logger.error({ url, error: error.message }, 'Content extraction failed');
      return null;
    }
  }

  private async extractHtml(url: string): Promise<ExtractedContent | null> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LibreChat-Research/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 30000,
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, iframe, noscript').remove();
    $('.advertisement, .ad, .social-share, .comments').remove();

    // Extract metadata
    const title = this.extractTitle($);
    const author = this.extractAuthor($);
    const publishDate = this.extractPublishDate($);
    const metadata = this.extractMetadata($);

    // Extract main content using multiple strategies
    const content = this.extractMainContent($);

    // Extract additional elements
    const images = this.extractImages($, url);
    const links = this.extractLinks($, url);

    // Calculate quality score
    const quality = this.assessQuality(content, html);

    // Generate excerpt
    const excerpt = this.generateExcerpt(content);

    // Count words
    const wordCount = this.countWords(content);

    return {
      url,
      title,
      content,
      author,
      publishDate,
      excerpt,
      wordCount,
      images,
      links,
      metadata,
      quality,
    };
  }

  private async extractPdf(url: string): Promise<ExtractedContent | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LibreChat-Research/1.0)',
        },
        timeout: 60000,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const buffer = await response.buffer();
      const data = await pdfParse(buffer);

      const content = data.text;
      const title = this.extractPdfTitle(content) || 'PDF Document';
      const wordCount = this.countWords(content);
      const excerpt = this.generateExcerpt(content);

      return {
        url,
        title,
        content,
        excerpt,
        wordCount,
        metadata: {
          description: excerpt,
        },
        quality: {
          score: 0.7, // PDFs generally have good content quality
          issues: [],
        },
      };
    } catch (error: any) {
      this.logger.error({ url, error: error.message }, 'PDF extraction failed');
      return null;
    }
  }

  private extractTitle($: cheerio.CheerioAPI): string {
    // Try multiple strategies
    const strategies = [
      () => $('meta[property="og:title"]').attr('content'),
      () => $('meta[name="twitter:title"]').attr('content'),
      () => $('h1').first().text(),
      () => $('title').text(),
      () => $('meta[name="title"]').attr('content'),
    ];

    for (const strategy of strategies) {
      const title = strategy();
      if (title && title.trim().length > 0) {
        return title.trim();
      }
    }

    return 'Untitled';
  }

  private extractAuthor($: cheerio.CheerioAPI): string | undefined {
    const strategies = [
      () => $('meta[name="author"]').attr('content'),
      () => $('meta[property="article:author"]').attr('content'),
      () => $('[rel="author"]').first().text(),
      () => $('.author').first().text(),
      () => $('.byline').first().text(),
    ];

    for (const strategy of strategies) {
      const author = strategy();
      if (author && author.trim().length > 0) {
        return author.trim();
      }
    }

    return undefined;
  }

  private extractPublishDate($: cheerio.CheerioAPI): Date | undefined {
    const strategies = [
      () => $('meta[property="article:published_time"]').attr('content'),
      () => $('meta[name="publish-date"]').attr('content'),
      () => $('meta[name="date"]').attr('content'),
      () => $('time[datetime]').attr('datetime'),
      () => $('.published-date').first().text(),
      () => $('.publish-date').first().text(),
    ];

    for (const strategy of strategies) {
      const dateStr = strategy();
      if (dateStr) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    return undefined;
  }

  private extractMetadata($: cheerio.CheerioAPI): ExtractedContent['metadata'] {
    return {
      language: $('html').attr('lang') || $('meta[http-equiv="content-language"]').attr('content'),
      description: $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content'),
      keywords: $('meta[name="keywords"]').attr('content')?.split(',').map(k => k.trim()),
    };
  }

  private extractMainContent($: cheerio.CheerioAPI): string {
    // Try to find main content using common patterns
    const contentSelectors = [
      'article',
      '[role="main"]',
      'main',
      '.article-content',
      '.post-content',
      '.entry-content',
      '.content',
      '#content',
      '.main-content',
    ];

    let content = '';

    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        content = element.text();
        if (content.length > 500) {
          break;
        }
      }
    }

    // Fallback: use body if nothing found
    if (content.length < 500) {
      content = $('body').text();
    }

    // Clean up whitespace
    content = content.replace(/\s+/g, ' ').trim();

    return content;
  }

  private extractImages($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const images: string[] = [];

    $('img').each((_, el) => {
      const src = $(el).attr('src');
      if (src) {
        try {
          const absoluteUrl = new URL(src, baseUrl).toString();
          images.push(absoluteUrl);
        } catch {
          // Invalid URL, skip
        }
      }
    });

    return images.slice(0, 10); // Limit to 10 images
  }

  private extractLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const links: string[] = [];
    const seen = new Set<string>();

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        try {
          const absoluteUrl = new URL(href, baseUrl).toString();
          if (!seen.has(absoluteUrl)) {
            seen.add(absoluteUrl);
            links.push(absoluteUrl);
          }
        } catch {
          // Invalid URL, skip
        }
      }
    });

    return links.slice(0, 50); // Limit to 50 links
  }

  private assessQuality(content: string, html: string): ExtractedContent['quality'] {
    const issues: string[] = [];
    let score = 1.0;

    // Check content length
    const wordCount = this.countWords(content);
    if (wordCount < 100) {
      issues.push('Very short content');
      score -= 0.3;
    } else if (wordCount < 300) {
      issues.push('Short content');
      score -= 0.1;
    }

    // Check for excessive ads/scripts
    const scriptCount = (html.match(/<script/g) || []).length;
    if (scriptCount > 20) {
      issues.push('High script count (possible ad-heavy page)');
      score -= 0.2;
    }

    // Check for paywalls
    const paywallIndicators = [
      'paywall',
      'subscribe to continue',
      'premium content',
      'members only',
      'register to read',
    ];

    const lowerContent = content.toLowerCase();
    for (const indicator of paywallIndicators) {
      if (lowerContent.includes(indicator)) {
        issues.push('Possible paywall detected');
        score -= 0.3;
        break;
      }
    }

    // Check content-to-html ratio
    const contentLength = content.length;
    const htmlLength = html.length;
    const ratio = contentLength / htmlLength;

    if (ratio < 0.1) {
      issues.push('Low content-to-HTML ratio');
      score -= 0.2;
    }

    // Check for common error pages
    const errorIndicators = ['404', 'page not found', 'error occurred', 'access denied'];
    for (const indicator of errorIndicators) {
      if (lowerContent.includes(indicator) && wordCount < 500) {
        issues.push('Possible error page');
        score -= 0.5;
        break;
      }
    }

    return {
      score: Math.max(0, Math.min(1, score)),
      issues,
    };
  }

  private generateExcerpt(content: string, maxLength: number = 300): string {
    const cleaned = content.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= maxLength) {
      return cleaned;
    }

    // Try to cut at sentence boundary
    const truncated = cleaned.substring(0, maxLength);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastQuestion = truncated.lastIndexOf('?');
    const lastExclamation = truncated.lastIndexOf('!');

    const lastSentenceEnd = Math.max(lastPeriod, lastQuestion, lastExclamation);

    if (lastSentenceEnd > maxLength * 0.7) {
      return truncated.substring(0, lastSentenceEnd + 1);
    }

    // Fallback: cut at last space
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 0) {
      return truncated.substring(0, lastSpace) + '...';
    }

    return truncated + '...';
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private extractPdfTitle(content: string): string | null {
    // Try to extract title from first lines
    const lines = content.split('\n').filter(line => line.trim().length > 0);

    for (const line of lines.slice(0, 5)) {
      const trimmed = line.trim();
      if (trimmed.length > 10 && trimmed.length < 200) {
        return trimmed;
      }
    }

    return null;
  }

  // Batch extract multiple URLs with concurrency control
  async extractBatch(urls: string[], concurrency: number = 5): Promise<Map<string, ExtractedContent | null>> {
    const results = new Map<string, ExtractedContent | null>();
    const queue = [...urls];

    const processUrl = async () => {
      while (queue.length > 0) {
        const url = queue.shift();
        if (url) {
          const content = await this.extract(url);
          results.set(url, content);
        }
      }
    };

    // Create worker pool
    const workers = Array(concurrency).fill(null).map(() => processUrl());
    await Promise.all(workers);

    return results;
  }

  // Check if URL is likely to be extractable
  async checkAccessibility(url: string): Promise<{
    accessible: boolean;
    status?: number;
    contentType?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LibreChat-Research/1.0)',
        },
        timeout: 10000,
      });

      return {
        accessible: response.ok,
        status: response.status,
        contentType: response.headers.get('content-type') || undefined,
      };
    } catch (error: any) {
      return {
        accessible: false,
        error: error.message,
      };
    }
  }
}

// Cheerio needs to be imported but might not be available
// This is a type-safe wrapper
let cheerio: any;
try {
  cheerio = require('cheerio');
} catch {
  // Cheerio not available, we'll need to add it to package.json
  console.warn('cheerio not installed - content extraction will be limited');
}
