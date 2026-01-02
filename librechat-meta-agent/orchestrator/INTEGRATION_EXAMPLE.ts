/**
 * SCHEDULED TASKS INTEGRATION EXAMPLE
 *
 * This file shows how to integrate the scheduled tasks system
 * into your orchestrator's main index.ts file.
 */

import express from 'express';
import { Pool } from 'pg';
import pino from 'pino';
import { ScheduledTasksEngine } from './src/services/scheduled-tasks';
import { SchedulerWorker } from './src/services/scheduler/worker';
import { TaskExecutors, SMTPEmailSender, SimpleWebScraper } from './src/services/scheduler/executors';
import { setupScheduledTasksRoutes } from './src/api/scheduled-tasks';

// Initialize Express app
const app = express();
app.use(express.json());

// Initialize database connection
const db = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/librechat',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Initialize logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

// Initialize task executors with optional integrations
const executors = new TaskExecutors(
  logger,
  process.env.ANTHROPIC_API_KEY!,
  {
    // Optional: Configure email sender
    emailSender: process.env.SMTP_HOST ? new SMTPEmailSender(
      {
        host: process.env.SMTP_HOST!,
        port: parseInt(process.env.SMTP_PORT || '587'),
        user: process.env.SMTP_USER!,
        password: process.env.SMTP_PASSWORD!,
        from: process.env.SMTP_FROM || 'noreply@example.com',
      },
      logger
    ) : undefined,

    // Optional: Configure web scraper
    webScraper: new SimpleWebScraper(logger),

    // Add your custom integrations here:
    // codeSandbox: new MyCodeSandbox(logger),
    // googleWorkspace: new GoogleWorkspaceClient(logger),
  }
);

// Initialize scheduled tasks engine
const taskEngine = new ScheduledTasksEngine(db, logger);

// IMPORTANT: Integrate executors with the engine
// You need to add this property to ScheduledTasksEngine:
// private executors: TaskExecutors;
// And update the executeAction method to use it:
// return await this.executors.execute(action, logs);

// Initialize scheduler worker
const worker = new SchedulerWorker(db, taskEngine, logger);

// Setup API routes
setupScheduledTasksRoutes(app, taskEngine, logger);

// Start the server
const PORT = process.env.PORT || 3000;

async function start() {
  try {
    // Test database connection
    await db.query('SELECT NOW()');
    logger.info('Database connected');

    // Start the scheduler worker
    await worker.start();
    logger.info('Scheduler worker started');

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');

  // Stop accepting new requests
  // server.close();

  // Stop the scheduler worker
  await worker.stop();

  // Close database connections
  await db.end();

  logger.info('Shutdown complete');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');

  await worker.stop();
  await db.end();

  logger.info('Shutdown complete');
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logger.error({ error }, 'Unhandled rejection');
  process.exit(1);
});

// Start the application
start();

/**
 * ENVIRONMENT VARIABLES REQUIRED:
 *
 * Required:
 * - DATABASE_URL: PostgreSQL connection string
 * - ANTHROPIC_API_KEY: Anthropic API key for AI actions
 *
 * Optional (for email actions):
 * - SMTP_HOST: SMTP server hostname
 * - SMTP_PORT: SMTP server port (default: 587)
 * - SMTP_USER: SMTP username
 * - SMTP_PASSWORD: SMTP password
 * - SMTP_FROM: From email address
 *
 * Optional (general):
 * - PORT: Server port (default: 3000)
 * - LOG_LEVEL: Logging level (default: info)
 */

/**
 * EXAMPLE USAGE:
 *
 * 1. Create a recurring task:
 *
 * curl -X POST http://localhost:3000/api/tasks \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "userId": "user-123",
 *     "name": "Daily Report",
 *     "type": "recurring",
 *     "schedule": {
 *       "cron": "0 9 * * *",
 *       "timezone": "America/New_York"
 *     },
 *     "action": {
 *       "type": "ai-prompt",
 *       "prompt": "Generate a daily summary report"
 *     }
 *   }'
 *
 * 2. Run a task immediately:
 *
 * curl -X POST http://localhost:3000/api/tasks/{taskId}/run
 *
 * 3. View execution history:
 *
 * curl http://localhost:3000/api/tasks/{taskId}/executions
 */
