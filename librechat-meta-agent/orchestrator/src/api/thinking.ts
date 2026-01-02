import { Express, Request, Response } from 'express';
import { Logger } from 'pino';
import { ExtendedThinkingEngine, ThinkingConfig } from '../services/extended-thinking';

/**
 * Setup Extended Thinking API Routes
 *
 * Endpoints for managing thinking sessions, expanding thoughts,
 * critiquing reasoning, exploring alternatives, and streaming thinking processes
 */
export function setupThinkingRoutes(
  app: Express,
  thinkingEngine: ExtendedThinkingEngine,
  logger: Logger
) {
  /**
   * POST /api/thinking/start
   * Start a new thinking session
   *
   * Body:
   * - query: string (required) - The question or problem to think about
   * - config: Partial<ThinkingConfig> (optional) - Thinking configuration
   * - user_id: string (optional) - User ID
   * - project_id: string (optional) - Project ID
   */
  app.post('/api/thinking/start', async (req: Request, res: Response) => {
    try {
      const { query, config, user_id, project_id } = req.body;

      // Validation
      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          error: {
            message: 'query (string) is required',
            code: 'INVALID_INPUT',
          },
        });
      }

      // Validate config if provided
      if (config) {
        if (config.maxTokens && (config.maxTokens < 100 || config.maxTokens > 100000)) {
          return res.status(400).json({
            error: {
              message: 'maxTokens must be between 100 and 100,000',
              code: 'INVALID_CONFIG',
            },
          });
        }

        if (config.maxDepth && (config.maxDepth < 1 || config.maxDepth > 50)) {
          return res.status(400).json({
            error: {
              message: 'maxDepth must be between 1 and 50',
              code: 'INVALID_CONFIG',
            },
          });
        }

        if (config.maxBranches && (config.maxBranches < 1 || config.maxBranches > 10)) {
          return res.status(400).json({
            error: {
              message: 'maxBranches must be between 1 and 10',
              code: 'INVALID_CONFIG',
            },
          });
        }
      }

      const session = await thinkingEngine.startThinking(
        query,
        config || {},
        user_id,
        project_id || 'default'
      );

      res.status(201).json({
        data: session,
        message: 'Thinking session started',
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to start thinking session');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'THINKING_START_ERROR',
        },
      });
    }
  });

  /**
   * POST /api/thinking/:sessionId/expand
   * Expand a thought node (create child nodes)
   *
   * Body:
   * - node_id: string (required) - The node to expand from
   * - count: number (optional) - Number of child nodes to create (default: 1)
   */
  app.post('/api/thinking/:sessionId/expand', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { node_id, count } = req.body;

      if (!node_id) {
        return res.status(400).json({
          error: {
            message: 'node_id is required',
            code: 'INVALID_INPUT',
          },
        });
      }

      const nodes = await thinkingEngine.expandThought(
        sessionId,
        node_id,
        count || 1
      );

      res.json({
        data: nodes,
        count: nodes.length,
        message: 'Thought expanded successfully',
      });
    } catch (error: any) {
      logger.error(
        { error: error.message, sessionId: req.params.sessionId },
        'Failed to expand thought'
      );

      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: {
            message: error.message,
            code: 'NOT_FOUND',
          },
        });
      }

      if (error.message.includes('budget exceeded') || error.message.includes('not in thinking')) {
        return res.status(400).json({
          error: {
            message: error.message,
            code: 'INVALID_STATE',
          },
        });
      }

      res.status(500).json({
        error: {
          message: error.message,
          code: 'THINKING_EXPAND_ERROR',
        },
      });
    }
  });

  /**
   * POST /api/thinking/:sessionId/critique
   * Generate a self-critique of a reasoning node
   *
   * Body:
   * - node_id: string (required) - The node to critique
   */
  app.post('/api/thinking/:sessionId/critique', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { node_id } = req.body;

      if (!node_id) {
        return res.status(400).json({
          error: {
            message: 'node_id is required',
            code: 'INVALID_INPUT',
          },
        });
      }

      const critiqueNode = await thinkingEngine.critiqueReasoning(sessionId, node_id);

      res.status(201).json({
        data: critiqueNode,
        message: 'Critique generated successfully',
      });
    } catch (error: any) {
      logger.error(
        { error: error.message, sessionId: req.params.sessionId },
        'Failed to critique reasoning'
      );

      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: {
            message: error.message,
            code: 'NOT_FOUND',
          },
        });
      }

      res.status(500).json({
        error: {
          message: error.message,
          code: 'THINKING_CRITIQUE_ERROR',
        },
      });
    }
  });

  /**
   * POST /api/thinking/:sessionId/alternatives
   * Explore alternative reasoning paths
   *
   * Body:
   * - node_id: string (required) - The node to branch from
   * - count: number (optional) - Number of alternatives to generate (default: 3)
   */
  app.post('/api/thinking/:sessionId/alternatives', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { node_id, count } = req.body;

      if (!node_id) {
        return res.status(400).json({
          error: {
            message: 'node_id is required',
            code: 'INVALID_INPUT',
          },
        });
      }

      const alternatives = await thinkingEngine.exploreAlternatives(
        sessionId,
        node_id,
        count || 3
      );

      res.status(201).json({
        data: alternatives,
        count: alternatives.length,
        message: 'Alternatives generated successfully',
      });
    } catch (error: any) {
      logger.error(
        { error: error.message, sessionId: req.params.sessionId },
        'Failed to explore alternatives'
      );

      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: {
            message: error.message,
            code: 'NOT_FOUND',
          },
        });
      }

      res.status(500).json({
        error: {
          message: error.message,
          code: 'THINKING_ALTERNATIVES_ERROR',
        },
      });
    }
  });

  /**
   * POST /api/thinking/:sessionId/pause
   * Pause an active thinking session
   */
  app.post('/api/thinking/:sessionId/pause', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      await thinkingEngine.pauseThinking(sessionId);

      res.json({
        message: 'Thinking session paused',
      });
    } catch (error: any) {
      logger.error(
        { error: error.message, sessionId: req.params.sessionId },
        'Failed to pause thinking'
      );

      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: {
            message: error.message,
            code: 'NOT_FOUND',
          },
        });
      }

      res.status(500).json({
        error: {
          message: error.message,
          code: 'THINKING_PAUSE_ERROR',
        },
      });
    }
  });

  /**
   * POST /api/thinking/:sessionId/resume
   * Resume a paused thinking session
   */
  app.post('/api/thinking/:sessionId/resume', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      await thinkingEngine.resumeThinking(sessionId);

      res.json({
        message: 'Thinking session resumed',
      });
    } catch (error: any) {
      logger.error(
        { error: error.message, sessionId: req.params.sessionId },
        'Failed to resume thinking'
      );

      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: {
            message: error.message,
            code: 'NOT_FOUND',
          },
        });
      }

      if (error.message.includes('not paused')) {
        return res.status(400).json({
          error: {
            message: error.message,
            code: 'INVALID_STATE',
          },
        });
      }

      res.status(500).json({
        error: {
          message: error.message,
          code: 'THINKING_RESUME_ERROR',
        },
      });
    }
  });

  /**
   * GET /api/thinking/:sessionId/tree
   * Get the complete thought tree for visualization
   */
  app.get('/api/thinking/:sessionId/tree', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      const tree = await thinkingEngine.getThoughtTree(sessionId);

      res.json({
        data: tree,
        count: tree.length,
      });
    } catch (error: any) {
      logger.error(
        { error: error.message, sessionId: req.params.sessionId },
        'Failed to get thought tree'
      );

      res.status(500).json({
        error: {
          message: error.message,
          code: 'THINKING_TREE_ERROR',
        },
      });
    }
  });

  /**
   * POST /api/thinking/:sessionId/bookmark/:nodeId
   * Bookmark a thought branch
   *
   * Body:
   * - user_id: string (optional) - User ID
   * - note: string (optional) - Note about the bookmark
   */
  app.post(
    '/api/thinking/:sessionId/bookmark/:nodeId',
    async (req: Request, res: Response) => {
      try {
        const { sessionId, nodeId } = req.params;
        const { user_id, note } = req.body;

        await thinkingEngine.bookmarkBranch(sessionId, nodeId, user_id, note);

        res.json({
          message: 'Thought branch bookmarked',
        });
      } catch (error: any) {
        logger.error(
          { error: error.message, sessionId: req.params.sessionId, nodeId: req.params.nodeId },
          'Failed to bookmark thought'
        );

        if (error.message.includes('not found')) {
          return res.status(404).json({
            error: {
              message: error.message,
              code: 'NOT_FOUND',
            },
          });
        }

        res.status(500).json({
          error: {
            message: error.message,
            code: 'THINKING_BOOKMARK_ERROR',
          },
        });
      }
    }
  );

  /**
   * POST /api/thinking/:sessionId/conclude
   * Synthesize a final conclusion from the thought tree
   */
  app.post('/api/thinking/:sessionId/conclude', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      const conclusion = await thinkingEngine.synthesizeConclusion(sessionId);

      res.json({
        data: {
          conclusion,
        },
        message: 'Conclusion synthesized successfully',
      });
    } catch (error: any) {
      logger.error(
        { error: error.message, sessionId: req.params.sessionId },
        'Failed to synthesize conclusion'
      );

      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: {
            message: error.message,
            code: 'NOT_FOUND',
          },
        });
      }

      res.status(500).json({
        error: {
          message: error.message,
          code: 'THINKING_CONCLUDE_ERROR',
        },
      });
    }
  });

  /**
   * GET /api/thinking/:sessionId/stream
   * Server-Sent Events stream of thinking process
   */
  app.get('/api/thinking/:sessionId/stream', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

      // Send initial connection event
      res.write('data: {"type":"connected","sessionId":"' + sessionId + '"}\n\n');

      // Stream thinking events
      const stream = thinkingEngine.streamThinking(sessionId);

      for await (const event of stream) {
        const eventData = JSON.stringify(event);
        res.write(`data: ${eventData}\n\n`);

        // If session completed, close the stream
        if (event.type === 'session_completed' || event.type === 'error') {
          break;
        }
      }

      // Close the connection
      res.write('data: {"type":"stream_end"}\n\n');
      res.end();
    } catch (error: any) {
      logger.error(
        { error: error.message, sessionId: req.params.sessionId },
        'Failed to stream thinking'
      );

      // Send error event
      const errorEvent = JSON.stringify({
        type: 'error',
        message: error.message,
        timestamp: new Date(),
      });
      res.write(`data: ${errorEvent}\n\n`);
      res.end();
    }
  });

  /**
   * GET /api/thinking/templates
   * List available reasoning templates
   */
  app.get('/api/thinking/templates', async (req: Request, res: Response) => {
    try {
      const templates = thinkingEngine.getTemplates();

      res.json({
        data: templates,
        count: templates.length,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to get templates');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'THINKING_TEMPLATES_ERROR',
        },
      });
    }
  });

  /**
   * GET /api/thinking/:sessionId
   * Get thinking session details
   */
  app.get('/api/thinking/:sessionId', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      // Use internal method to get session
      const session = await (thinkingEngine as any).getSession(sessionId);

      if (!session) {
        return res.status(404).json({
          error: {
            message: 'Session not found',
            code: 'NOT_FOUND',
          },
        });
      }

      res.json({
        data: session,
      });
    } catch (error: any) {
      logger.error(
        { error: error.message, sessionId: req.params.sessionId },
        'Failed to get session'
      );

      res.status(500).json({
        error: {
          message: error.message,
          code: 'THINKING_GET_SESSION_ERROR',
        },
      });
    }
  });

  /**
   * GET /api/thinking
   * List thinking sessions with filters
   *
   * Query params:
   * - user_id: string (optional)
   * - project_id: string (optional)
   * - status: string (optional)
   * - limit: number (optional)
   */
  app.get('/api/thinking', async (req: Request, res: Response) => {
    try {
      const { user_id, project_id, status, limit } = req.query;

      let query = 'SELECT * FROM thinking_sessions WHERE 1=1';
      const params: any[] = [];

      if (user_id) {
        params.push(user_id);
        query += ` AND user_id = $${params.length}`;
      }

      if (project_id) {
        params.push(project_id);
        query += ` AND project_id = $${params.length}`;
      }

      if (status) {
        params.push(status);
        query += ` AND status = $${params.length}`;
      }

      query += ' ORDER BY created_at DESC';

      if (limit) {
        params.push(parseInt(limit as string));
        query += ` LIMIT $${params.length}`;
      } else {
        query += ' LIMIT 50';
      }

      const { rows } = await (thinkingEngine as any).db.query(query, params);

      const sessions = rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        projectId: row.project_id,
        query: row.query,
        status: row.status,
        stats: JSON.parse(row.stats),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        completedAt: row.completed_at,
      }));

      res.json({
        data: sessions,
        count: sessions.length,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to list sessions');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'THINKING_LIST_ERROR',
        },
      });
    }
  });

  /**
   * DELETE /api/thinking/:sessionId
   * Delete a thinking session
   */
  app.delete('/api/thinking/:sessionId', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      // Delete nodes first
      await (thinkingEngine as any).db.query(
        'DELETE FROM thought_nodes WHERE session_id = $1',
        [sessionId]
      );

      // Delete session
      const result = await (thinkingEngine as any).db.query(
        'DELETE FROM thinking_sessions WHERE id = $1',
        [sessionId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: {
            message: 'Session not found',
            code: 'NOT_FOUND',
          },
        });
      }

      // Remove from cache
      (thinkingEngine as any).activeSessions.delete(sessionId);
      (thinkingEngine as any).sessionNodes.delete(sessionId);

      res.status(204).send();
    } catch (error: any) {
      logger.error(
        { error: error.message, sessionId: req.params.sessionId },
        'Failed to delete session'
      );

      res.status(500).json({
        error: {
          message: error.message,
          code: 'THINKING_DELETE_ERROR',
        },
      });
    }
  });

  logger.info('Thinking routes registered');
}
