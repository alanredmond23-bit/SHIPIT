// Re-export database pool for convenience
// This file provides a singleton pool for services that need direct db access
import { Pool } from 'pg';

// Lazy-initialized pool - will be set by index.ts during bootstrap
let _pool: Pool | null = null;

export function setPool(pool: Pool): void {
  _pool = pool;
}

export function getPool(): Pool {
  if (!_pool) {
    throw new Error('Database pool not initialized. Call setPool() first.');
  }
  return _pool;
}

// For backward compatibility with services using `pool` directly
export { getPool as pool };

// Re-export createDbClient for main entry point
export { createDbClient } from './db/client';
