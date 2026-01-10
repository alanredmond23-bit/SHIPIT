/**
 * Retry Logic with Exponential Backoff
 * Provides robust retry mechanisms for async operations
 */

// ============================================================================
// Types
// ============================================================================

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelay?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelay?: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Whether to add jitter to delays (default: true) */
  jitter?: boolean;
  /** Maximum jitter in milliseconds (default: 1000) */
  maxJitter?: number;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
  /** Custom function to determine if an error is retryable */
  isRetryable?: (error: unknown, attempt: number) => boolean;
  /** Callback called before each retry */
  onRetry?: (error: unknown, attempt: number, delay: number) => void;
  /** Timeout for each attempt in milliseconds */
  timeout?: number;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: unknown;
  attempts: number;
  totalTime: number;
}

export interface RetryState {
  attempt: number;
  startTime: number;
  lastError?: unknown;
  isAborted: boolean;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'signal' | 'timeout'>> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
  maxJitter: 1000,
  isRetryable: () => true,
  onRetry: () => {},
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate delay with exponential backoff
 */
export function calculateBackoffDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number
): number {
  const exponentialDelay = initialDelay * Math.pow(multiplier, attempt - 1);
  return Math.min(exponentialDelay, maxDelay);
}

/**
 * Add jitter to a delay value
 */
export function addJitter(delay: number, maxJitter: number): number {
  const jitter = Math.random() * maxJitter;
  // Randomly add or subtract jitter
  return delay + (Math.random() > 0.5 ? jitter : -jitter / 2);
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const timeout = setTimeout(resolve, ms);

    signal?.addEventListener('abort', () => {
      clearTimeout(timeout);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

/**
 * Create a timeout promise
 */
function createTimeoutPromise(ms: number, signal?: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    const timeout = setTimeout(() => {
      reject(new DOMException('Timeout', 'TimeoutError'));
    }, ms);

    signal?.addEventListener('abort', () => {
      clearTimeout(timeout);
    });
  });
}

// ============================================================================
// Main Retry Function
// ============================================================================

/**
 * Retry an async function with exponential backoff
 * 
 * @example
 * ```typescript
 * const result = await retry(
 *   () => fetch('/api/data'),
 *   {
 *     maxRetries: 3,
 *     initialDelay: 1000,
 *     onRetry: (error, attempt) => console.log(`Retry ${attempt}:`, error)
 *   }
 * );
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();
  let lastError: unknown;

  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    // Check if aborted
    if (config.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    try {
      // Execute with optional timeout
      if (config.timeout) {
        return await Promise.race([
          fn(),
          createTimeoutPromise(config.timeout, config.signal),
        ]);
      }
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we've exhausted retries
      if (attempt > config.maxRetries) {
        throw error;
      }

      // Check if error is retryable
      if (!config.isRetryable(error, attempt)) {
        throw error;
      }

      // Check if aborted
      if (config.signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      // Calculate delay
      let delay = calculateBackoffDelay(
        attempt,
        config.initialDelay,
        config.maxDelay,
        config.backoffMultiplier
      );

      if (config.jitter) {
        delay = addJitter(delay, config.maxJitter);
        delay = Math.max(0, delay); // Ensure non-negative
      }

      // Notify about retry
      config.onRetry(error, attempt, delay);

      // Wait before retrying
      await sleep(delay, config.signal);
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError;
}

/**
 * Retry with detailed result information
 */
export async function retryWithResult<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<RetryResult<T>> {
  const startTime = Date.now();
  let attempts = 0;

  const wrappedOnRetry = options?.onRetry;
  const onRetry = (error: unknown, attempt: number, delay: number) => {
    attempts = attempt;
    wrappedOnRetry?.(error, attempt, delay);
  };

  try {
    const data = await retry(fn, { ...options, onRetry });
    return {
      success: true,
      data,
      attempts: attempts + 1,
      totalTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error,
      attempts: attempts + 1,
      totalTime: Date.now() - startTime,
    };
  }
}

// ============================================================================
// Retry Policies
// ============================================================================

/**
 * Predefined retry policies for common scenarios
 */
export const RetryPolicies = {
  /** Quick retries for fast operations */
  fast: {
    maxRetries: 2,
    initialDelay: 200,
    maxDelay: 1000,
    backoffMultiplier: 2,
    jitter: true,
    maxJitter: 100,
  } satisfies RetryOptions,

  /** Standard retry policy */
  standard: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true,
    maxJitter: 500,
  } satisfies RetryOptions,

  /** Aggressive retries for critical operations */
  aggressive: {
    maxRetries: 5,
    initialDelay: 500,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true,
    maxJitter: 1000,
  } satisfies RetryOptions,

  /** Patient retries for rate-limited APIs */
  patient: {
    maxRetries: 5,
    initialDelay: 2000,
    maxDelay: 60000,
    backoffMultiplier: 3,
    jitter: true,
    maxJitter: 2000,
  } satisfies RetryOptions,

  /** No retries (single attempt) */
  none: {
    maxRetries: 0,
    initialDelay: 0,
    maxDelay: 0,
    backoffMultiplier: 1,
    jitter: false,
    maxJitter: 0,
  } satisfies RetryOptions,
} as const;

