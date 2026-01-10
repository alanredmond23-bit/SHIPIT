'use client';

import React, { Suspense, ComponentType, ReactNode, useState, useEffect } from 'react';
import clsx from 'clsx';

/**
 * LazyComponent - Wrapper for React.lazy with Suspense and Error Boundary
 * 
 * Features:
 * - Automatic Suspense wrapper
 * - Customizable loading fallback
 * - Built-in error boundary
 * - Retry functionality on error
 * - Intersection observer for lazy loading on visibility
 * - Preload functionality
 */

// ============================================================================
// Types
// ============================================================================

export interface LazyComponentProps {
  /** The lazy-loaded component */
  children: ReactNode;
  /** Loading fallback component */
  fallback?: ReactNode;
  /** Error fallback render function */
  errorFallback?: (error: Error, retry: () => void) => ReactNode;
  /** Delay before showing loading state (prevents flash) */
  delay?: number;
  /** Minimum time to show loading state */
  minLoadingTime?: number;
  /** Additional class for wrapper */
  className?: string;
}

export interface LazyLoaderProps<P extends object> {
  /** Factory function returning the lazy component */
  factory: () => Promise<{ default: ComponentType<P> }>;
  /** Props to pass to the loaded component */
  componentProps?: P;
  /** Loading fallback */
  fallback?: ReactNode;
  /** Error fallback */
  errorFallback?: (error: Error, retry: () => void) => ReactNode;
  /** Only load when component is in viewport */
  loadOnVisible?: boolean;
  /** Root margin for intersection observer */
  rootMargin?: string;
  /** Whether to preload immediately */
  preload?: boolean;
  /** Wrapper class */
  className?: string;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ============================================================================
// Default Fallbacks
// ============================================================================

export function DefaultLoadingFallback({ className }: { className?: string }) {
  return (
    <div className={clsx('flex items-center justify-center p-4', className)}>
      <div className="flex items-center gap-2 text-stone-500">
        <div className="w-5 h-5 border-2 border-stone-300 border-t-teal-500 rounded-full animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    </div>
  );
}

export function DefaultErrorFallback({
  error,
  retry,
  className,
}: {
  error: Error;
  retry: () => void;
  className?: string;
}) {
  return (
    <div className={clsx('flex flex-col items-center justify-center p-6 text-center', className)}>
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
        <svg
          className="w-6 h-6 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-sm font-medium text-stone-900 mb-1">Failed to load component</h3>
      <p className="text-xs text-stone-500 mb-3 max-w-xs">{error.message}</p>
      <button
        onClick={retry}
        className="px-4 py-2 text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 rounded-lg transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}

// ============================================================================
// Error Boundary Component
// ============================================================================

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error, this.retry);
    }

    return this.props.children;
  }
}

// ============================================================================
// LazyComponent Wrapper
// ============================================================================

export function LazyComponent({
  children,
  fallback,
  errorFallback,
  delay = 0,
  minLoadingTime = 0,
  className,
}: LazyComponentProps) {
  const [showFallback, setShowFallback] = useState(delay > 0);
  const [minTimeElapsed, setMinTimeElapsed] = useState(minLoadingTime === 0);

  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => setShowFallback(false), delay);
      return () => clearTimeout(timer);
    }
  }, [delay]);

  useEffect(() => {
    if (minLoadingTime > 0) {
      const timer = setTimeout(() => setMinTimeElapsed(true), minLoadingTime);
      return () => clearTimeout(timer);
    }
  }, [minLoadingTime]);

  const loadingFallback = 
    showFallback || !minTimeElapsed ? null : (fallback ?? <DefaultLoadingFallback />);

  const errorFallbackComponent = errorFallback ?? ((error: Error, retry: () => void) => (
    <DefaultErrorFallback error={error} retry={retry} />
  ));

  return (
    <ErrorBoundary fallback={errorFallbackComponent}>
      <Suspense fallback={loadingFallback}>
        <div className={className}>{children}</div>
      </Suspense>
    </ErrorBoundary>
  );
}

