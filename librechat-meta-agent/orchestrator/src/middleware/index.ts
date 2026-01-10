/**
 * Middleware Module Exports
 *
 * This module provides centralized exports for all middleware components
 * used in the Meta Agent Orchestrator.
 */

// Authentication Middleware
export {
  // Types
  AuthenticatedUser,
  AuthenticatedRequest,
  AuthMiddlewareOptions,

  // Route configuration
  PUBLIC_ROUTES,
  PUBLIC_ROUTE_PATTERNS,
  ADMIN_ROUTES,
  ADMIN_ROUTE_PATTERNS,

  // Middleware factories
  createAuthMiddleware,
  supabaseAuth,
  optionalAuth,
  requireRole,
  requireAdmin,
  requirePermission,
  globalAuthMiddleware,

  // Helper functions
  getUserFromRequest,
  assertAuthenticated,

  // Session management (for legacy DB auth)
  createSession,
  revokeSession,
  revokeAllUserSessions,
  refreshSession,

  // API key management (for legacy DB auth)
  createApiKey,
  revokeApiKey,
} from './auth';

// Re-export types from types module
export type {
  AuthenticatedUser as User,
  AuthenticatedRequest as AuthRequest,
  AuthMiddlewareOptions as AuthOptions,
} from './auth';
