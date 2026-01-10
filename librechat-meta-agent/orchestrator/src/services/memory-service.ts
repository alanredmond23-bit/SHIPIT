import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from 'pino';
import Anthropic from '@anthropic-ai/sdk';
import { EmbeddingService, createEmbeddingService } from './embedding-service';

export interface Memory {
  id: string;
  user_id: string | null;
  project_id: string;
  fact_type: string;
  content: string;
  summary: string | null;
  embedding: number[] | null;
  category: string;
  enabled: boolean;
  importance_score: number;
  source_task_id: string | null;
  created_at: Date;
  last_accessed_at: Date | null;
  expires_at: Date | null;
}

export interface CreateMemoryInput {
  user_id?: string;
  project_id: string;
  content: string;
  category?: 'preference' | 'fact' | 'instruction' | 'context';
  importance_score?: number;
  fact_type?: string;
  source_task_id?: string;
  expires_at?: Date;
}

export interface SearchMemoryInput {
  user_id?: string;
  project_id?: string;
  query: string;
  category?: string;
  limit?: number;
  min_similarity?: number;
}

export interface ExtractMemoriesInput {
  user_id?: string;
  project_id: string;
  conversation: Array<{ role: string; content: string }>;
  auto_save?: boolean;
}

export class MemoryService {
  private anthropic: Anthropic;
  private embeddingService: EmbeddingService | null = null;

  constructor(
    private db: Pool,
    private logger: Logger,
    anthropicApiKey: string,
    openaiApiKey?: string
  ) {
    this.anthropic = new Anthropic({ apiKey: anthropicApiKey });

    // Initialize embedding service if OpenAI key is provided
    if (openaiApiKey) {
      this.embeddingService = createEmbeddingService(
        {
          openaiApiKey,
          model: 'text-embedding-3-small',
          dimensions: 1536,
        },
        logger
      );
      this.logger.info('Initialized OpenAI embedding service for semantic search');
    } else {
      this.logger.warn('No OpenAI API key provided - using fallback hash-based embeddings');
    }
  }

  /**
   * Create a new memory with embedding
   */
  async createMemory(input: CreateMemoryInput): Promise<Memory> {
    const id = uuidv4();
    const category = input.category || 'fact';
    const fact_type = input.fact_type || category;
    const importance_score = input.importance_score ?? 0.5;

    // Generate embedding for the content
    const embedding = await this.generateEmbedding(input.content);

    // Generate a concise summary
    const summary = await this.generateSummary(input.content);

    const { rows } = await this.db.query(
      `INSERT INTO meta_memory_facts
       (id, user_id, project_id, fact_type, content, summary, embedding, category,
        enabled, importance_score, source_task_id, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        id,
        input.user_id || null,
        input.project_id,
        fact_type,
        input.content,
        summary,
        JSON.stringify(embedding),
        category,
        true,
        importance_score,
        input.source_task_id || null,
        input.expires_at || null,
      ]
    );

    this.logger.info({ memory_id: id, category }, 'Memory created');
    return rows[0];
  }

  /**
   * List all memories for a user/project
   */
  async listMemories(filters: {
    user_id?: string;
    project_id?: string;
    category?: string;
    enabled?: boolean;
    limit?: number;
  } = {}): Promise<Memory[]> {
    let query = `
      SELECT * FROM meta_memory_facts
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.user_id !== undefined) {
      params.push(filters.user_id);
      query += ` AND user_id = $${params.length}`;
    }

    if (filters.project_id) {
      params.push(filters.project_id);
      query += ` AND project_id = $${params.length}`;
    }

    if (filters.category) {
      params.push(filters.category);
      query += ` AND category = $${params.length}`;
    }

    if (filters.enabled !== undefined) {
      params.push(filters.enabled);
      query += ` AND enabled = $${params.length}`;
    }

    query += ` AND (expires_at IS NULL OR expires_at > NOW())`;
    query += ` ORDER BY importance_score DESC, created_at DESC`;

    if (filters.limit) {
      params.push(filters.limit);
      query += ` LIMIT $${params.length}`;
    }

    const { rows } = await this.db.query(query, params);
    return rows;
  }

  /**
   * Get a single memory by ID
   */
  async getMemory(id: string): Promise<Memory | null> {
    const { rows } = await this.db.query(
      'SELECT * FROM meta_memory_facts WHERE id = $1',
      [id]
    );

    if (rows[0]) {
      // Update last_accessed_at
      await this.db.query(
        'UPDATE meta_memory_facts SET last_accessed_at = NOW() WHERE id = $1',
        [id]
      );
    }

    return rows[0] || null;
  }

  /**
   * Update a memory
   */
  async updateMemory(
    id: string,
    updates: {
      content?: string;
      category?: string;
      enabled?: boolean;
      importance_score?: number;
    }
  ): Promise<Memory> {
    const fields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.content !== undefined) {
      // If content changes, regenerate embedding and summary
      const embedding = await this.generateEmbedding(updates.content);
      const summary = await this.generateSummary(updates.content);

      params.push(updates.content);
      fields.push(`content = $${paramIndex++}`);

      params.push(summary);
      fields.push(`summary = $${paramIndex++}`);

      params.push(JSON.stringify(embedding));
      fields.push(`embedding = $${paramIndex++}`);
    }

