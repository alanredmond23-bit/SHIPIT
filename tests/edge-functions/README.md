# Edge Functions Test Suite

This directory contains comprehensive test suites for all Joanna AI Assistant Edge Functions.

## Overview

The test suites provide:
- **Automated tests** using Deno's testing framework
- **Manual test commands** using cURL for quick verification
- **Integration tests** for end-to-end workflows
- **Performance tests** to ensure response times meet requirements
- **Edge case tests** to verify error handling

## Edge Functions Tested

1. **task-processor** - Task prioritization, breakdown suggestions, and dependency detection
2. **workflow-engine** - Workflow execution, state transitions, and lifecycle management
3. **ai-orchestrator** - AI agent selection, conversation management, and multi-agent coordination

## Prerequisites

### 1. Install Deno

```bash
# macOS/Linux
curl -fsSL https://deno.land/install.sh | sh

# Windows
irm https://deno.land/install.ps1 | iex
```

### 2. Start Supabase Locally

```bash
cd /home/user/SHIPIT
supabase start
```

### 3. Deploy Edge Functions

```bash
# Deploy all functions
supabase functions serve

# Or deploy individually
supabase functions serve task-processor
supabase functions serve workflow-engine
supabase functions serve ai-orchestrator
```

### 4. Set Environment Variables

Create a `.env.test` file in the project root:

```bash
# Supabase Configuration
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your-anon-key-from-supabase-start
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Get auth token for testing
TEST_AUTH_TOKEN=Bearer your-test-jwt-token

# Test Configuration
RUN_INTEGRATION_TESTS=true
RUN_LOAD_TESTS=false
```

### 5. Get Test Authentication Token

```bash
# Method 1: Using Supabase CLI
supabase auth token

# Method 2: Create test user via Supabase Dashboard
# Then use the JWT token from login response

# Method 3: Use service role key for testing (less secure, dev only)
export TEST_AUTH_TOKEN="Bearer $(cat .env.local | grep SUPABASE_SERVICE_ROLE_KEY | cut -d '=' -f2)"
```

## Running Tests

### Automated Tests

#### Run All Tests

```bash
# Load environment variables
export $(cat .env.test | xargs)

# Run all edge function tests
deno test --allow-net --allow-env tests/edge-functions/

# Run with verbose output
deno test --allow-net --allow-env --trace-leaks tests/edge-functions/
```

#### Run Specific Test File

```bash
# Task Processor tests
deno test --allow-net --allow-env tests/edge-functions/task-processor.test.ts

# Workflow Engine tests
deno test --allow-net --allow-env tests/edge-functions/workflow-engine.test.ts

# AI Orchestrator tests
deno test --allow-net --allow-env tests/edge-functions/ai-orchestrator.test.ts
```

#### Run Specific Test

```bash
# Run only tests matching a pattern
deno test --allow-net --allow-env --filter "Prioritize task" tests/edge-functions/task-processor.test.ts
```

#### Run Integration Tests

```bash
# Enable integration tests
export RUN_INTEGRATION_TESTS=true

deno test --allow-net --allow-env tests/edge-functions/
```

#### Run Load Tests

```bash
# Enable load tests (WARNING: Can be resource intensive)
export RUN_LOAD_TESTS=true

deno test --allow-net --allow-env tests/edge-functions/
```

### Manual Tests with cURL

Each test file contains cURL commands in comments. To run them:

1. Set up environment variables:

```bash
export AUTH_TOKEN="Bearer $(supabase auth token)"
export ANON_KEY="your-anon-key"
export FUNCTION_URL="http://localhost:54321/functions/v1"
```

2. Run the cURL commands from the test files:

#### Task Processor Example

```bash
# Prioritize a task
curl -X POST "$FUNCTION_URL/task-processor" \
  -H "Authorization: $AUTH_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "prioritize",
    "taskId": "20000000-0000-0000-0000-000000000001"
  }'
```

#### Workflow Engine Example

```bash
# Start a workflow
curl -X POST "$FUNCTION_URL/workflow-engine" \
  -H "Authorization: $AUTH_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "start",
    "workflowId": "10000000-0000-0000-0000-000000000001",
    "context": {"source": "manual_test"}
  }'
```

#### AI Orchestrator Example

```bash
# Send a message to AI agent
curl -X POST "$FUNCTION_URL/ai-orchestrator" \
  -H "Authorization: $AUTH_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Help me organize my tasks",
    "agentType": "task_manager"
  }'
```

## Test Structure

Each test file follows this structure:

### 1. Type Definitions
TypeScript interfaces for requests and responses

### 2. Configuration
Environment variables and constants

### 3. Helper Functions
Reusable functions for making API calls

### 4. Test Cases
Organized into categories:
- **Basic functionality tests** - Happy path scenarios
- **Error handling tests** - Invalid inputs and edge cases
- **Integration tests** - End-to-end workflows
- **Performance tests** - Response time validation
- **Edge case tests** - Boundary conditions
- **Load tests** - Concurrent request handling

