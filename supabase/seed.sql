-- Enhanced Seed Data for Joanna AI Assistant
-- This file provides realistic sample data for development and testing
-- Run after migrations: supabase db reset && supabase db seed

-- ============================================
-- AI AGENTS
-- ============================================

INSERT INTO public.agents (id, user_id, name, type, status, configuration, capabilities, last_active) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    auth.uid(),
    'Task Manager Pro',
    'task_manager',
    'active',
    '{"auto_prioritize": true, "suggest_breakdowns": true, "smart_scheduling": true}'::jsonb,
    ARRAY['task_creation', 'prioritization', 'scheduling', 'dependency_detection'],
    NOW() - INTERVAL '2 hours'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    auth.uid(),
    'Workflow Orchestrator',
    'workflow_engine',
    'active',
    '{"max_concurrent_workflows": 10, "auto_recovery": true}'::jsonb,
    ARRAY['workflow_execution', 'state_management', 'condition_evaluation', 'error_handling'],
    NOW() - INTERVAL '1 hour'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    auth.uid(),
    'Research Assistant',
    'researcher',
    'active',
    '{"search_depth": "thorough", "summarize": true, "fact_check": true}'::jsonb,
    ARRAY['web_search', 'document_analysis', 'summarization', 'citation'],
    NOW() - INTERVAL '30 minutes'
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    auth.uid(),
    'Content Creator',
    'content_generator',
    'active',
    '{"tone": "professional", "length": "medium", "seo_optimize": true}'::jsonb,
    ARRAY['writing', 'editing', 'brainstorming', 'seo'],
    NOW() - INTERVAL '3 hours'
  );

-- ============================================
-- WORKFLOWS WITH COMPLETE STATE MACHINES
-- ============================================

-- Workflow 1: Daily Task Review (Active)
INSERT INTO public.workflows (id, user_id, name, description, status, trigger_type, trigger_config) VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    auth.uid(),
    'Daily Task Review',
    'Automatically review and prioritize tasks every morning at 9 AM',
    'active',
    'scheduled',
    '{"schedule": "0 9 * * *", "timezone": "UTC", "enabled": true}'::jsonb
  );

