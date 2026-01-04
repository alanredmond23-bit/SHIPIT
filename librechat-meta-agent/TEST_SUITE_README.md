# Meta Agent Test Suite Documentation

This document provides comprehensive information about the test suite for the Meta Agent project.

## Overview

The Meta Agent project includes a complete test suite covering:
- **Backend Services** (Orchestrator): Unit and integration tests using Vitest
- **Frontend Components** (UI Extensions): Component tests using Jest and React Testing Library
- **API Endpoints**: Integration tests for REST APIs
- **Mock Implementations**: Complete mocking for external dependencies

## Test Structure

```
librechat-meta-agent/
├── orchestrator/
│   ├── tests/
│   │   ├── setup.ts                          # Test setup and global mocks
│   │   ├── services/
│   │   │   ├── task-graph.test.ts           # Task graph service tests
│   │   │   ├── workflow-engine.test.ts      # Workflow engine tests
│   │   │   └── memory-service.test.ts       # Memory/embedding tests
│   │   └── api/
│   │       └── tasks.test.ts                # Task API endpoint tests
│   └── jest.config.js                       # Jest configuration
│
├── ui-extensions/
│   ├── tests/
│   │   ├── setup.ts                         # Frontend test setup
│   │   └── components/
│   │       ├── ThinkingPanel.test.tsx       # Thinking panel tests
│   │       ├── WorkflowBuilder.test.tsx     # Workflow builder tests
│   │       └── Navigation.test.tsx          # Navigation tests
│   └── jest.config.js                       # Frontend Jest config
│
└── scripts/
    └── test.sh                              # Universal test runner script
```

## Running Tests

### Quick Start

Run all tests:
```bash
./scripts/test.sh
```

### Test Commands

**Run all tests once:**
```bash
./scripts/test.sh
```

**Run with coverage reports:**
```bash
./scripts/test.sh --coverage
# or
./scripts/test.sh -c
```

**Run in watch mode (auto-rerun on changes):**
```bash
./scripts/test.sh --watch
# or
./scripts/test.sh -w
```

**Run with UI interface:**
```bash
./scripts/test.sh --ui
# or
./scripts/test.sh -u
```

**Run only orchestrator tests:**
```bash
./scripts/test.sh --orchestrator
# or
./scripts/test.sh -o
```

**Run only UI tests:**
```bash
./scripts/test.sh --ui-only
```

**Combine options:**
```bash
./scripts/test.sh --orchestrator --coverage
./scripts/test.sh -o -w
```

### Individual Test Suites

**Orchestrator tests:**
```bash
cd orchestrator
npm test                  # Run once
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage
npm run test:ui          # UI interface
```

**UI Extension tests:**
```bash
cd ui-extensions
npm test                  # Run once
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage
npm run test:ui          # Verbose watch mode
```

## Test Coverage

### Orchestrator Tests

#### 1. Task Graph Service Tests
**File:** `orchestrator/tests/services/task-graph.test.ts`

**Coverage:**
- ✓ Project creation and retrieval
- ✓ Workstream management
- ✓ Task creation with dependencies
- ✓ Task updates with status transitions
- ✓ Dashboard statistics
- ✓ Error handling
- ✓ Edge cases (empty data, special characters)

**Test Count:** 21 tests

#### 2. Workflow Engine Tests
**File:** `orchestrator/tests/services/workflow-engine.test.ts`

**Coverage:**
- ✓ Workflow creation and configuration
- ✓ State management (add, update, delete)
- ✓ Transition management with conditions
- ✓ Workflow execution and state machines
- ✓ Condition evaluation (comparison, expression, composite)
- ✓ Action execution (AI tasks, HTTP, delays, transforms)
- ✓ Workflow lifecycle (pause, resume, cancel)
- ✓ Template management

**Test Count:** 27 tests

#### 3. Memory Service Tests
**File:** `orchestrator/tests/services/memory-service.test.ts`

**Coverage:**
- ✓ Memory creation with embeddings
- ✓ Semantic search with similarity scoring
- ✓ Memory listing and filtering
- ✓ Memory updates and deletions
- ✓ Auto-extraction from conversations
- ✓ Relevant memory retrieval
- ✓ Statistics and analytics
- ✓ Error handling

**Test Count:** 24 tests

#### 4. API Endpoint Tests
**File:** `orchestrator/tests/api/tasks.test.ts`

**Coverage:**
- ✓ Project CRUD operations
- ✓ Workstream management
- ✓ Task creation and listing
- ✓ Query parameter filtering
- ✓ Error handling and validation
- ✓ Integration tests
- ✓ Concurrent request handling

**Test Count:** 18 tests

### UI Extension Tests

#### 1. ThinkingPanel Component Tests
**File:** `ui-extensions/tests/components/ThinkingPanel.test.tsx`

**Coverage:**
- ✓ Initial render and form display
- ✓ Session start and configuration
- ✓ Thought tree display and interactions
- ✓ Real-time statistics updates
- ✓ Error handling
- ✓ Template selection
- ✓ Expand, critique, and alternatives actions

