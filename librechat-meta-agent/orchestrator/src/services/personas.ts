import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from 'pino';
import Anthropic from '@anthropic-ai/sdk';
import { EventEmitter } from 'events';

/**
 * Custom Personas Engine - Like ChatGPT's GPTs and Gemini's Gems but BETTER
 *
 * Features:
 * - Create custom AI personas with unique personalities
 * - Custom system prompts and behaviors
 * - Knowledge base integration (upload docs)
 * - Tool/action configurations
 * - Voice/avatar customization
 * - Public marketplace (share personas)
 * - Analytics and usage tracking
 * - Version control for personas
 * - Forking/remixing public personas
 */

export interface Persona {
  id: string;
  creator_id: string;
  name: string;
  slug: string;
  avatar_url: string | null;
  description: string;
  category: string;
  system_prompt: string;
  starter_prompts: string[];
  personality: {
    tone: 'formal' | 'casual' | 'playful' | 'professional' | 'empathetic';
    verbosity: 'concise' | 'balanced' | 'detailed';
    creativity: number; // 0-1 temperature mapping
  };
  capabilities: {
    web_search: boolean;
    code_execution: boolean;
    image_generation: boolean;
    file_analysis: boolean;
    voice_chat: boolean;
    computer_use: boolean;
  };
  model_config: {
    preferred_model: string;
    temperature: number;
    max_tokens: number;
  };
  voice_config: {
    provider: string;
    voice_id: string;
  } | null;
  visibility: 'private' | 'unlisted' | 'public';
  is_featured: boolean;
  version: number;
  created_at: Date;
  updated_at: Date;
}

export interface PersonaStats {
  persona_id: string;
  conversations_count: number;
  messages_count: number;
  likes_count: number;
  forks_count: number;
  updated_at: Date;
}

export interface PersonaWithStats extends Persona {
  stats: PersonaStats;
}

export interface PersonaKnowledge {
  id: string;
  persona_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  embedding_id: string | null;
  created_at: Date;
}

export interface PersonaConversation {
  id: string;
  persona_id: string;
  user_id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
}

export interface PersonaMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: any;
  created_at: Date;
}

export interface CreatePersonaInput {
  creator_id: string;
  name: string;
  description: string;
  category?: string;
  system_prompt: string;
  starter_prompts?: string[];
  personality?: Partial<Persona['personality']>;
  capabilities?: Partial<Persona['capabilities']>;
  model_config?: Partial<Persona['model_config']>;
  voice_config?: Persona['voice_config'];
  visibility?: Persona['visibility'];
  avatar_url?: string;
}

export interface UpdatePersonaInput {
  name?: string;
  description?: string;
  category?: string;
  system_prompt?: string;
  starter_prompts?: string[];
  personality?: Partial<Persona['personality']>;
  capabilities?: Partial<Persona['capabilities']>;
  model_config?: Partial<Persona['model_config']>;
  voice_config?: Persona['voice_config'];
  visibility?: Persona['visibility'];
  avatar_url?: string;
}

export interface PersonaAnalytics {
  persona_id: string;
  total_conversations: number;
  total_messages: number;
  total_likes: number;
  total_forks: number;
  unique_users: number;
  avg_conversation_length: number;
  daily_usage: Array<{ date: string; count: number }>;
  top_users: Array<{ user_id: string; count: number }>;
}

export class PersonasEngine extends EventEmitter {
  private anthropic: Anthropic;

  constructor(
    private db: Pool,
    private logger: Logger,
    anthropicApiKey: string
  ) {
    super();
    this.anthropic = new Anthropic({ apiKey: anthropicApiKey });
  }

