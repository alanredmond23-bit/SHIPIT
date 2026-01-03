'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

export function SignUpForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { signUp, signInWithOAuth } = useAuth();
  const router = useRouter();

  const validatePassword = (pwd: string): PasswordStrength => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z\d]/.test(pwd)) score++;

    if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
    if (score <= 3) return { score, label: 'Fair', color: 'bg-yellow-500' };
    if (score <= 4) return { score, label: 'Good', color: 'bg-blue-500' };
    return { score, label: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = password ? validatePassword(password) : null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    if (!acceptTerms) {
      setError('You must accept the Terms of Service and Privacy Policy');
      setLoading(false);
      return;
    }

    try {
      const { error: signUpError } = await signUp(email, password, {
        full_name: fullName,
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        setSuccess('Account created! Check your email to verify your account.');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setFullName('');
        setAcceptTerms(false);

        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    setLoading(true);
    setError(null);

    try {
      const { error: oauthError } = await signInWithOAuth(provider);
      if (oauthError) {
        setError(oauthError.message);
        setLoading(false);
      }
      // OAuth will redirect, so we don't stop loading
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2 text-stone-900">Create Account</h1>
        <p className="text-stone-500">Join Meta Agent and unlock the power of AI</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm">
          {success}
        </div>
      )}

      {/* OAuth Buttons */}
      <div className="space-y-3 mb-6">
        <button
          onClick={() => handleOAuthSignIn('google')}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-stone-100 text-stone-900 rounded-xl font-medium hover:bg-stone-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-stone-200"
        >
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
          Continue with Google
        </button>

        <button
          onClick={() => handleOAuthSignIn('github')}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
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

      {/* Sign Up Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium mb-2 text-stone-700">
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-stone-900 placeholder-stone-400"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2 text-stone-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-stone-900 placeholder-stone-400"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2 text-stone-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-stone-900 placeholder-stone-400"
            placeholder="••••••••"
          />
          {passwordStrength && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-stone-500">Password strength:</span>
                <span className={`font-medium ${passwordStrength.score <= 2 ? 'text-red-500' : passwordStrength.score <= 3 ? 'text-yellow-600' : passwordStrength.score <= 4 ? 'text-blue-500' : 'text-green-500'}`}>
                  {passwordStrength.label}
                </span>
              </div>
              <div className="w-full bg-stone-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${passwordStrength.color}`}
                  style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                />
              </div>
              <p className="text-xs text-stone-500 mt-2">
                Use 8+ characters with a mix of letters, numbers & symbols
              </p>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2 text-stone-700">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-stone-900 placeholder-stone-400"
            placeholder="••••••••"
          />
          {confirmPassword && password !== confirmPassword && (
            <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
          )}
        </div>

        <div className="flex items-start gap-2">
          <input
            id="terms"
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="w-4 h-4 mt-0.5 bg-stone-100 border-stone-300 rounded focus:ring-2 focus:ring-teal-500 accent-teal-500"
          />
          <label htmlFor="terms" className="text-sm text-stone-500">
            I agree to the{' '}
            <Link href="/terms" className="text-teal-600 hover:text-teal-700 transition-colors">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-teal-600 hover:text-teal-700 transition-colors">
              Privacy Policy
            </Link>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || !acceptTerms}
          className="w-full px-4 py-3 bg-teal-500 hover:bg-teal-600 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
              Creating account...
            </span>
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      {/* Sign In Link */}
      <p className="mt-6 text-center text-sm text-stone-500">
        Already have an account?{' '}
        <Link href="/login" className="text-teal-600 hover:text-teal-700 font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
