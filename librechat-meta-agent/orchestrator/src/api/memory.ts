import { Express, Request, Response } from 'express';
import { Logger } from 'pino';
import { MemoryService } from '../services/memory-service';

export function setupMemoryRoutes(
  app: Express,
  memoryService: MemoryService,
  logger: Logger
) {
  /**
   * GET /api/memory
   * List all memories with optional filters
   */
  app.get('/api/memory', async (req: Request, res: Response) => {
    try {
      const { user_id, project_id, category, enabled, limit } = req.query;

      const filters: any = {};
      if (user_id) filters.user_id = user_id as string;
      if (project_id) filters.project_id = project_id as string;
      if (category) filters.category = category as string;
      if (enabled !== undefined) filters.enabled = enabled === 'true';
      if (limit) filters.limit = parseInt(limit as string);

      const memories = await memoryService.listMemories(filters);

      res.json({
        data: memories,
        count: memories.length,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to list memories');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'MEMORY_LIST_ERROR',
        },
      });
    }
  });

  /**
   * GET /api/memory/stats
   * Get memory statistics
   */
  app.get('/api/memory/stats', async (req: Request, res: Response) => {
    try {
      const { user_id, project_id } = req.query;

      const filters: any = {};
      if (user_id) filters.user_id = user_id as string;
      if (project_id) filters.project_id = project_id as string;

      const stats = await memoryService.getStats(filters);

      res.json({ data: stats });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to get memory stats');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'MEMORY_STATS_ERROR',
        },
      });
    }
  });

  /**
   * GET /api/memory/:id
   * Get a specific memory by ID
   */
  app.get('/api/memory/:id', async (req: Request, res: Response) => {
    try {
      const memory = await memoryService.getMemory(req.params.id);

      if (!memory) {
        return res.status(404).json({
          error: {
            message: 'Memory not found',
            code: 'MEMORY_NOT_FOUND',
          },
        });
      }

      res.json({ data: memory });
    } catch (error: any) {
      logger.error({ error: error.message, id: req.params.id }, 'Failed to get memory');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'MEMORY_GET_ERROR',
        },
      });
    }
  });

  /**
   * POST /api/memory
   * Create a new memory
   */
  app.post('/api/memory', async (req: Request, res: Response) => {
    try {
      const {
        user_id,
        project_id,
        content,
        category,
        importance_score,
        fact_type,
        source_task_id,
        expires_at,
      } = req.body;

      // Validation
      if (!project_id || !content) {
        return res.status(400).json({
          error: {
            message: 'project_id and content are required',
            code: 'INVALID_INPUT',
          },
        });
      }

      if (category && !['preference', 'fact', 'instruction', 'context'].includes(category)) {
        return res.status(400).json({
          error: {
            message: 'category must be one of: preference, fact, instruction, context',
            code: 'INVALID_CATEGORY',
          },
        });
      }

      const memory = await memoryService.createMemory({
        user_id,
        project_id,
        content,
        category,
        importance_score,
        fact_type,
        source_task_id,
        expires_at: expires_at ? new Date(expires_at) : undefined,
      });

      res.status(201).json({ data: memory });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to create memory');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'MEMORY_CREATE_ERROR',
        },
      });
    }
  });

  /**
   * PATCH /api/memory/:id
   * Update a memory
   */
  app.patch('/api/memory/:id', async (req: Request, res: Response) => {
    try {
      const { content, category, enabled, importance_score } = req.body;

      const updates: any = {};
      if (content !== undefined) updates.content = content;
      if (category !== undefined) updates.category = category;
      if (enabled !== undefined) updates.enabled = enabled;
      if (importance_score !== undefined) updates.importance_score = importance_score;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          error: {
            message: 'No valid fields to update',
            code: 'INVALID_INPUT',
          },
        });
      }

      const memory = await memoryService.updateMemory(req.params.id, updates);

      res.json({ data: memory });
    } catch (error: any) {
      logger.error({ error: error.message, id: req.params.id }, 'Failed to update memory');

      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: {
            message: error.message,
            code: 'MEMORY_NOT_FOUND',
          },
        });
      }

      res.status(500).json({
        error: {
          message: error.message,
          code: 'MEMORY_UPDATE_ERROR',
        },
      });
    }
  });

  /**
   * DELETE /api/memory/:id
   * Delete a memory
   */
  app.delete('/api/memory/:id', async (req: Request, res: Response) => {
    try {
      await memoryService.deleteMemory(req.params.id);

      res.status(204).send();
    } catch (error: any) {
      logger.error({ error: error.message, id: req.params.id }, 'Failed to delete memory');

      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: {
            message: error.message,
            code: 'MEMORY_NOT_FOUND',
          },
        });
      }

      res.status(500).json({
        error: {
          message: error.message,
          code: 'MEMORY_DELETE_ERROR',
        },
      });
    }
  });

  /**
   * POST /api/memory/search
   * Semantic search for memories
   */
  app.post('/api/memory/search', async (req: Request, res: Response) => {
    try {
      const { user_id, project_id, query, category, limit, min_similarity } = req.body;

      if (!query) {
        return res.status(400).json({
          error: {
            message: 'query is required',
            code: 'INVALID_INPUT',
          },
        });
      }

      const results = await memoryService.searchMemories({
        user_id,
        project_id,
        query,
        category,
        limit,
        min_similarity,
      });

      res.json({
        data: results,
        count: results.length,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to search memories');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'MEMORY_SEARCH_ERROR',
        },
      });
    }
  });

  /**
   * POST /api/memory/extract
   * Auto-extract memories from conversation
   */
  app.post('/api/memory/extract', async (req: Request, res: Response) => {
    try {
      const { user_id, project_id, conversation, auto_save } = req.body;

      if (!project_id || !conversation || !Array.isArray(conversation)) {
        return res.status(400).json({
          error: {
            message: 'project_id and conversation (array) are required',
            code: 'INVALID_INPUT',
          },
        });
      }

      // Validate conversation format
      for (const msg of conversation) {
        if (!msg.role || !msg.content) {
          return res.status(400).json({
            error: {
              message: 'Each conversation message must have role and content',
              code: 'INVALID_CONVERSATION',
            },
          });
        }
      }

      const memories = await memoryService.extractMemories({
        user_id,
        project_id,
        conversation,
        auto_save: auto_save !== false, // Default to true
      });

      res.status(201).json({
        data: memories,
        count: memories.length,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to extract memories');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'MEMORY_EXTRACT_ERROR',
        },
      });
    }
  });

  /**
   * POST /api/memory/relevant
   * Get relevant memories for a given context
   */
  app.post('/api/memory/relevant', async (req: Request, res: Response) => {
    try {
      const { user_id, project_id, context, limit, categories } = req.body;

      if (!project_id || !context) {
        return res.status(400).json({
          error: {
            message: 'project_id and context are required',
            code: 'INVALID_INPUT',
          },
        });
      }

      const memories = await memoryService.getRelevantMemories({
        user_id,
        project_id,
        context,
        limit,
        categories,
      });

      res.json({
        data: memories,
        count: memories.length,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to get relevant memories');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'MEMORY_RELEVANT_ERROR',
        },
      });
    }
  });

  /**
   * POST /api/memory/bulk-toggle
   * Toggle multiple memories on/off
   */
  app.post('/api/memory/bulk-toggle', async (req: Request, res: Response) => {
    try {
      const { ids, enabled } = req.body;

      if (!Array.isArray(ids) || enabled === undefined) {
        return res.status(400).json({
          error: {
            message: 'ids (array) and enabled (boolean) are required',
            code: 'INVALID_INPUT',
          },
        });
      }

      const updates = await Promise.all(
        ids.map((id) => memoryService.updateMemory(id, { enabled }))
      );

      res.json({
        data: updates,
        count: updates.length,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to bulk toggle memories');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'MEMORY_BULK_TOGGLE_ERROR',
        },
      });
    }
  });

  /**
   * DELETE /api/memory/bulk
   * Delete multiple memories
   */
  app.delete('/api/memory/bulk', async (req: Request, res: Response) => {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids)) {
        return res.status(400).json({
          error: {
            message: 'ids (array) is required',
            code: 'INVALID_INPUT',
          },
        });
      }

      await Promise.all(ids.map((id) => memoryService.deleteMemory(id)));

      res.status(204).send();
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to bulk delete memories');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'MEMORY_BULK_DELETE_ERROR',
        },
      });
    }
  });
}
