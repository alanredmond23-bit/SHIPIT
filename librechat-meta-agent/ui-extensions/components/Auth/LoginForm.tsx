'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Mail, Lock, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

// Error message mapping for better user experience
const ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'The email or password you entered is incorrect. Please try again.',
  'Email not confirmed': 'Please verify your email address before signing in. Check your inbox for the confirmation link.',
  'Too many requests': 'Too many login attempts. Please wait a few minutes and try again.',
  'User not found': 'No account found with this email. Would you like to create one?',
  'Invalid email': 'Please enter a valid email address.',
  'Password is required': 'Please enter your password.',
  'Email is required': 'Please enter your email address.',
  'Network request failed': 'Unable to connect. Please check your internet connection.',
  'Signup disabled': 'New signups are currently disabled. Please contact support.',
  'default': 'An unexpected error occurred. Please try again.',
};

// Helper to get user-friendly error message
function getErrorMessage(error: string): string {
  // Check for exact matches first
  if (ERROR_MESSAGES[error]) {
    return ERROR_MESSAGES[error];
  }

  // Check for partial matches
  for (const [key, message] of Object.entries(ERROR_MESSAGES)) {
    if (error.toLowerCase().includes(key.toLowerCase())) {
      return message;
    }
  }

  return ERROR_MESSAGES.default;
}

// Local storage keys
const REMEMBER_EMAIL_KEY = 'meta-agent-remember-email';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const { signIn, signInWithOAuth, signInWithMagicLink } = useAuth();
  const router = useRouter();

  // Load remembered email on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  // Client-side validation
  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!useMagicLink && !password) {
      errors.password = 'Password is required';
    } else if (!useMagicLink && password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (useMagicLink) {
        const { error: magicLinkError } = await signInWithMagicLink(email);
        if (magicLinkError) {
          setError(getErrorMessage(magicLinkError.message));
        } else {
          setSuccess('Check your email for the magic link! It may take a few minutes to arrive.');

          // Remember email if checked
          if (rememberMe) {
            localStorage.setItem(REMEMBER_EMAIL_KEY, email);
          } else {
            localStorage.removeItem(REMEMBER_EMAIL_KEY);
          }

          setEmail('');
        }
      } else {
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          setError(getErrorMessage(signInError.message));
        } else {
          // Remember email if checked
          if (rememberMe) {
            localStorage.setItem(REMEMBER_EMAIL_KEY, email);
          } else {
            localStorage.removeItem(REMEMBER_EMAIL_KEY);
          }

          router.push('/');
        }
      }
    } catch (err) {
      setError(getErrorMessage('default'));
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    setLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      const { error: oauthError } = await signInWithOAuth(provider);
      if (oauthError) {
        setError(getErrorMessage(oauthError.message));
        setLoading(false);
      }
      // OAuth will redirect, so we don't stop loading
    } catch (err) {
      setError(getErrorMessage('default'));
      setLoading(false);
    }
  };

  // Clear field error when user starts typing
  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (fieldErrors.email) {
      setFieldErrors((prev) => ({ ...prev, email: undefined }));
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: undefined }));
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2 text-stone-900">Welcome Back</h1>
        <p className="text-stone-500">Sign in to continue to Meta Agent</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-600 text-sm font-medium">Sign in failed</p>
            <p className="text-red-500 text-sm mt-1">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-500 text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-green-600 text-sm font-medium">Success!</p>
            <p className="text-green-500 text-sm mt-1">{success}</p>
          </div>
        </div>
      )}

      {/* OAuth Buttons */}
      <div className="space-y-3 mb-6">
        <button
          onClick={() => handleOAuthSignIn('google')}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-stone-100 text-stone-900 rounded-xl font-medium hover:bg-stone-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-stone-200"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          Continue with Google
        </button>

        <button
          onClick={() => handleOAuthSignIn('github')}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          )}
          Continue with GitHub
        </button>
      </div>

      {/* Divider */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-stone-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white text-stone-400">Or continue with email</span>
        </div>
      </div>

      {/* Email/Password Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2 text-stone-700">
            Email
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
              <Mail className="w-5 h-5" />
            </div>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              required
              autoComplete="email"
              className={clsx(
                'w-full pl-11 pr-4 py-3 bg-stone-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-stone-900 placeholder-stone-400',
                fieldErrors.email ? 'border-red-300' : 'border-stone-200'
              )}
              placeholder="you@example.com"
            />
          </div>
          {fieldErrors.email && (
            <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {fieldErrors.email}
            </p>
          )}
        </div>

        {/* Password Field */}
        {!useMagicLink && (
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2 text-stone-700">
              Password
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                <Lock className="w-5 h-5" />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                required={!useMagicLink}
                autoComplete="current-password"
                className={clsx(
                  'w-full pl-11 pr-12 py-3 bg-stone-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-stone-900 placeholder-stone-400',
                  fieldErrors.password ? 'border-red-300' : 'border-stone-200'
                )}
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {fieldErrors.password}
              </p>
            )}
          </div>
        )}

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 bg-stone-100 border-stone-300 rounded focus:ring-2 focus:ring-teal-500 accent-teal-500"
              />
            </div>
            <span className="text-sm text-stone-500 group-hover:text-stone-700 transition-colors">
              Remember me
            </span>
          </label>

          <Link
            href="/auth/forgot-password"
            className="text-sm text-teal-600 hover:text-teal-700 transition-colors font-medium"
          >
            Forgot password?
          </Link>
        </div>

        {/* Magic Link Toggle */}
        <button
          type="button"
          onClick={() => {
            setUseMagicLink(!useMagicLink);
            setFieldErrors({});
          }}
          className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
        >
          {useMagicLink ? 'Use password instead' : 'Use magic link instead'}
        </button>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-3 bg-teal-500 hover:bg-teal-600 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {useMagicLink ? 'Sending...' : 'Signing in...'}
            </>
          ) : useMagicLink ? (
            <>
              <Mail className="w-5 h-5" />
              Send Magic Link
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      {/* Sign Up Link */}
      <p className="mt-6 text-center text-sm text-stone-500">
        Don't have an account?{' '}
        <Link href="/signup" className="text-teal-600 hover:text-teal-700 font-medium transition-colors">
          Sign up
        </Link>
      </p>
    </div>
  );
}
