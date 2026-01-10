'use client';

import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import clsx from 'clsx';

/**
 * VirtualList - Virtualized scrolling for long lists
 * 
 * Features:
 * - Only renders visible items + overscan buffer
 * - Supports fixed and variable height items
 * - Smooth scrolling with momentum
 * - Scroll to index functionality
 * - Keyboard navigation support
 * - Loading states for infinite scroll
 */

// ============================================================================
// Types
// ============================================================================

export interface VirtualListItem {
  id: string;
  height?: number; // Optional: for variable height items
}

export interface VirtualListProps<T extends VirtualListItem> {
  /** Array of items to render */
  items: T[];
  /** Default height for items (used for fixed height or initial estimate) */
  itemHeight: number;
  /** Height of the container */
  height: number;
  /** Width of the container */
  width?: number | string;
  /** Number of items to render above/below visible area */
  overscan?: number;
  /** Render function for each item */
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  /** Called when scroll reaches near the end (for infinite scroll) */
  onEndReached?: () => void;
  /** Threshold for triggering onEndReached (0-1, default 0.8) */
  endReachedThreshold?: number;
  /** Whether more items are loading */
  isLoading?: boolean;
  /** Loading indicator component */
  loadingComponent?: React.ReactNode;
  /** Empty state component */
  emptyComponent?: React.ReactNode;
  /** Additional CSS class for container */
  className?: string;
  /** Enable smooth scrolling */
  smoothScroll?: boolean;
  /** Gap between items */
  gap?: number;
  /** Padding inside the container */
  padding?: number;
  /** Enable variable height mode (requires height on each item) */
  variableHeight?: boolean;
  /** Callback when visible range changes */
  onVisibleRangeChange?: (startIndex: number, endIndex: number) => void;
  /** Initial scroll offset */
  initialScrollOffset?: number;
  /** Initial scroll to index */
  initialScrollIndex?: number;
}

