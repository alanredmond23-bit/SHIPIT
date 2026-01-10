// Design Tokens - Meta Agent Desktop Design System
// Night-Light Teal Theme with Dark/Light Mode Support
// ============================================================================

// ============================================================================
// Color Palette - Night-Light Teal (Primary Brand Color)
// ============================================================================

export const colors = {
  // Night-Light Teal Accent (Primary Brand Color - relaxing, professional)
  teal: {
    50: '#EFFFFE',
    100: '#C8FFFE',
    200: '#8EFBF9',
    300: '#4DF3F0',
    400: '#1FB7B4',  // Primary accent (Night-Light Teal)
    500: '#179F9C',  // Hover state
    600: '#118684',  // Active/pressed
    700: '#0D6C6A',
    800: '#0A5250',
    900: '#073A39',
    glow: 'rgba(31, 183, 180, 0.35)',
    subtle: 'rgba(31, 183, 180, 0.12)',
  },

  // Warm Neutrals (elegant, sophisticated - for light mode)
  warm: {
    50: '#FAFAF9',   // Background
    100: '#F5F5F4',  // Card background
    200: '#E7E5E4',  // Borders
    300: '#D6D3D1',  // Disabled borders
    400: '#A8A29E',  // Placeholder text
    500: '#78716C',  // Muted text
    600: '#57534E',  // Secondary text
    700: '#44403C',  // Body text
    800: '#292524',  // Headings
    900: '#1C1917',  // Primary text
  },

  // Dark Mode Neutrals (Night-Light Theme)
  dark: {
    0: '#0B0F10',    // Deepest background
    1: '#101617',    // Base background
    2: '#151D1E',    // Card background
    3: '#1A2324',    // Elevated surface
    elevated: '#1E2829', // Modal/overlay
    hover: '#242D2E',    // Hover state
    active: '#2A3435',   // Active/pressed
  },

  // Semantic Colors
  success: {
    light: '#D1FAE5',
    main: '#22C55E',
    dark: '#16A34A',
    muted: 'rgba(34, 197, 94, 0.15)',
  },
  warning: {
    light: '#FEF3C7',
    main: '#F59E0B',
    dark: '#D97706',
    muted: 'rgba(245, 158, 11, 0.15)',
  },
  error: {
    light: '#FEE2E2',
    main: '#EF4444',
    dark: '#DC2626',
    muted: 'rgba(239, 68, 68, 0.15)',
  },
  info: {
    light: '#DBEAFE',
    main: '#3B82F6',
    dark: '#2563EB',
    muted: 'rgba(59, 130, 246, 0.15)',
  },

  // Pure colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

// ============================================================================
// Dark Mode Theme Tokens
// ============================================================================

export const darkMode = {
  // Backgrounds
  bg: {
    primary: colors.dark[1],
    secondary: colors.dark[2],
    tertiary: colors.dark[3],
    elevated: colors.dark.elevated,
    hover: colors.dark.hover,
    active: colors.dark.active,
    glass: 'rgba(30, 40, 41, 0.8)',
  },

  // Text
  text: {
    primary: '#F5F7F7',
    secondary: '#A3B1B2',
    muted: '#6B7C7D',
    disabled: '#4A5859',
    inverse: colors.warm[900],
  },

  // Borders
  border: {
    subtle: 'rgba(255, 255, 255, 0.06)',
    default: 'rgba(255, 255, 255, 0.1)',
    strong: 'rgba(255, 255, 255, 0.16)',
    focus: colors.teal[400],
  },

  // Shadows
  shadow: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.4)',
    md: '0 4px 12px rgba(0, 0, 0, 0.5)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.6)',
    xl: '0 16px 48px rgba(0, 0, 0, 0.7)',
    glow: `0 0 20px ${colors.teal.glow}`,
  },
} as const;

// ============================================================================
// Light Mode Theme Tokens
// ============================================================================

export const lightMode = {
  // Backgrounds
  bg: {
    primary: colors.warm[50],
    secondary: colors.warm[100],
    tertiary: colors.warm[200],
    elevated: colors.white,
    hover: colors.warm[100],
    active: colors.warm[200],
    glass: 'rgba(255, 255, 255, 0.9)',
  },

  // Text
  text: {
    primary: colors.warm[900],
    secondary: colors.warm[700],
    muted: colors.warm[500],
    disabled: colors.warm[400],
    inverse: '#F5F7F7',
  },

  // Borders
  border: {
    subtle: 'rgba(0, 0, 0, 0.04)',
    default: 'rgba(0, 0, 0, 0.08)',
    strong: 'rgba(0, 0, 0, 0.12)',
    focus: colors.teal[500],
  },

  // Shadows
  shadow: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 12px rgba(0, 0, 0, 0.08)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.12)',
    xl: '0 16px 48px rgba(0, 0, 0, 0.15)',
    glow: 'rgba(31, 183, 180, 0.2)',
  },
} as const;

