import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowEngine } from '../../src/services/workflow-engine';
import { mockPool, mockLogger, createMockQueryResult, resetAllMocks } from '../setup';

describe('WorkflowEngine', () => {
  let engine: WorkflowEngine;

  beforeEach(() => {
    resetAllMocks();
    engine = new WorkflowEngine(mockPool as any, mockLogger as any);
  });

  describe('createWorkflow', () => {
    it('should create a new workflow with default values', async () => {
      const mockWorkflow = {
        id: 'wf-123',
        user_id: 'user-123',
        name: 'Test Workflow',
        status: 'draft',
        trigger_type: 'manual',
        created_at: new Date(),
      };

      mockPool.query.mockResolvedValueOnce(createMockQueryResult([mockWorkflow]));

      const result = await engine.createWorkflow('user-123', {
        name: 'Test Workflow',
      });

      expect(result).toEqual(mockWorkflow);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO meta_workflows'),
        expect.arrayContaining(['user-123', 'Test Workflow'])
      );
    });

    it('should create workflow with custom trigger type', async () => {
      const mockWorkflow = {
        id: 'wf-123',
        user_id: 'user-123',
        name: 'Scheduled Workflow',
        trigger_type: 'schedule',
        trigger_config: { cron: '0 0 * * *' },
      };

      mockPool.query.mockResolvedValueOnce(createMockQueryResult([mockWorkflow]));

      await engine.createWorkflow('user-123', {
        name: 'Scheduled Workflow',
        trigger_type: 'schedule',
        trigger_config: { cron: '0 0 * * *' },
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['schedule', JSON.stringify({ cron: '0 0 * * *' })])
      );
    });

    it('should handle metadata correctly', async () => {
      const metadata = { author: 'John', version: '1.0' };
      const mockWorkflow = {
        id: 'wf-123',
        metadata,
      };

      mockPool.query.mockResolvedValueOnce(createMockQueryResult([mockWorkflow]));

      await engine.createWorkflow('user-123', {
        name: 'Test',
        metadata,
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([JSON.stringify(metadata)])
      );
    });
  });

  describe('getWorkflow', () => {
    it('should return workflow with all related data', async () => {
      const mockWorkflow = { id: 'wf-123', name: 'Test' };
      const mockStates = [
        { id: 'state-1', workflow_id: 'wf-123', state_type: 'start' },
        { id: 'state-2', workflow_id: 'wf-123', state_type: 'action' },
      ];
      const mockTransitions = [
        { id: 'trans-1', from_state_id: 'state-1', to_state_id: 'state-2' },
      ];
      const mockSchedules = [{ id: 'sched-1', workflow_id: 'wf-123' }];

      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([mockWorkflow]))
        .mockResolvedValueOnce(createMockQueryResult(mockStates))
        .mockResolvedValueOnce(createMockQueryResult(mockTransitions))
        .mockResolvedValueOnce(createMockQueryResult(mockSchedules));

      const result = await engine.getWorkflow('wf-123');

      expect(result).toEqual({
        ...mockWorkflow,
        states: mockStates,
        transitions: mockTransitions,
        schedules: mockSchedules,
      });
    });

    it('should return null when workflow not found', async () => {
      mockPool.query.mockResolvedValueOnce(createMockQueryResult([]));

      const result = await engine.getWorkflow('non-existent');

      expect(result).toBeNull();
    });

    it('should fetch all related data in parallel', async () => {
      const mockWorkflow = { id: 'wf-123' };

      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([mockWorkflow]))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([]));

      await engine.getWorkflow('wf-123');

      // Verify Promise.all was used by checking query calls happened
      expect(mockPool.query).toHaveBeenCalledTimes(4);
    });
  });

  describe('State Management', () => {
    it('should add a new state to workflow', async () => {
      const mockState = {
        id: 'state-123',
        workflow_id: 'wf-123',
        name: 'Process Data',
        state_type: 'action',
        action_type: 'transform',
        position_x: 100,
        position_y: 200,
      };

      mockPool.query.mockResolvedValueOnce(createMockQueryResult([mockState]));

      const result = await engine.addState('wf-123', {
        name: 'Process Data',
        state_type: 'action',
        action_type: 'transform',
        position_x: 100,
        position_y: 200,
      });

      expect(result).toEqual(mockState);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO meta_workflow_states'),
        expect.any(Array)
      );
    });

    it('should use default values for optional fields', async () => {
      const mockState = {
        id: 'state-123',
        state_type: 'action',
        position_x: 0,
        position_y: 0,
        color: '#6366f1',
      };

      mockPool.query.mockResolvedValueOnce(createMockQueryResult([mockState]));

      await engine.addState('wf-123', { name: 'Test' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([0, 0, '#6366f1'])
      );
    });

    it('should update state position', async () => {
      mockPool.query.mockResolvedValueOnce(createMockQueryResult([]));

      await engine.updateStatePosition('state-123', 150, 250);

      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE meta_workflow_states SET position_x = $1, position_y = $2 WHERE id = $3',
        [150, 250, 'state-123']
      );
    });
  });

  describe('Transition Management', () => {
    it('should add transition between states', async () => {
      const mockTransition = {
        id: 'trans-123',
        workflow_id: 'wf-123',
        from_state_id: 'state-1',
        to_state_id: 'state-2',
        priority: 0,
      };

      mockPool.query.mockResolvedValueOnce(createMockQueryResult([mockTransition]));

      const result = await engine.addTransition('wf-123', 'state-1', 'state-2');

      expect(result).toEqual(mockTransition);
    });

    it('should add transition with condition', async () => {
      const condition = { type: 'comparison', field: 'status', operator: '==', value: 'approved' };
      const mockTransition = {
        id: 'trans-123',
        condition,
      };

      mockPool.query.mockResolvedValueOnce(createMockQueryResult([mockTransition]));

      await engine.addTransition('wf-123', 'state-1', 'state-2', { condition });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([JSON.stringify(condition)])
      );
    });

    it('should support priority-based transitions', async () => {
      const mockTransition = {
        id: 'trans-123',
        priority: 10,
      };

      mockPool.query.mockResolvedValueOnce(createMockQueryResult([mockTransition]));

      await engine.addTransition('wf-123', 'state-1', 'state-2', { priority: 10 });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([10])
      );
    });
  });

  describe('Workflow Execution', () => {
    it('should start workflow instance', async () => {
      const mockWorkflow = {
        id: 'wf-123',
        status: 'active',
      };
      const mockStates = [
        { id: 'state-start', state_type: 'start' },
        { id: 'state-action', state_type: 'action' },
      ];

      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([mockWorkflow])) // getWorkflow - workflow
        .mockResolvedValueOnce(createMockQueryResult(mockStates)) // getWorkflow - states
        .mockResolvedValueOnce(createMockQueryResult([])) // getWorkflow - transitions
        .mockResolvedValueOnce(createMockQueryResult([])) // getWorkflow - schedules
        .mockResolvedValueOnce(
          createMockQueryResult([
            {
              id: 'inst-123',
              workflow_id: 'wf-123',
              status: 'running',
              current_state_id: 'state-start',
            },
          ])
        ); // INSERT instance

      const result = await engine.startWorkflow('wf-123', 'user-123', { input: 'test' });

      expect(result.status).toBe('running');
      expect(result.workflow_id).toBe('wf-123');
    });

    it('should throw error when workflow has no start state', async () => {
      const mockWorkflow = {
        id: 'wf-123',
        status: 'active',
      };

      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([mockWorkflow]))
        .mockResolvedValueOnce(createMockQueryResult([])) // No states
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([]));

      await expect(
        engine.startWorkflow('wf-123', 'user-123')
      ).rejects.toThrow('Workflow has no start state');
    });

    it('should not start workflow with invalid status', async () => {
      const mockWorkflow = {
        id: 'wf-123',
        status: 'archived',
      };

      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([mockWorkflow]))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([]));

      await expect(
        engine.startWorkflow('wf-123', 'user-123')
      ).rejects.toThrow('Workflow is archived, cannot start');
    });
  });

  describe('Condition Evaluation', () => {
    it('should evaluate simple comparison conditions', () => {
      const condition = {
        type: 'comparison',
        field: 'variables.count',
        operator: '>',
        value: 5,
      };
      const context = { variables: { count: 10 } };

      const result = (engine as any).evaluateCondition(condition, context);

      expect(result).toBe(true);
    });

    it('should evaluate expression conditions', () => {
      const condition = {
        type: 'expression',
        expression: 'ctx.variables.x + ctx.variables.y > 10',
      };
      const context = { variables: { x: 5, y: 8 } };

      const result = (engine as any).evaluateCondition(condition, context);

      expect(result).toBe(true);
    });

    it('should handle all/any composite conditions', () => {
      const condition = {
        type: 'all',
        conditions: [
          { type: 'comparison', field: 'variables.a', operator: '==', value: 1 },
          { type: 'comparison', field: 'variables.b', operator: '==', value: 2 },
        ],
      };
      const context = { variables: { a: 1, b: 2 } };

      const result = (engine as any).evaluateCondition(condition, context);

      expect(result).toBe(true);
    });

    it('should return true for empty conditions', () => {
      const result = (engine as any).evaluateCondition({}, {});

      expect(result).toBe(true);
    });

    it('should handle contains operator', () => {
      const condition = {
        type: 'comparison',
        field: 'variables.text',
        operator: 'contains',
        value: 'hello',
      };
      const context = { variables: { text: 'hello world' } };

      const result = (engine as any).evaluateCondition(condition, context);

      expect(result).toBe(true);
    });

    it('should handle invalid expressions gracefully', () => {
      const condition = {
        type: 'expression',
        expression: 'invalid javascript syntax }{',
      };

      const result = (engine as any).evaluateCondition(condition, {});

      expect(result).toBe(false);
    });
  });

  describe('Action Execution', () => {
    it('should execute delay action', async () => {
      const state = {
        id: 'state-1',
        action_type: 'delay',
        action_config: { delay_seconds: 0.001 }, // Very short delay for testing
      };
      const instance = { id: 'inst-1' };

      const result = await (engine as any).executeStateAction(state, instance);

      expect(result.delayed_seconds).toBe(0.001);
    });

    it('should execute transform action with mappings', async () => {
      const state = {
        id: 'state-1',
        action_type: 'transform',
        action_config: {
          mappings: {
            output: 'variables.input',
            doubled: 'variables.value',
          },
        },
      };
      const instance = {
        id: 'inst-1',
        context: { variables: { input: 'test', value: 10 } },
      };

      const result = await (engine as any).executeStateAction(state, instance);

      expect(result.output).toBe('test');
      expect(result.doubled).toBe(10);
    });

    it('should execute AI task action', async () => {
      const state = {
        id: 'state-1',
        action_type: 'ai_task',
        action_config: { prompt: 'Test prompt' },
      };
      const instance = { id: 'inst-1' };

      const result = await (engine as any).executeStateAction(state, instance);

      expect(result.type).toBe('ai_task');
      expect(result.prompt).toBe('Test prompt');
    });
  });

  describe('Workflow Lifecycle', () => {
    it('should pause workflow', async () => {
      mockPool.query.mockResolvedValueOnce(createMockQueryResult([]));

      await engine.pauseWorkflow('inst-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        "UPDATE meta_workflow_instances SET status = 'paused' WHERE id = $1",
        ['inst-123']
      );
    });

    it('should resume workflow', async () => {
      mockPool.query.mockResolvedValueOnce(createMockQueryResult([]));

      await engine.resumeWorkflow('inst-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        "UPDATE meta_workflow_instances SET status = 'running' WHERE id = $1",
        ['inst-123']
      );
    });

    it('should cancel workflow', async () => {
      mockPool.query.mockResolvedValueOnce(createMockQueryResult([]));

      await engine.cancelWorkflow('inst-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'cancelled'"),
        ['inst-123']
      );
    });
  });

  describe('Template Management', () => {
    it('should clone workflow as template', async () => {
      const mockTemplate = {
        id: 'wf-123',
        name: 'My Template',
        is_template: true,
        template_category: 'automation',
      };

      mockPool.query.mockResolvedValueOnce(createMockQueryResult([mockTemplate]));

      const result = await engine.cloneAsTemplate('wf-123', 'My Template', 'automation');

      expect(result.is_template).toBe(true);
      expect(result.template_category).toBe('automation');
    });

    it('should create workflow from template', async () => {
      mockPool.query.mockResolvedValueOnce(createMockQueryResult([{ new_id: 'wf-new' }]));

      const result = await engine.createFromTemplate('template-123', 'user-123', 'My Workflow');

      expect(result).toBe('wf-new');
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT clone_workflow($1, $2, $3) as new_id',
        ['template-123', 'My Workflow', 'user-123']
      );
    });

    it('should handle template cloning errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Template not found'));

      await expect(
        engine.createFromTemplate('non-existent', 'user-123', 'My Workflow')
      ).rejects.toThrow('Template not found');
    });
  });
});
