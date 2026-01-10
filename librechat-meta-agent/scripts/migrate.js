#!/usr/bin/env node
/**
 * ============================================================================
 * Meta Agent Database Migration Runner (Node.js)
 * Cross-platform migration tool for PostgreSQL
 * ============================================================================
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ============================================================================
// Configuration
// ============================================================================

const PROJECT_DIR = path.resolve(__dirname, '..');
const SCHEMAS_DIR = path.join(PROJECT_DIR, 'schemas');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// State
const state = {
  verbose: false,
  dryRun: false,
  force: false,
  rollbackTo: null,
  singleMigration: null,
};

// ============================================================================
// Logging
// ============================================================================

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  debug: (msg) => state.verbose && console.log(`${colors.cyan}[DEBUG]${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.bold}==>${colors.reset} ${msg}`),
};

// ============================================================================
// Environment & Database
// ============================================================================

function loadEnv() {
  const envPath = path.join(PROJECT_DIR, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        if (key && !process.env[key]) {
          process.env[key] = value;
        }
      }
    });
    log.debug('Loaded environment from .env');
  }
}

function getDatabaseConfig() {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL };
  }

  const config = {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'librechat_meta',
  };

  if (process.env.DATABASE_SSL === 'true') {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
}

// ============================================================================
// PostgreSQL Client (using pg module if available, fallback to psql)
// ============================================================================

let pgClient = null;
let usePsql = false;

async function initDatabase() {
  try {
    // Try to use pg module
    const { Client } = require('pg');
    const config = getDatabaseConfig();
    pgClient = new Client(config);
    await pgClient.connect();
    log.debug('Connected using pg module');
    return true;
  } catch (err) {
    // Fallback to psql command line
    log.debug(`pg module not available: ${err.message}`);
    usePsql = true;

    // Check if psql is available
    try {
      execSync('which psql', { stdio: 'pipe' });
      log.debug('Using psql command line');
      return true;
    } catch {
      log.error('Neither pg module nor psql command found.');
      log.info('Install pg: npm install pg');
      log.info('Or install psql: brew install postgresql (macOS)');
      return false;
    }
  }
}

async function query(sql) {
  if (usePsql) {
    return queryWithPsql(sql);
  }
  return pgClient.query(sql);
}

function queryWithPsql(sql) {
  const config = getDatabaseConfig();
  let connectionString = config.connectionString;

  if (!connectionString) {
    const ssl = config.ssl ? '?sslmode=require' : '';
    connectionString = `postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}${ssl}`;
  }

  try {
    const result = execSync(
      `psql "${connectionString}" -t -A -c "${sql.replace(/"/g, '\\"')}"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return { rows: result.trim().split('\n').filter(Boolean).map(row => ({ result: row })) };
  } catch (err) {
    throw new Error(err.stderr || err.message);
  }
}

async function executeFile(filepath) {
  if (usePsql) {
    return executeFileWithPsql(filepath);
  }

  const sql = fs.readFileSync(filepath, 'utf8');
  return pgClient.query(sql);
}

function executeFileWithPsql(filepath) {
  const config = getDatabaseConfig();
  let connectionString = config.connectionString;

  if (!connectionString) {
    const ssl = config.ssl ? '?sslmode=require' : '';
    connectionString = `postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}${ssl}`;
  }

  try {
    execSync(`psql "${connectionString}" -v ON_ERROR_STOP=1 -f "${filepath}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { success: true };
  } catch (err) {
    throw new Error(err.stderr || err.stdout || err.message);
  }
}

async function closeDatabase() {
  if (pgClient) {
    await pgClient.end();
  }
}

// ============================================================================
// Migration Functions
// ============================================================================

function getMigrationFiles() {
  if (!fs.existsSync(SCHEMAS_DIR)) {
    log.error(`Schemas directory not found: ${SCHEMAS_DIR}`);
    return [];
  }

  return fs.readdirSync(SCHEMAS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => ({
      path: path.join(SCHEMAS_DIR, f),
      filename: f,
      ...parseMigrationInfo(f),
    }));
}

function parseMigrationInfo(filename) {
  const match = filename.match(/^(\d+)_(.+)\.sql$/);
  if (!match) {
    return { version: null, name: filename.replace('.sql', '') };
  }
  return {
    version: match[1],
    name: match[2],
  };
}

function calculateChecksum(filepath) {
  const content = fs.readFileSync(filepath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function ensureTrackingTable() {
  log.debug('Ensuring migration tracking table exists...');

  try {
    const result = await query(`
      SELECT CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = '_migrations'
      ) THEN 'yes' ELSE 'no' END as exists;
    `);

    const exists = result.rows[0]?.exists === 'yes' || result.rows[0]?.result === 'yes';

    if (!exists) {
      log.info('Creating migration tracking table...');
      const trackingFile = path.join(SCHEMAS_DIR, '000_migration_tracking.sql');

      if (!fs.existsSync(trackingFile)) {
        log.error(`Migration tracking file not found: ${trackingFile}`);
        process.exit(1);
      }

      if (state.dryRun) {
        log.info('[DRY RUN] Would create migration tracking table');
      } else {
        await executeFile(trackingFile);
        log.success('Migration tracking table created');
      }
    } else {
      log.debug('Migration tracking table already exists');
    }
  } catch (err) {
    log.error(`Failed to check/create tracking table: ${err.message}`);
    process.exit(1);
  }
}

async function isMigrationApplied(version) {
  try {
    const result = await query(`
      SELECT CASE WHEN EXISTS (
        SELECT 1 FROM _migrations WHERE version = '${version}' AND success = TRUE
      ) THEN 'yes' ELSE 'no' END as applied;
    `);
    return result.rows[0]?.applied === 'yes' || result.rows[0]?.result === 'yes';
  } catch {
    return false;
  }
}

async function runMigration(migration) {
  const { path: filepath, filename, version, name } = migration;
  const checksum = calculateChecksum(filepath);
  const startTime = Date.now();

  log.step(`Applying: ${filename}`);

  if (state.dryRun) {
    log.info(`[DRY RUN] Would execute: ${filepath}`);
    return true;
  }

  try {
    await executeFile(filepath);
    const duration = Date.now() - startTime;

    // Record successful migration
    await query(`
      INSERT INTO _migrations (version, name, filename, checksum, execution_time_ms, success)
      VALUES ('${version}', '${name}', '${filename}', '${checksum}', ${duration}, TRUE)
      ON CONFLICT (filename) DO UPDATE SET
        applied_at = NOW(),
        execution_time_ms = ${duration},
        success = TRUE,
        error_message = NULL;
    `);

    log.success(`Applied ${filename} (${duration}ms)`);
    return true;
  } catch (err) {
    const duration = Date.now() - startTime;
    const errorMsg = (err.message || '').substring(0, 500).replace(/'/g, "''");

    // Record failed migration
    try {
      await query(`
        INSERT INTO _migrations (version, name, filename, success, error_message)
        VALUES ('${version}', '${name}', '${filename}', FALSE, '${errorMsg}')
        ON CONFLICT (filename) DO UPDATE SET
          applied_at = NOW(),
          success = FALSE,
          error_message = '${errorMsg}';
      `);
    } catch {
      // Ignore recording error
    }

    log.error(`Failed to apply ${filename}`);
    console.log(`${colors.red}Error:${colors.reset}`, err.message);
    return false;
  }
}

async function runMigrations() {
  log.info('Starting database migrations...\n');

  await ensureTrackingTable();

  const migrations = getMigrationFiles();
  let applied = 0;
  let skipped = 0;
  let failed = 0;

  for (const migration of migrations) {
    const { version, filename } = migration;

    // Skip files without version numbers
    if (!version) {
      log.debug(`Skipping non-versioned file: ${filename}`);
      continue;
    }

    // If single migration mode, only run that one
    if (state.singleMigration && version !== state.singleMigration) {
      continue;
    }

    // Check if already applied
    const isApplied = await isMigrationApplied(version);
    if (isApplied && !state.force) {
      log.debug(`Skipping already applied: ${filename}`);
      skipped++;
      continue;
    }

    if (isApplied && state.force) {
      log.warn(`Forcing re-run of: ${filename}`);
    }

    // Run the migration
    const success = await runMigration(migration);
    if (success) {
      applied++;
    } else {
      failed++;
      if (!state.force) {
        log.error('Stopping on first error. Use --force to continue.');
        break;
      }
    }
  }

  console.log();
  console.log(`${colors.bold}============================================================================${colors.reset}`);
  console.log(`  Applied: ${colors.green}${applied}${colors.reset}  |  Skipped: ${colors.yellow}${skipped}${colors.reset}  |  Failed: ${colors.red}${failed}${colors.reset}`);
  console.log(`${colors.bold}============================================================================${colors.reset}`);
  console.log();

  return failed === 0;
}

async function showStatus() {
  console.log();
  console.log(`${colors.bold}============================================================================${colors.reset}`);
  console.log(`${colors.bold}                    Migration Status                                        ${colors.reset}`);
  console.log(`${colors.bold}============================================================================${colors.reset}`);
  console.log();

  try {
    // Check if tracking table exists
    const tableCheck = await query(`
      SELECT CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = '_migrations'
      ) THEN 'yes' ELSE 'no' END as exists;
    `);

    const exists = tableCheck.rows[0]?.exists === 'yes' || tableCheck.rows[0]?.result === 'yes';

    if (!exists) {
      log.warn('Migration tracking table does not exist. Run migrations first.');
      return;
    }

    // Show applied migrations
    console.log(`${colors.bold}Applied Migrations:${colors.reset}`);

    const result = await query(`
      SELECT version, name,
        to_char(applied_at, 'YYYY-MM-DD HH24:MI:SS') as applied_at,
        CASE WHEN success THEN 'Success' ELSE 'Failed' END as status,
        COALESCE(execution_time_ms || 'ms', '-') as duration
      FROM _migrations ORDER BY version ASC;
    `);

    if (usePsql) {
      // Parse psql output
      result.rows.forEach(row => {
        const parts = row.result.split('|');
        if (parts.length >= 4) {
          console.log(`  ${parts[0].padEnd(6)} | ${parts[1].padEnd(30)} | ${parts[3]} | ${parts[4] || ''}`);
        }
      });
    } else {
      console.table(result.rows);
    }

    console.log();

    // Show pending migrations
    console.log(`${colors.bold}Pending Migrations:${colors.reset}`);
    const migrations = getMigrationFiles();
    let pendingCount = 0;

    for (const migration of migrations) {
      if (!migration.version) continue;

      const isApplied = await isMigrationApplied(migration.version);
      if (!isApplied) {
        console.log(`  - ${migration.filename}`);
        pendingCount++;
      }
    }

    if (pendingCount === 0) {
      console.log('  (none - all migrations applied)');
    }

    console.log();
  } catch (err) {
    log.error(`Failed to get status: ${err.message}`);
  }
}

async function runRollback() {
  log.warn(`Rolling back to version: ${state.rollbackTo}`);

  try {
    const result = await query(`
      SELECT version, filename, rollback_sql
      FROM _migrations
      WHERE version > '${state.rollbackTo}' AND success = TRUE
      ORDER BY version DESC;
    `);

    if (result.rows.length === 0) {
      log.info('No migrations to rollback');
      return true;
    }

    for (const row of result.rows) {
      const version = usePsql ? row.result.split('|')[0] : row.version;
      const filename = usePsql ? row.result.split('|')[1] : row.filename;
      const rollbackSql = usePsql ? row.result.split('|')[2] : row.rollback_sql;

      if (rollbackSql) {
        log.step(`Rolling back: ${filename}`);

        if (state.dryRun) {
          log.info(`[DRY RUN] Would execute rollback for ${filename}`);
        } else {
          try {
            await query(rollbackSql);
            await query(`DELETE FROM _migrations WHERE version = '${version}';`);
            log.success(`Rolled back ${filename}`);
          } catch (err) {
            log.error(`Rollback failed for ${filename}: ${err.message}`);
            return false;
          }
        }
      } else {
        log.warn(`No rollback SQL for ${filename} - manual intervention required`);
      }
    }

    return true;
  } catch (err) {
    log.error(`Rollback failed: ${err.message}`);
    return false;
  }
}

// ============================================================================
// CLI Interface
// ============================================================================

function usage() {
  console.log(`
${colors.bold}============================================================================${colors.reset}
${colors.bold}                    Meta Agent Migration Tool (Node.js)                     ${colors.reset}
${colors.bold}============================================================================${colors.reset}

Usage: node migrate.js [command] [options]

Commands:
  up, migrate      Run all pending migrations (default)
  status           Show migration status
  rollback <ver>   Rollback to a specific version
  run <version>    Run a specific migration

Options:
  -v, --verbose    Enable verbose output
  -n, --dry-run    Show what would be done without executing
  -f, --force      Continue on errors / re-run applied migrations
  -h, --help       Show this help message

Environment Variables:
  DATABASE_URL     Full PostgreSQL connection string
  POSTGRES_HOST    Database host (default: localhost)
  POSTGRES_PORT    Database port (default: 5432)
  POSTGRES_USER    Database user (default: postgres)
  POSTGRES_PASSWORD Database password
  POSTGRES_DB      Database name (default: librechat_meta)

Examples:
  node migrate.js                    # Run all pending migrations
  node migrate.js up --verbose       # Run with verbose output
  node migrate.js status             # Show current status
  node migrate.js rollback 005       # Rollback to version 005
  node migrate.js run 010            # Run only migration 010
  node migrate.js up --dry-run       # Preview what would be run
`);
}

function parseArgs(args) {
  let command = 'migrate';
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    switch (arg) {
      case 'up':
      case 'migrate':
        command = 'migrate';
        break;
      case 'status':
        command = 'status';
        break;
      case 'rollback':
        command = 'rollback';
        i++;
        if (args[i] && !args[i].startsWith('-')) {
          state.rollbackTo = args[i];
        } else {
          log.error('rollback requires a version number');
          process.exit(1);
        }
        break;
      case 'run':
        command = 'single';
        i++;
        if (args[i] && !args[i].startsWith('-')) {
          state.singleMigration = args[i];
        } else {
          log.error('run requires a version number');
          process.exit(1);
        }
        break;
      case '-v':
      case '--verbose':
        state.verbose = true;
        break;
      case '-n':
      case '--dry-run':
        state.dryRun = true;
        break;
      case '-f':
      case '--force':
        state.force = true;
        break;
      case '-h':
      case '--help':
        usage();
        process.exit(0);
        break;
      default:
        if (arg.startsWith('-')) {
          log.error(`Unknown option: ${arg}`);
          usage();
          process.exit(1);
        }
    }
    i++;
  }

  return command;
}

async function main() {
  // Load environment
  loadEnv();

  // Parse arguments (skip node and script name)
  const args = process.argv.slice(2);
  const command = parseArgs(args);

  // Initialize database
  const connected = await initDatabase();
  if (!connected) {
    process.exit(1);
  }

  try {
    let success = true;

    switch (command) {
      case 'migrate':
      case 'single':
        success = await runMigrations();
        break;
      case 'status':
        await showStatus();
        break;
      case 'rollback':
        success = await runRollback();
        break;
      default:
        usage();
        process.exit(1);
    }

    await closeDatabase();
    process.exit(success ? 0 : 1);
  } catch (err) {
    log.error(`Unexpected error: ${err.message}`);
    await closeDatabase();
    process.exit(1);
  }
}

main();
