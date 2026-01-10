import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import React from 'react';

// ============================================================================
// Vitest to Jest Compatibility Layer
// ============================================================================
// This allows tests written with Vitest syntax to work with Jest
(global as any).vi = {
  fn: jest.fn,
  mock: jest.mock,
  spyOn: jest.spyOn,
  clearAllMocks: jest.clearAllMocks,
  resetAllMocks: jest.resetAllMocks,
  restoreAllMocks: jest.restoreAllMocks,
  importActual: jest.requireActual,
  importMock: jest.requireMock,
  hoisted: <T>(factory: () => T) => factory(),
  useFakeTimers: () => jest.useFakeTimers(),
  useRealTimers: () => jest.useRealTimers(),
  advanceTimersByTime: (ms: number) => jest.advanceTimersByTime(ms),
  runAllTimers: () => jest.runAllTimers(),
  setSystemTime: (date: Date | number) => jest.setSystemTime(date),
  mocked: <T>(item: T) => item as jest.Mocked<typeof item>,
  isMockFunction: jest.isMockFunction,
  stubGlobal: (name: string, value: any) => {
    (global as any)[name] = value;
  },
  unstubGlobals: () => {},
};

// Cleanup after each test
afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: jest.fn(),
  notFound: jest.fn(),
}));

// Mock Next.js link
jest.mock('next/link', () => {
  return ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: any }) => {
    return React.createElement('a', { href, ...props }, children);
  };
});

// Mock Next.js Image component
jest.mock('next/image', () => {
  return ({ src, alt, ...props }: { src: string; alt: string; [key: string]: any }) => {
    return React.createElement('img', { src, alt, ...props });
  };
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
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
  root: Element | null = null;
  rootMargin: string = '';
  thresholds: ReadonlyArray<number> = [];

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.root = options?.root as Element || null;
    this.rootMargin = options?.rootMargin || '';
    this.thresholds = options?.threshold
      ? (Array.isArray(options.threshold) ? options.threshold : [options.threshold])
      : [];
  }

  disconnect() {}
  observe() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(callback: ResizeObserverCallback) {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Mock MutationObserver
global.MutationObserver = class MutationObserver {
  constructor(callback: MutationCallback) {}
  disconnect() {}
  observe() {}
  takeRecords(): MutationRecord[] {
    return [];
  }
} as any;

// Mock fetch
global.fetch = jest.fn();

// Mock EventSource for SSE
global.EventSource = class EventSource {
  url: string;
  withCredentials: boolean = false;
  readyState: number = 0;
  onopen: ((this: EventSource, ev: Event) => any) | null = null;
  onmessage: ((this: EventSource, ev: MessageEvent) => any) | null = null;
  onerror: ((this: EventSource, ev: Event) => any) | null = null;

  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSED = 2;

  constructor(url: string | URL, eventSourceInitDict?: EventSourceInit) {
    this.url = url.toString();
    this.withCredentials = eventSourceInitDict?.withCredentials || false;
  }

  close() {
    this.readyState = 2;
  }

  addEventListener(type: string, listener: EventListener) {}
  removeEventListener(type: string, listener: EventListener) {}
  dispatchEvent(event: Event): boolean {
    return true;
  }
} as any;

// Mock Web Speech API
global.SpeechRecognition = class SpeechRecognition {
  continuous: boolean = false;
  interimResults: boolean = false;
  lang: string = 'en-US';
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onresult: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;

  start() {}
  stop() {}
  abort() {}
} as any;

global.webkitSpeechRecognition = global.SpeechRecognition;

// Mock SpeechSynthesis
global.speechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  getVoices: jest.fn(() => []),
  pending: false,
  speaking: false,
  paused: false,
  onvoiceschanged: null,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
} as any;

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue(''),
    write: jest.fn().mockResolvedValue(undefined),
    read: jest.fn().mockResolvedValue([]),
  },
  writable: true,
});

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [],
      getAudioTracks: () => [],
      getVideoTracks: () => [],
    }),
    enumerateDevices: jest.fn().mockResolvedValue([]),
    getDisplayMedia: jest.fn().mockResolvedValue({
      getTracks: () => [],
    }),
  },
  writable: true,
});

// Suppress console errors in tests (except for critical ones)
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    const message = args[0]?.toString() || '';
    // Filter out known React warnings and test-related messages
    if (
      message.includes('Warning: ReactDOM.render') ||
      message.includes('Warning: An update to') ||
      message.includes('act(...)') ||
      message.includes('Not implemented: HTMLFormElement.prototype.submit') ||
      message.includes('Warning: validateDOMNesting') ||
      message.includes('Warning: Each child in a list')
    ) {
      return;
    }
    originalError.call(console, ...args);
  });

  jest.spyOn(console, 'warn').mockImplementation((...args) => {
    const message = args[0]?.toString() || '';
    if (
      message.includes('React does not recognize') ||
      message.includes('Invalid DOM property')
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  });
});

afterAll(() => {
  jest.restoreAllMocks();
});

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Mock fetch response with JSON data
 */
export function mockFetchResponse(data: any, ok = true, status = 200) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers(),
    clone: function() { return this; },
  });
}

/**
 * Mock fetch error
 */
