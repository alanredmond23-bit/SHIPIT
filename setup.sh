#!/bin/bash
#===============================================================================
#
#   SHIPIT / Meta Agent Desktop - Universal Setup Script
#
#   USAGE: ./setup.sh [options]
#
#   This script handles EVERYTHING needed to run the app on any machine.
#   Just clone the repo and run this script. That's it.
#
#   Options:
#     --clean       Clean install (removes all node_modules first)
#     --skip-env    Skip .env file creation (use existing)
#     --dev         Also start the app after setup
#     --help        Show this help message
#
#===============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Script directory (where this script lives)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

#===============================================================================
# Configuration
#===============================================================================

REQUIRED_NODE_VERSION=18
REQUIRED_NPM_VERSION=9

# All directories that need npm install
INSTALL_DIRS=(
    "."
    "librechat-meta-agent/ui-extensions"
    "librechat-meta-agent/desktop-app"
    "librechat-meta-agent/orchestrator"
)

#===============================================================================
# Helper Functions
#===============================================================================

print_banner() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  ${BOLD}SHIPIT / Meta Agent Desktop${NC}                                 ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  ${BLUE}Universal Setup Script v1.0${NC}                                  ${CYAN}║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

log_step() {
    echo -e "\n${BLUE}▶${NC} ${BOLD}$1${NC}"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 is not installed"
        return 1
    fi
    return 0
}

version_gte() {
    # Returns 0 if $1 >= $2
    [ "$(printf '%s\n' "$2" "$1" | sort -V | head -n1)" = "$2" ]
}

#===============================================================================
# Parse Arguments
#===============================================================================

CLEAN_INSTALL=false
SKIP_ENV=false
START_DEV=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --clean)
            CLEAN_INSTALL=true
            shift
            ;;
        --skip-env)
            SKIP_ENV=true
            shift
            ;;
        --dev)
            START_DEV=true
            shift
            ;;
        --help|-h)
            print_banner
            echo "Usage: ./setup.sh [options]"
            echo ""
            echo "Options:"
            echo "  --clean       Clean install (removes all node_modules first)"
            echo "  --skip-env    Skip .env file creation (use existing)"
            echo "  --dev         Start the app after setup completes"
            echo "  --help        Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./setup.sh              # Standard setup"
            echo "  ./setup.sh --clean      # Fresh install from scratch"
            echo "  ./setup.sh --dev        # Setup and launch app"
            echo ""
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

#===============================================================================
# Main Setup Process
#===============================================================================

print_banner

#-------------------------------------------------------------------------------
# Step 1: Check Prerequisites
#-------------------------------------------------------------------------------

log_step "Checking prerequisites..."

# Check Node.js
if ! check_command node; then
    log_error "Node.js is not installed!"
    echo ""
    echo "  Install Node.js v${REQUIRED_NODE_VERSION}+ from:"
    echo "    - https://nodejs.org/"
    echo "    - Or use nvm: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo ""
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt "$REQUIRED_NODE_VERSION" ]; then
    log_error "Node.js version $NODE_VERSION is too old. Required: v${REQUIRED_NODE_VERSION}+"
    echo ""
    echo "  Current: $(node -v)"
    echo "  Required: v${REQUIRED_NODE_VERSION}.0.0 or higher"
    echo ""
    echo "  To upgrade:"
    echo "    nvm install ${REQUIRED_NODE_VERSION}"
    echo "    nvm use ${REQUIRED_NODE_VERSION}"
    echo ""
    exit 1
fi
log_success "Node.js $(node -v)"

# Check npm
if ! check_command npm; then
    log_error "npm is not installed!"
    exit 1
fi

NPM_VERSION=$(npm -v | cut -d. -f1)
if [ "$NPM_VERSION" -lt "$REQUIRED_NPM_VERSION" ]; then
    log_warning "npm version $NPM_VERSION is old. Recommended: v${REQUIRED_NPM_VERSION}+"
    log_info "Attempting to update npm..."
    npm install -g npm@latest