  /**
   * Create a new persona
   */
  async createPersona(input: CreatePersonaInput): Promise<Persona> {
    const id = uuidv4();
    const slug = this.generateSlug(input.name);

    // Check if slug already exists
    const existingSlug = await this.db.query(
      'SELECT id FROM personas WHERE slug = $1',
      [slug]
    );

    if (existingSlug.rowCount > 0) {
      throw new Error(`Persona with slug "${slug}" already exists`);
    }

    const personality = {
      tone: input.personality?.tone || 'professional',
      verbosity: input.personality?.verbosity || 'balanced',
      creativity: input.personality?.creativity ?? 0.7,
    };

    const capabilities = {
      web_search: input.capabilities?.web_search ?? false,
      code_execution: input.capabilities?.code_execution ?? false,
      image_generation: input.capabilities?.image_generation ?? false,
      file_analysis: input.capabilities?.file_analysis ?? false,
      voice_chat: input.capabilities?.voice_chat ?? false,
      computer_use: input.capabilities?.computer_use ?? false,
    };

    const model_config = {
      preferred_model: input.model_config?.preferred_model || 'claude-3-5-sonnet-20241022',
      temperature: input.model_config?.temperature ?? personality.creativity,
      max_tokens: input.model_config?.max_tokens || 4096,
    };

    const { rows } = await this.db.query(
      `INSERT INTO personas (
        id, creator_id, name, slug, avatar_url, description, category,
        system_prompt, starter_prompts, personality, capabilities,
        model_config, voice_config, visibility, version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 1)
      RETURNING *`,
      [
        id,
        input.creator_id,
        input.name,
        slug,
        input.avatar_url || null,
        input.description,
        input.category || 'general',
        input.system_prompt,
        JSON.stringify(input.starter_prompts || []),
        JSON.stringify(personality),
        JSON.stringify(capabilities),
        JSON.stringify(model_config),
        input.voice_config ? JSON.stringify(input.voice_config) : null,
        input.visibility || 'private',
      ]
    );

    // Initialize stats
    await this.db.query(
      `INSERT INTO persona_stats (persona_id) VALUES ($1)`,
      [id]
    );

    this.logger.info({ persona_id: id, name: input.name }, 'Persona created');
    this.emit('persona:created', rows[0]);

    return this.formatPersona(rows[0]);
  }

  /**
   * Update a persona
   */
  async updatePersona(
    persona_id: string,
    creator_id: string,
    updates: UpdatePersonaInput
  ): Promise<Persona> {
    // Verify ownership
    const ownership = await this.db.query(
      'SELECT creator_id FROM personas WHERE id = $1',
      [persona_id]
    );

    if (ownership.rowCount === 0) {
      throw new Error('Persona not found');
    }

    if (ownership.rows[0].creator_id !== creator_id) {
      throw new Error('Unauthorized: You can only update your own personas');
    }

    const fields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      params.push(updates.name);
      fields.push(`name = $${paramIndex++}`);

      // Update slug if name changes
      const newSlug = this.generateSlug(updates.name);
      params.push(newSlug);
      fields.push(`slug = $${paramIndex++}`);
    }

    if (updates.description !== undefined) {
      params.push(updates.description);
      fields.push(`description = $${paramIndex++}`);
    }

    if (updates.category !== undefined) {
      params.push(updates.category);
      fields.push(`category = $${paramIndex++}`);
    }

    if (updates.system_prompt !== undefined) {
      params.push(updates.system_prompt);
      fields.push(`system_prompt = $${paramIndex++}`);
    }

    if (updates.starter_prompts !== undefined) {
      params.push(JSON.stringify(updates.starter_prompts));
      fields.push(`starter_prompts = $${paramIndex++}`);
    }

    if (updates.personality !== undefined) {
      // Merge with existing personality
      const existing = await this.getPersona(persona_id);
      const merged = { ...existing.personality, ...updates.personality };
      params.push(JSON.stringify(merged));
      fields.push(`personality = $${paramIndex++}`);
    }

    if (updates.capabilities !== undefined) {
      const existing = await this.getPersona(persona_id);
      const merged = { ...existing.capabilities, ...updates.capabilities };
      params.push(JSON.stringify(merged));
      fields.push(`capabilities = $${paramIndex++}`);
    }

    if (updates.model_config !== undefined) {
      const existing = await this.getPersona(persona_id);
      const merged = { ...existing.model_config, ...updates.model_config };
      params.push(JSON.stringify(merged));
      fields.push(`model_config = $${paramIndex++}`);
    }

    if (updates.voice_config !== undefined) {
      params.push(updates.voice_config ? JSON.stringify(updates.voice_config) : null);
      fields.push(`voice_config = $${paramIndex++}`);
    }

