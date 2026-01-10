-- ============================================================================
-- 022_projects_schema.sql
-- Project Workspaces for Meta Agent Desktop
-- Organize conversations and context into project workspaces
-- ============================================================================

-- ============================================================================
-- Projects Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS meta_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Project identity
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT, -- Emoji or icon identifier
    color TEXT NOT NULL DEFAULT 'teal' CHECK (color IN ('teal', 'blue', 'purple', 'pink', 'orange', 'green', 'red', 'yellow', 'indigo', 'stone')),
    template TEXT CHECK (template IN ('coding', 'research', 'writing', 'design', 'business', 'blank')),

    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
    pinned BOOLEAN NOT NULL DEFAULT FALSE,

    -- Counts (denormalized for performance)
    conversation_count INTEGER NOT NULL DEFAULT 0,
    memory_count INTEGER NOT NULL DEFAULT 0,
    file_count INTEGER NOT NULL DEFAULT 0,

    -- Defaults for new conversations
    default_model TEXT,
    default_agent_type TEXT,
    system_instructions TEXT, -- Context included in all project conversations

    -- Metadata
    metadata JSONB NOT NULL DEFAULT '{}',
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for projects
CREATE INDEX IF NOT EXISTS idx_meta_projects_user_id ON meta_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_meta_projects_status ON meta_projects(status);
CREATE INDEX IF NOT EXISTS idx_meta_projects_pinned ON meta_projects(pinned DESC);
CREATE INDEX IF NOT EXISTS idx_meta_projects_last_activity ON meta_projects(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_meta_projects_created_at ON meta_projects(created_at DESC);

-- ============================================================================
-- Project Memories Table
-- Notes, context, references, and instructions scoped to a project
-- ============================================================================

CREATE TABLE IF NOT EXISTS meta_project_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES meta_projects(id) ON DELETE CASCADE,

    -- Memory content
    title TEXT,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'note' CHECK (type IN ('note', 'context', 'reference', 'instruction')),

    -- Active flag determines if included in system prompt
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Metadata
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for project memories
CREATE INDEX IF NOT EXISTS idx_meta_project_memories_project_id ON meta_project_memories(project_id);
CREATE INDEX IF NOT EXISTS idx_meta_project_memories_type ON meta_project_memories(type);
CREATE INDEX IF NOT EXISTS idx_meta_project_memories_active ON meta_project_memories(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_meta_project_memories_created_at ON meta_project_memories(created_at DESC);

-- ============================================================================
-- Project Files Table
-- Files associated with a project
-- ============================================================================

CREATE TABLE IF NOT EXISTS meta_project_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES meta_projects(id) ON DELETE CASCADE,

    -- File info
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- MIME type
    size INTEGER NOT NULL DEFAULT 0, -- Size in bytes
    storage_path TEXT NOT NULL,
    thumbnail_path TEXT,

    -- Metadata
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for project files
CREATE INDEX IF NOT EXISTS idx_meta_project_files_project_id ON meta_project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_meta_project_files_type ON meta_project_files(type);
CREATE INDEX IF NOT EXISTS idx_meta_project_files_created_at ON meta_project_files(created_at DESC);

-- ============================================================================
-- Update conversations table to add project_id foreign key
-- ============================================================================

-- Add project_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'meta_conversations'
        AND column_name = 'project_id'
    ) THEN
        ALTER TABLE meta_conversations
        ADD COLUMN project_id UUID REFERENCES meta_projects(id) ON DELETE SET NULL;

        CREATE INDEX IF NOT EXISTS idx_meta_conversations_project_id ON meta_conversations(project_id);
    END IF;
END $$;

-- ============================================================================
-- Triggers for automatic count updates
-- ============================================================================

-- Function to update project conversation count
CREATE OR REPLACE FUNCTION update_project_conversation_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.project_id IS NOT NULL THEN
            UPDATE meta_projects
            SET conversation_count = conversation_count + 1,
                last_activity_at = NOW(),
                updated_at = NOW()
            WHERE id = NEW.project_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle project_id change
        IF OLD.project_id IS DISTINCT FROM NEW.project_id THEN
            IF OLD.project_id IS NOT NULL THEN
                UPDATE meta_projects
                SET conversation_count = GREATEST(0, conversation_count - 1),
                    updated_at = NOW()
                WHERE id = OLD.project_id;
            END IF;
            IF NEW.project_id IS NOT NULL THEN
                UPDATE meta_projects
                SET conversation_count = conversation_count + 1,
                    last_activity_at = NOW(),
                    updated_at = NOW()
                WHERE id = NEW.project_id;
            END IF;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.project_id IS NOT NULL THEN
            UPDATE meta_projects
            SET conversation_count = GREATEST(0, conversation_count - 1),
                updated_at = NOW()
            WHERE id = OLD.project_id;
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for conversation count
DROP TRIGGER IF EXISTS trigger_update_project_conversation_count ON meta_conversations;
CREATE TRIGGER trigger_update_project_conversation_count
    AFTER INSERT OR UPDATE OF project_id OR DELETE ON meta_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_project_conversation_count();

-- Function to update project memory count
CREATE OR REPLACE FUNCTION update_project_memory_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE meta_projects
        SET memory_count = memory_count + 1,
            last_activity_at = NOW(),
            updated_at = NOW()
        WHERE id = NEW.project_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE meta_projects
        SET memory_count = GREATEST(0, memory_count - 1),
            updated_at = NOW()
        WHERE id = OLD.project_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for memory count
DROP TRIGGER IF EXISTS trigger_update_project_memory_count ON meta_project_memories;
CREATE TRIGGER trigger_update_project_memory_count
    AFTER INSERT OR DELETE ON meta_project_memories
    FOR EACH ROW
    EXECUTE FUNCTION update_project_memory_count();

-- Function to update project file count
CREATE OR REPLACE FUNCTION update_project_file_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE meta_projects
        SET file_count = file_count + 1,
            last_activity_at = NOW(),
            updated_at = NOW()
        WHERE id = NEW.project_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE meta_projects
        SET file_count = GREATEST(0, file_count - 1),
            updated_at = NOW()
        WHERE id = OLD.project_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for file count
DROP TRIGGER IF EXISTS trigger_update_project_file_count ON meta_project_files;
CREATE TRIGGER trigger_update_project_file_count
    AFTER INSERT OR DELETE ON meta_project_files
    FOR EACH ROW
    EXECUTE FUNCTION update_project_file_count();

-- ============================================================================
-- Row Level Security Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE meta_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_project_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_project_files ENABLE ROW LEVEL SECURITY;

-- Projects: Users can only access their own projects
CREATE POLICY "Users can view own projects"
    ON meta_projects FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own projects"
    ON meta_projects FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own projects"
    ON meta_projects FOR UPDATE
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own projects"
    ON meta_projects FOR DELETE
    USING (auth.uid() = user_id OR user_id IS NULL);

-- Project Memories: Access through project ownership
CREATE POLICY "Users can view project memories"
    ON meta_project_memories FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM meta_projects
            WHERE meta_projects.id = meta_project_memories.project_id
            AND (meta_projects.user_id = auth.uid() OR meta_projects.user_id IS NULL)
        )
    );

