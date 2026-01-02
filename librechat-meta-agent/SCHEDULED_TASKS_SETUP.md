# Scheduled Tasks & Automation System - Setup Guide

Complete task scheduling and automation system for the Meta Agent.

## Features

- **One-time Tasks**: Run once at a specific date/time
- **Recurring Tasks**: Run on a cron schedule (e.g., daily, weekly, monthly)
- **Trigger-based Tasks**: Run on webhooks, emails, or custom events
- **Multiple Action Types**:
  - AI Prompt execution with Claude
  - Email sending
  - Webhook calls (HTTP requests)
  - Code execution (Python/JavaScript)
  - Report generation
  - Web scraping
  - Task chains (workflows)
  - File operations
  - Google Workspace integration
- **Advanced Features**:
  - Conditional execution
  - Retry policies with exponential backoff
  - Execution history with logs
  - Notifications (email, webhook, push)
  - Calendar view of scheduled tasks
  - Bulk operations (pause, resume, delete)

## Installation

### 1. Install Dependencies

```bash
cd orchestrator
npm install node-cron
npm install --save-dev @types/node-cron
```

### 2. Run Database Migration

```bash
psql -U your_user -d your_database -f schemas/012_scheduled_tasks_schema.sql
```

This creates:
- `scheduled_tasks` table
- `task_executions` table
- `task_webhooks` table
- Helper functions for querying and cleanup
- Indexes for performance

### 3. Update Orchestrator Index

Edit `orchestrator/src/index.ts`:

```typescript
import { Pool } from 'pg';
import pino from 'pino';
import { ScheduledTasksEngine } from './services/scheduled-tasks';
import { SchedulerWorker } from './services/scheduler/worker';
import { TaskExecutors } from './services/scheduler/executors';
import { setupScheduledTasksRoutes } from './api/scheduled-tasks';

// Initialize database and logger
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const logger = pino();

// Initialize task engine
const taskEngine = new ScheduledTasksEngine(db, logger);

// Initialize task executors
const executors = new TaskExecutors(
  logger,
  process.env.ANTHROPIC_API_KEY!,
  {
    // Optional: Configure integrations
    // emailSender: new SMTPEmailSender(...),
    // codeSandbox: new CodeSandbox(...),
    // webScraper: new SimpleWebScraper(...),
  }
);

// Initialize scheduler worker
const worker = new SchedulerWorker(db, taskEngine, logger);

// Start worker
await worker.start();

// Setup API routes
setupScheduledTasksRoutes(app, taskEngine, logger);

// Graceful shutdown
process.on('SIGTERM', async () => {
  await worker.stop();
  await db.end();
});
```

### 4. Update Orchestrator to Use Executors

Edit `orchestrator/src/services/scheduled-tasks.ts` to integrate with executors:

```typescript
// In ScheduledTasksEngine class, update executeAction method:
private async executeAction(action: TaskAction, logs: string[]): Promise<any> {
  // Use the executors instance
  return await this.executors.execute(action, logs);
}
```

### 5. Add UI Route

Edit `ui-extensions/app/page.tsx` or your routing configuration:

```typescript
import { TaskScheduler } from '@/components/Tasks';

// Add route or tab for Task Scheduler
<TaskScheduler />
```

## API Reference

### Create Task

```http
POST /api/tasks
Content-Type: application/json

{
  "userId": "user-id",
  "name": "Daily Report",
  "description": "Generate daily analytics report",
  "type": "recurring",
  "schedule": {
    "cron": "0 9 * * *",
    "timezone": "America/New_York"
  },
  "action": {
    "type": "ai-prompt",
    "prompt": "Generate a comprehensive daily analytics report...",
    "model": "claude-3-5-sonnet-20241022"
  },
  "retryPolicy": {
    "maxRetries": 3,
    "backoffMs": 60000
  },
  "notification": {
    "onSuccess": false,
    "onFailure": true,
    "channels": ["email"]
  }
}
```

### List Tasks

```http
GET /api/tasks?userId=user-id&status=active&type=recurring
```

### Get Task

```http
GET /api/tasks/:taskId
```

### Update Task

```http
PUT /api/tasks/:taskId
Content-Type: application/json

{
  "name": "Updated Name",
  "schedule": {
    "cron": "0 10 * * *"
  }
}
```

### Delete Task

```http
DELETE /api/tasks/:taskId
```

### Pause Task

```http
POST /api/tasks/:taskId/pause
```

### Resume Task

```http
POST /api/tasks/:taskId/resume
```

### Run Task Now

```http
POST /api/tasks/:taskId/run
```

### Get Execution History

```http
GET /api/tasks/:taskId/executions?limit=50
```

### Get Upcoming Tasks

```http
GET /api/tasks/upcoming?userId=user-id&limit=10
```

### Webhook Trigger

```http
POST /api/webhooks/:webhookId?secret=your-secret
Content-Type: application/json

{
  "data": "your webhook payload"
}
```

### Generate Webhook URL

```http
POST /api/tasks/:taskId/webhook
```

## Action Types

### AI Prompt

```json
{
  "type": "ai-prompt",
  "prompt": "Analyze the latest sales data and provide insights",
  "model": "claude-3-5-sonnet-20241022"
}
```

### Send Email

```json
{
  "type": "send-email",
  "to": "user@example.com",
  "subject": "Daily Report",
  "body": "Here is your daily report..."
}
```

### Webhook (HTTP Request)

```json
{
  "type": "webhook",
  "url": "https://api.example.com/notify",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer token"
  },
  "body": {
    "message": "Task completed"
  }
}
```

### Run Code

```json
{
  "type": "run-code",
  "language": "python",
  "code": "import pandas as pd\ndf = pd.read_csv('data.csv')\nprint(df.describe())"
}
```

