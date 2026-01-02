# Database Setup Guide

## Overview

Joanna AI Assistant uses Supabase (PostgreSQL with pgvector extension) to provide a robust, scalable backend infrastructure. This guide covers database schema verification, testing queries, and RLS policies.

## Database Extensions

The following PostgreSQL extensions are enabled:

- **vector**: pgvector extension for AI embeddings (1536 dimensions)
- **uuid-ossp**: UUID generation functions
- **pgcrypto**: Additional encryption functions

## Schema Overview

The database consists of 14 main tables organized into logical groups:

### Core Tables
- `profiles` - User profiles and preferences
- `agents` - AI agent configurations
- `agent_memory` - Agent context and memory with embeddings
- `conversations` - Conversation threads
- `messages` - Individual messages with embeddings

### Task Management
- `tasks` - User tasks with workflow associations
- `task_dependencies` - Task relationships and dependencies
- `task_history` - Audit trail of task changes

### Workflow System
- `workflows` - Workflow definitions and templates
- `workflow_states` - State machine states for workflows
- `workflow_transitions` - State transitions with conditions
- `workflow_instances` - Active workflow executions
- `workflow_logs` - Execution logs and debugging

### Knowledge Base
- `knowledge_items` - Searchable knowledge base with embeddings

## Verification Commands

### 1. Verify All Tables Were Created

```sql
-- List all public schema tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected output should include:
-- agents, agent_memory, conversations, knowledge_items, messages,
-- profiles, task_dependencies, task_history, tasks,
-- workflow_instances, workflow_logs, workflow_states,
-- workflow_transitions, workflows
```

### 2. Verify Extensions

```sql
-- Check installed extensions
SELECT extname, extversion
FROM pg_extension
WHERE extname IN ('vector', 'uuid-ossp', 'pgcrypto');

-- Expected: All three extensions should be listed
```

### 3. Verify Indexes

```sql
-- List all indexes on public tables
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Should include vector indexes (ivfflat) on:
-- - agent_memory.embeddings
-- - messages.embeddings
-- - knowledge_items.embeddings
```

### 4. Verify RLS is Enabled

```sql
-- Check which tables have RLS enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- All tables should have rowsecurity = true
```

### 5. Verify Storage Buckets

```sql
-- List storage buckets
SELECT id, name, public
FROM storage.buckets
ORDER BY name;

-- Expected buckets:
-- agent-artifacts, knowledge-base, task-attachments,
-- user-uploads, workflow-templates
```

## Test Queries for Each Major Table

### Profiles

```sql
-- Get user profile with preferences
SELECT
  id,
  email,
  full_name,
  timezone,
  preferences,
  created_at
FROM public.profiles
WHERE id = auth.uid();

-- Count total profiles
SELECT COUNT(*) as total_users FROM public.profiles;
```

### Agents

```sql
-- List all active agents for current user
SELECT
  name,
  type,
  status,
  capabilities,
  last_active,
  created_at
FROM public.agents
WHERE user_id = auth.uid()
  AND status = 'active'
ORDER BY last_active DESC;

-- Get agent configuration
SELECT
  name,
  configuration
FROM public.agents
WHERE user_id = auth.uid()
  AND type = 'task_manager';
```

### Tasks

```sql
-- Get all active tasks with priority sorting
SELECT
  title,
  description,
  status,
  priority,
  due_date,
  created_at
FROM public.tasks
WHERE user_id = auth.uid()
  AND status IN ('todo', 'in_progress')
ORDER BY priority ASC, due_date ASC NULLS LAST;

-- Get overdue tasks
SELECT
  title,
  due_date,
  priority,
  status
FROM public.tasks
WHERE user_id = auth.uid()
  AND due_date < NOW()
  AND status != 'completed'
ORDER BY due_date ASC;

-- Get task completion stats by status
SELECT
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM public.tasks
WHERE user_id = auth.uid()
GROUP BY status
ORDER BY count DESC;

-- Get tasks with dependencies
SELECT
  t.title as task,
  t.status,
  dep_t.title as depends_on,
  dep_t.status as dependency_status,
  td.dependency_type
FROM public.tasks t
JOIN public.task_dependencies td ON t.id = td.task_id
JOIN public.tasks dep_t ON td.depends_on_task_id = dep_t.id
WHERE t.user_id = auth.uid()
ORDER BY t.created_at DESC;
```

### Workflows

