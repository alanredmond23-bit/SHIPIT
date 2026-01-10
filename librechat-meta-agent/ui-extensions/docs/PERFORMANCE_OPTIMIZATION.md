# Performance Optimization Guide

This document outlines the performance optimization strategies implemented in the UI Extensions project and provides recommendations for further improvements.

## Table of Contents

1. [Implemented Optimizations](#implemented-optimizations)
2. [Component Usage Guide](#component-usage-guide)
3. [Bundle Analysis Recommendations](#bundle-analysis-recommendations)
4. [Code Splitting Strategy](#code-splitting-strategy)
5. [Heavy Dependencies](#heavy-dependencies)
6. [Best Practices](#best-practices)

---

## Implemented Optimizations

### 1. Virtual List Component (`components/ui/VirtualList.tsx`)

Virtualized scrolling for long lists (conversations, messages, tasks).

**Features:**
- Only renders visible items + configurable overscan buffer
- Supports fixed and variable height items
- Smooth scrolling with momentum
- Scroll to index functionality
- Infinite scroll support with `onEndReached`

**Usage:**
```tsx
import { VirtualList, SimpleVirtualList } from '@/components/ui';

// Simple usage
<SimpleVirtualList
  items={messages}
  itemHeight={80}
  height={600}
  renderItem={(msg, idx) => <MessageItem message={msg} />}
  keyExtractor={(msg) => msg.id}
/>

// Advanced usage with variable heights
<VirtualList
  items={virtualItems}
  itemHeight={100}
  variableHeight={true}
  height={600}
  overscan={5}
  onEndReached={loadMore}
  renderItem={(item, index, style) => (
    <div key={item.id} style={style}>
      <ItemComponent item={item} />
    </div>
  )}
/>
```

### 2. Lazy Component (`components/ui/LazyComponent.tsx`)

Wrapper for React.lazy with Suspense and Error Boundary integration.

**Features:**
- Automatic Suspense wrapper
- Customizable loading/error fallbacks
- Retry functionality on error
- Intersection observer for visibility-based loading
- Preload functionality

**Usage:**
```tsx
import { LazyLoader, createLazyWithPreload, prefetchComponent } from '@/components/ui';

// Lazy loading with visibility detection
<LazyLoader
  factory={() => import('./HeavyComponent')}
  loadOnVisible={true}
  fallback={<Skeleton />}
/>

// Create lazy component with preload capability
const { Component: LazyDashboard, preload } = createLazyWithPreload(
  () => import('./Dashboard')
);

// Preload on hover
<button onMouseEnter={preload}>
  Open Dashboard
</button>
```

### 3. Memoized Components (`components/ui/MemoizedComponents.tsx`)

React.memo utilities and performance hooks.

**Features:**
- HOC wrappers with custom comparators
- Deep/shallow comparison utilities
- Performance debugging hooks
- Stable callback hooks

**Usage:**
```tsx
import {
  withMemo,
  withMemoExcludingCallbacks,
  useMemoizedCallback,
  useStableCallback,
  useWhyDidYouUpdate,
} from '@/components/ui';

// Wrap component with memo
const MemoizedCard = withMemo(TaskCard, (prev, next) => {
  return prev.task.id === next.task.id && prev.task.status === next.task.status;
});

// Use stable callback (never changes reference)
const handleClick = useStableCallback((id) => {
  doSomething(id);
});

// Debug why component re-rendered
useWhyDidYouUpdate('MyComponent', props);
```

### 4. Cache Utilities (`lib/cache.ts`)

In-memory caching with TTL support.

**Features:**
- Simple in-memory cache with TTL
- LRU eviction
- Cache key generation utilities
- React Query integration helpers
- Storage persistence option

**Usage:**
```tsx
import {
  Cache,
  apiCache,
  createCacheKey,
  cachedRequest,
  cacheConfigs,
} from '@/lib/cache';

// Use pre-configured caches
const data = await apiCache.getOrSet(
  createCacheKey('user', userId),
  () => fetchUser(userId),
  5 * 60 * 1000 // 5 min TTL
);

// React Query integration
const { data } = useQuery({
  queryKey: ['user', userId],
  queryFn: fetchUser,
  ...cacheConfigs.medium, // 5 minute cache
});

// Request deduplication
const result = await cachedRequest(
  apiCache,
  'api:/users',
  () => fetch('/api/users').then(r => r.json())
);
```

### 5. Optimized Image (`components/ui/OptimizedImage.tsx`)

Performance-optimized image component.

**Features:**
- Lazy loading with IntersectionObserver
- Blur-up placeholder effect
- Loading skeleton/placeholder
- Error fallback with retry
- Fade-in animation

**Usage:**
```tsx
import { OptimizedImage, AvatarImage, BackgroundImage } from '@/components/ui';

// Basic usage
<OptimizedImage
  src="/hero.jpg"
  alt="Hero image"
  width={800}
  height={400}
  placeholder="blur"
  blurDataURL={blurDataUrl}
  priority // for above-the-fold images
/>

// Avatar with fallback initials
<AvatarImage
  src={user.avatarUrl}
  alt={user.name}
  size="lg"
  fallbackInitials={user.name}
/>

// Background image with overlay
<BackgroundImage
  src="/background.jpg"
  overlay="bg-black/50"
>
  <h1>Content on top</h1>
</BackgroundImage>
```

---

## Component Usage Guide

### When to Use VirtualList

Use VirtualList when:
- Rendering lists with 50+ items
- Lists contain complex components
- Users frequently scroll through long lists
- Memory usage is a concern

Don't use when:
- List is short (< 20 items)
- All items need to be in DOM for SEO
- Variable height calculation is too expensive

### When to Use LazyComponent

Use LazyComponent for:
- Heavy components (charts, editors, maps)
- Below-the-fold content
- Features most users don't access
- Modal/dialog content

Don't use for:
- Small, frequently used components
- Critical above-the-fold content
- Components needed immediately

### When to Use React.memo

Use React.memo when:
- Component is expensive to render
- Component receives callbacks as props
- Parent re-renders frequently with same props

Check with `useWhyDidYouUpdate` first to confirm the component is re-rendering unnecessarily.

---

## Bundle Analysis Recommendations

### Running Bundle Analysis

```bash
# Install analyzer
npm install --save-dev @next/bundle-analyzer

# Add to next.config.js:
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})
module.exports = withBundleAnalyzer(nextConfig)

# Run analysis
ANALYZE=true npm run build
```

### Recommended Code Splitting Points

1. **Route-based splitting** (automatic with Next.js)
   - Each page is automatically a split point

2. **Feature-based splitting**
   ```tsx
   // Split heavy features
   const WorkflowBuilder = dynamic(() => import('./WorkflowBuilder'));
   const ImageGenerator = dynamic(() => import('./ImageGenerator'));
   const CodeEditor = dynamic(() => import('./CodeEditor'));
   ```

3. **Modal/Dialog splitting**
   ```tsx
   // Split modals that aren't immediately needed
   const SettingsModal = dynamic(() => import('./SettingsModal'));
   const ExportDialog = dynamic(() => import('./ExportDialog'));
   ```

---

## Heavy Dependencies

### Identified Heavy Dependencies

| Package | Size (approx) | Usage | Recommendation |
|---------|---------------|-------|----------------|
| `mermaid` | ~500KB | Diagrams | Dynamic import |
| `react-syntax-highlighter` | ~300KB | Code blocks | Dynamic import, consider prism |
| `react-markdown` | ~150KB | Markdown | Consider lighter alternative |
| `lucide-react` | ~200KB | Icons | Tree-shake, import individual icons |

### Optimization Strategies

#### 1. Mermaid (Diagrams)
```tsx
// Current (loads all of mermaid)
import mermaid from 'mermaid';

// Better (dynamic import)
const MermaidDiagram = dynamic(
  () => import('@/components/MermaidDiagram'),
  { loading: () => <Skeleton /> }
);
```

#### 2. Syntax Highlighter
```tsx
// Current (loads all languages)
import SyntaxHighlighter from 'react-syntax-highlighter';

// Better (light version with specific languages)
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import js from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python';

SyntaxHighlighter.registerLanguage('javascript', js);
SyntaxHighlighter.registerLanguage('python', python);
```

#### 3. Icons (Lucide)
```tsx
// Current (may import entire library)
import * as Icons from 'lucide-react';

// Better (import individual icons)
import { Search, Menu, X } from 'lucide-react';
```

---

## Best Practices

### 1. Memoization Strategy

```tsx
// Good: Memoize expensive computations
const filteredItems = useMemo(() => 
  items.filter(item => item.name.includes(search)),
  [items, search]
);

// Good: Stable callbacks for child components
const handleClick = useCallback((id) => {
  setSelected(id);
}, []);

// Bad: Unnecessary memoization
const name = useMemo(() => user.name, [user.name]); // Just use user.name
```

### 2. List Rendering

```tsx
// Good: Virtualized + memoized items
<VirtualList
  items={items}
  renderItem={(item, idx, style) => (
    <MemoizedItem key={item.id} item={item} style={style} />
  )}
/>

// Bad: Non-virtualized with inline functions
{items.map(item => (
  <Item key={item.id} onClick={() => handleClick(item.id)} />
))}
```

### 3. Image Loading

```tsx
// Good: Proper lazy loading
<OptimizedImage
  src={src}
  alt={alt}
  loading="lazy"
  placeholder="skeleton"
  width={400}
  height={300}
/>

// Better for above-the-fold
<OptimizedImage
  src={heroSrc}
  alt="Hero"
  priority // preloads image
  placeholder="blur"
  blurDataURL={blurUrl}
/>
```

### 4. Component Loading

```tsx
// Good: Lazy load heavy components
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});

// Good: Preload on interaction hint
<button 
  onMouseEnter={() => prefetchComponent('settings', () => import('./Settings'))}
  onClick={openSettings}
>
  Settings
</button>
```

### 5. Data Fetching

```tsx
// Good: Use caching and deduplication
const { data } = useQuery({
  queryKey: ['conversations'],
  queryFn: fetchConversations,
  staleTime: 5 * 60 * 1000,
  cacheTime: 10 * 60 * 1000,
});

// Good: Prefetch on hover
const prefetchConversation = (id) => {
  queryClient.prefetchQuery({
    queryKey: ['conversation', id],
    queryFn: () => fetchConversation(id),
  });
};
```

---

## Performance Monitoring

### Development Tools

1. **React DevTools Profiler**
   - Record and analyze component renders
   - Identify slow renders

2. **Chrome Performance Tab**
   - Record page interactions
   - Analyze JavaScript execution

3. **useWhyDidYouUpdate Hook**
   ```tsx
   useWhyDidYouUpdate('MyComponent', props);
   // Logs prop changes causing re-renders
   ```

4. **useRenderCount Hook**
   ```tsx
   useRenderCount('MyComponent');
   // Logs render count in development
   ```

### Production Monitoring

Consider adding:
- Web Vitals tracking
- Real User Monitoring (RUM)
- Error boundary reporting

---

## Summary

The implemented optimizations provide:

1. **VirtualList** - Efficient rendering of long lists
2. **LazyComponent** - Deferred loading of heavy components
3. **MemoizedComponents** - Prevention of unnecessary re-renders
4. **Cache** - Reduced API calls and faster data access
5. **OptimizedImage** - Faster image loading with better UX

These tools, combined with the best practices above, should significantly improve the application's performance.
