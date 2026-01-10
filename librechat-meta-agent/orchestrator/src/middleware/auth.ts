import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import * as crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import pino from 'pino';

// ============================================================================
// Types
// ============================================================================

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  permissions: string[];
  authMethod: 'supabase' | 'session' | 'apikey';
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  apiKey?: {
    id: string;
    name: string;
    scopes: string[];
  };
}

interface SessionResult {
  user_id: string;
  email: string;
  name: string;
  role: string;
}

interface ApiKeyResult {
  id: string;
  user_id: string;
  name: string;
  scopes: string[];
  rate_limit: number;
  usage_count: number;
}

interface SupabaseUserMetadata {
  name?: string;
  full_name?: string;
  avatar_url?: string;
  [key: string]: unknown;
}

// ============================================================================
// Logger for Auth
// ============================================================================

const authLogger = pino({
  name: 'auth-middleware',
  level: process.env.LOG_LEVEL || 'info',
});

// ============================================================================
// Route Configuration
// ============================================================================

/**
 * Routes that don't require authentication
 */
export const PUBLIC_ROUTES: string[] = [
  '/health',
  '/api/health',
  '/api/models',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/callback',
  '/api/auth/verify',
];

/**
 * Route patterns that don't require authentication (regex patterns)
 */
export const PUBLIC_ROUTE_PATTERNS: RegExp[] = [
  /^\/api\/auth\/.*/,  // All auth routes are public
  /^\/api\/public\/.*/,  // Any route under /api/public
];

/**
 * Routes that require admin access
 */
export const ADMIN_ROUTES: string[] = [
  '/api/admin',
  '/api/users',
  '/api/settings',
];

/**
 * Route patterns that require admin access
 */
export const ADMIN_ROUTE_PATTERNS: RegExp[] = [
  /^\/api\/admin\/.*/,
  /^\/api\/users\/.*/,
];

// ============================================================================
// Supabase Client Singleton
// ============================================================================

let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (supabaseAdmin) return supabaseAdmin;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for authentication. ' +
      'Please set these environment variables.'
    );
  }

  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdmin;
}

// ============================================================================
// Route Matching Helpers
// ============================================================================

function isPublicRoute(path: string): boolean {
  // Check exact matches
  if (PUBLIC_ROUTES.includes(path)) {
    return true;
  }

  // Check pattern matches
  return PUBLIC_ROUTE_PATTERNS.some(pattern => pattern.test(path));
}

function isAdminRoute(path: string): boolean {
  // Check exact matches
  if (ADMIN_ROUTES.some(route => path.startsWith(route))) {
    return true;
  }

  // Check pattern matches
  return ADMIN_ROUTE_PATTERNS.some(pattern => pattern.test(path));
}

// ============================================================================
// Supabase JWT Validation
// ============================================================================

async function validateSupabaseToken(token: string): Promise<AuthenticatedUser | null> {
  try {
    const supabase = getSupabaseAdmin();

    // Get user from Supabase using the JWT
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      authLogger.debug({ error: error?.message }, 'Supabase token validation failed');
      return null;
    }

    const metadata = user.user_metadata as SupabaseUserMetadata;

    return {
      id: user.id,
      email: user.email || '',
      name: metadata?.name || metadata?.full_name || null,
      role: user.role || 'authenticated',
      permissions: [], // Supabase doesn't have built-in permissions, can be extended
      authMethod: 'supabase',
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    authLogger.error({ error: errorMessage }, 'Error validating Supabase token');
    return null;
  }
}

// ============================================================================
// Auth Middleware Factory (Supabase + Legacy Support)
// ============================================================================

export interface AuthMiddlewareOptions {
  requireAuth?: boolean;
  allowApiKeys?: boolean;
  allowSupabase?: boolean;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  db?: Pool; // Optional: for legacy session/API key support
}

