#!/bin/bash

# Meta Agent Test Suite Runner
# This script runs all tests for both the orchestrator and UI extensions

set -e  # Exit on error

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Meta Agent Test Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Parse command line arguments
COVERAGE=false
WATCH=false
UI=false
ORCHESTRATOR_ONLY=false
UI_ONLY=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --coverage|-c)
      COVERAGE=true
      shift
      ;;
    --watch|-w)
      WATCH=true
      shift
      ;;
    --ui|-u)
      UI=true
      shift
      ;;
    --orchestrator|-o)
      ORCHESTRATOR_ONLY=true
      shift
      ;;
    --ui-only)
      UI_ONLY=true
      shift
      ;;
    --help|-h)
      echo "Usage: ./scripts/test.sh [options]"
      echo ""
      echo "Options:"
      echo "  --coverage, -c     Run tests with coverage reports"
      echo "  --watch, -w        Run tests in watch mode"
      echo "  --ui, -u           Run tests with UI interface"
      echo "  --orchestrator, -o Run only orchestrator tests"
      echo "  --ui-only          Run only UI extension tests"
      echo "  --help, -h         Show this help message"
      echo ""
      echo "Examples:"
      echo "  ./scripts/test.sh                    # Run all tests once"
      echo "  ./scripts/test.sh --coverage         # Run all tests with coverage"
      echo "  ./scripts/test.sh --watch            # Run all tests in watch mode"
      echo "  ./scripts/test.sh --orchestrator -c  # Run orchestrator tests with coverage"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Function to run orchestrator tests
run_orchestrator_tests() {
  echo -e "${BLUE}Running Orchestrator Tests...${NC}"
  echo "Location: $PROJECT_ROOT/orchestrator"
  echo ""

  cd "$PROJECT_ROOT/orchestrator"

  # Check if node_modules exists
  if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing orchestrator dependencies...${NC}"
    npm install
    echo ""
  fi

  # Determine which test command to run
  if [ "$COVERAGE" = true ]; then
    npm run test:coverage
  elif [ "$WATCH" = true ]; then
    npm run test:watch
  elif [ "$UI" = true ]; then
    npm run test:ui
  else
    npm run test
  fi

  echo -e "${GREEN}✓ Orchestrator tests completed${NC}"
  echo ""
}

# Function to run UI tests
run_ui_tests() {
  echo -e "${BLUE}Running UI Extension Tests...${NC}"
  echo "Location: $PROJECT_ROOT/ui-extensions"
  echo ""

  cd "$PROJECT_ROOT/ui-extensions"

  # Check if node_modules exists
  if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing UI dependencies...${NC}"
    npm install
    echo ""
  fi

  # Determine which test command to run
  if [ "$COVERAGE" = true ]; then
    npm run test:coverage
  elif [ "$WATCH" = true ]; then
    npm run test:watch
  elif [ "$UI" = true ]; then
    npm run test:ui
  else
    npm run test
  fi

  echo -e "${GREEN}✓ UI tests completed${NC}"
  echo ""
}

# Main execution
if [ "$ORCHESTRATOR_ONLY" = true ]; then
  run_orchestrator_tests
elif [ "$UI_ONLY" = true ]; then
  run_ui_tests
else
  # Run both
  run_orchestrator_tests
  run_ui_tests
fi

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ All tests completed successfully!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Show coverage info if enabled
if [ "$COVERAGE" = true ]; then
  echo -e "${BLUE}Coverage reports generated:${NC}"
  echo "  Orchestrator: $PROJECT_ROOT/orchestrator/coverage/index.html"
  echo "  UI Extensions: $PROJECT_ROOT/ui-extensions/coverage/index.html"
  echo ""
  echo -e "${YELLOW}Tip: Open these HTML files in your browser to view detailed coverage reports${NC}"
  echo ""
fi

exit 0
