import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import crypto from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  permissions: string[];
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

// ============================================================================
// Auth Middleware Factory
// ============================================================================

export function createAuthMiddleware(db: Pool, options: {
  requireAuth?: boolean;
  allowApiKeys?: boolean;
  requiredPermissions?: string[];
} = {}) {
  const { requireAuth = true, allowApiKeys = true, requiredPermissions = [] } = options;

  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    // No auth header
    if (!authHeader) {
      if (!requireAuth) {
        return next();
      }
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'No authorization header provided',
        },
      });
    }

    try {
      // Handle Bearer token (session)
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const user = await validateSessionToken(db, token);

        if (!user) {
          return res.status(401).json({
            error: {
              code: 'INVALID_TOKEN',
              message: 'Invalid or expired session token',
            },
          });
        }

        // Check required permissions
        if (requiredPermissions.length > 0) {
          const hasPermissions = await checkPermissions(db, user.id, requiredPermissions);
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
        const permissions = await getUserPermissions(db, user.id);

        req.user = {
          id: user.user_id,
          email: user.email,
          name: user.name,
          role: user.role,
          permissions,
        };

        // Update last activity
        await updateSessionActivity(db, token);

        return next();
      }

      // Handle API Key authentication
      if (authHeader.startsWith('ApiKey ') || authHeader.startsWith('X-API-Key ')) {
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
          return res.status(401).json({
            error: {
              code: 'INVALID_API_KEY',
              message: 'Invalid or expired API key',
            },
          });
        }

        // Check rate limits
        if (keyData.usage_count >= keyData.rate_limit) {
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
            const [category, action] = perm.split(':');
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
      return res.status(401).json({
        error: {
          code: 'INVALID_AUTH_SCHEME',
          message: 'Invalid authorization scheme. Use "Bearer <token>" or "ApiKey <key>"',
        },
      });

    } catch (error: any) {
      console.error('Auth middleware error:', error);
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
// Helper Functions
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
// Permission Middleware Shortcuts
// ============================================================================

export function requirePermission(db: Pool, permission: string) {
  return createAuthMiddleware(db, {
    requireAuth: true,
    requiredPermissions: [permission],
  });
}

export function requireAdmin(db: Pool) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authMiddleware = createAuthMiddleware(db, { requireAuth: true });

    await authMiddleware(req, res, async () => {
      if (!req.user || !['admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({
          error: {
            code: 'ADMIN_REQUIRED',
            message: 'Admin access required',
          },
        });
      }
      next();
    });
  };
}

export function optionalAuth(db: Pool) {
  return createAuthMiddleware(db, { requireAuth: false });
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