export function createAuthMiddleware(options: AuthMiddlewareOptions = {}) {
  const {
    requireAuth = true,
    allowApiKeys = true,
    allowSupabase = true,
    requiredPermissions = [],
    requiredRoles = [],
    db,
  } = options;

  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const path = req.path;

    // Check if route is public
    if (isPublicRoute(path)) {
      return next();
    }

    const authHeader = req.headers.authorization;

    // No auth header
    if (!authHeader) {
      if (!requireAuth) {
        return next();
      }

      authLogger.warn({
        path,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      }, 'Missing authorization header');

      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please provide a valid token.',
        },
      });
    }

    try {
      // Handle Bearer token (Supabase JWT or session token)
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);

        // Try Supabase JWT validation first
        if (allowSupabase) {
          const supabaseUser = await validateSupabaseToken(token);

          if (supabaseUser) {
            // Check required roles
            if (requiredRoles.length > 0 && !requiredRoles.includes(supabaseUser.role)) {
              authLogger.warn({
                userId: supabaseUser.id,
                requiredRoles,
                userRole: supabaseUser.role,
              }, 'Insufficient role');

              return res.status(403).json({
                error: {
                  code: 'FORBIDDEN',
                  message: 'Insufficient permissions',
                  required: requiredRoles,
                },
              });
            }

            // Check for admin routes
            if (isAdminRoute(path) && !['admin', 'super_admin', 'service_role'].includes(supabaseUser.role)) {
              authLogger.warn({
                userId: supabaseUser.id,
                path,
                role: supabaseUser.role,
              }, 'Non-admin user attempted to access admin route');

              return res.status(403).json({
                error: {
                  code: 'ADMIN_REQUIRED',
                  message: 'Admin access required for this endpoint',
                },
              });
            }

            req.user = supabaseUser;

            authLogger.debug({
              userId: supabaseUser.id,
              email: supabaseUser.email,
              path,
            }, 'Supabase authentication successful');

            return next();
          }
        }

        // Fall back to legacy session token if database is available
        if (db) {
          const user = await validateSessionToken(db, token);

          if (user) {
            // Check required permissions
            if (requiredPermissions.length > 0) {
              const hasPermissions = await checkPermissions(db, user.user_id, requiredPermissions);
              if (!hasPermissions) {
                return res.status(403).json({
                  error: {
                    code: 'FORBIDDEN',
                    message: 'Insufficient permissions',
                    required: requiredPermissions,
                  },
                });
              }
            }

            // Get user permissions
            const permissions = await getUserPermissions(db, user.user_id);

            req.user = {
              id: user.user_id,
              email: user.email,
              name: user.name,
              role: user.role,
              permissions,
              authMethod: 'session',
            };

            // Update last activity
            await updateSessionActivity(db, token);

            return next();
          }
        }

        // Token validation failed
        authLogger.warn({
          path,
          ip: req.ip,
          tokenPrefix: token.substring(0, 10) + '...',
        }, 'Invalid or expired token');

        return res.status(401).json({
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired authentication token',
          },
        });
      }

      // Handle API Key authentication
      if ((authHeader.startsWith('ApiKey ') || authHeader.startsWith('X-API-Key ')) && db) {
        if (!allowApiKeys) {
          return res.status(401).json({
            error: {
              code: 'API_KEYS_NOT_ALLOWED',
              message: 'API key authentication not allowed for this endpoint',
            },
          });
        }

        const apiKey = authHeader.startsWith('ApiKey ')
          ? authHeader.slice(7)
          : authHeader.slice(10);

        const keyData = await validateApiKey(db, apiKey);

        if (!keyData) {
          authLogger.warn({
            path,
            ip: req.ip,
          }, 'Invalid API key');

          return res.status(401).json({
            error: {
              code: 'INVALID_API_KEY',
              message: 'Invalid or expired API key',
            },
          });
        }

        // Check rate limits
        if (keyData.usage_count >= keyData.rate_limit) {
          authLogger.warn({
            keyId: keyData.id,
            limit: keyData.rate_limit,
          }, 'API key rate limit exceeded');

          return res.status(429).json({
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'API key rate limit exceeded',
              limit: keyData.rate_limit,
              reset: 'hourly',
            },
          });
        }

        // Check scopes against required permissions
        if (requiredPermissions.length > 0) {
          const hasScopes = requiredPermissions.every(perm => {
            const [, action] = perm.split(':');
            return keyData.scopes.includes(action) || keyData.scopes.includes('*');
          });

          if (!hasScopes) {
            return res.status(403).json({
              error: {
                code: 'INSUFFICIENT_SCOPES',
                message: 'API key does not have required scopes',
                required: requiredPermissions,
                provided: keyData.scopes,
              },
            });
          }
        }

        // Get user info for API key owner
        const userResult = await db.query(
          'SELECT id, email, name, role FROM users WHERE id = $1',
          [keyData.user_id]
        );

        if (userResult.rows.length === 0) {
          return res.status(401).json({
            error: {
              code: 'USER_NOT_FOUND',
              message: 'API key owner not found',
            },
          });
        }

        const user = userResult.rows[0];

        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          permissions: keyData.scopes,
          authMethod: 'apikey',
        };

        req.apiKey = {
          id: keyData.id,
          name: keyData.name,
          scopes: keyData.scopes,
        };

        // Update API key usage
        await updateApiKeyUsage(db, keyData.id);

        return next();
      }

      // Unknown auth scheme
      authLogger.warn({
        path,
        authScheme: authHeader.split(' ')[0],
      }, 'Invalid authorization scheme');

      return res.status(401).json({
        error: {
          code: 'INVALID_AUTH_SCHEME',
          message: 'Invalid authorization scheme. Use "Bearer <token>" or "ApiKey <key>"',
        },
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      authLogger.error({ error: errorMessage, path }, 'Auth middleware error');

      return res.status(500).json({
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication error occurred',
        },
      });
    }
  };
}