    if (updates.visibility !== undefined) {
      params.push(updates.visibility);
      fields.push(`visibility = $${paramIndex++}`);
    }

    if (updates.avatar_url !== undefined) {
      params.push(updates.avatar_url);
      fields.push(`avatar_url = $${paramIndex++}`);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    // Increment version
    fields.push(`version = version + 1`);
    fields.push(`updated_at = NOW()`);

    params.push(persona_id);
    const query = `
      UPDATE personas
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const { rows } = await this.db.query(query, params);
    this.logger.info({ persona_id }, 'Persona updated');
    this.emit('persona:updated', rows[0]);

    return this.formatPersona(rows[0]);
  }

  /**
   * Delete a persona
   */
  async deletePersona(persona_id: string, creator_id: string): Promise<void> {
    // Verify ownership
    const ownership = await this.db.query(
      'SELECT creator_id FROM personas WHERE id = $1',
      [persona_id]
    );

    if (ownership.rowCount === 0) {
      throw new Error('Persona not found');
    }

    if (ownership.rows[0].creator_id !== creator_id) {
      throw new Error('Unauthorized: You can only delete your own personas');
    }

    await this.db.query('DELETE FROM personas WHERE id = $1', [persona_id]);

    this.logger.info({ persona_id }, 'Persona deleted');
    this.emit('persona:deleted', { persona_id });
  }

  /**
   * Get a persona by ID or slug
   */
  async getPersona(idOrSlug: string): Promise<Persona> {
    const { rows } = await this.db.query(
      'SELECT * FROM personas WHERE id = $1 OR slug = $1',
      [idOrSlug]
    );

    if (rows.length === 0) {
      throw new Error('Persona not found');
    }

    return this.formatPersona(rows[0]);
  }

  /**
   * Get persona with stats
   */
  async getPersonaWithStats(idOrSlug: string): Promise<PersonaWithStats> {
    const persona = await this.getPersona(idOrSlug);
    const stats = await this.getStats(persona.id);

    return { ...persona, stats };
  }

  /**
   * Get user's personas
   */
  async getUserPersonas(user_id: string): Promise<PersonaWithStats[]> {
    const { rows } = await this.db.query(
      `SELECT p.*, s.*
       FROM personas p
       LEFT JOIN persona_stats s ON p.id = s.persona_id
       WHERE p.creator_id = $1
       ORDER BY p.created_at DESC`,
      [user_id]
    );

    return rows.map((row) => this.formatPersonaWithStats(row));
  }

  /**
   * Search public personas
   */
  async searchPersonas(
    query: string,
    filters?: {
      category?: string;
      featured?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<PersonaWithStats[]> {
    let sql = `
      SELECT p.*, s.*
      FROM personas p
      LEFT JOIN persona_stats s ON p.id = s.persona_id
      WHERE p.visibility = 'public'
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (query) {
      params.push(`%${query}%`);
      sql += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
      paramIndex++;
    }

    if (filters?.category) {
      params.push(filters.category);
      sql += ` AND p.category = $${paramIndex}`;
      paramIndex++;
    }

    if (filters?.featured) {
      sql += ` AND p.is_featured = true`;
    }

    sql += ` ORDER BY s.likes_count DESC, p.created_at DESC`;

    if (filters?.limit) {
      params.push(filters.limit);
      sql += ` LIMIT $${paramIndex}`;
      paramIndex++;
    }

    if (filters?.offset) {
      params.push(filters.offset);
      sql += ` OFFSET $${paramIndex}`;
    }

    const { rows } = await this.db.query(sql, params);
    return rows.map((row) => this.formatPersonaWithStats(row));
  }

  /**
   * Get featured personas
   */
  async getFeaturedPersonas(limit: number = 10): Promise<PersonaWithStats[]> {
    const { rows } = await this.db.query(
      `SELECT p.*, s.*
       FROM personas p
       LEFT JOIN persona_stats s ON p.id = s.persona_id
       WHERE p.visibility = 'public' AND p.is_featured = true
       ORDER BY s.likes_count DESC, p.created_at DESC
       LIMIT $1`,
      [limit]
    );

    return rows.map((row) => this.formatPersonaWithStats(row));
  }