```sql
-- List all workflows with state counts
SELECT
  w.name,
  w.description,
  w.status,
  w.trigger_type,
  COUNT(DISTINCT ws.id) as state_count,
  COUNT(DISTINCT wt.id) as transition_count
FROM public.workflows w
LEFT JOIN public.workflow_states ws ON w.id = ws.workflow_id
LEFT JOIN public.workflow_transitions wt ON w.id = wt.workflow_id
WHERE w.user_id = auth.uid()
GROUP BY w.id, w.name, w.description, w.status, w.trigger_type
ORDER BY w.created_at DESC;

-- Get workflow details with states
SELECT
  ws.name as state_name,
  ws.state_type,
  ws.configuration,
  COUNT(wt.id) as outgoing_transitions
FROM public.workflow_states ws
LEFT JOIN public.workflow_transitions wt ON ws.id = wt.from_state_id
WHERE ws.workflow_id = '<workflow-id>'
GROUP BY ws.id, ws.name, ws.state_type, ws.configuration
ORDER BY ws.created_at;
```

### Workflow Instances

```sql
-- Get active workflow instances
SELECT
  wi.id,
  w.name as workflow_name,
  wi.status,
  ws.name as current_state,
  wi.started_at,
  wi.context
FROM public.workflow_instances wi
JOIN public.workflows w ON wi.workflow_id = w.id
LEFT JOIN public.workflow_states ws ON wi.current_state_id = ws.id
WHERE wi.user_id = auth.uid()
  AND wi.status = 'running'
ORDER BY wi.started_at DESC;

-- Get workflow execution logs
SELECT
  wl.action,
  ws.name as state_name,
  wl.result,
  wl.error,
  wl.created_at
FROM public.workflow_logs wl
LEFT JOIN public.workflow_states ws ON wl.state_id = ws.id
WHERE wl.instance_id = '<instance-id>'
ORDER BY wl.created_at DESC
LIMIT 50;
```

### Conversations & Messages

```sql
-- Get recent conversations with message counts
SELECT
  c.id,
  c.title,
  a.name as agent_name,
  COUNT(m.id) as message_count,
  MAX(m.created_at) as last_message_at
FROM public.conversations c
LEFT JOIN public.agents a ON c.agent_id = a.id
LEFT JOIN public.messages m ON c.id = m.conversation_id
WHERE c.user_id = auth.uid()
GROUP BY c.id, c.title, a.name
ORDER BY last_message_at DESC NULLS LAST
LIMIT 20;

-- Get conversation history
SELECT
  role,
  content,
  metadata,
  created_at
FROM public.messages
WHERE conversation_id = '<conversation-id>'
ORDER BY created_at ASC;
```

### Knowledge Items

```sql
-- Search knowledge items by tags
SELECT
  title,
  type,
  tags,
  created_at
FROM public.knowledge_items
WHERE user_id = auth.uid()
  AND tags @> ARRAY['workflows']
ORDER BY created_at DESC;

-- Get knowledge item types distribution
SELECT
  type,
  COUNT(*) as count
FROM public.knowledge_items
WHERE user_id = auth.uid()
GROUP BY type
ORDER BY count DESC;
```

### Semantic Search (Vector Similarity)

```sql
-- Search knowledge base by similarity
-- Note: Replace '[0.1, 0.2, ..., 0.5]' with actual embedding vector
SELECT
  id,
  title,
  content,
  similarity
FROM search_knowledge_by_similarity(
  '[0.1, 0.2, ..., 0.5]'::vector(1536),
  0.7,  -- match_threshold
  10    -- match_count
);
```

## Row Level Security (RLS) Policies

### Profiles Table

**Policies:**
- `Users can view own profile` - Users can SELECT their own profile
- `Users can update own profile` - Users can UPDATE their own profile
- `Users can insert own profile` - Users can INSERT their own profile

**SQL:**
```sql
-- View policies for a table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'profiles';
```

### Agents Table

**Policies:**
- `Users can view own agents` - SELECT based on user_id match
- `Users can manage own agents` - ALL operations based on user_id match

### Tasks Table

**Policies:**
- `Users can view own tasks` - SELECT for tasks where user is owner or assignee
- `Users can create own tasks` - INSERT only if user is the creator
- `Users can update own tasks` - UPDATE for tasks where user is owner or assignee
- `Users can delete own tasks` - DELETE only if user is the owner

### Workflows Table