// ============================================================================
// Convenience Middleware Factories
// ============================================================================

/**
 * Create Supabase-only auth middleware (recommended for new deployments)
 */
export function supabaseAuth(options: Omit<AuthMiddlewareOptions, 'allowSupabase'> = {}) {
  return createAuthMiddleware({
    ...options,
    allowSupabase: true,
    allowApiKeys: false,
  });
}

/**
 * Optional authentication - attaches user if token present, but doesn't require it
 */
export function optionalAuth(options: Omit<AuthMiddlewareOptions, 'requireAuth'> = {}) {
  return createAuthMiddleware({
    ...options,
    requireAuth: false,
  });
}

/**
 * Require specific roles
 */
export function requireRole(...roles: string[]) {
  return createAuthMiddleware({
    requireAuth: true,
    requiredRoles: roles,
  });
}

/**
 * Require admin role
 */
export function requireAdmin() {
  return createAuthMiddleware({
    requireAuth: true,
    requiredRoles: ['admin', 'super_admin'],
  });
}

/**
 * Require specific permissions (for legacy DB-based permissions)
 */
export function requirePermission(db: Pool, permission: string) {
  return createAuthMiddleware({
    db,
    requireAuth: true,
    requiredPermissions: [permission],
  });
}

// ============================================================================
// Express Router-Level Middleware
// ============================================================================

/**
 * Apply authentication to all routes except public ones
 * Use this at the app level for global auth
 */
export function globalAuthMiddleware(options: AuthMiddlewareOptions = {}) {
  const authMiddleware = createAuthMiddleware(options);

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Skip for OPTIONS requests (CORS preflight)
    if (req.method === 'OPTIONS') {
      return next();
    }

    return authMiddleware(req, res, next);
  };
}

// ============================================================================
// Helper Functions (Legacy DB Support)
// ============================================================================

async function validateSessionToken(db: Pool, token: string): Promise<SessionResult | null> {
  const result = await db.query<SessionResult>(
    `SELECT u.id as user_id, u.email, u.name, u.role
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.token = $1
       AND s.expires_at > NOW()
       AND s.is_active = TRUE`,
    [token]
  );

  return result.rows[0] || null;
}

async function validateApiKey(db: Pool, apiKey: string): Promise<ApiKeyResult | null> {
  // Hash the API key to compare
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

  const result = await db.query<ApiKeyResult>(
    `SELECT id, user_id, name, scopes, rate_limit, usage_count
     FROM api_keys
     WHERE key_hash = $1
       AND is_active = TRUE
       AND (expires_at IS NULL OR expires_at > NOW())`,
    [keyHash]
  );

  return result.rows[0] || null;
}

async function getUserPermissions(db: Pool, userId: string): Promise<string[]> {
  const result = await db.query(
    `SELECT DISTINCT p.name
     FROM users u
     LEFT JOIN roles r ON u.role = r.name
     LEFT JOIN role_permissions rp ON r.id = rp.role_id
     LEFT JOIN permissions p ON rp.permission_id = p.id
     WHERE u.id = $1

     UNION

     SELECT DISTINCT p.name
     FROM user_roles ur
     JOIN role_permissions rp ON ur.role_id = rp.role_id
     JOIN permissions p ON rp.permission_id = p.id
     WHERE ur.user_id = $1`,
    [userId]
  );

  return result.rows.map(row => row.name).filter(Boolean);
}

