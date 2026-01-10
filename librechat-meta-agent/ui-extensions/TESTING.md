# Testing Guide

This document provides comprehensive guidance for testing the LibreChat Mission Control UI Extensions project.

## Table of Contents

- [Overview](#overview)
- [Test Stack](#test-stack)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [Mocking Strategies](#mocking-strategies)
- [Coverage](#coverage)
- [E2E Testing](#e2e-testing)
- [CI/CD Integration](#cicd-integration)

## Overview

The project uses a multi-layered testing approach:

1. **Unit Tests** - Testing individual functions and hooks in isolation
2. **Component Tests** - Testing React components with mocked dependencies
3. **Integration Tests** - Testing multiple components working together
4. **E2E Tests** - Testing complete user flows in a real browser

## Test Stack

| Tool | Purpose |
|------|---------|
| [Jest](https://jestjs.io/) | Test runner with Next.js integration |
| [Vitest](https://vitest.dev/) | Fast unit testing for hooks and utilities |
| [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) | Component testing |
| [Playwright](https://playwright.dev/) | End-to-end testing |
| [jest-junit](https://github.com/jest-community/jest-junit) | JUnit XML reporting for CI |

## Running Tests

### Unit & Component Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests with verbose output
npm run test:ui
```

### E2E Tests

```bash
# Run all E2E tests headlessly
npm run test:e2e

# Run E2E tests with interactive UI
npm run test:e2e:ui

# Run E2E tests in debug mode
npm run test:e2e:debug

# Run E2E tests with browser visible
npm run test:e2e:headed
```

### Running Specific Tests

```bash
# Run tests matching a pattern
npm test -- --testPathPattern="useConversations"

# Run a specific test file
npm test -- tests/hooks/useConversations.test.ts

# Run tests in a specific directory
npm test -- tests/components/

# Run E2E tests for a specific spec
npx playwright test e2e/chat.spec.ts
```

## Test Structure

```
tests/
├── setup.ts                    # Global test setup and mocks
├── components/                 # Component tests
│   ├── Auth/                   # Auth component tests
│   ├── Chat.test.tsx           # Chat component tests
│   ├── ErrorBoundary.test.tsx  # Error handling tests
│   ├── Navigation.test.tsx     # Navigation tests
│   ├── Settings.test.tsx       # Settings tests
│   ├── ThinkingPanel.test.tsx  # Thinking panel tests
│   └── WorkflowBuilder.test.tsx
├── hooks/                      # Hook tests
│   ├── useChat.test.ts         # Chat hook tests
│   └── useConversations.test.ts
├── lib/                        # Utility function tests
│   ├── artifacts.test.ts       # Artifact detection tests
│   └── errors.test.ts          # Error handling tests
└── __snapshots__/              # Snapshot files

e2e/                            # E2E tests
├── auth.spec.ts                # Authentication flows
├── chat.spec.ts                # Chat functionality
└── helpers/                    # E2E test utilities
```

## Writing Tests

### Unit Tests (Vitest)

For testing hooks and utility functions:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { myFunction } from '@/lib/myModule';

describe('myFunction', () => {
  it('should return expected result', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });
});
```

### Component Tests (Jest + React Testing Library)

For testing React components:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should handle click events', async () => {
    const onClick = jest.fn();
    render(<MyComponent onClick={onClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

### Testing Hooks with React Query

For hooks that use React Query:

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMyHook } from '@/hooks/useMyHook';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('useMyHook', () => {
  it('should fetch data', async () => {
    const { result } = renderHook(() => useMyHook(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
  });
});
```

### E2E Tests (Playwright)

For end-to-end testing:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Chat Feature', () => {
  test('should send a message', async ({ page }) => {
    await page.goto('/');

    await page.fill('[data-testid="message-input"]', 'Hello');
    await page.click('[data-testid="send-button"]');

    await expect(page.locator('.message')).toContainText('Hello');
  });
});
```

## Mocking Strategies

### Mocking Fetch Requests

Use the test utilities from `tests/setup.ts`:

```typescript
import { mockFetchResponse, mockFetchError } from '../setup';

describe('API calls', () => {
  it('should handle success', async () => {
    mockFetchResponse({ data: 'test' });
    // Your test code
  });

  it('should handle errors', async () => {
    mockFetchError('Network error');
    // Your test code
  });
});
```

### Mocking Streaming Responses

For SSE/streaming tests:

```typescript
import { mockStreamingResponse } from '../setup';

it('should process streaming data', async () => {
  mockStreamingResponse(['chunk1', 'chunk2', 'chunk3']);
  // Your streaming test code
});
```

### Mocking Browser APIs

Common mocks are pre-configured in `tests/setup.ts`:

- `window.matchMedia` - Media query matching
- `IntersectionObserver` - Intersection detection
- `ResizeObserver` - Resize detection
- `navigator.clipboard` - Clipboard operations
- `navigator.mediaDevices` - Media device access
- `SpeechRecognition` - Voice input
- `speechSynthesis` - Text-to-speech

### Mocking Next.js Router

```typescript
// Already mocked in setup.ts
// Access via jest.mock('next/navigation')

import { useRouter } from 'next/navigation';

const mockRouter = useRouter();
mockRouter.push('/new-route');
```

### Mocking Storage

```typescript
import { mockLocalStorage, mockSessionStorage } from '../setup';

describe('Storage tests', () => {
  it('should save to localStorage', () => {
    const storage = mockLocalStorage();

    // Your code that uses localStorage

    expect(storage.setItem).toHaveBeenCalledWith('key', 'value');
  });
});
```

## Coverage

### Coverage Thresholds

The project enforces minimum coverage thresholds:

```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 50,
    functions: 50,
    lines: 50,
    statements: 50,
  },
},
```

### Viewing Coverage Reports

After running `npm run test:coverage`:

```bash
# View HTML report
open coverage/lcov-report/index.html

# View summary in terminal
cat coverage/coverage-summary.json
```

### Coverage Output Locations

- `coverage/` - Coverage reports directory
- `coverage/lcov-report/` - HTML report
- `coverage/lcov.info` - LCOV format
- `coverage/junit.xml` - JUnit XML for CI

## E2E Testing

### Configuration

Playwright is configured in `playwright.config.ts`:

- Base URL: `http://localhost:3000`
- Browsers: Chromium, Firefox, WebKit
- Screenshots: On failure
- Video: On first retry

### Running Against Different Environments

```bash
# Local development
npm run test:e2e

# Against staging
PLAYWRIGHT_BASE_URL=https://staging.example.com npx playwright test

# Against production
PLAYWRIGHT_BASE_URL=https://example.com npx playwright test
```

### Debugging E2E Tests

```bash
# Use Playwright's debug mode
npm run test:e2e:debug

# Use Playwright Inspector
PWDEBUG=1 npx playwright test

# Generate trace for analysis
npx playwright test --trace on
npx playwright show-trace trace.zip
```

### Accessibility Testing

E2E tests include accessibility checks using `@axe-core/playwright`:

```typescript
import { injectAxe, checkA11y } from '@axe-core/playwright';

test('should be accessible', async ({ page }) => {
  await page.goto('/');
  await injectAxe(page);
  await checkA11y(page);
});
```

## CI/CD Integration

### GitHub Actions Integration

The project outputs JUnit XML reports for CI systems:

```yaml
# .github/workflows/test.yml
- name: Run Tests
  run: npm run test:coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info

- name: Upload Test Results
  uses: actions/upload-artifact@v3
  with:
    name: test-results
    path: coverage/junit.xml
```

### Environment Variables

For CI environments:

```bash
CI=true          # Enables CI mode (faster fail)
NODE_ENV=test    # Test environment
```

## Best Practices

### Do's

- Write tests that resemble how users interact with your app
- Use `data-testid` attributes for stable selectors
- Mock external dependencies, not internal modules
- Test behavior, not implementation details
- Use descriptive test names that explain what's being tested
- Group related tests with `describe` blocks

### Don'ts

- Don't test implementation details (private methods, internal state)
- Don't use snapshot tests for dynamic content
- Don't mock everything - some integration is valuable
- Don't write tests that pass regardless of behavior
- Don't ignore flaky tests - fix the root cause

### Test Naming Convention

```typescript
describe('ComponentName', () => {
  describe('featureName', () => {
    it('should [expected behavior] when [condition]', () => {
      // Test code
    });
  });
});
```

### Async Testing

Always use proper async patterns:

```typescript
// Good - using waitFor
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});

// Good - using findBy queries (auto-waits)
const element = await screen.findByText('Loaded');

// Avoid - using arbitrary timeouts
await new Promise(r => setTimeout(r, 1000)); // Don't do this
```

## Troubleshooting

### Common Issues

**Tests timing out:**
- Increase timeout: `jest.setTimeout(10000)`
- Check for unresolved promises
- Ensure mocks return resolved values

**Module not found errors:**
- Check `moduleNameMapper` in jest.config.js
- Ensure path aliases match tsconfig.json

**React act() warnings:**
- Wrap state updates in `act()`
- Use `waitFor()` for async operations

**Snapshot mismatches:**
- Update snapshots: `npm test -- -u`
- Review changes carefully before updating

### Debug Mode

```bash
# Run tests with node debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Run single test with logging
DEBUG=* npm test -- --testPathPattern="mytest"
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing React Query](https://tanstack.com/query/latest/docs/react/guides/testing)
