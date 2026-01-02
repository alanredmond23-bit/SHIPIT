-- Google Workspace Integration Schema
-- Stores OAuth tokens and tracks Google Workspace actions

-- OAuth tokens table
CREATE TABLE IF NOT EXISTS google_oauth_tokens (
  user_id UUID PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type VARCHAR(50) DEFAULT 'Bearer',
  scope TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_google_oauth_expires ON google_oauth_tokens(expires_at);

-- Actions tracking table
CREATE TABLE IF NOT EXISTS google_workspace_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  service VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gw_actions_user ON google_workspace_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_gw_actions_service ON google_workspace_actions(service);
CREATE INDEX IF NOT EXISTS idx_gw_actions_created ON google_workspace_actions(created_at DESC);

-- Email sync state (optional - for caching)
CREATE TABLE IF NOT EXISTS google_email_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email_id TEXT NOT NULL,
  thread_id TEXT,
  subject TEXT,
  from_address TEXT,
  to_addresses TEXT[],
  cc_addresses TEXT[],
  snippet TEXT,
  body TEXT,
  labels TEXT[],
  date TIMESTAMPTZ,
  is_read BOOLEAN DEFAULT false,
  has_attachments BOOLEAN DEFAULT false,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, email_id)
);

CREATE INDEX IF NOT EXISTS idx_email_cache_user ON google_email_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_email_cache_date ON google_email_cache(date DESC);
CREATE INDEX IF NOT EXISTS idx_email_cache_thread ON google_email_cache(thread_id);

-- Calendar events cache (optional - for quick access)
CREATE TABLE IF NOT EXISTS google_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  calendar_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  summary TEXT,
  description TEXT,
  location TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  attendees JSONB,
  status VARCHAR(50),
  html_link TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, calendar_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON google_calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_time ON google_calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_calendar ON google_calendar_events(calendar_id);

-- Drive files metadata cache
CREATE TABLE IF NOT EXISTS google_drive_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_id TEXT NOT NULL,
  name TEXT,
  mime_type TEXT,
  size BIGINT,
  parent_id TEXT,
  is_folder BOOLEAN DEFAULT false,
  web_view_link TEXT,
  thumbnail_link TEXT,
  created_time TIMESTAMPTZ,
  modified_time TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, file_id)
);

CREATE INDEX IF NOT EXISTS idx_drive_files_user ON google_drive_files(user_id);
CREATE INDEX IF NOT EXISTS idx_drive_files_parent ON google_drive_files(parent_id);
CREATE INDEX IF NOT EXISTS idx_drive_files_modified ON google_drive_files(modified_time DESC);

-- Workspace analytics
CREATE TABLE IF NOT EXISTS google_workspace_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  service VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  emails_read INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  docs_created INTEGER DEFAULT 0,
  docs_edited INTEGER DEFAULT 0,
  sheets_created INTEGER DEFAULT 0,
  sheets_edited INTEGER DEFAULT 0,
  files_uploaded INTEGER DEFAULT 0,
  files_downloaded INTEGER DEFAULT 0,
  events_created INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  UNIQUE(user_id, service, date)
);

CREATE INDEX IF NOT EXISTS idx_gw_analytics_user ON google_workspace_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_gw_analytics_date ON google_workspace_analytics(date DESC);

-- AI-powered features usage
CREATE TABLE IF NOT EXISTS google_ai_features_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  feature VARCHAR(100) NOT NULL,
  service VARCHAR(50) NOT NULL,
  resource_id TEXT,
  input_text TEXT,
  output_text TEXT,
  tokens_used INTEGER,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gw_ai_features_user ON google_ai_features_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_gw_ai_features_created ON google_ai_features_usage(created_at DESC);

-- Comments
COMMENT ON TABLE google_oauth_tokens IS 'Stores Google OAuth 2.0 access and refresh tokens for users';
COMMENT ON TABLE google_workspace_actions IS 'Tracks all Google Workspace API actions for audit and analytics';
COMMENT ON TABLE google_email_cache IS 'Caches Gmail messages for faster access and offline support';
COMMENT ON TABLE google_calendar_events IS 'Caches calendar events for quick lookup and search';
COMMENT ON TABLE google_drive_files IS 'Caches Drive file metadata for faster browsing';
COMMENT ON TABLE google_workspace_analytics IS 'Daily aggregated analytics for Workspace usage';
COMMENT ON TABLE google_ai_features_usage IS 'Tracks AI-powered feature usage like email summaries and smart replies';
