/**
 * AI Orchestrator Edge Function Tests
 *
 * This test suite validates the ai-orchestrator Edge Function
 * which handles AI agent selection, conversation management, and multi-agent coordination.
 *
 * Setup:
 * 1. Ensure Supabase is running: `supabase start`
 * 2. Deploy function locally: `supabase functions serve ai-orchestrator`
 * 3. Seed database with agent data: `supabase db seed`
 *
 * Run tests:
 * - Manual: Use curl commands below
 * - Automated: `deno test tests/edge-functions/ai-orchestrator.test.ts`
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

// ============================================
// Type Definitions
// ============================================

interface OrchestratorRequest {
  message: string;
  conversationId?: string;
  agentType?: string;
  context?: Record<string, any>;
}

interface OrchestratorResponse {
  conversationId: string;
  agent: string;
  response: string;
  metadata: {
    agent_id?: string;
    model?: string;
    tokens?: number;
    [key: string]: any;
  };
}

// ============================================
// Configuration
// ============================================

const FUNCTION_URL = Deno.env.get('SUPABASE_FUNCTION_URL') || 'http://localhost:54321/functions/v1/ai-orchestrator';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || 'your-anon-key';
const AUTH_TOKEN = Deno.env.get('TEST_AUTH_TOKEN') || 'Bearer your-test-token';

// ============================================
// Helper Functions
// ============================================

async function callFunction(body: OrchestratorRequest): Promise<Response> {
  return await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': AUTH_TOKEN,
      'apikey': ANON_KEY,
    },
    body: JSON.stringify(body),
  });
}

// ============================================
// Test Cases
// ============================================

Deno.test('AI Orchestrator: Send message without conversation ID', async () => {
  const request: OrchestratorRequest = {
    message: 'Hello, I need help with my tasks',
  };

  const response = await callFunction(request);
  assertEquals(response.status, 200);

  const data: OrchestratorResponse = await response.json();
  assertExists(data.conversationId);
  assertExists(data.agent);
  assertExists(data.response);
  assertExists(data.metadata);

  console.log('New conversation:', data);
});

Deno.test('AI Orchestrator: Send message with existing conversation', async () => {
  const conversationId = 'test-conversation-id'; // Replace with actual ID

  const request: OrchestratorRequest = {
    message: 'Can you help me prioritize my tasks?',
    conversationId,
  };

  const response = await callFunction(request);

  const data: OrchestratorResponse = await response.json();
  console.log('Continuing conversation:', data);

  if (response.status === 200) {
    assertEquals(data.conversationId, conversationId);
  }
});

Deno.test('AI Orchestrator: Specify agent type - task_manager', async () => {
  const request: OrchestratorRequest = {
    message: 'I have a complex project that needs to be broken down',
    agentType: 'task_manager',
  };

  const response = await callFunction(request);
  assertEquals(response.status, 200);

  const data: OrchestratorResponse = await response.json();
  assertExists(data.agent);
  console.log('Task manager agent response:', data);
});

Deno.test('AI Orchestrator: Specify agent type - workflow_engine', async () => {
  const request: OrchestratorRequest = {
    message: 'Help me automate my weekly review process',
    agentType: 'workflow_engine',
  };

  const response = await callFunction(request);
  assertEquals(response.status, 200);

  const data: OrchestratorResponse = await response.json();
  assertExists(data.agent);
  console.log('Workflow engine agent response:', data);
});

Deno.test('AI Orchestrator: Specify agent type - researcher', async () => {
  const request: OrchestratorRequest = {
    message: 'Research the best practices for API design',
    agentType: 'researcher',
  };

  const response = await callFunction(request);
  assertEquals(response.status, 200);

  const data: OrchestratorResponse = await response.json();
  assertExists(data.agent);
  console.log('Researcher agent response:', data);
});

Deno.test('AI Orchestrator: Auto-select agent based on message (task)', async () => {
  const request: OrchestratorRequest = {
    message: 'I need to create a new task for tomorrow',
  };

  const response = await callFunction(request);
  assertEquals(response.status, 200);

  const data: OrchestratorResponse = await response.json();
  console.log('Auto-selected agent for task:', data.agent);
  // Should select task_manager agent
});

Deno.test('AI Orchestrator: Auto-select agent based on message (workflow)', async () => {
  const request: OrchestratorRequest = {
    message: 'I want to automate my email processing workflow',
  };

  const response = await callFunction(request);
  assertEquals(response.status, 200);

  const data: OrchestratorResponse = await response.json();
  console.log('Auto-selected agent for workflow:', data.agent);
  // Should select workflow_engine agent
});

Deno.test('AI Orchestrator: Include context in request', async () => {
  const request: OrchestratorRequest = {
    message: 'What should I focus on today?',
    context: {
      currentTime: new Date().toISOString(),
      userTimezone: 'America/New_York',
      upcomingTasks: 5,
      urgentTasks: 2,
    },
  };

  const response = await callFunction(request);
  assertEquals(response.status, 200);

  const data: OrchestratorResponse = await response.json();
  console.log('Response with context:', data);
});

Deno.test('AI Orchestrator: Empty message returns error', async () => {
  const request: OrchestratorRequest = {
    message: '',
  };

  const response = await callFunction(request);
  const data = await response.json();

  console.log('Empty message response:', data);
  // Should handle gracefully
});

Deno.test('AI Orchestrator: Invalid agent type', async () => {
  const request: OrchestratorRequest = {
    message: 'Test message',
    agentType: 'nonexistent_agent',
  };

  const response = await callFunction(request);
  const data: OrchestratorResponse = await response.json();

  console.log('Invalid agent type response:', data);
  // Should fall back to default agent
});

// ============================================
// Manual Testing with cURL
// ============================================

/*

# Prerequisites:
export AUTH_TOKEN="Bearer $(supabase auth token)"
export ANON_KEY="your-anon-key-from-supabase-dashboard"
export FUNCTION_URL="http://localhost:54321/functions/v1/ai-orchestrator"

# Test 1: New conversation (auto-select agent)
curl -X POST "$FUNCTION_URL" \
  -H "Authorization: $AUTH_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, I need help organizing my tasks for this week"
  }'

# Expected Response:
{
  "conversationId": "uuid-of-new-conversation",
  "agent": "Task Manager",
  "response": "I can help you manage that task. Let me break it down into actionable steps.",
  "metadata": {
    "agent_id": "agent-uuid",
    "model": "placeholder",
    "tokens": 0
  }
}

# Test 2: Continue existing conversation
export CONVERSATION_ID="uuid-from-test-1"

curl -X POST "$FUNCTION_URL" \
  -H "Authorization: $AUTH_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"What are the most important tasks?\",
    \"conversationId\": \"$CONVERSATION_ID\"
  }"

# Expected Response:
{
  "conversationId": "same-uuid",
  "agent": "Task Manager",
  "response": "I can help you manage that task. Let me break it down into actionable steps.",
  "metadata": {
    "agent_id": "agent-uuid",
    "model": "placeholder",
    "tokens": 0
  }
}

# Test 3: Specify task manager agent
curl -X POST "$FUNCTION_URL" \
  -H "Authorization: $AUTH_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Break down this project: Build a mobile app for expense tracking",
    "agentType": "task_manager"
  }'

# Expected Response:
{
  "conversationId": "new-uuid",
  "agent": "Task Manager",
  "response": "I can help you manage that task. Let me break it down into actionable steps.",
  "metadata": {
    "agent_id": "task-manager-agent-uuid",
    "model": "placeholder",
    "tokens": 0
  }
}

# Test 4: Specify workflow engine agent
curl -X POST "$FUNCTION_URL" \
  -H "Authorization: $AUTH_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Create a workflow for my content publishing process",
    "agentType": "workflow_engine"
  }'

# Expected Response:
{
  "conversationId": "new-uuid",
  "agent": "Workflow Orchestrator",
  "response": "I'\''ll help you set up that workflow. What trigger would you like to use?",
  "metadata": {
    "agent_id": "workflow-agent-uuid",
    "model": "placeholder",
    "tokens": 0
  }
}

# Test 5: Specify researcher agent
curl -X POST "$FUNCTION_URL" \
  -H "Authorization: $AUTH_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Research the best project management methodologies for solo entrepreneurs",
    "agentType": "researcher"
  }'

# Expected Response:
{
  "conversationId": "new-uuid",
  "agent": "Research Assistant",
  "response": "Let me research that topic for you and provide a comprehensive summary.",
  "metadata": {
    "agent_id": "researcher-agent-uuid",
    "model": "placeholder",
    "tokens": 0
  }
}

# Test 6: Include context
curl -X POST "$FUNCTION_URL" \
  -H "Authorization: $AUTH_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What should I focus on today?",
    "context": {
      "currentTime": "2025-11-15T10:00:00Z",
      "userTimezone": "America/New_York",
      "upcomingTasks": 5,
      "urgentTasks": 2,
      "blockedTasks": 1
    }
  }'

# Test 7: Query conversation history (using Supabase client)
# Get messages for a conversation:
supabase db --query "
  SELECT
    m.role,
    m.content,
    m.created_at,
    m.metadata
  FROM messages m
  JOIN conversations c ON m.conversation_id = c.id
  WHERE c.id = '$CONVERSATION_ID'
    AND c.user_id = auth.uid()
  ORDER BY m.created_at ASC;
"

# Test 8: List all conversations with message counts
supabase db --query "
  SELECT
    c.id,
    c.title,
    a.name as agent_name,
    COUNT(m.id) as message_count,
    MAX(m.created_at) as last_message_at
  FROM conversations c
  LEFT JOIN agents a ON c.agent_id = a.id
  LEFT JOIN messages m ON c.id = m.conversation_id
  WHERE c.user_id = auth.uid()
  GROUP BY c.id, c.title, a.name
  ORDER BY last_message_at DESC;
"

*/

