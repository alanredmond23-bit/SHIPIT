/**
 * Task Processor Edge Function Tests
 *
 * This test suite validates the task-processor Edge Function
 * which handles task prioritization, breakdown suggestions, and dependency detection.
 *
 * Setup:
 * 1. Ensure Supabase is running: `supabase start`
 * 2. Deploy function locally: `supabase functions serve task-processor`
 * 3. Set environment variables in .env.local
 *
 * Run tests:
 * - Manual: Use curl commands below
 * - Automated: `deno test tests/edge-functions/task-processor.test.ts`
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

// ============================================
// Type Definitions
// ============================================

interface TaskProcessRequest {
  action: 'prioritize' | 'suggest_breakdown' | 'detect_dependencies';
  taskId?: string;
  taskTitle?: string;
  taskDescription?: string;
}

interface PrioritizeResponse {
  taskId: string;
  currentPriority: number;
  suggestedPriority: number;
  reasoning: string;
}

interface SuggestBreakdownResponse {
  suggestions: Array<{
    title: string;
    priority: number;
  }>;
}

interface DetectDependenciesResponse {
  potentialDependencies: Array<{
    taskId: string;
    title: string;
    confidence: number;
  }>;
  confidence: number;
}

// ============================================
// Configuration
// ============================================

const FUNCTION_URL = Deno.env.get('SUPABASE_FUNCTION_URL') || 'http://localhost:54321/functions/v1/task-processor';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || 'your-anon-key';
const AUTH_TOKEN = Deno.env.get('TEST_AUTH_TOKEN') || 'Bearer your-test-token';

// ============================================
// Helper Functions
// ============================================

async function callFunction(body: TaskProcessRequest): Promise<Response> {
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

Deno.test('Task Processor: Prioritize task', async () => {
  const request: TaskProcessRequest = {
    action: 'prioritize',
    taskId: '20000000-0000-0000-0000-000000000001',
  };

  const response = await callFunction(request);
  assertEquals(response.status, 200);

  const data: PrioritizeResponse = await response.json();
  assertExists(data.taskId);
  assertExists(data.suggestedPriority);
  assertExists(data.reasoning);

  console.log('Prioritize Response:', data);
});

Deno.test('Task Processor: Suggest task breakdown', async () => {
  const request: TaskProcessRequest = {
    action: 'suggest_breakdown',
    taskTitle: 'Build user authentication system',
    taskDescription: 'Implement complete user auth with email, OAuth, and MFA',
  };

  const response = await callFunction(request);
  assertEquals(response.status, 200);

  const data: SuggestBreakdownResponse = await response.json();
  assertExists(data.suggestions);
  assertEquals(Array.isArray(data.suggestions), true);

  console.log('Breakdown Suggestions:', data.suggestions);
});

Deno.test('Task Processor: Detect dependencies', async () => {
  const request: TaskProcessRequest = {
    action: 'detect_dependencies',
    taskId: '20000000-0000-0000-0000-000000000001',
  };

  const response = await callFunction(request);
  assertEquals(response.status, 200);

  const data: DetectDependenciesResponse = await response.json();
  assertExists(data.potentialDependencies);
  assertExists(data.confidence);

  console.log('Dependencies Detected:', data);
});

Deno.test('Task Processor: Invalid action returns error', async () => {
  const request = {
    action: 'invalid_action',
  };

  const response = await callFunction(request as any);
  assertEquals(response.status, 400);

  const data = await response.json();
  assertExists(data.error);

  console.log('Error Response:', data);
});

Deno.test('Task Processor: Missing required fields returns error', async () => {
  const request: TaskProcessRequest = {
    action: 'prioritize',
    // Missing taskId
  };

  const response = await callFunction(request);

  // Should fail gracefully
  const data = await response.json();
  console.log('Missing Fields Response:', data);
});

// ============================================
// Manual Testing with cURL
// ============================================

/*

# Prerequisites:
# 1. Get your auth token:
export AUTH_TOKEN="Bearer $(supabase auth token)"
export ANON_KEY="your-anon-key-from-supabase-dashboard"
export FUNCTION_URL="http://localhost:54321/functions/v1/task-processor"

# Test 1: Prioritize a task
curl -X POST "$FUNCTION_URL" \
  -H "Authorization: $AUTH_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "prioritize",
    "taskId": "20000000-0000-0000-0000-000000000001"
  }'

# Expected Response:
{
  "taskId": "20000000-0000-0000-0000-000000000001",
  "currentPriority": 1,
  "suggestedPriority": 2,
  "reasoning": "Based on due date, dependencies, and current workload"
}

# Test 2: Suggest task breakdown
curl -X POST "$FUNCTION_URL" \
  -H "Authorization: $AUTH_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "suggest_breakdown",
    "taskTitle": "Build user authentication",
    "taskDescription": "Complete auth system with email and OAuth"
  }'

# Expected Response:
{
  "suggestions": [
    {
      "title": "Research phase for: Build user authentication",
      "priority": 2
    },
    {
      "title": "Implementation of Build user authentication",
      "priority": 2
    },
    {
      "title": "Testing and validation for Build user authentication",
      "priority": 3
    }
  ]
}

# Test 3: Detect task dependencies
curl -X POST "$FUNCTION_URL" \
  -H "Authorization: $AUTH_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "detect_dependencies",
    "taskId": "20000000-0000-0000-0000-000000000001"
  }'

# Expected Response:
{
  "potentialDependencies": [],
  "confidence": 0
}

# Test 4: Invalid action (should return error)
curl -X POST "$FUNCTION_URL" \
  -H "Authorization: $AUTH_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "invalid_action"
  }'

# Expected Response (400 error):
{
  "error": "Invalid action"
}

# Test 5: Missing authentication (should return 401)
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "prioritize",
    "taskId": "20000000-0000-0000-0000-000000000001"
  }'

# Expected Response (400 error):
{
  "error": "Unauthorized"
}

*/

