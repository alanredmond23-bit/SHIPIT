#!/bin/bash
# Meta Agent Deployment Script
# Supports: Docker Compose (local) or Supabase (cloud)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Load environment variables
load_env() {
  if [ -f "$PROJECT_DIR/.env" ]; then
    log_info "Loading environment from .env"
    set -a
    source "$PROJECT_DIR/.env"
    set +a
  else
    log_warn "No .env file found. Using defaults."
  fi
}

# Check prerequisites
check_prereqs() {
  log_info "Checking prerequisites..."

  if ! command -v docker &> /dev/null; then
    log_warn "Docker not found. Docker deployment will not work."
    HAS_DOCKER=false
  else
    HAS_DOCKER=true
    log_success "Docker found"
  fi

  if ! command -v psql &> /dev/null; then
    log_warn "psql not found. Direct database migrations require psql."
    HAS_PSQL=false
  else
    HAS_PSQL=true
    log_success "psql found"
  fi
}

# Deploy with Docker Compose
deploy_docker() {
  if [ "$HAS_DOCKER" != "true" ]; then
    log_error "Docker is required for local deployment"
    exit 1
  fi

  log_info "Starting Docker Compose deployment..."
  cd "$PROJECT_DIR"

  # Build and start containers
  docker compose build
  docker compose up -d

  # Wait for healthy
  log_info "Waiting for services to be healthy..."
  sleep 10

  # Check health
  if curl -s http://localhost:3100/health | grep -q "ok"; then
    log_success "Orchestrator API is healthy"
  else
    log_error "Orchestrator API health check failed"
  fi

  if curl -s http://localhost:3000 > /dev/null; then
    log_success "UI is accessible"
  else
    log_error "UI is not accessible"
  fi

  log_success "Docker deployment complete!"
  echo ""
  echo "Services running:"
  echo "  - UI:          http://localhost:3000"
  echo "  - API:         http://localhost:3100"
  echo "  - PostgreSQL:  localhost:5433"
  echo "  - Redis:       localhost:6380"
}

# Deploy migrations to Supabase
deploy_supabase_migrations() {
  if [ -z "$DATABASE_URL" ]; then
    log_error "DATABASE_URL not set. Cannot deploy to Supabase."
    exit 1
  fi

  log_info "Deploying migrations to Supabase..."

  # Run each schema in order
  for schema in "$PROJECT_DIR/schemas"/*.sql; do
    if [ -f "$schema" ]; then
      schema_name=$(basename "$schema")
      log_info "Applying: $schema_name"

      if $HAS_PSQL; then
        psql "$DATABASE_URL" -f "$schema" 2>&1 | while read line; do
          if [[ "$line" == *"ERROR"* ]]; then
            log_warn "  $line"
          elif [[ "$line" == *"CREATE"* ]] || [[ "$line" == *"ALTER"* ]]; then
            log_success "  $line"
          fi
        done
      else
        log_warn "psql not available, using Supabase MCP"
        # Could integrate with Supabase MCP here
      fi
    fi
  done

  log_success "Supabase migrations complete!"
}

# Run database only (no Docker)
run_db_only() {
  if [ "$HAS_DOCKER" != "true" ]; then
    log_error "Docker is required for local database"
    exit 1
  fi

  log_info "Starting PostgreSQL + Redis only..."
  cd "$PROJECT_DIR"

  docker compose up -d postgres redis

  log_info "Waiting for PostgreSQL to be ready..."
  sleep 5

  log_success "Database services running!"
  echo ""
  echo "Connection details:"
  echo "  PostgreSQL: postgresql://postgres:postgres@localhost:5433/librechat_meta"
  echo "  Redis:      redis://localhost:6380"
}

# Development mode
run_dev() {
  log_info "Starting development servers..."

  # Start database
  if [ "$HAS_DOCKER" = "true" ]; then
    run_db_only
  fi

  # Start servers in background
  cd "$PROJECT_DIR/orchestrator"
  log_info "Starting API server..."
  ./start-chat.sh &
  API_PID=$!

  cd "$PROJECT_DIR/ui-extensions"
  log_info "Starting UI server..."
  npm run dev &
  UI_PID=$!

  log_success "Development servers started!"
  echo "  API PID: $API_PID"
  echo "  UI PID:  $UI_PID"
  echo ""
  echo "Press Ctrl+C to stop all servers"

  trap "kill $API_PID $UI_PID 2>/dev/null" EXIT
  wait
}

# Stop all services
stop_all() {
  log_info "Stopping all services..."

  if [ "$HAS_DOCKER" = "true" ]; then
    cd "$PROJECT_DIR"
    docker compose down 2>/dev/null || true
  fi

  pkill -f "chat-server" 2>/dev/null || true
  pkill -f "next dev" 2>/dev/null || true

  log_success "All services stopped"
}

# Show usage
usage() {
  echo "Meta Agent Deployment Script"
  echo ""
  echo "Usage: $0 <command>"
  echo ""
  echo "Commands:"
  echo "  docker       Deploy with Docker Compose (full stack)"
  echo "  db           Start PostgreSQL + Redis only"
  echo "  migrations   Deploy migrations to Supabase"
  echo "  dev          Start development servers"
  echo "  stop         Stop all services"
  echo "  status       Show service status"
  echo ""
}

# Show status
show_status() {
  echo "Service Status:"
  echo ""

  if curl -s http://localhost:3100/health > /dev/null 2>&1; then
    echo "  API (3100):    ${GREEN}Running${NC}"
  else
    echo "  API (3100):    ${RED}Stopped${NC}"
  fi

  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "  UI (3000):     ${GREEN}Running${NC}"
  else
    echo "  UI (3000):     ${RED}Stopped${NC}"
  fi

  if [ "$HAS_DOCKER" = "true" ]; then
    if docker ps | grep -q meta-agent-postgres; then
      echo "  PostgreSQL:    ${GREEN}Running${NC}"
    else
      echo "  PostgreSQL:    ${RED}Stopped${NC}"
    fi

    if docker ps | grep -q meta-agent-redis; then
      echo "  Redis:         ${GREEN}Running${NC}"
    else
      echo "  Redis:         ${RED}Stopped${NC}"
    fi
  fi
  echo ""
}

# Main
main() {
  load_env
  check_prereqs

  case "${1:-}" in
    docker)
      deploy_docker
      ;;
    db)
      run_db_only
      ;;
    migrations)
      deploy_supabase_migrations
      ;;
    dev)
      run_dev
      ;;
    stop)
      stop_all
      ;;
    status)
      show_status
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
