// Micro-animations library for Meta Agent Desktop
// Night-Light Teal Theme animations
// ============================================================================

import { animation } from '../styles/design-tokens';

// ============================================================================
// Animation Keyframes (for Framer Motion / CSS)
// ============================================================================

/**
 * Fade animations
 */
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: {
    duration: 0.2,
    ease: [0, 0, 0.2, 1], // easeOut
  },
};

export const fadeOut = {
  initial: { opacity: 1 },
  animate: { opacity: 0 },
  transition: {
    duration: 0.15,
    ease: [0.4, 0, 1, 1], // easeIn
  },
};

/**
 * Slide animations
 */
export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: {
    duration: 0.3,
    ease: [0.34, 1.56, 0.64, 1], // spring
  },
};

export const slideDown = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
  transition: {
    duration: 0.3,
    ease: [0.34, 1.56, 0.64, 1], // spring
  },
};

export const slideInRight = {
  initial: { opacity: 0, x: 100 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 50 },
  transition: {
    duration: 0.3,
    ease: [0.34, 1.56, 0.64, 1], // spring
  },
};

export const slideInLeft = {
  initial: { opacity: 0, x: -100 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
  transition: {
    duration: 0.3,
    ease: [0.34, 1.56, 0.64, 1], // spring
  },
};

/**
 * Scale animations
 */
export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: {
    duration: 0.2,
    ease: [0.34, 1.56, 0.64, 1], // spring
  },
};

export const scaleUp = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 },
  transition: {
    duration: 0.3,
    ease: [0.34, 1.56, 0.64, 1], // spring
  },
};

export const popIn = {
  initial: { opacity: 0, scale: 0.5 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.5 },
  transition: {
    type: 'spring',
    stiffness: 400,
    damping: 25,
  },
};

// ============================================================================
// Message Animations (Chat UI)
// ============================================================================

/**
 * Message send animation - slides up with fade
 */
export const messageSend = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: {
    duration: 0.3,
    ease: [0.34, 1.56, 0.64, 1], // spring with overshoot
  },
};

/**
 * Message receive animation - slides in from left
 */
export const messageReceive = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  transition: {
    duration: 0.3,
    ease: [0, 0, 0.2, 1], // easeOut
  },
};

/**
 * Typing indicator animation
 */
export const typingDot = (delay: number) => ({
  animate: {
    y: [0, -6, 0],
    opacity: [0.4, 1, 0.4],
  },
  transition: {
    duration: 0.6,
    repeat: Infinity,
    delay,
    ease: 'easeInOut',
  },
});

// ============================================================================
// Tool Use Animations
// ============================================================================

/**
 * Tool use pulse animation
 */
export const toolPulse = {
  animate: {
    scale: [1, 1.02, 1],
    boxShadow: [
      '0 0 0 0 rgba(31, 183, 180, 0.35)',
      '0 0 0 8px rgba(31, 183, 180, 0)',
      '0 0 0 0 rgba(31, 183, 180, 0)',
    ],
  },
  transition: {
    duration: 1.5,
    repeat: Infinity,
    ease: 'easeInOut',
  },
};

/**
 * Tool execution animation
 */
export const toolExecuting = {
  animate: {
    borderColor: ['rgba(31, 183, 180, 0.3)', 'rgba(31, 183, 180, 0.8)', 'rgba(31, 183, 180, 0.3)'],
  },
  transition: {
    duration: 1.5,
    repeat: Infinity,
    ease: 'easeInOut',
  },
};

/**
 * Tool success animation
 */
export const toolSuccess = {
  initial: { scale: 0.8, opacity: 0 },
  animate: {
    scale: [0.8, 1.1, 1],
    opacity: 1,
  },
  transition: {
    duration: 0.4,
    ease: [0.34, 1.56, 0.64, 1],
  },
};

// ============================================================================
// Button Animations
// ============================================================================

/**
 * Button press feedback
 */
export const buttonPress = {
  whileTap: { scale: 0.98 },
  transition: {
    duration: 0.1,
    ease: 'easeOut',
  },
};