-- States for Daily Task Review
INSERT INTO public.workflow_states (id, workflow_id, name, state_type, configuration, position_x, position_y) VALUES
  ('11000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Start Review', 'start', '{"action": "initialize"}'::jsonb, 100, 100),
  ('11000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Fetch Pending Tasks', 'action', '{"query": "status IN (''todo'', ''in_progress'')", "limit": 50}'::jsonb, 300, 100),
  ('11000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Check Task Count', 'decision', '{"condition": "task_count > 0"}'::jsonb, 500, 100),
  ('11000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Prioritize Tasks', 'action', '{"agent": "task_manager", "action": "prioritize_all"}'::jsonb, 700, 100),
  ('11000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'Send Summary', 'action', '{"notification_type": "email", "template": "daily_summary"}'::jsonb, 900, 100),
  ('11000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', 'Complete', 'end', '{"log": "success"}'::jsonb, 1100, 100);

-- Transitions for Daily Task Review
INSERT INTO public.workflow_transitions (workflow_id, from_state_id, to_state_id, condition, priority) VALUES
  ('10000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000002', '{}'::jsonb, 1),
  ('10000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000003', '{}'::jsonb, 1),
  ('10000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000004', '{"task_count": {"$gt": 0}}'::jsonb, 1),
  ('10000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000006', '{"task_count": 0}'::jsonb, 2),
  ('10000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000005', '{}'::jsonb, 1),
  ('10000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000006', '{}'::jsonb, 1);

-- Workflow 2: Email-to-Task Converter (Draft)
INSERT INTO public.workflows (id, user_id, name, description, status, trigger_type, trigger_config) VALUES
  (
    '10000000-0000-0000-0000-000000000002',
    auth.uid(),
    'Email-to-Task Converter',
    'Automatically convert important emails into actionable tasks',
    'draft',
    'event',
    '{"event_type": "email_received", "filters": {"importance": "high", "folder": "inbox"}}'::jsonb
  );

-- States for Email-to-Task Converter
INSERT INTO public.workflow_states (id, workflow_id, name, state_type, configuration, position_x, position_y) VALUES
  ('12000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Receive Email', 'start', '{"source": "email_webhook"}'::jsonb, 100, 300),
  ('12000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Analyze Email', 'action', '{"agent": "task_manager", "extract": ["subject", "body", "sender"]}'::jsonb, 300, 300),
  ('12000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'Check If Actionable', 'decision', '{"threshold": 0.7}'::jsonb, 500, 300),
  ('12000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 'Create Task', 'action', '{"table": "tasks", "set_priority": true}'::jsonb, 700, 250),
  ('12000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 'Archive Email', 'action', '{"folder": "processed"}'::jsonb, 700, 350),
  ('12000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', 'Complete', 'end', '{}'::jsonb, 900, 300);

-- Transitions for Email-to-Task Converter
INSERT INTO public.workflow_transitions (workflow_id, from_state_id, to_state_id, condition, priority) VALUES
  ('10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000002', '{}'::jsonb, 1),
  ('10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000003', '{}'::jsonb, 1),
  ('10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000004', '{"is_actionable": true}'::jsonb, 1),
  ('10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000005', '{"is_actionable": false}'::jsonb, 2),
  ('10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000006', '{}'::jsonb, 1),
  ('10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000006', '{}'::jsonb, 1);

-- Workflow 3: Weekly Content Publishing (Active)
INSERT INTO public.workflows (id, user_id, name, description, status, trigger_type, trigger_config) VALUES
  (
    '10000000-0000-0000-0000-000000000003',
    auth.uid(),
    'Weekly Content Publishing',
    'Automated workflow for creating, reviewing, and publishing weekly blog content',
    'active',
    'scheduled',
    '{"schedule": "0 10 * * 1", "timezone": "UTC"}'::jsonb
  );

-- States for Weekly Content Publishing
INSERT INTO public.workflow_states (id, workflow_id, name, state_type, configuration, position_x, position_y) VALUES
  ('13000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Start', 'start', '{}'::jsonb, 100, 500),
  ('13000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'Generate Topics', 'action', '{"agent": "content_generator", "count": 3}'::jsonb, 300, 500),
  ('13000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'Research Content', 'action', '{"agent": "researcher", "depth": "thorough"}'::jsonb, 500, 500),
  ('13000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 'Draft Article', 'action', '{"agent": "content_generator", "length": "1500-2000"}'::jsonb, 700, 500),
  ('13000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', 'Review Required', 'decision', '{"auto_publish": false}'::jsonb, 900, 500),
  ('13000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000003', 'Publish', 'action', '{"platform": "blog", "notify": true}'::jsonb, 1100, 500),
  ('13000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000003', 'Complete', 'end', '{}'::jsonb, 1300, 500);

-- Transitions for Weekly Content Publishing
INSERT INTO public.workflow_transitions (workflow_id, from_state_id, to_state_id, condition, priority) VALUES
  ('10000000-0000-0000-0000-000000000003', '13000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000002', '{}'::jsonb, 1),
  ('10000000-0000-0000-0000-000000000003', '13000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000003', '{}'::jsonb, 1),
  ('10000000-0000-0000-0000-000000000003', '13000000-0000-0000-0000-000000000003', '13000000-0000-0000-0000-000000000004', '{}'::jsonb, 1),
  ('10000000-0000-0000-0000-000000000003', '13000000-0000-0000-0000-000000000004', '13000000-0000-0000-0000-000000000005', '{}'::jsonb, 1),
  ('10000000-0000-0000-0000-000000000003', '13000000-0000-0000-0000-000000000005', '13000000-0000-0000-0000-000000000006', '{"approved": true}'::jsonb, 1),
  ('10000000-0000-0000-0000-000000000003', '13000000-0000-0000-0000-000000000006', '13000000-0000-0000-0000-000000000007', '{}'::jsonb, 1);

-- ============================================
-- TASKS (10 realistic examples)
-- ============================================

INSERT INTO public.tasks (id, user_id, workflow_id, title, description, status, priority, due_date, metadata) VALUES
  -- High priority, in progress
  (
    '20000000-0000-0000-0000-000000000001',
    auth.uid(),
    NULL,
    'Implement user authentication system',
    'Build complete auth system with email/password, OAuth (Google, GitHub), and password reset functionality. Include email verification and session management.',
    'in_progress',
    1,
    NOW() + INTERVAL '2 days',
    '{"estimated_hours": 8, "actual_hours": 4, "tags": ["backend", "security", "urgent"]}'::jsonb
  ),
  -- High priority, todo
  (
    '20000000-0000-0000-0000-000000000002',
    auth.uid(),
    NULL,
    'Fix critical bug in payment processing',
    'Users reporting failed payments even when credit card is valid. Error appears to be in Stripe webhook handler.',
    'todo',
    1,
    NOW() + INTERVAL '1 day',
    '{"estimated_hours": 3, "bug_id": "BUG-1234", "tags": ["bug", "critical", "payments"]}'::jsonb
  ),
  -- Medium priority, todo
  (
    '20000000-0000-0000-0000-000000000003',
    auth.uid(),
    '10000000-0000-0000-0000-000000000001',
    'Review and update API documentation',
    'API docs are outdated. Need to document new endpoints added in v2.0 and update examples.',
    'todo',
    2,
    NOW() + INTERVAL '5 days',
    '{"estimated_hours": 6, "tags": ["documentation", "api"]}'::jsonb
  ),
  -- Medium priority, in progress
  (
    '20000000-0000-0000-0000-000000000004',
    auth.uid(),
    NULL,
    'Design database schema for new features',
    'Create ERD and migration scripts for user preferences, notification settings, and activity logs.',
    'in_progress',
    2,
    NOW() + INTERVAL '1 week',
    '{"estimated_hours": 5, "actual_hours": 2, "tags": ["database", "design"]}'::jsonb
  ),
  -- Low priority, todo
  (
    '20000000-0000-0000-0000-000000000005',
    auth.uid(),
    '10000000-0000-0000-0000-000000000003',
    'Set up automated backup system',
    'Implement daily automated backups to S3 with 30-day retention policy. Include restore testing procedure.',
    'todo',
    3,
    NOW() + INTERVAL '2 weeks',
    '{"estimated_hours": 4, "tags": ["infrastructure", "backup"]}'::jsonb
  ),
  -- Completed task
  (
    '20000000-0000-0000-0000-000000000006',
    auth.uid(),
    NULL,
    'Migrate from REST to GraphQL',
    'Successfully migrated all API endpoints from REST to GraphQL. Updated client libraries and documentation.',
    'completed',
    1,
    NOW() - INTERVAL '2 days',
    '{"estimated_hours": 20, "actual_hours": 18, "tags": ["api", "migration"], "completion_notes": "Completed ahead of schedule"}'::jsonb
  ),
  -- Blocked task
  (
    '20000000-0000-0000-0000-000000000007',
    auth.uid(),
    NULL,
    'Launch mobile app beta',
    'Release mobile app to beta testers. Blocked waiting for App Store approval.',
    'blocked',
    1,
    NOW() + INTERVAL '10 days',
    '{"estimated_hours": 2, "tags": ["mobile", "launch"], "blocked_reason": "Waiting for App Store review", "blocked_since": "2025-11-10"}'::jsonb
  ),
  -- Low priority, todo
  (
    '20000000-0000-0000-0000-000000000008',
    auth.uid(),
    NULL,
    'Optimize database queries',
    'Profile slow queries and add indexes. Focus on user dashboard and reports pages.',
    'todo',
    3,
    NOW() + INTERVAL '3 weeks',
    '{"estimated_hours": 8, "tags": ["performance", "database"]}'::jsonb
  ),
  -- Medium priority, todo with parent
  (
    '20000000-0000-0000-0000-000000000009',
    auth.uid(),
    NULL,
    'Write unit tests for auth module',
    'Achieve 90%+ code coverage for authentication module. Include edge cases and error scenarios.',
    'todo',
    2,
    NOW() + INTERVAL '4 days',
    '{"estimated_hours": 6, "tags": ["testing", "auth"], "coverage_target": 90}'::jsonb
  ),
  -- Completed task
  (
    '20000000-0000-0000-0000-000000000010',
    auth.uid(),
    '10000000-0000-0000-0000-000000000001',
    'Set up CI/CD pipeline',
    'Configured GitHub Actions for automated testing, building, and deployment to staging and production.',
    'completed',
    1,
    NOW() - INTERVAL '5 days',
    '{"estimated_hours": 10, "actual_hours": 12, "tags": ["devops", "ci-cd"]}'::jsonb
  );

-- Update completed tasks with completion timestamp
UPDATE public.tasks
SET completed_at = NOW() - INTERVAL '2 days'
WHERE id = '20000000-0000-0000-0000-000000000006';

UPDATE public.tasks
SET completed_at = NOW() - INTERVAL '5 days'
WHERE id = '20000000-0000-0000-0000-000000000010';

-- ============================================
-- TASK DEPENDENCIES
-- ============================================

INSERT INTO public.task_dependencies (task_id, depends_on_task_id, dependency_type) VALUES
  -- Auth tests depend on auth implementation
  ('20000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000001', 'blocks'),
  -- Mobile launch blocked by auth implementation
  ('20000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000001', 'blocks'),
  -- Related tasks
  ('20000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000003', 'related');

-- ============================================
-- TASK HISTORY
-- ============================================

INSERT INTO public.task_history (task_id, changed_by, change_type, old_value, new_value) VALUES
  (
    '20000000-0000-0000-0000-000000000001',
    auth.uid(),
    'status_change',
    '{"status": "todo"}'::jsonb,
    '{"status": "in_progress"}'::jsonb
  ),
  (
    '20000000-0000-0000-0000-000000000001',
    auth.uid(),
    'priority_change',
    '{"priority": 2}'::jsonb,
    '{"priority": 1}'::jsonb
  ),
  (
    '20000000-0000-0000-0000-000000000006',
    auth.uid(),
    'status_change',
    '{"status": "in_progress"}'::jsonb,
    '{"status": "completed"}'::jsonb
  );

-- ============================================
-- WORKFLOW INSTANCES
-- ============================================

-- Completed instance of Daily Task Review
INSERT INTO public.workflow_instances (id, workflow_id, user_id, status, current_state_id, context, started_at, completed_at) VALUES
  (
    '40000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    auth.uid(),
    'completed',
    '11000000-0000-0000-0000-000000000006',
    '{"task_count": 7, "prioritized": 5, "notifications_sent": 1}'::jsonb,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day' + INTERVAL '45 seconds'
  ),
  -- Running instance of Content Publishing
  (
    '40000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003',
    auth.uid(),
    'running',
    '13000000-0000-0000-0000-000000000004',
    '{"topics": ["AI in Business", "Productivity Hacks", "Remote Work"], "current_topic": "AI in Business"}'::jsonb,
    NOW() - INTERVAL '2 hours',
    NULL
  );

-- ============================================
-- WORKFLOW LOGS
-- ============================================

INSERT INTO public.workflow_logs (instance_id, state_id, action, result) VALUES
  -- Logs for completed Daily Task Review
  ('40000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'workflow_started', '{"timestamp": "2025-11-14T09:00:00Z"}'::jsonb),
  ('40000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000002', 'state_transition', '{"tasks_fetched": 7}'::jsonb),
  ('40000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000003', 'state_transition', '{"task_count": 7, "proceed": true}'::jsonb),
  ('40000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000004', 'state_transition', '{"prioritized": 5, "no_change": 2}'::jsonb),
  ('40000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000005', 'state_transition', '{"email_sent": true, "recipient": "user@example.com"}'::jsonb),
  ('40000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000006', 'workflow_completed', '{"duration_seconds": 45}'::jsonb),
  -- Logs for running Content Publishing
  ('40000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000001', 'workflow_started', '{"timestamp": "2025-11-15T10:00:00Z"}'::jsonb),
  ('40000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000002', 'state_transition', '{"topics_generated": 3}'::jsonb),
  ('40000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000003', 'state_transition', '{"research_completed": true, "sources": 12}'::jsonb);

-- ============================================
-- CONVERSATIONS & MESSAGES
-- ============================================

-- Conversation with Task Manager
INSERT INTO public.conversations (id, user_id, agent_id, title) VALUES
  (
    '50000000-0000-0000-0000-000000000001',
    auth.uid(),
    '00000000-0000-0000-0000-000000000001',
    'Planning Sprint Tasks'
  );

-- Messages in Task Manager conversation
INSERT INTO public.messages (conversation_id, role, content, metadata) VALUES
  (
    '50000000-0000-0000-0000-000000000001',
    'user',
    'Hi, I need help organizing my tasks for the upcoming sprint',
    '{"timestamp": "2025-11-15T10:00:00Z"}'::jsonb
  ),
  (
    '50000000-0000-0000-0000-000000000001',
    'assistant',
    'I''d be happy to help you organize your sprint tasks! I can see you have 7 active tasks. Let me help you prioritize them based on their deadlines and dependencies. Here''s what I recommend...',
    '{"agent_id": "00000000-0000-0000-0000-000000000001", "model": "claude-sonnet-4-5", "tokens": 156}'::jsonb
  ),
  (
    '50000000-0000-0000-0000-000000000001',
    'user',
    'What should I focus on first?',
    '{"timestamp": "2025-11-15T10:02:00Z"}'::jsonb
  ),
  (
    '50000000-0000-0000-0000-000000000001',
    'assistant',
    'Your highest priority should be "Fix critical bug in payment processing" (due tomorrow) and "Implement user authentication system" (due in 2 days). The payment bug is blocking customer transactions, so I recommend tackling that first thing today.',
    '{"agent_id": "00000000-0000-0000-0000-000000000001", "model": "claude-sonnet-4-5", "tokens": 89}'::jsonb
  );

-- Conversation with Research Assistant
INSERT INTO public.conversations (id, user_id, agent_id, title) VALUES
  (
    '50000000-0000-0000-0000-000000000002',
    auth.uid(),
    '00000000-0000-0000-0000-000000000003',
    'Research: API Best Practices'
  );

-- Messages in Research Assistant conversation
INSERT INTO public.messages (conversation_id, role, content, metadata) VALUES
  (
    '50000000-0000-0000-0000-000000000002',
    'user',
    'Can you research best practices for RESTful API design?',
    '{"timestamp": "2025-11-15T11:00:00Z"}'::jsonb
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    'assistant',
    'I''ll research the best practices for RESTful API design. Here are the key principles I found:\n\n1. **Use HTTP Methods Correctly**: GET for retrieval, POST for creation, PUT/PATCH for updates, DELETE for removal\n2. **Resource Naming**: Use nouns, not verbs (e.g., /users not /getUsers)\n3. **Consistent URL Structure**: Keep it hierarchical and logical\n4. **Versioning**: Use URL versioning (e.g., /api/v1/users)\n5. **Error Handling**: Return appropriate HTTP status codes with clear error messages\n\nWould you like me to dive deeper into any of these areas?',
    '{"agent_id": "00000000-0000-0000-0000-000000000003", "model": "claude-sonnet-4-5", "tokens": 234, "sources": ["martinfowler.com", "restfulapi.net"]}'::jsonb
  );

-- Conversation with Workflow Orchestrator
INSERT INTO public.conversations (id, user_id, agent_id, title) VALUES
  (
    '50000000-0000-0000-0000-000000000003',
    auth.uid(),
    '00000000-0000-0000-0000-000000000002',
    'Automating Weekly Reports'
  );

-- Messages in Workflow Orchestrator conversation
INSERT INTO public.messages (conversation_id, role, content, metadata) VALUES
  (
    '50000000-0000-0000-0000-000000000003',
    'user',
    'I want to automate my weekly progress reports',
    '{"timestamp": "2025-11-15T14:00:00Z"}'::jsonb
  ),
  (
    '50000000-0000-0000-0000-000000000003',
    'assistant',
    'I can help you set up an automated weekly progress report workflow! Here''s what I suggest:\n\n1. **Trigger**: Run every Friday at 5 PM\n2. **Data Collection**: Gather completed tasks, time spent, and blockers from the past week\n3. **Report Generation**: Create a formatted summary\n4. **Distribution**: Email to stakeholders or post to Slack\n\nWould you like me to create this workflow for you?',
    '{"agent_id": "00000000-0000-0000-0000-000000000002", "model": "claude-sonnet-4-5", "tokens": 178}'::jsonb
  ),
  (
    '50000000-0000-0000-0000-000000000003',
    'user',
    'Yes, that sounds perfect! Please create it.',
    '{"timestamp": "2025-11-15T14:02:00Z"}'::jsonb
  ),
  (
    '50000000-0000-0000-0000-000000000003',
    'assistant',
    'Great! I''ll create the "Weekly Progress Report" workflow for you. It will run every Friday at 5 PM and send a comprehensive report to your email. You can customize the recipients and content format in the workflow settings.',
    '{"agent_id": "00000000-0000-0000-0000-000000000002", "model": "claude-sonnet-4-5", "tokens": 92, "workflow_created": true}'::jsonb
  );

-- ============================================
-- KNOWLEDGE ITEMS
-- ============================================

INSERT INTO public.knowledge_items (id, user_id, type, title, content, tags) VALUES
  (
    '30000000-0000-0000-0000-000000000001',
    auth.uid(),
    'note',
    'Getting Started with Joanna',
    'Joanna is your intelligent personal assistant for solo entrepreneurs. Here''s how to get started:\n\n1. **Set up your first workflow**: Choose from templates or create custom workflows\n2. **Connect your tools**: Integrate email, calendar, and project management tools\n3. **Let AI agents help**: Task Manager, Workflow Engine, and Research Assistant work together\n4. **Review and refine**: Check daily summaries and adjust priorities\n\nTip: Start with the Daily Task Review workflow to see Joanna in action!',
    ARRAY['onboarding', 'guide', 'getting-started']
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    auth.uid(),
    'reference',
    'Best Practices for Workflow Design',
    'When designing workflows in Joanna:\n\n1. **Keep states simple**: Each state should have one clear purpose\n2. **Use descriptive names**: State names should explain what happens\n3. **Define clear transitions**: Specify conditions for moving between states\n4. **Handle errors**: Always include error states and recovery paths\n5. **Test thoroughly**: Run workflows in draft mode before activating\n6. **Monitor execution**: Review workflow logs to identify bottlenecks\n\nRemember: Good workflow design makes automation reliable and maintainable.',
    ARRAY['workflows', 'best-practices', 'design']
  ),
  (
    '30000000-0000-0000-0000-000000000003',
    auth.uid(),
    'reference',
    'Task Prioritization Framework',
    'Joanna uses the following framework to prioritize tasks:\n\n**Priority Levels:**\n- Priority 1 (Urgent & Important): Do first\n- Priority 2 (Important, not urgent): Schedule\n- Priority 3 (Urgent, not important): Delegate or automate\n- Priority 4 (Neither): Eliminate or defer\n\n**Factors Considered:**\n- Due date proximity\n- Dependencies (blocking other tasks)\n- Estimated effort\n- Strategic importance\n- Current workload\n\nThe AI adjusts priorities dynamically as conditions change.',
    ARRAY['tasks', 'prioritization', 'productivity']
  ),
  (
    '30000000-0000-0000-0000-000000000004',
    auth.uid(),
    'tip',
    'Using AI Agents Effectively',
    'Get the most out of Joanna''s AI agents:\n\n**Task Manager Pro**: Ask for task breakdowns, priority suggestions, and dependency detection. Example: "Break down my website redesign project"\n\n**Workflow Orchestrator**: Create automated workflows for repetitive processes. Example: "Automate my client onboarding process"\n\n**Research Assistant**: Get thorough research with citations. Example: "Research best CRM tools for solo consultants"\n\n**Content Creator**: Generate blog posts, emails, and marketing copy. Example: "Write a blog post about productivity tips"\n\nPro tip: Provide context for better results!',
    ARRAY['ai-agents', 'tips', 'productivity']
  ),
  (
    '30000000-0000-0000-0000-000000000005',
    auth.uid(),
    'documentation',
    'API Rate Limits and Quotas',
    'Joanna Edge Functions have the following limits:\n\n**Rate Limits:**\n- Task Processor: 60 requests/minute\n- Workflow Engine: 100 requests/minute\n- AI Orchestrator: 30 requests/minute (AI calls are expensive)\n\n**Quotas:**\n- Free Tier: 1,000 AI requests/month\n- Pro Tier: 10,000 AI requests/month\n- Enterprise: Unlimited\n\n**Best Practices:**\n- Cache responses when possible\n- Batch operations\n- Use webhooks instead of polling\n- Implement exponential backoff on retries',
    ARRAY['api', 'documentation', 'limits']
  ),
  (
    '30000000-0000-0000-0000-000000000006',
    auth.uid(),
    'note',
    'Weekly Review Checklist',
    'Use this checklist for your weekly review:\n\n□ Review completed tasks from past week\n□ Update priorities for upcoming week\n□ Check blocked tasks and remove blockers\n□ Review workflow execution logs\n□ Archive completed projects\n□ Plan high-priority tasks for next week\n□ Update knowledge base with learnings\n□ Check AI agent performance metrics\n\nSchedule: Every Friday 4-5 PM\nWorkflow: Can be automated with "Weekly Review" workflow',
    ARRAY['checklist', 'review', 'productivity']
  );

-- ============================================
-- AGENT MEMORY (Context and Learning)
-- ============================================

INSERT INTO public.agent_memory (agent_id, context_type, content) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'user_preferences',
    '{"preferred_priority_method": "eisenhower_matrix", "work_hours": "9-17", "timezone": "America/New_York", "break_tasks_threshold": 8}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'learning',
    '{"observation": "User prefers visual task breakdowns with time estimates", "confidence": 0.85, "date": "2025-11-10"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'user_preferences',
    '{"default_workflow_trigger": "scheduled", "notification_channel": "email", "auto_approve_low_risk": true}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'learning',
    '{"observation": "User values detailed citations and prefers academic sources", "confidence": 0.92, "date": "2025-11-12"}'::jsonb
  );

-- Note: Embeddings are intentionally NULL
-- In production, these would be generated by Edge Functions using OpenAI/Anthropic APIs
-- Example: Call embedding API when inserting messages or knowledge items
-- UPDATE messages SET embeddings = generate_embedding(content) WHERE embeddings IS NULL;
