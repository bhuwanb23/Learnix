import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';

import { COLORS } from '../constants/theme';

const { width, height } = Dimensions.get('window');

const ELEMENT_COUNT = 8;

export default function FloatingElements() {
  const elements = useRef(
    Array.from({ length: ELEMENT_COUNT }, (_, i) => ({
      x: new Animated.Value(Math.random() * width),
      y: new Animated.Value(Math.random() * height),
      scale: new Animated.Value(Math.random() * 0.3 + 0.2),
      opacity: new Animated.Value(Math.random() * 0.4 + 0.2),
      rotation: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    elements.forEach((element, index) => {
      // Random movement animation
      const animateElement = () => {
        const randomX = Math.random() * width;
        const randomY = Math.random() * height;
        const randomScale = Math.random() * 0.3 + 0.2;
        const randomOpacity = Math.random() * 0.4 + 0.2;
        const randomRotation = Math.random() * 360;

        Animated.parallel([
          Animated.timing(element.x, {
            toValue: randomX,
            duration: Math.random() * 10000 + 8000,
            useNativeDriver: true,
          }),
          Animated.timing(element.y, {
            toValue: randomY,
            duration: Math.random() * 10000 + 8000,
            useNativeDriver: true,
          }),
          Animated.timing(element.scale, {
            toValue: randomScale,
            duration: Math.random() * 4000 + 3000,
            useNativeDriver: true,
          }),
          Animated.timing(element.opacity, {
            toValue: randomOpacity,
            duration: Math.random() * 4000 + 3000,
            useNativeDriver: true,
          }),
          Animated.timing(element.rotation, {
            toValue: randomRotation,
            duration: Math.random() * 15000 + 10000,
            useNativeDriver: true,
          }),
        ]).start(() => {
          animateElement();
        });
      };

      // Start animation with delay
      setTimeout(() => {
        animateElement();
      }, index * 1000);
    });
  }, []);

  const elementShapes = ['circle', 'square', 'triangle', 'diamond'];

  return (
    <View style={styles.container}>
      {elements.map((element, index) => (
        <Animated.View
          key={index}
          style={[
            styles.element,
            styles[elementShapes[index % elementShapes.length]],
            {
              transform: [
                { translateX: element.x },
                { translateY: element.y },
                { scale: element.scale },
                {
                  rotate: element.rotation.interpolate({
                    inputRange: [0, 360],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
              opacity: element.opacity,
            },
          ]}
        >
          <View style={styles.elementInner} />
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
  element: {
    position: 'absolute',
    width: 20,
    height: 20,
  },
  circle: {
    borderRadius: 10,
  },
  square: {
    borderRadius: 4,
  },
  triangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 17,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: COLORS.accent,
  },
  diamond: {
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
  },
  elementInner: {
    flex: 1,
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 3,
  },
});