// ============================================
// Performance Tests
// ============================================

Deno.test('Task Processor: Performance - Response time < 2s', async () => {
  const startTime = Date.now();

  const request: TaskProcessRequest = {
    action: 'suggest_breakdown',
    taskTitle: 'Test task',
    taskDescription: 'Test description',
  };

  const response = await callFunction(request);
  const endTime = Date.now();
  const duration = endTime - startTime;

  assertEquals(response.status, 200);
  console.log(`Response time: ${duration}ms`);

  // Response should be under 2 seconds
  assertEquals(duration < 2000, true);
});

// ============================================
// Integration Tests
// ============================================

Deno.test('Task Processor: Integration - Prioritize real task from database', async (t) => {
  // This test requires a real database connection and seeded data
  // Skip if not in integration test mode
  if (!Deno.env.get('RUN_INTEGRATION_TESTS')) {
    console.log('Skipping integration test (set RUN_INTEGRATION_TESTS=true to run)');
    return;
  }

  const request: TaskProcessRequest = {
    action: 'prioritize',
    taskId: '20000000-0000-0000-0000-000000000001', // From seed data
  };

  const response = await callFunction(request);
  assertEquals(response.status, 200);

  const data: PrioritizeResponse = await response.json();
  assertEquals(data.taskId, '20000000-0000-0000-0000-000000000001');
  assertExists(data.suggestedPriority);
});

// ============================================
// Edge Cases
// ============================================

Deno.test('Task Processor: Edge case - Empty task title', async () => {
  const request: TaskProcessRequest = {
    action: 'suggest_breakdown',
    taskTitle: '',
    taskDescription: 'Description without title',
  };

  const response = await callFunction(request);
  const data = await response.json();

  // Should handle gracefully
  console.log('Empty title response:', data);
});

Deno.test('Task Processor: Edge case - Very long task description', async () => {
  const longDescription = 'A'.repeat(10000); // 10k characters

  const request: TaskProcessRequest = {
    action: 'suggest_breakdown',
    taskTitle: 'Long description test',
    taskDescription: longDescription,
  };

  const response = await callFunction(request);

  // Should handle large inputs
  console.log('Long description status:', response.status);
});

// ============================================
// Load Tests (Optional)
// ============================================

Deno.test('Task Processor: Load test - 10 concurrent requests', async () => {
  if (!Deno.env.get('RUN_LOAD_TESTS')) {
    console.log('Skipping load test (set RUN_LOAD_TESTS=true to run)');
    return;
  }

  const requests = Array.from({ length: 10 }, (_, i) => ({
    action: 'suggest_breakdown' as const,
    taskTitle: `Test task ${i}`,
    taskDescription: `Description ${i}`,
  }));

  const startTime = Date.now();
  const responses = await Promise.all(
    requests.map(req => callFunction(req))
  );
  const endTime = Date.now();

  const successCount = responses.filter(r => r.status === 200).length;
  console.log(`Load test: ${successCount}/10 successful in ${endTime - startTime}ms`);

  assertEquals(successCount, 10);
});
