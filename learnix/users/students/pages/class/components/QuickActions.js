import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../constants/theme';

export default function QuickActions({ onActionPress }) {
  const fadeAnims = useRef([]).current;
  const scaleAnims = useRef([]).current;

  const quickActions = [
    {
      id: 'notes',
      title: 'Notes',
      icon: 'book-outline',
      gradientColors: ['#3B82F6', '#1E40AF'],
      iconColor: '#FFFFFF',
    },
    {
      id: 'quizzes',
      title: 'Quizzes',
      icon: 'help-circle-outline',
      gradientColors: ['#06B6D4', '#0891B2'],
      iconColor: '#FFFFFF',
    },
    {
      id: 'weak-topics',
      title: 'Weak Topics',
      icon: 'warning-outline',
      gradientColors: ['#F59E0B', '#D97706'],
      iconColor: '#FFFFFF',
    },
    {
      id: 'ai-buddy',
      title: 'AI Buddy',
      icon: 'hardware-chip-outline',
      gradientColors: ['#8B5CF6', '#7C3AED'],
      iconColor: '#FFFFFF',
    },
  ];

  // Initialize animations
  useEffect(() => {
    if (quickActions.length === 0) return;

    quickActions.forEach((_, index) => {
      if (!fadeAnims[index]) {
        fadeAnims[index] = new Animated.Value(0);
      }
      if (!scaleAnims[index]) {
        scaleAnims[index] = new Animated.Value(0.8);
      }
    });

    // Stagger the animations
    const animations = quickActions.map((_, index) =>
      Animated.parallel([
        Animated.timing(fadeAnims[index], {
          toValue: 1,
          duration: 300,
          delay: index * 50,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnims[index], {
          toValue: 1,
          tension: 120,
          friction: 8,
          delay: index * 50,
          useNativeDriver: true,
        }),
      ])
    );

    Animated.parallel(animations).start();
  }, []);

  const handlePress = (actionId, index) => {
    Animated.sequence([
      Animated.timing(scaleAnims[index], {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnims[index], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    onActionPress(actionId);
  };

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {quickActions.map((action, index) => (
          <Animated.View
            key={action.id}
            style={[
              styles.animatedWrapper,
              {
                opacity: fadeAnims[index] || 0,
                transform: [{ scale: scaleAnims[index] || 1 }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handlePress(action.id, index)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={action.gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBackground}
              >
                <View style={styles.actionContent}>
                  <View style={styles.iconContainer}>
                    <Ionicons
                      name={action.icon}
                      size={28}
                      color={action.iconColor}
                    />
                  </View>
                  <Text style={styles.actionTitle}>{action.title}</Text>
                </View>
                
                {/* Decorative elements */}
                <View style={styles.decorativeCircle1} />
                <View style={styles.decorativeCircle2} />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  animatedWrapper: {
    width: '48%',
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButton: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
  },
  gradientBackground: {
    padding: SPACING.md,
    position: 'relative',
    overflow: 'hidden',
  },
  actionContent: {
    alignItems: 'center',
    gap: SPACING.sm,
    zIndex: 1,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  actionTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -10,
    right: -10,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 25,
    height: 25,
    borderRadius: 12.5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    bottom: 10,
    left: 10,
  },
});