// ============================================================================
// Typography
// ============================================================================

export const typography = {
  fontFamily: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'SF Mono', 'Fira Code', 'Monaco', Consolas, monospace",
  },

  fontSize: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
    '6xl': '3.75rem',   // 60px
  },

  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeight: {
    none: 1,
    tight: 1.2,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

// ============================================================================
// Spacing Scale
// ============================================================================

export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem',   // 2px
  1: '0.25rem',      // 4px
  1.5: '0.375rem',   // 6px
  2: '0.5rem',       // 8px
  2.5: '0.625rem',   // 10px
  3: '0.75rem',      // 12px
  3.5: '0.875rem',   // 14px
  4: '1rem',         // 16px
  5: '1.25rem',      // 20px
  6: '1.5rem',       // 24px
  7: '1.75rem',      // 28px
  8: '2rem',         // 32px
  9: '2.25rem',      // 36px
  10: '2.5rem',      // 40px
  11: '2.75rem',     // 44px
  12: '3rem',        // 48px
  14: '3.5rem',      // 56px
  16: '4rem',        // 64px
  20: '5rem',        // 80px
  24: '6rem',        // 96px
  28: '7rem',        // 112px
  32: '8rem',        // 128px
  36: '9rem',        // 144px
  40: '10rem',       // 160px
  44: '11rem',       // 176px
  48: '12rem',       // 192px
  52: '13rem',       // 208px
  56: '14rem',       // 224px
  60: '15rem',       // 240px
  64: '16rem',       // 256px
} as const;

// ============================================================================
// Border Radius Scale
// ============================================================================

export const borderRadius = {
  none: '0',
  sm: '0.25rem',     // 4px
  DEFAULT: '0.375rem', // 6px
  md: '0.5rem',      // 8px
  lg: '0.75rem',     // 12px
  xl: '1rem',        // 16px
  '2xl': '1.25rem',  // 20px
  '3xl': '1.5rem',   // 24px
  full: '9999px',
} as const;

// ============================================================================
// Shadow Scale
// ============================================================================

export const shadows = {
  none: 'none',
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.03)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
  DEFAULT: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.05), 0 8px 10px -6px rgb(0 0 0 / 0.05)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.03)',
  // Teal glow for accent elements
  glowTeal: `0 0 20px ${colors.teal.glow}, 0 0 40px ${colors.teal.subtle}`,
  glowTealSm: `0 0 10px ${colors.teal.glow}`,
} as const;

// ============================================================================
// Animation Durations & Easings
// ============================================================================

export const animation = {
  duration: {
    instant: '0ms',
    fastest: '50ms',
    faster: '100ms',
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '400ms',
    slowest: '500ms',
    // Named durations
    fade: '200ms',
    slide: '300ms',
    scale: '200ms',
    bounce: '400ms',
    pulse: '2000ms',
    spin: '1000ms',
  },
  easing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    // Custom springs
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    springBounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    springSmooth: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
    // Enter/exit
    enter: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    exit: 'cubic-bezier(0.4, 0.0, 1, 1)',
    // Anticipate (slight overshoot)
    anticipate: 'cubic-bezier(0.36, 0, 0.66, -0.56)',
    // Overshoot and settle
    overshoot: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const;

// Backwards compatibility - keep transitions for existing code
export const transitions = {
  duration: animation.duration,
  timing: animation.easing,
} as const;

// ============================================================================
// Z-Index Scale
// ============================================================================

export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  sticky: 100,
  dropdown: 1000,
  overlay: 1100,
  modal: 1200,
  popover: 1300,
  toast: 1400,
  tooltip: 1500,
  skipLink: 1600,
} as const;

// ============================================================================
// Breakpoints
// ============================================================================

