-- ============================================================================
-- 013_auth_schema.sql
-- Authentication & Authorization Schema for Meta Agent Platform
-- Supports: User accounts, sessions, API keys, roles, permissions
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- USERS TABLE
-- Core user accounts with profile information
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),                    -- NULL for OAuth-only users
  name VARCHAR(255),
  avatar_url TEXT,
  role VARCHAR(50) DEFAULT 'user',               -- user, admin, super_admin
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token TEXT,
  verification_expires_at TIMESTAMPTZ,
  password_reset_token TEXT,
  password_reset_expires_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',                   -- Custom user metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SESSIONS TABLE
-- Active user sessions with token management
-- ============================================================================

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  refresh_token TEXT UNIQUE,
  user_agent TEXT,
  ip_address VARCHAR(45),                        -- IPv4 or IPv6
  device_type VARCHAR(50),                       -- desktop, mobile, tablet, api
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- API KEYS TABLE
-- Programmatic access tokens for API usage
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_prefix VARCHAR(8) NOT NULL,                -- First 8 chars of key (for display)
  key_hash VARCHAR(255) NOT NULL,                -- Hashed full key
  name VARCHAR(255) NOT NULL,
  description TEXT,
  scopes TEXT[] DEFAULT ARRAY['read', 'write'],  -- Allowed operations
  rate_limit INTEGER DEFAULT 1000,               -- Requests per hour
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,                        -- NULL = never expires
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- OAUTH ACCOUNTS TABLE
-- Third-party OAuth provider connections
-- ============================================================================

CREATE TABLE IF NOT EXISTS oauth_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,                 -- google, github, microsoft, etc.
  provider_account_id VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scope TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

-- ============================================================================
-- PERMISSIONS TABLE
-- Granular permission definitions
-- ============================================================================

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,             -- e.g., 'chat:read', 'admin:users'
  description TEXT,
  category VARCHAR(50),                          -- chat, memory, admin, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ROLES TABLE
-- Role definitions with associated permissions
-- ============================================================================

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,              -- user, admin, super_admin, etc.
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,               -- Cannot be deleted if true
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ROLE_PERMISSIONS TABLE
-- Many-to-many mapping of roles to permissions
-- ============================================================================

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ============================================================================
-- USER_ROLES TABLE
-- Many-to-many mapping of users to roles (beyond default role)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

-- ============================================================================
-- AUDIT LOG TABLE
-- Track authentication and authorization events
-- ============================================================================

CREATE TABLE IF NOT EXISTS auth_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL,               -- login, logout, password_change, etc.
  event_data JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  user_agent TEXT,
  success BOOLEAN DEFAULT TRUE,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token) WHERE verification_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token) WHERE password_reset_token IS NOT NULL;

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(refresh_token) WHERE refresh_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active) WHERE is_active = TRUE;

-- API Keys indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active) WHERE is_active = TRUE;

