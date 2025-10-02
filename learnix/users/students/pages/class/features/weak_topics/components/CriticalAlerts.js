import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../../../constants/theme';

export default function CriticalAlerts({ alerts }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (alerts && alerts.length > 0) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();

      // Pulse animation for attention
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [alerts]);

  if (!alerts || alerts.length === 0) {
    return null;
  }

  return (
    <Animated.View style={[
      styles.container,
      {
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      },
    ]}>
      {alerts.map((alert, index) => (
        <Animated.View
          key={alert.id}
          style={{
            transform: [{ scale: index === 0 ? pulseAnim : 1 }],
          }}
        >
          <LinearGradient
            colors={['#FEF2F2', '#FEE2E2', '#FECACA']}
            style={styles.alertCard}
          >
          <View style={styles.alertContent}>
            <View style={styles.iconContainer}>
              <Ionicons 
                name="warning-outline" 
                size={20} 
                color="#EF4444" 
              />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Text style={styles.alertMessage}>{alert.message}</Text>
            </View>
          </View>
          
          {/* Decorative border */}
          <View style={styles.leftBorder} />
          
          {/* Floating decorative elements */}
          <View style={styles.floatingDot1} />
          <View style={styles.floatingDot2} />
        </LinearGradient>
        </Animated.View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md, // Reduced padding
    paddingTop: SPACING.md,
  },
  alertCard: {
    borderRadius: BORDER_RADIUS.xl, // Increased border radius
    marginBottom: SPACING.sm,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.lg,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  textContainer: {
    flex: 1,
  },
  alertTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: '#991B1B',
    marginBottom: SPACING.xs,
  },
  alertMessage: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: '#B91C1C',
    lineHeight: 18,
    opacity: 0.9,
  },
  leftBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: '#EF4444',
  },
  floatingDot1: {
    position: 'absolute',
    top: 10,
    right: 15,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    opacity: 0.3,
  },
  floatingDot2: {
    position: 'absolute',
    bottom: 15,
    right: 25,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F87171',
    opacity: 0.4,
  },
});