// ============================================================================
// LazyLoader - Full lazy loading solution
// ============================================================================

export function LazyLoader<P extends object>({
  factory,
  componentProps,
  fallback,
  errorFallback,
  loadOnVisible = false,
  rootMargin = '200px',
  preload = false,
  className,
}: LazyLoaderProps<P>) {
  const [Component, setComponent] = useState<ComponentType<P> | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isVisible, setIsVisible] = useState(!loadOnVisible);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Preload on mount if enabled
  useEffect(() => {
    if (preload && !loadOnVisible) {
      factory()
        .then((module) => setComponent(() => module.default))
        .catch(setError);
    }
  }, [preload, loadOnVisible, factory]);

  // Intersection observer for visibility-based loading
  useEffect(() => {
    if (!loadOnVisible || isVisible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [loadOnVisible, isVisible, rootMargin]);

  // Load component when visible
  useEffect(() => {
    if (isVisible && !Component && !error) {
      factory()
        .then((module) => setComponent(() => module.default))
        .catch(setError);
    }
  }, [isVisible, Component, error, factory]);

  const retry = () => {
    setError(null);
    setComponent(null);
    factory()
      .then((module) => setComponent(() => module.default))
      .catch(setError);
  };

  // Error state
  if (error) {
    return (
      <div ref={containerRef} className={className}>
        {errorFallback ? (
          errorFallback(error, retry)
        ) : (
          <DefaultErrorFallback error={error} retry={retry} />
        )}
      </div>
    );
  }

  // Loading state
  if (!Component) {
    return (
      <div ref={containerRef} className={className}>
        {fallback ?? <DefaultLoadingFallback />}
      </div>
    );
  }

  // Render loaded component
  return (
    <div ref={containerRef} className={className}>
      <Component {...(componentProps as P)} />
    </div>
  );
}

// ============================================================================
// Utility: Create Lazy Component with Preload
// ============================================================================

type LazyFactory<P extends object> = () => Promise<{ default: ComponentType<P> }>;

interface LazyWithPreload<P extends object> {
  Component: React.LazyExoticComponent<ComponentType<P>>;
  preload: () => Promise<void>;
}

export function createLazyWithPreload<P extends object>(
  factory: LazyFactory<P>
): LazyWithPreload<P> {
  let componentPromise: Promise<{ default: ComponentType<P> }> | null = null;

  const lazyFactory = () => {
    if (!componentPromise) {
      componentPromise = factory();
    }
    return componentPromise;
  };

  return {
    Component: React.lazy(lazyFactory),
    preload: async () => {
      await lazyFactory();
    },
  };
}

// ============================================================================
// Utility: Lazy with Retry
// ============================================================================

export function lazyWithRetry<P extends object>(
  factory: LazyFactory<P>,
  retries = 3,
  delay = 1000
): React.LazyExoticComponent<ComponentType<P>> {
  return React.lazy(async () => {
    let lastError: Error | null = null;

    for (let i = 0; i < retries; i++) {
      try {
        return await factory();
      } catch (error) {
        lastError = error as Error;
        if (i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }

    throw lastError;
  });
}

// ============================================================================
// Utility: Prefetch Component
// ============================================================================

const prefetchedComponents = new Set<string>();

export function prefetchComponent(
  key: string,
  factory: () => Promise<unknown>
): void {
  if (prefetchedComponents.has(key)) return;
  
  prefetchedComponents.add(key);
  
  // Use requestIdleCallback if available, otherwise setTimeout
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => factory().catch(() => {
      // Silently fail on prefetch errors
      prefetchedComponents.delete(key);
    }));
  } else {
    setTimeout(() => factory().catch(() => {
      prefetchedComponents.delete(key);
    }), 1);
  }
}

export default LazyComponent;
