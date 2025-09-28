import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';

import { COLORS } from '../constants/theme';

const { width, height } = Dimensions.get('window');

const PARTICLE_COUNT = 15;

export default function FloatingParticles() {
  const particles = useRef(
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      x: new Animated.Value(Math.random() * width),
      y: new Animated.Value(Math.random() * height),
      scale: new Animated.Value(Math.random() * 0.5 + 0.5),
      opacity: new Animated.Value(Math.random() * 0.5 + 0.3),
      rotation: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    particles.forEach((particle, index) => {
      // Random movement animation
      const animateParticle = () => {
        const randomX = Math.random() * width;
        const randomY = Math.random() * height;
        const randomScale = Math.random() * 0.5 + 0.5;
        const randomOpacity = Math.random() * 0.5 + 0.3;
        const randomRotation = Math.random() * 360;

        Animated.parallel([
          Animated.timing(particle.x, {
            toValue: randomX,
            duration: Math.random() * 8000 + 5000,
            useNativeDriver: true,
          }),
          Animated.timing(particle.y, {
            toValue: randomY,
            duration: Math.random() * 8000 + 5000,
            useNativeDriver: true,
          }),
          Animated.timing(particle.scale, {
            toValue: randomScale,
            duration: Math.random() * 3000 + 2000,
            useNativeDriver: true,
          }),
          Animated.timing(particle.opacity, {
            toValue: randomOpacity,
            duration: Math.random() * 3000 + 2000,
            useNativeDriver: true,
          }),
          Animated.timing(particle.rotation, {
            toValue: randomRotation,
            duration: Math.random() * 10000 + 5000,
            useNativeDriver: true,
          }),
        ]).start(() => {
          animateParticle();
        });
      };

      // Start animation with delay
      setTimeout(() => {
        animateParticle();
      }, index * 500);
    });
  }, []);

  return (
    <View style={styles.container}>
      {particles.map((particle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.particle,
            {
              transform: [
                { translateX: particle.x },
                { translateY: particle.y },
                { scale: particle.scale },
                {
                  rotate: particle.rotation.interpolate({
                    inputRange: [0, 360],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
              opacity: particle.opacity,
            },
          ]}
        >
          <View style={styles.particleInner} />
        </Animated.View>
      ))}
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
    pointerEvents: 'none',
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  particleInner: {
    flex: 1,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
});
