/**
 * Conversations API Routes
 * RESTful API endpoints for managing conversations and messages
 */

import { Router, Response } from 'express';
import { Pool } from 'pg';
import { Logger } from 'pino';
import { z } from 'zod';
import {
  AuthenticatedRequest,
  getUserFromRequest,
} from '../middleware/auth';

// ============================================================================
// Validation Schemas
// ============================================================================

const CreateConversationSchema = z.object({
  title: z.string().max(500).optional(),
  agent_type: z.string().max(100).default('general'),
  model_used: z.string().max(100).optional(),
  project_id: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional(),
});

const UpdateConversationSchema = z.object({
  title: z.string().max(500).optional(),
  summary: z.string().optional(),
  is_pinned: z.boolean().optional(),
  is_archived: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});

const CreateMessageSchema = z.object({
  conversation_id: z.string().uuid(),
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  content_type: z.string().max(50).default('text'),
  parent_message_id: z.string().uuid().optional(),
  tool_name: z.string().max(100).optional(),
  tool_input: z.record(z.any()).optional(),
  tool_output: z.record(z.any()).optional(),
  tokens_used: z.number().int().min(0).optional(),
  metadata: z.record(z.any()).optional(),
});

const UpdateMessageSchema = z.object({
  user_rating: z.number().int().min(1).max(5).optional(),
  user_feedback: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const ListConversationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  include_archived: z.coerce.boolean().default(false),
  agent_type: z.string().optional(),
  project_id: z.string().uuid().optional(),
});

const ListMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  active_branch_only: z.coerce.boolean().default(true),
});

// ============================================================================
// Types
// ============================================================================

