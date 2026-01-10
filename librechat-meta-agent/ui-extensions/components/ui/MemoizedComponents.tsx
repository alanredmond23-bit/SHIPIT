'use client';

import React, { memo, useMemo, useCallback } from 'react';

/**
 * MemoizedComponents - Performance-optimized component wrappers
 * 
 * This file provides:
 * - React.memo wrappers with custom comparators for heavy components
 * - Utility hooks for memoization (useMemo, useCallback patterns)
 * - Higher-order components for automatic memoization
 * 
 * Usage:
 * - Import the memoized version instead of the original
 * - Or wrap your own components using the HOC utilities
 */

// ============================================================================
// Types
// ============================================================================

export type MemoComparator<P> = (prevProps: P, nextProps: P) => boolean;

// ============================================================================
// Utility: Deep Comparison Functions
// ============================================================================

/**
 * Shallow comparison for objects (1 level deep)
 */
export function shallowEqual<T extends Record<string, unknown>>(
  objA: T,
  objB: T
): boolean {
  if (objA === objB) return true;
  if (!objA || !objB) return false;

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (objA[key] !== objB[key]) return false;
  }

  return true;
}

/**
 * Deep comparison for objects (recursive)
 * Use sparingly - only when necessary
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (typeof a !== typeof b) return false;

  if (a === null || b === null) return a === b;

  if (typeof a !== 'object') return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);

  if (keysA.length !== keysB.length) return false;

  return keysA.every((key) =>
    deepEqual(
      (a as Record<string, unknown>)[key],
      (b as Record<string, unknown>)[key]
    )
  );
}

/**
 * Compare specific keys only
 */
export function compareKeys<T extends Record<string, unknown>>(
  keys: (keyof T)[]
): MemoComparator<T> {
  return (prevProps: T, nextProps: T) => {
    for (const key of keys) {
      if (prevProps[key] !== nextProps[key]) return false;
    }
    return true;
  };
}

/**
 * Compare all keys except specific ones
 */
export function compareExceptKeys<T extends Record<string, unknown>>(
  excludeKeys: (keyof T)[]
): MemoComparator<T> {
  return (prevProps: T, nextProps: T) => {
    const keys = Object.keys(prevProps) as (keyof T)[];
    for (const key of keys) {
      if (excludeKeys.includes(key)) continue;
      if (prevProps[key] !== nextProps[key]) return false;
    }
    return true;
  };
}

// ============================================================================
// Higher-Order Component: withMemo
// ============================================================================

/**
 * HOC to wrap any component with React.memo and optional custom comparator
 */
export function withMemo<P extends object>(
  Component: React.ComponentType<P>,
  comparator?: MemoComparator<P>,
  displayName?: string
): React.MemoExoticComponent<React.ComponentType<P>> {
  const MemoizedComponent = memo(Component, comparator);
  MemoizedComponent.displayName = displayName || `Memo(${Component.displayName || Component.name || 'Component'})`;
  return MemoizedComponent;
}

/**
 * HOC to wrap with memo and exclude callback props from comparison
 * (Useful when callbacks change reference but don't affect rendering)
 */
export function withMemoExcludingCallbacks<P extends object>(
  Component: React.ComponentType<P>,
  displayName?: string
): React.MemoExoticComponent<React.ComponentType<P>> {
  const comparator: MemoComparator<P> = (prevProps, nextProps) => {
    const keys = Object.keys(prevProps) as (keyof P)[];
    for (const key of keys) {
      const prev = prevProps[key];
      const next = nextProps[key];
      // Skip function comparison (callbacks)
      if (typeof prev === 'function' && typeof next === 'function') continue;
      if (prev !== next) return false;
    }
    return true;
  };

  return withMemo(Component, comparator, displayName);
}

// ============================================================================
// Memoized Wrapper Components
// ============================================================================

/**
 * MemoizedContainer - A memoized container for expensive child rendering
 */
interface MemoizedContainerProps {
  children: React.ReactNode;
  deps: unknown[];
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export const MemoizedContainer = memo(
  function MemoizedContainer({
    children,
    className,
    as: Component = 'div',
  }: MemoizedContainerProps) {
    return <Component className={className}>{children}</Component>;
  },
  (prevProps, nextProps) => {
    // Only re-render if deps change
    if (prevProps.deps.length !== nextProps.deps.length) return false;
    return prevProps.deps.every((dep, i) => dep === nextProps.deps[i]);
  }
);

/**
 * MemoizedList - Memoized list rendering with key-based item tracking
 */
interface MemoizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  className?: string;
  itemClassName?: string;
}

