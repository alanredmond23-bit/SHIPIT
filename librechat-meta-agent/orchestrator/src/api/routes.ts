import { Express, Response, Router } from 'express';
import { Logger } from 'pino';
import { Pool } from 'pg';
import { handleChatStream, handleListModels } from './chat';
import { createFileRoutes } from './files';
import { setupMemoryRoutes } from './memory';
import { createComputerRoutes } from './computer';
import { createConversationsRoutes, createMessagesRoutes } from './conversations';
import {
  AuthenticatedRequest,
  createAuthMiddleware,
  optionalAuth,
  requireAdmin,
  globalAuthMiddleware,
  getUserFromRequest,
  PUBLIC_ROUTES,
} from '../middleware/auth';

interface Services {
  taskGraph: any;
  supervisor: any;
  artifacts: any;
  fileProcessor?: any;
  memory?: any;
}

// ============================================================================
// Route Protection Configuration
// ============================================================================

/**
 * Route protection levels:
 * - PUBLIC: No authentication required
 * - AUTHENTICATED: Requires valid JWT token
 * - ADMIN: Requires admin role
 */
export const ROUTE_PROTECTION = {
  // Public routes (no auth required)
  public: [
    'GET /health',
    'GET /api/health',
    'GET /api/models',
    'POST /api/auth/login',
    'POST /api/auth/register',
    'POST /api/auth/refresh',
    'POST /api/auth/forgot-password',
    'POST /api/auth/reset-password',
    'GET /api/auth/callback',
    'POST /api/auth/verify',
  ],

  // Authenticated routes (requires valid token)
  authenticated: [
    // Chat
    'POST /api/chat',

    // Projects
    'GET /api/projects',
    'POST /api/projects',
    'GET /api/projects/:id',

    // Workstreams
    'GET /api/projects/:projectId/workstreams',
    'POST /api/projects/:projectId/workstreams',

    // Tasks
    'GET /api/tasks',
    'POST /api/tasks',
    'GET /api/tasks/:id',
    'PATCH /api/tasks/:id',
    'POST /api/tasks/:id/execute',
    'GET /api/tasks/:id/graph',
    'GET /api/tasks/ready',

    // Artifacts
    'GET /api/artifacts',
    'POST /api/artifacts',

    // Dashboard
    'GET /api/dashboard',

    // Agents
    'GET /api/agents',

    // Files
    'GET /api/files/*',
    'POST /api/files/*',
    'DELETE /api/files/*',

    // Memory
    'GET /api/memory',
    'POST /api/memory',
    'GET /api/memory/:id',
    'PATCH /api/memory/:id',
    'DELETE /api/memory/:id',
    'POST /api/memory/search',
    'POST /api/memory/extract',
    'POST /api/memory/relevant',
    'POST /api/memory/bulk-toggle',
    'DELETE /api/memory/bulk',
    'GET /api/memory/stats',

    // Computer Use
    'POST /api/computer/*',
    'GET /api/computer/*',

    // Conversations
    'GET /api/conversations',
    'POST /api/conversations',
    'GET /api/conversations/:id',
    'GET /api/conversations/:id/with-messages',
    'PATCH /api/conversations/:id',
    'DELETE /api/conversations/:id',
    'POST /api/conversations/:id/archive',
    'POST /api/conversations/:id/unarchive',
    'POST /api/conversations/:id/pin',
    'POST /api/conversations/:id/unpin',
    'GET /api/conversations/:id/messages',
    'POST /api/conversations/:id/messages',
    'PATCH /api/conversations/:conversationId/messages/:messageId',
    'DELETE /api/conversations/:conversationId/messages/:messageId',

    // Messages (standalone)
    'POST /api/messages',
    'GET /api/messages/:id',
  ],

  // Admin-only routes
  admin: [
    'GET /api/users',
    'POST /api/users',
    'GET /api/users/:id',
    'PATCH /api/users/:id',
    'DELETE /api/users/:id',
    'GET /api/admin/*',
    'POST /api/admin/*',
    'GET /api/settings',
    'PATCH /api/settings',
  ],
};

// ============================================================================
// Setup Routes with Authentication
// ============================================================================

