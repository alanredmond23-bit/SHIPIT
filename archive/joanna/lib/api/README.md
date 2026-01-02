# Joanna API Client Library

A comprehensive, type-safe TypeScript client for all Joanna AI Assistant Edge Functions.

## Features

- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Error Handling**: Built-in error handling with detailed error messages
- **Retry Logic**: Automatic retries with exponential backoff
- **Timeout Support**: Configurable timeouts for all requests
- **Debug Mode**: Optional debug logging for troubleshooting
- **JSDoc Documentation**: Complete inline documentation
- **Clean API**: Intuitive, organized interface for all Edge Functions

## Installation

The client is already part of the Joanna project. Import it from:

```typescript
import { JoannaClient, createClient } from '@/lib/api/client';
// or
import { JoannaClient, createClient } from '@/lib/api';
```

## Quick Start

### Basic Usage

```typescript
import { JoannaClient } from '@/lib/api/client';

// Create a client instance
const client = new JoannaClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  authToken: session.access_token,
});

// Use the client
const result = await client.tasks.prioritize('task-uuid');
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}
```

### Using the Factory Function

```typescript
import { createClient } from '@/lib/api/client';

// Create a client with environment variables
const client = createClient(session.access_token);

// Start using it
const response = await client.ai.chat('Help me organize my tasks');
```

## Configuration Options

```typescript
interface JoannaClientConfig {
  /** Supabase project URL (required) */
  supabaseUrl: string;

  /** Supabase anonymous key (required) */
  supabaseAnonKey: string;

  /** User authentication token - JWT from Supabase Auth (optional) */
  authToken?: string;

  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;

  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;

  /** Base delay for exponential backoff in ms (default: 1000) */
  retryDelay?: number;

  /** Enable debug logging (default: false) */
  debug?: boolean;
}
```

### Example with Custom Configuration

```typescript
const client = new JoannaClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  authToken: session.access_token,
  timeout: 60000, // 60 seconds
  maxRetries: 5, // Retry up to 5 times
  retryDelay: 2000, // Start with 2 second delay
  debug: true, // Enable debug logging
});
```

## API Reference

### Task Processor Client

Access via `client.tasks`

#### Prioritize Task

Analyze a task and get AI-powered priority suggestions.

```typescript
const result = await client.tasks.prioritize(taskId);

// Response
interface PrioritizeTaskResponse {
  taskId: string;
  currentPriority: number; // Current priority (1-5)
  suggestedPriority: number; // AI-suggested priority (1-5)
  reasoning: string; // Explanation for the suggestion
}
```

**Example:**

```typescript
const result = await client.tasks.prioritize('550e8400-e29b-41d4-a716-446655440000');

if (result.success) {
  console.log(`Current: ${result.data.currentPriority}`);
  console.log(`Suggested: ${result.data.suggestedPriority}`);
  console.log(`Because: ${result.data.reasoning}`);
}
```

#### Suggest Task Breakdown

Get AI suggestions for breaking a task into subtasks.

```typescript
const result = await client.tasks.suggestBreakdown(title, description);

// Response
interface SuggestBreakdownResponse {
  suggestions: Array<{
    title: string;
    priority: number;
    description?: string;
  }>;
}
```

**Example:**

```typescript
const result = await client.tasks.suggestBreakdown(
  'Build authentication system',
  'Implement user login, signup, password reset, and OAuth integration'
);

if (result.success) {
  result.data.suggestions.forEach((subtask, index) => {
    console.log(`${index + 1}. ${subtask.title} (Priority: ${subtask.priority})`);
  });
}
```

#### Detect Task Dependencies

Find potential dependencies between tasks.

```typescript
const result = await client.tasks.detectDependencies(taskId);

// Response
interface DetectDependenciesResponse {
  potentialDependencies: Array<{
    taskId: string;
    title: string;
    confidence: number; // 0-1
  }>;
  confidence: number; // Overall confidence score
}
```

**Example:**

