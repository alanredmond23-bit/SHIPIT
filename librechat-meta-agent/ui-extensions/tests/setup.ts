import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Next.js link
jest.mock('next/link', () => ({
  default: ({ children, href }: any) => children,
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Mock fetch
global.fetch = jest.fn();

// Mock EventSource for SSE
global.EventSource = class EventSource {
  url: string;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onopen: ((event: any) => void) | null = null;
  readyState: number = 0;

  constructor(url: string) {
    this.url = url;
  }

  close() {}
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() {
    return true;
  }
} as any;

// Suppress console errors in tests
beforeAll(() => {
  const originalError = console.error;
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    // Filter out known React warnings
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Warning: An update to') ||
        args[0].includes('act(...)') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  });
});

// Helper function to mock fetch responses
export function mockFetchResponse(data: any, ok = true, status = 200) {
  (global.fetch as any).mockResolvedValueOnce({
    ok,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers(),
  });
}

// Helper function to mock fetch error
export function mockFetchError(error: string) {
  (global.fetch as any).mockRejectedValueOnce(new Error(error));
}

// Helper to wait for async updates
export const waitForAsync = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

// Mock crypto.randomUUID if not available
if (typeof crypto === 'undefined') {
  (global as any).crypto = {
    randomUUID: () => Math.random().toString(36).substring(2, 15),
  };
}

// Mock TextEncoder/TextDecoder
if (typeof TextEncoder === 'undefined') {
  const { TextEncoder: NodeTextEncoder, TextDecoder: NodeTextDecoder } = require('util');
  (global as any).TextEncoder = NodeTextEncoder;
  (global as any).TextDecoder = NodeTextDecoder;
}

// Mock ReadableStream if not available
if (typeof ReadableStream === 'undefined') {
  const { ReadableStream: NodeReadableStream } = require('stream/web');
  (global as any).ReadableStream = NodeReadableStream;
}
