'use client'

import * as React from 'react'
import { Check, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface DropdownMenuItem {
  /**
   * Unique identifier for the item
   */
  id: string
  /**
   * Label to display
   */
  label: string
  /**
   * Icon to display before the label
   */
  icon?: React.ReactNode
  /**
   * Keyboard shortcut to display
   */
  shortcut?: string
  /**
   * Whether the item is disabled
   */
  disabled?: boolean
  /**
   * Whether the item is a separator
   */
  separator?: boolean
  /**
   * Submenu items
   */
  submenu?: DropdownMenuItem[]
  /**
   * Click handler
   */
  onClick?: () => void
}

export interface DropdownProps {
  /**
   * Trigger element
   */
  trigger: React.ReactNode
  /**
   * Menu items
   */
  items: DropdownMenuItem[]
  /**
   * Alignment of the dropdown
   */
  align?: 'left' | 'right'
  /**
   * Additional className for the menu
   */
  className?: string
}

/**
 * Dropdown menu component with support for icons, shortcuts, and submenus
 *
 * @example
 * ```tsx
 * <Dropdown
 *   trigger={<Button>Options</Button>}
 *   items={[
 *     { id: '1', label: 'Edit', icon: <EditIcon />, onClick: handleEdit },
 *     { id: '2', label: 'Delete', icon: <TrashIcon />, onClick: handleDelete },
 *   ]}
 * />
 * ```
 */
export function Dropdown({ trigger, items, align = 'left', className }: DropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleItemClick = (item: DropdownMenuItem) => {
    if (item.disabled || item.separator) return

    item.onClick?.()
    if (!item.submenu) {
      setIsOpen(false)
    }
  }

  return (
    <div ref={dropdownRef} className="relative inline-block">
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-2 w-56 rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900 animate-slide-up',
            align === 'right' ? 'right-0' : 'left-0',
            className
          )}
          role="menu"
          aria-orientation="vertical"
        >
          <div className="p-1">
            {items.map((item) => (
              <React.Fragment key={item.id}>
                {item.separator ? (
                  <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-800" />
                ) : (
                  <button
                    onClick={() => handleItemClick(item)}
                    disabled={item.disabled}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600',
                      item.disabled
                        ? 'cursor-not-allowed opacity-50'
                        : 'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                      'text-neutral-700 dark:text-neutral-300'
                    )}
                    role="menuitem"
                  >
                    {item.icon && (
                      <span className="flex-shrink-0 text-neutral-500">
                        {item.icon}
                      </span>
                    )}
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.shortcut && (
                      <span className="text-xs text-neutral-400">
                        {item.shortcut}
                      </span>
                    )}
                    {item.submenu && (
                      <ChevronRight className="h-4 w-4 text-neutral-400" />
                    )}
                  </button>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Dropdown menu item component for more control
 */
export function DropdownItem({
  children,
  onClick,
  disabled = false,
  className,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600',
        disabled
          ? 'cursor-not-allowed opacity-50'
          : 'hover:bg-neutral-100 dark:hover:bg-neutral-800',
        'text-neutral-700 dark:text-neutral-300',
        className
      )}
      role="menuitem"
    >
      {children}
    </button>
  )
}