export interface VirtualListHandle {
  scrollToIndex: (index: number, behavior?: ScrollBehavior) => void;
  scrollToOffset: (offset: number, behavior?: ScrollBehavior) => void;
  scrollToTop: (behavior?: ScrollBehavior) => void;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  getVisibleRange: () => { startIndex: number; endIndex: number };
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateFixedHeightRange<T extends VirtualListItem>(
  items: T[],
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  overscan: number,
  gap: number
): { startIndex: number; endIndex: number; offsetY: number } {
  const totalItemHeight = itemHeight + gap;
  const startIndex = Math.max(0, Math.floor(scrollTop / totalItemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / totalItemHeight);
  const endIndex = Math.min(items.length - 1, startIndex + visibleCount + overscan * 2);
  const offsetY = startIndex * totalItemHeight;

  return { startIndex, endIndex, offsetY };
}

function calculateVariableHeightRange<T extends VirtualListItem>(
  items: T[],
  scrollTop: number,
  containerHeight: number,
  defaultItemHeight: number,
  overscan: number,
  gap: number,
  measuredHeights: Map<string, number>
): { startIndex: number; endIndex: number; offsetY: number; itemOffsets: number[] } {
  const itemOffsets: number[] = [];
  let currentOffset = 0;

  // Calculate offsets for all items
  for (let i = 0; i < items.length; i++) {
    itemOffsets.push(currentOffset);
    const measuredHeight = measuredHeights.get(items[i].id);
    const height = measuredHeight ?? items[i].height ?? defaultItemHeight;
    currentOffset += height + gap;
  }

  // Find start index (first item that ends after scrollTop)
  let startIndex = 0;
  for (let i = 0; i < items.length; i++) {
    const measuredHeight = measuredHeights.get(items[i].id);
    const height = measuredHeight ?? items[i].height ?? defaultItemHeight;
    if (itemOffsets[i] + height >= scrollTop) {
      startIndex = Math.max(0, i - overscan);
      break;
    }
  }

  // Find end index (first item that starts after scrollTop + containerHeight)
  let endIndex = items.length - 1;
  for (let i = startIndex; i < items.length; i++) {
    if (itemOffsets[i] > scrollTop + containerHeight) {
      endIndex = Math.min(items.length - 1, i + overscan);
      break;
    }
  }

  return {
    startIndex,
    endIndex,
    offsetY: itemOffsets[startIndex] || 0,
    itemOffsets,
  };
}

// ============================================================================
// VirtualList Component
// ============================================================================

function VirtualListInner<T extends VirtualListItem>(
  props: VirtualListProps<T>,
  ref: React.Ref<VirtualListHandle>
) {
  const {
    items,
    itemHeight,
    height,
    width = '100%',
    overscan = 3,
    renderItem,
    onEndReached,
    endReachedThreshold = 0.8,
    isLoading = false,
    loadingComponent,
    emptyComponent,
    className,
    smoothScroll = true,
    gap = 0,
    padding = 0,
    variableHeight = false,
    onVisibleRangeChange,
    initialScrollOffset,
    initialScrollIndex,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [measuredHeights] = useState<Map<string, number>>(() => new Map());
  const lastEndReachedRef = useRef(false);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    if (variableHeight) {
      return calculateVariableHeightRange(
        items,
        scrollTop,
        height - padding * 2,
        itemHeight,
        overscan,
        gap,
        measuredHeights
      );
    }
    return {
      ...calculateFixedHeightRange(
        items,
        scrollTop,
        height - padding * 2,
        itemHeight,
        overscan,
        gap
      ),
      itemOffsets: [] as number[],
    };
  }, [items, scrollTop, height, itemHeight, overscan, gap, padding, variableHeight, measuredHeights]);

  const { startIndex, endIndex, offsetY, itemOffsets } = visibleRange;

  // Calculate total height
  const totalHeight = useMemo(() => {
    if (variableHeight && itemOffsets.length > 0) {
      const lastIndex = items.length - 1;
      if (lastIndex >= 0) {
        const lastMeasuredHeight = measuredHeights.get(items[lastIndex].id);
        const lastHeight = lastMeasuredHeight ?? items[lastIndex].height ?? itemHeight;
        return itemOffsets[lastIndex] + lastHeight + gap;
      }
      return 0;
    }
    return items.length * (itemHeight + gap) - gap;
  }, [items, itemHeight, gap, variableHeight, itemOffsets, measuredHeights]);

  // Handle scroll
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      const newScrollTop = target.scrollTop;
      setScrollTop(newScrollTop);

      // Check if we should trigger onEndReached
      if (onEndReached && !isLoading) {
        const scrollHeight = target.scrollHeight;
        const clientHeight = target.clientHeight;
        const scrollPercentage = (newScrollTop + clientHeight) / scrollHeight;

        if (scrollPercentage >= endReachedThreshold && !lastEndReachedRef.current) {
          lastEndReachedRef.current = true;
          onEndReached();
        } else if (scrollPercentage < endReachedThreshold) {
          lastEndReachedRef.current = false;
        }
      }
    },
    [onEndReached, endReachedThreshold, isLoading]
  );

  // Notify visible range changes
  useEffect(() => {
    onVisibleRangeChange?.(startIndex, endIndex);
  }, [startIndex, endIndex, onVisibleRangeChange]);

  // Initial scroll
  useEffect(() => {
    if (containerRef.current) {
      if (initialScrollIndex !== undefined && initialScrollIndex >= 0) {
        const offset = variableHeight && itemOffsets.length > initialScrollIndex
          ? itemOffsets[initialScrollIndex]
          : initialScrollIndex * (itemHeight + gap);
        containerRef.current.scrollTop = offset;
      } else if (initialScrollOffset !== undefined) {
        containerRef.current.scrollTop = initialScrollOffset;
      }
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    scrollToIndex: (index: number, behavior: ScrollBehavior = 'smooth') => {
      if (containerRef.current && index >= 0 && index < items.length) {
        const offset = variableHeight && itemOffsets.length > index
          ? itemOffsets[index]
          : index * (itemHeight + gap);
        containerRef.current.scrollTo({
          top: offset,
          behavior: smoothScroll ? behavior : 'auto',
        });
      }
    },
    scrollToOffset: (offset: number, behavior: ScrollBehavior = 'smooth') => {
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: offset,
          behavior: smoothScroll ? behavior : 'auto',
        });
      }
    },
    scrollToTop: (behavior: ScrollBehavior = 'smooth') => {
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: 0,
          behavior: smoothScroll ? behavior : 'auto',
        });
      }
    },
    scrollToBottom: (behavior: ScrollBehavior = 'smooth') => {
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: totalHeight,
          behavior: smoothScroll ? behavior : 'auto',
        });
      }
    },
    getVisibleRange: () => ({ startIndex, endIndex }),
  }));

  // Render visible items
  const visibleItems = useMemo(() => {
    const result: React.ReactNode[] = [];

    for (let i = startIndex; i <= endIndex && i < items.length; i++) {
      const item = items[i];
      const measuredHeight = measuredHeights.get(item.id);
      const itemHeightValue = variableHeight
        ? (measuredHeight ?? item.height ?? itemHeight)
        : itemHeight;

      const style: React.CSSProperties = {
        position: 'absolute',
        top: variableHeight && itemOffsets[i] !== undefined
          ? itemOffsets[i]
          : i * (itemHeight + gap),
        left: 0,
        right: 0,
        height: itemHeightValue,
      };

      result.push(renderItem(item, i, style));
    }

    return result;
  }, [items, startIndex, endIndex, renderItem, itemHeight, gap, variableHeight, itemOffsets, measuredHeights]);

  // Empty state
  if (items.length === 0 && !isLoading) {
    return (
      <div
        className={clsx('flex items-center justify-center', className)}
        style={{ height, width }}
      >
        {emptyComponent || (
          <p className="text-stone-500 text-sm">No items to display</p>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={clsx(
        'overflow-auto',
        smoothScroll && 'scroll-smooth',
        className
      )}
      style={{ height, width }}
    >
      <div
        style={{
          position: 'relative',
          height: totalHeight + padding * 2,
          padding,
        }}
      >
        {visibleItems}
      </div>
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          {loadingComponent || (
            <div className="flex items-center gap-2 text-stone-500">
              <div className="w-5 h-5 border-2 border-stone-300 border-t-teal-500 rounded-full animate-spin" />
              <span className="text-sm">Loading more...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Export with proper typing for generics
export const VirtualList = forwardRef(VirtualListInner) as <T extends VirtualListItem>(
  props: VirtualListProps<T> & { ref?: React.Ref<VirtualListHandle> }
) => React.ReactElement;

// ============================================================================
// Simple Virtual List (for common use cases)
// ============================================================================

export interface SimpleVirtualListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  width?: number | string;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor?: (item: T, index: number) => string;
  className?: string;
  overscan?: number;
  gap?: number;
}

export function SimpleVirtualList<T>({
  items,
  itemHeight,
  height,
  width = '100%',
  renderItem,
  keyExtractor = (_, index) => String(index),
  className,
  overscan = 3,
  gap = 0,
}: SimpleVirtualListProps<T>) {
  // Transform items to include id
  const virtualItems = useMemo(() => 
    items.map((item, index) => ({
      id: keyExtractor(item, index),
      data: item,
    })),
    [items, keyExtractor]
  );

  return (
    <VirtualList
      items={virtualItems}
      itemHeight={itemHeight}
      height={height}
      width={width}
      overscan={overscan}
      gap={gap}
      className={className}
      renderItem={(virtualItem, index, style) => (
        <div key={virtualItem.id} style={style}>
          {renderItem(virtualItem.data, index)}
        </div>
      )}
    />
  );
}

export default VirtualList;
