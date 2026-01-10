/**
 * Custom Error Classes and Error Handling Utilities
 * Provides structured error handling for API and network operations
 */

// ============================================================================
// Custom Error Classes
// ============================================================================

/**
 * Base error class for all custom errors
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly timestamp: Date;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string = 'APP_ERROR',
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.timestamp = new Date();
    this.context = context;
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack,
    };
  }
}

/**
 * Network-related errors (connection issues, timeouts, etc.)
 */
export class NetworkError extends AppError {
  public readonly isRetryable: boolean;

  constructor(
    message: string = 'Network connection failed',
    options?: {
      code?: string;
      isRetryable?: boolean;
      context?: Record<string, unknown>;
    }
  ) {
    super(message, options?.code ?? 'NETWORK_ERROR', options?.context);
    this.name = 'NetworkError';
    this.isRetryable = options?.isRetryable ?? true;
  }
}

/**
 * API response errors (4xx, 5xx status codes)
 */
export class APIError extends AppError {
  public readonly status: number;
  public readonly statusText: string;
  public readonly body?: unknown;
  public readonly isRetryable: boolean;

  constructor(
    message: string,
    status: number,
    options?: {
      statusText?: string;
      body?: unknown;
      context?: Record<string, unknown>;
    }
  ) {
    const code = `API_ERROR_${status}`;
    super(message, code, options?.context);
    this.name = 'APIError';
    this.status = status;
    this.statusText = options?.statusText ?? '';
    this.body = options?.body;
    // 5xx errors and 429 (rate limit) are typically retryable
    this.isRetryable = status >= 500 || status === 429;
  }
}

/**
 * Authentication and authorization errors
 */
export class AuthError extends AppError {
  public readonly requiresLogin: boolean;
  public readonly isSessionExpired: boolean;

  constructor(
    message: string = 'Authentication required',
    options?: {
      code?: string;
      requiresLogin?: boolean;
      isSessionExpired?: boolean;
      context?: Record<string, unknown>;
    }
  ) {
    super(message, options?.code ?? 'AUTH_ERROR', options?.context);
    this.name = 'AuthError';
    this.requiresLogin = options?.requiresLogin ?? true;
    this.isSessionExpired = options?.isSessionExpired ?? false;
  }
}

/**
 * Input validation errors
 */
export class ValidationError extends AppError {
  public readonly field?: string;
  public readonly validationErrors: ValidationFieldError[];

  constructor(
    message: string = 'Validation failed',
    options?: {
      field?: string;
      validationErrors?: ValidationFieldError[];
      context?: Record<string, unknown>;
    }
  ) {
    super(message, 'VALIDATION_ERROR', options?.context);
    this.name = 'ValidationError';
    this.field = options?.field;
    this.validationErrors = options?.validationErrors ?? [];
  }
}

export interface ValidationFieldError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(
    message: string = 'Rate limit exceeded',
    options?: {
      retryAfter?: number;
      context?: Record<string, unknown>;
    }
  ) {
    super(message, 'RATE_LIMIT_ERROR', options?.context);
    this.name = 'RateLimitError';
    this.retryAfter = options?.retryAfter;
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends AppError {
  public readonly timeoutMs: number;

  constructor(
    message: string = 'Request timed out',
    options?: {
      timeoutMs?: number;
      context?: Record<string, unknown>;
    }
  ) {
    super(message, 'TIMEOUT_ERROR', options?.context);
    this.name = 'TimeoutError';
    this.timeoutMs = options?.timeoutMs ?? 0;
  }
}

// ============================================================================
// Error Message Mapping
// ============================================================================

/**
 * User-friendly error messages for common HTTP status codes
 */
export const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: 'The request was invalid. Please check your input and try again.',
  401: 'Please sign in to continue.',
  403: 'You don\'t have permission to perform this action.',
  404: 'The requested resource was not found.',
  405: 'This action is not supported.',
  408: 'The request timed out. Please try again.',
  409: 'There was a conflict with the current state. Please refresh and try again.',
  410: 'This resource is no longer available.',
  413: 'The file or request is too large.',
  415: 'The file type is not supported.',
  422: 'The request could not be processed. Please check your input.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Something went wrong on our end. Please try again later.',
  502: 'Service temporarily unavailable. Please try again.',
  503: 'Service is temporarily down for maintenance. Please try again later.',
  504: 'The request took too long. Please try again.',
};

/**
 * Get a user-friendly error message for an HTTP status code
 */
export function getErrorMessage(status: number): string {
  return HTTP_ERROR_MESSAGES[status] ?? 'An unexpected error occurred. Please try again.';
}

/**
 * Severity levels for errors
 */
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Get the severity level of an error based on status code
 */
export function getErrorSeverity(status: number): ErrorSeverity {
  if (status >= 500) return 'critical';
  if (status === 429) return 'warning';
  if (status >= 400) return 'error';
  return 'info';
}

// ============================================================================
// Error Parsing and Creation
// ============================================================================

/**
 * Parse an error response from the API
 */
export async function parseAPIError(response: Response): Promise<APIError> {
  let body: unknown;
  let message: string;

  try {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      body = await response.json();
      message = typeof body === 'object' && body !== null && 'message' in body
        ? String((body as { message: string }).message)
        : getErrorMessage(response.status);
    } else {
      const text = await response.text();
      message = text || getErrorMessage(response.status);
    }
  } catch {
    message = getErrorMessage(response.status);
  }

  return new APIError(message, response.status, {
    statusText: response.statusText,
    body,
    context: {
      url: response.url,
      method: response.type,
    },
  });
}

/**
 * Create an appropriate error from a caught exception
 */
