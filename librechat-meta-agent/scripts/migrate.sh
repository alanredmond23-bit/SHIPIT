#!/bin/bash
# ============================================================================
# Meta Agent Database Migration Runner
# Runs SQL migrations in order, tracks applied migrations, supports rollback
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SCHEMAS_DIR="$PROJECT_DIR/schemas"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# State
VERBOSE=false
DRY_RUN=false
ROLLBACK_MODE=false
ROLLBACK_TO=""
FORCE=false
SINGLE_MIGRATION=""

# ============================================================================
# Logging Functions
# ============================================================================

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_debug() { [[ "$VERBOSE" == "true" ]] && echo -e "${CYAN}[DEBUG]${NC} $1"; }
log_step() { echo -e "${BOLD}==>${NC} $1"; }

# ============================================================================
# Environment & Database
# ============================================================================

load_env() {
  if [ -f "$PROJECT_DIR/.env" ]; then
    log_debug "Loading environment from .env"
    set -a
    source "$PROJECT_DIR/.env"
    set +a
  fi
}

get_database_url() {
  # Priority: DATABASE_URL > constructed from parts
  if [ -n "$DATABASE_URL" ]; then
    echo "$DATABASE_URL"
  elif [ -n "$POSTGRES_HOST" ]; then
    local ssl_mode=""
    if [ "$DATABASE_SSL" == "true" ]; then
      ssl_mode="?sslmode=require"
    fi
    echo "postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-postgres}@${POSTGRES_HOST}:${POSTGRES_PORT:-5432}/${POSTGRES_DB:-librechat_meta}${ssl_mode}"
  else
    log_error "No database configuration found. Set DATABASE_URL or POSTGRES_* variables."
    exit 1
  fi
}

check_psql() {
  if ! command -v psql &> /dev/null; then
    log_error "psql is required but not installed."
    log_info "Install with: brew install postgresql (macOS) or apt install postgresql-client (Linux)"
    exit 1
  fi
}

check_database_connection() {
  local db_url="$1"
  log_debug "Testing database connection..."

  if ! psql "$db_url" -c "SELECT 1" &> /dev/null; then
    log_error "Cannot connect to database."
    log_info "Check your DATABASE_URL or POSTGRES_* environment variables."
    exit 1
  fi

  log_debug "Database connection successful"
}

# ============================================================================
# Migration Functions
# ============================================================================

get_migration_files() {
  # Get all .sql files in schemas directory, sorted by filename
  find "$SCHEMAS_DIR" -maxdepth 1 -name "*.sql" -type f | sort
}

parse_migration_info() {
  local filename="$1"
  local basename=$(basename "$filename")

  # Extract version (e.g., "001" from "001_initial_schema.sql")
  local version=$(echo "$basename" | grep -oE '^[0-9]+' || echo "")

  # Extract name (e.g., "initial_schema" from "001_initial_schema.sql")
  local name=$(echo "$basename" | sed 's/^[0-9]*_//' | sed 's/\.sql$//')

  echo "$version|$name|$basename"
}

calculate_checksum() {
  local file="$1"
  if command -v sha256sum &> /dev/null; then
    sha256sum "$file" | cut -d' ' -f1
  elif command -v shasum &> /dev/null; then
    shasum -a 256 "$file" | cut -d' ' -f1
  else
    echo ""
  fi
}

