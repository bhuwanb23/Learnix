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

export default function UpcomingTests({ tests, onTestPress }) {
  const fadeAnims = useRef([]).current;
  const scaleAnims = useRef([]).current;

  useEffect(() => {
    if (!tests || tests.length === 0) return;

    tests.forEach((_, index) => {
      if (!fadeAnims[index]) {
        fadeAnims[index] = new Animated.Value(0);
      }
      if (!scaleAnims[index]) {
        scaleAnims[index] = new Animated.Value(0.9);
      }
    });

    const animations = tests.map((_, index) =>
      Animated.parallel([
        Animated.timing(fadeAnims[index], {
          toValue: 1,
          duration: 300,
          delay: index * 100 + 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnims[index], {
          toValue: 1,
          tension: 100,
          friction: 8,
          delay: index * 100 + 200,
          useNativeDriver: true,
        }),
      ])
    );

    Animated.parallel(animations).start();
  }, [tests]);

  const handlePress = (test, index) => {
    Animated.sequence([
      Animated.timing(scaleAnims[index], {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnims[index], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    onTestPress(test);
  };

  if (!tests || tests.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Upcoming Tests</Text>
      <View style={styles.testsList}>
        {tests.map((test, index) => (
          <Animated.View
            key={test.id}
            style={[
              styles.animatedWrapper,
              {
                opacity: fadeAnims[index] || 0,
                transform: [{ scale: scaleAnims[index] || 1 }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.testCard}
              onPress={() => handlePress(test, index)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <View style={styles.testContent}>
                  <View style={styles.testInfo}>
                    <View style={styles.iconContainer}>
                      <Ionicons
                        name="document-text"
                        size={20}
                        color="#3B82F6"
                      />
                    </View>
                    <View style={styles.testDetails}>
                      <Text style={styles.testSubject}>{test.subject}</Text>
                      <View style={styles.dateContainer}>
                        <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.testDate}>{test.date}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.priorityBadge, { backgroundColor: test.priorityBg }]}>
                    <Text style={[styles.priorityText, { color: test.priorityColor }]}>
                      {test.priorityText}
                    </Text>
                  </View>
                </View>
                
                {/* Decorative element */}
                <View style={[styles.decorativeLine, { backgroundColor: test.priorityColor }]} />
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
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  testsList: {
    gap: SPACING.md,
  },
  animatedWrapper: {
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  testCard: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: SPACING.lg,
    position: 'relative',
  },
  testContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  testInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  testDetails: {
    flex: 1,
  },
  testSubject: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  testDate: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  priorityBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  priorityText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  decorativeLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderBottomLeftRadius: BORDER_RADIUS.xl,
  },
});