export const breakpoints = {
  xs: '375px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ============================================================================
// Component Tokens
// ============================================================================

export const components = {
  // Card (dark mode primary)
  card: {
    background: 'var(--bg-2)',
    backgroundHover: 'var(--bg-3)',
    border: 'var(--border-default)',
    borderHover: 'var(--border-strong)',
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    shadow: 'var(--shadow-sm)',
  },

  // Card Elevated
  cardElevated: {
    background: 'var(--bg-elevated)',
    border: 'var(--border-subtle)',
    borderRadius: borderRadius['2xl'],
    padding: spacing[6],
    shadow: 'var(--shadow-md)',
  },

  // Glass Card
  cardGlass: {
    background: 'var(--glass-bg)',
    backdrop: 'blur(20px)',
    border: 'var(--glass-border)',
    borderRadius: borderRadius.xl,
    padding: spacing[4],
  },

  // Button - Primary (Teal accent)
  buttonPrimary: {
    background: colors.teal[400],
    backgroundHover: colors.teal[500],
    backgroundActive: colors.teal[600],
    text: colors.white,
    borderRadius: borderRadius.full,
    paddingX: spacing[6],
    paddingY: spacing[3],
    shadow: `0 2px 8px ${colors.teal.glow}`,
    shadowHover: `0 4px 16px ${colors.teal.glow}`,
  },

  // Button - Secondary
  buttonSecondary: {
    background: 'var(--bg-3)',
    backgroundHover: 'var(--bg-elevated)',
    text: 'var(--text-primary)',
    border: 'var(--border-default)',
    borderHover: 'var(--border-strong)',
    borderRadius: borderRadius.full,
    paddingX: spacing[6],
    paddingY: spacing[3],
  },

  // Button - Ghost
  buttonGhost: {
    background: 'transparent',
    backgroundHover: colors.teal.subtle,
    text: 'var(--text-secondary)',
    textHover: colors.teal[400],
    borderRadius: borderRadius.full,
    paddingX: spacing[6],
    paddingY: spacing[3],
  },

  // Button - Icon (circular)
  buttonIcon: {
    background: 'var(--bg-3)',
    backgroundHover: colors.teal.subtle,
    border: 'var(--border-default)',
    borderHover: colors.teal[400],
    size: '40px',
    sizeSmall: '36px',
    sizeLarge: '48px',
    iconColor: 'var(--text-secondary)',
    iconColorHover: colors.teal[400],
    borderRadius: borderRadius.full,
  },

  // Input
  input: {
    background: 'var(--bg-2)',
    border: 'var(--border-default)',
    borderFocus: colors.teal[400],
    borderRadius: borderRadius.lg,
    text: 'var(--text-primary)',
    placeholder: 'var(--text-muted)',
    padding: spacing[3],
    focusRing: `0 0 0 3px ${colors.teal.subtle}`,
  },

  // Navigation Item
  navItem: {
    padding: `${spacing[3]} ${spacing[4]}`,
    borderRadius: borderRadius.lg,
    colorDefault: 'var(--text-secondary)',
    colorHover: 'var(--text-primary)',
    colorActive: colors.teal[400],
    bgHover: 'var(--bg-3)',
    bgActive: colors.teal.subtle,
    activeIndicator: colors.teal[400],
  },

  // Badge
  badge: {
    paddingX: spacing[2.5],
    paddingY: spacing[1],
    fontSize: typography.fontSize.xs,
    borderRadius: borderRadius.md,
  },

  // Toggle
  toggle: {
    width: '48px',
    height: '28px',
    thumbSize: '20px',
    background: 'var(--bg-3)',
    backgroundActive: colors.teal[400],
    border: 'var(--border-default)',
    borderActive: colors.teal[500],
    thumb: 'var(--text-secondary)',
    thumbActive: colors.white,
  },
} as const;

// ============================================================================
// Tailwind Class Utilities
// ============================================================================

export const tw = {
  // Layout
  container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',

  // Card styles
  card: 'bg-[var(--bg-2)] border border-[var(--border-default)] rounded-xl p-4 shadow-sm',
  cardElevated: 'bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-md',
  cardGlass: 'bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-xl p-4',
  cardHover: 'hover:border-[var(--border-strong)] hover:shadow-md transition-all duration-200',
  cardSelected: 'border-teal-400 bg-teal-400/10 ring-1 ring-teal-400/20',

  // Button base styles
  buttonBase: 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-teal-400 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]',
  buttonPrimary: 'bg-teal-400 text-white rounded-full hover:bg-teal-500 active:bg-teal-600 shadow-[0_2px_8px_var(--accent-glow)] hover:shadow-[0_4px_16px_var(--accent-glow)]',
  buttonSecondary: 'bg-[var(--bg-3)] text-[var(--text-primary)] rounded-full border border-[var(--border-default)] hover:bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]',
  buttonGhost: 'bg-transparent text-[var(--text-secondary)] rounded-full hover:bg-teal-400/10 hover:text-teal-400',
  buttonIcon: 'rounded-full bg-[var(--bg-3)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-teal-400/10 hover:border-teal-400 hover:text-teal-400',

  // Text styles
  textPrimary: 'text-[var(--text-primary)]',
  textSecondary: 'text-[var(--text-secondary)]',
  textMuted: 'text-[var(--text-muted)]',
  textAccent: 'text-teal-400',

  // Heading styles
  heading1: 'text-4xl sm:text-5xl font-semibold text-[var(--text-primary)] tracking-tight',
  heading2: 'text-3xl sm:text-4xl font-semibold text-[var(--text-primary)] tracking-tight',
  heading3: 'text-2xl font-semibold text-[var(--text-primary)]',
  heading4: 'text-xl font-medium text-[var(--text-primary)]',

  // Label styles
  label: 'text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider',
  labelAccent: 'text-sm font-medium text-teal-400 uppercase tracking-wider',

  // Input styles
  input: 'w-full px-4 py-3 bg-[var(--bg-2)] border border-[var(--border-default)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all duration-200',

  // Focus ring
  focusRing: 'focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-1)]',
  focusVisible: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2',

  // Transitions
  transition: 'transition-all duration-200 ease-out',
  transitionFast: 'transition-all duration-150 ease-out',
  transitionSlow: 'transition-all duration-300 ease-out',
  transitionColors: 'transition-colors duration-200 ease-out',

  // Glass effect
  glass: 'bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)]',

  // Glow effects
  glowTeal: 'shadow-[0_0_20px_var(--accent-glow)]',
  glowTealHover: 'hover:shadow-[0_0_30px_var(--accent-glow)]',
} as const;