  /**
   * Fork a public persona
   */
  async forkPersona(persona_id: string, user_id: string): Promise<Persona> {
    const original = await this.getPersona(persona_id);

    // Verify it's forkable
    if (original.visibility === 'private') {
      throw new Error('Cannot fork a private persona');
    }

    // Create a copy
    const forked = await this.createPersona({
      creator_id: user_id,
      name: `${original.name} (Fork)`,
      description: `Forked from ${original.name}. ${original.description}`,
      category: original.category,
      system_prompt: original.system_prompt,
      starter_prompts: original.starter_prompts,
      personality: original.personality,
      capabilities: original.capabilities,
      model_config: original.model_config,
      voice_config: original.voice_config,
      visibility: 'private',
    });

    // Increment fork count
    await this.db.query(
      `UPDATE persona_stats SET forks_count = forks_count + 1 WHERE persona_id = $1`,
      [persona_id]
    );

    this.logger.info(
      { original_id: persona_id, forked_id: forked.id },
      'Persona forked'
    );
    this.emit('persona:forked', { original_id: persona_id, forked_id: forked.id });

    return forked;
  }

  /**
   * Add knowledge file to persona
   */
  async addKnowledge(
    persona_id: string,
    creator_id: string,
    files: Array<{
      file_name: string;
      file_type: string;
      file_size: number;
      storage_path: string;
      embedding_id?: string;
    }>
  ): Promise<PersonaKnowledge[]> {
    // Verify ownership
    const persona = await this.getPersona(persona_id);
    if (persona.creator_id !== creator_id) {
      throw new Error('Unauthorized');
    }

    const created: PersonaKnowledge[] = [];

    for (const file of files) {
      const id = uuidv4();
      const { rows } = await this.db.query(
        `INSERT INTO persona_knowledge (
          id, persona_id, file_name, file_type, file_size, storage_path, embedding_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          id,
          persona_id,
          file.file_name,
          file.file_type,
          file.file_size,
          file.storage_path,
          file.embedding_id || null,
        ]
      );

      created.push(rows[0]);
    }

    this.logger.info(
      { persona_id, count: files.length },
      'Knowledge files added to persona'
    );

    return created;
  }

  /**
   * Remove knowledge file from persona
   */
  async removeKnowledge(
    persona_id: string,
    knowledge_id: string,
    creator_id: string
  ): Promise<void> {
    // Verify ownership
    const persona = await this.getPersona(persona_id);
    if (persona.creator_id !== creator_id) {
      throw new Error('Unauthorized');
    }

    await this.db.query(
      'DELETE FROM persona_knowledge WHERE id = $1 AND persona_id = $2',
      [knowledge_id, persona_id]
    );

    this.logger.info({ persona_id, knowledge_id }, 'Knowledge file removed');
  }

  /**
   * Get persona knowledge files
   */
  async getKnowledge(persona_id: string): Promise<PersonaKnowledge[]> {
    const { rows } = await this.db.query(
      'SELECT * FROM persona_knowledge WHERE persona_id = $1 ORDER BY created_at DESC',
      [persona_id]
    );

    return rows;
  }

  /**
   * Chat with persona (streaming)
   */
  async *chat(
    persona_id: string,
    user_id: string,
    message: string,
    conversation_id?: string
  ): AsyncGenerator<string> {
    const persona = await this.getPersona(persona_id);

    // Get or create conversation
    let conv_id = conversation_id;
    if (!conv_id) {
      const { rows } = await this.db.query(
        `INSERT INTO persona_conversations (id, persona_id, user_id, title)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [uuidv4(), persona_id, user_id, message.substring(0, 100)]
      );
      conv_id = rows[0].id;
    }

    // Save user message
    await this.db.query(
      `INSERT INTO persona_messages (id, conversation_id, role, content, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [uuidv4(), conv_id, 'user', message, JSON.stringify({})]
    );

    // Get conversation history
    const { rows: history } = await this.db.query(
      `SELECT role, content FROM persona_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC
       LIMIT 20`,
      [conv_id]
    );

    // Build messages
    const messages: Anthropic.MessageParam[] = history.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Build system prompt
    let systemPrompt = persona.system_prompt;
    systemPrompt += `\n\nPersonality: Tone is ${persona.personality.tone}, verbosity is ${persona.personality.verbosity}.`;

    // Stream response from Claude
    const stream = await this.anthropic.messages.create({
      model: persona.model_config.preferred_model,
      max_tokens: persona.model_config.max_tokens,
      temperature: persona.model_config.temperature,
      system: systemPrompt,
      messages,
      stream: true,
    });

    let fullResponse = '';

    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta.type === 'text_delta'
      ) {
        const text = chunk.delta.text;
        fullResponse += text;
        yield text;
      }
    }

    // Save assistant message
    await this.db.query(
      `INSERT INTO persona_messages (id, conversation_id, role, content, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [uuidv4(), conv_id, 'assistant', fullResponse, JSON.stringify({})]
    );

    // Update stats
    await this.db.query(
      `UPDATE persona_stats
       SET conversations_count = conversations_count + 1,
           messages_count = messages_count + 2,
           updated_at = NOW()
       WHERE persona_id = $1`,
      [persona_id]
    );

    this.emit('persona:chat', { persona_id, user_id, message });
  }

  /**
   * Toggle like on persona
   */
  async toggleLike(persona_id: string, user_id: string): Promise<boolean> {
    const existing = await this.db.query(
      'SELECT 1 FROM persona_likes WHERE persona_id = $1 AND user_id = $2',
      [persona_id, user_id]
    );

    let liked = false;

    if (existing.rowCount > 0) {
      // Unlike
      await this.db.query(
        'DELETE FROM persona_likes WHERE persona_id = $1 AND user_id = $2',
        [persona_id, user_id]
      );

      await this.db.query(
        'UPDATE persona_stats SET likes_count = likes_count - 1 WHERE persona_id = $1',
        [persona_id]
      );
    } else {
      // Like
      await this.db.query(
        'INSERT INTO persona_likes (persona_id, user_id) VALUES ($1, $2)',
        [persona_id, user_id]
      );

      await this.db.query(
        'UPDATE persona_stats SET likes_count = likes_count + 1 WHERE persona_id = $1',
        [persona_id]
      );

      liked = true;
    }

    return liked;
  }

  /**
   * Check if user has liked persona
   */
  async hasLiked(persona_id: string, user_id: string): Promise<boolean> {
    const { rowCount } = await this.db.query(
      'SELECT 1 FROM persona_likes WHERE persona_id = $1 AND user_id = $2',
      [persona_id, user_id]
    );

    return rowCount > 0;
  }

  /**
   * Get persona analytics
   */
  async getAnalytics(persona_id: string, creator_id: string): Promise<PersonaAnalytics> {
    // Verify ownership
    const persona = await this.getPersona(persona_id);
    if (persona.creator_id !== creator_id) {
      throw new Error('Unauthorized');
    }

    const stats = await this.getStats(persona_id);

    // Get unique users
    const { rows: uniqueUsers } = await this.db.query(
      'SELECT COUNT(DISTINCT user_id) as count FROM persona_conversations WHERE persona_id = $1',
      [persona_id]
    );

    // Get avg conversation length
    const { rows: avgLength } = await this.db.query(
      `SELECT AVG(msg_count) as avg FROM (
         SELECT COUNT(*) as msg_count
         FROM persona_messages pm
         JOIN persona_conversations pc ON pm.conversation_id = pc.id
         WHERE pc.persona_id = $1
         GROUP BY pm.conversation_id
       ) subq`,
      [persona_id]
    );

    // Get daily usage (last 30 days)
    const { rows: dailyUsage } = await this.db.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM persona_conversations
       WHERE persona_id = $1
         AND created_at > NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [persona_id]
    );

    // Get top users
    const { rows: topUsers } = await this.db.query(
      `SELECT user_id, COUNT(*) as count
       FROM persona_conversations
       WHERE persona_id = $1
       GROUP BY user_id
       ORDER BY count DESC
       LIMIT 10`,
      [persona_id]
    );

    return {
      persona_id,
      total_conversations: stats.conversations_count,
      total_messages: stats.messages_count,
      total_likes: stats.likes_count,
      total_forks: stats.forks_count,
      unique_users: parseInt(uniqueUsers[0]?.count || '0'),
      avg_conversation_length: parseFloat(avgLength[0]?.avg || '0'),
      daily_usage: dailyUsage.map((row) => ({
        date: row.date,
        count: parseInt(row.count),
      })),
      top_users: topUsers.map((row) => ({
        user_id: row.user_id,
        count: parseInt(row.count),
      })),
    };
  }

