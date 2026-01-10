'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  ImgHTMLAttributes,
  forwardRef,
} from 'react';
import clsx from 'clsx';

/**
 * OptimizedImage - Performance-optimized image component
 * 
 * Features:
 * - Lazy loading with IntersectionObserver
 * - Blur-up placeholder effect
 * - Loading skeleton/placeholder
 * - Error fallback with retry
 * - Fade-in animation on load
 * - Native lazy loading fallback
 * - LQIP (Low Quality Image Placeholder) support
 * - Responsive sizing helpers
 */

// ============================================================================
// Types
// ============================================================================

export type ImageFit = 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
export type ImageLoading = 'lazy' | 'eager';

export interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'placeholder' | 'onLoad' | 'onError'> {
  /** Image source URL */
  src: string;
  /** Alt text (required for accessibility) */
  alt: string;
  /** Width of the image */
  width?: number | string;
  /** Height of the image */
  height?: number | string;
  /** How the image should fit its container */
  objectFit?: ImageFit;
  /** Object position */
  objectPosition?: string;
  /** Placeholder type */
  placeholder?: 'blur' | 'skeleton' | 'color' | 'none';
  /** Low quality placeholder image URL */
  blurDataURL?: string;
  /** Placeholder background color */
  placeholderColor?: string;
  /** Loading behavior */
  loading?: ImageLoading;
  /** Priority loading (preload) */
  priority?: boolean;
  /** Root margin for intersection observer */
  rootMargin?: string;
  /** Threshold for intersection observer */
  threshold?: number;
  /** Show loading spinner */
  showSpinner?: boolean;
  /** Duration of fade-in animation (ms) */
  fadeInDuration?: number;
  /** Fallback image on error */
  fallbackSrc?: string;
  /** Error fallback component */
  errorFallback?: React.ReactNode;
  /** Callback when image loads */
  onLoad?: () => void;
  /** Callback when image fails to load */
  onError?: (error: Error) => void;
  /** Additional container class */
  containerClassName?: string;
  /** Aspect ratio (e.g., "16/9", "1/1") */
  aspectRatio?: string;
  /** Enable retry on error */
  retryOnError?: boolean;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Retry delay in ms */
  retryDelay?: number;
}

// ============================================================================
// Helper Components
// ============================================================================

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={clsx('absolute inset-0 flex items-center justify-center', className)}>
      <div className="w-8 h-8 border-2 border-stone-200 border-t-teal-500 rounded-full animate-spin" />
    </div>
  );
}

function SkeletonPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'absolute inset-0 bg-gradient-to-r from-stone-200 via-stone-100 to-stone-200 animate-pulse',
        className
      )}
    />
  );
}

function ErrorPlaceholder({
  onRetry,
  className,
}: {
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'absolute inset-0 flex flex-col items-center justify-center bg-stone-100 text-stone-500',
        className
      )}
    >
      <svg
        className="w-12 h-12 mb-2 opacity-50"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      <span className="text-sm">Failed to load</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-3 py-1 text-xs font-medium text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-md transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

// ============================================================================
// OptimizedImage Component
// ============================================================================