```typescript
const result = await client.tasks.detectDependencies('task-uuid');

if (result.success) {
  result.data.potentialDependencies.forEach(dep => {
    console.log(`${dep.title} (${(dep.confidence * 100).toFixed(0)}% confidence)`);
  });
}
```

### Workflow Engine Client

Access via `client.workflows`

#### Start Workflow

Start a new workflow instance.

```typescript
const result = await client.workflows.start(workflowId, context);

// Response
interface WorkflowStartResponse {
  instance: {
    id: string;
    workflow_id: string;
    user_id: string;
    status: 'running' | 'paused' | 'completed' | 'failed';
    current_state_id: string;
    context: Record<string, any>;
    started_at: string;
  };
  message: string;
}
```

**Example:**

```typescript
const result = await client.workflows.start('workflow-uuid', {
  userId: 'user-123',
  source: 'manual',
  priority: 'high',
});

if (result.success) {
  const instanceId = result.data.instance.id;
  console.log(`Workflow started: ${instanceId}`);
}
```

#### Execute Transition

Move to the next state in a workflow.

```typescript
const result = await client.workflows.transition(workflowId, instanceId);

// Response
interface WorkflowTransitionResponse {
  instanceId: string;
  newState: {
    id: string;
    name: string;
    state_type: 'start' | 'action' | 'decision' | 'end';
    configuration: Record<string, any>;
  };
  message: string;
}
```

**Example:**

```typescript
const result = await client.workflows.transition('workflow-uuid', 'instance-uuid');

if (result.success) {
  console.log(`Transitioned to: ${result.data.newState.name}`);
  console.log(`State type: ${result.data.newState.state_type}`);
}
```

#### Pause Workflow

Pause a running workflow.

```typescript
const result = await client.workflows.pause(workflowId, instanceId);
```

#### Resume Workflow

Resume a paused workflow.

```typescript
const result = await client.workflows.resume(workflowId, instanceId);
```

#### Complete Workflow

Mark a workflow as completed.

```typescript
const result = await client.workflows.complete(workflowId, instanceId);
```

**Full Workflow Lifecycle Example:**

```typescript
// 1. Start workflow
const start = await client.workflows.start('workflow-uuid', { test: true });
const instanceId = start.data!.instance.id;

// 2. Execute transitions
await client.workflows.transition('workflow-uuid', instanceId);
await client.workflows.transition('workflow-uuid', instanceId);

// 3. Pause if needed
await client.workflows.pause('workflow-uuid', instanceId);

// 4. Resume
await client.workflows.resume('workflow-uuid', instanceId);

// 5. Complete
await client.workflows.complete('workflow-uuid', instanceId);
```

### AI Orchestrator Client

Access via `client.ai`

#### Chat with AI

Send a message to the AI assistant (auto-selects appropriate agent).

```typescript
const result = await client.ai.chat(message, options);

// Response
interface AiChatResponse {
  conversationId: string;
  agent: string; // Agent name that handled the request
  response: string; // AI response
  metadata: {
    agent_id?: string;
    model?: string;
    tokens?: number;
    [key: string]: any;
  };
}
```

**Example:**

```typescript
const result = await client.ai.chat('Help me organize my tasks for this week');

if (result.success) {
  console.log(`Agent: ${result.data.agent}`);
  console.log(`Response: ${result.data.response}`);
  console.log(`Conversation ID: ${result.data.conversationId}`);
}
```

#### Continue Conversation

Continue an existing conversation.

```typescript
const result = await client.ai.continueConversation(conversationId, message);
```

**Example:**

```typescript
// First message
const msg1 = await client.ai.chat('What are my tasks?');
const convId = msg1.data!.conversationId;

// Follow-up
const msg2 = await client.ai.continueConversation(convId, 'Which ones are urgent?');
const msg3 = await client.ai.continueConversation(convId, 'Help me prioritize them');
```

#### Chat with Specific Agent

Specify which agent to use.

```typescript
const result = await client.ai.chatWithAgent(agentType, message, context);

// Agent types:
// - 'task_manager': For task-related queries
// - 'workflow_engine': For workflow automation
// - 'researcher': For research and information gathering
// - 'general': General purpose assistant
```

