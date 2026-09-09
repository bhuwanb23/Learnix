import React, { useRef, useEffect } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

/**
 * SkeletonLoader — shimmer animation for loading states.
 *
 * Usage:
 * <SkeletonLoader width={200} height={16} borderRadius={4} />
 * <SkeletonLoader variant="card" />  // predefined card shape
 */

function ShimmerBlock({ width, height, borderRadius, style }) {
  const shimmer = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: -1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const translateX = shimmer.interpolate({
    inputRange: [-1, 1],
    outputRange: [-200, 400],
  });

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#e2e8f0',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [{ translateX }],
            backgroundColor: 'rgba(241, 245, 249, 0.7)',
          },
        ]}
      />
    </View>
  );
}

export function SkeletonLine({ width = '100%', height = 14, borderRadius = 4, style }) {
  return <ShimmerBlock width={width} height={height} borderRadius={borderRadius} style={style} />;
}

export function SkeletonCircle({ size = 40, style }) {
  return <ShimmerBlock width={size} height={size} borderRadius={size / 2} style={style} />;
}

export function SkeletonCard({ style }) {
  return (
    <View style={[styles.cardSkeleton, style]}>
      <SkeletonCircle size={42} />
      <View style={styles.cardLines}>
        <SkeletonLine width="60%" height={14} />
        <SkeletonLine width="80%" height={11} style={{ marginTop: 6 }} />
        <SkeletonLine width="40%" height={10} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

export function SkeletonStatRow({ count = 3, style }) {
  return (
    <View style={[styles.statRow, style]}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.statSkeleton}>
          <SkeletonLine width="50%" height={18} style={{ alignSelf: 'center' }} />
          <SkeletonLine width="70%" height={10} style={{ alignSelf: 'center', marginTop: 6 }} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cardSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 8,
  },
  cardLines: {
    flex: 1,
    marginLeft: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statSkeleton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
});

export default ShimmerBlock;
