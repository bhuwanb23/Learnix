import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

/** Layout breakpoints — use across Home, Classes, Assignments, Events, Placement, Profile */
export const STUDENT_BREAKPOINT = {
  /** Very small phones */
  narrow: 360,
  /** Single-column / tight UI */
  compact: 480,
  /** Stacked cards, full-width CTAs */
  layoutCompact: 520,
  tablet: 768,
  desktop: 1024,
};

/** Max width for centered scroll content on large screens */
export const STUDENT_MAX_CONTENT_WIDTH = 1240;

/**
 * Responsive metrics for all student `pages/*` root screens.
 * Keeps horizontal insets and breakpoints consistent on phones, tablets, and desktop web.
 */
export function useStudentResponsive() {
  const { width, height } = useWindowDimensions();

  const isDesktop = width >= STUDENT_BREAKPOINT.desktop;
  const isTablet = width >= STUDENT_BREAKPOINT.tablet && width < STUDENT_BREAKPOINT.desktop;
  const isPhone = width < STUDENT_BREAKPOINT.tablet;
  const isCompact = width < STUDENT_BREAKPOINT.layoutCompact;
  const isNarrowPhone = width < STUDENT_BREAKPOINT.narrow;

  const horizontalPadding = useMemo(() => {
    if (isDesktop) return 28;
    if (width >= STUDENT_BREAKPOINT.tablet) return 20;
    if (isNarrowPhone) return 10;
    if (width < STUDENT_BREAKPOINT.compact) return 12;
    return 16;
  }, [isDesktop, width, isNarrowPhone]);

  const sectionGap = useMemo(() => {
    if (isDesktop) return 28;
    if (width >= STUDENT_BREAKPOINT.tablet) return 24;
    return 20;
  }, [isDesktop, width]);

  /** Profile hub uses slightly wider gutters on large screens */
  const profileContentPadding = useMemo(() => {
    if (isDesktop) return 36;
    if (width >= STUDENT_BREAKPOINT.tablet) return 24;
    return 14;
  }, [isDesktop, width]);

  const contentMaxWidth = STUDENT_MAX_CONTENT_WIDTH;

  return {
    width,
    height,
    isDesktop,
    isTablet,
    isPhone,
    isCompact,
    isNarrowPhone,
    horizontalPadding,
    sectionGap,
    profileContentPadding,
    contentMaxWidth,
  };
}
