import { Express, Request, Response } from 'express';
import { Logger } from 'pino';
import { PersonasEngine } from '../services/personas';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'persona-knowledge');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/json',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, TXT, MD, JSON, CSV, DOCX, XLSX'));
    }
  },
});

export function setupPersonasRoutes(
  app: Express,
  personasEngine: PersonasEngine,
  logger: Logger
) {
  /**
   * POST /api/personas
   * Create a new persona
   */
  app.post('/api/personas', async (req: Request, res: Response) => {
    try {
      const {
        creator_id,
        name,
        description,
        category,
        system_prompt,
        starter_prompts,
        personality,
        capabilities,
        model_config,
        voice_config,
        visibility,
        avatar_url,
      } = req.body;

      // Validation
      if (!creator_id || !name || !description || !system_prompt) {
        return res.status(400).json({
          error: {
            message: 'creator_id, name, description, and system_prompt are required',
            code: 'INVALID_INPUT',
          },
        });
      }

      const persona = await personasEngine.createPersona({
        creator_id,
        name,
        description,
        category,
        system_prompt,
        starter_prompts,
        personality,
        capabilities,
        model_config,
        voice_config,
        visibility,
        avatar_url,
      });

      res.status(201).json({ data: persona });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to create persona');

      if (error.message.includes('already exists')) {
        return res.status(409).json({
          error: {
            message: error.message,
            code: 'PERSONA_EXISTS',
          },
        });
      }

      res.status(500).json({
        error: {
          message: error.message,
          code: 'PERSONA_CREATE_ERROR',
        },
      });
    }
  });

  /**
   * GET /api/personas
   * List user's personas
   */
  app.get('/api/personas', async (req: Request, res: Response) => {
    try {
      const { user_id } = req.query;

      if (!user_id) {
        return res.status(400).json({
          error: {
            message: 'user_id is required',
            code: 'INVALID_INPUT',
          },
        });
      }

      const personas = await personasEngine.getUserPersonas(user_id as string);

      res.json({
        data: personas,
        count: personas.length,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to list personas');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'PERSONA_LIST_ERROR',
        },
      });
    }
  });

  /**
   * GET /api/personas/explore
   * Browse public personas
   */
  app.get('/api/personas/explore', async (req: Request, res: Response) => {
    try {
      const { query, category, featured, limit, offset } = req.query;

      const personas = await personasEngine.searchPersonas(
        (query as string) || '',
        {
          category: category as string,
          featured: featured === 'true',
          limit: limit ? parseInt(limit as string) : 20,
          offset: offset ? parseInt(offset as string) : 0,
        }
      );

      res.json({
        data: personas,
        count: personas.length,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to explore personas');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'PERSONA_EXPLORE_ERROR',
        },
      });
    }
  });

  /**
   * GET /api/personas/featured
   * Get featured personas
   */
  app.get('/api/personas/featured', async (req: Request, res: Response) => {
    try {
      const { limit } = req.query;

      const personas = await personasEngine.getFeaturedPersonas(
        limit ? parseInt(limit as string) : 10
      );

      res.json({
        data: personas,
        count: personas.length,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to get featured personas');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'PERSONA_FEATURED_ERROR',
        },
      });
    }
  });

  /**
   * GET /api/personas/:id
   * Get a specific persona
   */
  app.get('/api/personas/:id', async (req: Request, res: Response) => {
    try {
      const persona = await personasEngine.getPersonaWithStats(req.params.id);

      res.json({ data: persona });
    } catch (error: any) {
      logger.error({ error: error.message, id: req.params.id }, 'Failed to get persona');

      if (error.message === 'Persona not found') {
        return res.status(404).json({
          error: {
            message: error.message,
            code: 'PERSONA_NOT_FOUND',
          },
        });
      }

      res.status(500).json({
        error: {
          message: error.message,
          code: 'PERSONA_GET_ERROR',
        },
      });
    }
  });

  /**
   * PUT /api/personas/:id
   * Update a persona
   */
  app.put('/api/personas/:id', async (req: Request, res: Response) => {
    try {
      const { creator_id, ...updates } = req.body;

      if (!creator_id) {
        return res.status(400).json({
          error: {
            message: 'creator_id is required for authorization',
            code: 'INVALID_INPUT',
          },
        });
      }

      const persona = await personasEngine.updatePersona(
        req.params.id,
        creator_id,
        updates
      );

      res.json({ data: persona });
    } catch (error: any) {
      logger.error({ error: error.message, id: req.params.id }, 'Failed to update persona');

      if (error.message === 'Persona not found') {
        return res.status(404).json({
          error: {
            message: error.message,
            code: 'PERSONA_NOT_FOUND',
          },
        });
      }

      if (error.message.includes('Unauthorized')) {
        return res.status(403).json({
          error: {
            message: error.message,
            code: 'UNAUTHORIZED',
          },
        });
      }

      res.status(500).json({
        error: {
          message: error.message,
          code: 'PERSONA_UPDATE_ERROR',
        },
      });
    }
  });

  /**
   * DELETE /api/personas/:id
   * Delete a persona
   */
  app.delete('/api/personas/:id', async (req: Request, res: Response) => {
    try {
      const { creator_id } = req.query;

      if (!creator_id) {
        return res.status(400).json({
          error: {
            message: 'creator_id is required for authorization',
            code: 'INVALID_INPUT',
          },
        });
      }

      await personasEngine.deletePersona(req.params.id, creator_id as string);

      res.status(204).send();
    } catch (error: any) {
      logger.error({ error: error.message, id: req.params.id }, 'Failed to delete persona');

      if (error.message === 'Persona not found') {
        return res.status(404).json({
          error: {
            message: error.message,
            code: 'PERSONA_NOT_FOUND',
          },
        });
      }

      if (error.message.includes('Unauthorized')) {
        return res.status(403).json({
          error: {
            message: error.message,
            code: 'UNAUTHORIZED',
          },
        });
      }

      res.status(500).json({
        error: {
          message: error.message,
          code: 'PERSONA_DELETE_ERROR',
        },
      });
    }
  });

  /**
   * POST /api/personas/:id/fork
   * Fork a public persona
   */
  app.post('/api/personas/:id/fork', async (req: Request, res: Response) => {
    try {
      const { user_id } = req.body;

      if (!user_id) {
        return res.status(400).json({
          error: {
            message: 'user_id is required',
            code: 'INVALID_INPUT',
          },
        });
      }

      const forked = await personasEngine.forkPersona(req.params.id, user_id);

      res.status(201).json({ data: forked });
    } catch (error: any) {
      logger.error({ error: error.message, id: req.params.id }, 'Failed to fork persona');

      if (error.message === 'Persona not found') {
        return res.status(404).json({
          error: {
            message: error.message,
            code: 'PERSONA_NOT_FOUND',
          },
        });
      }

      if (error.message.includes('Cannot fork')) {
        return res.status(403).json({
          error: {
            message: error.message,
            code: 'FORK_NOT_ALLOWED',
          },
        });
      }

      res.status(500).json({
        error: {
          message: error.message,
          code: 'PERSONA_FORK_ERROR',
        },
      });
    }
  });

  /**
   * POST /api/personas/:id/knowledge
   * Upload knowledge files to persona
   */
  app.post(
    '/api/personas/:id/knowledge',
    upload.array('files', 10),
    async (req: Request, res: Response) => {
      try {
        const { creator_id } = req.body;
        const files = req.files as Express.Multer.File[];

        if (!creator_id) {
          return res.status(400).json({
            error: {
              message: 'creator_id is required',
              code: 'INVALID_INPUT',
            },
          });
        }

        if (!files || files.length === 0) {
          return res.status(400).json({
            error: {
              message: 'No files uploaded',
              code: 'NO_FILES',
            },
          });
        }

        const knowledgeFiles = files.map((file) => ({
          file_name: file.originalname,
          file_type: file.mimetype,
          file_size: file.size,
          storage_path: file.path,
        }));

        const knowledge = await personasEngine.addKnowledge(
          req.params.id,
          creator_id,
          knowledgeFiles
        );

        res.status(201).json({
          data: knowledge,
          count: knowledge.length,
        });
      } catch (error: any) {
        logger.error(
          { error: error.message, id: req.params.id },
          'Failed to add knowledge'
        );

        if (error.message.includes('Unauthorized')) {
          return res.status(403).json({
            error: {
              message: error.message,
              code: 'UNAUTHORIZED',
            },
          });
        }

        res.status(500).json({
          error: {
            message: error.message,
            code: 'KNOWLEDGE_ADD_ERROR',
          },
        });
      }
    }
  );

  /**
   * GET /api/personas/:id/knowledge
   * Get knowledge files for persona
   */
  app.get('/api/personas/:id/knowledge', async (req: Request, res: Response) => {
    try {
      const knowledge = await personasEngine.getKnowledge(req.params.id);

      res.json({
        data: knowledge,
        count: knowledge.length,
      });
    } catch (error: any) {
      logger.error({ error: error.message, id: req.params.id }, 'Failed to get knowledge');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'KNOWLEDGE_GET_ERROR',
        },
      });
    }
  });

  /**
   * DELETE /api/personas/:id/knowledge/:fileId
   * Remove knowledge file from persona
   */
  app.delete(
    '/api/personas/:id/knowledge/:fileId',
    async (req: Request, res: Response) => {
      try {
        const { creator_id } = req.query;

        if (!creator_id) {
          return res.status(400).json({
            error: {
              message: 'creator_id is required',
              code: 'INVALID_INPUT',
            },
          });
        }

        await personasEngine.removeKnowledge(
          req.params.id,
          req.params.fileId,
          creator_id as string
        );

        res.status(204).send();
      } catch (error: any) {
        logger.error(
          { error: error.message, id: req.params.id, fileId: req.params.fileId },
          'Failed to remove knowledge'
        );

        if (error.message.includes('Unauthorized')) {
          return res.status(403).json({
            error: {
              message: error.message,
              code: 'UNAUTHORIZED',
            },
          });
        }

        res.status(500).json({
          error: {
            message: error.message,
            code: 'KNOWLEDGE_REMOVE_ERROR',
          },
        });
      }
    }
  );

  /**
   * POST /api/personas/:id/like
   * Toggle like on persona
   */
  app.post('/api/personas/:id/like', async (req: Request, res: Response) => {
    try {
      const { user_id } = req.body;

      if (!user_id) {
        return res.status(400).json({
          error: {
            message: 'user_id is required',
            code: 'INVALID_INPUT',
          },
        });
      }

      const liked = await personasEngine.toggleLike(req.params.id, user_id);

      res.json({ data: { liked } });
    } catch (error: any) {
      logger.error({ error: error.message, id: req.params.id }, 'Failed to toggle like');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'LIKE_TOGGLE_ERROR',
        },
      });
    }
  });

  /**
   * GET /api/personas/:id/liked
   * Check if user has liked persona
   */
  app.get('/api/personas/:id/liked', async (req: Request, res: Response) => {
    try {
      const { user_id } = req.query;

      if (!user_id) {
        return res.status(400).json({
          error: {
            message: 'user_id is required',
            code: 'INVALID_INPUT',
          },
        });
      }

      const liked = await personasEngine.hasLiked(req.params.id, user_id as string);

      res.json({ data: { liked } });
    } catch (error: any) {
      logger.error({ error: error.message, id: req.params.id }, 'Failed to check like status');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'LIKE_CHECK_ERROR',
        },
      });
    }
  });

  /**
   * GET /api/personas/:id/analytics
   * Get persona analytics (requires ownership)
   */
  app.get('/api/personas/:id/analytics', async (req: Request, res: Response) => {
    try {
      const { creator_id } = req.query;

      if (!creator_id) {
        return res.status(400).json({
          error: {
            message: 'creator_id is required',
            code: 'INVALID_INPUT',
          },
        });
      }

      const analytics = await personasEngine.getAnalytics(
        req.params.id,
        creator_id as string
      );

      res.json({ data: analytics });
    } catch (error: any) {
      logger.error({ error: error.message, id: req.params.id }, 'Failed to get analytics');

      if (error.message.includes('Unauthorized')) {
        return res.status(403).json({
          error: {
            message: error.message,
            code: 'UNAUTHORIZED',
          },
        });
      }

      res.status(500).json({
        error: {
          message: error.message,
          code: 'ANALYTICS_ERROR',
        },
      });
    }
  });

  /**
   * POST /api/personas/:id/chat
   * Chat with persona (Server-Sent Events for streaming)
   */
  app.post('/api/personas/:id/chat', async (req: Request, res: Response) => {
    try {
      const { user_id, message, conversation_id } = req.body;

      if (!user_id || !message) {
        return res.status(400).json({
          error: {
            message: 'user_id and message are required',
            code: 'INVALID_INPUT',
          },
        });
      }

      // Set headers for SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Stream response
      const stream = personasEngine.chat(
        req.params.id,
        user_id,
        message,
        conversation_id
      );

      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify({ type: 'chunk', data: chunk })}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    } catch (error: any) {
      logger.error({ error: error.message, id: req.params.id }, 'Failed to chat');

      if (!res.headersSent) {
        res.status(500).json({
          error: {
            message: error.message,
            code: 'CHAT_ERROR',
          },
        });
      } else {
        res.write(
          `data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`
        );
        res.end();
      }
    }
  });

  /**
   * GET /api/personas/:id/conversations
   * Get user's conversations with persona
   */
  app.get('/api/personas/:id/conversations', async (req: Request, res: Response) => {
    try {
      const { user_id, limit } = req.query;

      if (!user_id) {
        return res.status(400).json({
          error: {
            message: 'user_id is required',
            code: 'INVALID_INPUT',
          },
        });
      }

      const conversations = await personasEngine.getConversations(
        req.params.id,
        user_id as string,
        limit ? parseInt(limit as string) : 50
      );

      res.json({
        data: conversations,
        count: conversations.length,
      });
    } catch (error: any) {
      logger.error(
        { error: error.message, id: req.params.id },
        'Failed to get conversations'
      );
      res.status(500).json({
        error: {
          message: error.message,
          code: 'CONVERSATIONS_ERROR',
        },
      });
    }
  });

  /**
   * GET /api/personas/:id/conversations/:conversationId
   * Get conversation messages
   */
  app.get(
    '/api/personas/:id/conversations/:conversationId',
    async (req: Request, res: Response) => {
      try {
        const messages = await personasEngine.getMessages(req.params.conversationId);

        res.json({
          data: messages,
          count: messages.length,
        });
      } catch (error: any) {
        logger.error(
          { error: error.message, conversationId: req.params.conversationId },
          'Failed to get messages'
        );
        res.status(500).json({
          error: {
            message: error.message,
            code: 'MESSAGES_ERROR',
          },
        });
      }
    }
  );

  /**
   * DELETE /api/personas/:id/conversations/:conversationId
   * Delete a conversation
   */
  app.delete(
    '/api/personas/:id/conversations/:conversationId',
    async (req: Request, res: Response) => {
      try {
        const { user_id } = req.query;

        if (!user_id) {
          return res.status(400).json({
            error: {
              message: 'user_id is required',
              code: 'INVALID_INPUT',
            },
          });
        }

        await personasEngine.deleteConversation(
          req.params.conversationId,
          user_id as string
        );

        res.status(204).send();
      } catch (error: any) {
        logger.error(
          { error: error.message, conversationId: req.params.conversationId },
          'Failed to delete conversation'
        );

        if (error.message.includes('Unauthorized')) {
          return res.status(403).json({
            error: {
              message: error.message,
              code: 'UNAUTHORIZED',
            },
          });
        }

        res.status(500).json({
          error: {
            message: error.message,
            code: 'CONVERSATION_DELETE_ERROR',
          },
        });
      }
    }
  );

  logger.info('Personas API routes registered');
}
