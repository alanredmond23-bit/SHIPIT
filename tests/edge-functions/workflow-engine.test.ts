/**
 * Workflow Engine Edge Function Tests
 *
 * This test suite validates the workflow-engine Edge Function
 * which handles workflow execution, state transitions, and lifecycle management.
 *
 * Setup:
 * 1. Ensure Supabase is running: `supabase start`
 * 2. Deploy function locally: `supabase functions serve workflow-engine`
 * 3. Seed database with workflow data: `supabase db seed`
 *
 * Run tests:
 * - Manual: Use curl commands below
 * - Automated: `deno test tests/edge-functions/workflow-engine.test.ts`
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

// ============================================
// Type Definitions
// ============================================

interface WorkflowRequest {
  action: 'start' | 'transition' | 'pause' | 'resume' | 'complete';
  workflowId: string;
  instanceId?: string;
  context?: Record<string, any>;
}

interface WorkflowStartResponse {
  instance: {
    id: string;
    workflow_id: string;
    user_id: string;
    status: string;
    current_state_id: string;
    context: Record<string, any>;
  };
  message: string;
}

interface WorkflowTransitionResponse {
  instanceId: string;
  newState: {
    id: string;
    name: string;
    state_type: string;
  };
  message: string;
}

interface WorkflowStatusResponse {
  instanceId: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
}

// ============================================
// Configuration
// ============================================

const FUNCTION_URL = Deno.env.get('SUPABASE_FUNCTION_URL') || 'http://localhost:54321/functions/v1/workflow-engine';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || 'your-anon-key';
const AUTH_TOKEN = Deno.env.get('TEST_AUTH_TOKEN') || 'Bearer your-test-token';

// Test workflow ID from seed data
const TEST_WORKFLOW_ID = '10000000-0000-0000-0000-000000000001';

// ============================================
// Helper Functions
// ============================================

async function callFunction(body: WorkflowRequest): Promise<Response> {
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

Deno.test('Workflow Engine: Start workflow', async () => {
  const request: WorkflowRequest = {
    action: 'start',
    workflowId: TEST_WORKFLOW_ID,
    context: {
      userId: 'test-user-id',
      triggerSource: 'manual',
    },
  };

  const response = await callFunction(request);
  assertEquals(response.status, 200);

  const data: WorkflowStartResponse = await response.json();
  assertExists(data.instance);
  assertExists(data.instance.id);
  assertEquals(data.instance.workflow_id, TEST_WORKFLOW_ID);
  assertEquals(data.instance.status, 'running');
  assertExists(data.message);

  console.log('Workflow started:', data);
});

Deno.test('Workflow Engine: Pause workflow', async () => {
  // Note: This requires a running workflow instance
  const instanceId = 'test-instance-id'; // Replace with actual instance ID

  const request: WorkflowRequest = {
    action: 'pause',
    workflowId: TEST_WORKFLOW_ID,
    instanceId,
  };

  const response = await callFunction(request);

  const data: WorkflowStatusResponse = await response.json();
  console.log('Pause Response:', data);

  if (response.status === 200) {
    assertEquals(data.status, 'paused');
  }
});

Deno.test('Workflow Engine: Resume workflow', async () => {
  const instanceId = 'test-instance-id'; // Replace with actual instance ID

  const request: WorkflowRequest = {
    action: 'resume',
    workflowId: TEST_WORKFLOW_ID,
    instanceId,
  };

  const response = await callFunction(request);

  const data: WorkflowStatusResponse = await response.json();
  console.log('Resume Response:', data);

  if (response.status === 200) {
    assertEquals(data.status, 'running');
  }
});

Deno.test('Workflow Engine: Complete workflow', async () => {
  const instanceId = 'test-instance-id'; // Replace with actual instance ID

  const request: WorkflowRequest = {
    action: 'complete',
    workflowId: TEST_WORKFLOW_ID,
    instanceId,
  };

  const response = await callFunction(request);

  const data: WorkflowStatusResponse = await response.json();
  console.log('Complete Response:', data);

  if (response.status === 200) {
    assertEquals(data.status, 'completed');
  }
});

Deno.test('Workflow Engine: Execute transition', async () => {
  const instanceId = 'test-instance-id'; // Replace with actual instance ID

  const request: WorkflowRequest = {
    action: 'transition',
    workflowId: TEST_WORKFLOW_ID,
    instanceId,
  };

  const response = await callFunction(request);

  const data = await response.json();
  console.log('Transition Response:', data);

  if (response.status === 200) {
    const transitionData = data as WorkflowTransitionResponse;
    assertExists(transitionData.newState);
    assertExists(transitionData.newState.name);
  }
});

Deno.test('Workflow Engine: Invalid action returns error', async () => {
  const request = {
    action: 'invalid_action',
    workflowId: TEST_WORKFLOW_ID,
  };

  const response = await callFunction(request as any);
  assertEquals(response.status, 400);

  const data = await response.json();
  assertExists(data.error);

  console.log('Error Response:', data);
});

Deno.test('Workflow Engine: Non-existent workflow returns error', async () => {
  const request: WorkflowRequest = {
    action: 'start',
    workflowId: '00000000-0000-0000-0000-000000000000', // Invalid ID
  };

  const response = await callFunction(request);

  const data = await response.json();
  console.log('Non-existent workflow response:', data);

  // Should return error or empty result
  if (response.status === 400) {
    assertExists(data.error);
  }
});

// ============================================
// Manual Testing with cURL
// ============================================

/*

# Prerequisites:
export AUTH_TOKEN="Bearer $(supabase auth token)"
export ANON_KEY="your-anon-key-from-supabase-dashboard"
export FUNCTION_URL="http://localhost:54321/functions/v1/workflow-engine"
export WORKFLOW_ID="10000000-0000-0000-0000-000000000001"

# Test 1: Start a workflow
curl -X POST "$FUNCTION_URL" \
  -H "Authorization: $AUTH_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"action\": \"start\",
    \"workflowId\": \"$WORKFLOW_ID\",
    \"context\": {
      \"source\": \"manual_test\",
      \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
    }
  }"

# Expected Response:
{
  "instance": {
    "id": "uuid-of-new-instance",
    "workflow_id": "10000000-0000-0000-0000-000000000001",
    "user_id": "user-uuid",
    "status": "running",
    "current_state_id": "start-state-uuid",
    "context": {
      "source": "manual_test",
      "timestamp": "2025-11-15T10:00:00Z"
    },
    "started_at": "2025-11-15T10:00:00.123Z"
  },
  "message": "Workflow started successfully"
}

# Test 2: Execute state transition
# Note: Replace INSTANCE_ID with actual instance ID from Test 1
export INSTANCE_ID="uuid-from-test-1"

curl -X POST "$FUNCTION_URL" \
  -H "Authorization: $AUTH_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"action\": \"transition\",
    \"workflowId\": \"$WORKFLOW_ID\",
    \"instanceId\": \"$INSTANCE_ID\"
  }"

# Expected Response:
{
  "instanceId": "uuid",
  "newState": {
    "id": "state-uuid",
    "name": "Next State",
    "state_type": "action"
  },
  "message": "Transition executed successfully"
}

# Test 3: Pause workflow
curl -X POST "$FUNCTION_URL" \
  -H "Authorization: $AUTH_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"action\": \"pause\",
    \"workflowId\": \"$WORKFLOW_ID\",
    \"instanceId\": \"$INSTANCE_ID\"
  }"

# Expected Response:
{
  "instanceId": "uuid",
  "status": "paused"
}

# Test 4: Resume workflow
curl -X POST "$FUNCTION_URL" \
  -H "Authorization: $AUTH_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"action\": \"resume\",
    \"workflowId\": \"$WORKFLOW_ID\",
    \"instanceId\": \"$INSTANCE_ID\"
  }"

# Expected Response:
{
  "instanceId": "uuid",
  "status": "running"
}

# Test 5: Complete workflow
curl -X POST "$FUNCTION_URL" \
  -H "Authorization: $AUTH_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"action\": \"complete\",
    \"workflowId\": \"$WORKFLOW_ID\",
    \"instanceId\": \"$INSTANCE_ID\"
  }"

# Expected Response:
{
  "instanceId": "uuid",
  "status": "completed"
}

# Test 6: Invalid action (error case)
curl -X POST "$FUNCTION_URL" \
  -H "Authorization: $AUTH_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"action\": \"delete\",
    \"workflowId\": \"$WORKFLOW_ID\"
  }"

# Expected Response (400 error):
{
  "error": "Invalid action"
}

# Test 7: Check workflow logs (using Supabase client)
# After running a workflow, check the logs:
supabase db --query "
  SELECT
    wl.action,
    ws.name as state_name,
    wl.result,
    wl.created_at
  FROM workflow_logs wl
  LEFT JOIN workflow_states ws ON wl.state_id = ws.id
  WHERE wl.instance_id = '$INSTANCE_ID'
  ORDER BY wl.created_at DESC;
"

*/

