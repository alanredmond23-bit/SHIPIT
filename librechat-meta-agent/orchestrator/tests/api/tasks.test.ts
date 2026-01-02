import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import { setupRoutes } from '../../src/api/routes';
import { mockLogger, resetAllMocks } from '../setup';

describe('Tasks API', () => {
  let app: Express;
  let mockTaskGraph: any;
  let mockServices: any;

  beforeEach(() => {
    resetAllMocks();
    app = express();
    app.use(express.json());

    // Mock TaskGraph service
    mockTaskGraph = {
      createProject: vi.fn(),
      getProject: vi.fn(),
      listProjects: vi.fn(),
      createWorkstream: vi.fn(),
      listWorkstreams: vi.fn(),
      createTask: vi.fn(),
      listTasks: vi.fn(),
      getTask: vi.fn(),
      updateTask: vi.fn(),
      getReadyTasks: vi.fn(),
      getDashboardStats: vi.fn(),
    };

    mockServices = {
      taskGraph: mockTaskGraph,
      supervisor: {},
      artifacts: {},
    };

    setupRoutes(app, mockServices, mockLogger as any);
  });

  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const newProject = {
        id: 'proj-123',
        name: 'Test Project',
        description: 'A test project',
        created_at: new Date().toISOString(),
      };

      mockTaskGraph.createProject.mockResolvedValueOnce(newProject);

      const response = await request(app)
        .post('/api/projects')
        .send({
          name: 'Test Project',
          description: 'A test project',
        })
        .expect(201);

      expect(response.body).toEqual({
        data: newProject,
      });

      expect(mockTaskGraph.createProject).toHaveBeenCalledWith({
        name: 'Test Project',
        description: 'A test project',
      });
    });

    it('should handle validation errors', async () => {
      mockTaskGraph.createProject.mockRejectedValueOnce(
        new Error('Name is required')
      );

      const response = await request(app)
        .post('/api/projects')
        .send({})
        .expect(500);

      expect(response.body).toEqual({
        error: { message: 'Name is required' },
      });
    });

    it('should handle duplicate project names', async () => {
      mockTaskGraph.createProject.mockRejectedValueOnce(
        new Error('Project with this name already exists')
      );

      await request(app)
        .post('/api/projects')
        .send({ name: 'Duplicate' })
        .expect(500);
    });
  });

  describe('GET /api/projects', () => {
    it('should list all projects', async () => {
      const mockProjects = [
        {
          id: 'proj-1',
          name: 'Project 1',
          created_at: new Date().toISOString(),
        },
        {
          id: 'proj-2',
          name: 'Project 2',
          created_at: new Date().toISOString(),
        },
      ];

      mockTaskGraph.listProjects.mockResolvedValueOnce(mockProjects);

      const response = await request(app)
        .get('/api/projects')
        .expect(200);

      expect(response.body).toEqual({
        data: mockProjects,
      });

      expect(mockTaskGraph.listProjects).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no projects exist', async () => {
      mockTaskGraph.listProjects.mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/projects')
        .expect(200);

      expect(response.body.data).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockTaskGraph.listProjects.mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      await request(app)
        .get('/api/projects')
        .expect(500);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should get a project by id', async () => {
      const mockProject = {
        id: 'proj-123',
        name: 'Test Project',
        description: 'Description',
      };

      mockTaskGraph.getProject.mockResolvedValueOnce(mockProject);

      const response = await request(app)
        .get('/api/projects/proj-123')
        .expect(200);

      expect(response.body).toEqual({
        data: mockProject,
      });

      expect(mockTaskGraph.getProject).toHaveBeenCalledWith('proj-123');
    });

    it('should return 500 when project not found', async () => {
      mockTaskGraph.getProject.mockRejectedValueOnce(
        new Error('Project not found')
      );

      await request(app)
        .get('/api/projects/non-existent')
        .expect(500);
    });

    it('should handle special characters in project id', async () => {
      const projectId = 'proj-with-dashes';
      mockTaskGraph.getProject.mockResolvedValueOnce({
        id: projectId,
        name: 'Test',
      });

      await request(app)
        .get(`/api/projects/${projectId}`)
        .expect(200);

      expect(mockTaskGraph.getProject).toHaveBeenCalledWith(projectId);
    });
  });

  describe('POST /api/projects/:projectId/workstreams', () => {
    it('should create a workstream for a project', async () => {
      const mockWorkstream = {
        id: 'ws-123',
        project_id: 'proj-123',
        name: 'Backend Development',
        priority: 5,
      };

      mockTaskGraph.createWorkstream.mockResolvedValueOnce(mockWorkstream);

      const response = await request(app)
        .post('/api/projects/proj-123/workstreams')
        .send({
          name: 'Backend Development',
          priority: 5,
        })
        .expect(201);

      expect(response.body).toEqual({
        data: mockWorkstream,
      });

      expect(mockTaskGraph.createWorkstream).toHaveBeenCalledWith(
        'proj-123',
        {
          name: 'Backend Development',
          priority: 5,
        }
      );
    });

    it('should handle invalid project id', async () => {
      mockTaskGraph.createWorkstream.mockRejectedValueOnce(
        new Error('Project not found')
      );

      await request(app)
        .post('/api/projects/invalid/workstreams')
        .send({ name: 'Test' })
        .expect(500);
    });

    it('should create workstream with optional fields', async () => {
      const mockWorkstream = {
        id: 'ws-123',
        project_id: 'proj-123',
        name: 'Test',
        description: 'Test description',
        lead_agent: 'agent-1',
      };

      mockTaskGraph.createWorkstream.mockResolvedValueOnce(mockWorkstream);

      await request(app)
        .post('/api/projects/proj-123/workstreams')
        .send({
          name: 'Test',
          description: 'Test description',
          lead_agent: 'agent-1',
        })
        .expect(201);
    });
  });

  describe('GET /api/projects/:projectId/workstreams', () => {
    it('should list workstreams for a project', async () => {
      const mockWorkstreams = [
        { id: 'ws-1', name: 'Workstream 1' },
        { id: 'ws-2', name: 'Workstream 2' },
      ];

      mockTaskGraph.listWorkstreams.mockResolvedValueOnce(mockWorkstreams);

      const response = await request(app)
        .get('/api/projects/proj-123/workstreams')
        .expect(200);

      expect(response.body).toEqual({
        data: mockWorkstreams,
      });

      expect(mockTaskGraph.listWorkstreams).toHaveBeenCalledWith('proj-123');
    });

    it('should return empty array when no workstreams exist', async () => {
      mockTaskGraph.listWorkstreams.mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/projects/proj-123/workstreams')
        .expect(200);

      expect(response.body.data).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockTaskGraph.listWorkstreams.mockRejectedValueOnce(
        new Error('Database error')
      );

      await request(app)
        .get('/api/projects/proj-123/workstreams')
        .expect(500);
    });
  });

  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const mockTask = {
        id: 'task-123',
        workstream_id: 'ws-123',
        title: 'Implement authentication',
        status: 'pending',
        priority: 8,
      };

      mockTaskGraph.createTask.mockResolvedValueOnce(mockTask);

      const response = await request(app)
        .post('/api/tasks')
        .send({
          workstream_id: 'ws-123',
          title: 'Implement authentication',
          priority: 8,
        })
        .expect(201);

      expect(response.body).toEqual({
        data: mockTask,
      });

      expect(mockTaskGraph.createTask).toHaveBeenCalledWith({
        workstream_id: 'ws-123',
        title: 'Implement authentication',
        priority: 8,
      });
    });

    it('should create task with dependencies', async () => {
      const mockTask = {
        id: 'task-123',
        workstream_id: 'ws-123',
        title: 'Deploy to production',
        dependencies: ['task-1', 'task-2'],
      };

      mockTaskGraph.createTask.mockResolvedValueOnce(mockTask);

      await request(app)
        .post('/api/tasks')
        .send({
          workstream_id: 'ws-123',
          title: 'Deploy to production',
          dependencies: ['task-1', 'task-2'],
        })
        .expect(201);
    });

    it('should create task with context packet', async () => {
      const contextPacket = {
        requirements: 'User auth',
        technologies: ['Node.js', 'JWT'],
      };

      const mockTask = {
        id: 'task-123',
        context_packet: contextPacket,
      };

      mockTaskGraph.createTask.mockResolvedValueOnce(mockTask);

      await request(app)
        .post('/api/tasks')
        .send({
          workstream_id: 'ws-123',
          title: 'Test',
          context_packet: contextPacket,
        })
        .expect(201);
    });
  });

  describe('GET /api/tasks', () => {
    it('should list all tasks', async () => {
      const mockTasks = [
        { id: 'task-1', title: 'Task 1' },
        { id: 'task-2', title: 'Task 2' },
      ];

      mockTaskGraph.listTasks.mockResolvedValueOnce(mockTasks);

      const response = await request(app)
        .get('/api/tasks')
        .expect(200);

      expect(response.body).toEqual({
        data: mockTasks,
      });

      expect(mockTaskGraph.listTasks).toHaveBeenCalledWith({
        workstreamId: undefined,
        status: undefined,
      });
    });

    it('should filter tasks by workstream_id', async () => {
      mockTaskGraph.listTasks.mockResolvedValueOnce([]);

      await request(app)
        .get('/api/tasks?workstream_id=ws-123')
        .expect(200);

      expect(mockTaskGraph.listTasks).toHaveBeenCalledWith({
        workstreamId: 'ws-123',
        status: undefined,
      });
    });

    it('should filter tasks by status', async () => {
      mockTaskGraph.listTasks.mockResolvedValueOnce([]);

      await request(app)
        .get('/api/tasks?status=running')
        .expect(200);

      expect(mockTaskGraph.listTasks).toHaveBeenCalledWith({
        workstreamId: undefined,
        status: 'running',
      });
    });

    it('should handle multiple query parameters', async () => {
      mockTaskGraph.listTasks.mockResolvedValueOnce([]);

      await request(app)
        .get('/api/tasks?workstream_id=ws-123&status=done')
        .expect(200);

      expect(mockTaskGraph.listTasks).toHaveBeenCalledWith({
        workstreamId: 'ws-123',
        status: 'done',
      });
    });
  });

  describe('Error Handling', () => {
    it('should return consistent error format', async () => {
      mockTaskGraph.createProject.mockRejectedValueOnce(
        new Error('Test error message')
      );

      const response = await request(app)
        .post('/api/projects')
        .send({ name: 'Test' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error.message).toBe('Test error message');
    });

    it('should log errors', async () => {
      mockTaskGraph.createProject.mockRejectedValueOnce(
        new Error('Test error')
      );

      await request(app)
        .post('/api/projects')
        .send({ name: 'Test' })
        .expect(500);

      expect(mockLogger.error).toHaveBeenCalledWith(
        { error: expect.any(Error) },
        'Failed to create project'
      );
    });

    it('should handle malformed JSON', async () => {
      await request(app)
        .post('/api/projects')
        .set('Content-Type', 'application/json')
        .send('invalid json{')
        .expect(400);
    });
  });

  describe('Integration Tests', () => {
    it('should create project, workstream, and task in sequence', async () => {
      const mockProject = { id: 'proj-123', name: 'Test Project' };
      const mockWorkstream = { id: 'ws-123', project_id: 'proj-123', name: 'Test WS' };
      const mockTask = { id: 'task-123', workstream_id: 'ws-123', title: 'Test Task' };

      mockTaskGraph.createProject.mockResolvedValueOnce(mockProject);
      mockTaskGraph.createWorkstream.mockResolvedValueOnce(mockWorkstream);
      mockTaskGraph.createTask.mockResolvedValueOnce(mockTask);

      // Create project
      const projectResponse = await request(app)
        .post('/api/projects')
        .send({ name: 'Test Project' })
        .expect(201);

      const projectId = projectResponse.body.data.id;

      // Create workstream
      const workstreamResponse = await request(app)
        .post(`/api/projects/${projectId}/workstreams`)
        .send({ name: 'Test WS' })
        .expect(201);

      const workstreamId = workstreamResponse.body.data.id;

      // Create task
      await request(app)
        .post('/api/tasks')
        .send({
          workstream_id: workstreamId,
          title: 'Test Task',
        })
        .expect(201);

      expect(mockTaskGraph.createProject).toHaveBeenCalledTimes(1);
      expect(mockTaskGraph.createWorkstream).toHaveBeenCalledTimes(1);
      expect(mockTaskGraph.createTask).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent requests', async () => {
      mockTaskGraph.listProjects.mockResolvedValue([]);

      const requests = Array.from({ length: 10 }, () =>
        request(app).get('/api/projects')
      );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      expect(mockTaskGraph.listProjects).toHaveBeenCalledTimes(10);
    });

    it('should maintain request isolation', async () => {
      let callCount = 0;
      mockTaskGraph.createProject.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('First request fails');
        }
        return { id: 'proj-123', name: 'Test' };
      });

      // First request fails
      await request(app)
        .post('/api/projects')
        .send({ name: 'Test' })
        .expect(500);

      // Second request succeeds
      await request(app)
        .post('/api/projects')
        .send({ name: 'Test' })
        .expect(201);

      expect(callCount).toBe(2);
    });
  });
});