fi
log_success "npm v$(npm -v)"

# Check git (optional but recommended)
if check_command git; then
    log_success "git $(git --version | cut -d' ' -f3)"
else
    log_warning "git not found (optional)"
fi

#-------------------------------------------------------------------------------
# Step 2: Create .nvmrc for consistency
#-------------------------------------------------------------------------------

log_step "Creating .nvmrc for Node version consistency..."

echo "${REQUIRED_NODE_VERSION}" > .nvmrc
log_success "Created .nvmrc (v${REQUIRED_NODE_VERSION})"

#-------------------------------------------------------------------------------
# Step 3: Clean install (if requested)
#-------------------------------------------------------------------------------

if [ "$CLEAN_INSTALL" = true ]; then
    log_step "Cleaning existing node_modules (--clean flag)..."

    for dir in "${INSTALL_DIRS[@]}"; do
        if [ -d "$dir/node_modules" ]; then
            log_info "Removing $dir/node_modules..."
            rm -rf "$dir/node_modules"
        fi
    done

    # Also clean Electron cache
    ELECTRON_CACHE="$HOME/.cache/electron"
    if [ -d "$ELECTRON_CACHE" ]; then
        log_info "Clearing Electron cache..."
        rm -rf "$ELECTRON_CACHE"
    fi

    # Mac Electron cache location
    ELECTRON_CACHE_MAC="$HOME/Library/Caches/electron"
    if [ -d "$ELECTRON_CACHE_MAC" ]; then
        log_info "Clearing Electron cache (Mac)..."
        rm -rf "$ELECTRON_CACHE_MAC"
    fi

    log_success "Clean complete"
fi

#-------------------------------------------------------------------------------
# Step 4: Setup Environment Files
#-------------------------------------------------------------------------------

if [ "$SKIP_ENV" = false ]; then
    log_step "Setting up environment files..."

    # Main .env in librechat-meta-agent
    META_AGENT_DIR="librechat-meta-agent"
    ENV_FILE="$META_AGENT_DIR/.env"
    ENV_EXAMPLE="$META_AGENT_DIR/ui-extensions/.env.example"

    if [ ! -f "$ENV_FILE" ]; then
        log_info "Creating $ENV_FILE..."

        # Create comprehensive .env file
        cat > "$ENV_FILE" << 'ENVEOF'
# =============================================================================
# SHIPIT / Meta Agent - Environment Configuration
# =============================================================================
# Copy this file and fill in your values.
# Get Supabase credentials from: https://app.supabase.com/project/_/settings/api
# =============================================================================

# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Database Configuration (for orchestrator)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=librechat_meta
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

# API Keys (optional - for AI features)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Development Settings
NODE_ENV=development
ENVEOF

        log_warning "Created $ENV_FILE with placeholder values"
        log_warning "You MUST edit this file with your Supabase credentials!"
        echo ""
        echo -e "  ${YELLOW}Edit the file:${NC}"
        echo -e "    nano $ENV_FILE"
        echo ""
        echo -e "  ${YELLOW}Or set environment variables:${NC}"
        echo -e "    export NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co"
        echo -e "    export NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG..."
        echo ""
    else
        log_success "Found existing $ENV_FILE"
    fi

    # Fix the symlink in ui-extensions
    UI_EXT_DIR="$META_AGENT_DIR/ui-extensions"
    UI_ENV_LINK="$UI_EXT_DIR/.env"

    # Remove broken symlink if exists
    if [ -L "$UI_ENV_LINK" ]; then
        rm "$UI_ENV_LINK"
    fi

    # Create proper symlink
    ln -sf "../.env" "$UI_ENV_LINK"
    log_success "Fixed .env symlink in ui-extensions"

    # Create .env.local for Next.js if needed
    if [ ! -f "$UI_EXT_DIR/.env.local" ]; then
        ln -sf "../.env" "$UI_EXT_DIR/.env.local"
        log_success "Created .env.local symlink in ui-extensions"
    fi
