'use client'

import * as React from 'react'
import { Bell, Search, Moon, Sun, User, LogOut, Settings } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Dropdown, type DropdownMenuItem } from '@/components/ui/Dropdown'
import { Badge } from '@/components/ui/Badge'

export interface HeaderProps {
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
 * Top header component with search, notifications, and user menu
 *
 * @example
 * ```tsx
 * <Header
 *   user={{ name: 'John Doe', email: 'john@example.com' }}
 *   notificationCount={3}
 *   onLogout={handleLogout}
 * />
 * ```
 */
export function Header({ user, notificationCount = 0, onLogout }: HeaderProps) {
  const [isDark, setIsDark] = React.useState(false)

  const toggleTheme = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle('dark')
  }

  const userMenuItems: DropdownMenuItem[] = [
    {
      id: 'profile',
      label: 'Profile',
      icon: <User className="h-4 w-4" />,
      onClick: () => {
        // Navigate to profile
      },
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="h-4 w-4" />,
      onClick: () => {
        // Navigate to settings
      },
    },
    {
      id: 'separator',
      label: '',
      separator: true,
    },
    {
      id: 'logout',
      label: 'Log out',
      icon: <LogOut className="h-4 w-4" />,
      onClick: onLogout,
    },
  ]

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : 'U'

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-6 dark:border-neutral-800 dark:bg-neutral-900">
      {/* Search */}
      <div className="flex flex-1 items-center gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search tasks, workflows, agents..."
            className={cn(
              'h-10 w-full rounded-lg border border-neutral-300 bg-white pl-10 pr-4 text-sm transition-colors',
              'placeholder:text-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:placeholder:text-neutral-600',
              'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20'
            )}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Notifications */}
        <button
          className="relative rounded-lg p-2 text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger-600 text-xs text-white">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </button>

        {/* User menu */}
        <Dropdown
          trigger={
            <button className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800">
              <Avatar
                src={user?.avatar}
                alt={user?.name || 'User'}
                fallback={userInitials}
                size="sm"
              />
              <div className="hidden text-left lg:block">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {user?.name || 'Guest'}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {user?.email || ''}
                </p>
              </div>
            </button>
          }
          items={userMenuItems}
          align="right"
        />
      </div>
    </header>
  )
}
