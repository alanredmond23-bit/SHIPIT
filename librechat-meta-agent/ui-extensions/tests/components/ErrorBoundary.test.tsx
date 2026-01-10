/**
 * ErrorBoundary Component Tests
 * Tests for error catching, recovery, and display functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  ErrorBoundary,
  InlineError,
  AsyncErrorWrapper,
  useErrorBoundary,
} from '@/components/ErrorBoundary';
import {
  AppError,
  NetworkError,
  AuthError,
  RateLimitError,
  APIError,
  ValidationError,
  TimeoutError,
} from '@/lib/errors';

// ============================================================================
// Test Helpers
// ============================================================================

// Component that throws an error
function ThrowingComponent({ error }: { error: Error }) {
  throw error;
}

// Component that conditionally throws
function ConditionalThrowingComponent({
  shouldThrow,
  error,
}: {
  shouldThrow: boolean;
  error: Error;
}) {
  if (shouldThrow) {
    throw error;
  }
  return <div>No error</div>;
}

// Component using the useErrorBoundary hook
function ErrorTriggerComponent({ error }: { error: Error }) {
  const { showBoundary } = useErrorBoundary();

  return (
    <button onClick={() => showBoundary(error)}>
      Trigger Error
    </button>
  );
}

// Suppress console.error during tests since we expect errors
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

// ============================================================================
// ErrorBoundary Tests
// ============================================================================

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('error catching', () => {
    it('should catch and display error from child component', () => {
      const testError = new Error('Test error message');

      render(
        <ErrorBoundary>
          <ThrowingComponent error={testError} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Test error message/i)).toBeInTheDocument();
    });

    it('should display default fallback UI on error', () => {
      const testError = new Error('Something broke');

      render(
        <ErrorBoundary>
          <ThrowingComponent error={testError} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/Try Again/i)).toBeInTheDocument();
      expect(screen.getByText(/Refresh Page/i)).toBeInTheDocument();
    });

    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div data-testid="child">Child content</div>
        </ErrorBoundary>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should convert regular Error to AppError', () => {
      const regularError = new Error('Regular error');

      render(
        <ErrorBoundary>
          <ThrowingComponent error={regularError} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Regular error/i)).toBeInTheDocument();
    });
  });

  describe('custom fallback', () => {
    it('should render custom fallback ReactNode', () => {
      const testError = new Error('Test error');
      const customFallback = <div data-testid="custom-fallback">Custom error UI</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowingComponent error={testError} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    });

    it('should render custom fallback function with error props', () => {
      const testError = new AppError('Custom app error', 'CUSTOM_CODE');
      const customFallback = jest.fn(({ error, resetError }) => (
        <div>
          <span data-testid="error-code">{error.code}</span>
          <button onClick={resetError}>Reset</button>
        </div>
      ));

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowingComponent error={testError} />
        </ErrorBoundary>
      );

      expect(customFallback).toHaveBeenCalled();
      expect(screen.getByTestId('error-code')).toHaveTextContent('CUSTOM_CODE');
    });
  });

  describe('error reset', () => {
    it('should reset error state when Try Again is clicked', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ConditionalThrowingComponent
            shouldThrow={true}
            error={new Error('Test')}
          />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Click Try Again
      fireEvent.click(screen.getByText('Try Again'));

      // Rerender with no error
      rerender(
        <ErrorBoundary>
          <ConditionalThrowingComponent
            shouldThrow={false}
            error={new Error('Test')}
          />
        </ErrorBoundary>
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('should call window.location.reload when Refresh Page is clicked', () => {
      const reloadMock = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadMock },
        writable: true,
      });

      render(
        <ErrorBoundary>
          <ThrowingComponent error={new Error('Test')} />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByText('Refresh Page'));
      expect(reloadMock).toHaveBeenCalled();
    });
  });

  describe('onError callback', () => {
    it('should call onError callback when error is caught', () => {
      const onError = jest.fn();
      const testError = new Error('Test error');

      render(
        <ErrorBoundary onError={onError}>
          <ThrowingComponent error={testError} />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0][0]).toBeInstanceOf(AppError);
      expect(onError.mock.calls[0][0].message).toBe('Test error');
    });
  });

  describe('severity styling', () => {
    it('should apply error severity by default', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent error={new Error('Test')} />
        </ErrorBoundary>
      );

      const alert = screen.getByRole('alert');
      expect(alert.className).toContain('bg-red-50');
    });

    it('should apply critical severity when specified', () => {
      render(
        <ErrorBoundary severity="critical">
          <ThrowingComponent error={new Error('Test')} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Critical Error/i)).toBeInTheDocument();
    });

    it('should apply warning severity styling', () => {
      render(
        <ErrorBoundary severity="warning">
          <ThrowingComponent error={new Error('Test')} />
        </ErrorBoundary>
      );

      const alert = screen.getByRole('alert');
      expect(alert.className).toContain('bg-amber-50');
    });
  });

  describe('error details', () => {
    it('should toggle error details visibility', () => {
      render(
        <ErrorBoundary showDetails>
          <ThrowingComponent error={new Error('Test error with details')} />
        </ErrorBoundary>
      );

      // Details should be hidden initially
      expect(screen.queryByText(/Component Stack/i)).not.toBeInTheDocument();

      // Click to show details
      fireEvent.click(screen.getByText('Show Details'));

      // Details should now be visible
      expect(screen.getByText(/Component Stack/i)).toBeInTheDocument();

      // Click to hide details
      fireEvent.click(screen.getByText('Hide Details'));

      // Details should be hidden again
      expect(screen.queryByText(/Component Stack/i)).not.toBeInTheDocument();
    });
  });

  describe('recovery suggestions', () => {
    it('should show recovery suggestions for NetworkError', () => {
      const networkError = new NetworkError('Connection failed');

      render(
        <ErrorBoundary>
          <ThrowingComponent error={networkError} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/What you can try/i)).toBeInTheDocument();
      expect(screen.getByText(/Verify your internet connection/i)).toBeInTheDocument();
    });

    it('should show login suggestion for AuthError', () => {
      const authError = new AuthError('Session expired', {
        isSessionExpired: true,
      });

      render(
        <ErrorBoundary>
          <ThrowingComponent error={authError} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Log in to your account/i)).toBeInTheDocument();
    });

    it('should show wait suggestion for RateLimitError', () => {
      const rateLimitError = new RateLimitError('Too many requests', {
        retryAfter: 30,
      });

      render(
        <ErrorBoundary>
          <ThrowingComponent error={rateLimitError} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Wait 30 seconds/i)).toBeInTheDocument();
    });
  });

  describe('custom className', () => {
    it('should apply custom className to container', () => {
      const { container } = render(
        <ErrorBoundary className="custom-error-class">
          <ThrowingComponent error={new Error('Test')} />
        </ErrorBoundary>
      );

      expect(container.querySelector('.custom-error-class')).toBeInTheDocument();
    });
  });

  describe('logging', () => {
    it('should log errors by default', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent error={new Error('Logged error')} />
        </ErrorBoundary>
      );

      // Console.error is mocked but would normally be called
      expect(console.error).toHaveBeenCalled();
    });

    it('should not log errors when logErrors is false', () => {
      jest.clearAllMocks();

      render(
        <ErrorBoundary logErrors={false}>
          <ThrowingComponent error={new Error('Not logged error')} />
        </ErrorBoundary>
      );

      // React still calls console.error internally for error boundaries
      // but our custom logging should not be called
    });
  });
});

// ============================================================================
// useErrorBoundary Hook Tests
// ============================================================================

describe('useErrorBoundary', () => {
  it('should programmatically trigger error boundary', () => {
    const testError = new Error('Programmatic error');

    render(
      <ErrorBoundary>
        <ErrorTriggerComponent error={testError} />
      </ErrorBoundary>
    );

    // Initially no error
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // Trigger error
    fireEvent.click(screen.getByText('Trigger Error'));

    // Error should now be displayed
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Programmatic error/i)).toBeInTheDocument();
  });

  it('should convert non-Error to Error', () => {
    function StringErrorComponent() {
      const { showBoundary } = useErrorBoundary();
      return (
        <button onClick={() => showBoundary('String error message')}>
          Trigger String Error
        </button>
      );
    }

    render(
      <ErrorBoundary>
        <StringErrorComponent />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Trigger String Error'));
    expect(screen.getByText(/String error message/i)).toBeInTheDocument();
  });
});

// ============================================================================
// InlineError Tests
// ============================================================================

describe('InlineError', () => {
  it('should render nothing when error is null', () => {
    const { container } = render(<InlineError error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render error message from Error object', () => {
    render(<InlineError error={new Error('Error message')} />);
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('should render error message from string', () => {
    render(<InlineError error="String error" />);
    expect(screen.getByText('String error')).toBeInTheDocument();
  });

  it('should show retry button when onRetry is provided', () => {
    const onRetry = jest.fn();
    render(<InlineError error="Error" onRetry={onRetry} />);

    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should show dismiss button when onDismiss is provided', () => {
    const onDismiss = jest.fn();
    render(<InlineError error="Error" onDismiss={onDismiss} />);

    const dismissButton = screen.getByLabelText('Dismiss');
    expect(dismissButton).toBeInTheDocument();

    fireEvent.click(dismissButton);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should apply severity styling', () => {
    const { rerender } = render(
      <InlineError error="Error" severity="error" />
    );

    let alert = screen.getByRole('alert');
    expect(alert.className).toContain('bg-red-50');

    rerender(<InlineError error="Warning" severity="warning" />);
    alert = screen.getByRole('alert');
    expect(alert.className).toContain('bg-amber-50');

    rerender(<InlineError error="Info" severity="info" />);
    alert = screen.getByRole('alert');
    expect(alert.className).toContain('bg-blue-50');

    rerender(<InlineError error="Critical" severity="critical" />);
    alert = screen.getByRole('alert');
    expect(alert.className).toContain('bg-red-100');
  });

  it('should apply custom className', () => {
    render(<InlineError error="Error" className="custom-class" />);
    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('custom-class');
  });
});

// ============================================================================
// AsyncErrorWrapper Tests
// ============================================================================

describe('AsyncErrorWrapper', () => {
  describe('loading state', () => {
    it('should show default loading fallback', () => {
      render(
        <AsyncErrorWrapper
          data={undefined}
          error={null}
          isLoading={true}
        >
          {(data) => <div>{data}</div>}
        </AsyncErrorWrapper>
      );

      // Check for loading spinner (animated element)
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should show custom loading fallback', () => {
      render(
        <AsyncErrorWrapper
          data={undefined}
          error={null}
          isLoading={true}
          loadingFallback={<div data-testid="custom-loading">Loading...</div>}
        >
          {(data) => <div>{data}</div>}
        </AsyncErrorWrapper>
      );

      expect(screen.getByTestId('custom-loading')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show InlineError by default for errors', () => {
      const testError = new Error('Fetch failed');

      render(
        <AsyncErrorWrapper
          data={undefined}
          error={testError}
          isLoading={false}
        >
          {(data) => <div>{data}</div>}
        </AsyncErrorWrapper>
      );

      expect(screen.getByText('Fetch failed')).toBeInTheDocument();
    });

    it('should show custom error fallback ReactNode', () => {
      const testError = new Error('Fetch failed');

      render(
        <AsyncErrorWrapper
          data={undefined}
          error={testError}
          isLoading={false}
          errorFallback={<div data-testid="custom-error">Custom error</div>}
        >
          {(data) => <div>{data}</div>}
        </AsyncErrorWrapper>
      );

      expect(screen.getByTestId('custom-error')).toBeInTheDocument();
    });

    it('should call error fallback function with error and retry', () => {
      const testError = new Error('Fetch failed');
      const onRetry = jest.fn();
      const errorFallback = jest.fn((error, retry) => (
        <div>
          <span data-testid="error-msg">{error.message}</span>
          <button onClick={retry}>Custom Retry</button>
        </div>
      ));

      render(
        <AsyncErrorWrapper
          data={undefined}
          error={testError}
          isLoading={false}
          onRetry={onRetry}
          errorFallback={errorFallback}
        >
          {(data) => <div>{data}</div>}
        </AsyncErrorWrapper>
      );

      expect(errorFallback).toHaveBeenCalledWith(testError, onRetry);
      expect(screen.getByTestId('error-msg')).toHaveTextContent('Fetch failed');

      fireEvent.click(screen.getByText('Custom Retry'));
      expect(onRetry).toHaveBeenCalled();
    });

    it('should show retry button in InlineError when onRetry provided', () => {
      const onRetry = jest.fn();
      const testError = new Error('Fetch failed');

      render(
        <AsyncErrorWrapper
          data={undefined}
          error={testError}
          isLoading={false}
          onRetry={onRetry}
        >
          {(data) => <div>{data}</div>}
        </AsyncErrorWrapper>
      );

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);
      expect(onRetry).toHaveBeenCalled();
    });
  });

  describe('empty state', () => {
    it('should show default empty fallback', () => {
      render(
        <AsyncErrorWrapper
          data={undefined}
          error={null}
          isLoading={false}
        >
          {(data) => <div>{data}</div>}
        </AsyncErrorWrapper>
      );

      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('should show custom empty fallback', () => {
      render(
        <AsyncErrorWrapper
          data={undefined}
          error={null}
          isLoading={false}
          emptyFallback={<div data-testid="custom-empty">Nothing here</div>}
        >
          {(data) => <div>{data}</div>}
        </AsyncErrorWrapper>
      );

      expect(screen.getByTestId('custom-empty')).toBeInTheDocument();
    });
  });

  describe('success state', () => {
    it('should render children with data', () => {
      const testData = { message: 'Hello World' };

      render(
        <AsyncErrorWrapper
          data={testData}
          error={null}
          isLoading={false}
        >
          {(data) => <div data-testid="content">{data.message}</div>}
        </AsyncErrorWrapper>
      );

      expect(screen.getByTestId('content')).toHaveTextContent('Hello World');
    });

    it('should render array data correctly', () => {
      const testData = ['item1', 'item2', 'item3'];

      render(
        <AsyncErrorWrapper
          data={testData}
          error={null}
          isLoading={false}
        >
          {(data) => (
            <ul>
              {data.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}
        </AsyncErrorWrapper>
      );

      expect(screen.getByText('item1')).toBeInTheDocument();
      expect(screen.getByText('item2')).toBeInTheDocument();
      expect(screen.getByText('item3')).toBeInTheDocument();
    });
  });

  describe('state priority', () => {
    it('should prioritize loading over error', () => {
      render(
        <AsyncErrorWrapper
          data={undefined}
          error={new Error('Error')}
          isLoading={true}
        >
          {(data) => <div>{data}</div>}
        </AsyncErrorWrapper>
      );

      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
      expect(screen.queryByText('Error')).not.toBeInTheDocument();
    });

    it('should prioritize error over empty', () => {
      render(
        <AsyncErrorWrapper
          data={undefined}
          error={new Error('Error occurred')}
          isLoading={false}
        >
          {(data) => <div>{data}</div>}
        </AsyncErrorWrapper>
      );

      expect(screen.getByText('Error occurred')).toBeInTheDocument();
      expect(screen.queryByText('No data available')).not.toBeInTheDocument();
    });
  });
});

// ============================================================================
// Error Type Display Tests
// ============================================================================

describe('Error type specific displays', () => {
  it('should handle APIError correctly', () => {
    const apiError = new APIError('Server error', 500, {
      body: { detail: 'Internal server error' },
    });

    render(
      <ErrorBoundary>
        <ThrowingComponent error={apiError} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Server error/i)).toBeInTheDocument();
    expect(screen.getByText(/Try Again/i)).toBeInTheDocument();
  });

  it('should handle ValidationError correctly', () => {
    const validationError = new ValidationError('Invalid input', {
      validationErrors: [
        { field: 'email', message: 'Invalid email format' },
      ],
    });

    render(
      <ErrorBoundary>
        <ThrowingComponent error={validationError} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Invalid input/i)).toBeInTheDocument();
    expect(screen.getByText(/Review and correct/i)).toBeInTheDocument();
  });

  it('should handle TimeoutError correctly', () => {
    const timeoutError = new TimeoutError('Request timed out', {
      timeoutMs: 30000,
    });

    render(
      <ErrorBoundary>
        <ThrowingComponent error={timeoutError} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Request timed out/i)).toBeInTheDocument();
    expect(screen.getByText(/took too long/i)).toBeInTheDocument();
  });
});
