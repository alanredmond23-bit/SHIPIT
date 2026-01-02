'use client';

import { SignUpForm } from '@/components/Auth/SignUpForm';
import { AuthGuard } from '@/components/Auth/AuthGuard';
import Link from 'next/link';

export default function SignUpPage() {
  return (
    <AuthGuard requireAuth={false} redirectTo="/">
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-8">
        {/* Background Gradient */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-md">
          {/* Logo/Brand */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-3xl">
                🤖
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Meta Agent
              </h2>
            </Link>
          </div>

          {/* Sign Up Form Card */}
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800 p-8 shadow-2xl">
            <SignUpForm />
          </div>

          {/* Footer Links */}
          <div className="mt-8 text-center text-sm text-slate-500">
            <p>
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="text-purple-400 hover:text-purple-300 transition-colors">
                Terms
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-purple-400 hover:text-purple-300 transition-colors">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
