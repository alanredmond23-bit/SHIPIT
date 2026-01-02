import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from 'pino';
import * as cron from 'node-cron';

export interface ScheduledTask {
  id: string;
  userId: string;
  name: string;
  description?: string;
  type: 'one-time' | 'recurring' | 'trigger';
  schedule?: {
    at?: Date;
    cron?: string;
    timezone?: string;
  };
  trigger?: {
    type: 'webhook' | 'email' | 'event';
    config: Record<string, any>;
  };
  action: TaskAction;
  conditions?: TaskCondition[];
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
  };
  notification?: {
    onSuccess?: boolean;
    onFailure?: boolean;
    channels: ('email' | 'webhook' | 'push')[];
  };
  status: 'active' | 'paused' | 'completed' | 'failed';
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  createdAt: Date;
  updatedAt?: Date;
}

export type TaskAction =
  | { type: 'ai-prompt'; prompt: string; model?: string }
  | { type: 'send-email'; to: string; subject: string; body: string }
  | {
      type: 'webhook';
      url: string;
      method: string;
      headers?: Record<string, string>;
      body?: any;
    }
  | { type: 'run-code'; language: 'python' | 'javascript'; code: string }
  | { type: 'generate-report'; config: any }
  | { type: 'chain'; tasks: TaskAction[] }
  | { type: 'web-scrape'; url: string; selector?: string }
  | { type: 'file-operation'; operation: string; path: string }
  | { type: 'google-workspace'; service: string; action: string; params: any };

export interface TaskCondition {
  type: 'time' | 'variable' | 'api-response';
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'exists';
  value: any;
}

export interface TaskExecution {
  id: string;
  taskId: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
  logs: string[];
  durationMs?: number;
}

export interface CreateTaskInput {
  userId: string;
  name: string;
  description?: string;
  type: 'one-time' | 'recurring' | 'trigger';
  schedule?: {
    at?: Date;
    cron?: string;
    timezone?: string;
  };
  trigger?: {
    type: 'webhook' | 'email' | 'event';
    config: Record<string, any>;
  };
  action: TaskAction;
  conditions?: TaskCondition[];
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
  };
  notification?: {
    onSuccess?: boolean;
    onFailure?: boolean;
    channels: ('email' | 'webhook' | 'push')[];
  };
}

export class ScheduledTasksEngine {
  private cronJobs: Map<string, any> = new Map();

  constructor(private db: Pool, private logger: Logger) {}

  /**
   * Create a new scheduled task
   */
  async createTask(input: CreateTaskInput): Promise<ScheduledTask> {
    const id = uuidv4();

    // Validate inputs
    this.validateTask(input);

    // Calculate next run time
    const nextRun = this.calculateNextRun(input);

    const { rows } = await this.db.query(
      `INSERT INTO scheduled_tasks
       (id, user_id, name, description, type, schedule, trigger_config, action,
        conditions, retry_policy, notification_config, status, next_run_at, run_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 0)
       RETURNING *,
         schedule::jsonb as schedule,
         trigger_config::jsonb as trigger,
         action::jsonb as action,
         conditions::jsonb as conditions,
         retry_policy::jsonb as "retryPolicy",
         notification_config::jsonb as notification,
         user_id as "userId",
         last_run_at as "lastRun",
         next_run_at as "nextRun",
         run_count as "runCount",
         created_at as "createdAt",
         updated_at as "updatedAt"`,
      [
        id,
        input.userId,
        input.name,
        input.description || null,
        input.type,
        JSON.stringify(input.schedule || null),
        JSON.stringify(input.trigger || null),
        JSON.stringify(input.action),
        JSON.stringify(input.conditions || null),
        JSON.stringify(input.retryPolicy || null),
        JSON.stringify(input.notification || null),
        'active',
        nextRun,
      ]
    );

    const task = this.mapDbRowToTask(rows[0]);

    // If recurring, schedule it
    if (task.type === 'recurring' && task.schedule?.cron) {
      this.scheduleCronJob(task);
    }

    this.logger.info({ task_id: id, type: task.type }, 'Task created');
    return task;
  }

  /**
   * Update an existing task
   */
  async updateTask(
    taskId: string,
    updates: Partial<CreateTaskInput>
  ): Promise<ScheduledTask> {
    const fields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      params.push(updates.name);
      fields.push(`name = $${paramIndex++}`);
    }

