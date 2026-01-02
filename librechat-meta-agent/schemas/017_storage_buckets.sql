-- Storage Buckets Schema
-- Merged from Joanna for organized file storage with RLS

-- =============================================
-- STORAGE BUCKETS (for Supabase Storage)
-- =============================================

-- Create storage buckets if using Supabase
DO $$
BEGIN
  -- Check if storage schema exists (Supabase)
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    -- Create organized buckets
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES
      ('user-uploads', 'user-uploads', false, 52428800, ARRAY['image/*', 'application/pdf', 'text/*', 'application/json']),
      ('task-attachments', 'task-attachments', false, 104857600, NULL),
      ('workflow-templates', 'workflow-templates', false, 10485760, ARRAY['application/json']),
      ('agent-artifacts', 'agent-artifacts', false, 104857600, NULL),
      ('knowledge-base', 'knowledge-base', false, 52428800, ARRAY['application/pdf', 'text/*', 'application/json', 'application/vnd.openxmlformats-officedocument.*']),
      ('generated-images', 'generated-images', true, 20971520, ARRAY['image/*']),
      ('generated-videos', 'generated-videos', true, 524288000, ARRAY['video/*']),
      ('voice-recordings', 'voice-recordings', false, 104857600, ARRAY['audio/*']),
      ('conversation-exports', 'conversation-exports', false, 52428800, ARRAY['application/json', 'text/*', 'application/pdf'])
    ON CONFLICT (id) DO NOTHING;

    -- RLS Policies for storage objects
    CREATE POLICY IF NOT EXISTS "Users can upload own files"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id IN ('user-uploads', 'task-attachments', 'workflow-templates', 'agent-artifacts', 'knowledge-base', 'voice-recordings', 'conversation-exports')
        AND auth.uid()::text = (storage.foldername(name))[1]
      );

    CREATE POLICY IF NOT EXISTS "Users can view own files"
      ON storage.objects FOR SELECT
      USING (
        bucket_id IN ('user-uploads', 'task-attachments', 'workflow-templates', 'agent-artifacts', 'knowledge-base', 'voice-recordings', 'conversation-exports')
        AND auth.uid()::text = (storage.foldername(name))[1]
      );

    CREATE POLICY IF NOT EXISTS "Users can update own files"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id IN ('user-uploads', 'task-attachments', 'workflow-templates', 'agent-artifacts', 'knowledge-base', 'voice-recordings', 'conversation-exports')
        AND auth.uid()::text = (storage.foldername(name))[1]
      );

    CREATE POLICY IF NOT EXISTS "Users can delete own files"
      ON storage.objects FOR DELETE
      USING (
        bucket_id IN ('user-uploads', 'task-attachments', 'workflow-templates', 'agent-artifacts', 'knowledge-base', 'voice-recordings', 'conversation-exports')
        AND auth.uid()::text = (storage.foldername(name))[1]
      );

    -- Public buckets policies
    CREATE POLICY IF NOT EXISTS "Anyone can view public generated images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'generated-images');

    CREATE POLICY IF NOT EXISTS "Anyone can view public generated videos"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'generated-videos');

  END IF;
END $$;

-- =============================================
-- FILE METADATA TABLE (for any storage backend)
-- =============================================
CREATE TABLE IF NOT EXISTS meta_file_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  bucket TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  original_name TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  checksum TEXT,
  -- Related entities
  project_id UUID REFERENCES meta_projects(id) ON DELETE SET NULL,
  task_id UUID REFERENCES meta_tasks(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES meta_conversations(id) ON DELETE SET NULL,
  -- Processing status
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_error TEXT,
  -- Extracted content
  extracted_text TEXT,
  text_embedding vector(1536),
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  tags TEXT[],
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(bucket, file_path)
);