// ============================================================================
// Theme Export
// ============================================================================

export const theme = {
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
} as const;

export type Theme = typeof theme;

// ============================================================================
// Type Utilities
// ============================================================================

export type TealShade = keyof typeof colors.teal;
export type WarmShade = keyof typeof colors.warm;
export type DarkShade = keyof typeof colors.dark;
export type FontSize = keyof typeof typography.fontSize;
export type FontWeight = keyof typeof typography.fontWeight;
export type Spacing = keyof typeof spacing;
export type BorderRadius = keyof typeof borderRadius;
export type Shadow = keyof typeof shadows;
export type Breakpoint = keyof typeof breakpoints;
export type ZIndex = keyof typeof zIndex;
export type AnimationDuration = keyof typeof animation.duration;
export type AnimationEasing = keyof typeof animation.easing;

// ============================================================================
// CSS Variable Helper
// ============================================================================

/**
 * Generate CSS custom properties for theming
 */
export function getCSSVariables(mode: 'dark' | 'light' = 'dark'): Record<string, string> {
  const modeTokens = mode === 'dark' ? darkMode : lightMode;

  return {
    '--accent-400': colors.teal[400],
    '--accent-500': colors.teal[500],
    '--accent-600': colors.teal[600],
    '--accent-glow': colors.teal.glow,
    '--accent-subtle': colors.teal.subtle,

    '--bg-0': mode === 'dark' ? colors.dark[0] : colors.warm[50],
    '--bg-1': mode === 'dark' ? colors.dark[1] : colors.warm[50],
    '--bg-2': mode === 'dark' ? colors.dark[2] : colors.warm[100],
    '--bg-3': mode === 'dark' ? colors.dark[3] : colors.warm[200],
    '--bg-elevated': mode === 'dark' ? colors.dark.elevated : colors.white,

    '--text-primary': modeTokens.text.primary,
    '--text-secondary': modeTokens.text.secondary,
    '--text-muted': modeTokens.text.muted,

    '--border-subtle': modeTokens.border.subtle,
    '--border-default': modeTokens.border.default,
    '--border-strong': modeTokens.border.strong,

    '--shadow-sm': modeTokens.shadow.sm,
    '--shadow-md': modeTokens.shadow.md,
    '--shadow-lg': modeTokens.shadow.lg,
    '--shadow-glow': modeTokens.shadow.glow,

    '--glass-bg': modeTokens.bg.glass,
    '--glass-border': modeTokens.border.subtle,

    '--success': colors.success.main,
    '--warning': colors.warning.main,
    '--error': colors.error.main,
    '--info': colors.info.main,
  };
}

export default theme;
