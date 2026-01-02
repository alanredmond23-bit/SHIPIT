import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Next.js link
vi.mock('next/link', () => ({
  default: ({ children, href }: any) => {
    return <a href={href}>{children}</a>;
  },
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
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
global.fetch = vi.fn();

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
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    // Filter out known React warnings
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
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