### Generate Report

```json
{
  "type": "generate-report",
  "config": {
    "title": "Monthly Analytics",
    "sections": ["summary", "metrics", "recommendations"]
  }
}
```

### Web Scrape

```json
{
  "type": "web-scrape",
  "url": "https://example.com/data",
  "selector": ".data-table"
}
```

### Task Chain (Workflow)

```json
{
  "type": "chain",
  "tasks": [
    {
      "type": "web-scrape",
      "url": "https://example.com/data"
    },
    {
      "type": "ai-prompt",
      "prompt": "Analyze this data: {previous_result}"
    },
    {
      "type": "send-email",
      "to": "user@example.com",
      "subject": "Analysis Complete",
      "body": "{previous_result}"
    }
  ]
}
```

## Cron Expression Examples

| Expression | Description |
|------------|-------------|
| `* * * * *` | Every minute |
| `*/5 * * * *` | Every 5 minutes |
| `0 * * * *` | Every hour |
| `0 9 * * *` | Every day at 9 AM |
| `0 9 * * 1` | Every Monday at 9 AM |
| `0 9 * * 1-5` | Every weekday at 9 AM |
| `0 0 1 * *` | First day of every month |
| `0 0 * * 0` | Every Sunday at midnight |

## Usage Examples

### Example 1: Daily Morning Report

```typescript
const task = await fetch('/api/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    name: 'Morning Briefing',
    type: 'recurring',
    schedule: {
      cron: '0 8 * * 1-5', // Weekdays at 8 AM
      timezone: 'America/New_York'
    },
    action: {
      type: 'ai-prompt',
      prompt: 'Generate a morning briefing with: 1) Top news headlines 2) Weather 3) Calendar events 4) To-do list priorities'
    },
    notification: {
      onSuccess: true,
      channels: ['email']
    }
  })
});
```

### Example 2: Data Backup

```typescript
const task = await fetch('/api/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    name: 'Nightly Backup',
    type: 'recurring',
    schedule: {
      cron: '0 2 * * *', // Every night at 2 AM
    },
    action: {
      type: 'chain',
      tasks: [
        {
          type: 'file-operation',
          operation: 'backup',
          path: '/data'
        },
        {
          type: 'webhook',
          url: 'https://storage.example.com/upload',
          method: 'POST'
        },
        {
          type: 'send-email',
          to: 'admin@example.com',
          subject: 'Backup Complete',
          body: 'Nightly backup completed successfully'
        }
      ]
    },
    retryPolicy: {
      maxRetries: 3,
      backoffMs: 300000 // 5 minutes
    },
    notification: {
      onFailure: true,
      channels: ['email']
    }
  })
});
```

### Example 3: Webhook-triggered Task

```typescript
// Create webhook task
const task = await fetch('/api/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    name: 'Process Order',
    type: 'trigger',
    trigger: {
      type: 'webhook',
      config: {}
    },
    action: {
      type: 'ai-prompt',
      prompt: 'Process this order and generate confirmation email: {webhook_payload}'
    }
  })
});

// Generate webhook URL
const webhook = await fetch(`/api/tasks/${task.id}/webhook`, {
  method: 'POST'
});
// Use webhook.webhookUrl to receive events
```

## Monitoring & Maintenance

### View Worker Status

```typescript
const stats = await worker.getStats();
console.log(stats);
// {
//   activeTasks: 10,
//   pausedTasks: 2,
//   completedTasks: 50,
//   failedTasks: 1,
//   dueSoon: 3
// }
```

### Cleanup Old Data

```typescript
// Cleanup old executions (keep last 100 per task)
await worker.cleanup(30); // Older than 30 days

// Or use SQL function directly
await db.query('SELECT cleanup_old_executions(100)');
await db.query('SELECT cleanup_completed_tasks(30)');
```

### Monitor Execution Logs

All executions are logged with:
- Start/end timestamps
- Duration
- Status (running, completed, failed)
- Result data
- Error messages
- Detailed logs

Access via:
- UI: Click "History" button on any task
- API: `GET /api/tasks/:taskId/executions`
- Database: Query `task_executions` table

## Security Considerations

1. **Webhook Secrets**: Always validate webhook secrets before executing tasks
2. **User Isolation**: Tasks are isolated by userId
3. **Code Execution**: Sandbox all code execution in isolated environments
4. **API Keys**: Store API keys securely in environment variables
5. **Rate Limiting**: Implement rate limits on task creation and execution
6. **Input Validation**: Validate all task configurations before saving

## Troubleshooting

### Tasks Not Running

1. Check worker is running: `worker.getStatus()`
2. Verify task status is 'active'
3. Check `next_run_at` timestamp
4. Review execution logs for errors

### Failed Executions

1. Check execution history for error messages
2. Verify retry policy configuration
3. Test action independently
4. Check API keys and credentials

### Performance Issues

1. Add indexes on frequently queried columns
2. Cleanup old executions regularly
3. Limit concurrent task execution
4. Optimize cron expressions

## Advanced Features

### Conditional Execution

Add conditions to tasks:

```json
{
  "conditions": [
    {
      "type": "time",
      "operator": "greater",
      "value": "09:00"
    },
    {
      "type": "variable",
      "operator": "equals",
      "value": "production"
    }
  ]
}
```

### Custom Executors

Extend the system with custom action executors:

```typescript
import { TaskExecutors } from './services/scheduler/executors';

class CustomExecutors extends TaskExecutors {
  async executeCustomAction(action: CustomAction, logs: string[]) {
    // Your custom logic
  }
}
```

## Support

For issues, questions, or feature requests, see the main project documentation.