**Policies:**
- `Users can view own workflows` - SELECT based on user_id match
- `Users can manage own workflows` - ALL operations based on user_id match

### Nested Resource Policies

For tables like `workflow_states`, `workflow_transitions`, and `messages`, RLS policies use subqueries to verify ownership through parent resources:

```sql
-- Example: workflow_states policy
CREATE POLICY "Users can view own workflow states"
  ON public.workflow_states FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workflows
    WHERE workflows.id = workflow_states.workflow_id
      AND workflows.user_id = auth.uid()
  ));
```

### Storage Policies

**Buckets:** user-uploads, task-attachments, workflow-templates, agent-artifacts, knowledge-base

**Policies:**
- Files are organized by user ID as the first folder level
- Users can INSERT/SELECT/UPDATE/DELETE only their own files
- Files must be stored in path format: `{user_id}/{filename}`

```sql
-- Example: storage.objects policies
CREATE POLICY "Users can upload own files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id IN ('user-uploads', 'task-attachments', ...)
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

## Helper Functions

### update_updated_at_column()

Automatically updates the `updated_at` timestamp on UPDATE operations.

**Applies to:** profiles, agents, workflows, tasks, conversations, knowledge_items

```sql
-- Trigger example
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### get_enriched_storage_objects(bucket_name TEXT)

Returns storage objects with full metadata for the authenticated user.

**Usage:**
```sql
SELECT * FROM get_enriched_storage_objects('task-attachments');
```

### search_knowledge_by_similarity(query_embedding, match_threshold, match_count)

Performs semantic search using vector similarity (cosine distance).

**Parameters:**
- `query_embedding` - vector(1536): Embedding to search for
- `match_threshold` - FLOAT: Minimum similarity score (0-1)
- `match_count` - INT: Maximum results to return

**Returns:** id, title, content, similarity

**Usage:**
```sql
SELECT * FROM search_knowledge_by_similarity(
  query_embedding := '<your-embedding-vector>'::vector(1536),
  match_threshold := 0.7,
  match_count := 5
);
```

## Performance Optimization

### Indexes

**B-tree indexes** for common queries:
- Foreign keys (user_id, workflow_id, task_id, etc.)
- Status fields
- Composite indexes for common filter combinations

**GIN indexes:**
- Array fields (tags, capabilities)

**IVFFlat indexes** for vector similarity:
- embeddings columns (configured with 100 lists)

### Query Optimization Tips

1. **Use composite indexes**: The schema includes `idx_tasks_user_status` for common user+status queries
2. **Leverage partial indexes**: `idx_tasks_due_date` only indexes non-completed tasks
3. **Vector search tuning**: Adjust IVFFlat lists parameter based on dataset size
4. **Use prepared statements**: For frequently executed queries

## Common Troubleshooting

### RLS Policy Issues

```sql
-- Check if RLS is blocking your queries
SET role TO authenticated;
SET request.jwt.claim.sub = '<user-uuid>';

-- Run your query to test RLS
SELECT * FROM public.tasks;
```

### Missing Embeddings

```sql
-- Find records without embeddings
SELECT COUNT(*)
FROM public.messages
WHERE embeddings IS NULL;

SELECT COUNT(*)
FROM public.knowledge_items
WHERE embeddings IS NULL;
```

### Performance Issues

```sql
-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM public.tasks
WHERE user_id = '<uuid>'
  AND status = 'todo';

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

## Backup and Recovery

### Backup Commands

```bash
# Using Supabase CLI
supabase db dump -f backup.sql

# Backup specific tables
supabase db dump -f tasks_backup.sql --table tasks
```

### Restore Commands

```bash
# Restore from backup
supabase db reset
psql -h db.fifybuzwfaegloijrmqb.supabase.co -U postgres -d postgres -f backup.sql
```

## Next Steps

1. **Run Migrations**: Ensure all migrations are applied
   ```bash
   supabase db push
   ```

2. **Seed Database**: Load sample data for testing
   ```bash
   supabase db seed
   ```

3. **Test Edge Functions**: Verify Edge Functions can connect to database
   ```bash
   supabase functions serve
   ```

4. **Configure Environment**: Set up `.env.local` with database credentials

5. **Monitor Performance**: Use Supabase dashboard to monitor query performance

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [PostgreSQL RLS Guide](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Workflow Architecture](./workflows.md)
- [API Reference](./api.md)