  /**
   * Get persona conversations
   */
  async getConversations(
    persona_id: string,
    user_id: string,
    limit: number = 50
  ): Promise<PersonaConversation[]> {
    const { rows } = await this.db.query(
      `SELECT * FROM persona_conversations
       WHERE persona_id = $1 AND user_id = $2
       ORDER BY updated_at DESC
       LIMIT $3`,
      [persona_id, user_id, limit]
    );

    return rows;
  }

  /**
   * Get conversation messages
   */
  async getMessages(conversation_id: string): Promise<PersonaMessage[]> {
    const { rows } = await this.db.query(
      `SELECT * FROM persona_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [conversation_id]
    );

    return rows;
  }

  /**
   * Delete conversation
   */
  async deleteConversation(conversation_id: string, user_id: string): Promise<void> {
    // Verify ownership
    const { rows } = await this.db.query(
      'SELECT user_id FROM persona_conversations WHERE id = $1',
      [conversation_id]
    );

    if (rows.length === 0) {
      throw new Error('Conversation not found');
    }

    if (rows[0].user_id !== user_id) {
      throw new Error('Unauthorized');
    }

    await this.db.query('DELETE FROM persona_conversations WHERE id = $1', [
      conversation_id,
    ]);

    this.logger.info({ conversation_id }, 'Conversation deleted');
  }

  /**
   * Get stats for persona
   */
  private async getStats(persona_id: string): Promise<PersonaStats> {
    const { rows } = await this.db.query(
      'SELECT * FROM persona_stats WHERE persona_id = $1',
      [persona_id]
    );

    if (rows.length === 0) {
      // Create if doesn't exist
      await this.db.query(
        'INSERT INTO persona_stats (persona_id) VALUES ($1)',
        [persona_id]
      );

      return {
        persona_id,
        conversations_count: 0,
        messages_count: 0,
        likes_count: 0,
        forks_count: 0,
        updated_at: new Date(),
      };
    }

    return rows[0];
  }

  /**
   * Generate URL-friendly slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  }

  /**
   * Format persona from database row
   */
  private formatPersona(row: any): Persona {
    return {
      id: row.id,
      creator_id: row.creator_id,
      name: row.name,
      slug: row.slug,
      avatar_url: row.avatar_url,
      description: row.description,
      category: row.category,
      system_prompt: row.system_prompt,
      starter_prompts:
        typeof row.starter_prompts === 'string'
          ? JSON.parse(row.starter_prompts)
          : row.starter_prompts,
      personality:
        typeof row.personality === 'string'
          ? JSON.parse(row.personality)
          : row.personality,
      capabilities:
        typeof row.capabilities === 'string'
          ? JSON.parse(row.capabilities)
          : row.capabilities,
      model_config:
        typeof row.model_config === 'string'
          ? JSON.parse(row.model_config)
          : row.model_config,
      voice_config:
        row.voice_config && typeof row.voice_config === 'string'
          ? JSON.parse(row.voice_config)
          : row.voice_config,
      visibility: row.visibility,
      is_featured: row.is_featured,
      version: row.version,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * Format persona with stats
   */
  private formatPersonaWithStats(row: any): PersonaWithStats {
    const persona = this.formatPersona(row);
    const stats: PersonaStats = {
      persona_id: row.persona_id || row.id,
      conversations_count: row.conversations_count || 0,
      messages_count: row.messages_count || 0,
      likes_count: row.likes_count || 0,
      forks_count: row.forks_count || 0,
      updated_at: row.updated_at,
    };

    return { ...persona, stats };
  }
}