CREATE POLICY "Users can insert project memories"
    ON meta_project_memories FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM meta_projects
            WHERE meta_projects.id = meta_project_memories.project_id
            AND (meta_projects.user_id = auth.uid() OR meta_projects.user_id IS NULL)
        )
    );

CREATE POLICY "Users can update project memories"
    ON meta_project_memories FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM meta_projects
            WHERE meta_projects.id = meta_project_memories.project_id
            AND (meta_projects.user_id = auth.uid() OR meta_projects.user_id IS NULL)
        )
    );

CREATE POLICY "Users can delete project memories"
    ON meta_project_memories FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM meta_projects
            WHERE meta_projects.id = meta_project_memories.project_id
            AND (meta_projects.user_id = auth.uid() OR meta_projects.user_id IS NULL)
        )
    );

-- Project Files: Access through project ownership
CREATE POLICY "Users can view project files"
    ON meta_project_files FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM meta_projects
            WHERE meta_projects.id = meta_project_files.project_id
            AND (meta_projects.user_id = auth.uid() OR meta_projects.user_id IS NULL)
        )
    );

CREATE POLICY "Users can insert project files"
    ON meta_project_files FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM meta_projects
            WHERE meta_projects.id = meta_project_files.project_id
            AND (meta_projects.user_id = auth.uid() OR meta_projects.user_id IS NULL)
        )
    );