interface Conversation {
  id: string;
  user_id: string | null;
  project_id: string | null;
  agent_type: string;
  title: string | null;
  summary: string | null;
  model_used: string | null;
  total_tokens: number;
  message_count: number;
  is_archived: boolean;
  is_pinned: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  parent_message_id: string | null;
  role: string;
  content: string;
  content_type: string;
  tool_name: string | null;
  tool_input: Record<string, any> | null;
  tool_output: Record<string, any> | null;
  branch_name: string;
  is_active_branch: boolean;
  tokens_used: number;
  user_rating: number | null;
  user_feedback: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

// ============================================================================
// Route Factory
// ============================================================================

export function createConversationsRoutes(db: Pool, logger: Logger): Router {
  const router = Router();

  // ==========================================================================
  // Conversation CRUD
  // ==========================================================================

  /**
   * POST /api/conversations
   * Create a new conversation
   */
  router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getUserFromRequest(req);
      const validation = CreateConversationSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: validation.error.errors,
          },
        });
      }

      const { title, agent_type, model_used, project_id, metadata } = validation.data;

      const result = await db.query<Conversation>(
        `INSERT INTO meta_conversations (user_id, title, agent_type, model_used, project_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [user?.id || null, title || null, agent_type, model_used || null, project_id || null, metadata || {}]
      );

      const conversation = result.rows[0];
      logger.info({ userId: user?.id, conversationId: conversation.id }, 'Conversation created');

      res.status(201).json({ data: conversation });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to create conversation');
      res.status(500).json({
        error: {
          code: 'CREATE_CONVERSATION_ERROR',
          message: error.message,
        },
      });
    }
  });

  /**
   * GET /api/conversations
   * List conversations for the current user
   */
  router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getUserFromRequest(req);
      const validation = ListConversationsQuerySchema.safeParse(req.query);

      if (!validation.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: validation.error.errors,
          },
        });
      }

      const { limit, offset, include_archived, agent_type, project_id } = validation.data;

      let query = `
        SELECT
          id, title, summary, model_used, message_count,
          is_pinned, is_archived, created_at, updated_at
        FROM meta_conversations
        WHERE (user_id = $1 OR user_id IS NULL)
      `;
      const params: any[] = [user?.id || null];
      let paramIndex = 2;

      if (!include_archived) {
        query += ` AND is_archived = FALSE`;
      }

      if (agent_type) {
        query += ` AND agent_type = $${paramIndex}`;
        params.push(agent_type);
        paramIndex++;
      }

      if (project_id) {
        query += ` AND project_id = $${paramIndex}`;
        params.push(project_id);
        paramIndex++;
      }

      query += `
        ORDER BY is_pinned DESC, updated_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(limit, offset);

      const result = await db.query(query, params);

      res.json({
        data: result.rows,
        count: result.rows.length,
        offset,
        limit,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to list conversations');
      res.status(500).json({
        error: {
          code: 'LIST_CONVERSATIONS_ERROR',
          message: error.message,
        },
      });
    }
  });

  /**
   * GET /api/conversations/:id
   * Get a conversation by ID
   */
  router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getUserFromRequest(req);
      const conversationId = req.params.id;

      const result = await db.query<Conversation>(
        `SELECT * FROM meta_conversations
         WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)`,
        [conversationId, user?.id || null]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          },
        });
      }

      res.json({ data: result.rows[0] });
    } catch (error: any) {
      logger.error({ error: error.message, id: req.params.id }, 'Failed to get conversation');
      res.status(500).json({
        error: {
          code: 'GET_CONVERSATION_ERROR',
          message: error.message,
        },
      });
    }
  });

  /**
   * GET /api/conversations/:id/with-messages
   * Get a conversation with all its messages
   */
  router.get('/:id/with-messages', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getUserFromRequest(req);
      const conversationId = req.params.id;

      // Get conversation
      const convResult = await db.query<Conversation>(
        `SELECT * FROM meta_conversations
         WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)`,
        [conversationId, user?.id || null]
      );

      if (convResult.rows.length === 0) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          },
        });
      }

      // Get messages
      const msgResult = await db.query<Message>(
        `SELECT * FROM meta_messages
         WHERE conversation_id = $1 AND is_active_branch = TRUE
         ORDER BY created_at ASC`,
        [conversationId]
      );

      res.json({
        data: {
          conversation: convResult.rows[0],
          messages: msgResult.rows,
        },
      });
    } catch (error: any) {
      logger.error({ error: error.message, id: req.params.id }, 'Failed to get conversation with messages');
      res.status(500).json({
        error: {
          code: 'GET_CONVERSATION_ERROR',
          message: error.message,
        },
      });
    }
  });

  /**
   * PATCH /api/conversations/:id
   * Update a conversation
   */
  router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getUserFromRequest(req);
      const conversationId = req.params.id;
      const validation = UpdateConversationSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: validation.error.errors,
          },
        });
      }

      const updates = validation.data;
      const updateFields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Build dynamic update query
      if (updates.title !== undefined) {
        updateFields.push(`title = $${paramIndex}`);
        params.push(updates.title);
        paramIndex++;
      }
      if (updates.summary !== undefined) {
        updateFields.push(`summary = $${paramIndex}`);
        params.push(updates.summary);
        paramIndex++;
      }
      if (updates.is_pinned !== undefined) {
        updateFields.push(`is_pinned = $${paramIndex}`);
        params.push(updates.is_pinned);
        paramIndex++;
      }
      if (updates.is_archived !== undefined) {
        updateFields.push(`is_archived = $${paramIndex}`);
        params.push(updates.is_archived);
        paramIndex++;
      }
      if (updates.metadata !== undefined) {
        updateFields.push(`metadata = $${paramIndex}`);
        params.push(updates.metadata);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          error: {
            code: 'NO_UPDATES',
            message: 'No valid fields to update',
          },
        });
      }

      // Add updated_at
      updateFields.push(`updated_at = NOW()`);

      // Add WHERE conditions
      params.push(conversationId, user?.id || null);

      const query = `
        UPDATE meta_conversations
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND (user_id = $${paramIndex + 1} OR user_id IS NULL)
        RETURNING *
      `;

      const result = await db.query<Conversation>(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          },
        });
      }

      logger.info({ userId: user?.id, conversationId }, 'Conversation updated');
      res.json({ data: result.rows[0] });
    } catch (error: any) {
      logger.error({ error: error.message, id: req.params.id }, 'Failed to update conversation');
      res.status(500).json({
        error: {
          code: 'UPDATE_CONVERSATION_ERROR',
          message: error.message,
        },
      });
    }
  });

  /**
   * DELETE /api/conversations/:id
   * Delete a conversation
   */
  router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getUserFromRequest(req);
      const conversationId = req.params.id;

      const result = await db.query(
        `DELETE FROM meta_conversations
         WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)
         RETURNING id`,
        [conversationId, user?.id || null]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          },
        });
      }

      logger.info({ userId: user?.id, conversationId }, 'Conversation deleted');
      res.status(204).send();
    } catch (error: any) {
      logger.error({ error: error.message, id: req.params.id }, 'Failed to delete conversation');
      res.status(500).json({
        error: {
          code: 'DELETE_CONVERSATION_ERROR',
          message: error.message,
        },
      });
    }
  });

  /**
   * POST /api/conversations/:id/archive
   * Archive a conversation
   */
  router.post('/:id/archive', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getUserFromRequest(req);
      const conversationId = req.params.id;

      const result = await db.query<Conversation>(
        `UPDATE meta_conversations
         SET is_archived = TRUE, updated_at = NOW()
         WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)
         RETURNING *`,
        [conversationId, user?.id || null]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          },
        });
      }

      logger.info({ userId: user?.id, conversationId }, 'Conversation archived');
      res.json({ data: result.rows[0] });
    } catch (error: any) {
      logger.error({ error: error.message, id: req.params.id }, 'Failed to archive conversation');
      res.status(500).json({
        error: {
          code: 'ARCHIVE_CONVERSATION_ERROR',
          message: error.message,
        },
      });
    }
  });

  /**
   * POST /api/conversations/:id/unarchive
   * Unarchive a conversation
   */
  router.post('/:id/unarchive', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getUserFromRequest(req);
      const conversationId = req.params.id;

      const result = await db.query<Conversation>(
        `UPDATE meta_conversations
         SET is_archived = FALSE, updated_at = NOW()
         WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)
         RETURNING *`,
        [conversationId, user?.id || null]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          },
        });
      }

      logger.info({ userId: user?.id, conversationId }, 'Conversation unarchived');
      res.json({ data: result.rows[0] });
    } catch (error: any) {
      logger.error({ error: error.message, id: req.params.id }, 'Failed to unarchive conversation');
      res.status(500).json({
        error: {
          code: 'UNARCHIVE_CONVERSATION_ERROR',
          message: error.message,
        },
      });
    }
  });

  /**
   * POST /api/conversations/:id/pin
   * Pin a conversation
   */
  router.post('/:id/pin', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getUserFromRequest(req);
      const conversationId = req.params.id;

      const result = await db.query<Conversation>(
        `UPDATE meta_conversations
         SET is_pinned = TRUE, updated_at = NOW()
         WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)
         RETURNING *`,
        [conversationId, user?.id || null]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          },
        });
      }

      logger.info({ userId: user?.id, conversationId }, 'Conversation pinned');
      res.json({ data: result.rows[0] });
    } catch (error: any) {
      logger.error({ error: error.message, id: req.params.id }, 'Failed to pin conversation');
      res.status(500).json({
        error: {
          code: 'PIN_CONVERSATION_ERROR',
          message: error.message,
        },
      });
    }
  });

  /**
   * POST /api/conversations/:id/unpin
   * Unpin a conversation
   */
  router.post('/:id/unpin', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getUserFromRequest(req);
      const conversationId = req.params.id;

      const result = await db.query<Conversation>(
        `UPDATE meta_conversations
         SET is_pinned = FALSE, updated_at = NOW()
         WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)
         RETURNING *`,
        [conversationId, user?.id || null]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          },
        });
      }

      logger.info({ userId: user?.id, conversationId }, 'Conversation unpinned');
      res.json({ data: result.rows[0] });
    } catch (error: any) {
      logger.error({ error: error.message, id: req.params.id }, 'Failed to unpin conversation');
      res.status(500).json({
        error: {
          code: 'UNPIN_CONVERSATION_ERROR',
          message: error.message,
        },
      });
    }
  });

  // ==========================================================================
  // Message CRUD
  // ==========================================================================

  /**
   * POST /api/conversations/:id/messages
   * Create a new message in a conversation
   */
  router.post('/:id/messages', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getUserFromRequest(req);
      const conversationId = req.params.id;

      // Merge conversation_id into body for validation
      const body = { ...req.body, conversation_id: conversationId };
      const validation = CreateMessageSchema.safeParse(body);

      if (!validation.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: validation.error.errors,
          },
        });
      }

      // Verify conversation exists and user has access
      const convCheck = await db.query(
        `SELECT id FROM meta_conversations
         WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)`,
        [conversationId, user?.id || null]
      );

      if (convCheck.rows.length === 0) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          },
        });
      }

      const {
        role,
        content,
        content_type,
        parent_message_id,
        tool_name,
        tool_input,
        tool_output,
        tokens_used,
        metadata,
      } = validation.data;

      const result = await db.query<Message>(
        `INSERT INTO meta_messages (
          conversation_id, role, content, content_type,
          parent_message_id, tool_name, tool_input, tool_output,
          tokens_used, metadata, is_active_branch
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE)
         RETURNING *`,
        [
          conversationId,
          role,
          content,
          content_type,
          parent_message_id || null,
          tool_name || null,
          tool_input || null,
          tool_output || null,
          tokens_used || 0,
          metadata || {},
        ]
      );

      const message = result.rows[0];
      logger.info({ userId: user?.id, conversationId, messageId: message.id }, 'Message created');

      res.status(201).json({ data: message });
    } catch (error: any) {
      logger.error({ error: error.message, conversationId: req.params.id }, 'Failed to create message');
      res.status(500).json({
        error: {
          code: 'CREATE_MESSAGE_ERROR',
          message: error.message,
        },
      });
    }
  });

  /**
   * GET /api/conversations/:id/messages
   * List messages in a conversation
   */
  router.get('/:id/messages', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getUserFromRequest(req);
      const conversationId = req.params.id;
      const validation = ListMessagesQuerySchema.safeParse(req.query);

      if (!validation.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: validation.error.errors,
          },
        });
      }

      // Verify conversation exists and user has access
      const convCheck = await db.query(
        `SELECT id FROM meta_conversations
         WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)`,
        [conversationId, user?.id || null]
      );

      if (convCheck.rows.length === 0) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          },
        });
      }

      const { limit, offset, active_branch_only } = validation.data;

      let query = `
        SELECT * FROM meta_messages
        WHERE conversation_id = $1
      `;
      const params: any[] = [conversationId];

      if (active_branch_only) {
        query += ` AND is_active_branch = TRUE`;
      }

      query += ` ORDER BY created_at ASC LIMIT $2 OFFSET $3`;
      params.push(limit, offset);

      const result = await db.query<Message>(query, params);

      res.json({
        data: result.rows,
        count: result.rows.length,
        offset,
        limit,
      });
    } catch (error: any) {
      logger.error({ error: error.message, conversationId: req.params.id }, 'Failed to list messages');
      res.status(500).json({
        error: {
          code: 'LIST_MESSAGES_ERROR',
          message: error.message,
        },
      });
    }
  });

  /**
   * PATCH /api/conversations/:conversationId/messages/:messageId
   * Update a message (for ratings/feedback)
   */
  router.patch('/:conversationId/messages/:messageId', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getUserFromRequest(req);
      const { conversationId, messageId } = req.params;
      const validation = UpdateMessageSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: validation.error.errors,
          },
        });
      }

      // Verify conversation exists and user has access
      const convCheck = await db.query(
        `SELECT id FROM meta_conversations
         WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)`,
        [conversationId, user?.id || null]
      );

      if (convCheck.rows.length === 0) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          },
        });
      }

      const updates = validation.data;
      const updateFields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (updates.user_rating !== undefined) {
        updateFields.push(`user_rating = $${paramIndex}`);
        params.push(updates.user_rating);
        paramIndex++;
      }
      if (updates.user_feedback !== undefined) {
        updateFields.push(`user_feedback = $${paramIndex}`);
        params.push(updates.user_feedback);
        paramIndex++;
      }
      if (updates.metadata !== undefined) {
        updateFields.push(`metadata = $${paramIndex}`);
        params.push(updates.metadata);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          error: {
            code: 'NO_UPDATES',
            message: 'No valid fields to update',
          },
        });
      }

      params.push(messageId, conversationId);

      const query = `
        UPDATE meta_messages
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND conversation_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await db.query<Message>(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Message not found',
          },
        });
      }

      logger.info({ userId: user?.id, conversationId, messageId }, 'Message updated');
      res.json({ data: result.rows[0] });
    } catch (error: any) {
      logger.error({ error: error.message, messageId: req.params.messageId }, 'Failed to update message');
      res.status(500).json({
        error: {
          code: 'UPDATE_MESSAGE_ERROR',
          message: error.message,
        },
      });
    }
  });

  /**
   * DELETE /api/conversations/:conversationId/messages/:messageId
   * Delete a message
   */
  router.delete('/:conversationId/messages/:messageId', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getUserFromRequest(req);
      const { conversationId, messageId } = req.params;

      // Verify conversation exists and user has access
      const convCheck = await db.query(
        `SELECT id FROM meta_conversations
         WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)`,
        [conversationId, user?.id || null]
      );

      if (convCheck.rows.length === 0) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          },
        });
      }

      const result = await db.query(
        `DELETE FROM meta_messages
         WHERE id = $1 AND conversation_id = $2
         RETURNING id`,
        [messageId, conversationId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Message not found',
          },
        });
      }

      logger.info({ userId: user?.id, conversationId, messageId }, 'Message deleted');
      res.status(204).send();
    } catch (error: any) {
      logger.error({ error: error.message, messageId: req.params.messageId }, 'Failed to delete message');
      res.status(500).json({
        error: {
          code: 'DELETE_MESSAGE_ERROR',
          message: error.message,
        },
      });
    }
  });

  return router;
}

// ============================================================================
// Standalone Message Routes (alternative endpoint structure)
// ============================================================================

export function createMessagesRoutes(db: Pool, logger: Logger): Router {
  const router = Router();

  /**
   * POST /api/messages
   * Create a message (alternative to /conversations/:id/messages)
   */
  router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getUserFromRequest(req);
      const validation = CreateMessageSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: validation.error.errors,
          },
        });
      }

      const {
        conversation_id,
        role,
        content,
        content_type,
        parent_message_id,
        tool_name,
        tool_input,
        tool_output,
        tokens_used,
        metadata,
      } = validation.data;

      // Verify conversation exists and user has access
      const convCheck = await db.query(
        `SELECT id FROM meta_conversations
         WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)`,
        [conversation_id, user?.id || null]
      );

      if (convCheck.rows.length === 0) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          },
        });
      }

      const result = await db.query<Message>(
        `INSERT INTO meta_messages (
          conversation_id, role, content, content_type,
          parent_message_id, tool_name, tool_input, tool_output,
          tokens_used, metadata, is_active_branch
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE)
         RETURNING *`,
        [
          conversation_id,
          role,
          content,
          content_type,
          parent_message_id || null,
          tool_name || null,
          tool_input || null,
          tool_output || null,
          tokens_used || 0,
          metadata || {},
        ]
      );

      const message = result.rows[0];
      logger.info({ userId: user?.id, conversationId: conversation_id, messageId: message.id }, 'Message created');

      res.status(201).json({ data: message });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to create message');
      res.status(500).json({
        error: {
          code: 'CREATE_MESSAGE_ERROR',
          message: error.message,
        },
      });
    }
  });

  /**
   * GET /api/messages/:id
   * Get a single message by ID
   */
  router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getUserFromRequest(req);
      const messageId = req.params.id;

      const result = await db.query<Message & { user_id: string | null }>(
        `SELECT m.*, c.user_id
         FROM meta_messages m
         JOIN meta_conversations c ON m.conversation_id = c.id
         WHERE m.id = $1 AND (c.user_id = $2 OR c.user_id IS NULL)`,
        [messageId, user?.id || null]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Message not found',
          },
        });
      }

      res.json({ data: result.rows[0] });
    } catch (error: any) {
      logger.error({ error: error.message, id: req.params.id }, 'Failed to get message');
      res.status(500).json({
        error: {
          code: 'GET_MESSAGE_ERROR',
          message: error.message,
        },
      });
    }
  });

  return router;
}
