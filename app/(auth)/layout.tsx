import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Authentication - Joanna',
  description: 'Sign in to your Joanna account',
}

/**
 * Authentication layout
 * Centered card layout for login/signup pages
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      {/* Logo */}
      <Link
        href="/"
        className="mb-8 flex items-center gap-3 transition-transform hover:scale-105"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white shadow-lg">
          <span className="text-2xl font-bold">J</span>
        </div>
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
          Joanna
        </h1>
      </Link>

      {/* Auth card */}
      {children}

      {/* Footer */}
      <p className="mt-8 text-sm text-neutral-500 dark:text-neutral-400">
        &copy; {new Date().getFullYear()} Joanna. All rights reserved.
      </p>
    </div>
  )
}