is_migration_applied() {
  local db_url="$1"
  local version="$2"

  local result=$(psql "$db_url" -t -A -c "
    SELECT CASE WHEN EXISTS (
      SELECT 1 FROM _migrations WHERE version = '$version' AND success = TRUE
    ) THEN 'yes' ELSE 'no' END;
  " 2>/dev/null || echo "no")

  [ "$result" == "yes" ]
}

ensure_tracking_table() {
  local db_url="$1"

  log_debug "Ensuring migration tracking table exists..."

  # Check if _migrations table exists
  local table_exists=$(psql "$db_url" -t -A -c "
    SELECT CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_name = '_migrations'
    ) THEN 'yes' ELSE 'no' END;
  " 2>/dev/null || echo "no")

  if [ "$table_exists" != "yes" ]; then
    log_info "Creating migration tracking table..."
    local tracking_sql="$SCHEMAS_DIR/000_migration_tracking.sql"

    if [ ! -f "$tracking_sql" ]; then
      log_error "Migration tracking file not found: $tracking_sql"
      exit 1
    fi

    if [ "$DRY_RUN" == "true" ]; then
      log_info "[DRY RUN] Would create migration tracking table"
    else
      psql "$db_url" -f "$tracking_sql" > /dev/null 2>&1
      log_success "Migration tracking table created"
    fi
  else
    log_debug "Migration tracking table already exists"
  fi
}

run_migration() {
  local db_url="$1"
  local file="$2"
  local version="$3"
  local name="$4"
  local basename="$5"

  local checksum=$(calculate_checksum "$file")
  local start_time=$(date +%s%3N 2>/dev/null || date +%s)000

  log_step "Applying: $basename"

  if [ "$DRY_RUN" == "true" ]; then
    log_info "[DRY RUN] Would execute: $file"
    return 0
  fi

  # Run the migration in a transaction
  local output
  local exit_code

  output=$(psql "$db_url" -v ON_ERROR_STOP=1 -f "$file" 2>&1)
  exit_code=$?

  local end_time=$(date +%s%3N 2>/dev/null || date +%s)000
  local duration=$((end_time - start_time))

  if [ $exit_code -eq 0 ]; then
    # Record successful migration
    psql "$db_url" -c "
      INSERT INTO _migrations (version, name, filename, checksum, execution_time_ms, success)
      VALUES ('$version', '$name', '$basename', '$checksum', $duration, TRUE)
      ON CONFLICT (filename) DO UPDATE SET
        applied_at = NOW(),
        execution_time_ms = $duration,
        success = TRUE,
        error_message = NULL;
    " > /dev/null 2>&1

    log_success "Applied $basename (${duration}ms)"
    return 0
  else
    # Record failed migration
    local error_msg=$(echo "$output" | head -c 500 | tr "'" "''")
    psql "$db_url" -c "
      INSERT INTO _migrations (version, name, filename, success, error_message)
      VALUES ('$version', '$name', '$basename', FALSE, '$error_msg')
      ON CONFLICT (filename) DO UPDATE SET
        applied_at = NOW(),
        success = FALSE,
        error_message = '$error_msg';
    " > /dev/null 2>&1 || true

    log_error "Failed to apply $basename"
    echo -e "${RED}Error output:${NC}"
    echo "$output" | head -20
    return 1
  fi
}

run_rollback() {
  local db_url="$1"
  local target_version="$2"

  log_warn "Rolling back to version: $target_version"

  # Get migrations to rollback (in reverse order)
  local migrations_to_rollback=$(psql "$db_url" -t -A -c "
    SELECT version, filename, rollback_sql
    FROM _migrations
    WHERE version > '$target_version' AND success = TRUE
    ORDER BY version DESC;
  " 2>/dev/null)

  if [ -z "$migrations_to_rollback" ]; then
    log_info "No migrations to rollback"
    return 0
  fi

  echo "$migrations_to_rollback" | while IFS='|' read -r version filename rollback_sql; do
    if [ -n "$rollback_sql" ] && [ "$rollback_sql" != "" ]; then
      log_step "Rolling back: $filename"

      if [ "$DRY_RUN" == "true" ]; then
        log_info "[DRY RUN] Would execute rollback for $filename"
      else
        if psql "$db_url" -c "$rollback_sql" > /dev/null 2>&1; then
          psql "$db_url" -c "DELETE FROM _migrations WHERE version = '$version';" > /dev/null 2>&1
          log_success "Rolled back $filename"
        else
          log_error "Rollback failed for $filename"
          return 1
        fi
      fi
    else
      log_warn "No rollback SQL for $filename - manual intervention required"
    fi
  done
}

show_status() {
  local db_url="$1"

  echo ""
  echo -e "${BOLD}============================================================================${NC}"
  echo -e "${BOLD}                    Migration Status                                        ${NC}"
  echo -e "${BOLD}============================================================================${NC}"
  echo ""

  # Check if tracking table exists
  local table_exists=$(psql "$db_url" -t -A -c "
    SELECT CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_name = '_migrations'
    ) THEN 'yes' ELSE 'no' END;
  " 2>/dev/null || echo "no")

  if [ "$table_exists" != "yes" ]; then
    log_warn "Migration tracking table does not exist. Run migrations first."
    return 0
  fi

  # Show applied migrations
  echo -e "${BOLD}Applied Migrations:${NC}"
  psql "$db_url" -c "
    SELECT
      version,
      name,
      to_char(applied_at, 'YYYY-MM-DD HH24:MI:SS') as applied_at,
      CASE WHEN success THEN 'Success' ELSE 'Failed' END as status,
      COALESCE(execution_time_ms || 'ms', '-') as duration
    FROM _migrations
    ORDER BY version ASC;
  " 2>/dev/null

  echo ""

  # Show pending migrations
  echo -e "${BOLD}Pending Migrations:${NC}"
  local pending_count=0

  for file in $(get_migration_files); do
    local info=$(parse_migration_info "$file")
    local version=$(echo "$info" | cut -d'|' -f1)
    local name=$(echo "$info" | cut -d'|' -f2)
    local basename=$(echo "$info" | cut -d'|' -f3)

    if [ -z "$version" ]; then
      continue
    fi

    if ! is_migration_applied "$db_url" "$version"; then
      echo "  - $basename"
      ((pending_count++)) || true
    fi
  done

  if [ $pending_count -eq 0 ]; then
    echo "  (none - all migrations applied)"
  fi

  echo ""
}

# ============================================================================
# Main Migration Logic
# ============================================================================

run_migrations() {
  local db_url="$1"

  log_info "Starting database migrations..."
  echo ""

  ensure_tracking_table "$db_url"

  local applied_count=0
  local skipped_count=0
  local failed_count=0

  for file in $(get_migration_files); do
    local info=$(parse_migration_info "$file")
    local version=$(echo "$info" | cut -d'|' -f1)
    local name=$(echo "$info" | cut -d'|' -f2)
    local basename=$(echo "$info" | cut -d'|' -f3)

    # Skip files without version numbers
    if [ -z "$version" ]; then
      log_debug "Skipping non-versioned file: $basename"
      continue
    fi

    # If single migration mode, only run that one
    if [ -n "$SINGLE_MIGRATION" ] && [ "$version" != "$SINGLE_MIGRATION" ]; then
      continue
    fi

    # Check if already applied
    if is_migration_applied "$db_url" "$version"; then
      if [ "$FORCE" != "true" ]; then
        log_debug "Skipping already applied: $basename"
        ((skipped_count++)) || true
        continue
      else
        log_warn "Forcing re-run of: $basename"
      fi
    fi

    # Run the migration
    if run_migration "$db_url" "$file" "$version" "$name" "$basename"; then
      ((applied_count++)) || true
    else
      ((failed_count++)) || true
      if [ "$FORCE" != "true" ]; then
        log_error "Stopping on first error. Use --force to continue."
        break
      fi
    fi
  done

  echo ""
  echo -e "${BOLD}============================================================================${NC}"
  echo -e "  Applied: ${GREEN}$applied_count${NC}  |  Skipped: ${YELLOW}$skipped_count${NC}  |  Failed: ${RED}$failed_count${NC}"
  echo -e "${BOLD}============================================================================${NC}"
  echo ""

  if [ $failed_count -gt 0 ]; then
    return 1
  fi

  return 0
}

# ============================================================================
# CLI Interface
# ============================================================================

usage() {
  echo ""
  echo -e "${BOLD}============================================================================${NC}"
  echo -e "${BOLD}                    Meta Agent Migration Tool                               ${NC}"
  echo -e "${BOLD}============================================================================${NC}"
  echo ""
  echo "Usage: $0 [command] [options]"
  echo ""
  echo "Commands:"
  echo "  up, migrate      Run all pending migrations (default)"
  echo "  status           Show migration status"
  echo "  rollback <ver>   Rollback to a specific version"
  echo "  run <version>    Run a specific migration"
  echo ""
  echo "Options:"
  echo "  -v, --verbose    Enable verbose output"
  echo "  -n, --dry-run    Show what would be done without executing"
  echo "  -f, --force      Continue on errors / re-run applied migrations"
  echo "  -h, --help       Show this help message"
  echo ""
  echo "Environment Variables:"
  echo "  DATABASE_URL     Full PostgreSQL connection string"
  echo "  POSTGRES_HOST    Database host (default: localhost)"
  echo "  POSTGRES_PORT    Database port (default: 5432)"
  echo "  POSTGRES_USER    Database user (default: postgres)"
  echo "  POSTGRES_PASSWORD Database password"
  echo "  POSTGRES_DB      Database name (default: librechat_meta)"
  echo ""
  echo "Examples:"
  echo "  $0                          # Run all pending migrations"
  echo "  $0 up --verbose             # Run with verbose output"
  echo "  $0 status                   # Show current status"
  echo "  $0 rollback 005             # Rollback to version 005"
  echo "  $0 run 010                  # Run only migration 010"
  echo "  $0 up --dry-run             # Preview what would be run"
  echo ""
}

parse_args() {
  local command=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      up|migrate)
        command="migrate"
        shift
        ;;
      status)
        command="status"
        shift
        ;;
      rollback)
        command="rollback"
        shift
        if [[ $# -gt 0 ]] && [[ ! "$1" =~ ^- ]]; then
          ROLLBACK_TO="$1"
          shift
        else
          log_error "rollback requires a version number"
          exit 1
        fi
        ;;
      run)
        command="single"
        shift
        if [[ $# -gt 0 ]] && [[ ! "$1" =~ ^- ]]; then
          SINGLE_MIGRATION="$1"
          shift
        else
          log_error "run requires a version number"
          exit 1
        fi
        ;;
      -v|--verbose)
        VERBOSE=true
        shift
        ;;
      -n|--dry-run)
        DRY_RUN=true
        shift
        ;;
      -f|--force)
        FORCE=true
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        if [ -z "$command" ]; then
          log_error "Unknown command: $1"
          usage
          exit 1
        fi
        shift
        ;;
    esac
  done

  # Default command
  if [ -z "$command" ]; then
    command="migrate"
  fi

  echo "$command"
}

main() {
  # Check for help flag first (before any potential failures)
  for arg in "$@"; do
    case "$arg" in
      -h|--help)
        usage
        exit 0
        ;;
    esac
  done

  # Load environment
  load_env

  # Parse arguments (help already handled above)
  local command=$(parse_args "$@")

  # Check prerequisites
  check_psql

  # Get database URL
  local db_url=$(get_database_url)
  log_debug "Database URL: ${db_url%%:*}://***"

  # Check connection
  check_database_connection "$db_url"

  # Execute command
  case "$command" in
    migrate)
      run_migrations "$db_url"
      ;;
    status)
      show_status "$db_url"
      ;;
    rollback)
      run_rollback "$db_url" "$ROLLBACK_TO"
      ;;
    single)
      run_migrations "$db_url"
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