export function setupRoutes(
  app: Express,
  services: Services,
  logger: Logger,
  db?: Pool
) {
  // Create auth middleware with database support for legacy sessions
  const authMiddleware = createAuthMiddleware({ db });
  const optionalAuthMiddleware = optionalAuth({ db });

  // ============================================================================
  // Chat API - Streaming LLM endpoints
  // ============================================================================

  // POST /api/chat - Stream chat completions with Claude, GPT, or Gemini
  // Protected: Requires authentication
  app.post('/api/chat', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUserFromRequest(req);
    logger.info({ userId: user?.id }, 'Chat request initiated');
    await handleChatStream(req, res, logger);
  });

  // GET /api/models - List available models
  // Public: No authentication required
  app.get('/api/models', async (req: AuthenticatedRequest, res: Response) => {
    await handleListModels(req, res, logger);
  });

  // ============================================================================
  // Task Management API
  // ============================================================================

  // Projects - All protected
  app.post('/api/projects', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getUserFromRequest(req);
      const projectData = {
        ...req.body,
        created_by: user?.id,
      };
      const project = await services.taskGraph.createProject(projectData);
      logger.info({ userId: user?.id, projectId: project.id }, 'Project created');
      res.status(201).json({ data: project });
    } catch (error: any) {
      logger.error({ error }, 'Failed to create project');
      res.status(500).json({ error: { message: error.message } });
    }
  });

  app.get('/api/projects', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getUserFromRequest(req);
      // Filter projects by user if needed
      const projects = await services.taskGraph.listProjects({ userId: user?.id });
      res.json({ data: projects });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
  });

  app.get('/api/projects/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const project = await services.taskGraph.getProject(req.params.id);
      res.json({ data: project });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
  });

  // Workstreams - Protected
  app.post('/api/projects/:projectId/workstreams', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getUserFromRequest(req);
      const workstreamData = {
        ...req.body,
        created_by: user?.id,
      };
      const workstream = await services.taskGraph.createWorkstream(req.params.projectId, workstreamData);
      logger.info({ userId: user?.id, workstreamId: workstream.id }, 'Workstream created');
      res.status(201).json({ data: workstream });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
  });

  app.get('/api/projects/:projectId/workstreams', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workstreams = await services.taskGraph.listWorkstreams(req.params.projectId);
      res.json({ data: workstreams });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
  });

  // Tasks - Protected
  app.post('/api/tasks', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getUserFromRequest(req);
      const taskData = {
        ...req.body,
        created_by: user?.id,
      };
      const task = await services.taskGraph.createTask(taskData);
      logger.info({ userId: user?.id, taskId: task.id }, 'Task created');
      res.status(201).json({ data: task });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
  });

  app.get('/api/tasks', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { workstream_id, status } = req.query;
      const tasks = await services.taskGraph.listTasks({ workstreamId: workstream_id, status });
      res.json({ data: tasks });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
  });

  app.get('/api/tasks/ready', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { workstream_id } = req.query;
      const tasks = await services.taskGraph.getReadyTasks(workstream_id as string);
      res.json({ data: tasks });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
  });

  app.get('/api/tasks/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const task = await services.taskGraph.getTask(req.params.id);
      res.json({ data: task });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
  });

  app.patch('/api/tasks/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getUserFromRequest(req);
      const task = await services.taskGraph.updateTask(req.params.id, req.body);
      logger.info({ userId: user?.id, taskId: req.params.id }, 'Task updated');
      res.json({ data: task });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
  });

  // Task execution - Protected
  app.post('/api/tasks/:id/execute', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getUserFromRequest(req);
      logger.info({ userId: user?.id, taskId: req.params.id }, 'Task execution initiated');
      const run = await services.supervisor.executeTask(req.params.id);
      res.status(201).json({ data: run });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
  });

  // Task graph/dependencies - Protected
  app.get('/api/tasks/:id/graph', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const graph = await services.taskGraph.getTaskGraph(req.params.id);
      res.json({ data: graph });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
  });

  // Artifacts - Protected
  app.post('/api/artifacts', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getUserFromRequest(req);
      const artifactData = {
        ...req.body,
        created_by: user?.id,
      };
      const artifact = await services.artifacts.create(artifactData);
      logger.info({ userId: user?.id, artifactId: artifact.id }, 'Artifact created');
      res.status(201).json({ data: artifact });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
  });

  app.get('/api/artifacts', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { task_id } = req.query;
      const artifacts = await services.artifacts.list({ taskId: task_id });
      res.json({ data: artifacts });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
  });

  // Dashboard stats - Protected
  app.get('/api/dashboard', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getUserFromRequest(req);
      const stats = await services.taskGraph.getDashboardStats({ userId: user?.id });
      res.json({ data: stats });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
  });

  // Agent status - Protected
  app.get('/api/agents', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const agents = await services.supervisor.getAgentStatus();
      res.json({ data: agents });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
  });

  // ============================================================================
  // Current User API - Protected
  // ============================================================================

  app.get('/api/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }
        });
      }
      res.json({
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          authMethod: user.authMethod,
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
  });

  // ============================================================================
  // File Upload and Analysis API - Protected
  // ============================================================================

  if (services.fileProcessor && db) {
    const fileRoutes = createFileRoutes(db, services.fileProcessor, logger);
    // Apply auth middleware to all file routes
    app.use('/api/files', authMiddleware, fileRoutes);
    logger.info('File routes registered with authentication');
  }

  // ============================================================================
  // Memory/Personalization API - Protected
  // ============================================================================

  if (services.memory) {
    // Memory routes need auth - wrap them
    const memoryRouter = Router();

    // Apply auth to memory router
    memoryRouter.use(authMiddleware);

    // Re-setup memory routes on the protected router
    setupProtectedMemoryRoutes(memoryRouter, services.memory, logger);

    app.use(memoryRouter);
    logger.info('Memory routes registered with authentication');
  }

  // ============================================================================
  // Computer Use API - Browser & Desktop Automation - Protected
  // ============================================================================

  const computerRoutes = createComputerRoutes(logger);
  // Apply auth middleware to all computer use routes
  app.use('/api/computer', authMiddleware, computerRoutes);
  logger.info('Computer Use routes registered with authentication');

  // ============================================================================
  // Conversations API - Chat Persistence - Protected
  // ============================================================================

  if (db) {
    const conversationsRoutes = createConversationsRoutes(db, logger);
    const messagesRoutes = createMessagesRoutes(db, logger);

    // Apply auth middleware to all conversation routes
    app.use('/api/conversations', authMiddleware, conversationsRoutes);
    app.use('/api/messages', authMiddleware, messagesRoutes);

    logger.info('Conversations routes registered with authentication');
  }

  // ============================================================================
  // Admin Routes - Require admin role
  // ============================================================================

  const adminMiddleware = requireAdmin();

  app.get('/api/admin/stats', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Admin-only statistics
      res.json({
        data: {
          totalUsers: 0, // Would come from DB
          activeUsers: 0,
          totalTasks: 0,
          systemHealth: 'healthy',
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
  });

  // Log route setup completion
  logger.info({
    publicRoutes: PUBLIC_ROUTES.length,
    protectedRoutes: ROUTE_PROTECTION.authenticated.length,
    adminRoutes: ROUTE_PROTECTION.admin.length,
  }, 'Routes configured with authentication');
}

// ============================================================================
// Protected Memory Routes Helper
// ============================================================================

function setupProtectedMemoryRoutes(
  router: Router,
  memoryService: any,
  logger: Logger
) {
  router.get('/api/memory', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getUserFromRequest(req);
      const { project_id, category, enabled, limit } = req.query;

      const filters: any = {
        user_id: user?.id, // Filter by current user
      };
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

  router.get('/api/memory/stats', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getUserFromRequest(req);
      const { project_id } = req.query;

      const filters: any = {
        user_id: user?.id,
      };
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

  router.get('/api/memory/:id', async (req: AuthenticatedRequest, res: Response) => {
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

      // Verify ownership
      const user = getUserFromRequest(req);
      if (memory.user_id && memory.user_id !== user?.id) {
        return res.status(403).json({
          error: {
            message: 'Access denied',
            code: 'FORBIDDEN',
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

  router.post('/api/memory', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getUserFromRequest(req);
      const {
        project_id,
        content,
        category,
        importance_score,
        fact_type,
        source_task_id,
        expires_at,
      } = req.body;

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
        user_id: user?.id,
        project_id,
        content,
        category,
        importance_score,
        fact_type,
        source_task_id,
        expires_at: expires_at ? new Date(expires_at) : undefined,
      });

      logger.info({ userId: user?.id, memoryId: memory.id }, 'Memory created');
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

  router.patch('/api/memory/:id', async (req: AuthenticatedRequest, res: Response) => {
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

      const user = getUserFromRequest(req);
      const memory = await memoryService.updateMemory(req.params.id, updates);

      logger.info({ userId: user?.id, memoryId: req.params.id }, 'Memory updated');
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

  router.delete('/api/memory/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getUserFromRequest(req);
      await memoryService.deleteMemory(req.params.id);

      logger.info({ userId: user?.id, memoryId: req.params.id }, 'Memory deleted');
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

  router.post('/api/memory/search', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getUserFromRequest(req);
      const { project_id, query, category, limit, min_similarity } = req.body;

      if (!query) {
        return res.status(400).json({
          error: {
            message: 'query is required',
            code: 'INVALID_INPUT',
          },
        });
      }

      const results = await memoryService.searchMemories({
        user_id: user?.id,
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

  router.post('/api/memory/extract', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getUserFromRequest(req);
      const { project_id, conversation, auto_save } = req.body;

      if (!project_id || !conversation || !Array.isArray(conversation)) {
        return res.status(400).json({
          error: {
            message: 'project_id and conversation (array) are required',
            code: 'INVALID_INPUT',
          },
        });
      }

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
        user_id: user?.id,
        project_id,
        conversation,
        auto_save: auto_save !== false,
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

  router.post('/api/memory/relevant', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getUserFromRequest(req);
      const { project_id, context, limit, categories } = req.body;

      if (!project_id || !context) {
        return res.status(400).json({
          error: {
            message: 'project_id and context are required',
            code: 'INVALID_INPUT',
          },
        });
      }

      const memories = await memoryService.getRelevantMemories({
        user_id: user?.id,
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

  router.post('/api/memory/bulk-toggle', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getUserFromRequest(req);
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

      logger.info({ userId: user?.id, count: ids.length }, 'Bulk toggle memories');
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

  router.delete('/api/memory/bulk', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getUserFromRequest(req);
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

      logger.info({ userId: user?.id, count: ids.length }, 'Bulk delete memories');
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
