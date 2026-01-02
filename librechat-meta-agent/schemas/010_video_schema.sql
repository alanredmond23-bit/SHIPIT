-- Video Generation Schema
-- Supports text-to-video, image-to-video, video extension, and interpolation

-- Main video generations table
CREATE TABLE IF NOT EXISTS generated_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  prompt TEXT NOT NULL,
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100),
  duration_seconds INT NOT NULL,
  aspect_ratio VARCHAR(10),
  style VARCHAR(50),
  motion VARCHAR(20),
  seed BIGINT,
  status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  video_url TEXT,
  thumbnail_url TEXT,
  source_image_url TEXT,
  source_video_url TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT valid_duration CHECK (duration_seconds > 0 AND duration_seconds <= 60)
);

-- User favorites
CREATE TABLE IF NOT EXISTS video_favorites (
  user_id UUID NOT NULL,
  video_id UUID NOT NULL REFERENCES generated_videos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, video_id)
);

-- Video collections/playlists
CREATE TABLE IF NOT EXISTS video_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Videos in collections
CREATE TABLE IF NOT EXISTS collection_videos (
  collection_id UUID NOT NULL REFERENCES video_collections(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES generated_videos(id) ON DELETE CASCADE,
  position INT DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (collection_id, video_id)
);

-- Video prompt templates
CREATE TABLE IF NOT EXISTS video_prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  prompt_template TEXT NOT NULL,
  style_preset VARCHAR(50),
  motion_preset VARCHAR(20),
  default_provider VARCHAR(50),
  default_duration INT,
  default_aspect_ratio VARCHAR(10),
  category VARCHAR(100),
  tags TEXT[],
  is_public BOOLEAN DEFAULT false,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Provider performance tracking
CREATE TABLE IF NOT EXISTS video_provider_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100),
  total_requests INT DEFAULT 0,
  successful_requests INT DEFAULT 0,
  failed_requests INT DEFAULT 0,
  avg_generation_time_seconds DECIMAL(10, 2),
  total_generation_time_seconds BIGINT DEFAULT 0,
  avg_cost_per_video DECIMAL(10, 4),
  total_cost DECIMAL(10, 2) DEFAULT 0.00,
  last_request_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, model)
);

-- Video generation queue
CREATE TABLE IF NOT EXISTS video_generation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES generated_videos(id) ON DELETE CASCADE,
  priority INT DEFAULT 5,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Video analytics
