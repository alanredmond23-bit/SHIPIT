'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import Link from 'next/link';
import { Sparkles, Mail, ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

// Error message mapping
const ERROR_MESSAGES: Record<string, string> = {
  'User not found': 'No account found with this email address.',
  'Too many requests': 'Too many reset attempts. Please wait a few minutes and try again.',
  'Invalid email': 'Please enter a valid email address.',
  'default': 'An error occurred. Please try again.',
};

function getErrorMessage(error: string): string {
  if (ERROR_MESSAGES[error]) {
    return ERROR_MESSAGES[error];
  }
  for (const [key, message] of Object.entries(ERROR_MESSAGES)) {
    if (error.toLowerCase().includes(key.toLowerCase())) {
      return message;
    }
  }
  return ERROR_MESSAGES.default;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const { resetPassword } = useAuth();

  const validateEmail = (): boolean => {
    if (!email.trim()) {
      setFieldError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError('Please enter a valid email address');
      return false;
    }
    setFieldError(null);
    return true;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!validateEmail()) {
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await resetPassword(email);
      if (resetError) {
        setError(getErrorMessage(resetError.message));
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError(getErrorMessage('default'));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (fieldError) {
      setFieldError(null);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100 px-4">
        <div className="relative z-10 w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <div className="w-16 h-16 mx-auto mb-4 bg-teal-500 rounded-2xl flex items-center justify-center shadow-soft">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </Link>
          </div>

          {/* Success Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-card text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold mb-3 text-stone-900">Check Your Email</h1>
            <p className="text-stone-500 mb-6">
              We've sent password reset instructions to:
            </p>
            <p className="font-medium text-stone-700 bg-stone-100 rounded-lg px-4 py-2 mb-6">
              {email}
            </p>
            <p className="text-sm text-stone-400 mb-8">
              Click the link in the email to reset your password. If you don't see the email, check your spam folder.
            </p>

            <div className="space-y-3">
              <Link
                href="/login"
                className="block w-full px-4 py-3 bg-teal-500 hover:bg-teal-600 rounded-xl font-medium transition-all text-white text-center"
              >
                Return to Sign In
              </Link>
              <button
                type="button"
                onClick={() => {
                  setSuccess(false);
                  setEmail('');
                }}
                className="block w-full px-4 py-3 bg-stone-100 hover:bg-stone-200 rounded-xl font-medium transition-all text-stone-700 text-center"
              >
                Try a Different Email
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100 px-4">
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <div className="w-16 h-16 mx-auto mb-4 bg-teal-500 rounded-2xl flex items-center justify-center shadow-soft">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-stone-900">Meta Agent</h2>
            <p className="text-sm text-stone-500 mt-1">AI Orchestrator</p>
          </Link>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-card">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 text-stone-900">Reset Password</h1>
            <p className="text-stone-500">
              Enter your email and we'll send you a link to reset your password.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-600 text-sm font-medium">Reset failed</p>
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2 text-stone-700">
                Email Address
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
                  autoFocus
                  className={clsx(
                    'w-full pl-11 pr-4 py-3 bg-stone-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-stone-900 placeholder-stone-400',
                    fieldError ? 'border-red-300' : 'border-stone-200'
                  )}
                  placeholder="you@example.com"
                />
              </div>
              {fieldError && (
                <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {fieldError}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-teal-500 hover:bg-teal-600 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  Send Reset Link
                </>
              )}
            </button>
          </form>

          {/* Back to Sign In */}
          <Link
            href="/login"
            className="mt-6 flex items-center justify-center gap-2 text-sm text-stone-500 hover:text-stone-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-stone-500">
          <p>
            Remember your password?{' '}
            <Link href="/login" className="text-teal-600 hover:text-teal-700 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
