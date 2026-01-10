'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AppError, createErrorFromException, getRecoverySuggestions, logError, consoleErrorLogger, ErrorSeverity, RecoverySuggestion } from '@/lib/errors';

// ============================================================================
// Types
// ============================================================================

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback UI */
  fallback?: ReactNode | ((props: ErrorFallbackProps) => ReactNode);
  /** Callback when an error is caught */
  onError?: (error: AppError, errorInfo: ErrorInfo) => void;
  /** Whether to show detailed error info (for development) */
  showDetails?: boolean;
  /** Custom error severity (affects styling) */
  severity?: ErrorSeverity;
  /** Custom class name for the error container */
  className?: string;
  /** Whether to log errors to console */
  logErrors?: boolean;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: AppError | null;
  errorInfo: ErrorInfo | null;
}

export interface ErrorFallbackProps {
  error: AppError;
  errorInfo: ErrorInfo | null;
  resetError: () => void;
  severity: ErrorSeverity;
  suggestions: RecoverySuggestion[];
}

// ============================================================================
// Severity Styles
// ============================================================================

const severityStyles: Record<ErrorSeverity, {
  container: string;
  icon: string;
  title: string;
  iconPath: string;
}> = {
  info: {
    container: 'bg-blue-50 border-blue-200',
    icon: 'text-blue-500',
    title: 'text-blue-800',
    iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  warning: {
    container: 'bg-amber-50 border-amber-200',
    icon: 'text-amber-500',
    title: 'text-amber-800',
    iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  },
  error: {
    container: 'bg-red-50 border-red-200',
    icon: 'text-red-500',
    title: 'text-red-800',
    iconPath: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  critical: {
    container: 'bg-red-100 border-red-300',
    icon: 'text-red-600',
    title: 'text-red-900',
    iconPath: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
};

// ============================================================================
// Default Error Fallback Component
// ============================================================================

function DefaultErrorFallback({
  error,
  errorInfo,
  resetError,
  severity,
  suggestions,
}: ErrorFallbackProps) {
  const styles = severityStyles[severity];
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div
      className={`rounded-lg border p-6 ${styles.container}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`flex-shrink-0 ${styles.icon}`}>
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d={styles.iconPath}
            />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className={`text-lg font-semibold ${styles.title}`}>
            {severity === 'critical' ? 'Critical Error' : 'Something went wrong'}
          </h3>
          
          <p className="mt-1 text-gray-700">
            {error.message}
          </p>

          {/* Recovery Suggestions */}
          {suggestions.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-600 mb-2">
                What you can try:
              </p>
              <ul className="space-y-1">
                {suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                    {suggestion.description}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={resetError}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Try Again
            </button>

            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors"
            >
              Refresh Page
            </button>

            {errorInfo && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
                <svg
                  className={`w-4 h-4 ml-1 transition-transform ${showDetails ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Error Details */}
          {showDetails && errorInfo && (
            <div className="mt-4 p-4 bg-gray-900 rounded-lg overflow-auto max-h-64">
              <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                <span className="text-red-400">{error.name}: {error.message}</span>
                {'\n\n'}
                <span className="text-gray-500">Error Code: {error.code}</span>
                {'\n'}
                <span className="text-gray-500">Timestamp: {error.timestamp.toISOString()}</span>
                {error.context && (
                  <>
                    {'\n\n'}
                    <span className="text-blue-400">Context:</span>
                    {'\n'}
                    {JSON.stringify(error.context, null, 2)}
                  </>
                )}
                {'\n\n'}
                <span className="text-yellow-400">Component Stack:</span>
                {'\n'}
                {errorInfo.componentStack}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Error Boundary Component
// ============================================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error: createErrorFromException(error),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const appError = createErrorFromException(error);

    this.setState({
      error: appError,
      errorInfo,
    });

    // Log the error
    if (this.props.logErrors !== false) {
      logError(appError, consoleErrorLogger, {
        componentStack: errorInfo.componentStack,
      });
    }

    // Call the onError callback if provided
    this.props.onError?.(appError, errorInfo);
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, showDetails, severity = 'error', className } = this.props;

    if (hasError && error) {
      const suggestions = getRecoverySuggestions(error);
      const fallbackProps: ErrorFallbackProps = {
        error,
        errorInfo,
        resetError: this.resetError,
        severity,
        suggestions,
      };

      // Custom fallback
      if (fallback) {
        if (typeof fallback === 'function') {
          return (
            <div className={className}>
              {fallback(fallbackProps)}
            </div>
          );
        }
        return <div className={className}>{fallback}</div>;
      }

      // Default fallback
      return (
        <div className={className}>
          <DefaultErrorFallback {...fallbackProps} />
        </div>
      );
    }

    return children;
  }
}

// ============================================================================
// Functional Wrapper Hook
// ============================================================================

export interface UseErrorBoundaryReturn {
  showBoundary: (error: unknown) => void;
}

/**
 * Hook to programmatically trigger the error boundary
 */
export function useErrorBoundary(): UseErrorBoundaryReturn {
  const [error, setError] = React.useState<Error | null>(null);

  if (error) {
    throw error;
  }

  const showBoundary = React.useCallback((error: unknown) => {
    setError(error instanceof Error ? error : new Error(String(error)));
  }, []);

  return { showBoundary };
}

// ============================================================================
// Inline Error Display (for smaller errors)
// ============================================================================

export interface InlineErrorProps {
  error: Error | string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  severity?: ErrorSeverity;
  className?: string;
}

export function InlineError({
  error,
  onRetry,
  onDismiss,
  severity = 'error',
  className = '',
}: InlineErrorProps) {
  if (!error) return null;

  const message = typeof error === 'string' ? error : error.message;
  const styles = severityStyles[severity];

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${styles.container} ${className}`}
      role="alert"
    >
      <svg
        className={`w-5 h-5 flex-shrink-0 ${styles.icon}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={styles.iconPath}
        />
      </svg>
      
      <span className="flex-1 text-sm text-gray-700">{message}</span>
      
      <div className="flex items-center gap-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-sm font-medium text-teal-600 hover:text-teal-700"
          >
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Dismiss"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Error Wrapper for Async Components
// ============================================================================

export interface AsyncErrorWrapperProps<T> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  onRetry?: () => void;
  children: (data: T) => ReactNode;
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode | ((error: Error, retry?: () => void) => ReactNode);
  emptyFallback?: ReactNode;
}

export function AsyncErrorWrapper<T>({
  data,
  error,
  isLoading,
  onRetry,
  children,
  loadingFallback,
  errorFallback,
  emptyFallback,
}: AsyncErrorWrapperProps<T>) {
  if (isLoading) {
    return (
      <>
        {loadingFallback ?? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </>
    );
  }

  if (error) {
    if (errorFallback) {
      return (
        <>
          {typeof errorFallback === 'function'
            ? errorFallback(error, onRetry)
            : errorFallback}
        </>
      );
    }
    return <InlineError error={error} onRetry={onRetry} />;
  }

  if (!data) {
    return (
      <>
        {emptyFallback ?? (
          <div className="text-center py-8 text-gray-500">
            No data available
          </div>
        )}
      </>
    );
  }

  return <>{children(data)}</>;
}

export default ErrorBoundary;
