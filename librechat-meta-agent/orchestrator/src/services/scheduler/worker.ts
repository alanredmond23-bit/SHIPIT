import { Pool } from 'pg';
import { Logger } from 'pino';
import { ScheduledTasksEngine, ScheduledTask } from '../scheduled-tasks';

/**
 * Background worker that polls for due tasks and executes them
 */
export class SchedulerWorker {
  private isRunning: boolean = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private readonly POLL_INTERVAL_MS = 30000; // Check every 30 seconds
  private readonly BATCH_SIZE = 10; // Process up to 10 tasks per poll

  constructor(
    private db: Pool,
    private engine: ScheduledTasksEngine,
    private logger: Logger
  ) {}

  /**
   * Start the worker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Scheduler worker already running');
      return;
    }

    this.isRunning = true;
    this.logger.info('Starting scheduler worker');

    // Initialize the engine (schedule recurring tasks)
    await this.engine.initialize();

    // Start polling for due tasks
    this.pollInterval = setInterval(() => {
      this.pollAndExecute().catch((error) => {
        this.logger.error({ error: error.message }, 'Error in poll cycle');
      });
    }, this.POLL_INTERVAL_MS);

    // Run first poll immediately
    await this.pollAndExecute();

    this.logger.info(
      { pollIntervalMs: this.POLL_INTERVAL_MS },
      'Scheduler worker started'
    );
  }

  /**
   * Stop the worker
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping scheduler worker');
    this.isRunning = false;

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    // Shutdown the engine (stop cron jobs)
    await this.engine.shutdown();

    this.logger.info('Scheduler worker stopped');
  }

  /**
   * Poll for due tasks and execute them
   */
  private async pollAndExecute(): Promise<void> {
    try {
      // Find tasks that are due to run
      const dueTasks = await this.findDueTasks();

      if (dueTasks.length === 0) {
        this.logger.debug('No due tasks found');
        return;
      }

      this.logger.info({ count: dueTasks.length }, 'Found due tasks');

      // Execute tasks in parallel (with concurrency limit)
      await this.executeBatch(dueTasks);
    } catch (error: any) {
      this.logger.error({ error: error.message }, 'Failed to poll and execute tasks');
    }
  }

  /**
   * Find tasks that are due to run
   */
  private async findDueTasks(): Promise<ScheduledTask[]> {
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
       WHERE status = 'active'
         AND type IN ('one-time', 'recurring')
         AND next_run_at IS NOT NULL
         AND next_run_at <= NOW()
       ORDER BY next_run_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [this.BATCH_SIZE]
    );

    return rows.map((row) => this.mapDbRowToTask(row));
  }

  /**
   * Execute a batch of tasks with concurrency control
   */
  private async executeBatch(tasks: ScheduledTask[]): Promise<void> {
    const promises = tasks.map((task) => this.executeTaskSafely(task));
    await Promise.allSettled(promises);
  }

  /**
   * Execute a task with error handling
   */
  private async executeTaskSafely(task: ScheduledTask): Promise<void> {
    try {
      this.logger.info(
        { task_id: task.id, task_name: task.name },
        'Executing scheduled task'
      );

      await this.engine.executeTask(task);

      this.logger.info({ task_id: task.id }, 'Task executed successfully');
    } catch (error: any) {
      this.logger.error(
        { task_id: task.id, error: error.message },
        'Task execution failed'
      );

      // Check if we should retry
      await this.handleTaskFailure(task, error);
    }
  }

  /**
   * Handle task failure and retry logic
   */
  private async handleTaskFailure(task: ScheduledTask, error: Error): Promise<void> {
    const retryPolicy = task.retryPolicy;

    if (!retryPolicy) {
      // No retry policy, mark as failed
      await this.db.query(
        'UPDATE scheduled_tasks SET status = $1, updated_at = NOW() WHERE id = $2',
        ['failed', task.id]
      );
      return;
    }

    const currentRetries = task.runCount;

    if (currentRetries >= retryPolicy.maxRetries) {
      // Max retries exceeded, mark as failed
      this.logger.warn(
        { task_id: task.id, retries: currentRetries },
        'Max retries exceeded, marking task as failed'
      );

      await this.db.query(
        'UPDATE scheduled_tasks SET status = $1, updated_at = NOW() WHERE id = $2',
        ['failed', task.id]
      );
      return;
    }

    // Schedule retry with exponential backoff
    const backoffMs = this.calculateBackoff(currentRetries, retryPolicy.backoffMs);
    const retryAt = new Date(Date.now() + backoffMs);

    this.logger.info(
      { task_id: task.id, retry_at: retryAt, attempt: currentRetries + 1 },
      'Scheduling task retry'
    );

    await this.db.query(
      'UPDATE scheduled_tasks SET next_run_at = $1, updated_at = NOW() WHERE id = $2',
      [retryAt, task.id]
    );
  }

  /**
   * Calculate backoff time with exponential backoff strategy
   */
  private calculateBackoff(retryCount: number, baseBackoffMs: number): number {
    // Exponential backoff: baseBackoff * 2^retryCount
    // With jitter to avoid thundering herd
    const exponentialBackoff = baseBackoffMs * Math.pow(2, retryCount);
    const jitter = Math.random() * 0.3 * exponentialBackoff; // ±30% jitter
    return Math.min(exponentialBackoff + jitter, 3600000); // Max 1 hour
  }

  /**
   * Get worker status
   */
  getStatus(): {
    running: boolean;
    pollIntervalMs: number;
    batchSize: number;
  } {
    return {
      running: this.isRunning,
      pollIntervalMs: this.POLL_INTERVAL_MS,
      batchSize: this.BATCH_SIZE,
    };
  }

  /**
   * Get worker statistics
   */
  async getStats(): Promise<{
    activeTasks: number;
    pausedTasks: number;
    completedTasks: number;
    failedTasks: number;
    dueSoon: number;
  }> {
    const { rows } = await this.db.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'paused') as paused,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'active' AND next_run_at <= NOW() + INTERVAL '1 hour') as due_soon
      FROM scheduled_tasks
    `);

    return {
      activeTasks: parseInt(rows[0].active || '0'),
      pausedTasks: parseInt(rows[0].paused || '0'),
      completedTasks: parseInt(rows[0].completed || '0'),
      failedTasks: parseInt(rows[0].failed || '0'),
      dueSoon: parseInt(rows[0].due_soon || '0'),
    };
  }

  /**
   * Clean up old completed tasks and executions
   */
  async cleanup(olderThanDays: number = 30): Promise<{
    tasksDeleted: number;
    executionsDeleted: number;
  }> {
    this.logger.info({ olderThanDays }, 'Running cleanup');

    // Delete old completed one-time tasks
    const tasksResult = await this.db.query(
      `DELETE FROM scheduled_tasks
       WHERE type = 'one-time'
         AND status = 'completed'
         AND completed_at < NOW() - INTERVAL '1 day' * $1`,
      [olderThanDays]
    );

    // Delete old executions (keep only last 100 per task)
    const executionsResult = await this.db.query(
      `DELETE FROM task_executions
       WHERE id IN (
         SELECT id
         FROM (
           SELECT id,
                  ROW_NUMBER() OVER (PARTITION BY task_id ORDER BY started_at DESC) as rn
           FROM task_executions
         ) t
         WHERE rn > 100
       )`
    );

    const stats = {
      tasksDeleted: tasksResult.rowCount || 0,
      executionsDeleted: executionsResult.rowCount || 0,
    };

    this.logger.info(stats, 'Cleanup completed');
    return stats;
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