export const OptimizedImage = forwardRef<HTMLImageElement, OptimizedImageProps>(
  function OptimizedImage(
    {
      src,
      alt,
      width,
      height,
      objectFit = 'cover',
      objectPosition = 'center',
      placeholder = 'skeleton',
      blurDataURL,
      placeholderColor = '#e5e5e5',
      loading = 'lazy',
      priority = false,
      rootMargin = '200px',
      threshold = 0,
      showSpinner = false,
      fadeInDuration = 300,
      fallbackSrc,
      errorFallback,
      onLoad,
      onError,
      className,
      containerClassName,
      aspectRatio,
      retryOnError = true,
      maxRetries = 2,
      retryDelay = 1000,
      style,
      ...imgProps
    },
    ref
  ) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isError, setIsError] = useState(false);
    const [isInView, setIsInView] = useState(priority || loading === 'eager');
    const [currentSrc, setCurrentSrc] = useState(src);
    const [retryCount, setRetryCount] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    // Combine refs
    useEffect(() => {
      if (ref) {
        if (typeof ref === 'function') {
          ref(imgRef.current);
        } else {
          ref.current = imgRef.current;
        }
      }
    }, [ref]);

    // Update src when prop changes
    useEffect(() => {
      setCurrentSrc(src);
      setIsLoaded(false);
      setIsError(false);
      setRetryCount(0);
    }, [src]);

    // Intersection Observer for lazy loading
    useEffect(() => {
      if (priority || loading === 'eager' || isInView) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        },
        { rootMargin, threshold }
      );

      if (containerRef.current) {
        observer.observe(containerRef.current);
      }

      return () => observer.disconnect();
    }, [priority, loading, rootMargin, threshold, isInView]);

    // Preload priority images
    useEffect(() => {
      if (priority && typeof window !== 'undefined') {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        document.head.appendChild(link);
        return () => {
          document.head.removeChild(link);
        };
      }
    }, [priority, src]);

    // Handle image load
    const handleLoad = useCallback(() => {
      setIsLoaded(true);
      setIsError(false);
      onLoad?.();
    }, [onLoad]);

    // Handle image error
    const handleError = useCallback(() => {
      // Try fallback first
      if (fallbackSrc && currentSrc !== fallbackSrc) {
        setCurrentSrc(fallbackSrc);
        return;
      }

      // Try retry
      if (retryOnError && retryCount < maxRetries) {
        setTimeout(() => {
          setRetryCount((c) => c + 1);
          setCurrentSrc(`${src}?retry=${retryCount + 1}`);
        }, retryDelay);
        return;
      }

      setIsError(true);
      onError?.(new Error(`Failed to load image: ${src}`));
    }, [
      currentSrc,
      fallbackSrc,
      maxRetries,
      onError,
      retryCount,
      retryDelay,
      retryOnError,
      src,
    ]);

    // Retry handler
    const handleRetry = useCallback(() => {
      setIsError(false);
      setRetryCount(0);
      setCurrentSrc(src);
    }, [src]);

    // Container styles
    const containerStyles: React.CSSProperties = {
      position: 'relative',
      overflow: 'hidden',
      ...(width ? { width } : {}),
      ...(height ? { height } : {}),
      ...(aspectRatio ? { aspectRatio } : {}),
    };

    // Image styles
    const imageStyles: React.CSSProperties = {
      objectFit,
      objectPosition,
      opacity: isLoaded ? 1 : 0,
      transition: `opacity ${fadeInDuration}ms ease-in-out`,
      ...style,
    };

    // Render placeholder
    const renderPlaceholder = () => {
      if (isLoaded) return null;

      switch (placeholder) {
        case 'blur':
          return (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: blurDataURL ? `url(${blurDataURL})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(20px)',
                transform: 'scale(1.1)',
                backgroundColor: blurDataURL ? undefined : placeholderColor,
              }}
            />
          );
        case 'skeleton':
          return <SkeletonPlaceholder />;
        case 'color':
          return (
            <div
              className="absolute inset-0"
              style={{ backgroundColor: placeholderColor }}
            />
          );
        case 'none':
        default:
          return null;
      }
    };

    return (
      <div
        ref={containerRef}
        className={clsx('relative', containerClassName)}
        style={containerStyles}
      >
        {/* Placeholder */}
        {!isError && renderPlaceholder()}

        {/* Loading spinner */}
        {showSpinner && !isLoaded && !isError && <LoadingSpinner />}

        {/* Error state */}
        {isError && (
          errorFallback || (
            <ErrorPlaceholder onRetry={retryOnError ? handleRetry : undefined} />
          )
        )}

        {/* Image */}
        {isInView && !isError && (
          <img
            ref={imgRef}
            src={currentSrc}
            alt={alt}
            width={typeof width === 'number' ? width : undefined}
            height={typeof height === 'number' ? height : undefined}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={handleLoad}
            onError={handleError}
            className={clsx('w-full h-full', className)}
            style={imageStyles}
            {...imgProps}
          />
        )}
      </div>
    );
  }
);

// ============================================================================
// Avatar Image - Optimized for profile pictures
// ============================================================================

export interface AvatarImageProps extends Omit<OptimizedImageProps, 'objectFit'> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  rounded?: boolean | 'full' | 'lg' | 'md' | 'sm';
  fallbackInitials?: string;
}

const sizeMap = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

export function AvatarImage({
  size = 'md',
  rounded = 'full',
  fallbackInitials,
  alt,
  className,
  containerClassName,
  ...props
}: AvatarImageProps) {
  const dimension = typeof size === 'number' ? size : sizeMap[size];
  
  const roundedClass = rounded === true || rounded === 'full'
    ? 'rounded-full'
    : rounded === 'lg'
    ? 'rounded-lg'
    : rounded === 'md'
    ? 'rounded-md'
    : rounded === 'sm'
    ? 'rounded-sm'
    : 'rounded-none';

  const fallback = fallbackInitials ? (
    <div
      className={clsx(
        'absolute inset-0 flex items-center justify-center bg-teal-500 text-white font-medium',
        roundedClass
      )}
      style={{ fontSize: dimension * 0.4 }}
    >
      {fallbackInitials.slice(0, 2).toUpperCase()}
    </div>
  ) : undefined;

  return (
    <OptimizedImage
      {...props}
      alt={alt}
      width={dimension}
      height={dimension}
      objectFit="cover"
      placeholder="skeleton"
      errorFallback={fallback}
      className={clsx(roundedClass, className)}
      containerClassName={clsx(roundedClass, containerClassName)}
    />
  );
}

// ============================================================================
// Background Image - Optimized for background use
// ============================================================================

export interface BackgroundImageProps {
  src: string;
  alt?: string;
  children?: React.ReactNode;
  className?: string;
  overlayClassName?: string;
  overlay?: boolean | string;
  blurDataURL?: string;
  loading?: ImageLoading;
  priority?: boolean;
}

export function BackgroundImage({
  src,
  alt = '',
  children,
  className,
  overlayClassName,
  overlay = false,
  blurDataURL,
  loading = 'lazy',
  priority = false,
}: BackgroundImageProps) {
  const overlayBg = typeof overlay === 'string' ? overlay : 'bg-black/40';

  return (
    <div className={clsx('relative overflow-hidden', className)}>
      <OptimizedImage
        src={src}
        alt={alt}
        className="absolute inset-0 w-full h-full"
        objectFit="cover"
        blurDataURL={blurDataURL}
        placeholder={blurDataURL ? 'blur' : 'skeleton'}
        loading={loading}
        priority={priority}
        aria-hidden="true"
      />
      
      {overlay && (
        <div className={clsx('absolute inset-0', overlayBg, overlayClassName)} />
      )}
      
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// ============================================================================
// Image Gallery Item - For galleries/grids
// ============================================================================

export interface GalleryImageProps extends OptimizedImageProps {
  onClick?: () => void;
  selected?: boolean;
}

export function GalleryImage({
  onClick,
  selected = false,
  className,
  containerClassName,
  ...props
}: GalleryImageProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'group relative overflow-hidden rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2',
        selected && 'ring-2 ring-teal-500 ring-offset-2',
        containerClassName
      )}
    >
      <OptimizedImage
        {...props}
        className={clsx(
          'transition-transform duration-300 group-hover:scale-105',
          className
        )}
      />
      
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      
      {/* Selection indicator */}
      {selected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  );
}

export default OptimizedImage;
