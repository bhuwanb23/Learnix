import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS } from '../constants/theme';

const { width, height } = Dimensions.get('window');

export default function AnimatedBackground() {
  const waveAnim1 = useRef(new Animated.Value(0)).current;
  const waveAnim2 = useRef(new Animated.Value(0)).current;
  const waveAnim3 = useRef(new Animated.Value(0)).current;
  const particleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Wave animations
    Animated.loop(
      Animated.timing(waveAnim1, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.timing(waveAnim2, {
        toValue: 1,
        duration: 15000,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.timing(waveAnim3, {
        toValue: 1,
        duration: 12000,
        useNativeDriver: true,
      })
    ).start();

    // Particle animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(particleAnim, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        }),
        Animated.timing(particleAnim, {
          toValue: 0,
          duration: 8000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const wave1TranslateX = waveAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  const wave2TranslateX = waveAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [width, -width],
  });

  const wave3TranslateX = waveAnim3.interpolate({
    inputRange: [0, 1],
    outputRange: [-width * 0.5, width * 0.5],
  });

  const particleOpacity = particleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1, 0],
  });

  return (
    <View style={styles.container}>
      {/* Base gradient background */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark, COLORS.secondary]}
        style={styles.baseGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Animated wave 1 */}
      <Animated.View
        style={[
          styles.wave,
          styles.wave1,
          {
            transform: [{ translateX: wave1TranslateX }],
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(59, 130, 246, 0.2)', 'rgba(147, 51, 234, 0.1)', 'transparent']}
          style={styles.waveGradient}
        />
      </Animated.View>

      {/* Animated wave 2 */}
      <Animated.View
        style={[
          styles.wave,
          styles.wave2,
          {
            transform: [{ translateX: wave2TranslateX }],
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(16, 185, 129, 0.15)', 'rgba(59, 130, 246, 0.2)', 'transparent']}
          style={styles.waveGradient}
        />
      </Animated.View>

      {/* Animated wave 3 */}
      <Animated.View
        style={[
          styles.wave,
          styles.wave3,
          {
            transform: [{ translateX: wave3TranslateX }],
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(245, 101, 101, 0.15)', 'rgba(147, 51, 234, 0.1)', 'transparent']}
          style={styles.waveGradient}
        />
      </Animated.View>

      {/* Floating particles */}
      <Animated.View
        style={[
          styles.particles,
          {
            opacity: particleOpacity,
          },
        ]}
      >
        {Array.from({ length: 12 }, (_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              {
                left: Math.random() * width,
                top: Math.random() * height,
                animationDelay: `${i * 0.2}s`,
              },
            ]}
          />
        ))}
      </Animated.View>

      {/* Overlay gradient for depth */}
      <LinearGradient
        colors={['transparent', 'rgba(0, 0, 0, 0.1)', 'rgba(0, 0, 0, 0.3)']}
        style={styles.overlay}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  baseGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  wave: {
    position: 'absolute',
    width: width * 2,
    height: 150,
    borderRadius: 75,
  },
  wave1: {
    top: height * 0.2,
    opacity: 0.4,
  },
  wave2: {
    top: height * 0.5,
    opacity: 0.3,
  },
  wave3: {
    top: height * 0.8,
    opacity: 0.35,
  },
  waveGradient: {
    flex: 1,
    borderRadius: 75,
  },
  particles: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  particle: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