-- OAuth accounts indexes
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user_id ON oauth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_provider ON oauth_accounts(provider, provider_account_id);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_user_id ON auth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_event_type ON auth_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_created_at ON auth_audit_log(created_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oauth_accounts_updated_at
  BEFORE UPDATE ON oauth_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DEFAULT DATA
-- ============================================================================

-- Insert default roles
INSERT INTO roles (name, description, is_system) VALUES
  ('user', 'Standard user with basic access', TRUE),
  ('admin', 'Administrator with elevated privileges', TRUE),
  ('super_admin', 'Super administrator with full access', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions
INSERT INTO permissions (name, description, category) VALUES
  -- Chat permissions
  ('chat:read', 'Read chat messages', 'chat'),
  ('chat:write', 'Send chat messages', 'chat'),
  ('chat:delete', 'Delete chat messages', 'chat'),

  -- Memory permissions
  ('memory:read', 'Read memory entries', 'memory'),
  ('memory:write', 'Create/update memory entries', 'memory'),
  ('memory:delete', 'Delete memory entries', 'memory'),

  -- Files permissions
  ('files:read', 'Read files', 'files'),
  ('files:write', 'Upload files', 'files'),
  ('files:delete', 'Delete files', 'files'),

  -- Personas permissions
  ('personas:read', 'Read personas', 'personas'),
  ('personas:write', 'Create/update personas', 'personas'),
  ('personas:delete', 'Delete personas', 'personas'),

  -- Tasks permissions
  ('tasks:read', 'Read tasks', 'tasks'),
  ('tasks:write', 'Create/update tasks', 'tasks'),
  ('tasks:delete', 'Delete tasks', 'tasks'),
  ('tasks:execute', 'Execute scheduled tasks', 'tasks'),

  -- Admin permissions
  ('admin:users', 'Manage users', 'admin'),
  ('admin:roles', 'Manage roles and permissions', 'admin'),
  ('admin:settings', 'Manage system settings', 'admin'),
  ('admin:audit', 'View audit logs', 'admin'),

  -- API permissions
  ('api:keys', 'Manage API keys', 'api'),
  ('api:unlimited', 'Bypass rate limits', 'api')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to roles
-- User role: basic permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'user'
  AND p.name IN ('chat:read', 'chat:write', 'memory:read', 'memory:write', 'files:read', 'files:write', 'personas:read', 'tasks:read', 'tasks:write')
ON CONFLICT DO NOTHING;

-- Admin role: all user permissions + admin permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
  AND p.category IN ('chat', 'memory', 'files', 'personas', 'tasks', 'admin')
ON CONFLICT DO NOTHING;

-- Super admin role: all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user has a specific permission
CREATE OR REPLACE FUNCTION user_has_permission(p_user_id UUID, p_permission VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  has_perm BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE u.id = p_user_id AND p.name = p_permission

    UNION

    SELECT 1
    FROM users u
    JOIN roles r ON u.role = r.name
    JOIN role_permissions rp ON r.id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE u.id = p_user_id AND p.name = p_permission
  ) INTO has_perm;

  RETURN has_perm;
END;
$$ LANGUAGE plpgsql;

-- Function to validate session token
CREATE OR REPLACE FUNCTION validate_session(p_token TEXT)
RETURNS TABLE(user_id UUID, user_email VARCHAR, user_role VARCHAR) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.role
  FROM sessions s
  JOIN users u ON s.user_id = u.id
  WHERE s.token = p_token
    AND s.expires_at > NOW()
    AND s.is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to log authentication events
CREATE OR REPLACE FUNCTION log_auth_event(
  p_user_id UUID,
  p_event_type VARCHAR,
  p_event_data JSONB DEFAULT '{}',
  p_ip_address VARCHAR DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_success BOOLEAN DEFAULT TRUE,
  p_failure_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO auth_audit_log (user_id, event_type, event_data, ip_address, user_agent, success, failure_reason)
  VALUES (p_user_id, p_event_type, p_event_data, p_ip_address, p_user_agent, p_success, p_failure_reason)
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_accounts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data (admins see all via bypass)
CREATE POLICY users_select_own ON users
  FOR SELECT USING (
    auth.uid() = id OR
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY users_update_own ON users
  FOR UPDATE USING (auth.uid() = id);

-- Sessions: users can only see their own sessions
CREATE POLICY sessions_select_own ON sessions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY sessions_insert_own ON sessions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY sessions_delete_own ON sessions
  FOR DELETE USING (user_id = auth.uid());

-- API Keys: users can only see their own keys
CREATE POLICY api_keys_select_own ON api_keys
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY api_keys_insert_own ON api_keys
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY api_keys_update_own ON api_keys
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY api_keys_delete_own ON api_keys
  FOR DELETE USING (user_id = auth.uid());

-- OAuth accounts: users can only see their own connections
CREATE POLICY oauth_accounts_select_own ON oauth_accounts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY oauth_accounts_insert_own ON oauth_accounts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY oauth_accounts_delete_own ON oauth_accounts
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'User accounts with authentication credentials';
COMMENT ON TABLE sessions IS 'Active user sessions with token management';
COMMENT ON TABLE api_keys IS 'Programmatic API access tokens';
COMMENT ON TABLE oauth_accounts IS 'Third-party OAuth provider connections';
COMMENT ON TABLE permissions IS 'Granular permission definitions';
COMMENT ON TABLE roles IS 'Role definitions with associated permissions';
COMMENT ON TABLE role_permissions IS 'Many-to-many mapping of roles to permissions';
COMMENT ON TABLE user_roles IS 'Additional roles assigned to users';
COMMENT ON TABLE auth_audit_log IS 'Authentication and authorization event log';

COMMENT ON FUNCTION user_has_permission IS 'Check if user has a specific permission';
COMMENT ON FUNCTION validate_session IS 'Validate session token and return user info';
COMMENT ON FUNCTION cleanup_expired_sessions IS 'Remove expired sessions from database';
COMMENT ON FUNCTION log_auth_event IS 'Log authentication events to audit log';