export function createErrorFromException(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof TypeError) {
    // Network errors often manifest as TypeErrors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return new NetworkError('Unable to connect to the server. Please check your internet connection.');
    }
  }

  if (error instanceof DOMException) {
    if (error.name === 'AbortError') {
      return new TimeoutError('The request was cancelled.');
    }
  }

  if (error instanceof Error) {
    return new AppError(error.message, 'UNKNOWN_ERROR', {
      originalName: error.name,
      originalStack: error.stack,
    });
  }

  return new AppError(
    typeof error === 'string' ? error : 'An unexpected error occurred',
    'UNKNOWN_ERROR'
  );
}

// ============================================================================
// Error Logging
// ============================================================================

export interface ErrorLogEntry {
  id: string;
  error: AppError;
  severity: ErrorSeverity;
  userAgent?: string;
  url?: string;
  userId?: string;
  sessionId?: string;
  additionalData?: Record<string, unknown>;
}

export interface ErrorLogger {
  log: (entry: ErrorLogEntry) => void;
  flush: () => Promise<void>;
}

/**
 * Console-based error logger for development
 */
export const consoleErrorLogger: ErrorLogger = {
  log: (entry) => {
    const { error, severity } = entry;
    const logMethod = severity === 'critical' || severity === 'error'
      ? console.error
      : severity === 'warning'
      ? console.warn
      : console.log;

    logMethod(`[${severity.toUpperCase()}] ${error.name}: ${error.message}`, {
      code: error.code,
      context: error.context,
      timestamp: error.timestamp,
    });

    if (error.stack) {
      console.debug(error.stack);
    }
  },
  flush: async () => {
    // No-op for console logger
  },
};

/**
 * Batched error logger that sends errors to a remote service
 */
export function createBatchedErrorLogger(
  endpoint: string,
  options?: {
    batchSize?: number;
    flushInterval?: number;
    onError?: (error: Error) => void;
  }
): ErrorLogger {
  const batchSize = options?.batchSize ?? 10;
  const flushInterval = options?.flushInterval ?? 30000;
  let batch: ErrorLogEntry[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  const sendBatch = async () => {
    if (batch.length === 0) return;

    const toSend = [...batch];
    batch = [];

    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errors: toSend }),
      });
    } catch (error) {
      options?.onError?.(error as Error);
      // Re-add failed entries to the batch
      batch = [...toSend, ...batch].slice(0, batchSize * 2);
    }
  };

  const scheduleFlush = () => {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      sendBatch();
    }, flushInterval);
  };

  return {
    log: (entry) => {
      batch.push(entry);
      if (batch.length >= batchSize) {
        sendBatch();
      } else {
        scheduleFlush();
      }
    },
    flush: async () => {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      await sendBatch();
    },
  };
}

/**
 * Generate a unique error ID
 */
export function generateErrorId(): string {
  return `err_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Log an error with context
 */
export function logError(
  error: unknown,
  logger: ErrorLogger = consoleErrorLogger,
  additionalData?: Record<string, unknown>
): string {
  const appError = createErrorFromException(error);
  const id = generateErrorId();
  
  const severity = appError instanceof APIError
    ? getErrorSeverity(appError.status)
    : appError instanceof NetworkError || appError instanceof TimeoutError
    ? 'warning'
    : 'error';

  logger.log({
    id,
    error: appError,
    severity,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    additionalData,
  });

  return id;
}

// ============================================================================
// Error Recovery Suggestions
// ============================================================================

export interface RecoverySuggestion {
  action: string;
  description: string;
  actionType: 'retry' | 'refresh' | 'login' | 'contact' | 'wait' | 'check';
}

/**
 * Get recovery suggestions based on error type
 */
export function getRecoverySuggestions(error: AppError): RecoverySuggestion[] {
  const suggestions: RecoverySuggestion[] = [];

  if (error instanceof NetworkError) {
    suggestions.push({
      action: 'Check Connection',
      description: 'Verify your internet connection is working',
      actionType: 'check',
    });
    suggestions.push({
      action: 'Try Again',
      description: 'Retry the request',
      actionType: 'retry',
    });
  }

  if (error instanceof AuthError) {
    suggestions.push({
      action: 'Sign In',
      description: 'Log in to your account',
      actionType: 'login',
    });
    if (error.isSessionExpired) {
      suggestions.push({
        action: 'Refresh Page',
        description: 'Refresh to get a new session',
        actionType: 'refresh',
      });
    }
  }

  if (error instanceof RateLimitError) {
    suggestions.push({
      action: 'Wait',
      description: error.retryAfter
        ? `Wait ${error.retryAfter} seconds before trying again`
        : 'Wait a moment before trying again',
      actionType: 'wait',
    });
  }

  if (error instanceof APIError) {
    if (error.isRetryable) {
      suggestions.push({
        action: 'Try Again',
        description: 'Retry the request',
        actionType: 'retry',
      });
    }
    if (error.status >= 500) {
      suggestions.push({
        action: 'Contact Support',
        description: 'If the problem persists, contact support',
        actionType: 'contact',
      });
    }
  }

  if (error instanceof ValidationError) {
    suggestions.push({
      action: 'Check Input',
      description: 'Review and correct the highlighted fields',
      actionType: 'check',
    });
  }

  if (error instanceof TimeoutError) {
    suggestions.push({
      action: 'Try Again',
      description: 'The request took too long, try again',
      actionType: 'retry',
    });
  }

  // Default fallback
  if (suggestions.length === 0) {
    suggestions.push({
      action: 'Refresh Page',
      description: 'Try refreshing the page',
      actionType: 'refresh',
    });
    suggestions.push({
      action: 'Contact Support',
      description: 'If the problem persists, contact support',
      actionType: 'contact',
    });
  }

  return suggestions;
}
