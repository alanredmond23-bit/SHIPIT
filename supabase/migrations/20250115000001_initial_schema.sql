-- Initial Schema Migration for Joanna AI Assistant
-- Enable required extensions

-- Enable pgvector for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for additional encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================
-- USER PROFILES
-- =============================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =============================================
-- AI AGENTS
-- =============================================

CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  configuration JSONB DEFAULT '{}'::jsonb,
  capabilities TEXT[],
  last_active TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agents_user_id ON public.agents(user_id);
CREATE INDEX idx_agents_type ON public.agents(type);
CREATE INDEX idx_agents_status ON public.agents(status);

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own agents"
  ON public.agents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own agents"
  ON public.agents FOR ALL
  USING (auth.uid() = user_id);

-- =============================================
-- AGENT MEMORY
-- =============================================

CREATE TABLE public.agent_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL,
  content JSONB,
  embeddings vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_memory_agent_id ON public.agent_memory(agent_id);
CREATE INDEX idx_agent_memory_embeddings ON public.agent_memory
  USING ivfflat (embeddings vector_cosine_ops) WITH (lists = 100);

ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own agent memory"
  ON public.agent_memory FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.agents WHERE agents.id = agent_memory.agent_id AND agents.user_id = auth.uid()
  ));

-- =============================================
-- WORKFLOWS
-- =============================================

CREATE TABLE public.workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
  trigger_type TEXT CHECK (trigger_type IN ('manual', 'scheduled', 'event', 'ai_suggested')),
  trigger_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflows_user_id ON public.workflows(user_id);
CREATE INDEX idx_workflows_status ON public.workflows(status);
CREATE INDEX idx_workflows_user_status ON public.workflows(user_id, status);

ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workflows"
  ON public.workflows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own workflows"
  ON public.workflows FOR ALL
  USING (auth.uid() = user_id);

-- =============================================
-- WORKFLOW STATES
-- =============================================

CREATE TABLE public.workflow_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  state_type TEXT NOT NULL CHECK (state_type IN ('start', 'action', 'decision', 'end')),
  configuration JSONB DEFAULT '{}'::jsonb,
  position_x INTEGER,
  position_y INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflow_states_workflow_id ON public.workflow_states(workflow_id);

ALTER TABLE public.workflow_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workflow states"
  ON public.workflow_states FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workflows WHERE workflows.id = workflow_states.workflow_id AND workflows.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage own workflow states"
  ON public.workflow_states FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.workflows WHERE workflows.id = workflow_states.workflow_id AND workflows.user_id = auth.uid()
  ));

-- =============================================
-- WORKFLOW TRANSITIONS
-- =============================================

CREATE TABLE public.workflow_transitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
  from_state_id UUID REFERENCES public.workflow_states(id) ON DELETE CASCADE,
  to_state_id UUID REFERENCES public.workflow_states(id) ON DELETE CASCADE,
  condition JSONB DEFAULT '{}'::jsonb,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflow_transitions_workflow_id ON public.workflow_transitions(workflow_id);
CREATE INDEX idx_workflow_transitions_from_state ON public.workflow_transitions(from_state_id);

ALTER TABLE public.workflow_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workflow transitions"
  ON public.workflow_transitions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workflows WHERE workflows.id = workflow_transitions.workflow_id AND workflows.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage own workflow transitions"
  ON public.workflow_transitions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.workflows WHERE workflows.id = workflow_transitions.workflow_id AND workflows.user_id = auth.uid()
  ));

-- =============================================
-- TASKS
-- =============================================

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'blocked', 'completed', 'cancelled')),
  priority INTEGER DEFAULT 3,
  due_date TIMESTAMPTZ,
  assigned_to UUID REFERENCES public.profiles(id),
  agent_id UUID REFERENCES public.agents(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  parent_task_id UUID REFERENCES public.tasks(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_user_status ON public.tasks(user_id, status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date) WHERE status != 'completed';
CREATE INDEX idx_tasks_workflow_id ON public.tasks(workflow_id);
CREATE INDEX idx_tasks_parent ON public.tasks(parent_task_id);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = assigned_to);

CREATE POLICY "Users can create own tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = assigned_to);

CREATE POLICY "Users can delete own tasks"
  ON public.tasks FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- TASK DEPENDENCIES
-- =============================================

CREATE TABLE public.task_dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  dependency_type TEXT DEFAULT 'blocks' CHECK (dependency_type IN ('blocks', 'related', 'subtask')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, depends_on_task_id)
);

CREATE INDEX idx_task_dependencies_task_id ON public.task_dependencies(task_id);
CREATE INDEX idx_task_dependencies_depends_on ON public.task_dependencies(depends_on_task_id);

ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own task dependencies"
  ON public.task_dependencies FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tasks WHERE tasks.id = task_dependencies.task_id AND tasks.user_id = auth.uid()
  ));

-- =============================================
-- WORKFLOW INSTANCES
-- =============================================

