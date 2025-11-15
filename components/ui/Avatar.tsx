import * as React from 'react'
import { cn } from '@/lib/utils/cn'

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Source URL for the avatar image
   */
  src?: string
  /**
   * Alt text for the avatar image
   */
  alt?: string
  /**
   * Fallback text (usually initials) when image is not available
   */
  fallback?: string
  /**
   * Size of the avatar
   */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /**
   * Shape of the avatar
   */
  shape?: 'circle' | 'square'
}

/**
 * Avatar component with image and fallback initials
 *
 * @example
 * ```tsx
 * <Avatar src="/user.jpg" alt="John Doe" fallback="JD" />
 * <Avatar fallback="AB" size="lg" />
 * ```
 */
const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      className,
      src,
      alt = '',
      fallback,
      size = 'md',
      shape = 'circle',
      ...props
    },
    ref
  ) => {
    const [imageError, setImageError] = React.useState(false)

    const sizes = {
      sm: 'h-8 w-8 text-xs',
      md: 'h-10 w-10 text-sm',
      lg: 'h-12 w-12 text-base',
      xl: 'h-16 w-16 text-lg',
    }

    const shapes = {
      circle: 'rounded-full',
      square: 'rounded-lg',
    }

    const showImage = src && !imageError

    return (
      <div
        ref={ref}
        className={cn(
          'relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-neutral-200 font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
          sizes[size],
          shapes[shape],
          className
        )}
        {...props}
      >
        {showImage ? (
          <img
            src={src}
            alt={alt}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className="select-none uppercase">
            {fallback || alt?.slice(0, 2) || '?'}
          </span>
        )}
      </div>
    )
  }
)

Avatar.displayName = 'Avatar'

export { Avatar }