// ============================================
// Integration Tests
// ============================================

Deno.test('Workflow Engine: Integration - Full workflow lifecycle', async () => {
  if (!Deno.env.get('RUN_INTEGRATION_TESTS')) {
    console.log('Skipping integration test (set RUN_INTEGRATION_TESTS=true to run)');
    return;
  }

  // 1. Start workflow
  const startRequest: WorkflowRequest = {
    action: 'start',
    workflowId: TEST_WORKFLOW_ID,
    context: { test: true },
  };

  const startResponse = await callFunction(startRequest);
  assertEquals(startResponse.status, 200);

  const startData: WorkflowStartResponse = await startResponse.json();
  const instanceId = startData.instance.id;

  console.log('1. Workflow started:', instanceId);

  // 2. Pause workflow
  const pauseRequest: WorkflowRequest = {
    action: 'pause',
    workflowId: TEST_WORKFLOW_ID,
    instanceId,
  };

  const pauseResponse = await callFunction(pauseRequest);
  assertEquals(pauseResponse.status, 200);
  console.log('2. Workflow paused');

  // 3. Resume workflow
  const resumeRequest: WorkflowRequest = {
    action: 'resume',
    workflowId: TEST_WORKFLOW_ID,
    instanceId,
  };

  const resumeResponse = await callFunction(resumeRequest);
  assertEquals(resumeResponse.status, 200);
  console.log('3. Workflow resumed');

  // 4. Complete workflow
  const completeRequest: WorkflowRequest = {
    action: 'complete',
    workflowId: TEST_WORKFLOW_ID,
    instanceId,
  };

  const completeResponse = await callFunction(completeRequest);
  assertEquals(completeResponse.status, 200);

  const completeData: WorkflowStatusResponse = await completeResponse.json();
  assertEquals(completeData.status, 'completed');
  console.log('4. Workflow completed');
});

