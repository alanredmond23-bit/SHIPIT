'use client';

import { useState, useEffect } from 'react';

/**
 * Hook for responsive media queries
 * @param query - CSS media query string
 * @returns boolean indicating if the query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);

    // Set initial value
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    // Create listener
    const listener = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    // Add listener
    if (media.addEventListener) {
      media.addEventListener('change', listener);
    } else {
      // Fallback for older browsers
      media.addListener(listener);
    }

    // Cleanup
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', listener);
      } else {
        // Fallback for older browsers
        media.removeListener(listener);
      }
    };
  }, [matches, query]);

  return matches;
}

/**
 * Predefined breakpoint hooks for common screen sizes
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}

export function useIsSmallMobile(): boolean {
  return useMediaQuery('(max-width: 374px)');
}

export function useIsMediumMobile(): boolean {
  return useMediaQuery('(min-width: 375px) and (max-width: 413px)');
}

export function useIsLargeMobile(): boolean {
  return useMediaQuery('(min-width: 414px) and (max-width: 767px)');
}

/**
 * Hook to detect touch capability
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore - for older browsers
      navigator.msMaxTouchPoints > 0
    );
  }, []);

  return isTouch;
}

/**
 * Hook to get current screen size category
 */
export type ScreenSize = 'small-mobile' | 'medium-mobile' | 'large-mobile' | 'tablet' | 'desktop';

export function useScreenSize(): ScreenSize {
  const isSmallMobile = useIsSmallMobile();
  const isMediumMobile = useIsMediumMobile();
  const isLargeMobile = useIsLargeMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();

  if (isSmallMobile) return 'small-mobile';
  if (isMediumMobile) return 'medium-mobile';
  if (isLargeMobile) return 'large-mobile';
  if (isTablet) return 'tablet';
  if (isDesktop) return 'desktop';

  // Default to desktop
  return 'desktop';
}

/**
 * Hook to get viewport dimensions
 */
export function useViewportSize() {
  const [size, setSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Set initial size

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

/**
 * Hook to detect device orientation
 */
export type Orientation = 'portrait' | 'landscape';

export function useOrientation(): Orientation {
  const [orientation, setOrientation] = useState<Orientation>('portrait');

  useEffect(() => {
    const handleOrientationChange = () => {
      setOrientation(
        window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
      );
    };

    handleOrientationChange(); // Set initial orientation
    window.addEventListener('resize', handleOrientationChange);

    return () => window.removeEventListener('resize', handleOrientationChange);
  }, []);

  return orientation;
}

export default useMediaQuery;
