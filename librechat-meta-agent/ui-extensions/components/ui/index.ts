// Core UI Components - Meta Agent Desktop Design System
// Night-Light Teal accent color palette with dark/light mode support

// ============================================================================
// Cards
// ============================================================================
export { MinimalCard } from './MinimalCard';
export { SelectableCard } from './SelectableCard';

// ============================================================================
// Performance Components
// ============================================================================
export {
  VirtualList,
  SimpleVirtualList,
  type VirtualListProps,
  type VirtualListItem,
  type VirtualListHandle,
  type SimpleVirtualListProps,
} from './VirtualList';

export {
  LazyComponent,
  LazyLoader,
  ErrorBoundary,
  DefaultLoadingFallback,
  DefaultErrorFallback,
  createLazyWithPreload,
  lazyWithRetry,
  prefetchComponent,
  type LazyComponentProps,
  type LazyLoaderProps,
  type ErrorBoundaryProps,
} from './LazyComponent';

export {
  withMemo,
  withMemoExcludingCallbacks,
  shallowEqual,
  deepEqual,
  compareKeys,
  compareExceptKeys,
  MemoizedContainer,
  MemoizedList,
  ExpensiveComputation,
  useMemoizedCallback,
  usePrevious,
  useDeepMemo,
  useStableCallback,
  useEventCallback,
  useRenderCount,
  useWhyDidYouUpdate,
  type MemoComparator,
} from './MemoizedComponents';

export {
  OptimizedImage,
  AvatarImage,
  BackgroundImage,
  GalleryImage,
  type OptimizedImageProps,
  type AvatarImageProps,
  type BackgroundImageProps,
  type GalleryImageProps,
  type ImageFit,
  type ImageLoading,
} from './OptimizedImage';

// ============================================================================
// Buttons
// ============================================================================
export { AccentButton } from './AccentButton';
export { MinimalButton } from './MinimalButton';
export { IconButton } from './IconButton';

// ============================================================================
// Layout & Typography
// ============================================================================
export { SectionHeader } from './SectionHeader';

// ============================================================================
// Decorative
// ============================================================================
export { GeometricDecor } from './GeometricDecor';

// ============================================================================
// Utility
// ============================================================================
export { SelectionBar } from './SelectionBar';

// ============================================================================
// Loading States & Skeletons
// ============================================================================
export { Skeleton, CardSkeleton, ListSkeleton, TableSkeleton } from './Skeleton';

export {
  LoadingSpinner,
  DotSpinner,
  PulseSpinner,
  RingSpinner,
} from './LoadingSpinner';

export type {
  LoadingSpinnerProps,
  DotSpinnerProps,
  PulseSpinnerProps,
  RingSpinnerProps,
} from './LoadingSpinner';

export {
  LoadingOverlay,
  InlineLoading,
  PageLoading,
  ContentLoading,
} from './LoadingOverlay';

export type {
  LoadingOverlayProps,
  InlineLoadingProps,
  PageLoadingProps,
  ContentLoadingProps,
} from './LoadingOverlay';

// ============================================================================
// Progress Indicators
// ============================================================================
export {
  ProgressBar,
  StepProgress,
  CircularProgress,
} from './ProgressBar';

export type {
  ProgressBarProps,
  StepProgressProps,
  CircularProgressProps,
} from './ProgressBar';

// ============================================================================
// Offline & Connectivity
// ============================================================================
export {
  OfflineIndicator,
  OfflineAware,
  useOnlineStatus,
  useReconnection,
  type OnlineStatus,
  type UseOnlineStatusOptions,
  type OfflineIndicatorProps,
  type OfflineAwareProps,
  type UseReconnectionOptions,
} from './OfflineIndicator';

// ============================================================================
// Toast Notifications
// ============================================================================
export {
  ToastProvider,
  useToast,
  showToast,
  setGlobalToastRef,
  ToastGlobalConnector,
  type ToastVariant,
  type ToastPosition,
  type ToastData,
  type ToastOptions,
  type ToastContextValue,
  type ToastProviderProps,
} from './Toast';

// ============================================================================
// Design Tokens
// ============================================================================
export {
  theme,
  colors,
  darkMode,
  lightMode,
  typography,
  spacing,
  borderRadius,
  shadows,
  animation,
  transitions,
  zIndex,
  breakpoints,
  components,
  tw,
  getCSSVariables,
} from '../../styles/design-tokens';

// ============================================================================
// Types from Design Tokens
// ============================================================================
export type {
  Theme,
  TealShade,
  WarmShade,
  DarkShade,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
  Shadow,
  Breakpoint,
  ZIndex,
  AnimationDuration,
  AnimationEasing,
} from '../../styles/design-tokens';

// ============================================================================
// Animations
// ============================================================================
export {
  // Core animations
  fadeIn,
  fadeOut,
  slideUp,
  slideDown,
  slideInRight,
  slideInLeft,
  scaleIn,
  scaleUp,
  popIn,
  // Message animations
  messageSend,
  messageReceive,
  typingDot,
  // Tool animations
  toolPulse,
  toolExecuting,
  toolSuccess,
  // Button animations
  buttonPress,
  buttonHoverGlow,
  iconButtonHover,
  // Page transitions
  pageEnter,
  pageSlide,
  modalBackdrop,
  modalContent,
  bottomSheet,
  // Feedback animations
  successFeedback,
  errorShake,
  warningPulse,
  checkmarkDraw,
  // List animations
  staggerContainer,
  listItem,
  accordionContent,
  // Special effects
  tealGlow,
  shimmer,
  floating,
  // CSS animations
  cssAnimations,
  // Animation presets
  presets as animationPresets,
  // Utilities
  staggerDelay,
  springTransition,
  tweenTransition,
  combineVariants,
} from '../../lib/animations';