**Example:**

```typescript
// Use task manager agent
const taskResult = await client.ai.chatWithAgent(
  'task_manager',
  'Break down this project into tasks',
  { project: 'E-commerce website' }
);

// Use workflow engine agent
const workflowResult = await client.ai.chatWithAgent(
  'workflow_engine',
  'Create a workflow for content publishing'
);

// Use researcher agent
const researchResult = await client.ai.chatWithAgent(
  'researcher',
  'Research best practices for API design'
);
```

#### Chat with Context

Include additional context for better responses.

```typescript
const result = await client.ai.chat('What should I focus on?', {
  context: {
    currentTime: new Date().toISOString(),
    timezone: 'America/New_York',
    upcomingTasks: 5,
    urgentTasks: 2,
    completedToday: 3,
  },
});
```

## Error Handling

All methods return an `ApiResponse<T>` object:

```typescript
interface ApiResponse<T> {
  data?: T; // Response data if successful
  error?: ApiError; // Error details if failed
  success: boolean; // Quick success check
}

interface ApiError {
  error: string; // Error message
  details?: any; // Additional error details
  code?: string; // Error code
  statusCode?: number; // HTTP status code
}
```

### Handling Responses

**Pattern 1: Check success flag**

```typescript
const result = await client.tasks.prioritize('task-id');

if (result.success) {
  // TypeScript knows result.data is defined
  console.log(result.data.suggestedPriority);
} else {
  // TypeScript knows result.error is defined
  console.error(result.error.error);
  console.error(`Status: ${result.error.statusCode}`);
}
```

**Pattern 2: Optional chaining**

```typescript
const result = await client.tasks.prioritize('task-id');

const priority = result.data?.suggestedPriority;
const errorMsg = result.error?.error;
```

**Pattern 3: Error handling with try-catch**

```typescript
try {
  const result = await client.tasks.prioritize('task-id');

  if (!result.success) {
    throw new Error(result.error!.error);
  }

  // Use result.data
  console.log(result.data.suggestedPriority);
} catch (error) {
  console.error('Failed to prioritize task:', error);
}
```

## Retry Logic

The client automatically retries failed requests with exponential backoff:

1. **First attempt**: Immediate
2. **Second attempt**: Wait 1s (configurable)
3. **Third attempt**: Wait 2s
4. **Fourth attempt**: Wait 4s
5. And so on...

**Retry behavior:**

- Retries on network errors
- Retries on 5xx server errors
- Retries on 429 (rate limit)
- **Does NOT retry** on 4xx client errors (except 429)

**Configure retries:**

```typescript
const client = new JoannaClient({
  supabaseUrl: '...',
  supabaseAnonKey: '...',
  maxRetries: 5, // Retry up to 5 times
  retryDelay: 2000, // Start with 2s delay
});
```

## Timeout Handling

Configure request timeouts:

```typescript
const client = new JoannaClient({
  supabaseUrl: '...',
  supabaseAnonKey: '...',
  timeout: 60000, // 60 second timeout
});
```

Requests that exceed the timeout will be aborted and return an error with `statusCode: 408`.

## Authentication

### Setting Auth Token

**On initialization:**

```typescript
const client = new JoannaClient({
  supabaseUrl: '...',
  supabaseAnonKey: '...',
  authToken: session.access_token,
});
```

**Update token later:**

```typescript
client.setAuthToken(newSession.access_token);
```

### Using with Supabase Auth

```typescript
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createJoannaClient } from '@/lib/api/client';

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Get session
const { data: { session } } = await supabase.auth.getSession();

// Create Joanna client with auth token
const client = createJoannaClient(session?.access_token);
```

### Handling Token Refresh

```typescript
// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    client.setAuthToken(session.access_token);
  }
});
```

## Debug Mode

Enable debug logging to troubleshoot issues:

```typescript
const client = new JoannaClient({
  supabaseUrl: '...',
  supabaseAnonKey: '...',
  debug: true, // Enable debug logs
});

// Will log:
// [JoannaClient] Success: task-processor { ... }
// [JoannaClient] Retry attempt 1/3 for workflow-engine
// [JoannaClient] Failed: ai-orchestrator { error: ... }
```

## TypeScript Integration

The client provides full TypeScript support:

```typescript
import { JoannaClient, PrioritizeTaskResponse, ApiResponse } from '@/lib/api/client';

const client = new JoannaClient({ /* ... */ });

// TypeScript knows the response type
const result: ApiResponse<PrioritizeTaskResponse> =
  await client.tasks.prioritize('task-id');

// Autocomplete works
result.data?.suggestedPriority; // number
result.data?.reasoning; // string
result.error?.statusCode; // number | undefined
```

## React Integration

### Using with React Hooks

```typescript
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/api/client';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';

function useTasks() {
  const session = useSession();
  const [client, setClient] = useState(() =>
    createClient(session?.access_token)
  );

  useEffect(() => {
    if (session?.access_token) {
      client.setAuthToken(session.access_token);
    }
  }, [session, client]);

  const prioritizeTask = async (taskId: string) => {
    return await client.tasks.prioritize(taskId);
  };

  return { prioritizeTask };
}

// Usage in component
function TaskPriority({ taskId }: { taskId: string }) {
  const { prioritizeTask } = useTasks();
  const [priority, setPriority] = useState<number | null>(null);

  const handlePrioritize = async () => {
    const result = await prioritizeTask(taskId);
    if (result.success) {
      setPriority(result.data.suggestedPriority);
    }
  };

  return (
    <button onClick={handlePrioritize}>
      Prioritize (Current: {priority})
    </button>
  );
}
```

## Next.js Integration

### API Route Example

```typescript
// app/api/tasks/prioritize/route.ts
import { createClient } from '@/lib/api/client';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { taskId } = await request.json();
  const authToken = request.headers.get('authorization')?.replace('Bearer ', '');

  const client = createClient(authToken);
  const result = await client.tasks.prioritize(taskId);

  if (result.success) {
    return NextResponse.json(result.data);
  } else {
    return NextResponse.json(
      { error: result.error },
      { status: result.error!.statusCode || 500 }
    );
  }
}
```

### Server Component Example

```typescript
// app/tasks/[id]/page.tsx
import { createClient } from '@/lib/api/client';
import { cookies } from 'next/headers';

export default async function TaskPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const authToken = cookieStore.get('sb-access-token')?.value;

  const client = createClient(authToken);
  const result = await client.tasks.prioritize(params.id);

  if (!result.success) {
    return <div>Error: {result.error?.error}</div>;
  }

  return (
    <div>
      <h1>Task Priority</h1>
      <p>Current: {result.data.currentPriority}</p>
      <p>Suggested: {result.data.suggestedPriority}</p>
      <p>Reasoning: {result.data.reasoning}</p>
    </div>
  );
}
```

## Best Practices

1. **Reuse client instances**: Create one client per auth token, don't create new instances for each request

2. **Handle errors gracefully**: Always check `result.success` before using `result.data`

3. **Use TypeScript**: Leverage the full type definitions for better DX

4. **Set appropriate timeouts**: Adjust timeouts based on expected response times

5. **Use debug mode in development**: Enable debug logging to troubleshoot issues

6. **Update auth tokens**: Always update the auth token when the session changes

7. **Don't retry indefinitely**: Use reasonable `maxRetries` values (3-5)

8. **Cache client instances**: In React, use `useState` or `useMemo` to cache the client

## Examples

See the `/home/user/SHIPIT/tests/edge-functions/` directory for comprehensive examples of using the client.

## Support

For issues or questions about the API client:

1. Check the JSDoc documentation (available in your IDE)
2. Review the test files for usage examples
3. Enable debug mode to see detailed logs
4. Check the Edge Function logs: `supabase functions logs {function-name}`

## License

Part of the Joanna AI Assistant project.
