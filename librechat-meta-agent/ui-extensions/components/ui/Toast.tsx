'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

// ============================================================================
// Types
// ============================================================================

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition =
  | 'top-right'
  | 'top-left'
  | 'top-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'bottom-center';

export interface ToastData {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: ReactNode;
  title?: string;
}

export interface ToastOptions {
  /** Toast variant (default: 'info') */
  variant?: ToastVariant;
  /** Auto-dismiss duration in ms (default: 5000, 0 = no auto-dismiss) */
  duration?: number;
  /** Whether the toast can be manually dismissed (default: true) */
  dismissible?: boolean;
  /** Action button configuration */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Custom icon */
  icon?: ReactNode;
  /** Optional title above the message */
  title?: string;
}

export interface ToastContextValue {
  toasts: ToastData[];
  toast: (message: string, options?: ToastOptions) => string;
  success: (message: string, options?: Omit<ToastOptions, 'variant'>) => string;
  error: (message: string, options?: Omit<ToastOptions, 'variant'>) => string;
  warning: (message: string, options?: Omit<ToastOptions, 'variant'>) => string;
  info: (message: string, options?: Omit<ToastOptions, 'variant'>) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_DURATION = 5000;
const MAX_TOASTS = 5;

// ============================================================================
// Context
// ============================================================================

const ToastContext = createContext<ToastContextValue | null>(null);

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access toast notifications
 * 
 * @example
 * ```tsx
 * const { toast, success, error } = useToast();
 * 
 * success('File uploaded successfully!');
 * error('Failed to save changes', { duration: 10000 });
 * toast('Custom message', { variant: 'warning', action: { label: 'Undo', onClick: handleUndo } });
 * ```
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// ============================================================================
// Provider
// ============================================================================

export interface ToastProviderProps {
  children: ReactNode;
  /** Position of toast stack (default: 'top-right') */
  position?: ToastPosition;
  /** Maximum number of toasts to show (default: 5) */
  maxToasts?: number;
  /** Default duration for toasts (default: 5000ms) */
  defaultDuration?: number;
}

export function ToastProvider({
  children,
  position = 'top-right',
  maxToasts = MAX_TOASTS,
  defaultDuration = DEFAULT_DURATION,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Handle client-side mounting for portal
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Generate unique ID
  const generateId = useCallback(() => {
    return `toast_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  // Add toast
  const addToast = useCallback(
    (message: string, options?: ToastOptions): string => {
      const id = generateId();
      const toast: ToastData = {
        id,
        message,
        variant: options?.variant ?? 'info',
        duration: options?.duration ?? defaultDuration,
        dismissible: options?.dismissible ?? true,
        action: options?.action,
        icon: options?.icon,
        title: options?.title,
      };

      setToasts(prev => {
        const updated = [toast, ...prev];
        // Limit the number of toasts
        return updated.slice(0, maxToasts);
      });

      return id;
    },
    [generateId, defaultDuration, maxToasts]
  );

  // Dismiss toast
  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Dismiss all toasts
  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const toast = useCallback(
    (message: string, options?: ToastOptions) => addToast(message, options),
    [addToast]
  );

  const success = useCallback(
    (message: string, options?: Omit<ToastOptions, 'variant'>) =>
      addToast(message, { ...options, variant: 'success' }),
    [addToast]
  );

  const error = useCallback(
    (message: string, options?: Omit<ToastOptions, 'variant'>) =>
      addToast(message, { ...options, variant: 'error' }),
    [addToast]
  );

  const warning = useCallback(
    (message: string, options?: Omit<ToastOptions, 'variant'>) =>
      addToast(message, { ...options, variant: 'warning' }),
    [addToast]
  );

  const info = useCallback(
    (message: string, options?: Omit<ToastOptions, 'variant'>) =>
      addToast(message, { ...options, variant: 'info' }),
    [addToast]
  );

  const contextValue: ToastContextValue = {
    toasts,
    toast,
    success,
    error,
    warning,
    info,
    dismiss,
    dismissAll,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {isMounted &&
        createPortal(
          <ToastContainer
            toasts={toasts}
            position={position}
            onDismiss={dismiss}
          />,
          document.body
        )}
    </ToastContext.Provider>
  );
}

// ============================================================================
// Toast Container
// ============================================================================

interface ToastContainerProps {
  toasts: ToastData[];
  position: ToastPosition;
  onDismiss: (id: string) => void;
}

function ToastContainer({ toasts, position, onDismiss }: ToastContainerProps) {
  const positionClasses: Record<ToastPosition, string> = {
    'top-right': 'top-4 right-4 items-end',
    'top-left': 'top-4 left-4 items-start',
    'top-center': 'top-4 left-1/2 -translate-x-1/2 items-center',
    'bottom-right': 'bottom-4 right-4 items-end',
    'bottom-left': 'bottom-4 left-4 items-start',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 items-center',
  };

  const isTop = position.startsWith('top');

  return (
    <div
      className={`fixed flex flex-col gap-2 z-[9999] pointer-events-none ${positionClasses[position]}`}
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast, index) => (
        <Toast
          key={toast.id}
          toast={toast}
          onDismiss={() => onDismiss(toast.id)}
          index={index}
          isTop={isTop}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Individual Toast
// ============================================================================

interface ToastProps {
  toast: ToastData;
  onDismiss: () => void;
  index: number;
  isTop: boolean;
}

function Toast({ toast, onDismiss, index, isTop }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Variant styles
  const variantStyles: Record<
    ToastVariant,
    { bg: string; border: string; icon: string; iconPath: string }
  > = {
    success: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      icon: 'text-emerald-500',
      iconPath: 'M5 13l4 4L19 7',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-500',
      iconPath: 'M6 18L18 6M6 6l12 12',
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: 'text-amber-500',
      iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-500',
      iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
  };

  const styles = variantStyles[toast.variant];

  // Handle enter animation
  useEffect(() => {
    const enterTimer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(enterTimer);
  }, []);

  // Handle auto-dismiss
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      timerRef.current = setTimeout(() => {
        handleDismiss();
      }, toast.duration);

      // Animate progress bar
      if (progressRef.current) {
        progressRef.current.style.transition = `width ${toast.duration}ms linear`;
        progressRef.current.style.width = '0%';
      }

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    }
  }, [toast.duration]);

  // Handle dismiss with animation
  const handleDismiss = useCallback(() => {
    setIsLeaving(true);
    setTimeout(() => {
      onDismiss();
    }, 200);
  }, [onDismiss]);

  // Handle mouse enter (pause timer)
  const handleMouseEnter = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (progressRef.current) {
      progressRef.current.style.transition = 'none';
    }
  }, []);

  // Handle mouse leave (resume timer)
  const handleMouseLeave = useCallback(() => {
    if (toast.duration && toast.duration > 0) {
      // Calculate remaining time based on progress width
      const progressElement = progressRef.current;
      if (progressElement) {
        const computedStyle = window.getComputedStyle(progressElement);
        const currentWidth = parseFloat(computedStyle.width);
        const parentWidth = progressElement.parentElement?.clientWidth ?? 0;
        const remainingPercent = currentWidth / parentWidth;
        const remainingTime = toast.duration * remainingPercent;

        progressElement.style.transition = `width ${remainingTime}ms linear`;
        progressElement.style.width = '0%';

        timerRef.current = setTimeout(() => {
          handleDismiss();
        }, remainingTime);
      }
    }
  }, [toast.duration, handleDismiss]);

  // Animation classes
  const animationClasses = isLeaving
    ? 'opacity-0 scale-95'
    : isVisible
    ? 'opacity-100 scale-100'
    : 'opacity-0 scale-95';

  const translateClass = isTop
    ? isLeaving
      ? '-translate-y-2'
      : isVisible
      ? 'translate-y-0'
      : '-translate-y-2'
    : isLeaving
    ? 'translate-y-2'
    : isVisible
    ? 'translate-y-0'
    : 'translate-y-2';

  return (
    <div
      role="alert"
      className={`
        pointer-events-auto
        min-w-[300px] max-w-md w-full
        ${styles.bg} ${styles.border}
        border rounded-lg shadow-lg
        overflow-hidden
        transform transition-all duration-200 ease-out
        ${animationClasses} ${translateClass}
      `}
      style={{ zIndex: 9999 - index }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          {toast.icon ?? (
            <svg
              className={`w-5 h-5 flex-shrink-0 ${styles.icon}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d={styles.iconPath}
              />
            </svg>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            {toast.title && (
              <p className="text-sm font-semibold text-gray-900 mb-1">
                {toast.title}
              </p>
            )}
            <p className="text-sm text-gray-700">{toast.message}</p>

            {/* Action button */}
            {toast.action && (
              <button
                onClick={() => {
                  toast.action?.onClick();
                  handleDismiss();
                }}
                className="mt-2 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
              >
                {toast.action.label}
              </button>
            )}
          </div>

          {/* Close button */}
          {toast.dismissible && (
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Dismiss notification"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {toast.duration && toast.duration > 0 && (
        <div className="h-1 bg-gray-200">
          <div
            ref={progressRef}
            className={`h-full ${
              toast.variant === 'success'
                ? 'bg-emerald-500'
                : toast.variant === 'error'
                ? 'bg-red-500'
                : toast.variant === 'warning'
                ? 'bg-amber-500'
                : 'bg-blue-500'
            }`}
            style={{ width: '100%' }}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Standalone Toast Function (for use outside React)
// ============================================================================

let globalToastRef: ToastContextValue | null = null;

export function setGlobalToastRef(ref: ToastContextValue | null): void {
  globalToastRef = ref;
}

/**
 * Trigger a toast from anywhere (requires ToastProvider to be mounted)
 */
export const showToast = {
  success: (message: string, options?: Omit<ToastOptions, 'variant'>) => {
    globalToastRef?.success(message, options);
  },
  error: (message: string, options?: Omit<ToastOptions, 'variant'>) => {
    globalToastRef?.error(message, options);
  },
  warning: (message: string, options?: Omit<ToastOptions, 'variant'>) => {
    globalToastRef?.warning(message, options);
  },
  info: (message: string, options?: Omit<ToastOptions, 'variant'>) => {
    globalToastRef?.info(message, options);
  },
  custom: (message: string, options?: ToastOptions) => {
    globalToastRef?.toast(message, options);
  },
  dismiss: (id: string) => {
    globalToastRef?.dismiss(id);
  },
  dismissAll: () => {
    globalToastRef?.dismissAll();
  },
};

// ============================================================================
// Global Toast Provider Connector
// ============================================================================

export function ToastGlobalConnector() {
  const toast = useToast();

  useEffect(() => {
    setGlobalToastRef(toast);
    return () => setGlobalToastRef(null);
  }, [toast]);

  return null;
}

export default Toast;