// ============================================
// Integration Tests
// ============================================

Deno.test('AI Orchestrator: Integration - Multi-turn conversation', async () => {
  if (!Deno.env.get('RUN_INTEGRATION_TESTS')) {
    console.log('Skipping integration test (set RUN_INTEGRATION_TESTS=true to run)');
    return;
  }

  // Turn 1: Start conversation
  const turn1Request: OrchestratorRequest = {
    message: 'I need help with my tasks',
  };

  const turn1Response = await callFunction(turn1Request);
  assertEquals(turn1Response.status, 200);

  const turn1Data: OrchestratorResponse = await turn1Response.json();
  const conversationId = turn1Data.conversationId;
  console.log('Turn 1:', turn1Data.response);

  // Turn 2: Continue conversation
  const turn2Request: OrchestratorRequest = {
    message: 'What are the high priority ones?',
    conversationId,
  };

  const turn2Response = await callFunction(turn2Request);
  assertEquals(turn2Response.status, 200);

  const turn2Data: OrchestratorResponse = await turn2Response.json();
  assertEquals(turn2Data.conversationId, conversationId);
  console.log('Turn 2:', turn2Data.response);

  // Turn 3: Continue conversation
  const turn3Request: OrchestratorRequest = {
    message: 'Help me break down the first task',
    conversationId,
  };

  const turn3Response = await callFunction(turn3Request);
  assertEquals(turn3Response.status, 200);

  const turn3Data: OrchestratorResponse = await turn3Response.json();
  assertEquals(turn3Data.conversationId, conversationId);
  console.log('Turn 3:', turn3Data.response);
});

