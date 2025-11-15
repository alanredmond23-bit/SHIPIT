import * as React from 'react'
import { cn } from '@/lib/utils/cn'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Visual variant of the badge
   */
  variant?:
    | 'default'
    | 'primary'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'danger'
    | 'todo'
    | 'in_progress'
    | 'completed'
  /**
   * Size of the badge
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Whether to show a dot indicator
   */
  dot?: boolean
}

/**
 * Badge component for status indicators and labels
 *
 * @example
 * ```tsx
 * <Badge variant="success">Completed</Badge>
 * <Badge variant="in_progress" dot>In Progress</Badge>
 * ```
 */
const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    { className, variant = 'default', size = 'md', dot = false, children, ...props },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center gap-1.5 rounded-full font-medium transition-colors'

    const variants = {
      default:
        'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
      primary:
        'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
      secondary:
        'bg-secondary-100 text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-300',
      success:
        'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300',
      warning:
        'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300',
      danger:
        'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300',
      todo: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
      in_progress:
        'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
      completed:
        'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300',
    }

    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm',
      lg: 'px-3 py-1.5 text-base',
    }

    const dotColors = {
      default: 'bg-neutral-500',
      primary: 'bg-primary-500',
      secondary: 'bg-secondary-500',
      success: 'bg-success-500',
      warning: 'bg-warning-500',
      danger: 'bg-danger-500',
      todo: 'bg-neutral-500',
      in_progress: 'bg-primary-500',
      completed: 'bg-success-500',
    }

    return (
      <span
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {dot && (
          <span
            className={cn('h-1.5 w-1.5 rounded-full', dotColors[variant])}
            aria-hidden="true"
          />
        )}
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

export { Badge }