### 5. Manual Test Commands
cURL commands in code comments for quick testing

## Test Data

Tests use seed data from `/home/user/SHIPIT/supabase/seed.sql`:

- **Test User**: Created via Supabase Auth
- **Test Agents**:
  - Task Manager: `00000000-0000-0000-0000-000000000001`
  - Workflow Orchestrator: `00000000-0000-0000-0000-000000000002`
  - Research Assistant: `00000000-0000-0000-0000-000000000003`
- **Test Workflows**:
  - Daily Task Review: `10000000-0000-0000-0000-000000000001`
  - Email-to-Task Converter: `10000000-0000-0000-0000-000000000002`
- **Test Tasks**:
  - Task 1: `20000000-0000-0000-0000-000000000001`
  - Task 2: `20000000-0000-0000-0000-000000000002`
  - Task 3: `20000000-0000-0000-0000-000000000003`

### Resetting Test Data

```bash
# Reset database and re-seed
supabase db reset

# Or just re-run seed
psql "postgresql://postgres:postgres@localhost:54322/postgres" -f supabase/seed.sql
```

## Writing New Tests

### 1. Follow the Existing Pattern

```typescript
Deno.test('Function Name: Test description', async () => {
  const request = {
    // Test request body
  };

  const response = await callFunction(request);
  assertEquals(response.status, 200);

  const data = await response.json();
  assertExists(data.someField);

  console.log('Test result:', data);
});
```

### 2. Use Assertions

```typescript
import {
  assertEquals,
  assertExists,
  assertNotEquals,
  assertStringIncludes,
} from 'https://deno.land/std@0.168.0/testing/asserts.ts';
```

### 3. Add Manual cURL Commands

Include equivalent cURL commands in comments for each test.

### 4. Test Error Cases

Always include tests for:
- Invalid inputs
- Missing required fields
- Unauthorized access
- Non-existent resources

## Continuous Integration

### GitHub Actions Example

```yaml
name: Edge Function Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Deno
        uses: denoland/setup-deno@v1
        with:
          deno-version: v1.x

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1

      - name: Start Supabase
        run: supabase start

      - name: Run Edge Function Tests
        run: |
          export RUN_INTEGRATION_TESTS=true
          deno test --allow-net --allow-env tests/edge-functions/
```

## Troubleshooting

### Tests Failing with "Unauthorized"

1. Check your auth token:
```bash
supabase auth token
```

2. Verify environment variables:
```bash
echo $TEST_AUTH_TOKEN
echo $ANON_KEY
```

3. Ensure user exists in database:
```sql
SELECT * FROM auth.users;
```

### Tests Failing with "Connection Refused"

1. Verify Supabase is running:
```bash
supabase status
```

2. Check function URL:
```bash
curl http://localhost:54321/functions/v1/task-processor
```

3. Check function logs:
```bash
supabase functions logs task-processor
```

### Tests Timing Out

1. Increase timeout in Deno:
```typescript
Deno.test({
  name: 'My test',
  fn: async () => { /* test code */ },
  sanitizeOps: false,
  sanitizeResources: false,
});
```

2. Check function performance:
```bash
time curl -X POST http://localhost:54321/functions/v1/task-processor ...
```

### Database Connection Issues

1. Check database is running:
```bash
psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "SELECT 1"
```

2. Verify RLS policies:
```sql
SELECT * FROM pg_policies WHERE tablename = 'tasks';
```

3. Check user permissions:
```sql
SET ROLE authenticated;
SELECT * FROM tasks;
```

## Performance Benchmarks

Target performance metrics for Edge Functions:

| Function | Avg Response Time | Max Response Time | Concurrent Requests |
|----------|-------------------|-------------------|---------------------|
| task-processor | < 500ms | < 2s | 10 req/s |
| workflow-engine | < 300ms | < 1s | 20 req/s |
| ai-orchestrator | < 1s | < 3s | 5 req/s |

## Best Practices

1. **Always clean up after tests** - Delete test data created during tests
2. **Use unique IDs** - Generate unique IDs for test resources to avoid conflicts
3. **Test edge cases** - Don't just test happy paths
4. **Mock external services** - Don't rely on external APIs in unit tests
5. **Document expected behavior** - Add comments explaining what each test validates
6. **Keep tests independent** - Tests should not depend on each other
7. **Use descriptive names** - Test names should clearly describe what they test

## Additional Resources

- [Deno Testing Documentation](https://deno.land/manual/testing)
- [Supabase Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Supabase Testing Best Practices](https://supabase.com/docs/guides/getting-started/testing)

## Contributing

When adding new Edge Functions:

1. Create a new test file: `{function-name}.test.ts`
2. Follow the existing test file structure
3. Include automated tests AND manual cURL commands
4. Add performance benchmarks
5. Update this README with the new function
6. Add integration tests if the function interacts with other functions

## Support

For issues or questions:
- Check the troubleshooting section above
- Review function logs: `supabase functions logs {function-name}`
- Check Supabase status: `supabase status`
- Review database logs: `supabase db logs`
