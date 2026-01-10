'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface AutoSaveOptions<T> {
  /** Unique key for localStorage */
  key: string;
  /** Debounce delay in milliseconds (default: 1000) */
  debounceMs?: number;
  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean;
  /** Transform data before saving */
  serialize?: (data: T) => string;
  /** Transform data after loading */
  deserialize?: (data: string) => T;
  /** Callback when data is saved */
  onSave?: (data: T) => void;
  /** Callback when data is restored */
  onRestore?: (data: T) => void;
  /** Callback when save fails */
  onError?: (error: Error) => void;
  /** Maximum age of saved data in milliseconds (default: 7 days) */
  maxAge?: number;
  /** Version for migration purposes */
  version?: number;
}

export interface AutoSaveReturn<T> {
  /** Whether there is a saved draft */
  hasDraft: boolean;
  /** The saved draft data, if any */
  draft: T | null;
  /** Save data immediately (bypasses debounce) */
  save: (data: T) => void;
  /** Clear the saved draft */
  clear: () => void;
  /** Restore the saved draft (call onRestore) */
  restore: () => T | null;
  /** Whether save is pending */
  isPending: boolean;
  /** Last save timestamp */
  lastSavedAt: Date | null;
}

export interface SavedData<T> {
  data: T;
  timestamp: number;
  version?: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_DEBOUNCE_MS = 1000;
const DEFAULT_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
const STORAGE_PREFIX = 'autosave_';

// ============================================================================
// Storage Utilities
// ============================================================================

function getStorageKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function saveToStorage<T>(
  key: string,
  data: T,
  options: {
    serialize?: (data: T) => string;
    version?: number;
  }
): void {
  if (!isStorageAvailable()) return;

  const savedData: SavedData<T> = {
    data,
    timestamp: Date.now(),
    version: options.version,
  };

  const serialized = options.serialize
    ? options.serialize(savedData as unknown as T)
    : JSON.stringify(savedData);

  localStorage.setItem(getStorageKey(key), serialized);
}

function loadFromStorage<T>(
  key: string,
  options: {
    deserialize?: (data: string) => T;
    maxAge?: number;
    version?: number;
  }
): T | null {
  if (!isStorageAvailable()) return null;

  const stored = localStorage.getItem(getStorageKey(key));
  if (!stored) return null;

  try {
    let savedData: SavedData<T>;

    if (options.deserialize) {
      // Custom deserialize returns the full SavedData
      savedData = options.deserialize(stored) as unknown as SavedData<T>;
    } else {
      savedData = JSON.parse(stored) as SavedData<T>;
    }

    // Check version
    if (options.version !== undefined && savedData.version !== options.version) {
      clearFromStorage(key);
      return null;
    }

    // Check age
    const maxAge = options.maxAge ?? DEFAULT_MAX_AGE;
    if (Date.now() - savedData.timestamp > maxAge) {
      clearFromStorage(key);
      return null;
    }

    return savedData.data;
  } catch {
    clearFromStorage(key);
    return null;
  }
}

function clearFromStorage(key: string): void {
  if (!isStorageAvailable()) return;
  localStorage.removeItem(getStorageKey(key));
}

// ============================================================================
// useAutoSave Hook
// ============================================================================

/**
 * Hook for auto-saving data to localStorage with debouncing
 * 
 * @example
 * ```tsx
 * const { save, clear, hasDraft, draft, restore } = useAutoSave<string>({
 *   key: 'message-draft',
 *   debounceMs: 500,
 *   onRestore: (data) => setMessage(data),
 * });
 * 
 * // Auto-save on change
 * const handleChange = (value: string) => {
 *   setMessage(value);
 *   save(value);
 * };
 * 
 * // Clear on successful send
 * const handleSend = async () => {
 *   await sendMessage(message);
 *   clear();
 * };
 * 
 * // Restore draft on mount
 * useEffect(() => {
 *   if (hasDraft) restore();
 * }, []);
 * ```
 */
export function useAutoSave<T>(options: AutoSaveOptions<T>): AutoSaveReturn<T> {
  const {
    key,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    enabled = true,
    serialize,
    deserialize,
    onSave,
    onRestore,
    onError,
    maxAge = DEFAULT_MAX_AGE,
    version,
  } = options;

  // State
  const [draft, setDraft] = useState<T | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Refs
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingData = useRef<T | null>(null);

  // Load draft on mount
  useEffect(() => {
    if (!enabled) return;

    try {
      const loaded = loadFromStorage<T>(key, {
        deserialize,
        maxAge,
        version,
      });

      if (loaded !== null) {
        setDraft(loaded);
        setHasDraft(true);
      }
    } catch (error) {
      onError?.(error as Error);
    }
  }, [key, enabled, deserialize, maxAge, version, onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        // Save any pending data immediately on unmount
        if (pendingData.current !== null) {
          try {
            saveToStorage(key, pendingData.current, { serialize, version });
          } catch {
            // Ignore errors on unmount
          }
        }
      }
    };
  }, [key, serialize, version]);

  // Internal save function
  const saveImmediate = useCallback((data: T) => {
    if (!enabled) return;

    try {
      saveToStorage(key, data, { serialize, version });
      setDraft(data);
      setHasDraft(true);
      setLastSavedAt(new Date());
      setIsPending(false);
      pendingData.current = null;
      onSave?.(data);
    } catch (error) {
      onError?.(error as Error);
    }
  }, [key, enabled, serialize, version, onSave, onError]);

  // Debounced save function
  const save = useCallback((data: T) => {
    if (!enabled) return;

    pendingData.current = data;
    setIsPending(true);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      saveImmediate(data);
    }, debounceMs);
  }, [enabled, debounceMs, saveImmediate]);

  // Clear saved draft
  const clear = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }

    clearFromStorage(key);
    setDraft(null);
    setHasDraft(false);
    setIsPending(false);
    setLastSavedAt(null);
    pendingData.current = null;
  }, [key]);

  // Restore saved draft
  const restore = useCallback((): T | null => {
    if (!hasDraft || draft === null) return null;

    onRestore?.(draft);
    return draft;
  }, [hasDraft, draft, onRestore]);

  return {
    hasDraft,
    draft,
    save,
    clear,
    restore,
    isPending,
    lastSavedAt,
  };
}

