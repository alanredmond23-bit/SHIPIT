import { Express, Request, Response } from 'express';
import { Logger } from 'pino';
import { handleChatStream, handleListModels } from './chat';
import { createFileRoutes } from './files';
import { setupMemoryRoutes } from './memory';

interface Services {
  taskGraph: any;
  supervisor: any;
  artifacts: any;
  fileProcessor?: any;
  memory?: any;
}

export function setupRoutes(app: Express, services: Services, logger: Logger, db?: any) {
  // ============================================================================
  // Chat API - Streaming LLM endpoints
  // ============================================================================

  // POST /api/chat - Stream chat completions with Claude, GPT, or Gemini
  app.post('/api/chat', async (req: Request, res: Response) => {
    await handleChatStream(req, res, logger);
  });

  // GET /api/models - List available models
  app.get('/api/models', async (req: Request, res: Response) => {
    await handleListModels(req, res, logger);
  });

  // ============================================================================
  // Task Management API
  // ============================================================================

  // Projects
  app.post('/api/projects', async (req: Request, res: Response) => {
    try {
      const project = await services.taskGraph.createProject(req.body);
      res.status(201).json({ data: project });
    } catch (error: any) {
      logger.error({ error }, 'Failed to create project');
      res.status(500).json({ error: { message: error.message } });
    }
  });

  app.get('/api/projects', async (req: Request, res: Response) => {
    try {
      const projects = await services.taskGraph.listProjects();
      res.json({ data: projects });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
  });

  app.get('/api/projects/:id', async (req: Request, res: Response) => {
    try {
      const project = await services.taskGraph.getProject(req.params.id);
      res.json({ data: project });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
  });

  // Workstreams
  app.post('/api/projects/:projectId/workstreams', async (req: Request, res: Response) => {
    try {
      const workstream = await services.taskGraph.createWorkstream(req.params.projectId, req.body);
      res.status(201).json({ data: workstream });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
  });

  app.get('/api/projects/:projectId/workstreams', async (req: Request, res: Response) => {
    try {
      const workstreams = await services.taskGraph.listWorkstreams(req.params.projectId);
      res.json({ data: workstreams });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
  });

  // Tasks
  app.post('/api/tasks', async (req: Request, res: Response) => {
    try {
      const task = await services.taskGraph.createTask(req.body);
      res.status(201).json({ data: task });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
  });

  app.get('/api/tasks', async (req: Request, res: Response) => {
    try {
      const { workstream_id, status } = req.query;
      const tasks = await services.taskGraph.listTasks({ workstreamId: workstream_id, status });
      res.json({ data: tasks });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
  });

  app.get('/api/tasks/:id', async (req: Request, res: Response) => {
    try {
      const task = await services.taskGraph.getTask(req.params.id);
      res.json({ data: task });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
  });

  app.patch('/api/tasks/:id', async (req: Request, res: Response) => {
    try {
      const task = await services.taskGraph.updateTask(req.params.id, req.body);
      res.json({ data: task });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
  });

  // Task execution
  app.post('/api/tasks/:id/execute', async (req: Request, res: Response) => {
    try {
      const run = await services.supervisor.executeTask(req.params.id);
      res.status(201).json({ data: run });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
  });

  // Task graph/dependencies
  app.get('/api/tasks/:id/graph', async (req: Request, res: Response) => {
    try {
      const graph = await services.taskGraph.getTaskGraph(req.params.id);
      res.json({ data: graph });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
  });

  // Ready tasks (no blocking dependencies)
  app.get('/api/tasks/ready', async (req: Request, res: Response) => {
    try {
      const { workstream_id } = req.query;
      const tasks = await services.taskGraph.getReadyTasks(workstream_id as string);
      res.json({ data: tasks });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
  });

  // Artifacts
  app.post('/api/artifacts', async (req: Request, res: Response) => {
    try {
      const artifact = await services.artifacts.create(req.body);
      res.status(201).json({ data: artifact });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
  });

  app.get('/api/artifacts', async (req: Request, res: Response) => {
    try {
      const { task_id } = req.query;
      const artifacts = await services.artifacts.list({ taskId: task_id });
      res.json({ data: artifacts });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard', async (req: Request, res: Response) => {
    try {
      const stats = await services.taskGraph.getDashboardStats();
      res.json({ data: stats });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
  });

  // Agent status
  app.get('/api/agents', async (req: Request, res: Response) => {
    try {
      const agents = await services.supervisor.getAgentStatus();
      res.json({ data: agents });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
  });

  // ============================================================================
  // File Upload and Analysis API
  // ============================================================================

  // File upload and analysis routes
  if (services.fileProcessor && db) {
    const fileRoutes = createFileRoutes(db, services.fileProcessor, logger);
    app.use('/api/files', fileRoutes);
    logger.info('File routes registered');
  }

  // ============================================================================
  // Memory/Personalization API
  // ============================================================================

  // Memory management routes
  if (services.memory) {
    setupMemoryRoutes(app, services.memory, logger);
    logger.info('Memory routes registered');
  }
}
