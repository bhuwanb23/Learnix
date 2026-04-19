import { useStudentResponsive, STUDENT_BREAKPOINT } from '../../hooks/useStudentResponsive';

/** @deprecated Use STUDENT_BREAKPOINT.layoutCompact from useStudentResponsive */
export const PLACEMENT_COMPACT_MAX = STUDENT_BREAKPOINT.layoutCompact;

/**
 * Placement sub-screens (browse jobs, job details, etc.): shared width + horizontal padding.
 */
export function usePlacementLayout() {
  const { width, height, isCompact, horizontalPadding } = useStudentResponsive();

  return {
    width,
    height,
    isCompact,
    horizontalPadding,
  };
}