/**
 * Button hover with glow
 */
export const buttonHoverGlow = {
  whileHover: {
    boxShadow: '0 0 20px rgba(31, 183, 180, 0.35), 0 4px 16px rgba(31, 183, 180, 0.25)',
  },
  transition: {
    duration: 0.2,
    ease: 'easeOut',
  },
};

/**
 * Icon button hover
 */
export const iconButtonHover = {
  whileHover: {
    scale: 1.05,
    backgroundColor: 'rgba(31, 183, 180, 0.12)',
  },
  whileTap: { scale: 0.95 },
  transition: {
    duration: 0.15,
    ease: 'easeOut',
  },
};

// ============================================================================
// Page Transitions
// ============================================================================

/**
 * Page enter animation
 */
export const pageEnter = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: {
    duration: 0.3,
    ease: [0, 0, 0.2, 1],
  },
};

/**
 * Page slide variants
 */
export const pageSlide = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: {
    duration: 0.25,
    ease: [0, 0, 0.2, 1],
  },
};

/**
 * Modal/dialog animations
 */
export const modalBackdrop = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: {
    duration: 0.2,
  },
};

export const modalContent = {
  initial: { opacity: 0, scale: 0.95, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 10 },
  transition: {
    duration: 0.25,
    ease: [0.34, 1.56, 0.64, 1],
  },
};

/**
 * Bottom sheet animation
 */
export const bottomSheet = {
  initial: { y: '100%' },
  animate: { y: 0 },
  exit: { y: '100%' },
  transition: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
  },
};

// ============================================================================
// Feedback Animations
// ============================================================================

/**
 * Success feedback animation
 */
export const successFeedback = {
  initial: { scale: 0, opacity: 0 },
  animate: {
    scale: [0, 1.2, 1],
    opacity: 1,
  },
  transition: {
    duration: 0.4,
    ease: [0.34, 1.56, 0.64, 1],
  },
};

/**
 * Error shake animation
 */
export const errorShake = {
  animate: {
    x: [-10, 10, -10, 10, 0],
  },
  transition: {
    duration: 0.4,
    ease: 'easeInOut',
  },
};

/**
 * Warning pulse animation
 */
export const warningPulse = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
  },
  transition: {
    duration: 0.5,
    repeat: 2,
    ease: 'easeInOut',
  },
};

/**
 * Checkmark draw animation
 */
export const checkmarkDraw = {
  initial: { pathLength: 0, opacity: 0 },
  animate: { pathLength: 1, opacity: 1 },
  transition: {
    duration: 0.5,
    ease: 'easeOut',
    delay: 0.1,
  },
};

// ============================================================================
// List Animations
// ============================================================================

/**
 * Stagger children animation container
 */
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

/**
 * List item animation
 */
export const listItem = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: {
    duration: 0.2,
    ease: 'easeOut',
  },
};

/**
 * Accordion expand/collapse
 */
export const accordionContent = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1 },
  exit: { height: 0, opacity: 0 },
  transition: {
    duration: 0.25,
    ease: [0.4, 0, 0.2, 1],
  },
};

// ============================================================================
// Special Effects
// ============================================================================

/**
 * Teal glow pulse (for active elements)
 */
export const tealGlow = {
  animate: {
    boxShadow: [
      '0 0 10px rgba(31, 183, 180, 0.35), 0 0 20px rgba(31, 183, 180, 0.12)',
      '0 0 20px rgba(31, 183, 180, 0.35), 0 0 40px rgba(31, 183, 180, 0.12)',
      '0 0 10px rgba(31, 183, 180, 0.35), 0 0 20px rgba(31, 183, 180, 0.12)',
    ],
  },
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: 'easeInOut',
  },
};

/**
 * Shimmer effect (for skeleton loading)
 */
export const shimmer = {
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
  },
  transition: {
    duration: 1.5,
    repeat: Infinity,
    ease: 'linear',
  },
};

/**
 * Floating animation (for cards, badges)
 */
export const floating = {
  animate: {
    y: [0, -5, 0],
  },
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: 'easeInOut',
  },
};

