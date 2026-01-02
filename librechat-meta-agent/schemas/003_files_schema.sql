-- ============================================================================
-- File Upload and Analysis Schema
-- ============================================================================
-- This schema supports file upload, storage, and AI-powered analysis
-- Supports images, PDFs, text files, and code files

CREATE TABLE IF NOT EXISTS files (
  -- Primary identification
  id VARCHAR(64) PRIMARY KEY, -- SHA-256 hash of file content
  filename VARCHAR(255) NOT NULL, -- Generated filename on disk
  original_name VARCHAR(255) NOT NULL, -- Original uploaded filename

  -- File metadata
  mime_type VARCHAR(100) NOT NULL,
  size INTEGER NOT NULL, -- File size in bytes
  hash VARCHAR(64) NOT NULL, -- SHA-256 hash for deduplication

  -- Storage paths
  path TEXT NOT NULL, -- Full path to file on disk
  thumbnail_path TEXT, -- Path to thumbnail (for images)

  -- Extracted content
  extracted_text TEXT, -- Text extracted from PDFs or text files

  -- Image metadata
  width INTEGER, -- Image width in pixels
  height INTEGER, -- Image height in pixels

  -- AI analysis
  analysis_result JSONB, -- Analysis results from AI

  -- Relationships
  user_id VARCHAR(255), -- User who uploaded the file
  task_id VARCHAR(255), -- Associated task (if any)
  conversation_id VARCHAR(255), -- Associated conversation (if any)

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT unique_hash UNIQUE (hash)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_task_id ON files(task_id);
CREATE INDEX IF NOT EXISTS idx_files_conversation_id ON files(conversation_id);
CREATE INDEX IF NOT EXISTS idx_files_mime_type ON files(mime_type);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_hash ON files(hash);

-- Full-text search on extracted text
CREATE INDEX IF NOT EXISTS idx_files_extracted_text_fts
  ON files USING gin(to_tsvector('english', extracted_text));

-- GIN index for JSONB analysis results
CREATE INDEX IF NOT EXISTS idx_files_analysis_result
  ON files USING gin(analysis_result);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_files_updated_at
  BEFORE UPDATE ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_files_updated_at();

-- File statistics view
CREATE OR REPLACE VIEW file_statistics AS
SELECT
  mime_type,
  COUNT(*) as file_count,
  SUM(size) as total_size,
  AVG(size) as avg_size,
  MAX(size) as max_size,
  MIN(size) as min_size,
  COUNT(CASE WHEN analysis_result IS NOT NULL THEN 1 END) as analyzed_count
FROM files
GROUP BY mime_type;

-- User file statistics view
CREATE OR REPLACE VIEW user_file_statistics AS
SELECT
  user_id,
  COUNT(*) as file_count,
  SUM(size) as total_size,
  COUNT(DISTINCT mime_type) as mime_type_count,
  MAX(created_at) as last_upload
FROM files
WHERE user_id IS NOT NULL
GROUP BY user_id;

-- Comments
COMMENT ON TABLE files IS 'Stores uploaded files with metadata, extracted content, and AI analysis results';
COMMENT ON COLUMN files.id IS 'Unique identifier (SHA-256 hash of file content)';
COMMENT ON COLUMN files.hash IS 'SHA-256 hash for deduplication';
COMMENT ON COLUMN files.extracted_text IS 'Text extracted from PDFs, documents, or code files';
COMMENT ON COLUMN files.analysis_result IS 'JSON object containing AI analysis results';
COMMENT ON COLUMN files.thumbnail_path IS 'Path to generated thumbnail (images only)';

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON files TO your_app_user;
-- GRANT SELECT ON file_statistics TO your_app_user;
-- GRANT SELECT ON user_file_statistics TO your_app_user;