async function checkPermissions(db: Pool, userId: string, permissions: string[]): Promise<boolean> {
  const userPermissions = await getUserPermissions(db, userId);

  return permissions.every(perm => userPermissions.includes(perm));
}

async function updateSessionActivity(db: Pool, token: string): Promise<void> {
  await db.query(
    'UPDATE sessions SET last_activity_at = NOW() WHERE token = $1',
    [token]
  );
}

async function updateApiKeyUsage(db: Pool, keyId: string): Promise<void> {
  await db.query(
    `UPDATE api_keys
     SET last_used_at = NOW(), usage_count = usage_count + 1
     WHERE id = $1`,
    [keyId]
  );
}

// ============================================================================
// Session Management Functions
// ============================================================================

export async function createSession(
  db: Pool,
  userId: string,
  req: Request
): Promise<{ token: string; refreshToken: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString('hex');
  const refreshToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await db.query(
    `INSERT INTO sessions (user_id, token, refresh_token, user_agent, ip_address, device_type, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      userId,
      token,
      refreshToken,
      req.headers['user-agent'] || null,
      req.ip || null,
      detectDeviceType(req.headers['user-agent'] || ''),
      expiresAt,
    ]
  );

  // Log auth event
  await db.query(
    `INSERT INTO auth_audit_log (user_id, event_type, ip_address, user_agent)
     VALUES ($1, 'login', $2, $3)`,
    [userId, req.ip, req.headers['user-agent']]
  );

  return { token, refreshToken, expiresAt };
}

export async function revokeSession(db: Pool, token: string): Promise<void> {
  await db.query(
    'UPDATE sessions SET is_active = FALSE WHERE token = $1',
    [token]
  );
}

export async function revokeAllUserSessions(db: Pool, userId: string): Promise<void> {
  await db.query(
    'UPDATE sessions SET is_active = FALSE WHERE user_id = $1',
    [userId]
  );
}

export async function refreshSession(
  db: Pool,
  refreshToken: string
): Promise<{ token: string; expiresAt: Date } | null> {
  const result = await db.query(
    `SELECT id, user_id FROM sessions
     WHERE refresh_token = $1 AND is_active = TRUE`,
    [refreshToken]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const session = result.rows[0];
  const newToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.query(
    `UPDATE sessions SET token = $1, expires_at = $2, last_activity_at = NOW()
     WHERE id = $3`,
    [newToken, expiresAt, session.id]
  );

  return { token: newToken, expiresAt };
}

// ============================================================================
// API Key Management Functions
// ============================================================================

export async function createApiKey(
  db: Pool,
  userId: string,
  name: string,
  scopes: string[] = ['read', 'write'],
  expiresInDays?: number
): Promise<{ key: string; keyPrefix: string; id: string }> {
  const apiKey = `sk_live_${crypto.randomBytes(32).toString('hex')}`;
  const keyPrefix = apiKey.slice(0, 12);
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const result = await db.query(
    `INSERT INTO api_keys (user_id, key_prefix, key_hash, name, scopes, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [userId, keyPrefix, keyHash, name, scopes, expiresAt]
  );

  return {
    key: apiKey,
    keyPrefix,
    id: result.rows[0].id,
  };
}

export async function revokeApiKey(db: Pool, keyId: string, userId: string): Promise<boolean> {
  const result = await db.query(
    `UPDATE api_keys SET is_active = FALSE
     WHERE id = $1 AND user_id = $2`,
    [keyId, userId]
  );

  return result.rowCount !== null && result.rowCount > 0;
}

// ============================================================================
// Utility Functions
// ============================================================================

function detectDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();

  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'mobile';
  }
  if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'tablet';
  }
  if (ua.includes('postman') || ua.includes('curl') || ua.includes('httpie')) {
    return 'api';
  }

  return 'desktop';
}

/**
 * Extract user from request (for use in route handlers)
 */
export function getUserFromRequest(req: AuthenticatedRequest): AuthenticatedUser | null {
  return req.user || null;
}

/**
 * Assert user is authenticated (throws if not)
 */
export function assertAuthenticated(req: AuthenticatedRequest): AuthenticatedUser {
  if (!req.user) {
    throw new Error('User is not authenticated');
  }
  return req.user;
}
