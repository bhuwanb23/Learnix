import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Custom BlurView component that mimics expo-blur functionality
// Uses a semi-transparent overlay with gradient for glassmorphism effect
export default function BlurView({ 
  children, 
  intensity = 20, 
  style, 
  tint = 'default',
  ...props 
}) {
  const getBlurColors = () => {
    switch (tint) {
      case 'light':
        return ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)'];
      case 'dark':
        return ['rgba(0, 0, 0, 0.1)', 'rgba(0, 0, 0, 0.05)'];
      case 'default':
      default:
        return ['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.08)'];
    }
  };

  const blurColors = getBlurColors();
  const opacity = Math.min(intensity / 100, 0.3);

  return (
    <View style={[styles.container, style]} {...props}>
      <LinearGradient
        colors={blurColors}
        style={[styles.blurOverlay, { opacity }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
});
