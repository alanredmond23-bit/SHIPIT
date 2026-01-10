'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';

// Password strength checker
interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
  suggestions: string[];
}

function checkPasswordStrength(password: string): PasswordStrength {
  const suggestions: string[] = [];
  let score = 0;

  if (password.length === 0) {
    return { score: 0, label: '', color: '', suggestions: [] };
  }

  // Length check
  if (password.length >= 8) {
    score++;
  } else {
    suggestions.push('Use at least 8 characters');
  }

  if (password.length >= 12) {
    score++;
  }

  // Character variety checks
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score++;
  } else {
    suggestions.push('Mix uppercase and lowercase letters');
  }

  if (/\d/.test(password)) {
    score++;
  } else {
    suggestions.push('Add a number');
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    score++;
  } else {
    suggestions.push('Add a special character (!@#$%^&*)');
  }

  // Common password patterns
  const commonPatterns = ['123456', 'password', 'qwerty', 'abc123'];
  if (commonPatterns.some((pattern) => password.toLowerCase().includes(pattern))) {
    score = Math.max(0, score - 2);
    suggestions.push('Avoid common password patterns');
  }

  const strengthMap: Record<number, { label: string; color: string }> = {
    0: { label: 'Too weak', color: 'bg-red-500' },
    1: { label: 'Weak', color: 'bg-orange-500' },
    2: { label: 'Fair', color: 'bg-yellow-500' },
    3: { label: 'Good', color: 'bg-lime-500' },
    4: { label: 'Strong', color: 'bg-green-500' },
    5: { label: 'Very strong', color: 'bg-green-600' },
  };

  const normalizedScore = Math.min(4, Math.max(0, Math.floor(score)));
  const { label, color } = strengthMap[normalizedScore];

  return { score: normalizedScore, label, color, suggestions: suggestions.slice(0, 2) };
}

// Error message mapping
const ERROR_MESSAGES: Record<string, string> = {
  'Password should be at least 6 characters': 'Password must be at least 6 characters long.',
  'New password should be different from the old password': 'Please choose a different password than your current one.',
  'Auth session missing': 'Your reset link has expired. Please request a new one.',
  'Token expired': 'Your reset link has expired. Please request a new one.',
  'Invalid token': 'This reset link is invalid. Please request a new one.',
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

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    label: '',
    color: '',
    suggestions: [],
  });

  const { updatePassword } = useAuth();
  const router = useRouter();

  // Check for token in URL (Supabase sends the token as a hash fragment)
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');

    // If there's a token in the URL, Supabase auth context should pick it up automatically
    if (!accessToken && !type) {
      // No token means user navigated here directly without a reset link
      // We'll show the form anyway but it will fail gracefully
    }
  }, []);

  // Update password strength when password changes
  useEffect(() => {
    setPasswordStrength(checkPasswordStrength(password));
  }, [password]);

  const validateForm = (): boolean => {
    const errors: { password?: string; confirmPassword?: string } = {};

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (passwordStrength.score < 2) {
      errors.password = 'Please choose a stronger password';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await updatePassword(password);
      if (updateError) {
        setError(getErrorMessage(updateError.message));
      } else {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    } catch (err) {
      setError(getErrorMessage('default'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: undefined }));
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (fieldErrors.confirmPassword) {
      setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
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
              <ShieldCheck className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold mb-3 text-stone-900">Password Updated!</h1>
            <p className="text-stone-500 mb-6">
              Your password has been successfully changed. You can now sign in with your new password.
            </p>

            <p className="text-sm text-stone-400 mb-6">
              Redirecting to sign in...
            </p>

            <Link
              href="/login"
              className="block w-full px-4 py-3 bg-teal-500 hover:bg-teal-600 rounded-xl font-medium transition-all text-white text-center"
            >
              Sign In Now
            </Link>
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
            <h1 className="text-3xl font-bold mb-2 text-stone-900">Create New Password</h1>
            <p className="text-stone-500">
              Enter a new password for your account. Make sure it's strong and unique.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-600 text-sm font-medium">Update failed</p>
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
            {/* New Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2 text-stone-700">
                New Password
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
                  required
                  autoComplete="new-password"
                  className={clsx(
                    'w-full pl-11 pr-12 py-3 bg-stone-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-stone-900 placeholder-stone-400',
                    fieldErrors.password ? 'border-red-300' : 'border-stone-200'
                  )}
                  placeholder="Enter new password"
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

              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                      <div
                        className={clsx('h-full transition-all duration-300', passwordStrength.color)}
                        style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-stone-500 min-w-[70px] text-right">
                      {passwordStrength.label}
                    </span>
                  </div>
                  {passwordStrength.suggestions.length > 0 && (
                    <ul className="text-xs text-stone-400 space-y-0.5">
                      {passwordStrength.suggestions.map((suggestion, i) => (
                        <li key={i} className="flex items-center gap-1">
                          <span className="text-stone-300">-</span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {fieldErrors.password && (
                <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2 text-stone-700">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  required
                  autoComplete="new-password"
                  className={clsx(
                    'w-full pl-11 pr-12 py-3 bg-stone-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-stone-900 placeholder-stone-400',
                    fieldErrors.confirmPassword ? 'border-red-300' : 'border-stone-200'
                  )}
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password match indicator */}
              {confirmPassword && (
                <p className={clsx(
                  'mt-1.5 text-sm flex items-center gap-1',
                  password === confirmPassword ? 'text-green-500' : 'text-stone-400'
                )}>
                  {password === confirmPassword ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Passwords match
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      Passwords do not match
                    </>
                  )}
                </p>
              )}

              {fieldErrors.confirmPassword && (
                <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || passwordStrength.score < 2}
              className="w-full px-4 py-3 bg-teal-500 hover:bg-teal-600 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center gap-2 mt-6"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  Update Password
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-stone-500">
          <p>
            Need a new reset link?{' '}
            <Link href="/auth/forgot-password" className="text-teal-600 hover:text-teal-700 font-medium transition-colors">
              Request one here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