CREATE TABLE IF NOT EXISTS video_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES generated_videos(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'view', 'download', 'share', 'favorite', etc.
  user_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_videos_user ON generated_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON generated_videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_provider ON generated_videos(provider);
CREATE INDEX IF NOT EXISTS idx_videos_created ON generated_videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_user_status ON generated_videos(user_id, status);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON video_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_video ON video_favorites(video_id);

CREATE INDEX IF NOT EXISTS idx_collections_user ON video_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_public ON video_collections(is_public) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_templates_user ON video_prompt_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_public ON video_prompt_templates(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_templates_category ON video_prompt_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_usage ON video_prompt_templates(usage_count DESC);

CREATE INDEX IF NOT EXISTS idx_queue_status ON video_generation_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_scheduled ON video_generation_queue(scheduled_at);

CREATE INDEX IF NOT EXISTS idx_analytics_video ON video_analytics(video_id);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON video_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON video_analytics(created_at DESC);

-- JSONB indexes for metadata searches
CREATE INDEX IF NOT EXISTS idx_videos_metadata ON generated_videos USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_analytics_metadata ON video_analytics USING gin(metadata);

-- Function to update video collection updated_at
CREATE OR REPLACE FUNCTION update_collection_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE video_collections
  SET updated_at = NOW()
  WHERE id = NEW.collection_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update collection timestamp
DROP TRIGGER IF EXISTS trg_update_collection_timestamp ON collection_videos;
CREATE TRIGGER trg_update_collection_timestamp
AFTER INSERT OR UPDATE OR DELETE ON collection_videos
FOR EACH ROW
EXECUTE FUNCTION update_collection_timestamp();

-- Function to track video analytics
CREATE OR REPLACE FUNCTION track_video_event(
  p_video_id UUID,
  p_event_type VARCHAR,
  p_user_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO video_analytics (video_id, event_type, user_id, metadata)
  VALUES (p_video_id, p_event_type, p_user_id, p_metadata)
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get video statistics
CREATE OR REPLACE FUNCTION get_video_stats(p_video_id UUID)
RETURNS TABLE(
  total_views BIGINT,
  total_downloads BIGINT,
  total_shares BIGINT,
  is_favorited BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE event_type = 'view') AS total_views,
    COUNT(*) FILTER (WHERE event_type = 'download') AS total_downloads,
    COUNT(*) FILTER (WHERE event_type = 'share') AS total_shares,
    EXISTS(SELECT 1 FROM video_favorites WHERE video_id = p_video_id) AS is_favorited
  FROM video_analytics
  WHERE video_id = p_video_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update provider performance metrics
CREATE OR REPLACE FUNCTION update_provider_performance(
  p_provider VARCHAR,
  p_model VARCHAR,
  p_success BOOLEAN,
  p_generation_time_seconds DECIMAL,
  p_cost DECIMAL DEFAULT 0.00
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO video_provider_performance (
    provider,
    model,
    total_requests,
    successful_requests,
    failed_requests,
    total_generation_time_seconds,
    total_cost,
    last_request_at
  )
  VALUES (
    p_provider,
    p_model,
    1,
    CASE WHEN p_success THEN 1 ELSE 0 END,
    CASE WHEN p_success THEN 0 ELSE 1 END,
    p_generation_time_seconds,
    p_cost,
    NOW()
  )
  ON CONFLICT (provider, model) DO UPDATE SET
    total_requests = video_provider_performance.total_requests + 1,
    successful_requests = video_provider_performance.successful_requests +
      CASE WHEN p_success THEN 1 ELSE 0 END,
    failed_requests = video_provider_performance.failed_requests +
      CASE WHEN p_success THEN 0 ELSE 1 END,
    total_generation_time_seconds = video_provider_performance.total_generation_time_seconds + p_generation_time_seconds,
    avg_generation_time_seconds =
      (video_provider_performance.total_generation_time_seconds + p_generation_time_seconds) /
      (video_provider_performance.total_requests + 1),
    total_cost = video_provider_performance.total_cost + p_cost,
    avg_cost_per_video =
      (video_provider_performance.total_cost + p_cost) /
      (video_provider_performance.total_requests + 1),
    last_request_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- View for video generation statistics
CREATE OR REPLACE VIEW video_generation_stats AS
SELECT
  DATE(created_at) AS date,
  provider,
  status,
  COUNT(*) AS count,
  AVG(duration_seconds) AS avg_duration,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) AS avg_generation_time_seconds
FROM generated_videos
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), provider, status
ORDER BY date DESC, provider;

-- View for popular video templates
CREATE OR REPLACE VIEW popular_video_templates AS
SELECT
  t.*,
  COUNT(DISTINCT v.id) AS videos_created
FROM video_prompt_templates t
LEFT JOIN generated_videos v ON v.metadata->>'template_id' = t.id::text
WHERE t.is_public = true
GROUP BY t.id
ORDER BY t.usage_count DESC, videos_created DESC
LIMIT 100;

-- Comments for documentation
COMMENT ON TABLE generated_videos IS 'Stores all generated videos from various providers';
COMMENT ON TABLE video_favorites IS 'User favorite videos';
COMMENT ON TABLE video_collections IS 'User-created video collections/playlists';
COMMENT ON TABLE video_prompt_templates IS 'Reusable prompt templates for video generation';
COMMENT ON TABLE video_provider_performance IS 'Tracks performance metrics for each provider';
COMMENT ON TABLE video_generation_queue IS 'Queue for managing video generation jobs';
COMMENT ON TABLE video_analytics IS 'Tracks user interactions with videos';

COMMENT ON COLUMN generated_videos.status IS 'Current status: queued, processing, completed, or failed';
COMMENT ON COLUMN generated_videos.progress IS 'Generation progress percentage (0-100)';
COMMENT ON COLUMN generated_videos.motion IS 'Motion intensity: slow, medium, or fast';
COMMENT ON COLUMN generated_videos.metadata IS 'Additional provider-specific metadata in JSON format';