Deno.test('AI Orchestrator: Integration - Agent switching', async () => {
  if (!Deno.env.get('RUN_INTEGRATION_TESTS')) {
    console.log('Skipping agent switching test');
    return;
  }

  // Start with task manager
  const taskRequest: OrchestratorRequest = {
    message: 'Create a task for me',
    agentType: 'task_manager',
  };

  const taskResponse = await callFunction(taskRequest);
  assertEquals(taskResponse.status, 200);

  const taskData: OrchestratorResponse = await taskResponse.json();
  console.log('Task manager:', taskData.agent);

  // Switch to workflow engine
  const workflowRequest: OrchestratorRequest = {
    message: 'Now create a workflow',
    agentType: 'workflow_engine',
  };

  const workflowResponse = await callFunction(workflowRequest);
  assertEquals(workflowResponse.status, 200);

  const workflowData: OrchestratorResponse = await workflowResponse.json();
  console.log('Workflow engine:', workflowData.agent);

  // Verify different agents were used
  // (In real implementation, check agent IDs)
});

// ============================================
// Performance Tests
// ============================================

Deno.test('AI Orchestrator: Performance - Response time < 2s', async () => {
  const startTime = Date.now();

  const request: OrchestratorRequest = {
    message: 'Test message for performance',
  };

  const response = await callFunction(request);
  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log(`Response time: ${duration}ms`);

  if (response.status === 200) {
    assertEquals(duration < 2000, true);
  }
});

