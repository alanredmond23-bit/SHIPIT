import { describe, it, expect, beforeEach } from 'vitest';
import { TaskGraphService } from '../../src/services/task-graph';
import { mockPool, mockEventEmitter, mockLogger, createMockQueryResult, resetAllMocks } from '../setup';

describe('TaskGraphService', () => {
  let service: TaskGraphService;

  beforeEach(() => {
    resetAllMocks();
    service = new TaskGraphService(mockPool as any, mockEventEmitter as any, mockLogger as any);
  });

  describe('createProject', () => {
    it('should create a new project successfully', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        description: 'A test project',
        metadata: {},
        created_at: new Date(),
      };

      mockPool.query.mockResolvedValueOnce(createMockQueryResult([mockProject]));

      const result = await service.createProject({
        name: 'Test Project',
        description: 'A test project',
      });

      expect(result).toEqual(mockProject);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO meta_projects'),
        expect.arrayContaining(['Test Project', 'A test project'])
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('project:created', {
        project: mockProject,
      });
    });

    it('should create project with default empty description', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        description: '',
        metadata: {},
        created_at: new Date(),
      };

      mockPool.query.mockResolvedValueOnce(createMockQueryResult([mockProject]));

      await service.createProject({ name: 'Test Project' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['Test Project', ''])
      );
    });

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(service.createProject({ name: 'Test' })).rejects.toThrow('Database error');
    });
  });

  describe('getProject', () => {
    it('should retrieve a project by id', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        description: 'A test project',
        created_at: new Date(),
      };

      mockPool.query.mockResolvedValueOnce(createMockQueryResult([mockProject]));

      const result = await service.getProject('project-123');

      expect(result).toEqual(mockProject);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM meta_projects WHERE id = $1',
        ['project-123']
      );
    });

    it('should throw error when project not found', async () => {
      mockPool.query.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(service.getProject('non-existent')).rejects.toThrow('Project non-existent not found');
    });

    it('should handle special characters in project id', async () => {
      const projectId = "project-with-'quotes";
      mockPool.query.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(service.getProject(projectId)).rejects.toThrow();
      expect(mockPool.query).toHaveBeenCalledWith(expect.any(String), [projectId]);
    });
  });

  describe('listProjects', () => {
    it('should return all projects ordered by created_at', async () => {
      const mockProjects = [
        { id: '1', name: 'Project 1', created_at: new Date('2024-01-02') },
        { id: '2', name: 'Project 2', created_at: new Date('2024-01-01') },
      ];

      mockPool.query.mockResolvedValueOnce(createMockQueryResult(mockProjects));

      const result = await service.listProjects();

      expect(result).toEqual(mockProjects);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM meta_projects ORDER BY created_at DESC'
      );
    });

    it('should return empty array when no projects exist', async () => {
      mockPool.query.mockResolvedValueOnce(createMockQueryResult([]));

      const result = await service.listProjects();

      expect(result).toEqual([]);
    });

    it('should handle large number of projects', async () => {
      const mockProjects = Array.from({ length: 1000 }, (_, i) => ({
        id: `project-${i}`,
        name: `Project ${i}`,
        created_at: new Date(),
      }));

      mockPool.query.mockResolvedValueOnce(createMockQueryResult(mockProjects));

      const result = await service.listProjects();

      expect(result).toHaveLength(1000);
    });
  });

  describe('createTask', () => {
    it('should create a task with dependencies', async () => {
      const mockTask = {
        id: 'task-123',
        workstream_id: 'ws-123',
        title: 'Test Task',
        status: 'pending',
        created_at: new Date(),
      };

      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([mockTask])) // INSERT task
        .mockResolvedValueOnce(createMockQueryResult([])) // INSERT dependency 1
        .mockResolvedValueOnce(createMockQueryResult([])); // INSERT dependency 2

      const result = await service.createTask({
        workstream_id: 'ws-123',
        title: 'Test Task',
        dependencies: ['dep-1', 'dep-2'],
      });

      expect(result).toEqual(mockTask);
      expect(mockPool.query).toHaveBeenCalledTimes(3);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('task:created', {
        task: mockTask,
      });
    });

    it('should create task without dependencies', async () => {
      const mockTask = {
        id: 'task-123',
        workstream_id: 'ws-123',
        title: 'Test Task',
        status: 'pending',
      };

      mockPool.query.mockResolvedValueOnce(createMockQueryResult([mockTask]));

      await service.createTask({
        workstream_id: 'ws-123',
        title: 'Test Task',
      });

      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should use default model tier when not specified', async () => {
      const mockTask = {
        id: 'task-123',
        workstream_id: 'ws-123',
        title: 'Test Task',
        model_tier: 'sonnet',
      };

      mockPool.query.mockResolvedValueOnce(createMockQueryResult([mockTask]));

      await service.createTask({
        workstream_id: 'ws-123',
        title: 'Test Task',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['sonnet'])
      );
    });
  });

  describe('updateTask', () => {
    it('should update task status and set timestamps', async () => {
      const mockTask = {
        id: 'task-123',
        status: 'running',
        started_at: new Date(),
      };

      mockPool.query.mockResolvedValueOnce(createMockQueryResult([mockTask]));

      const result = await service.updateTask('task-123', { status: 'running' });

      expect(result).toEqual(mockTask);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('started_at = NOW()'),
        expect.any(Array)
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('task:updated', {
        task: mockTask,
      });
    });

    it('should set completed_at when status is done', async () => {
      const mockTask = {
        id: 'task-123',
        status: 'done',
        completed_at: new Date(),
      };

      mockPool.query.mockResolvedValueOnce(createMockQueryResult([mockTask]));

      await service.updateTask('task-123', { status: 'done' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('completed_at = NOW()'),
        expect.any(Array)
      );
    });

    it('should update multiple fields at once', async () => {
      const mockTask = {
        id: 'task-123',
        title: 'Updated Title',
        status: 'running',
        priority: 10,
      };

      mockPool.query.mockResolvedValueOnce(createMockQueryResult([mockTask]));

      await service.updateTask('task-123', {
        title: 'Updated Title',
        status: 'running',
        priority: 10,
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('title = $2'),
        expect.arrayContaining(['task-123', 'Updated Title', 'running', 10])
      );
    });
  });

  describe('getDashboardStats', () => {
    it('should return project count and task statistics', async () => {
      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([{ count: '5' }]))
        .mockResolvedValueOnce(
          createMockQueryResult([
            { status: 'pending', count: '3' },
            { status: 'running', count: '2' },
            { status: 'done', count: '1' },
          ])
        )
        .mockResolvedValueOnce(createMockQueryResult([]));

      const result = await service.getDashboardStats();

      expect(result).toEqual({
        projects: 5,
        tasksByStatus: {
          pending: 3,
          running: 2,
          done: 1,
        },
        recentTasks: [],
      });
    });

    it('should handle empty database', async () => {
      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([{ count: '0' }]))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([]));

      const result = await service.getDashboardStats();

      expect(result.projects).toBe(0);
      expect(result.tasksByStatus).toEqual({});
      expect(result.recentTasks).toEqual([]);
    });

    it('should return recent tasks limited to 10', async () => {
      const mockTasks = Array.from({ length: 15 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`,
      }));

      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([{ count: '1' }]))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult(mockTasks.slice(0, 10)));

      const result = await service.getDashboardStats();

      expect(result.recentTasks).toHaveLength(10);
    });
  });
});
