import { vi } from 'vitest';

// Mock PostgreSQL Pool
export const mockPool = {
  query: vi.fn(),
  connect: vi.fn(),
  end: vi.fn(),
};

// Mock Logger
export const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  fatal: vi.fn(),
  trace: vi.fn(),
  child: vi.fn(() => mockLogger),
};

// Mock EventEmitter
export const mockEventEmitter = {
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  once: vi.fn(),
};

// Mock Anthropic SDK
export const mockAnthropic = {
  messages: {
    create: vi.fn(),
  },
};

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => mockAnthropic),
}));

// Mock pg Pool
vi.mock('pg', () => ({
  Pool: vi.fn(() => mockPool),
}));

// Mock pino logger
vi.mock('pino', () => ({
  default: vi.fn(() => mockLogger),
}));

// Helper to create mock database row
export function createMockRow<T>(overrides: Partial<T> = {}): T {
  return {
    id: 'test-id',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as T;
}

// Helper to create mock query result
export function createMockQueryResult<T>(rows: T[], rowCount?: number) {
  return {
    rows,
    rowCount: rowCount ?? rows.length,
    command: 'SELECT',
    oid: 0,
    fields: [],
  };
}

// Reset all mocks before each test
export function resetAllMocks() {
  vi.clearAllMocks();
  mockPool.query.mockReset();
  mockLogger.info.mockReset();
  mockLogger.error.mockReset();
  mockLogger.warn.mockReset();
  mockEventEmitter.emit.mockReset();
  mockAnthropic.messages.create.mockReset();
}

// Setup global test environment
beforeEach(() => {
  resetAllMocks();
});

// Cleanup after all tests
afterAll(() => {
  vi.restoreAllMocks();
});