// ============================================================================
// CSS Animation Classes
// ============================================================================

/**
 * Generate CSS animation string
 */
export function cssAnimation(
  name: string,
  duration: string = animation.duration.normal,
  easing: string = animation.easing.easeOut
): string {
  return `${name} ${duration} ${easing}`;
}

/**
 * Pre-built CSS animation classes
 */
export const cssAnimations = {
  fadeIn: cssAnimation('fadeIn', animation.duration.normal, animation.easing.easeOut),
  fadeOut: cssAnimation('fadeOut', animation.duration.fast, animation.easing.easeIn),
  slideUp: cssAnimation('slideUp', animation.duration.slow, animation.easing.spring),
  slideDown: cssAnimation('slideDown', animation.duration.slow, animation.easing.spring),
  scaleIn: cssAnimation('scaleIn', animation.duration.normal, animation.easing.spring),
  pulse: cssAnimation('pulse', animation.duration.pulse, animation.easing.easeInOut),
  spin: cssAnimation('spin', animation.duration.spin, animation.easing.linear),
  messageSend: cssAnimation('messageSend', animation.duration.slow, animation.easing.spring),
  toolPulse: cssAnimation('toolPulse', '1.5s', animation.easing.easeInOut),
  tealGlow: cssAnimation('tealGlow', '2s', animation.easing.easeInOut),
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create staggered delay for list items
 */
export function staggerDelay(index: number, baseDelay = 0.05): number {
  return index * baseDelay;
}

/**
 * Create spring transition config
 */
export function springTransition(stiffness = 300, damping = 30) {
  return {
    type: 'spring',
    stiffness,
    damping,
  };
}

/**
 * Create tween transition config
 */
export function tweenTransition(
  duration = 0.2,
  ease: keyof typeof animation.easing = 'easeOut'
) {
  return {
    duration,
    ease: animation.easing[ease],
  };
}

/**
 * Combine multiple animation variants
 */
export function combineVariants(
  ...variants: Record<string, unknown>[]
): Record<string, unknown> {
  return variants.reduce((acc, variant) => ({ ...acc, ...variant }), {});
}

// ============================================================================
// Animation Presets (for common use cases)
// ============================================================================

export const presets = {
  // Card hover effect
  cardHover: {
    whileHover: { y: -2, boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)' },
    transition: { duration: 0.2, ease: 'easeOut' },
  },

  // Navigation item
  navItem: {
    whileHover: { x: 4, backgroundColor: 'rgba(31, 183, 180, 0.12)' },
    whileTap: { scale: 0.98 },
    transition: { duration: 0.15 },
  },

  // Tooltip
  tooltip: {
    initial: { opacity: 0, y: 5, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 5, scale: 0.95 },
    transition: { duration: 0.15, ease: 'easeOut' },
  },

  // Dropdown menu
  dropdown: {
    initial: { opacity: 0, y: -5, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -5, scale: 0.95 },
    transition: { duration: 0.2, ease: [0.34, 1.56, 0.64, 1] },
  },

  // Toast notification
  toast: {
    initial: { opacity: 0, y: 50, scale: 0.9 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 20, scale: 0.9 },
    transition: { type: 'spring', stiffness: 400, damping: 25 },
  },
};

export default {
  fadeIn,
  fadeOut,
  slideUp,
  slideDown,
  slideInRight,
  slideInLeft,
  scaleIn,
  scaleUp,
  popIn,
  messageSend,
  messageReceive,
  typingDot,
  toolPulse,
  toolExecuting,
  toolSuccess,
  buttonPress,
  buttonHoverGlow,
  iconButtonHover,
  pageEnter,
  pageSlide,
  modalBackdrop,
  modalContent,
  bottomSheet,
  successFeedback,
  errorShake,
  warningPulse,
  checkmarkDraw,
  staggerContainer,
  listItem,
  accordionContent,
  tealGlow,
  shimmer,
  floating,
  cssAnimations,
  presets,
  staggerDelay,
  springTransition,
  tweenTransition,
  combineVariants,
};
