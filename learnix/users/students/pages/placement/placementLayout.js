import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

/** Below this width, use stacked layouts and tighter typography */
export const PLACEMENT_COMPACT_MAX = 520;

export function usePlacementLayout() {
  const { width, height } = useWindowDimensions();
  const isCompact = width < PLACEMENT_COMPACT_MAX;
  const horizontalPadding = useMemo(() => {
    if (width < 360) return 14;
    if (width < 480) return 16;
    return Math.min(24, Math.round(width * 0.055));
  }, [width]);

  return { width, height, isCompact, horizontalPadding };
}