    if (updates.description !== undefined) {
      params.push(updates.description);
      fields.push(`description = $${paramIndex++}`);
    }

    if (updates.type !== undefined) {
      params.push(updates.type);
      fields.push(`type = $${paramIndex++}`);
    }

    if (updates.schedule !== undefined) {
      params.push(JSON.stringify(updates.schedule));
      fields.push(`schedule = $${paramIndex++}`);
    }

    if (updates.trigger !== undefined) {
      params.push(JSON.stringify(updates.trigger));
      fields.push(`trigger_config = $${paramIndex++}`);
    }

    if (updates.action !== undefined) {
      params.push(JSON.stringify(updates.action));
      fields.push(`action = $${paramIndex++}`);
    }

    if (updates.conditions !== undefined) {
      params.push(JSON.stringify(updates.conditions));
      fields.push(`conditions = $${paramIndex++}`);
    }

    if (updates.retryPolicy !== undefined) {
      params.push(JSON.stringify(updates.retryPolicy));
      fields.push(`retry_policy = $${paramIndex++}`);
    }

    if (updates.notification !== undefined) {
      params.push(JSON.stringify(updates.notification));
      fields.push(`notification_config = $${paramIndex++}`);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    // Recalculate next run if schedule changed
    if (updates.schedule !== undefined || updates.type !== undefined) {
      const nextRun = this.calculateNextRun(updates as CreateTaskInput);
      params.push(nextRun);
      fields.push(`next_run_at = $${paramIndex++}`);
    }

    fields.push(`updated_at = NOW()`);

    params.push(taskId);
    const query = `
      UPDATE scheduled_tasks
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *,
        schedule::jsonb as schedule,
        trigger_config::jsonb as trigger,
        action::jsonb as action,
        conditions::jsonb as conditions,
        retry_policy::jsonb as "retryPolicy",
        notification_config::jsonb as notification,
        user_id as "userId",
        last_run_at as "lastRun",
        next_run_at as "nextRun",
        run_count as "runCount",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const { rows } = await this.db.query(query, params);
    if (!rows[0]) {
      throw new Error(`Task ${taskId} not found`);
    }

    const task = this.mapDbRowToTask(rows[0]);

    // Reschedule if it's a recurring task
    if (task.type === 'recurring' && task.schedule?.cron) {
      this.unscheduleCronJob(taskId);
      this.scheduleCronJob(task);
    }

    this.logger.info({ task_id: taskId }, 'Task updated');
    return task;
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string): Promise<void> {
    // Stop cron job if running
    this.unscheduleCronJob(taskId);

    const result = await this.db.query('DELETE FROM scheduled_tasks WHERE id = $1', [
      taskId,
    ]);

    if (result.rowCount === 0) {
      throw new Error(`Task ${taskId} not found`);
    }

    this.logger.info({ task_id: taskId }, 'Task deleted');
  }

  /**
   * Get a task by ID
   */
  async getTask(taskId: string): Promise<ScheduledTask | null> {
    const { rows } = await this.db.query(
      `SELECT *,
         schedule::jsonb as schedule,
         trigger_config::jsonb as trigger,
         action::jsonb as action,
         conditions::jsonb as conditions,
         retry_policy::jsonb as "retryPolicy",
         notification_config::jsonb as notification,
         user_id as "userId",
         last_run_at as "lastRun",
         next_run_at as "nextRun",
         run_count as "runCount",
         created_at as "createdAt",
         updated_at as "updatedAt"
       FROM scheduled_tasks
       WHERE id = $1`,
      [taskId]
    );

    return rows[0] ? this.mapDbRowToTask(rows[0]) : null;
  }

  /**
   * List all tasks for a user
   */
  async listTasks(userId: string, filters?: {
    type?: string;
    status?: string;
    limit?: number;
  }): Promise<ScheduledTask[]> {
    let query = `
      SELECT *,
        schedule::jsonb as schedule,
        trigger_config::jsonb as trigger,
        action::jsonb as action,
        conditions::jsonb as conditions,
        retry_policy::jsonb as "retryPolicy",
        notification_config::jsonb as notification,
        user_id as "userId",
        last_run_at as "lastRun",
        next_run_at as "nextRun",
        run_count as "runCount",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM scheduled_tasks
      WHERE user_id = $1
    `;
    const params: any[] = [userId];
    let paramIndex = 2;

    if (filters?.type) {
      params.push(filters.type);
      query += ` AND type = $${paramIndex++}`;
    }

    if (filters?.status) {
      params.push(filters.status);
      query += ` AND status = $${paramIndex++}`;
    }

    query += ` ORDER BY created_at DESC`;

    if (filters?.limit) {
      params.push(filters.limit);
      query += ` LIMIT $${paramIndex++}`;
    }

    const { rows } = await this.db.query(query, params);
    return rows.map((row) => this.mapDbRowToTask(row));
  }

  /**
   * Pause a task
   */
  async pauseTask(taskId: string): Promise<void> {
    await this.db.query(
      'UPDATE scheduled_tasks SET status = $1, updated_at = NOW() WHERE id = $2',
      ['paused', taskId]
    );

    this.unscheduleCronJob(taskId);
    this.logger.info({ task_id: taskId }, 'Task paused');
  }

  /**
   * Resume a paused task
   */
  async resumeTask(taskId: string): Promise<void> {
    const { rows } = await this.db.query(
      `UPDATE scheduled_tasks
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *,
         schedule::jsonb as schedule,
         trigger_config::jsonb as trigger,
         action::jsonb as action,
         conditions::jsonb as conditions,
         retry_policy::jsonb as "retryPolicy",
         notification_config::jsonb as notification,
         user_id as "userId",
         last_run_at as "lastRun",
         next_run_at as "nextRun",
         run_count as "runCount",
         created_at as "createdAt",
         updated_at as "updatedAt"`,
      ['active', taskId]
    );

    const task = this.mapDbRowToTask(rows[0]);

    // Reschedule if recurring
    if (task.type === 'recurring' && task.schedule?.cron) {
      this.scheduleCronJob(task);
    }

    this.logger.info({ task_id: taskId }, 'Task resumed');
  }

  /**
   * Run a task immediately (manual trigger)
   */
  async runNow(taskId: string): Promise<TaskExecution> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    return await this.executeTask(task);
  }

  /**
   * Execute a task
   */
  async executeTask(task: ScheduledTask): Promise<TaskExecution> {
    const executionId = uuidv4();
    const startedAt = new Date();
    const logs: string[] = [];

    logs.push(`Starting task execution: ${task.name}`);

    try {
      // Create execution record
      await this.db.query(
        `INSERT INTO task_executions (id, task_id, status, started_at, logs)
         VALUES ($1, $2, $3, $4, $5)`,
        [executionId, task.id, 'running', startedAt, JSON.stringify(logs)]
      );

      // Check conditions
      if (task.conditions && task.conditions.length > 0) {
        const conditionsMet = await this.checkConditions(task.conditions);
        if (!conditionsMet) {
          logs.push('Conditions not met, skipping execution');
          await this.completeExecution(executionId, 'completed', null, logs);
          return {
            id: executionId,
            taskId: task.id,
            status: 'completed',
            startedAt,
            completedAt: new Date(),
            logs,
          };
        }
      }

      logs.push(`Executing action: ${task.action.type}`);

      // Execute action (will be implemented in executors.ts)
      const result = await this.executeAction(task.action, logs);

      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();

      logs.push(`Task completed successfully in ${durationMs}ms`);

      // Update execution record
      await this.completeExecution(executionId, 'completed', result, logs, durationMs);

      // Update task
      await this.db.query(
        `UPDATE scheduled_tasks
         SET last_run_at = NOW(),
             run_count = run_count + 1,
             next_run_at = $1,
             status = CASE
               WHEN type = 'one-time' THEN 'completed'
               ELSE status
             END,
             updated_at = NOW()
         WHERE id = $2`,
        [this.calculateNextRun({ ...task, type: task.type }), task.id]
      );

      // Send success notification if configured
      if (task.notification?.onSuccess) {
        await this.sendNotification(task, 'success', result);
      }

      return {
        id: executionId,
        taskId: task.id,
        status: 'completed',
        startedAt,
        completedAt,
        result,
        logs,
        durationMs,
      };
    } catch (error: any) {
      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();

      logs.push(`Task failed: ${error.message}`);

      // Update execution record
      await this.completeExecution(
        executionId,
        'failed',
        null,
        logs,
        durationMs,
        error.message
      );

      // Check if we should retry
      const shouldRetry = task.retryPolicy && task.runCount < task.retryPolicy.maxRetries;

      if (shouldRetry) {
        logs.push(
          `Will retry (${task.runCount + 1}/${task.retryPolicy!.maxRetries})`
        );
        // Schedule retry with backoff
        const retryAt = new Date(Date.now() + task.retryPolicy!.backoffMs);
        await this.db.query(
          'UPDATE scheduled_tasks SET next_run_at = $1 WHERE id = $2',
          [retryAt, task.id]
        );
      } else {
        // Mark task as failed
        await this.db.query(
          'UPDATE scheduled_tasks SET status = $1, updated_at = NOW() WHERE id = $2',
          ['failed', task.id]
        );
      }

      // Send failure notification if configured
      if (task.notification?.onFailure) {
        await this.sendNotification(task, 'failure', error.message);
      }

      throw error;
    }
  }

  /**
   * Get execution history for a task
   */
  async getExecutions(
    taskId: string,
    limit: number = 50
  ): Promise<TaskExecution[]> {
    const { rows } = await this.db.query(
      `SELECT
         id,
         task_id as "taskId",
         status,
         started_at as "startedAt",
         completed_at as "completedAt",
         result::jsonb as result,
         error,
         logs::jsonb as logs,
         duration_ms as "durationMs"
       FROM task_executions
       WHERE task_id = $1
       ORDER BY started_at DESC
       LIMIT $2`,
      [taskId, limit]
    );

    return rows;
  }

  /**
   * Get upcoming tasks for a user
   */
  async getUpcomingTasks(userId: string, limit: number = 10): Promise<ScheduledTask[]> {
    const { rows } = await this.db.query(
      `SELECT *,
         schedule::jsonb as schedule,
         trigger_config::jsonb as trigger,
         action::jsonb as action,
         conditions::jsonb as conditions,
         retry_policy::jsonb as "retryPolicy",
         notification_config::jsonb as notification,
         user_id as "userId",
         last_run_at as "lastRun",
         next_run_at as "nextRun",
         run_count as "runCount",
         created_at as "createdAt",
         updated_at as "updatedAt"
       FROM scheduled_tasks
       WHERE user_id = $1
         AND status = 'active'
         AND next_run_at IS NOT NULL
       ORDER BY next_run_at ASC
       LIMIT $2`,
      [userId, limit]
    );

    return rows.map((row) => this.mapDbRowToTask(row));
  }

  /**
   * Handle webhook trigger
   */
  async handleWebhook(webhookId: string, payload: any): Promise<void> {
    // Get task associated with webhook
    const { rows } = await this.db.query(
      `SELECT t.*,
         t.schedule::jsonb as schedule,
         t.trigger_config::jsonb as trigger,
         t.action::jsonb as action,
         t.conditions::jsonb as conditions,
         t.retry_policy::jsonb as "retryPolicy",
         t.notification_config::jsonb as notification,
         t.user_id as "userId",
         t.last_run_at as "lastRun",
         t.next_run_at as "nextRun",
         t.run_count as "runCount",
         t.created_at as "createdAt",
         t.updated_at as "updatedAt"
       FROM scheduled_tasks t
       JOIN task_webhooks w ON w.task_id = t.id
       WHERE w.id = $1 AND t.status = 'active'`,
      [webhookId]
    );

    if (rows.length === 0) {
      throw new Error('Webhook not found or task inactive');
    }

    const task = this.mapDbRowToTask(rows[0]);
    await this.executeTask(task);
  }

  /**
   * Generate a webhook URL for a task
   */
  generateWebhookUrl(taskId: string): string {
    const webhookId = uuidv4();
    const secret = this.generateSecret();

    // Store webhook in database
    this.db.query(
      'INSERT INTO task_webhooks (id, task_id, secret) VALUES ($1, $2, $3)',
      [webhookId, taskId, secret]
    );

    // Return webhook URL (adjust base URL as needed)
    return `/api/webhooks/${webhookId}?secret=${secret}`;
  }

  /**
   * Schedule next run time based on task configuration
   */
  scheduleNextRun(task: ScheduledTask): Date | null {
    return this.calculateNextRun(task);
  }

  /**
   * Initialize scheduler - load and schedule all active recurring tasks
   */
  async initialize(): Promise<void> {
    const { rows } = await this.db.query(
      `SELECT *,
         schedule::jsonb as schedule,
         trigger_config::jsonb as trigger,
         action::jsonb as action,
         conditions::jsonb as conditions,
         retry_policy::jsonb as "retryPolicy",
         notification_config::jsonb as notification,
         user_id as "userId",
         last_run_at as "lastRun",
         next_run_at as "nextRun",
         run_count as "runCount",
         created_at as "createdAt",
         updated_at as "updatedAt"
       FROM scheduled_tasks
       WHERE type = 'recurring' AND status = 'active'`
    );

    for (const row of rows) {
      const task = this.mapDbRowToTask(row);
      if (task.schedule?.cron) {
        this.scheduleCronJob(task);
      }
    }

    this.logger.info({ count: rows.length }, 'Initialized recurring tasks');
  }

  /**
   * Shutdown scheduler - stop all cron jobs
   */
  async shutdown(): Promise<void> {
    for (const [taskId, job] of this.cronJobs.entries()) {
      job.stop();
    }
    this.cronJobs.clear();
    this.logger.info('Scheduler shut down');
  }

  // Private helper methods

  private validateTask(input: CreateTaskInput): void {
    if (input.type === 'one-time' && !input.schedule?.at) {
      throw new Error('one-time tasks require schedule.at');
    }

    if (input.type === 'recurring' && !input.schedule?.cron) {
      throw new Error('recurring tasks require schedule.cron');
    }

    if (input.type === 'trigger' && !input.trigger) {
      throw new Error('trigger tasks require trigger configuration');
    }

    // Validate cron expression
    if (input.schedule?.cron && !cron.validate(input.schedule.cron)) {
      throw new Error('Invalid cron expression');
    }
  }

  private calculateNextRun(task: Partial<ScheduledTask & CreateTaskInput>): Date | null {
    if (task.type === 'one-time') {
      return task.schedule?.at || null;
    }

    if (task.type === 'recurring' && task.schedule?.cron) {
      // Parse cron and calculate next run
      // This is a simplified version - use a proper cron parser in production
      return new Date(Date.now() + 60000); // Placeholder: next minute
    }

    return null;
  }

  private scheduleCronJob(task: ScheduledTask): void {
    if (!task.schedule?.cron) return;

    const job = cron.schedule(
      task.schedule.cron,
      async () => {
        try {
          await this.executeTask(task);
        } catch (error: any) {
          this.logger.error(
            { task_id: task.id, error: error.message },
            'Scheduled task execution failed'
          );
        }
      },
      {
        timezone: task.schedule.timezone || 'UTC',
      }
    );

    this.cronJobs.set(task.id, job);
  }

  private unscheduleCronJob(taskId: string): void {
    const job = this.cronJobs.get(taskId);
    if (job) {
      job.stop();
      this.cronJobs.delete(taskId);
    }
  }

  private async checkConditions(conditions: TaskCondition[]): Promise<boolean> {
    // Implement condition checking logic
    // For now, return true (all conditions met)
    return true;
  }

  private async executeAction(action: TaskAction, logs: string[]): Promise<any> {
    // This will be implemented in executors.ts
    // For now, return a placeholder result
    logs.push(`Action type: ${action.type}`);
    return { success: true, action: action.type };
  }

  private async completeExecution(
    executionId: string,
    status: 'completed' | 'failed',
    result: any,
    logs: string[],
    durationMs?: number,
    error?: string
  ): Promise<void> {
    await this.db.query(
      `UPDATE task_executions
       SET status = $1, completed_at = NOW(), result = $2, logs = $3, duration_ms = $4, error = $5
       WHERE id = $6`,
      [status, JSON.stringify(result), JSON.stringify(logs), durationMs, error, executionId]
    );
  }

  private async sendNotification(
    task: ScheduledTask,
    type: 'success' | 'failure',
    data: any
  ): Promise<void> {
    // Implement notification logic
    this.logger.info(
      { task_id: task.id, type, channels: task.notification?.channels },
      'Sending notification'
    );
  }

  private generateSecret(): string {
    return uuidv4();
  }

  private mapDbRowToTask(row: any): ScheduledTask {
    return {
      id: row.id,
      userId: row.userId || row.user_id,
      name: row.name,
      description: row.description,
      type: row.type,
      schedule: row.schedule,
      trigger: row.trigger || row.trigger_config,
      action: row.action,
      conditions: row.conditions,
      retryPolicy: row.retryPolicy || row.retry_policy,
      notification: row.notification || row.notification_config,
      status: row.status,
      lastRun: row.lastRun || row.last_run_at,
      nextRun: row.nextRun || row.next_run_at,
      runCount: row.runCount || row.run_count,
      createdAt: row.createdAt || row.created_at,
      updatedAt: row.updatedAt || row.updated_at,
    };
  }
}
