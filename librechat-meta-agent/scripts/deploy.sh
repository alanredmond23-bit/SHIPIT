#!/bin/bash

# ============================================================================
# Meta Agent - One-Command Deployment Script
# ============================================================================
# This script deploys the complete Meta Agent stack including:
# - PostgreSQL with pgvector
# - Redis
# - Orchestrator backend
# - Next.js UI
# - Nginx reverse proxy
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

log_success() {
    echo -e "${GREEN}✓ ${NC}$1"
}

log_warning() {
    echo -e "${YELLOW}⚠ ${NC}$1"
}

log_error() {
    echo -e "${RED}✗ ${NC}$1"
}

# Print banner
print_banner() {
    echo ""
    echo "============================================================================"
    echo "                    Meta Agent Deployment Script                           "
    echo "============================================================================"
    echo ""
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    log_success "Docker found: $(docker --version)"

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    log_success "Docker Compose found"

    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker first."
        exit 1
    fi
    log_success "Docker daemon is running"

    echo ""
}

# Check and setup environment file
setup_environment() {
    log_info "Setting up environment configuration..."

    cd "$PROJECT_ROOT"

    if [ ! -f .env ]; then
        log_warning ".env file not found. Creating from .env.example..."
        cp .env.example .env
        log_warning "Please edit .env file and add your API keys before continuing."
        echo ""
        echo "Required environment variables:"
        echo "  - ANTHROPIC_API_KEY (required)"
        echo "  - JWT_SECRET (generate with: openssl rand -base64 32)"
        echo "  - SESSION_SECRET (generate with: openssl rand -base64 32)"
        echo "  - POSTGRES_PASSWORD (change from default)"
        echo "  - REDIS_PASSWORD (change from default)"
        echo ""
        read -p "Press Enter after editing .env file to continue..."
    else
        log_success ".env file found"
    fi

    # Validate required variables
    if ! grep -q "ANTHROPIC_API_KEY=sk-" .env 2>/dev/null; then
        log_warning "ANTHROPIC_API_KEY not set or invalid in .env file"
    fi

    if grep -q "JWT_SECRET=your-jwt-secret" .env 2>/dev/null; then
        log_warning "JWT_SECRET still has default value. Consider generating a secure secret."
    fi

    echo ""
}

# Generate secrets if needed
generate_secrets() {
    log_info "Checking security secrets..."

    if command -v openssl &> /dev/null; then
        if grep -q "your-jwt-secret" .env 2>/dev/null; then
            log_info "Generating JWT_SECRET..."
            JWT_SECRET=$(openssl rand -base64 32)
            sed -i.bak "s/JWT_SECRET=.*/JWT_SECRET=${JWT_SECRET}/" .env
            log_success "JWT_SECRET generated"
        fi

        if grep -q "your-session-secret" .env 2>/dev/null; then
            log_info "Generating SESSION_SECRET..."
            SESSION_SECRET=$(openssl rand -base64 32)
            sed -i.bak "s/SESSION_SECRET=.*/SESSION_SECRET=${SESSION_SECRET}/" .env
            log_success "SESSION_SECRET generated"
        fi

        if grep -q "your-encryption-key" .env 2>/dev/null; then
            log_info "Generating ENCRYPTION_KEY..."
            ENCRYPTION_KEY=$(openssl rand -base64 32)
            sed -i.bak "s/ENCRYPTION_KEY=.*/ENCRYPTION_KEY=${ENCRYPTION_KEY}/" .env
            log_success "ENCRYPTION_KEY generated"
        fi
    else
        log_warning "openssl not found. Please manually set secrets in .env file."
    fi

    echo ""
}

# Stop existing containers
stop_existing() {
    log_info "Stopping existing containers..."
    cd "$PROJECT_ROOT"

    if docker-compose ps -q 2>/dev/null | grep -q .; then
        docker-compose down
        log_success "Existing containers stopped"
    else
        log_info "No existing containers found"
    fi

    echo ""
}

# Build images
build_images() {
    log_info "Building Docker images..."
    cd "$PROJECT_ROOT"

    # Use docker-compose or docker compose based on availability
    if command -v docker-compose &> /dev/null; then
        docker-compose build --no-cache
    else
        docker compose build --no-cache
    fi

    log_success "Docker images built successfully"
    echo ""
}

