'use client';

import { SignUpForm } from '@/components/Auth/SignUpForm';
import { AuthGuard } from '@/components/Auth/AuthGuard';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function SignUpPage() {
  return (
    <AuthGuard requireAuth={false} redirectTo="/">
      <div className="min-h-screen flex items-center justify-center bg-stone-100 px-4 py-8">
        {/* Content */}
        <div className="relative z-10 w-full max-w-md">
          {/* Logo/Brand */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <div className="w-16 h-16 mx-auto mb-4 bg-teal-500 rounded-2xl flex items-center justify-center shadow-soft">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-stone-900">
                Meta Agent
              </h2>
              <p className="text-sm text-stone-500 mt-1">AI Orchestrator</p>
            </Link>
          </div>

          {/* Sign Up Form Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-card">
            <SignUpForm />
          </div>

          {/* Footer Links */}
          <div className="mt-8 text-center text-sm text-stone-500">
            <p>
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="text-teal-600 hover:text-teal-700 transition-colors">
                Terms
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-teal-600 hover:text-teal-700 transition-colors">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
