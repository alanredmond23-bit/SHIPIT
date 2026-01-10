/**
 * Error Handling Utilities Tests
 * Tests for custom error classes and error handling functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AppError,
  NetworkError,
  APIError,
  AuthError,
  ValidationError,
  RateLimitError,
  TimeoutError,
  HTTP_ERROR_MESSAGES,
  getErrorMessage,
  getErrorSeverity,
  parseAPIError,
  createErrorFromException,
  consoleErrorLogger,
  createBatchedErrorLogger,
  generateErrorId,
  logError,
  getRecoverySuggestions,
} from '@/lib/errors';

// ============================================================================
// Custom Error Classes Tests
// ============================================================================

describe('AppError', () => {
  it('should create error with message and default code', () => {
    const error = new AppError('Test error');

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('APP_ERROR');
    expect(error.name).toBe('AppError');
    expect(error.timestamp).toBeInstanceOf(Date);
    expect(error.context).toBeUndefined();
  });

  it('should create error with custom code and context', () => {
    const error = new AppError('Test error', 'CUSTOM_CODE', { userId: '123' });

    expect(error.code).toBe('CUSTOM_CODE');
    expect(error.context).toEqual({ userId: '123' });
  });

  it('should be instanceof Error', () => {
    const error = new AppError('Test');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
  });

  it('should serialize to JSON correctly', () => {
    const error = new AppError('Test', 'CODE', { key: 'value' });
    const json = error.toJSON();

    expect(json).toHaveProperty('name', 'AppError');
    expect(json).toHaveProperty('message', 'Test');
    expect(json).toHaveProperty('code', 'CODE');
    expect(json).toHaveProperty('timestamp');
    expect(json).toHaveProperty('context', { key: 'value' });
    expect(json).toHaveProperty('stack');
  });
});

describe('NetworkError', () => {
  it('should create with default message and retryable true', () => {
    const error = new NetworkError();

    expect(error.message).toBe('Network connection failed');
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.name).toBe('NetworkError');
    expect(error.isRetryable).toBe(true);
  });

  it('should create with custom message and options', () => {
    const error = new NetworkError('Custom network error', {
      code: 'CUSTOM_NETWORK',
      isRetryable: false,
      context: { url: 'https://api.example.com' },
    });

    expect(error.message).toBe('Custom network error');
    expect(error.code).toBe('CUSTOM_NETWORK');
    expect(error.isRetryable).toBe(false);
    expect(error.context).toEqual({ url: 'https://api.example.com' });
  });

  it('should be instanceof AppError', () => {
    const error = new NetworkError();
    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(NetworkError);
  });
});

describe('APIError', () => {
  it('should create with status and derive code', () => {
    const error = new APIError('Not found', 404);

    expect(error.message).toBe('Not found');
    expect(error.status).toBe(404);
    expect(error.code).toBe('API_ERROR_404');
    expect(error.name).toBe('APIError');
    expect(error.isRetryable).toBe(false);
  });

  it('should mark 5xx errors as retryable', () => {
    const error500 = new APIError('Server error', 500);
    const error502 = new APIError('Bad gateway', 502);
    const error503 = new APIError('Unavailable', 503);

    expect(error500.isRetryable).toBe(true);
    expect(error502.isRetryable).toBe(true);
    expect(error503.isRetryable).toBe(true);
  });

  it('should mark 429 (rate limit) as retryable', () => {
    const error = new APIError('Rate limited', 429);
    expect(error.isRetryable).toBe(true);
  });

  it('should store statusText and body', () => {
    const error = new APIError('Error', 400, {
      statusText: 'Bad Request',
      body: { errors: ['Invalid input'] },
    });

    expect(error.statusText).toBe('Bad Request');
    expect(error.body).toEqual({ errors: ['Invalid input'] });
  });
});

describe('AuthError', () => {
  it('should create with default values', () => {
    const error = new AuthError();

    expect(error.message).toBe('Authentication required');
    expect(error.code).toBe('AUTH_ERROR');
    expect(error.name).toBe('AuthError');
    expect(error.requiresLogin).toBe(true);
    expect(error.isSessionExpired).toBe(false);
  });

  it('should handle session expiry', () => {
    const error = new AuthError('Session expired', {
      isSessionExpired: true,
    });

    expect(error.isSessionExpired).toBe(true);
  });
});

describe('ValidationError', () => {
  it('should create with default message', () => {
    const error = new ValidationError();

    expect(error.message).toBe('Validation failed');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.validationErrors).toEqual([]);
  });

  it('should store field-level errors', () => {
    const error = new ValidationError('Invalid form', {
      field: 'email',
      validationErrors: [
        { field: 'email', message: 'Invalid format' },
        { field: 'password', message: 'Too short', code: 'MIN_LENGTH' },
      ],
    });

    expect(error.field).toBe('email');
    expect(error.validationErrors).toHaveLength(2);
    expect(error.validationErrors[1].code).toBe('MIN_LENGTH');
  });
});

describe('RateLimitError', () => {
  it('should create with default message', () => {
    const error = new RateLimitError();

    expect(error.message).toBe('Rate limit exceeded');
    expect(error.code).toBe('RATE_LIMIT_ERROR');
    expect(error.retryAfter).toBeUndefined();
  });

  it('should store retryAfter seconds', () => {
    const error = new RateLimitError('Too many requests', {
      retryAfter: 60,
    });

    expect(error.retryAfter).toBe(60);
  });
});

describe('TimeoutError', () => {
  it('should create with default message', () => {
    const error = new TimeoutError();

    expect(error.message).toBe('Request timed out');
    expect(error.code).toBe('TIMEOUT_ERROR');
    expect(error.timeoutMs).toBe(0);
  });

  it('should store timeout duration', () => {
    const error = new TimeoutError('Timed out', {
      timeoutMs: 30000,
    });

    expect(error.timeoutMs).toBe(30000);
  });
});

// ============================================================================
// Error Message Mapping Tests
// ============================================================================

describe('HTTP_ERROR_MESSAGES', () => {
  it('should have messages for common status codes', () => {
    expect(HTTP_ERROR_MESSAGES[400]).toBeDefined();
    expect(HTTP_ERROR_MESSAGES[401]).toBeDefined();
    expect(HTTP_ERROR_MESSAGES[403]).toBeDefined();
    expect(HTTP_ERROR_MESSAGES[404]).toBeDefined();
    expect(HTTP_ERROR_MESSAGES[500]).toBeDefined();
  });
});

describe('getErrorMessage', () => {
  it('should return mapped message for known status', () => {
    expect(getErrorMessage(404)).toBe('The requested resource was not found.');
    expect(getErrorMessage(401)).toBe('Please sign in to continue.');
    expect(getErrorMessage(500)).toBe('Something went wrong on our end. Please try again later.');
  });

  it('should return default message for unknown status', () => {
    expect(getErrorMessage(999)).toBe('An unexpected error occurred. Please try again.');
  });
});

describe('getErrorSeverity', () => {
  it('should return critical for 5xx errors', () => {
    expect(getErrorSeverity(500)).toBe('critical');
    expect(getErrorSeverity(502)).toBe('critical');
    expect(getErrorSeverity(503)).toBe('critical');
  });

  it('should return warning for 429', () => {
    expect(getErrorSeverity(429)).toBe('warning');
  });

  it('should return error for 4xx (except 429)', () => {
    expect(getErrorSeverity(400)).toBe('error');
    expect(getErrorSeverity(401)).toBe('error');
    expect(getErrorSeverity(404)).toBe('error');
  });

  it('should return info for other codes', () => {
    expect(getErrorSeverity(200)).toBe('info');
    expect(getErrorSeverity(301)).toBe('info');
  });
});

// ============================================================================
// Error Parsing Tests
// ============================================================================

describe('parseAPIError', () => {
  it('should parse JSON error response', async () => {
    const response = new Response(
      JSON.stringify({ message: 'User not found' }),
      {
        status: 404,
        statusText: 'Not Found',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const error = await parseAPIError(response);

    expect(error).toBeInstanceOf(APIError);
    expect(error.message).toBe('User not found');
    expect(error.status).toBe(404);
  });

  it('should parse text error response', async () => {
    const response = new Response('Plain text error', {
      status: 500,
      statusText: 'Server Error',
      headers: { 'Content-Type': 'text/plain' },
    });

    const error = await parseAPIError(response);

    expect(error.message).toBe('Plain text error');
    expect(error.status).toBe(500);
  });

  it('should use default message if parsing fails', async () => {
    const response = new Response('', {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });

    const error = await parseAPIError(response);

    expect(error.message).toBe(HTTP_ERROR_MESSAGES[500]);
  });
});

describe('createErrorFromException', () => {
  it('should return AppError as-is', () => {
    const appError = new AppError('Test', 'TEST');
    const result = createErrorFromException(appError);

    expect(result).toBe(appError);
  });

  it('should convert TypeError with fetch message to NetworkError', () => {
    const typeError = new TypeError('Failed to fetch');
    const result = createErrorFromException(typeError);

    expect(result).toBeInstanceOf(NetworkError);
  });

  it('should convert TypeError with network message to NetworkError', () => {
    const typeError = new TypeError('network error');
    const result = createErrorFromException(typeError);

    expect(result).toBeInstanceOf(NetworkError);
  });

  it('should convert AbortError to TimeoutError', () => {
    const abortError = new DOMException('Aborted', 'AbortError');
    const result = createErrorFromException(abortError);

    expect(result).toBeInstanceOf(TimeoutError);
  });

  it('should convert regular Error to AppError', () => {
    const regularError = new Error('Regular error');
    const result = createErrorFromException(regularError);

    expect(result).toBeInstanceOf(AppError);
    expect(result.message).toBe('Regular error');
    expect(result.code).toBe('UNKNOWN_ERROR');
  });

  it('should convert string to AppError', () => {
    const result = createErrorFromException('String error');

    expect(result).toBeInstanceOf(AppError);
    expect(result.message).toBe('String error');
  });

  it('should handle unknown types', () => {
    const result = createErrorFromException(null);

    expect(result).toBeInstanceOf(AppError);
    expect(result.message).toBe('An unexpected error occurred');
  });
});

// ============================================================================
// Error Logging Tests
// ============================================================================

describe('consoleErrorLogger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log error with console.error for error severity', () => {
    const error = new AppError('Test error');

    consoleErrorLogger.log({
      id: 'test-id',
      error,
      severity: 'error',
    });

    expect(console.error).toHaveBeenCalled();
  });

  it('should log warning with console.warn', () => {
    const error = new AppError('Test warning');

    consoleErrorLogger.log({
      id: 'test-id',
      error,
      severity: 'warning',
    });

    expect(console.warn).toHaveBeenCalled();
  });

  it('should log info with console.log', () => {
    const error = new AppError('Test info');

    consoleErrorLogger.log({
      id: 'test-id',
      error,
      severity: 'info',
    });

    expect(console.log).toHaveBeenCalled();
  });

  it('should flush without error', async () => {
    await expect(consoleErrorLogger.flush()).resolves.toBeUndefined();
  });
});

describe('createBatchedErrorLogger', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should batch errors and send after reaching batch size', async () => {
    const logger = createBatchedErrorLogger('https://api.example.com/errors', {
      batchSize: 2,
    });

    const error = new AppError('Test');

    logger.log({ id: '1', error, severity: 'error' });
    expect(global.fetch).not.toHaveBeenCalled();

    logger.log({ id: '2', error, severity: 'error' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should send batch after flush interval', async () => {
    const logger = createBatchedErrorLogger('https://api.example.com/errors', {
      batchSize: 10,
      flushInterval: 1000,
    });

    const error = new AppError('Test');
    logger.log({ id: '1', error, severity: 'error' });

    expect(global.fetch).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    await vi.runAllTimersAsync();

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should flush immediately when flush() called', async () => {
    const logger = createBatchedErrorLogger('https://api.example.com/errors', {
      batchSize: 10,
    });

    const error = new AppError('Test');
    logger.log({ id: '1', error, severity: 'error' });

    expect(global.fetch).not.toHaveBeenCalled();

    await logger.flush();

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should call onError callback on fetch failure', async () => {
    const onError = vi.fn();
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const logger = createBatchedErrorLogger('https://api.example.com/errors', {
      batchSize: 1,
      onError,
    });

    const error = new AppError('Test');
    logger.log({ id: '1', error, severity: 'error' });

    await vi.runAllTimersAsync();

    expect(onError).toHaveBeenCalled();
  });
});

describe('generateErrorId', () => {
  it('should generate unique IDs', () => {
    const ids = new Set<string>();

    for (let i = 0; i < 100; i++) {
      ids.add(generateErrorId());
    }

    expect(ids.size).toBe(100);
  });

  it('should start with err_ prefix', () => {
    const id = generateErrorId();
    expect(id.startsWith('err_')).toBe(true);
  });
});

describe('logError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log error and return ID', () => {
    const error = new Error('Test');
    const id = logError(error);

    expect(id).toMatch(/^err_/);
    expect(console.error).toHaveBeenCalled();
  });

  it('should determine severity from APIError status', () => {
    const error = new APIError('Server error', 500);
    logError(error);

    // Should be logged as critical
    expect(console.error).toHaveBeenCalled();
  });

  it('should log NetworkError as warning', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const error = new NetworkError();
    logError(error);

    expect(console.warn).toHaveBeenCalled();
  });

  it('should include additional data', () => {
    const error = new Error('Test');
    logError(error, consoleErrorLogger, { userId: '123' });

    // Additional data should be passed to logger
    expect(console.error).toHaveBeenCalled();
  });
});

// ============================================================================
// Recovery Suggestions Tests
// ============================================================================

describe('getRecoverySuggestions', () => {
  it('should suggest checking connection for NetworkError', () => {
    const error = new NetworkError();
    const suggestions = getRecoverySuggestions(error);

    expect(suggestions).toContainEqual(
      expect.objectContaining({
        actionType: 'check',
        description: expect.stringContaining('internet connection'),
      })
    );
    expect(suggestions).toContainEqual(
      expect.objectContaining({ actionType: 'retry' })
    );
  });

  it('should suggest login for AuthError', () => {
    const error = new AuthError();
    const suggestions = getRecoverySuggestions(error);

    expect(suggestions).toContainEqual(
      expect.objectContaining({ actionType: 'login' })
    );
  });

  it('should suggest refresh for expired session', () => {
    const error = new AuthError('Session expired', { isSessionExpired: true });
    const suggestions = getRecoverySuggestions(error);

    expect(suggestions).toContainEqual(
      expect.objectContaining({ actionType: 'refresh' })
    );
  });

  it('should suggest wait for RateLimitError', () => {
    const error = new RateLimitError('Rate limited', { retryAfter: 30 });
    const suggestions = getRecoverySuggestions(error);

    expect(suggestions).toContainEqual(
      expect.objectContaining({
        actionType: 'wait',
        description: expect.stringContaining('30 seconds'),
      })
    );
  });

  it('should suggest retry for retryable APIError', () => {
    const error = new APIError('Server error', 500);
    const suggestions = getRecoverySuggestions(error);

    expect(suggestions).toContainEqual(
      expect.objectContaining({ actionType: 'retry' })
    );
    expect(suggestions).toContainEqual(
      expect.objectContaining({ actionType: 'contact' })
    );
  });

  it('should suggest check input for ValidationError', () => {
    const error = new ValidationError();
    const suggestions = getRecoverySuggestions(error);

    expect(suggestions).toContainEqual(
      expect.objectContaining({
        actionType: 'check',
        description: expect.stringContaining('highlighted fields'),
      })
    );
  });

  it('should suggest retry for TimeoutError', () => {
    const error = new TimeoutError();
    const suggestions = getRecoverySuggestions(error);

    expect(suggestions).toContainEqual(
      expect.objectContaining({ actionType: 'retry' })
    );
  });

  it('should provide default suggestions for unknown error', () => {
    const error = new AppError('Unknown error');
    const suggestions = getRecoverySuggestions(error);

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions).toContainEqual(
      expect.objectContaining({ actionType: 'refresh' })
    );
    expect(suggestions).toContainEqual(
      expect.objectContaining({ actionType: 'contact' })
    );
  });
});