# Start services
start_services() {
    log_info "Starting Meta Agent services..."
    cd "$PROJECT_ROOT"

    # Use docker-compose or docker compose based on availability
    if command -v docker-compose &> /dev/null; then
        docker-compose up -d
    else
        docker compose up -d
    fi

    log_success "Services started"
    echo ""
}

# Wait for services to be healthy
wait_for_services() {
    log_info "Waiting for services to be healthy..."

    local max_attempts=60
    local attempt=0

    # Wait for PostgreSQL
    log_info "Waiting for PostgreSQL..."
    while [ $attempt -lt $max_attempts ]; do
        if docker exec meta-agent-postgres pg_isready -U postgres &> /dev/null; then
            log_success "PostgreSQL is ready"
            break
        fi
        attempt=$((attempt + 1))
        sleep 2
    done

    if [ $attempt -eq $max_attempts ]; then
        log_error "PostgreSQL failed to start"
        exit 1
    fi

    # Wait for Redis
    log_info "Waiting for Redis..."
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if docker exec meta-agent-redis redis-cli ping &> /dev/null; then
            log_success "Redis is ready"
            break
        fi
        attempt=$((attempt + 1))
        sleep 2
    done

    if [ $attempt -eq $max_attempts ]; then
        log_error "Redis failed to start"
        exit 1
    fi

    # Wait for Orchestrator
    log_info "Waiting for Orchestrator..."
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -sf http://localhost:3100/health &> /dev/null; then
            log_success "Orchestrator is ready"
            break
        fi
        attempt=$((attempt + 1))
        sleep 2
    done

    if [ $attempt -eq $max_attempts ]; then
        log_error "Orchestrator failed to start"
        log_info "Check logs with: docker logs meta-agent-orchestrator"
        exit 1
    fi

    # Wait for UI
    log_info "Waiting for UI..."
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -sf http://localhost:3000 &> /dev/null; then
            log_success "UI is ready"
            break
        fi
        attempt=$((attempt + 1))
        sleep 2
    done

    if [ $attempt -eq $max_attempts ]; then
        log_error "UI failed to start"
        log_info "Check logs with: docker logs meta-agent-ui"
        exit 1
    fi

    echo ""
}

# Display service status
show_status() {
    log_info "Service Status:"
    echo ""

    cd "$PROJECT_ROOT"

    if command -v docker-compose &> /dev/null; then
        docker-compose ps
    else
        docker compose ps
    fi

    echo ""
}

# Display access information
show_access_info() {
    echo "============================================================================"
    echo "                    Deployment Successful!                                  "
    echo "============================================================================"
    echo ""
    log_success "Meta Agent is now running!"
    echo ""
    echo "Access URLs:"
    echo "  • Web UI:          http://localhost:3000"
    echo "  • API:             http://localhost:3100"
    echo "  • WebSocket:       ws://localhost:3100/ws"
    echo "  • PostgreSQL:      localhost:5433"
    echo "  • Redis:           localhost:6380"
    echo ""
    echo "Via Nginx (if enabled):"
    echo "  • Application:     http://localhost"
    echo "  • API:             http://localhost/api"
    echo ""
    echo "Useful Commands:"
    echo "  • View logs:       docker-compose logs -f [service]"
    echo "  • Stop services:   docker-compose down"
    echo "  • Restart:         docker-compose restart [service]"
    echo "  • Shell access:    docker exec -it [container] sh"
    echo ""
    echo "Container Names:"
    echo "  • meta-agent-postgres"
    echo "  • meta-agent-redis"
    echo "  • meta-agent-orchestrator"
    echo "  • meta-agent-ui"
    echo "  • meta-agent-nginx"
    echo ""
    echo "============================================================================"
}

# Cleanup function for errors
cleanup_on_error() {
    log_error "Deployment failed!"
    log_info "Cleaning up..."
    cd "$PROJECT_ROOT"
    docker-compose down 2>/dev/null || docker compose down 2>/dev/null || true
    exit 1
}

# Main deployment function
main() {
    # Set up error handling
    trap cleanup_on_error ERR

    print_banner
    check_prerequisites
    setup_environment
    generate_secrets

    # Ask for confirmation
    echo "Ready to deploy Meta Agent. This will:"
    echo "  1. Stop any existing containers"
    echo "  2. Build new Docker images"
    echo "  3. Start all services"
    echo ""
    read -p "Continue? (y/N) " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deployment cancelled"
        exit 0
    fi

    echo ""
    stop_existing
    build_images
    start_services
    wait_for_services
    show_status
    show_access_info
}

# Run main function
main "$@"