fi

#-------------------------------------------------------------------------------
# Step 5: Install Dependencies
#-------------------------------------------------------------------------------

log_step "Installing dependencies in all directories..."

for dir in "${INSTALL_DIRS[@]}"; do
    if [ -f "$dir/package.json" ]; then
        echo ""
        log_info "Installing in $dir..."

        cd "$SCRIPT_DIR/$dir"

        # Use npm ci if package-lock exists, otherwise npm install
        if [ -f "package-lock.json" ]; then
            npm ci --legacy-peer-deps 2>/dev/null || npm install --legacy-peer-deps
        else
            npm install --legacy-peer-deps
        fi

        log_success "Installed dependencies in $dir"
    fi
done

cd "$SCRIPT_DIR"

#-------------------------------------------------------------------------------
# Step 6: Validate Installation
#-------------------------------------------------------------------------------

log_step "Validating installation..."

VALIDATION_PASSED=true

# Check all node_modules exist
for dir in "${INSTALL_DIRS[@]}"; do
    if [ -d "$dir/node_modules" ]; then
        log_success "$dir/node_modules exists"
    else
        log_error "$dir/node_modules missing!"
        VALIDATION_PASSED=false
    fi
done

# Check Electron is installed
if [ -d "librechat-meta-agent/desktop-app/node_modules/electron" ]; then
    ELECTRON_VERSION=$(cd librechat-meta-agent/desktop-app && npx electron --version 2>/dev/null || echo "unknown")
    log_success "Electron installed ($ELECTRON_VERSION)"
else
    log_error "Electron not found in desktop-app!"
    VALIDATION_PASSED=false
fi

# Check .env exists
if [ -f "librechat-meta-agent/.env" ]; then
    log_success "Environment file exists"

    # Check if it has real values or placeholders
    if grep -q "your-project-url-here" "librechat-meta-agent/.env"; then
        log_warning ".env has placeholder values - remember to update!"
    fi
else
    log_error "Environment file missing!"
    VALIDATION_PASSED=false
fi

#-------------------------------------------------------------------------------
# Step 7: Summary
#-------------------------------------------------------------------------------

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"

if [ "$VALIDATION_PASSED" = true ]; then
    echo -e "${GREEN}${BOLD}Setup Complete!${NC}"
    echo ""
    echo -e "  ${BOLD}To start the Electron app:${NC}"
    echo -e "    cd librechat-meta-agent/desktop-app"
    echo -e "    npm run dev"
    echo ""
    echo -e "  ${BOLD}To start just the web UI:${NC}"
    echo -e "    cd librechat-meta-agent/ui-extensions"
    echo -e "    npm run dev"
    echo ""
    echo -e "  ${BOLD}To start the orchestrator backend:${NC}"
    echo -e "    cd librechat-meta-agent/orchestrator"
    echo -e "    npm run dev"
    echo ""

    if grep -q "your-project-url-here" "librechat-meta-agent/.env" 2>/dev/null; then
        echo -e "  ${YELLOW}${BOLD}IMPORTANT:${NC} Update librechat-meta-agent/.env with your Supabase credentials!"
        echo ""
    fi
else
    echo -e "${RED}${BOLD}Setup encountered errors!${NC}"
    echo ""
    echo "  Please check the errors above and try:"
    echo "    ./setup.sh --clean"
    echo ""
fi

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

#-------------------------------------------------------------------------------
# Step 8: Auto-start (if requested)
#-------------------------------------------------------------------------------

if [ "$START_DEV" = true ] && [ "$VALIDATION_PASSED" = true ]; then
    log_step "Starting development server (--dev flag)..."
    cd "$SCRIPT_DIR/librechat-meta-agent/desktop-app"
    npm run dev
fi
