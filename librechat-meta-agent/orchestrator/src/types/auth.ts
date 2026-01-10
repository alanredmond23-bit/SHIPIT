/**
 * Authentication Types for the Meta Agent Orchestrator
 *
 * This module defines TypeScript types for authentication-related
 * functionality including users, sessions, API keys, and request extensions.
 */

import { Request } from 'express';

// ============================================================================
// User Types
// ============================================================================

/**
 * Authenticated user information attached to requests
 */
export interface AuthenticatedUser {
  /** Unique user ID (UUID from Supabase or internal DB) */
  id: string;

  /** User's email address */
  email: string;

  /** User's display name (may be null) */
  name: string | null;

  /** User's role (e.g., 'authenticated', 'admin', 'super_admin') */
  role: string;

  /** Array of permission strings the user has */
  permissions: string[];

  /** Authentication method used */
  authMethod: 'supabase' | 'session' | 'apikey';
}

/**
 * User roles in the system
 */
export type UserRole = 'authenticated' | 'admin' | 'super_admin' | 'service_role';

/**
 * User metadata from Supabase auth
 */
export interface SupabaseUserMetadata {
  name?: string;
  full_name?: string;
  avatar_url?: string;
  preferred_username?: string;
  [key: string]: unknown;
}

// ============================================================================
// Session Types
// ============================================================================

/**
 * Session information stored in the database
 */
export interface Session {
  id: string;
  user_id: string;
  token: string;
  refresh_token: string;
  expires_at: Date;
  is_active: boolean;
  user_agent?: string;
  ip_address?: string;
  device_type?: string;
  last_activity_at?: Date;
  created_at: Date;
}

/**
 * Session result from database query
 */
export interface SessionResult {
  user_id: string;
  email: string;
  name: string;
  role: string;
}

// ============================================================================
// API Key Types
// ============================================================================

/**
 * API key information
 */
export interface ApiKey {
  id: string;
  user_id: string;
  key_prefix: string;
  key_hash: string;
  name: string;
  scopes: string[];
  rate_limit: number;
  usage_count: number;
  last_used_at?: Date;
  expires_at?: Date;
  is_active: boolean;
  created_at: Date;
}

/**
 * API key result from database query
 */
export interface ApiKeyResult {
  id: string;
  user_id: string;
  name: string;
  scopes: string[];
  rate_limit: number;
  usage_count: number;
}

/**
 * API key information attached to requests
 */
export interface RequestApiKey {
  id: string;
  name: string;
  scopes: string[];
}

// ============================================================================
// Request Types
// ============================================================================

/**
 * Extended Express Request with authentication information
 */
export interface AuthenticatedRequest extends Request {
  /** Authenticated user (present if authentication succeeded) */
  user?: AuthenticatedUser;

  /** API key information (present if authenticated via API key) */
  apiKey?: RequestApiKey;
}

// ============================================================================
// Middleware Options Types
// ============================================================================

/**
 * Options for creating auth middleware
 */
export interface AuthMiddlewareOptions {
  /** Whether authentication is required (default: true) */
  requireAuth?: boolean;

  /** Whether to allow API key authentication (default: true) */
  allowApiKeys?: boolean;

  /** Whether to allow Supabase JWT authentication (default: true) */
  allowSupabase?: boolean;

  /** Required permissions for access */
  requiredPermissions?: string[];

  /** Required roles for access */
  requiredRoles?: string[];

  /** Database pool for legacy session/API key validation */
  db?: import('pg').Pool;
}

// ============================================================================
// Route Configuration Types
// ============================================================================

/**
 * Route protection level
 */
export type RouteProtection = 'public' | 'authenticated' | 'admin';

/**
 * Route configuration for auth
 */
export interface RouteAuthConfig {
  /** Route pattern */
  path: string;

  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | '*';

  /** Protection level */
  protection: RouteProtection;

  /** Required permissions (for 'authenticated' routes) */
  permissions?: string[];

  /** Required roles (for 'authenticated' routes) */
  roles?: string[];
}

// ============================================================================
// Auth Event Types
// ============================================================================

/**
 * Authentication event types for audit logging
 */
export type AuthEventType =
  | 'login'
  | 'logout'
  | 'token_refresh'
  | 'password_reset'
  | 'password_change'
  | 'api_key_created'
  | 'api_key_revoked'
  | 'session_revoked'
  | 'failed_login'
  | 'mfa_enabled'
  | 'mfa_disabled';

/**
 * Authentication audit log entry
 */
export interface AuthAuditLog {
  id: string;
  user_id: string;
  event_type: AuthEventType;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
  created_at: Date;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Authentication error codes
 */
export type AuthErrorCode =
  | 'UNAUTHORIZED'
  | 'INVALID_TOKEN'
  | 'EXPIRED_TOKEN'
  | 'INVALID_API_KEY'
  | 'API_KEYS_NOT_ALLOWED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INSUFFICIENT_SCOPES'
  | 'FORBIDDEN'
  | 'ADMIN_REQUIRED'
  | 'USER_NOT_FOUND'
  | 'INVALID_AUTH_SCHEME'
  | 'AUTH_ERROR';

/**
 * Authentication error response
 */
export interface AuthError {
  code: AuthErrorCode;
  message: string;
  required?: string[];
  provided?: string[];
  limit?: number;
  reset?: string;
}