    if (updates.category !== undefined) {
      params.push(updates.category);
      fields.push(`category = $${paramIndex++}`);
    }

    if (updates.enabled !== undefined) {
      params.push(updates.enabled);
      fields.push(`enabled = $${paramIndex++}`);
    }

    if (updates.importance_score !== undefined) {
      params.push(updates.importance_score);
      fields.push(`importance_score = $${paramIndex++}`);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    params.push(id);
    const query = `
      UPDATE meta_memory_facts
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const { rows } = await this.db.query(query, params);
    if (!rows[0]) {
      throw new Error(`Memory ${id} not found`);
    }

    this.logger.info({ memory_id: id }, 'Memory updated');
    return rows[0];
  }

  /**
   * Delete a memory
   */
  async deleteMemory(id: string): Promise<void> {
    const result = await this.db.query(
      'DELETE FROM meta_memory_facts WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      throw new Error(`Memory ${id} not found`);
    }

    this.logger.info({ memory_id: id }, 'Memory deleted');
  }

  /**
   * Semantic search for memories
   */
  async searchMemories(input: SearchMemoryInput): Promise<
    Array<Memory & { similarity: number }>
  > {
    const limit = input.limit || 10;
    const min_similarity = input.min_similarity || 0.7;

    // Generate embedding for the query
    const queryEmbedding = await this.generateEmbedding(input.query);

    let query: string;
    let params: any[];

    if (input.user_id) {
      // Use the database function for user-specific search
      query = `
        SELECT m.*, s.similarity
        FROM search_user_memories($1, $2, $3, $4, $5) s
        JOIN meta_memory_facts m ON m.id = s.id
      `;
      params = [
        input.user_id,
        JSON.stringify(queryEmbedding),
        limit,
        input.category || null,
        min_similarity,
      ];
    } else {
      // Project-wide search
      query = `
        SELECT *,
               1 - (embedding <=> $1::vector) as similarity
        FROM meta_memory_facts
        WHERE enabled = true
          AND (expires_at IS NULL OR expires_at > NOW())
          ${input.project_id ? 'AND project_id = $2' : ''}
          ${input.category ? 'AND category = $' + (input.project_id ? '3' : '2') : ''}
          AND 1 - (embedding <=> $1::vector) >= ${min_similarity}
        ORDER BY embedding <=> $1::vector
        LIMIT ${limit}
      `;
      params = [JSON.stringify(queryEmbedding)];
      if (input.project_id) params.push(input.project_id);
      if (input.category) params.push(input.category);
    }

    const { rows } = await this.db.query(query, params);

    // Update last_accessed_at for retrieved memories
    if (rows.length > 0) {
      const ids = rows.map((r) => r.id);
      await this.db.query(
        'UPDATE meta_memory_facts SET last_accessed_at = NOW() WHERE id = ANY($1)',
        [ids]
      );
    }

    return rows;
  }

  /**
   * Auto-extract memories from conversation
   */
  async extractMemories(input: ExtractMemoriesInput): Promise<Memory[]> {
    const conversationText = input.conversation
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n\n');

    const extractionPrompt = `Analyze this conversation and extract important facts, preferences, or instructions that should be remembered for future interactions.

Conversation:
${conversationText}

Extract memories in the following categories:
- preference: User preferences (e.g., "prefers Python over JavaScript", "likes concise explanations")
- fact: Factual information (e.g., "works at Acme Corp", "has 5 years of experience")
- instruction: Standing instructions (e.g., "always add type hints", "use British spelling")
- context: Important context (e.g., "working on e-commerce project", "timezone: PST")

For each memory, provide:
1. The content (2-3 sentences max)
2. The category
3. Importance score (0.0 to 1.0, where 1.0 is most important)

Return as JSON array with format:
[
  {
    "content": "...",
    "category": "preference|fact|instruction|context",
    "importance_score": 0.8
  }
]

Only extract memories that are likely to be useful in future conversations. Skip pleasantries and one-off statements.`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [{ role: 'user', content: extractionPrompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        this.logger.warn('Unexpected response type from Claude');
        return [];
      }

      // Parse the JSON response
      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        this.logger.warn('No JSON array found in response');
        return [];
      }

      const extractedMemories = JSON.parse(jsonMatch[0]);
      const createdMemories: Memory[] = [];

      // Auto-save if requested
      if (input.auto_save) {
        for (const mem of extractedMemories) {
          const memory = await this.createMemory({
            user_id: input.user_id,
            project_id: input.project_id,
            content: mem.content,
            category: mem.category,
            importance_score: mem.importance_score,
            fact_type: mem.category,
          });
          createdMemories.push(memory);
        }

        this.logger.info(
          { count: createdMemories.length },
          'Auto-extracted memories saved'
        );
      }

      return createdMemories;
    } catch (error: any) {
      this.logger.error({ error: error.message }, 'Failed to extract memories');
      return [];
    }
  }

  /**
   * Retrieve relevant memories for context
   */
  async getRelevantMemories(input: {
    user_id?: string;
    project_id: string;
    context: string;
    limit?: number;
    categories?: string[];
  }): Promise<Memory[]> {
    const limit = input.limit || 5;
    const queryEmbedding = await this.generateEmbedding(input.context);

    let query = `
      SELECT *,
             1 - (embedding <=> $1::vector) as similarity
      FROM meta_memory_facts
      WHERE enabled = true
        AND project_id = $2
        AND (expires_at IS NULL OR expires_at > NOW())
        ${input.user_id ? 'AND user_id = $3' : ''}
        ${input.categories && input.categories.length > 0 ? `AND category = ANY($${input.user_id ? '4' : '3'})` : ''}
      ORDER BY
        importance_score * (1 - (embedding <=> $1::vector)) DESC,
        embedding <=> $1::vector
      LIMIT ${limit}
    `;

    const params: any[] = [JSON.stringify(queryEmbedding), input.project_id];
    if (input.user_id) params.push(input.user_id);
    if (input.categories && input.categories.length > 0) params.push(input.categories);

    const { rows } = await this.db.query(query, params);

    // Update last_accessed_at
    if (rows.length > 0) {
      const ids = rows.map((r) => r.id);
      await this.db.query(
        'UPDATE meta_memory_facts SET last_accessed_at = NOW() WHERE id = ANY($1)',
        [ids]
      );
    }

    return rows;
  }

  /**
   * Generate embedding using OpenAI's embedding API
   * Falls back to hash-based approach if OpenAI is not configured
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // Use OpenAI embedding service if available
    if (this.embeddingService) {
      try {
        const result = await this.embeddingService.embed(text);
        return result.embedding;
      } catch (error: any) {
        this.logger.error(
          { error: error.message },
          'Failed to generate OpenAI embedding, falling back to hash-based'
        );
        // Fall through to hash-based fallback
      }
    }

    // Fallback: Simple hash-based embedding (NOT suitable for production semantic search)
    // This provides deterministic embeddings but lacks semantic understanding
    this.logger.debug('Using hash-based embedding fallback');

    const embedding = new Array(1536).fill(0);

    // Create a more sophisticated hash using multiple passes
    const normalizedText = text.toLowerCase().trim();

    // Pass 1: Character-based hashing
    for (let i = 0; i < normalizedText.length; i++) {
      const charCode = normalizedText.charCodeAt(i);
      const idx = (charCode * 31 + i) % 1536;
      embedding[idx] += charCode / 1000;
    }

    // Pass 2: Word-based hashing for better semantic grouping
    const words = normalizedText.split(/\s+/);
    for (let w = 0; w < words.length; w++) {
      const word = words[w];
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = ((hash << 5) - hash + word.charCodeAt(i)) | 0;
      }
      const idx = Math.abs(hash) % 1536;
      embedding[idx] += 0.1 * (w + 1);
    }

    // Pass 3: N-gram hashing
    for (let i = 0; i < normalizedText.length - 2; i++) {
      const trigram = normalizedText.slice(i, i + 3);
      let hash = 0;
      for (let j = 0; j < trigram.length; j++) {
        hash = ((hash << 5) - hash + trigram.charCodeAt(j)) | 0;
      }
      const idx = Math.abs(hash) % 1536;
      embedding[idx] += 0.05;
    }

    // Normalize to unit vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map((val) => val / (magnitude || 1));
  }

  /**
   * Generate a concise summary of the content
   */
  private async generateSummary(content: string): Promise<string> {
    // If content is short enough, use it as-is
    if (content.length <= 100) {
      return content;
    }

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: `Summarize this in one concise sentence (max 100 chars):\n\n${content}`,
          },
        ],
      });

      const summaryContent = response.content[0];
      if (summaryContent.type === 'text') {
        return summaryContent.text.trim();
      }
    } catch (error) {
      this.logger.warn('Failed to generate summary, using truncated content');
    }

    // Fallback to truncation
    return content.substring(0, 97) + '...';
  }

  /**
   * Get memory statistics
   */
  async getStats(filters: { user_id?: string; project_id?: string } = {}): Promise<{
    total: number;
    by_category: Record<string, number>;
    enabled: number;
    disabled: number;
  }> {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (filters.user_id !== undefined) {
      params.push(filters.user_id);
      whereClause += ` AND user_id = $${params.length}`;
    }

    if (filters.project_id) {
      params.push(filters.project_id);
      whereClause += ` AND project_id = $${params.length}`;
    }

    const { rows } = await this.db.query(
      `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE enabled = true) as enabled,
        COUNT(*) FILTER (WHERE enabled = false) as disabled,
        jsonb_object_agg(category, category_count) as by_category
      FROM (
        SELECT
          enabled,
          category,
          COUNT(*) as category_count
        FROM meta_memory_facts
        ${whereClause}
        GROUP BY category, enabled
      ) subq
      `,
      params
    );

    return {
      total: parseInt(rows[0]?.total || '0'),
      enabled: parseInt(rows[0]?.enabled || '0'),
      disabled: parseInt(rows[0]?.disabled || '0'),
      by_category: rows[0]?.by_category || {},
    };
  }
}
