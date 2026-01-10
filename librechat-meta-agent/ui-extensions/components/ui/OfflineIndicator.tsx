'use client';

import React, { useState, useEffect, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface OnlineStatus {
  isOnline: boolean;
  wasOffline: boolean;
  lastOnlineAt: Date | null;
  lastOfflineAt: Date | null;
}

export interface UseOnlineStatusOptions {
  /** Polling interval in ms (default: 30000) */
  pollingInterval?: number;
  /** Whether to use polling in addition to events (default: false) */
  enablePolling?: boolean;
  /** URL to ping for connectivity check */
  pingUrl?: string;
  /** Callback when going offline */
  onOffline?: () => void;
  /** Callback when coming back online */
  onOnline?: () => void;
}

export interface OfflineIndicatorProps {
  /** Custom message when offline */
  offlineMessage?: string;
  /** Custom message when back online */
  onlineMessage?: string;
  /** Whether to show a "back online" message briefly (default: true) */
  showOnlineNotification?: boolean;
  /** Duration to show "back online" message in ms (default: 3000) */
  onlineNotificationDuration?: number;
  /** Position of the indicator */
  position?: 'top' | 'bottom';
  /** Custom class name */
  className?: string;
  /** Z-index for the indicator */
  zIndex?: number;
}

// ============================================================================
// useOnlineStatus Hook
// ============================================================================

/**
 * Hook to detect and monitor online/offline status
 * 
 * @example
 * ```tsx
 * const { isOnline, wasOffline } = useOnlineStatus({
 *   onOffline: () => console.log('Lost connection'),
 *   onOnline: () => console.log('Back online'),
 * });
 * ```
 */
export function useOnlineStatus(options?: UseOnlineStatusOptions): OnlineStatus {
  const {
    pollingInterval = 30000,
    enablePolling = false,
    pingUrl,
    onOffline,
    onOnline,
  } = options ?? {};

  const [status, setStatus] = useState<OnlineStatus>(() => ({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    wasOffline: false,
    lastOnlineAt: null,
    lastOfflineAt: null,
  }));

  // Handle going offline
  const handleOffline = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      isOnline: false,
      wasOffline: true,
      lastOfflineAt: new Date(),
    }));
    onOffline?.();
  }, [onOffline]);

  // Handle coming back online
  const handleOnline = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      isOnline: true,
      lastOnlineAt: new Date(),
    }));
    onOnline?.();
  }, [onOnline]);

  // Check connectivity by pinging a URL
  const checkConnectivity = useCallback(async () => {
    if (!pingUrl) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(pingUrl, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok && !status.isOnline) {
        handleOnline();
      }
    } catch {
      if (status.isOnline) {
        handleOffline();
      }
    }
  }, [pingUrl, status.isOnline, handleOnline, handleOffline]);

  useEffect(() => {
    // Set initial state
    if (typeof navigator !== 'undefined') {
      setStatus(prev => ({
        ...prev,
        isOnline: navigator.onLine,
      }));
    }

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Setup polling if enabled
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    if (enablePolling && pingUrl) {
      pollInterval = setInterval(checkConnectivity, pollingInterval);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [handleOnline, handleOffline, enablePolling, pingUrl, pollingInterval, checkConnectivity]);

  return status;
}

// ============================================================================
// OfflineIndicator Component
// ============================================================================

/**
 * A banner component that displays when the user is offline
 * 
 * @example
 * ```tsx
 * <OfflineIndicator
 *   offlineMessage="You're offline. Some features may not work."
 *   position="top"
 * />
 * ```
 */
export function OfflineIndicator({
  offlineMessage = "You're offline. Check your internet connection.",
  onlineMessage = "You're back online!",
  showOnlineNotification = true,
  onlineNotificationDuration = 3000,
  position = 'top',
  className = '',
  zIndex = 50,
}: OfflineIndicatorProps) {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [showOnlineMessage, setShowOnlineMessage] = useState(false);

  // Show "back online" message when coming back online
  useEffect(() => {
    if (isOnline && wasOffline && showOnlineNotification) {
      setShowOnlineMessage(true);
      const timer = setTimeout(() => {
        setShowOnlineMessage(false);
      }, onlineNotificationDuration);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, showOnlineNotification, onlineNotificationDuration]);

  // Don't render anything if online and not showing online message
  if (isOnline && !showOnlineMessage) {
    return null;
  }

  const positionClasses = position === 'top'
    ? 'top-0 left-0 right-0'
    : 'bottom-0 left-0 right-0';

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed ${positionClasses} ${className}`}
      style={{ zIndex }}
    >
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-white px-4 py-3 shadow-lg animate-slideDown">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
            {/* Offline Icon */}
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
              />
            </svg>
            
            <span className="text-sm font-medium">{offlineMessage}</span>

            {/* Pulsing indicator */}
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-200"></span>
            </span>
          </div>
        </div>
      )}

      {/* Back Online Banner */}
      {showOnlineMessage && isOnline && (
        <div className="bg-emerald-500 text-white px-4 py-3 shadow-lg animate-slideDown">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
            {/* Online Icon */}
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
              />
            </svg>
            
            <span className="text-sm font-medium">{onlineMessage}</span>

            {/* Checkmark */}
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Animations */}
      <style jsx>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Offline-aware Wrapper
// ============================================================================

export interface OfflineAwareProps {
  children: React.ReactNode;
  /** Fallback content when offline */
  offlineFallback?: React.ReactNode;
  /** Whether to show children even when offline (default: true) */
  showChildrenWhenOffline?: boolean;
}

/**
 * Wrapper component that shows different content when offline
 */
export function OfflineAware({
  children,
  offlineFallback,
  showChildrenWhenOffline = true,
}: OfflineAwareProps) {
  const { isOnline } = useOnlineStatus();

  if (!isOnline && offlineFallback) {
    return <>{offlineFallback}</>;
  }

  if (!isOnline && !showChildrenWhenOffline) {
    return null;
  }

  return <>{children}</>;
}

// ============================================================================
// Reconnection Handler
// ============================================================================

export interface UseReconnectionOptions {
  /** Callback when reconnected */
  onReconnect: () => void | Promise<void>;
  /** Whether to only run once per session */
  runOnce?: boolean;
}

/**
 * Hook to handle actions when coming back online
 */
export function useReconnection(options: UseReconnectionOptions): void {
  const { onReconnect, runOnce = false } = options;
  const hasReconnected = React.useRef(false);

  useOnlineStatus({
    onOnline: () => {
      if (runOnce && hasReconnected.current) return;
      hasReconnected.current = true;
      onReconnect();
    },
  });
}

export default OfflineIndicator;
