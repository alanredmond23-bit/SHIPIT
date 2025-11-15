'use client'

import * as React from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export interface DashboardLayoutProps {
  /**
   * Page content
   */
  children: React.ReactNode
  /**
   * User information
   */
  user?: {
    name: string
    email: string
    avatar?: string
  }
  /**
   * Number of unread notifications
   */
  notificationCount?: number
  /**
   * Callback when user logs out
   */
  onLogout?: () => void
}

/**
 * Main dashboard layout with sidebar and header
 *
 * @example
 * ```tsx
 * <DashboardLayout
 *   user={{ name: 'John Doe', email: 'john@example.com' }}
 *   onLogout={handleLogout}
 * >
 *   <YourPageContent />
 * </DashboardLayout>
 * ```
 */
export function DashboardLayout({
  children,
  user,
  notificationCount,
  onLogout,
}: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-950">
      {/* Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header
          user={user}
          notificationCount={notificationCount}
          onLogout={onLogout}
        />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