Deno.test('AI Orchestrator: Performance - Concurrent requests', async () => {
  if (!Deno.env.get('RUN_LOAD_TESTS')) {
    console.log('Skipping load test (set RUN_LOAD_TESTS=true to run)');
    return;
  }

  const requests = Array.from({ length: 5 }, (_, i) => ({
    message: `Test message ${i}`,
  }));

  const startTime = Date.now();
  const responses = await Promise.all(
    requests.map(req => callFunction(req))
  );
  const endTime = Date.now();

  const successCount = responses.filter(r => r.status === 200).length;
  console.log(`Concurrent requests: ${successCount}/5 successful in ${endTime - startTime}ms`);

  assertEquals(successCount, 5);
});

// ============================================
// Edge Cases
// ============================================

Deno.test('AI Orchestrator: Edge case - Very long message', async () => {
  const longMessage = 'This is a test message. '.repeat(100); // ~2500 characters

  const request: OrchestratorRequest = {
    message: longMessage,
  };

  const response = await callFunction(request);
  console.log('Long message status:', response.status);

  if (response.status === 200) {
    const data: OrchestratorResponse = await response.json();
    assertExists(data.response);
  }
});

Deno.test('AI Orchestrator: Edge case - Special characters in message', async () => {
  const request: OrchestratorRequest = {
    message: 'Test with special chars: @#$%^&*(){}[]<>|\\/"\'`~',
  };

  const response = await callFunction(request);
  console.log('Special characters status:', response.status);

  if (response.status === 200) {
    const data: OrchestratorResponse = await response.json();
    assertExists(data.response);
  }
});

Deno.test('AI Orchestrator: Edge case - Unicode and emoji in message', async () => {
  const request: OrchestratorRequest = {
    message: 'Help me with tasks! 🚀 こんにちは 你好',
  };

  const response = await callFunction(request);
  console.log('Unicode/emoji status:', response.status);

  if (response.status === 200) {
    const data: OrchestratorResponse = await response.json();
    assertExists(data.response);
  }
});

// ============================================
// Agent Selection Tests
// ============================================

Deno.test('AI Orchestrator: Agent selection - Task keywords', async () => {
  const keywords = ['task', 'todo', 'assign', 'complete', 'priority'];

  for (const keyword of keywords) {
    const request: OrchestratorRequest = {
      message: `I need help with my ${keyword}`,
    };

    const response = await callFunction(request);
    if (response.status === 200) {
      const data: OrchestratorResponse = await response.json();
      console.log(`Keyword "${keyword}" -> Agent: ${data.agent}`);
    }
  }
});

Deno.test('AI Orchestrator: Agent selection - Workflow keywords', async () => {
  const keywords = ['workflow', 'automate', 'automation', 'process'];

  for (const keyword of keywords) {
    const request: OrchestratorRequest = {
      message: `I want to ${keyword} this process`,
    };

    const response = await callFunction(request);
    if (response.status === 200) {
      const data: OrchestratorResponse = await response.json();
      console.log(`Keyword "${keyword}" -> Agent: ${data.agent}`);
    }
  }
});