function MemoizedListInner<T>({
  items,
  renderItem,
  keyExtractor,
  className,
  itemClassName,
}: MemoizedListProps<T>) {
  const renderedItems = useMemo(
    () =>
      items.map((item, index) => (
        <div key={keyExtractor(item, index)} className={itemClassName}>
          {renderItem(item, index)}
        </div>
      )),
    [items, renderItem, keyExtractor, itemClassName]
  );

  return <div className={className}>{renderedItems}</div>;
}

export const MemoizedList = memo(MemoizedListInner) as <T>(
  props: MemoizedListProps<T>
) => React.ReactElement;

// ============================================================================
// Custom Hooks for Performance
// ============================================================================

/**
 * useMemoizedCallback - Like useCallback but with deep comparison of deps
 */
export function useMemoizedCallback<T extends (...args: never[]) => unknown>(
  callback: T,
  deps: unknown[]
): T {
  const callbackRef = React.useRef(callback);
  const depsRef = React.useRef(deps);

  if (!deepEqual(depsRef.current, deps)) {
    callbackRef.current = callback;
    depsRef.current = deps;
  }

  return useCallback(
    ((...args) => callbackRef.current(...args)) as T,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
}

/**
 * usePrevious - Track previous value of a prop/state
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = React.useRef<T | undefined>(undefined);

  React.useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * useDeepMemo - Like useMemo but with deep comparison of deps
 */
export function useDeepMemo<T>(factory: () => T, deps: unknown[]): T {
  const depsRef = React.useRef(deps);
  const valueRef = React.useRef<T | undefined>(undefined);

  if (valueRef.current === undefined || !deepEqual(depsRef.current, deps)) {
    valueRef.current = factory();
    depsRef.current = deps;
  }

  return valueRef.current;
}

/**
 * useStableCallback - Callback that maintains stable reference
 */
export function useStableCallback<T extends (...args: never[]) => unknown>(
  callback: T
): T {
  const callbackRef = React.useRef(callback);
  callbackRef.current = callback;

  return useCallback(
    ((...args) => callbackRef.current(...args)) as T,
    []
  );
}

/**
 * useEventCallback - Event handler with stable reference but fresh closure
 */
export function useEventCallback<T extends (...args: never[]) => unknown>(
  callback: T
): T {
  const callbackRef = React.useRef(callback);

  React.useLayoutEffect(() => {
    callbackRef.current = callback;
  });

  return useCallback(
    ((...args) => callbackRef.current(...args)) as T,
    []
  );
}

// ============================================================================
// Memoized Expensive Computations Helper
// ============================================================================

/**
 * ExpensiveComputation - Component that memoizes expensive renders
 */
interface ExpensiveComputationProps<T> {
  compute: () => T;
  deps: unknown[];
  render: (result: T) => React.ReactNode;
}

export function ExpensiveComputation<T>({
  compute,
  deps,
  render,
}: ExpensiveComputationProps<T>) {
  const result = useMemo(compute, deps);
  return <>{render(result)}</>;
}

// ============================================================================
// Performance Debugging Utilities
// ============================================================================

/**
 * useRenderCount - Track component render count (dev only)
 */
export function useRenderCount(componentName: string): void {
  const countRef = React.useRef(0);
  countRef.current += 1;

  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Render Count] ${componentName}: ${countRef.current}`);
    }
  });
}

/**
 * useWhyDidYouUpdate - Debug what props changed (dev only)
 */
export function useWhyDidYouUpdate<P extends Record<string, unknown>>(
  componentName: string,
  props: P
): void {
  const previousProps = usePrevious(props);

  React.useEffect(() => {
    if (previousProps && process.env.NODE_ENV === 'development') {
      const allKeys = Object.keys({ ...previousProps, ...props }) as (keyof P)[];
      const changesObj: Partial<Record<keyof P, { from: unknown; to: unknown }>> = {};

      allKeys.forEach((key) => {
        if (previousProps[key] !== props[key]) {
          changesObj[key] = {
            from: previousProps[key],
            to: props[key],
          };
        }
      });

      if (Object.keys(changesObj).length) {
        console.log(`[Why Update] ${componentName}:`, changesObj);
      }
    }
  });
}

export default {
  withMemo,
  withMemoExcludingCallbacks,
  shallowEqual,
  deepEqual,
  compareKeys,
  compareExceptKeys,
  MemoizedContainer,
  MemoizedList,
  ExpensiveComputation,
};
