/**
 * Embedding Service
 * Provides vector embeddings for semantic search using OpenAI's embedding API
 */

import OpenAI from 'openai';
import { Logger } from 'pino';

// ============================================================================
// TYPES
// ============================================================================

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface BatchEmbeddingResult {
  embeddings: number[][];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface EmbeddingServiceConfig {
  openaiApiKey: string;
  model?: EmbeddingModel;
  dimensions?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export type EmbeddingModel =
  | 'text-embedding-3-small'
  | 'text-embedding-3-large'
  | 'text-embedding-ada-002';

// Model specifications
const MODEL_SPECS: Record<EmbeddingModel, { maxTokens: number; dimensions: number }> = {
  'text-embedding-3-small': { maxTokens: 8191, dimensions: 1536 },
  'text-embedding-3-large': { maxTokens: 8191, dimensions: 3072 },
  'text-embedding-ada-002': { maxTokens: 8191, dimensions: 1536 },
};

// ============================================================================
// EMBEDDING SERVICE
// ============================================================================

export class EmbeddingService {
  private openai: OpenAI;
  private model: EmbeddingModel;
  private dimensions: number;
  private maxRetries: number;
  private retryDelay: number;

  constructor(
    private config: EmbeddingServiceConfig,
    private logger: Logger
  ) {
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    this.model = config.model || 'text-embedding-3-small';
    this.dimensions = config.dimensions || MODEL_SPECS[this.model].dimensions;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
  }

  /**
   * Generate embedding for a single text
   */
  async embed(text: string): Promise<EmbeddingResult> {
    if (!text || text.trim().length === 0) {
      throw new Error('Cannot generate embedding for empty text');
    }

    // Truncate if necessary (rough estimate: 4 chars per token)
    const maxChars = MODEL_SPECS[this.model].maxTokens * 4;
    const truncatedText = text.length > maxChars ? text.slice(0, maxChars) : text;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await this.openai.embeddings.create({
          model: this.model,
          input: truncatedText,
          dimensions: this.model !== 'text-embedding-ada-002' ? this.dimensions : undefined,
        });

        const embedding = response.data[0].embedding;

        this.logger.debug(
          { model: this.model, tokens: response.usage.total_tokens },
          'Generated embedding'
        );

        return {
          embedding,
          model: this.model,
          usage: {
            prompt_tokens: response.usage.prompt_tokens,
            total_tokens: response.usage.total_tokens,
          },
        };
      } catch (error: any) {
        lastError = error;

        // Check if it's a rate limit error
        if (error?.status === 429) {
          const waitTime = this.retryDelay * Math.pow(2, attempt);
          this.logger.warn(
            { attempt, waitTime, error: error.message },
            'Rate limited, retrying...'
          );
          await this.sleep(waitTime);
          continue;
        }

        // For other errors, throw immediately
        throw error;
      }
    }

    throw lastError || new Error('Failed to generate embedding after retries');
  }

  /**
   * Generate embeddings for multiple texts in a batch
   */
  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    if (!texts || texts.length === 0) {
      throw new Error('Cannot generate embeddings for empty array');
    }

    // Filter out empty texts and truncate
    const maxChars = MODEL_SPECS[this.model].maxTokens * 4;
    const processedTexts = texts
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .map((t) => (t.length > maxChars ? t.slice(0, maxChars) : t));

    if (processedTexts.length === 0) {
      throw new Error('All texts are empty');
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await this.openai.embeddings.create({
          model: this.model,
          input: processedTexts,
          dimensions: this.model !== 'text-embedding-ada-002' ? this.dimensions : undefined,
        });

        // Sort by index to maintain order
        const sortedData = response.data.sort((a, b) => a.index - b.index);
        const embeddings = sortedData.map((d) => d.embedding);

        this.logger.debug(
          { model: this.model, count: texts.length, tokens: response.usage.total_tokens },
          'Generated batch embeddings'
        );

        return {
          embeddings,
          model: this.model,
          usage: {
            prompt_tokens: response.usage.prompt_tokens,
            total_tokens: response.usage.total_tokens,
          },
        };
      } catch (error: any) {
        lastError = error;

        if (error?.status === 429) {
          const waitTime = this.retryDelay * Math.pow(2, attempt);
          this.logger.warn(
            { attempt, waitTime, error: error.message },
            'Rate limited on batch, retrying...'
          );
          await this.sleep(waitTime);
          continue;
        }

        throw error;
      }
    }

    throw lastError || new Error('Failed to generate batch embeddings after retries');
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have the same dimensions');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Find top-k most similar embeddings from a collection
   */
  findSimilar(
    query: number[],
    embeddings: number[][],
    topK: number = 5,
    threshold: number = 0
  ): Array<{ index: number; similarity: number }> {
    const similarities = embeddings.map((embedding, index) => ({
      index,
      similarity: this.cosineSimilarity(query, embedding),
    }));

    return similarities
      .filter((s) => s.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Chunk text into smaller pieces for embedding
   */
  chunkText(
    text: string,
    options: {
      chunkSize?: number;
      overlap?: number;
      separator?: string;
    } = {}
  ): string[] {
    const { chunkSize = 512, overlap = 50, separator = '\n\n' } = options;

    // First try to split by paragraphs
    const paragraphs = text.split(separator).filter((p) => p.trim());

    const chunks: string[] = [];
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      // If adding this paragraph would exceed chunk size
      if (currentChunk.length + paragraph.length > chunkSize * 4) {
        // Approximate tokens
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? separator : '') + paragraph;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    // If we only got one chunk but it's too long, split by sentences
    if (chunks.length === 1 && chunks[0].length > chunkSize * 4) {
      const sentences = chunks[0].split(/[.!?]+/).filter((s) => s.trim());
      chunks.length = 0;
      currentChunk = '';

      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > chunkSize * 4) {
          if (currentChunk) {
            chunks.push(currentChunk.trim());
          }
          currentChunk = sentence;
        } else {
          currentChunk += (currentChunk ? '. ' : '') + sentence;
        }
      }

      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
    }

    // Add overlap between chunks
    if (overlap > 0 && chunks.length > 1) {
      const overlappedChunks: string[] = [];

      for (let i = 0; i < chunks.length; i++) {
        let chunk = chunks[i];

        // Add ending of previous chunk
        if (i > 0) {
          const prevChunk = chunks[i - 1];
          const overlapText = prevChunk.slice(-overlap * 4);
          chunk = overlapText + ' ' + chunk;
        }

        overlappedChunks.push(chunk.trim());
      }

      return overlappedChunks;
    }

    return chunks;
  }

  /**
   * Get the configured model
   */
  getModel(): EmbeddingModel {
    return this.model;
  }

  /**
   * Get the configured dimensions
   */
  getDimensions(): number {
    return this.dimensions;
  }

  /**
   * Sleep utility for retries
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createEmbeddingService(
  config: EmbeddingServiceConfig,
  logger: Logger
): EmbeddingService {
  return new EmbeddingService(config, logger);
}

export default EmbeddingService;