// ============================================================================
// Retry Helpers
// ============================================================================

/**
 * Check if an error is a network error that should be retried
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('failed to fetch') ||
      message.includes('networkerror')
    );
  }
  return false;
}

/**
 * Check if an error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === 'TimeoutError';
  }
  if (error instanceof Error) {
    return error.message.toLowerCase().includes('timeout');
  }
  return false;
}

/**
 * Check if an HTTP status code is retryable
 */
export function isRetryableStatus(status: number): boolean {
  // 5xx server errors and 429 (rate limit) are retryable
  return status >= 500 || status === 429 || status === 408;
}

/**
 * Create a retryable fetch wrapper
 */
export function createRetryableFetch(
  options?: RetryOptions
): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const mergedOptions: RetryOptions = {
      ...RetryPolicies.standard,
      ...options,
      signal: init?.signal ?? options?.signal,
      isRetryable: (error, attempt) => {
        // Use custom isRetryable if provided
        if (options?.isRetryable) {
          return options.isRetryable(error, attempt);
        }
        // Default: retry on network errors
        return isNetworkError(error) || isTimeoutError(error);
      },
    };

    const response = await retry(
      async () => {
        const response = await fetch(input, init);
        
        // Treat retryable status codes as errors
        if (!response.ok && isRetryableStatus(response.status)) {
          const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
          (error as unknown as Record<string, unknown>).status = response.status;
          (error as unknown as Record<string, unknown>).response = response;
          throw error;
        }
        
        return response;
      },
      mergedOptions
    );

    return response;
  };
}

// ============================================================================
// Retry Queue
// ============================================================================

interface QueuedTask<T> {
  id: string;
  fn: () => Promise<T>;
  options?: RetryOptions;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
  attempts: number;
  lastError?: unknown;
}

/**
 * A queue for managing retried operations with concurrency control
 */
export class RetryQueue {
  private queue: QueuedTask<unknown>[] = [];
  private running = 0;
  private readonly concurrency: number;
  private readonly defaultOptions: RetryOptions;

  constructor(options?: {
    concurrency?: number;
    defaultRetryOptions?: RetryOptions;
  }) {
    this.concurrency = options?.concurrency ?? 3;
    this.defaultOptions = options?.defaultRetryOptions ?? RetryPolicies.standard;
  }

  /**
   * Add a task to the queue
   */
  async add<T>(
    fn: () => Promise<T>,
    options?: RetryOptions
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const task: QueuedTask<T> = {
        id: Math.random().toString(36).substring(7),
        fn,
        options: { ...this.defaultOptions, ...options },
        resolve: resolve as (value: unknown) => void,
        reject,
        attempts: 0,
      };

      this.queue.push(task as QueuedTask<unknown>);
      this.processQueue();
    });
  }

  /**
   * Process the queue
   */
  private async processQueue(): Promise<void> {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) continue;

      this.running++;
      this.executeTask(task).finally(() => {
        this.running--;
        this.processQueue();
      });
    }
  }

  /**
   * Execute a single task with retries
   */
  private async executeTask<T>(task: QueuedTask<T>): Promise<void> {
    try {
      const result = await retry(task.fn, task.options);
      task.resolve(result);
    } catch (error) {
      task.reject(error);
    }
  }

  /**
   * Get the current queue size
   */
  get size(): number {
    return this.queue.length;
  }

  /**
   * Get the number of running tasks
   */
  get activeCount(): number {
    return this.running;
  }

  /**
   * Clear the queue (does not cancel running tasks)
   */
  clear(): void {
    const tasks = this.queue.splice(0);
    tasks.forEach(task => {
      task.reject(new Error('Queue cleared'));
    });
  }
}
