// Design Tokens - Classy Minimalist Design System
// Teal accent color palette with warm neutrals

// ============================================================================
// Color Palette
// ============================================================================

export const colors = {
  // Primary - Teal Accent (relaxing, professional)
  teal: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',  // Primary accent
    600: '#0d9488',  // Hover
    700: '#0f766e',  // Active/pressed
    800: '#115e59',
    900: '#134e4a',
  },

  // Warm Neutrals (elegant, sophisticated)
  warm: {
    50: '#fafaf9',   // Background
    100: '#f5f5f4',  // Card background
    200: '#e7e5e4',  // Borders
    300: '#d6d3d1',  // Disabled borders
    400: '#a8a29e',  // Placeholder text
    500: '#78716c',  // Muted text
    600: '#57534e',  // Secondary text
    700: '#44403c',  // Body text
    800: '#292524',  // Headings
    900: '#1c1917',  // Primary text
  },

  // Semantic Colors
  success: {
    light: '#d1fae5',
    main: '#10b981',
    dark: '#059669',
  },
  warning: {
    light: '#fef3c7',
    main: '#f59e0b',
    dark: '#d97706',
  },
  error: {
    light: '#fee2e2',
    main: '#ef4444',
    dark: '#dc2626',
  },
  info: {
    light: '#dbeafe',
    main: '#3b82f6',
    dark: '#2563eb',
  },

  // Pure colors
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

// ============================================================================
// Typography
// ============================================================================

export const typography = {
  fontFamily: {
    sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", Consolas, monospace',
  },

  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px
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
    tight: 1.25,
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
// Spacing
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
} as const;

// ============================================================================
// Border Radius
// ============================================================================

export const borderRadius = {
  none: '0',
  sm: '0.125rem',    // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem',    // 6px
  lg: '0.5rem',      // 8px
  xl: '0.75rem',     // 12px
  '2xl': '1rem',     // 16px
  '3xl': '1.5rem',   // 24px
  full: '9999px',
} as const;

// ============================================================================
// Shadows (subtle for minimal design)
// ============================================================================

export const shadows = {
  none: 'none',
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.03)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
  DEFAULT: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.05), 0 8px 10px -6px rgb(0 0 0 / 0.05)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.03)',
} as const;

// ============================================================================
// Transitions
// ============================================================================

export const transitions = {
  duration: {
    fastest: '50ms',
    faster: '100ms',
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '400ms',
    slowest: '500ms',
  },
  timing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const;

// ============================================================================
// Z-Index
// ============================================================================

export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
} as const;

// ============================================================================
// Breakpoints
// ============================================================================

export const breakpoints = {
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
  // Card
  card: {
    background: colors.white,
    border: colors.warm[200],
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    shadow: shadows.none,
    hoverBorder: colors.warm[300],
  },

  // Button - Accent (Teal filled)
  buttonAccent: {
    background: colors.teal[500],
    backgroundHover: colors.teal[600],
    backgroundActive: colors.teal[700],
    text: colors.white,
    borderRadius: borderRadius.full,
    paddingX: spacing[6],
    paddingY: spacing[3],
  },

  // Button - Minimal (text with underline)
  buttonMinimal: {
    background: colors.transparent,
    text: colors.warm[800],
    textHover: colors.warm[900],
    underlineColor: colors.warm[800],
  },

  // Button - Icon (circular)
  buttonIcon: {
    background: colors.warm[100],
    backgroundHover: colors.warm[200],
    size: spacing[10],
    iconColor: colors.warm[600],
    borderRadius: borderRadius.full,
  },

  // Selection indicator
  selection: {
    background: colors.teal[500],
    icon: colors.white,
    size: spacing[6],
  },

  // Input
  input: {
    background: colors.white,
    border: colors.warm[200],
    borderFocus: colors.teal[500],
    borderRadius: borderRadius.lg,
    text: colors.warm[900],
    placeholder: colors.warm[400],
    padding: spacing[4],
  },

  // Section header
  sectionHeader: {
    labelColor: colors.teal[600],
    labelSize: typography.fontSize.sm,
    titleColor: colors.warm[900],
    titleSize: typography.fontSize['3xl'],
    titleWeight: typography.fontWeight.light,
    letterSpacing: typography.letterSpacing.tight,
  },
} as const;

// ============================================================================
// Theme Export
// ============================================================================

export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions,
  zIndex,
  breakpoints,
  components,
} as const;

export type Theme = typeof theme;

export default theme;
