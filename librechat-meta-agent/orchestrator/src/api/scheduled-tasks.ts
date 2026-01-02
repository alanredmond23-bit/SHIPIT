import { Express, Request, Response } from 'express';
import { Logger } from 'pino';
import { ScheduledTasksEngine } from '../services/scheduled-tasks';

export function setupScheduledTasksRoutes(
  app: Express,
  taskEngine: ScheduledTasksEngine,
  logger: Logger
) {
  /**
   * POST /api/tasks
   * Create a new scheduled task
   */
  app.post('/api/tasks', async (req: Request, res: Response) => {
    try {
      const {
        userId,
        name,
        description,
        type,
        schedule,
        trigger,
        action,
        conditions,
        retryPolicy,
        notification,
      } = req.body;

      // Validation
      if (!userId || !name || !type || !action) {
        return res.status(400).json({
          error: {
            message: 'userId, name, type, and action are required',
            code: 'INVALID_INPUT',
          },
        });
      }

      if (!['one-time', 'recurring', 'trigger'].includes(type)) {
        return res.status(400).json({
          error: {
            message: 'type must be one of: one-time, recurring, trigger',
            code: 'INVALID_TYPE',
          },
        });
      }

      const task = await taskEngine.createTask({
        userId,
        name,
        description,
        type,
        schedule,
        trigger,
        action,
        conditions,
        retryPolicy,
        notification,
      });

      res.status(201).json({ data: task });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to create task');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'TASK_CREATE_ERROR',
        },
      });
    }
  });

  /**
   * GET /api/tasks
   * List all tasks for a user
   */
  app.get('/api/tasks', async (req: Request, res: Response) => {
    try {
      const { userId, type, status, limit } = req.query;

      if (!userId) {
        return res.status(400).json({
          error: {
            message: 'userId is required',
            code: 'INVALID_INPUT',
          },
        });
      }

      const filters: any = {};
      if (type) filters.type = type as string;
      if (status) filters.status = status as string;
      if (limit) filters.limit = parseInt(limit as string);

      const tasks = await taskEngine.listTasks(userId as string, filters);

      res.json({
        data: tasks,
        count: tasks.length,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to list tasks');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'TASK_LIST_ERROR',
        },
      });
    }
  });

  /**
   * GET /api/tasks/:id
   * Get a specific task by ID
   */
  app.get('/api/tasks/:id', async (req: Request, res: Response) => {
    try {
      const task = await taskEngine.getTask(req.params.id);

      if (!task) {
        return res.status(404).json({
          error: {
            message: 'Task not found',
            code: 'TASK_NOT_FOUND',
          },
        });
      }

      res.json({ data: task });
    } catch (error: any) {
      logger.error(
        { error: error.message, id: req.params.id },
        'Failed to get task'
      );
      res.status(500).json({
        error: {
          message: error.message,
          code: 'TASK_GET_ERROR',
        },
      });
    }
  });

  /**
   * PUT /api/tasks/:id
   * Update a task
   */
  app.put('/api/tasks/:id', async (req: Request, res: Response) => {
    try {
      const {
        name,
        description,
        type,
        schedule,
        trigger,
        action,
        conditions,
        retryPolicy,
        notification,
      } = req.body;

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (type !== undefined) updates.type = type;
      if (schedule !== undefined) updates.schedule = schedule;
      if (trigger !== undefined) updates.trigger = trigger;
      if (action !== undefined) updates.action = action;
      if (conditions !== undefined) updates.conditions = conditions;
      if (retryPolicy !== undefined) updates.retryPolicy = retryPolicy;
      if (notification !== undefined) updates.notification = notification;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          error: {
            message: 'No valid fields to update',
            code: 'INVALID_INPUT',
          },
        });
      }

      const task = await taskEngine.updateTask(req.params.id, updates);

      res.json({ data: task });
    } catch (error: any) {
      logger.error(
        { error: error.message, id: req.params.id },
        'Failed to update task'
      );

      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: {
            message: error.message,
            code: 'TASK_NOT_FOUND',
          },
        });
      }

      res.status(500).json({
        error: {
          message: error.message,
          code: 'TASK_UPDATE_ERROR',
        },
      });
    }
  });

  /**
   * DELETE /api/tasks/:id
   * Delete a task
   */
  app.delete('/api/tasks/:id', async (req: Request, res: Response) => {
    try {
      await taskEngine.deleteTask(req.params.id);

      res.status(204).send();
    } catch (error: any) {
      logger.error(
        { error: error.message, id: req.params.id },
        'Failed to delete task'
      );

      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: {
            message: error.message,
            code: 'TASK_NOT_FOUND',
          },
        });
      }

      res.status(500).json({
        error: {
          message: error.message,
          code: 'TASK_DELETE_ERROR',
        },
      });
    }
  });

  /**
   * POST /api/tasks/:id/pause
   * Pause a task
   */
  app.post('/api/tasks/:id/pause', async (req: Request, res: Response) => {
    try {
      await taskEngine.pauseTask(req.params.id);

      res.json({
        data: { status: 'paused' },
        message: 'Task paused successfully',
      });
    } catch (error: any) {
      logger.error(
        { error: error.message, id: req.params.id },
        'Failed to pause task'
      );
      res.status(500).json({
        error: {
          message: error.message,
          code: 'TASK_PAUSE_ERROR',
        },
      });
    }
  });

  /**
   * POST /api/tasks/:id/resume
   * Resume a paused task
   */
  app.post('/api/tasks/:id/resume', async (req: Request, res: Response) => {
    try {
      await taskEngine.resumeTask(req.params.id);

      res.json({
        data: { status: 'active' },
        message: 'Task resumed successfully',
      });
    } catch (error: any) {
      logger.error(
        { error: error.message, id: req.params.id },
        'Failed to resume task'
      );
      res.status(500).json({
        error: {
          message: error.message,
          code: 'TASK_RESUME_ERROR',
        },
      });
    }
  });

  /**
   * POST /api/tasks/:id/run
   * Run a task immediately
   */
  app.post('/api/tasks/:id/run', async (req: Request, res: Response) => {
    try {
      const execution = await taskEngine.runNow(req.params.id);

      res.json({
        data: execution,
        message: 'Task executed successfully',
      });
    } catch (error: any) {
      logger.error(
        { error: error.message, id: req.params.id },
        'Failed to run task'
      );

      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: {
            message: error.message,
            code: 'TASK_NOT_FOUND',
          },
        });
      }

      res.status(500).json({
        error: {
          message: error.message,
          code: 'TASK_RUN_ERROR',
        },
      });
    }
  });

  /**
   * GET /api/tasks/:id/executions
   * Get execution history for a task
   */
  app.get('/api/tasks/:id/executions', async (req: Request, res: Response) => {
    try {
      const { limit } = req.query;
      const executions = await taskEngine.getExecutions(
        req.params.id,
        limit ? parseInt(limit as string) : 50
      );

      res.json({
        data: executions,
        count: executions.length,
      });
    } catch (error: any) {
      logger.error(
        { error: error.message, id: req.params.id },
        'Failed to get executions'
      );
      res.status(500).json({
        error: {
          message: error.message,
          code: 'EXECUTIONS_GET_ERROR',
        },
      });
    }
  });

  /**
   * GET /api/tasks/upcoming
   * Get upcoming tasks for a user
   */
  app.get('/api/tasks/upcoming', async (req: Request, res: Response) => {
    try {
      const { userId, limit } = req.query;

      if (!userId) {
        return res.status(400).json({
          error: {
            message: 'userId is required',
            code: 'INVALID_INPUT',
          },
        });
      }

      const tasks = await taskEngine.getUpcomingTasks(
        userId as string,
        limit ? parseInt(limit as string) : 10
      );

      res.json({
        data: tasks,
        count: tasks.length,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to get upcoming tasks');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'UPCOMING_TASKS_ERROR',
        },
      });
    }
  });

  /**
   * POST /api/webhooks/:webhookId
   * Webhook endpoint for triggering tasks
   */
  app.post('/api/webhooks/:webhookId', async (req: Request, res: Response) => {
    try {
      const { webhookId } = req.params;
      const { secret } = req.query;

      // In production, validate the secret
      // For now, just pass the webhook ID

      await taskEngine.handleWebhook(webhookId, req.body);

      res.json({
        message: 'Webhook received and task triggered',
        webhookId,
      });
    } catch (error: any) {
      logger.error(
        { error: error.message, webhookId: req.params.webhookId },
        'Failed to handle webhook'
      );

      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: {
            message: error.message,
            code: 'WEBHOOK_NOT_FOUND',
          },
        });
      }

      res.status(500).json({
        error: {
          message: error.message,
          code: 'WEBHOOK_ERROR',
        },
      });
    }
  });

  /**
   * POST /api/tasks/:id/webhook
   * Generate a webhook URL for a task
   */
  app.post('/api/tasks/:id/webhook', async (req: Request, res: Response) => {
    try {
      const webhookUrl = taskEngine.generateWebhookUrl(req.params.id);

      res.json({
        data: {
          webhookUrl,
          fullUrl: `${req.protocol}://${req.get('host')}${webhookUrl}`,
        },
        message: 'Webhook URL generated',
      });
    } catch (error: any) {
      logger.error(
        { error: error.message, id: req.params.id },
        'Failed to generate webhook'
      );
      res.status(500).json({
        error: {
          message: error.message,
          code: 'WEBHOOK_GENERATE_ERROR',
        },
      });
    }
  });

  /**
   * GET /api/tasks/:id/stats
   * Get task statistics
   */
  app.get('/api/tasks/:id/stats', async (req: Request, res: Response) => {
    try {
      const executions = await taskEngine.getExecutions(req.params.id, 1000);

      const stats = {
        totalExecutions: executions.length,
        successfulExecutions: executions.filter((e) => e.status === 'completed')
          .length,
        failedExecutions: executions.filter((e) => e.status === 'failed').length,
        averageDuration:
          executions.reduce((sum, e) => sum + (e.durationMs || 0), 0) /
          (executions.length || 1),
        lastExecution: executions[0] || null,
      };

      res.json({ data: stats });
    } catch (error: any) {
      logger.error(
        { error: error.message, id: req.params.id },
        'Failed to get task stats'
      );
      res.status(500).json({
        error: {
          message: error.message,
          code: 'STATS_ERROR',
        },
      });
    }
  });

  /**
   * POST /api/tasks/validate
   * Validate a task configuration without creating it
   */
  app.post('/api/tasks/validate', async (req: Request, res: Response) => {
    try {
      const { type, schedule, trigger, action } = req.body;

      // Validation logic
      const errors: string[] = [];

      if (!type || !['one-time', 'recurring', 'trigger'].includes(type)) {
        errors.push('type must be one of: one-time, recurring, trigger');
      }

      if (type === 'one-time' && !schedule?.at) {
        errors.push('one-time tasks require schedule.at');
      }

      if (type === 'recurring' && !schedule?.cron) {
        errors.push('recurring tasks require schedule.cron');
      }

      if (type === 'trigger' && !trigger) {
        errors.push('trigger tasks require trigger configuration');
      }

      if (!action || !action.type) {
        errors.push('action is required with a type');
      }

      if (errors.length > 0) {
        return res.status(400).json({
          valid: false,
          errors,
        });
      }

      res.json({
        valid: true,
        message: 'Task configuration is valid',
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to validate task');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'VALIDATION_ERROR',
        },
      });
    }
  });

  /**
   * POST /api/tasks/bulk-delete
   * Delete multiple tasks
   */
  app.post('/api/tasks/bulk-delete', async (req: Request, res: Response) => {
    try {
      const { taskIds } = req.body;

      if (!Array.isArray(taskIds)) {
        return res.status(400).json({
          error: {
            message: 'taskIds must be an array',
            code: 'INVALID_INPUT',
          },
        });
      }

      await Promise.all(taskIds.map((id) => taskEngine.deleteTask(id)));

      res.json({
        message: `${taskIds.length} tasks deleted`,
        count: taskIds.length,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to bulk delete tasks');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'BULK_DELETE_ERROR',
        },
      });
    }
  });

  /**
   * POST /api/tasks/bulk-pause
   * Pause multiple tasks
   */
  app.post('/api/tasks/bulk-pause', async (req: Request, res: Response) => {
    try {
      const { taskIds } = req.body;

      if (!Array.isArray(taskIds)) {
        return res.status(400).json({
          error: {
            message: 'taskIds must be an array',
            code: 'INVALID_INPUT',
          },
        });
      }

      await Promise.all(taskIds.map((id) => taskEngine.pauseTask(id)));

      res.json({
        message: `${taskIds.length} tasks paused`,
        count: taskIds.length,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to bulk pause tasks');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'BULK_PAUSE_ERROR',
        },
      });
    }
  });

  /**
   * POST /api/tasks/bulk-resume
   * Resume multiple tasks
   */
  app.post('/api/tasks/bulk-resume', async (req: Request, res: Response) => {
    try {
      const { taskIds } = req.body;

      if (!Array.isArray(taskIds)) {
        return res.status(400).json({
          error: {
            message: 'taskIds must be an array',
            code: 'INVALID_INPUT',
          },
        });
      }

      await Promise.all(taskIds.map((id) => taskEngine.resumeTask(id)));

      res.json({
        message: `${taskIds.length} tasks resumed`,
        count: taskIds.length,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to bulk resume tasks');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'BULK_RESUME_ERROR',
        },
      });
    }
  });
}
