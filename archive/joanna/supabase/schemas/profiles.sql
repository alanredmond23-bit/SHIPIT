-- Declarative schema for profile-related views and functions

-- View for active user agents
CREATE OR REPLACE VIEW user_active_agents AS
SELECT
  a.id,
  a.user_id,
  a.name,
  a.type,
  a.capabilities,
  a.last_active,
  COUNT(DISTINCT am.id) as memory_count
FROM public.agents a
LEFT JOIN public.agent_memory am ON a.id = am.agent_id
WHERE a.status = 'active'
GROUP BY a.id, a.user_id, a.name, a.type, a.capabilities, a.last_active;

-- View for user task summary
CREATE OR REPLACE VIEW user_task_summary AS
SELECT
  user_id,
  COUNT(*) FILTER (WHERE status = 'todo') as todo_count,
  COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
  COUNT(*) FILTER (WHERE status = 'blocked') as blocked_count,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('completed', 'cancelled')) as overdue_count
FROM public.tasks
GROUP BY user_id;