export function mockFetchError(error: string) {
  (global.fetch as jest.Mock).mockRejectedValueOnce(new Error(error));
}

/**
 * Mock streaming response for SSE
 */
export function mockStreamingResponse(chunks: string[]) {
  const encoder = new TextEncoder();
  let chunkIndex = 0;

  const stream = new ReadableStream({
    start(controller) {
      const pushChunk = () => {
        if (chunkIndex < chunks.length) {
          const data = `data: ${JSON.stringify({ content: chunks[chunkIndex] })}\n\n`;
          controller.enqueue(encoder.encode(data));
          chunkIndex++;
          setTimeout(pushChunk, 10);
        } else {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      };
      pushChunk();
    },
  });

  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    status: 200,
    body: stream,
    headers: new Headers({ 'Content-Type': 'text/event-stream' }),
  });
}

/**
 * Wait for async operations to complete
 */
export const waitForAsync = (ms: number = 0) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Flush all pending promises
 */
export const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

/**
 * Create a mock localStorage
 */
export function createMockStorage() {
  const storage: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => storage[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      storage[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete storage[key];
    }),
    clear: jest.fn(() => {
      Object.keys(storage).forEach((key) => delete storage[key]);
    }),
    key: jest.fn((index: number) => Object.keys(storage)[index] || null),
    get length() {
      return Object.keys(storage).length;
    },
  };
}

/**
 * Mock localStorage
 */
export function mockLocalStorage() {
  const mockStorage = createMockStorage();
  Object.defineProperty(window, 'localStorage', {
    value: mockStorage,
    writable: true,
  });
  return mockStorage;
}

/**
 * Mock sessionStorage
 */
export function mockSessionStorage() {
  const mockStorage = createMockStorage();
  Object.defineProperty(window, 'sessionStorage', {
    value: mockStorage,
    writable: true,
  });
  return mockStorage;
}

// Mock crypto.randomUUID if not available
if (typeof crypto === 'undefined' || !crypto.randomUUID) {
  (global as any).crypto = {
    ...global.crypto,
    randomUUID: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    },
    getRandomValues: (array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    },
  };
}

// Mock TextEncoder/TextDecoder if not available
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

// Mock window.scrollTo
window.scrollTo = jest.fn();

// Mock Element.scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Mock getBoundingClientRect
Element.prototype.getBoundingClientRect = jest.fn(() => ({
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  top: 0,
  left: 0,
  right: 100,
  bottom: 100,
  toJSON: () => {},
}));

// Mock window.URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock Blob
global.Blob = class Blob {
  private parts: any[];
  private options: BlobPropertyBag;

  constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
    this.parts = parts || [];
    this.options = options || {};
  }

  get size() {
    return this.parts.reduce((acc, part) => {
      if (typeof part === 'string') return acc + part.length;
      if (part instanceof ArrayBuffer) return acc + part.byteLength;
      return acc;
    }, 0);
  }

  get type() {
    return this.options.type || '';
  }

  text() {
    return Promise.resolve(this.parts.join(''));
  }

  arrayBuffer() {
    return Promise.resolve(new ArrayBuffer(0));
  }

  slice() {
    return new Blob();
  }

  stream() {
    return new ReadableStream();
  }
} as any;

// Mock File
global.File = class File extends Blob {
  readonly name: string;
  readonly lastModified: number;

  constructor(parts: BlobPart[], name: string, options?: FilePropertyBag) {
    super(parts, options);
    this.name = name;
    this.lastModified = options?.lastModified || Date.now();
  }
} as any;

// Mock FileReader
global.FileReader = class FileReader {
  result: string | ArrayBuffer | null = null;
  error: DOMException | null = null;
  readyState: number = 0;
  onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  onloadend: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  onloadstart: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  onprogress: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  onabort: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;

  static readonly EMPTY = 0;
  static readonly LOADING = 1;
  static readonly DONE = 2;

  readonly EMPTY = 0;
  readonly LOADING = 1;
  readonly DONE = 2;

  abort() {}
  readAsText(blob: Blob) {
    this.result = 'mock file content';
    this.readyState = 2;
    setTimeout(() => this.onload?.({} as any), 0);
  }
  readAsDataURL(blob: Blob) {
    this.result = 'data:text/plain;base64,mock';
    this.readyState = 2;
    setTimeout(() => this.onload?.({} as any), 0);
  }
  readAsArrayBuffer(blob: Blob) {
    this.result = new ArrayBuffer(0);
    this.readyState = 2;
    setTimeout(() => this.onload?.({} as any), 0);
  }
  readAsBinaryString(blob: Blob) {
    this.result = '';
    this.readyState = 2;
    setTimeout(() => this.onload?.({} as any), 0);
  }
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() { return true; }
} as any;

// Export test utilities type
export interface TestUtils {
  mockFetchResponse: typeof mockFetchResponse;
  mockFetchError: typeof mockFetchError;
  mockStreamingResponse: typeof mockStreamingResponse;
  waitForAsync: typeof waitForAsync;
  flushPromises: typeof flushPromises;
  mockLocalStorage: typeof mockLocalStorage;
  mockSessionStorage: typeof mockSessionStorage;
}
