# API Documentation

## Overview

Joanna provides Edge Functions for AI processing, task management, and workflow automation.

## Base URL

```
https://fifybuzwfaegloijrmqb.supabase.co/functions/v1
```

## Authentication

All requests require a Supabase authentication token:

```
Authorization: Bearer <user-jwt-token>
```

## Edge Functions

### 1. Task Processor

**Endpoint:** `/task-processor`

#### Prioritize Task
Analyze a task and suggest priority level.

**Request:**
```json
{
  "action": "prioritize",
  "taskId": "uuid"
}
```

**Response:**
```json
{
  "taskId": "uuid",
  "currentPriority": 3,
  "suggestedPriority": 1,
  "reasoning": "Due date is tomorrow and blocks 3 other tasks"
}
```

#### Suggest Task Breakdown
AI-powered suggestion to break a task into subtasks.

**Request:**
```json
{
  "action": "suggest_breakdown",
  "taskTitle": "Launch new feature",
  "taskDescription": "Complete design, development, and testing"
}
```

**Response:**
```json
{
  "suggestions": [
    { "title": "Design mockups", "priority": 2 },
    { "title": "Implement backend API", "priority": 2 },
    { "title": "Build frontend UI", "priority": 2 },
    { "title": "Write tests", "priority": 3 },
    { "title": "Deploy to production", "priority": 1 }
  ]
}
```

#### Detect Dependencies
Analyze relationships between tasks.

**Request:**
```json
{
  "action": "detect_dependencies",
  "taskId": "uuid"
}
```

**Response:**
```json
{
  "potentialDependencies": [
    {
      "taskId": "other-uuid",
      "taskTitle": "Setup database schema",
      "confidence": 0.85,
      "reason": "Backend API requires database schema"
    }
  ]
}
```

### 2. Workflow Engine

**Endpoint:** `/workflow-engine`

#### Start Workflow
Create a new workflow instance.

**Request:**
```json
{
  "action": "start",
  "workflowId": "uuid",
  "context": {
    "customData": "value"
  }
}
```

**Response:**
```json
{
  "instance": {
    "id": "instance-uuid",
    "workflowId": "workflow-uuid",
    "status": "running",
    "currentStateId": "start-state-uuid"
  },
  "message": "Workflow started successfully"
}
```

#### Execute Transition
Move workflow to next state.

**Request:**
```json
{
  "action": "transition",
  "instanceId": "uuid"
}
```

**Response:**
```json
{
  "instanceId": "uuid",
  "newState": {
    "id": "state-uuid",
    "name": "Process Data",
    "stateType": "action"
  },
  "message": "Transition executed successfully"
}
```

### 3. AI Orchestrator

**Endpoint:** `/ai-orchestrator`

#### Send Message
Interact with AI agents.

**Request:**
```json
{
  "message": "What tasks do I have today?",
  "conversationId": "uuid", // optional
  "agentType": "task_manager", // optional
  "context": {}
}
```

**Response:**
```json
{
  "conversationId": "uuid",
  "agent": "Task Manager",
  "response": "You have 5 tasks today: 3 high priority, 2 medium priority...",
  "metadata": {
    "model": "gpt-4-turbo",
    "tokens": 150
  }
}
```

## Database API (Supabase Client)

### Tasks

#### List Tasks
```typescript
const { data: tasks } = await supabase
  .from('tasks')
  .select('*')
  .eq('user_id', userId)
  .order('priority', { ascending: true });
```

#### Create Task
```typescript
const { data: task } = await supabase
  .from('tasks')
  .insert({
    user_id: userId,
    title: 'New task',
    description: 'Task description',
    status: 'todo',
    priority: 2,
  })
  .select()
  .single();
```

#### Update Task
```typescript
const { data: task } = await supabase
  .from('tasks')
  .update({ status: 'completed' })
  .eq('id', taskId)
  .select()
  .single();
```

### Workflows

#### List Workflows
```typescript
const { data: workflows } = await supabase
  .from('workflows')
  .select('*, workflow_states(*)')
  .eq('user_id', userId);
```

#### Get Workflow Instance
```typescript
const { data: instance } = await supabase
  .from('workflow_instances')
  .select('*, workflow_logs(*)')
  .eq('id', instanceId)
  .single();
```

### Conversations

#### Get Conversation History
```typescript
const { data: messages } = await supabase
  .from('messages')
  .select('*')
  .eq('conversation_id', conversationId)
  .order('created_at', { ascending: true });
```

### Knowledge Search

#### Semantic Search
```typescript
const { data: results } = await supabase
  .rpc('search_knowledge_by_similarity', {
    query_embedding: embeddingVector,
    match_threshold: 0.7,
    match_count: 10,
  });
```

## Storage API

### Upload File
```typescript
const { data, error } = await supabase.storage
  .from('user-uploads')
  .upload(`${userId}/file.pdf`, file);
```

### Get File URL
```typescript
const { data } = supabase.storage
  .from('user-uploads')
  .getPublicUrl(`${userId}/file.pdf`);
```

### List Files
```typescript
const { data: files } = await supabase.storage
  .from('user-uploads')
  .list(`${userId}/`);
```

## Error Handling

All endpoints return errors in this format:

```json
{
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing or invalid auth token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

Currently no rate limiting is enforced. Production deployment should implement:
- 100 requests per minute per user
- 1000 requests per hour per user
- Exponential backoff for failures
