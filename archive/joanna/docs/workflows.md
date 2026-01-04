# Workflow System Documentation

## Overview

The Joanna workflow system enables users to create automated workflows with visual state machines. Workflows can be triggered manually, on a schedule, or by events.

## Core Concepts

### Workflow Definition
A workflow consists of:
- **States** - Individual steps in the workflow
- **Transitions** - Connections between states with conditions
- **Triggers** - What initiates the workflow
- **Context** - Runtime data passed through the workflow

### State Types

1. **Start State** - Entry point of the workflow
2. **Action State** - Performs an operation (API call, task creation, etc.)
3. **Decision State** - Evaluates conditions and branches
4. **End State** - Terminal state of the workflow

### Trigger Types

- **Manual** - User-initiated
- **Scheduled** - Cron-based timing
- **Event** - Triggered by system events
- **AI Suggested** - Proactively suggested by AI

## Workflow Lifecycle

### 1. Draft Phase
- Define states and transitions
- Configure trigger settings
- Test with sample data

### 2. Active Phase
- Workflow can be triggered
- Instances created on trigger
- State transitions executed

### 3. Execution Phase
- Instance moves through states
- Conditions evaluated
- Actions performed
- Logs recorded

### 4. Completion
- Reaches end state or fails
- Final status recorded
- Results stored

## Creating a Workflow

### Database Schema
```sql
-- Create workflow
INSERT INTO workflows (user_id, name, trigger_type) VALUES
  ('user-uuid', 'Daily Review', 'scheduled');

-- Add states
INSERT INTO workflow_states (workflow_id, name, state_type) VALUES
  ('workflow-uuid', 'Start', 'start'),
  ('workflow-uuid', 'Fetch Tasks', 'action'),
  ('workflow-uuid', 'Prioritize', 'action'),
  ('workflow-uuid', 'Complete', 'end');

-- Add transitions
INSERT INTO workflow_transitions (workflow_id, from_state_id, to_state_id, condition) VALUES
  ('workflow-uuid', 'start-uuid', 'fetch-uuid', '{}'),
  ('workflow-uuid', 'fetch-uuid', 'prioritize-uuid', '{}'),
  ('workflow-uuid', 'prioritize-uuid', 'end-uuid', '{}');
```

### Using the Workflow Engine

```typescript
import { WorkflowEngine } from '@/src/workflows/engine';

const engine = new WorkflowEngine();

// Start a workflow
const instance = await engine.startWorkflow(
  'workflow-uuid',
  'user-uuid',
  { initialData: 'value' }
);

// Execute transitions
await engine.executeTransition(instance.id, 'user-uuid');

// Pause if needed
await engine.pauseWorkflow(instance.id, 'user-uuid');

// Resume
await engine.resumeWorkflow(instance.id, 'user-uuid');

// Complete
await engine.completeWorkflow(instance.id, 'user-uuid');
```

## Workflow Patterns

### Sequential Processing
```
Start → Action 1 → Action 2 → Action 3 → End
```

### Conditional Branching
```
Start → Decision → [Condition A: Path A]
                  → [Condition B: Path B]
                  → [Default: Path C]
```

### Parallel Execution
```
Start → Fork → [Action 1]
             → [Action 2]
             → [Action 3]
         Join → End
```

## Example Workflows

### 1. Daily Task Review
- **Trigger**: Scheduled (9 AM daily)
- **Flow**: Fetch incomplete tasks → AI prioritization → Send summary email

### 2. Email to Task Converter
- **Trigger**: Event (email received)
- **Flow**: Parse email → Extract action items → Create tasks → Notify user

### 3. Project Setup Workflow
- **Trigger**: Manual
- **Flow**: Create project → Setup folder structure → Initialize git → Create initial tasks

## Monitoring & Debugging

### Workflow Logs
All state transitions and actions are logged in `workflow_logs` table:

```typescript
// Query logs for an instance
const { data: logs } = await supabase
  .from('workflow_logs')
  .select('*')
  .eq('instance_id', 'instance-uuid')
  .order('created_at', { ascending: true });
```

### Common Issues

1. **No transitions available** - Ensure all states have outgoing transitions
2. **Condition not met** - Check context data and condition logic
3. **Stuck workflow** - Review current state and available transitions

## Best Practices

1. **Keep states focused** - Each state should do one thing well
2. **Clear naming** - Use descriptive names for states and transitions
3. **Handle errors** - Add error handling states
4. **Test thoroughly** - Use manual triggers to test before scheduling
5. **Monitor execution** - Review logs regularly for optimization

## API Reference

### Edge Function: workflow-engine

**Start Workflow**
```json
POST /workflow-engine
{
  "action": "start",
  "workflowId": "uuid",
  "context": {}
}
```

**Execute Transition**
```json
POST /workflow-engine
{
  "action": "transition",
  "instanceId": "uuid"
}
```

**Pause Workflow**
```json
POST /workflow-engine
{
  "action": "pause",
  "instanceId": "uuid"
}
```