CREATE POLICY "Users can delete project files"
    ON meta_project_files FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM meta_projects
            WHERE meta_projects.id = meta_project_files.project_id
            AND (meta_projects.user_id = auth.uid() OR meta_projects.user_id IS NULL)
        )
    );

-- ============================================================================
-- Helpful Functions
-- ============================================================================

-- Function to get project context (system instructions + active memories)
CREATE OR REPLACE FUNCTION get_project_context(p_project_id UUID)
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    project_record RECORD;
    memory_record RECORD;
BEGIN
    -- Get project info
    SELECT name, system_instructions INTO project_record
    FROM meta_projects
    WHERE id = p_project_id;

    IF NOT FOUND THEN
        RETURN '';
    END IF;

    -- Add project name
    IF project_record.name IS NOT NULL THEN
        result := 'Project: ' || project_record.name || E'\n\n';
    END IF;

    -- Add system instructions
    IF project_record.system_instructions IS NOT NULL AND project_record.system_instructions != '' THEN
        result := result || 'Project Instructions:' || E'\n' || project_record.system_instructions || E'\n\n---\n\n';
    END IF;

    -- Add active context memories
    FOR memory_record IN
        SELECT title, content, type
        FROM meta_project_memories
        WHERE project_id = p_project_id
        AND is_active = TRUE
        AND type IN ('context', 'instruction')
        ORDER BY type, created_at
    LOOP
        IF memory_record.title IS NOT NULL THEN
            result := result || memory_record.title || ':' || E'\n';
        END IF;
        result := result || memory_record.content || E'\n\n';
    END LOOP;

    RETURN TRIM(result);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get project statistics
CREATE OR REPLACE FUNCTION get_project_stats(p_project_id UUID)
RETURNS TABLE (
    total_conversations INTEGER,
    active_conversations INTEGER,
    total_memories INTEGER,
    active_memories INTEGER,
    total_files INTEGER,
    total_messages INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*)::INTEGER FROM meta_conversations WHERE project_id = p_project_id),
        (SELECT COUNT(*)::INTEGER FROM meta_conversations WHERE project_id = p_project_id AND is_archived = FALSE),
        (SELECT COUNT(*)::INTEGER FROM meta_project_memories WHERE project_id = p_project_id),
        (SELECT COUNT(*)::INTEGER FROM meta_project_memories WHERE project_id = p_project_id AND is_active = TRUE),
        (SELECT COUNT(*)::INTEGER FROM meta_project_files WHERE project_id = p_project_id),
        (SELECT COALESCE(SUM(message_count), 0)::INTEGER FROM meta_conversations WHERE project_id = p_project_id);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE meta_projects IS 'Project workspaces for organizing conversations and context';
COMMENT ON TABLE meta_project_memories IS 'Notes, context, and instructions scoped to a project';
COMMENT ON TABLE meta_project_files IS 'Files attached to a project';
COMMENT ON COLUMN meta_projects.system_instructions IS 'Context that gets prepended to every conversation in this project';
COMMENT ON COLUMN meta_project_memories.is_active IS 'When true, this memory is included in the system prompt for conversations';
COMMENT ON FUNCTION get_project_context IS 'Returns the combined system context for a project (instructions + active memories)';
