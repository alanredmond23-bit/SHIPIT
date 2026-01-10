/**
 * Library exports - Core utilities and helpers
 */

// Error handling
export {
  // Error Classes
  AppError,
  NetworkError,
  APIError,
  AuthError,
  ValidationError,
  RateLimitError,
  TimeoutError,
  // Error Utilities
  HTTP_ERROR_MESSAGES,
  getErrorMessage,
  getErrorSeverity,
  parseAPIError,
  createErrorFromException,
  // Error Logging
  consoleErrorLogger,
  createBatchedErrorLogger,
  generateErrorId,
  logError,
  // Recovery Suggestions
  getRecoverySuggestions,
} from './errors';

export type {
  ValidationFieldError,
  ErrorSeverity,
  ErrorLogEntry,
  ErrorLogger,
  RecoverySuggestion,
} from './errors';

// Retry Logic
export {
  // Main Functions
  retry,
  retryWithResult,
  // Utilities
  calculateBackoffDelay,
  addJitter,
  sleep,
  // Retry Policies
  RetryPolicies,
  // Helpers
  isNetworkError,
  isTimeoutError,
  isRetryableStatus,
  createRetryableFetch,
  // Queue
  RetryQueue,
} from './retry';

export type {
  RetryOptions,
  RetryResult,
  RetryState,
} from './retry';
