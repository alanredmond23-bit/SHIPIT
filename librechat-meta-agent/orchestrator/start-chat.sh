#!/bin/bash
# Start lightweight chat server with API keys from .env file

cd "$(dirname "$0")"

# Load API keys from .env file in parent directory
if [ -f "../.env" ]; then
  echo "Loading API keys from .env file..."
  set -a
  source "../.env"
  set +a
else
  echo "Warning: No .env file found at ../.env"
  echo "Please create one with your API keys (see .env.example)"
fi

export PORT=3100
export CORS_ORIGINS="http://localhost:3000,http://localhost:3001"

echo "Starting Meta Agent Chat Server..."
echo "API Keys Status:"
echo "  ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:+Set}"
echo "  OPENAI_API_KEY: ${OPENAI_API_KEY:+Set}"
echo "  GOOGLE_API_KEY: ${GOOGLE_API_KEY:+Set}"

npx tsx src/chat-server.ts
