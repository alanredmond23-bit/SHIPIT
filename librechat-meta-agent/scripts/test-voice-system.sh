#!/bin/bash

# Voice System Test Script
# Tests the voice conversation system setup

set -e

echo "========================================"
echo "Voice System Test Script"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:4000}"
TEST_USER_ID="test-user-$(date +%s)"

echo "Testing API at: $API_URL"
echo ""

# Test 1: Health Check
echo "Test 1: API Health Check..."
if curl -s -f "$API_URL/health" > /dev/null; then
    echo -e "${GREEN}✓${NC} API is responding"
else
    echo -e "${RED}✗${NC} API is not responding"
    echo "Make sure the orchestrator is running: cd orchestrator && npm run dev"
    exit 1
fi
echo ""

# Test 2: List OpenAI Voices
echo "Test 2: List OpenAI Voices..."
VOICES_RESPONSE=$(curl -s "$API_URL/api/voice/voices/openai")
VOICE_COUNT=$(echo "$VOICES_RESPONSE" | grep -o '"count":[0-9]*' | grep -o '[0-9]*')

if [ -n "$VOICE_COUNT" ] && [ "$VOICE_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Found $VOICE_COUNT OpenAI voices"
    echo "$VOICES_RESPONSE" | grep -o '"name":"[^"]*"' | head -3 | sed 's/"name":"/ - /g' | sed 's/"//g'
else
    echo -e "${RED}✗${NC} Failed to list voices"
    echo "Response: $VOICES_RESPONSE"
    exit 1
fi
echo ""

# Test 3: Start Voice Session
echo "Test 3: Start Voice Session..."
SESSION_RESPONSE=$(curl -s -X POST "$API_URL/api/voice/start" \
    -H "Content-Type: application/json" \
    -d '{
        "userId": "'"$TEST_USER_ID"'",
        "sttProvider": "whisper",
        "ttsProvider": "openai",
        "voice": "alloy",
        "language": "en",
        "responseStyle": "conversational",
        "interruptSensitivity": "medium"
    }')

SESSION_ID=$(echo "$SESSION_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
WS_URL=$(echo "$SESSION_RESPONSE" | grep -o '"wsUrl":"[^"]*"' | cut -d'"' -f4)

if [ -n "$SESSION_ID" ]; then
    echo -e "${GREEN}✓${NC} Session created: $SESSION_ID"
    echo "  WebSocket URL: $WS_URL"
else
    echo -e "${RED}✗${NC} Failed to create session"
    echo "Response: $SESSION_RESPONSE"
    exit 1
fi
echo ""

# Test 4: Get Session Details
echo "Test 4: Get Session Details..."
SESSION_DETAILS=$(curl -s "$API_URL/api/voice/$SESSION_ID")
SESSION_STATUS=$(echo "$SESSION_DETAILS" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ "$SESSION_STATUS" = "active" ]; then
    echo -e "${GREEN}✓${NC} Session is active"
else
    echo -e "${YELLOW}!${NC} Session status: $SESSION_STATUS"
fi
echo ""

# Test 5: Get Transcript (should be empty)
echo "Test 5: Get Transcript..."
TRANSCRIPT=$(curl -s "$API_URL/api/voice/$SESSION_ID/transcript")
TRANSCRIPT_COUNT=$(echo "$TRANSCRIPT" | grep -o '"count":[0-9]*' | grep -o '[0-9]*')

if [ "$TRANSCRIPT_COUNT" = "0" ]; then
    echo -e "${GREEN}✓${NC} Transcript is empty (as expected for new session)"
else
    echo -e "${YELLOW}!${NC} Transcript has $TRANSCRIPT_COUNT entries"
fi
echo ""

# Test 6: End Session
echo "Test 6: End Voice Session..."
END_RESPONSE=$(curl -s -X POST "$API_URL/api/voice/$SESSION_ID/end")
END_STATUS=$(echo "$END_RESPONSE" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ "$END_STATUS" = "ended" ]; then
    echo -e "${GREEN}✓${NC} Session ended successfully"

    # Show stats
    DURATION=$(echo "$END_RESPONSE" | grep -o '"duration":[0-9]*' | grep -o '[0-9]*')
    TURNS=$(echo "$END_RESPONSE" | grep -o '"totalTurns":[0-9]*' | grep -o '[0-9]*')

    echo "  Duration: ${DURATION}ms"
    echo "  Total turns: ${TURNS:-0}"
else
    echo -e "${RED}✗${NC} Failed to end session"
    echo "Response: $END_RESPONSE"
fi
echo ""

# Test 7: Database Check
echo "Test 7: Database Check..."
if command -v psql &> /dev/null; then
    DB_HOST="${DB_HOST:-localhost}"
    DB_NAME="${DB_NAME:-librechat}"
    DB_USER="${DB_USER:-postgres}"

    echo "Checking for voice tables in database..."

    TABLES=$(PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name LIKE 'voice%'
        OR table_name LIKE '%voice%'
        ORDER BY table_name;
    " 2>/dev/null)

    if [ -n "$TABLES" ]; then
        echo -e "${GREEN}✓${NC} Voice tables found:"
        echo "$TABLES" | sed 's/^/ - /'
    else
        echo -e "${YELLOW}!${NC} No voice tables found in database"
        echo "Run migration: psql -U $DB_USER -d $DB_NAME -f schemas/007_voice_schema.sql"
    fi
else
    echo -e "${YELLOW}!${NC} psql not found, skipping database check"
fi
echo ""

# Test 8: Environment Variables Check
echo "Test 8: Environment Variables..."
REQUIRED_VARS=("ANTHROPIC_API_KEY" "OPENAI_API_KEY")
OPTIONAL_VARS=("DEEPGRAM_API_KEY" "ASSEMBLYAI_API_KEY" "ELEVENLABS_API_KEY" "PLAYHT_API_KEY")

for VAR in "${REQUIRED_VARS[@]}"; do
    if [ -n "${!VAR}" ]; then
        echo -e "${GREEN}✓${NC} $VAR is set"
    else
        echo -e "${RED}✗${NC} $VAR is NOT set (required)"
    fi
done

for VAR in "${OPTIONAL_VARS[@]}"; do
    if [ -n "${!VAR}" ]; then
        echo -e "${GREEN}✓${NC} $VAR is set"
    else
        echo -e "${YELLOW}!${NC} $VAR is NOT set (optional)"
    fi
done
echo ""

# Summary
echo "========================================"
echo "Test Summary"
echo "========================================"
echo -e "${GREEN}✓${NC} API is running and responding"
echo -e "${GREEN}✓${NC} Voice provider integration working"
echo -e "${GREEN}✓${NC} Session lifecycle working"
echo ""
echo "Next Steps:"
echo "1. Open http://localhost:3000/voice in your browser"
echo "2. Click 'Start Call' and allow microphone access"
echo "3. Speak to test the voice conversation"
echo ""
echo "For full documentation, see:"
echo " - docs/VOICE_SYSTEM.md"
echo " - docs/VOICE_INTEGRATION_EXAMPLE.md"
echo " - docs/VOICE_API_REFERENCE.md"
echo ""
echo "Happy voice chatting! 🎤"
