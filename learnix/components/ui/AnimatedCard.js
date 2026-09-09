import React, { useRef, useEffect } from 'react';
import { Animated, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * AnimatedCard — wraps children with:
 * 1. Fade + slide-up entrance animation (staggered by `delay` prop)
 * 2. Scale-down press feedback
 * 3. Card shadow that reduces on press
 *
 * Usage:
 * <AnimatedCard onPress={handlePress} delay={index * 60}>
 *   <Text>Card content</Text>
 * </AnimatedCard>
 */
export default function AnimatedCard({ children, onPress, delay = 0, style, activeOpacity = 0.97 }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        delay,
        tension: 180,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      tension: 200,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 200,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const animatedStyle = {
    opacity: fadeAnim,
    transform: [
      { translateY: slideAnim },
      { scale: scaleAnim },
    ],
  };

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={activeOpacity}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View style={[styles.card, animatedStyle, style]}>
          {children}
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <Animated.View style={[styles.card, animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
});