CREATE INDEX idx_file_metadata_user_id ON meta_file_metadata(user_id);
CREATE INDEX idx_file_metadata_bucket ON meta_file_metadata(bucket);
CREATE INDEX idx_file_metadata_project_id ON meta_file_metadata(project_id);
CREATE INDEX idx_file_metadata_task_id ON meta_file_metadata(task_id);
CREATE INDEX idx_file_metadata_conversation_id ON meta_file_metadata(conversation_id);
CREATE INDEX idx_file_metadata_mime_type ON meta_file_metadata(mime_type);
CREATE INDEX idx_file_metadata_tags ON meta_file_metadata USING GIN(tags);
CREATE INDEX idx_file_metadata_text_embedding ON meta_file_metadata USING ivfflat (text_embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_file_metadata_created_at ON meta_file_metadata(created_at DESC);

-- Enable RLS
ALTER TABLE meta_file_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own file metadata"
  ON meta_file_metadata FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can manage own file metadata"
  ON meta_file_metadata FOR ALL
  USING (user_id = auth.uid() OR user_id IS NULL);

-- =============================================
-- STORAGE QUOTAS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS meta_storage_quotas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE,
  total_quota_bytes BIGINT DEFAULT 5368709120, -- 5GB default
  used_bytes BIGINT DEFAULT 0,
  file_count INTEGER DEFAULT 0,
  -- Per-bucket limits
  bucket_quotas JSONB DEFAULT '{}'::jsonb,
  -- Plan info
  plan_type TEXT DEFAULT 'free',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_storage_quotas_user_id ON meta_storage_quotas(user_id);

ALTER TABLE meta_storage_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own storage quota"
  ON meta_storage_quotas FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Update storage quota on file changes
CREATE OR REPLACE FUNCTION update_storage_quota()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO meta_storage_quotas (user_id, used_bytes, file_count)
    VALUES (NEW.user_id, NEW.size_bytes, 1)
    ON CONFLICT (user_id) DO UPDATE
    SET used_bytes = meta_storage_quotas.used_bytes + EXCLUDED.used_bytes,
        file_count = meta_storage_quotas.file_count + 1,
        updated_at = NOW();
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE meta_storage_quotas
    SET used_bytes = GREATEST(0, used_bytes - COALESCE(OLD.size_bytes, 0)),
        file_count = GREATEST(0, file_count - 1),
        updated_at = NOW()
    WHERE user_id = OLD.user_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.size_bytes IS DISTINCT FROM NEW.size_bytes THEN
    UPDATE meta_storage_quotas
    SET used_bytes = used_bytes - COALESCE(OLD.size_bytes, 0) + COALESCE(NEW.size_bytes, 0),
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_storage_quota_trigger
  AFTER INSERT OR UPDATE OR DELETE ON meta_file_metadata
  FOR EACH ROW EXECUTE FUNCTION update_storage_quota();

-- Search files by content similarity
CREATE OR REPLACE FUNCTION search_files_by_content(
  p_user_id UUID,
  p_query_embedding vector(1536),
  p_limit INTEGER DEFAULT 20,
  p_bucket TEXT DEFAULT NULL,
  p_min_similarity FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  file_name TEXT,
  bucket TEXT,
  file_path TEXT,
  mime_type TEXT,
  similarity FLOAT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.file_name,
    f.bucket,
    f.file_path,
    f.mime_type,
    1 - (f.text_embedding <=> p_query_embedding) as similarity,
    f.created_at
  FROM meta_file_metadata f
  WHERE (f.user_id = p_user_id OR f.user_id IS NULL)
    AND (p_bucket IS NULL OR f.bucket = p_bucket)
    AND f.text_embedding IS NOT NULL
    AND (1 - (f.text_embedding <=> p_query_embedding)) >= p_min_similarity
  ORDER BY f.text_embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Get storage usage summary
CREATE OR REPLACE FUNCTION get_storage_summary(p_user_id UUID)
RETURNS TABLE (
  total_quota_bytes BIGINT,
  used_bytes BIGINT,
  file_count INTEGER,
  usage_percentage FLOAT,
  bucket_breakdown JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.total_quota_bytes,
    q.used_bytes,
    q.file_count,
    CASE WHEN q.total_quota_bytes > 0
      THEN (q.used_bytes::FLOAT / q.total_quota_bytes::FLOAT) * 100
      ELSE 0
    END as usage_percentage,
    COALESCE(
      (SELECT jsonb_object_agg(bucket, bucket_stats)
       FROM (
         SELECT bucket, jsonb_build_object(
           'count', COUNT(*),
           'size', SUM(size_bytes)
         ) as bucket_stats
         FROM meta_file_metadata
         WHERE user_id = p_user_id
         GROUP BY bucket
       ) b),
      '{}'::jsonb
    ) as bucket_breakdown
  FROM meta_storage_quotas q
  WHERE q.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Update accessed_at on file access
CREATE OR REPLACE FUNCTION touch_file(p_file_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE meta_file_metadata
  SET accessed_at = NOW()
  WHERE id = p_file_id;
END;
$$ LANGUAGE plpgsql;
