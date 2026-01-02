-- ============================================================================
-- Image Generation System Schema
-- ============================================================================
-- This schema supports multi-provider image generation (DALL-E, Stability AI, Replicate)
-- Includes support for generation, editing, variations, upscaling, and style transfer

-- Main table for generated images
CREATE TABLE IF NOT EXISTS generated_images (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User and context
  user_id VARCHAR(255),
  conversation_id VARCHAR(255),
  task_id VARCHAR(255),

  -- Generation parameters
  prompt TEXT NOT NULL,
  revised_prompt TEXT, -- AI-enhanced or revised prompt (DALL-E provides this)
  negative_prompt TEXT,

  -- Provider and model info
  provider VARCHAR(50) NOT NULL, -- 'dalle3', 'stability', 'replicate'
  model VARCHAR(100) NOT NULL, -- e.g., 'dall-e-3', 'stable-diffusion-xl-1024-v1-0', 'sdxl'

  -- Image specifications
  size VARCHAR(20) NOT NULL, -- e.g., '1024x1024', '1024x1792', '1792x1024'
  quality VARCHAR(20), -- 'standard', 'hd'
  style VARCHAR(50), -- 'natural', 'vivid', 'anime', 'photorealistic', 'digital-art', '3d-render'

  -- Generation settings
  seed BIGINT, -- Random seed for reproducibility
  steps INTEGER, -- Number of inference steps (Stability/Replicate)
  cfg_scale DECIMAL(4, 2), -- Classifier-free guidance scale
  sampler VARCHAR(50), -- Sampling method

  -- URLs and storage
  url TEXT, -- CDN or external URL
  storage_path TEXT, -- Local storage path
  thumbnail_path TEXT, -- Thumbnail for previews

  -- Editing/variation metadata
  parent_image_id UUID REFERENCES generated_images(id), -- For variations/edits
  edit_type VARCHAR(50), -- 'inpaint', 'outpaint', 'variation', 'upscale', 'style-transfer'
  mask_storage_path TEXT, -- For inpainting operations
  strength DECIMAL(3, 2), -- Edit strength (0.0-1.0)

  -- Image metadata
  width INTEGER,
  height INTEGER,
  format VARCHAR(10), -- 'png', 'jpg', 'webp'
  file_size INTEGER, -- Size in bytes

  -- Additional metadata
  metadata JSONB, -- Additional provider-specific metadata

  -- Cost tracking
  cost_usd DECIMAL(10, 6), -- Cost in USD
  credits_used INTEGER, -- Provider credits consumed

  -- Status and timestamps
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'generating', 'completed', 'failed'
  error_message TEXT,
  generation_time_ms INTEGER, -- Time taken to generate
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_provider CHECK (provider IN ('dalle3', 'stability', 'replicate')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  CONSTRAINT valid_strength CHECK (strength IS NULL OR (strength >= 0 AND strength <= 1)),
  CONSTRAINT valid_cfg_scale CHECK (cfg_scale IS NULL OR (cfg_scale >= 0 AND cfg_scale <= 20))
);

-- User favorites for generated images
CREATE TABLE IF NOT EXISTS image_favorites (
  user_id VARCHAR(255) NOT NULL,
  image_id UUID NOT NULL REFERENCES generated_images(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (user_id, image_id)
);

-- Prompt templates and presets
CREATE TABLE IF NOT EXISTS prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  prompt_template TEXT NOT NULL,
  negative_prompt_template TEXT,

  -- Default settings
  style_preset VARCHAR(50),
  default_provider VARCHAR(50),
  default_size VARCHAR(20),
  default_quality VARCHAR(20),

  -- Usage and sharing
  is_public BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,

  -- Categorization
  category VARCHAR(100), -- 'portrait', 'landscape', 'abstract', 'character', etc.
  tags TEXT[], -- Array of tags

  -- Metadata
  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_template_provider CHECK (default_provider IS NULL OR default_provider IN ('dalle3', 'stability', 'replicate'))
);

-- Image collections/albums
CREATE TABLE IF NOT EXISTS image_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cover_image_id UUID REFERENCES generated_images(id),
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Images in collections (many-to-many)
CREATE TABLE IF NOT EXISTS collection_images (
  collection_id UUID NOT NULL REFERENCES image_collections(id) ON DELETE CASCADE,
  image_id UUID NOT NULL REFERENCES generated_images(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (collection_id, image_id)
);

-- Usage statistics and analytics
CREATE TABLE IF NOT EXISTS image_generation_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255),
  date DATE NOT NULL,
  provider VARCHAR(50) NOT NULL,

  -- Counts
  total_generations INTEGER DEFAULT 0,
  successful_generations INTEGER DEFAULT 0,
  failed_generations INTEGER DEFAULT 0,

  -- Costs
  total_cost_usd DECIMAL(10, 2) DEFAULT 0,
  total_credits_used INTEGER DEFAULT 0,

  -- Timing
  avg_generation_time_ms INTEGER,
  total_generation_time_ms BIGINT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (user_id, date, provider)
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Generated images indexes
CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_conversation_id ON generated_images(conversation_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_task_id ON generated_images(task_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_provider ON generated_images(provider);
CREATE INDEX IF NOT EXISTS idx_generated_images_status ON generated_images(status);
CREATE INDEX IF NOT EXISTS idx_generated_images_parent_id ON generated_images(parent_image_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_created_at ON generated_images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_images_user_created ON generated_images(user_id, created_at DESC);

-- Full-text search on prompts
CREATE INDEX IF NOT EXISTS idx_generated_images_prompt_fts
  ON generated_images USING gin(to_tsvector('english', prompt));
CREATE INDEX IF NOT EXISTS idx_generated_images_revised_prompt_fts
  ON generated_images USING gin(to_tsvector('english', revised_prompt));

-- GIN index for metadata JSONB
CREATE INDEX IF NOT EXISTS idx_generated_images_metadata
  ON generated_images USING gin(metadata);

-- Favorites indexes
CREATE INDEX IF NOT EXISTS idx_image_favorites_user_id ON image_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_image_favorites_image_id ON image_favorites(image_id);
CREATE INDEX IF NOT EXISTS idx_image_favorites_created_at ON image_favorites(created_at DESC);

-- Prompt templates indexes
CREATE INDEX IF NOT EXISTS idx_prompt_templates_user_id ON prompt_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_is_public ON prompt_templates(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_prompt_templates_is_featured ON prompt_templates(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_prompt_templates_category ON prompt_templates(category);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_usage_count ON prompt_templates(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_tags ON prompt_templates USING gin(tags);

-- Full-text search on templates
CREATE INDEX IF NOT EXISTS idx_prompt_templates_name_fts
  ON prompt_templates USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_prompt_templates_prompt_fts
  ON prompt_templates USING gin(to_tsvector('english', prompt_template));

-- Collections indexes
CREATE INDEX IF NOT EXISTS idx_image_collections_user_id ON image_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_image_collections_is_public ON image_collections(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_collection_images_collection_id ON collection_images(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_images_image_id ON collection_images(image_id);
CREATE INDEX IF NOT EXISTS idx_collection_images_position ON collection_images(collection_id, position);

-- Stats indexes
CREATE INDEX IF NOT EXISTS idx_image_generation_stats_user_date ON image_generation_stats(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_image_generation_stats_date ON image_generation_stats(date DESC);
CREATE INDEX IF NOT EXISTS idx_image_generation_stats_provider ON image_generation_stats(provider);

-- ============================================================================
-- Triggers and Functions
-- ============================================================================

-- Update timestamp trigger for prompt_templates
CREATE OR REPLACE FUNCTION update_prompt_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_prompt_templates_updated_at
  BEFORE UPDATE ON prompt_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_prompt_templates_updated_at();

-- Update timestamp trigger for collections
CREATE OR REPLACE FUNCTION update_image_collections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_image_collections_updated_at
  BEFORE UPDATE ON image_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_image_collections_updated_at();

-- Increment template usage count
CREATE OR REPLACE FUNCTION increment_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE prompt_templates
  SET usage_count = usage_count + 1
  WHERE id = NEW.metadata->>'template_id'
  AND NEW.metadata->>'template_id' IS NOT NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_template_usage
  AFTER INSERT ON generated_images
  FOR EACH ROW
  EXECUTE FUNCTION increment_template_usage();

-- Update generation stats
CREATE OR REPLACE FUNCTION update_generation_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    INSERT INTO image_generation_stats (
      user_id,
      date,
      provider,
      total_generations,
      successful_generations,
      total_cost_usd,
      total_credits_used,
      total_generation_time_ms,
      avg_generation_time_ms
    ) VALUES (
      NEW.user_id,
      CURRENT_DATE,
      NEW.provider,
      1,
      1,
      COALESCE(NEW.cost_usd, 0),
      COALESCE(NEW.credits_used, 0),
      COALESCE(NEW.generation_time_ms, 0),
      COALESCE(NEW.generation_time_ms, 0)
    )
    ON CONFLICT (user_id, date, provider)
    DO UPDATE SET
      total_generations = image_generation_stats.total_generations + 1,
      successful_generations = image_generation_stats.successful_generations + 1,
      total_cost_usd = image_generation_stats.total_cost_usd + COALESCE(NEW.cost_usd, 0),
      total_credits_used = image_generation_stats.total_credits_used + COALESCE(NEW.credits_used, 0),
      total_generation_time_ms = image_generation_stats.total_generation_time_ms + COALESCE(NEW.generation_time_ms, 0),
      avg_generation_time_ms = (image_generation_stats.total_generation_time_ms + COALESCE(NEW.generation_time_ms, 0)) / (image_generation_stats.successful_generations + 1),
      updated_at = CURRENT_TIMESTAMP;
  ELSIF NEW.status = 'failed' THEN
    INSERT INTO image_generation_stats (
      user_id,
      date,
      provider,
      total_generations,
      failed_generations
    ) VALUES (
      NEW.user_id,
      CURRENT_DATE,
      NEW.provider,
      1,
      1
    )
    ON CONFLICT (user_id, date, provider)
    DO UPDATE SET
      total_generations = image_generation_stats.total_generations + 1,
      failed_generations = image_generation_stats.failed_generations + 1,
      updated_at = CURRENT_TIMESTAMP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_generation_stats
  AFTER INSERT OR UPDATE OF status ON generated_images
  FOR EACH ROW
  WHEN (NEW.status IN ('completed', 'failed'))
  EXECUTE FUNCTION update_generation_stats();

-- ============================================================================
-- Views for Analytics
-- ============================================================================

-- User generation summary
CREATE OR REPLACE VIEW user_generation_summary AS
SELECT
  user_id,
  COUNT(*) as total_images,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_images,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_images,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_images,
  COUNT(DISTINCT provider) as providers_used,
  SUM(COALESCE(cost_usd, 0)) as total_cost_usd,
  AVG(generation_time_ms) FILTER (WHERE status = 'completed') as avg_generation_time_ms,
  MAX(created_at) as last_generation_at,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as images_last_7_days,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as images_last_30_days
FROM generated_images
WHERE user_id IS NOT NULL
GROUP BY user_id;

-- Provider performance stats
CREATE OR REPLACE VIEW provider_performance AS
SELECT
  provider,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status = 'completed') as successful_requests,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_requests,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed') / NULLIF(COUNT(*), 0), 2) as success_rate,
  AVG(generation_time_ms) FILTER (WHERE status = 'completed') as avg_generation_time_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY generation_time_ms) FILTER (WHERE status = 'completed') as median_generation_time_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY generation_time_ms) FILTER (WHERE status = 'completed') as p95_generation_time_ms,
  SUM(COALESCE(cost_usd, 0)) as total_cost_usd,
  AVG(COALESCE(cost_usd, 0)) FILTER (WHERE status = 'completed') as avg_cost_per_image
FROM generated_images
GROUP BY provider;

-- Popular prompt templates
CREATE OR REPLACE VIEW popular_prompt_templates AS
SELECT
  pt.*,
  COUNT(gi.id) as images_generated,
  AVG(CASE WHEN gi.status = 'completed' THEN 1.0 ELSE 0.0 END) as success_rate
FROM prompt_templates pt
LEFT JOIN generated_images gi ON gi.metadata->>'template_id' = pt.id::text
WHERE pt.is_public = true
GROUP BY pt.id
ORDER BY pt.usage_count DESC, pt.favorite_count DESC
LIMIT 100;

-- Recent image generations
CREATE OR REPLACE VIEW recent_generations AS
SELECT
  gi.*,
  CASE WHEN if.image_id IS NOT NULL THEN true ELSE false END as is_favorited,
  (SELECT COUNT(*) FROM generated_images WHERE parent_image_id = gi.id) as variation_count
FROM generated_images gi
LEFT JOIN image_favorites if ON if.image_id = gi.id
ORDER BY gi.created_at DESC
LIMIT 1000;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE generated_images IS 'Stores all generated images with full metadata and generation parameters';
COMMENT ON TABLE image_favorites IS 'User favorites for quick access to preferred generated images';
COMMENT ON TABLE prompt_templates IS 'Reusable prompt templates with presets and default settings';
COMMENT ON TABLE image_collections IS 'User-created collections/albums of generated images';
COMMENT ON TABLE collection_images IS 'Many-to-many relationship between collections and images';
COMMENT ON TABLE image_generation_stats IS 'Daily aggregated statistics for usage tracking and billing';

COMMENT ON COLUMN generated_images.revised_prompt IS 'AI-enhanced or provider-revised prompt (e.g., DALL-E auto-enhancement)';
COMMENT ON COLUMN generated_images.seed IS 'Random seed for reproducible generation';
COMMENT ON COLUMN generated_images.cfg_scale IS 'Classifier-free guidance scale (higher = more prompt adherence)';
COMMENT ON COLUMN generated_images.parent_image_id IS 'Reference to parent image for variations, edits, or upscales';
COMMENT ON COLUMN generated_images.edit_type IS 'Type of edit operation if this is a derivative image';
COMMENT ON COLUMN generated_images.metadata IS 'Provider-specific metadata and additional generation parameters';