**Test Count:** 15 tests

#### 2. WorkflowBuilder Component Tests
**File:** `ui-extensions/tests/components/WorkflowBuilder.test.tsx`

**Coverage:**
- ✓ Workflow name editing
- ✓ State management and configuration
- ✓ Transition creation
- ✓ Action type configuration (AI, HTTP, delay)
- ✓ Save and run operations
- ✓ Configuration panel toggle
- ✓ Edge cases (empty workflows, large workflows)

**Test Count:** 18 tests

#### 3. Navigation Component Tests
**File:** `ui-extensions/tests/components/Navigation.test.tsx`

**Coverage:**
- ✓ Desktop and mobile navigation
- ✓ Active route highlighting
- ✓ Mobile menu toggle
- ✓ Navigation links and routing
- ✓ Usage statistics display
- ✓ Icon rendering
- ✓ Accessibility features
- ✓ Responsive design

**Test Count:** 20 tests

## Mock Implementations

### Orchestrator Mocks

**Database (PostgreSQL Pool):**
```typescript
mockPool.query()          // Mocked for all database operations
```

**Logger (Pino):**
```typescript
mockLogger.info()
mockLogger.error()
mockLogger.warn()
```

**Event Emitter:**
```typescript
mockEventEmitter.emit()
mockEventEmitter.on()
```

**Anthropic SDK:**
```typescript
mockAnthropic.messages.create()
```

### UI Mocks

**Next.js Router:**
```typescript
useRouter()
usePathname()
useSearchParams()
```

**Fetch API:**
```typescript
global.fetch              // Mocked with helper functions
mockFetchResponse()       // Helper to mock successful responses
mockFetchError()          // Helper to mock errors
```

**EventSource (SSE):**
```typescript
global.EventSource        // Mocked for real-time updates
```

## Writing New Tests

### Backend Service Test Template

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { YourService } from '../../src/services/your-service';
import { mockPool, mockLogger, createMockQueryResult } from '../setup';

describe('YourService', () => {
  let service: YourService;

  beforeEach(() => {
    service = new YourService(mockPool as any, mockLogger as any);
  });

  it('should do something', async () => {
    mockPool.query.mockResolvedValueOnce(
      createMockQueryResult([{ id: '123', data: 'test' }])
    );

    const result = await service.doSomething();

    expect(result).toBeDefined();
    expect(mockPool.query).toHaveBeenCalled();
  });
});
```

### Frontend Component Test Template

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import YourComponent from '../../components/YourComponent';
import { mockFetchResponse } from '../setup';

describe('YourComponent', () => {
  it('should render correctly', () => {
    render(<YourComponent />);

    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should handle user interactions', async () => {
    mockFetchResponse({ data: 'test' });

    render(<YourComponent />);

    const button = screen.getByRole('button', { name: /click me/i });
    fireEvent.click(button);

    // Assert expected behavior
  });
});
```

## Continuous Integration

The test suite is designed to work with CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: ./scripts/test.sh --coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./orchestrator/coverage/lcov.info,./ui-extensions/coverage/lcov.info
```

## Best Practices

### General
1. **Test Isolation**: Each test should be independent
2. **Clear Naming**: Use descriptive test names
3. **AAA Pattern**: Arrange, Act, Assert
4. **Mock External Dependencies**: Don't hit real APIs or databases
5. **Test Edge Cases**: Empty data, errors, invalid inputs

### Backend Tests
1. Reset mocks before each test
2. Use `createMockQueryResult()` helper for database results
3. Test both success and error paths
4. Verify event emissions
5. Check database query parameters

### Frontend Tests
1. Use semantic queries (`getByRole`, `getByLabelText`)
2. Test user interactions, not implementation details
3. Use `waitFor()` for async operations
4. Mock API calls consistently
5. Test accessibility features

## Troubleshooting

### Common Issues

**Tests not running:**
```bash
# Install dependencies
cd orchestrator && npm install
cd ../ui-extensions && npm install
```

**Coverage reports not generating:**
```bash
# Install coverage packages
npm install --save-dev @vitest/coverage-v8
```

**Mock not working:**
- Check that mocks are reset in `beforeEach()`
- Verify mock is defined before the test runs
- Use `vi.clearAllMocks()` in setup

**Async tests timing out:**
- Increase test timeout in configuration
- Use `await waitFor()` for async operations
- Check that promises are properly resolved

## Test Statistics

**Total Tests:** 143+
- Orchestrator: 90+ tests
- UI Extensions: 53+ tests

**Code Coverage Target:** 80%+

**Test Execution Time:**
- Orchestrator: ~5-10 seconds
- UI Extensions: ~3-5 seconds
- Total: ~8-15 seconds

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Contributing

When adding new features:
1. Write tests before or alongside the implementation
2. Ensure tests pass locally before committing
3. Maintain or improve code coverage
4. Follow existing test patterns
5. Update this documentation if adding new test categories

---

**Last Updated:** January 2026
**Maintainer:** Meta Agent Team
