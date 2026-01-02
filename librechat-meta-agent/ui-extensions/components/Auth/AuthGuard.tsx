'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
}

/**
 * AuthGuard component to protect routes that require authentication
 *
 * @param children - The content to render if authenticated
 * @param fallback - Optional fallback content to show while loading
 * @param redirectTo - Where to redirect if not authenticated (default: /login)
 * @param requireAuth - If true, requires authentication. If false, redirects authenticated users (default: true)
 *
 * @example
 * // Protect a route (require login)
 * <AuthGuard>
 *   <ProtectedContent />
 * </AuthGuard>
 *
 * @example
 * // Redirect authenticated users (e.g., login page)
 * <AuthGuard requireAuth={false} redirectTo="/">
 *   <LoginForm />
 * </AuthGuard>
 */
export function AuthGuard({
  children,
  fallback,
  redirectTo,
  requireAuth = true,
}: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (requireAuth && !user) {
      // User is not authenticated, redirect to login
      router.push(redirectTo || '/login');
    } else if (!requireAuth && user) {
      // User is authenticated but shouldn't be (e.g., on login page)
      router.push(redirectTo || '/');
    }
  }, [user, loading, router, redirectTo, requireAuth]);

  // Show loading state
  if (loading) {
    return (
      <>
        {fallback || (
          <div className="min-h-screen flex items-center justify-center bg-slate-950">
            <div className="text-center">
              <div className="mb-4">
                <svg
                  className="animate-spin h-12 w-12 mx-auto text-purple-500"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
              <p className="text-slate-400">Loading...</p>
            </div>
          </div>
        )}
      </>
    );
  }

  // Check authentication requirements
  if (requireAuth && !user) {
    // Redirecting to login, show nothing or fallback
    return <>{fallback || null}</>;
  }

  if (!requireAuth && user) {
    // Redirecting away from auth pages, show nothing or fallback
    return <>{fallback || null}</>;
  }

  // User meets authentication requirements
  return <>{children}</>;
}

/**
 * Higher-Order Component version of AuthGuard
 * Wraps a component with authentication protection
 *
 * @example
 * const ProtectedPage = withAuthGuard(MyPage);
 *
 * @example
 * const LoginPage = withAuthGuard(MyLoginPage, { requireAuth: false, redirectTo: '/' });
 */
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<AuthGuardProps, 'children'>
) {
  return function WithAuthGuardComponent(props: P) {
    return (
      <AuthGuard {...options}>
        <Component {...props} />
      </AuthGuard>
    );
  };
}
