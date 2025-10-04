import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../constants/theme';
import { COLOR_MAP } from '../constants/performanceData';

export default function QuickActionCard({ action, onPress }) {
  const colorConfig = COLOR_MAP[action.color] || COLOR_MAP.blue;
  const scaleValue = new Animated.Value(1);
  const opacityValue = new Animated.Value(1);
  
  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: 0.98,
        useNativeDriver: true,
        tension: 400,
        friction: 8,
      }),
      Animated.timing(opacityValue, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
        tension: 400,
        friction: 8,
      }),
      Animated.timing(opacityValue, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start();
  };

  const handlePress = () => {
    onPress(action);
  };
  
  return (
    <Animated.View style={{ 
      transform: [{ scale: scaleValue }],
      opacity: opacityValue,
      width: '48%',
      height: 110,
      marginHorizontal: '1%',
      marginVertical: 4,
    }}>
      <TouchableOpacity 
        style={[styles.container, { backgroundColor: colorConfig.primary }]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.95}
      >
        {/* Subtle background pattern */}
        <View style={[styles.backgroundPattern, { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]} />
        
        {/* Main content */}
        <View style={styles.content}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 255, 255, 0.12)' }]}>
            <Ionicons 
              name={action.icon} 
              size={24} 
              color={COLORS.white}
            />
          </View>
          
          {/* Text content */}
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={2}>{action.title}</Text>
            <Text style={styles.subtitle} numberOfLines={2}>{action.subtitle}</Text>
          </View>
        </View>

        {/* Subtle bottom accent */}
        <View style={[styles.accentBar, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOWS.md,
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundPattern: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.6,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginBottom: SPACING.sm,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.white,
    marginBottom: 4,
    lineHeight: 18,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 14,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  accentBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    borderBottomLeftRadius: BORDER_RADIUS.xl,
    borderBottomRightRadius: BORDER_RADIUS.xl,
  },
});