// ============================================================================
// useAutoSaveForm Hook
// ============================================================================

export interface FormAutoSaveOptions<T extends Record<string, unknown>> {
  /** Unique key for localStorage */
  key: string;
  /** Initial form values */
  initialValues: T;
  /** Debounce delay in milliseconds (default: 500) */
  debounceMs?: number;
  /** Fields to exclude from auto-save */
  excludeFields?: (keyof T)[];
  /** Callback when form is restored */
  onRestore?: (values: T) => void;
}

export interface FormAutoSaveReturn<T extends Record<string, unknown>> {
  /** Current form values */
  values: T;
  /** Update a single field */
  setValue: <K extends keyof T>(field: K, value: T[K]) => void;
  /** Update multiple fields */
  setValues: (updates: Partial<T>) => void;
  /** Reset form to initial values and clear draft */
  reset: () => void;
  /** Whether there is a saved draft */
  hasDraft: boolean;
  /** Apply the saved draft */
  applyDraft: () => void;
  /** Dismiss the saved draft without applying */
  dismissDraft: () => void;
}

/**
 * Hook for auto-saving form data with field-level updates
 */
export function useAutoSaveForm<T extends Record<string, unknown>>(
  options: FormAutoSaveOptions<T>
): FormAutoSaveReturn<T> {
  const {
    key,
    initialValues,
    debounceMs = 500,
    excludeFields = [],
    onRestore,
  } = options;

  const [values, setValuesState] = useState<T>(initialValues);
  const [hasDraft, setHasDraft] = useState(false);
  const [savedDraft, setSavedDraft] = useState<T | null>(null);

  // Filter out excluded fields before saving
  const filterValues = useCallback((vals: T): T => {
    if (excludeFields.length === 0) return vals;

    const filtered = { ...vals };
    excludeFields.forEach(field => {
      delete filtered[field];
    });
    return filtered;
  }, [excludeFields]);

  // Use the base auto-save hook
  const {
    save,
    clear,
    draft,
    hasDraft: hasSavedDraft,
  } = useAutoSave<T>({
    key,
    debounceMs,
    onRestore: (data) => {
      setSavedDraft(data);
      setHasDraft(true);
    },
  });

  // Load draft on mount
  useEffect(() => {
    if (hasSavedDraft && draft) {
      setSavedDraft(draft);
      setHasDraft(true);
    }
  }, [hasSavedDraft, draft]);

  // Set a single field value
  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValuesState(prev => {
      const updated = { ...prev, [field]: value };
      save(filterValues(updated));
      return updated;
    });
  }, [save, filterValues]);

  // Set multiple field values
  const setValues = useCallback((updates: Partial<T>) => {
    setValuesState(prev => {
      const updated = { ...prev, ...updates };
      save(filterValues(updated));
      return updated;
    });
  }, [save, filterValues]);

  // Reset form
  const reset = useCallback(() => {
    setValuesState(initialValues);
    setSavedDraft(null);
    setHasDraft(false);
    clear();
  }, [initialValues, clear]);

  // Apply saved draft
  const applyDraft = useCallback(() => {
    if (savedDraft) {
      // Merge draft with initial values (to restore excluded fields)
      const merged = { ...initialValues, ...savedDraft };
      setValuesState(merged);
      onRestore?.(merged);
    }
    setHasDraft(false);
    setSavedDraft(null);
  }, [savedDraft, initialValues, onRestore]);

  // Dismiss draft without applying
  const dismissDraft = useCallback(() => {
    setHasDraft(false);
    setSavedDraft(null);
    clear();
  }, [clear]);

  return {
    values,
    setValue,
    setValues,
    reset,
    hasDraft,
    applyDraft,
    dismissDraft,
  };
}

// ============================================================================
// Draft Recovery UI Component
// ============================================================================

export interface DraftRecoveryBannerProps {
  hasDraft: boolean;
  onRestore: () => void;
  onDismiss: () => void;
  message?: string;
  restoreLabel?: string;
  dismissLabel?: string;
  className?: string;
}

/**
 * A banner component for prompting users to restore a saved draft
 */
export function DraftRecoveryBanner({
  hasDraft,
  onRestore,
  onDismiss,
  message = 'You have an unsaved draft. Would you like to restore it?',
  restoreLabel = 'Restore',
  dismissLabel = 'Dismiss',
  className = '',
}: DraftRecoveryBannerProps) {
  if (!hasDraft) return null;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg ${className}`}
      role="alert"
    >
      <svg
        className="w-5 h-5 text-blue-500 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>

      <span className="flex-1 text-sm text-blue-800">{message}</span>

      <div className="flex items-center gap-2">
        <button
          onClick={onRestore}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          {restoreLabel}
        </button>
        <button
          onClick={onDismiss}
          className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          {dismissLabel}
        </button>
      </div>
    </div>
  );
}

export default useAutoSave;