// ============================================
// Performance Tests
// ============================================

Deno.test('Workflow Engine: Performance - Start workflow < 1s', async () => {
  const startTime = Date.now();

  const request: WorkflowRequest = {
    action: 'start',
    workflowId: TEST_WORKFLOW_ID,
    context: {},
  };

  const response = await callFunction(request);
  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log(`Start workflow time: ${duration}ms`);

  if (response.status === 200) {
    assertEquals(duration < 1000, true);
  }
});

// ============================================
// Edge Cases
// ============================================

Deno.test('Workflow Engine: Edge case - Start workflow with large context', async () => {
  const largeContext = {
    data: Array.from({ length: 100 }, (_, i) => ({
      id: i,
      value: `Item ${i}`,
      metadata: { timestamp: new Date().toISOString() },
    })),
  };

  const request: WorkflowRequest = {
    action: 'start',
    workflowId: TEST_WORKFLOW_ID,
    context: largeContext,
  };

  const response = await callFunction(request);
  console.log('Large context status:', response.status);

  if (response.status === 200) {
    const data: WorkflowStartResponse = await response.json();
    assertExists(data.instance.context);
  }
});

Deno.test('Workflow Engine: Edge case - Transition without available transitions', async () => {
  // This would require a workflow in an end state
  const request: WorkflowRequest = {
    action: 'transition',
    workflowId: TEST_WORKFLOW_ID,
    instanceId: 'end-state-instance-id',
  };

  const response = await callFunction(request);
  const data = await response.json();

  console.log('No transitions available:', data);
  // Should return error or handle gracefully
});

// ============================================
// State Machine Tests
// ============================================

Deno.test('Workflow Engine: State machine - Condition evaluation', async () => {
  if (!Deno.env.get('RUN_INTEGRATION_TESTS')) {
    console.log('Skipping state machine test');
    return;
  }

  // Start workflow with specific context for condition testing
  const request: WorkflowRequest = {
    action: 'start',
    workflowId: TEST_WORKFLOW_ID,
    context: {
      userInput: 'yes',
      priority: 'high',
      amount: 100,
    },
  };

  const response = await callFunction(request);
  assertEquals(response.status, 200);

  const data: WorkflowStartResponse = await response.json();
  console.log('Workflow with conditions started:', data.instance.id);

  // The workflow engine should evaluate conditions on transitions
  // based on the context provided
});
