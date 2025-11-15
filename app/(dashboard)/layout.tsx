'use client'

import { DashboardLayout } from '@/components/layout/DashboardLayout'

/**
 * Dashboard layout wrapper
 * Wraps all dashboard pages with sidebar and header
 */
export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // TODO: Get user from auth context/session
  const user = {
    name: 'John Doe',
    email: 'john@example.com',
    avatar: undefined,
  }

  const handleLogout = () => {
    // TODO: Implement logout
    console.log('Logging out...')
  }

  return (
    <DashboardLayout user={user} notificationCount={3} onLogout={handleLogout}>
      {children}
    </DashboardLayout>
  )
}
