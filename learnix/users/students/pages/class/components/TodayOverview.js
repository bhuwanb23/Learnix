import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../constants/theme';

export default function TodayOverview({ schedule, onPress }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 120,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    onPress && onPress();
  };

  if (!schedule) return null;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.animatedContainer,
          {
            transform: [
              { scale: scaleAnim },
              { translateY: slideAnim },
            ],
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
          <LinearGradient
            colors={['#3B82F6', '#1E40AF', '#1D4ED8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientCard}
          >
            {/* Decorative shapes */}
            <View style={styles.decorativeShapes}>
              <View style={[styles.shape, styles.shape1]} />
              <View style={[styles.shape, styles.shape2]} />
              <View style={[styles.shape, styles.shape3]} />
            </View>

            <View style={styles.header}>
              <Ionicons name="calendar-outline" size={24} color="#FFFFFF" />
              <Text style={styles.title}>Today's Schedule</Text>
            </View>
            
            <View style={styles.content}>
              <View style={styles.leftSection}>
                <View style={styles.statItem}>
                  <Text style={styles.classCount}>{schedule.totalClasses}</Text>
                  <Text style={styles.classLabel}>Classes</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.testsCount}>{schedule.pendingTests}</Text>
                  <Text style={styles.testsLabel}>Tests Pending</Text>
                </View>
              </View>
              
              <View style={styles.rightSection}>
                <View style={styles.nextClassCard}>
                  <Text style={styles.nextClassLabel}>Next Class</Text>
                  <View style={styles.nextClassInfo}>
                    <Ionicons name="book-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.nextClassSubject}>{schedule.nextClass.subject}</Text>
                  </View>
                  <View style={styles.timeContainer}>
                    <Ionicons name="time-outline" size={14} color="rgba(255, 255, 255, 0.8)" />
                    <Text style={styles.nextClassTime}>{schedule.nextClass.time}</Text>
                  </View>
                </View>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  animatedContainer: {
    shadowColor: '#1E40AF',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  gradientCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    overflow: 'hidden',
    position: 'relative',
  },
  decorativeShapes: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  shape: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 50,
  },
  shape1: {
    width: 80,
    height: 80,
    top: -20,
    right: -20,
  },
  shape2: {
    width: 60,
    height: 60,
    bottom: -15,
    left: -15,
  },
  shape3: {
    width: 40,
    height: 40,
    top: 30,
    left: 20,
    opacity: 0.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    zIndex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#FFFFFF',
    marginLeft: SPACING.sm,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 1,
  },
  leftSection: {
    flex: 1,
    gap: SPACING.sm,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  statItem: {
    alignItems: 'flex-start',
  },
  classCount: {
    fontSize: 24,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#FFFFFF',
    lineHeight: 28,
  },
  classLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  testsCount: {
    fontSize: 18,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  testsLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  nextClassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'flex-end',
    minWidth: 120,
  },
  nextClassLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: SPACING.xs,
  },
  nextClassInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  nextClassSubject: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#FFFFFF',
    marginLeft: SPACING.xs,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextClassTime: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: SPACING.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
});