CREATE TABLE public.workflow_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'paused', 'completed', 'failed')),
  current_state_id UUID REFERENCES public.workflow_states(id),
  context JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_workflow_instances_workflow_id ON public.workflow_instances(workflow_id);
CREATE INDEX idx_workflow_instances_status ON public.workflow_instances(status);
CREATE INDEX idx_workflow_instances_user_id ON public.workflow_instances(user_id);

ALTER TABLE public.workflow_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workflow instances"
  ON public.workflow_instances FOR SELECT
  USING (auth.uid() = user_id);

-- =============================================
-- WORKFLOW LOGS
-- =============================================

CREATE TABLE public.workflow_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id UUID REFERENCES public.workflow_instances(id) ON DELETE CASCADE,
  state_id UUID REFERENCES public.workflow_states(id),
  action TEXT NOT NULL,
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflow_logs_instance_id ON public.workflow_logs(instance_id);
CREATE INDEX idx_workflow_logs_created_at ON public.workflow_logs(created_at);

ALTER TABLE public.workflow_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workflow logs"
  ON public.workflow_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workflow_instances WHERE workflow_instances.id = workflow_logs.instance_id AND workflow_instances.user_id = auth.uid()
  ));

-- =============================================
-- TASK HISTORY
-- =============================================

CREATE TABLE public.task_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES public.profiles(id),
  change_type TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_task_history_task_id ON public.task_history(task_id);
CREATE INDEX idx_task_history_created_at ON public.task_history(created_at);

ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own task history"
  ON public.task_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tasks WHERE tasks.id = task_history.task_id AND tasks.user_id = auth.uid()
  ));

-- =============================================
-- CONVERSATIONS
-- =============================================

CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id),
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_conversations_agent_id ON public.conversations(agent_id);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own conversations"
  ON public.conversations FOR ALL
  USING (auth.uid() = user_id);

-- =============================================
-- MESSAGES
-- =============================================

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  embeddings vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
CREATE INDEX idx_messages_embeddings ON public.messages
  USING ivfflat (embeddings vector_cosine_ops) WITH (lists = 100);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid()
  ));

CREATE POLICY "Users can create own messages"
  ON public.messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid()
  ));

-- =============================================
-- KNOWLEDGE ITEMS
-- =============================================

CREATE TABLE public.knowledge_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  embeddings vector(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_items_user_id ON public.knowledge_items(user_id);
CREATE INDEX idx_knowledge_items_type ON public.knowledge_items(type);
CREATE INDEX idx_knowledge_items_tags ON public.knowledge_items USING GIN(tags);
CREATE INDEX idx_knowledge_items_embeddings ON public.knowledge_items
  USING ivfflat (embeddings vector_cosine_ops) WITH (lists = 100);

ALTER TABLE public.knowledge_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own knowledge items"
  ON public.knowledge_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own knowledge items"
  ON public.knowledge_items FOR ALL
  USING (auth.uid() = user_id);

-- =============================================
-- STORAGE BUCKETS SETUP
-- =============================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('user-uploads', 'user-uploads', false),
  ('task-attachments', 'task-attachments', false),
  ('workflow-templates', 'workflow-templates', false),
  ('agent-artifacts', 'agent-artifacts', false),
  ('knowledge-base', 'knowledge-base', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
CREATE POLICY "Users can upload own files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id IN ('user-uploads', 'task-attachments', 'workflow-templates', 'agent-artifacts', 'knowledge-base') AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own files"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('user-uploads', 'task-attachments', 'workflow-templates', 'agent-artifacts', 'knowledge-base') AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own files"
  ON storage.objects FOR UPDATE
  USING (bucket_id IN ('user-uploads', 'task-attachments', 'workflow-templates', 'agent-artifacts', 'knowledge-base') AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (bucket_id IN ('user-uploads', 'task-attachments', 'workflow-templates', 'agent-artifacts', 'knowledge-base') AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON public.workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_items_updated_at BEFORE UPDATE ON public.knowledge_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to list storage objects with metadata
CREATE OR REPLACE FUNCTION get_enriched_storage_objects(bucket_name TEXT)
RETURNS TABLE (
  name TEXT,
  id UUID,
  updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  metadata JSONB,
  owner UUID,
  bucket_id TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    objects.name,
    objects.id,
    objects.updated_at,
    objects.created_at,
    objects.last_accessed_at,
    objects.metadata,
    objects.owner,
    objects.bucket_id
  FROM storage.objects
  WHERE objects.bucket_id = bucket_name
    AND objects.owner = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search knowledge items by similarity
CREATE OR REPLACE FUNCTION search_knowledge_by_similarity(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    knowledge_items.id,
    knowledge_items.title,
    knowledge_items.content,
    1 - (knowledge_items.embeddings <=> query_embedding) AS similarity
  FROM public.knowledge_items
  WHERE knowledge_items.user_id = auth.uid()
    AND 1 - (knowledge_items.embeddings <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migration complete
