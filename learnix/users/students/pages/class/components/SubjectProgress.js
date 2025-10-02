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

export default function SubjectProgress({ subjects, onSubjectPress }) {
  const fadeAnims = useRef([]).current;
  const progressAnims = useRef([]).current;
  const scaleAnims = useRef([]).current;

  useEffect(() => {
    if (!subjects || subjects.length === 0) return;

    subjects.forEach((subject, index) => {
      if (!fadeAnims[index]) {
        fadeAnims[index] = new Animated.Value(0);
      }
      if (!progressAnims[index]) {
        progressAnims[index] = new Animated.Value(0);
      }
      if (!scaleAnims[index]) {
        scaleAnims[index] = new Animated.Value(0.9);
      }
    });

    // Stagger animations
    const animations = subjects.map((_, index) =>
      Animated.parallel([
        Animated.timing(fadeAnims[index], {
          toValue: 1,
          duration: 300,
          delay: index * 75,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnims[index], {
          toValue: 1,
          tension: 100,
          friction: 8,
          delay: index * 75,
          useNativeDriver: true,
        }),
      ])
    );

    Animated.parallel(animations).start(() => {
      // Animate progress bars after cards appear
      const progressAnimations = subjects.map((subject, index) =>
        Animated.timing(progressAnims[index], {
          toValue: subject.progress,
          duration: 600,
          delay: index * 50,
          useNativeDriver: false,
        })
      );
      Animated.parallel(progressAnimations).start();
    });
  }, [subjects]);

  const handlePress = (subject, index) => {
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
    onSubjectPress(subject);
  };

  if (!subjects || subjects.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Subject Progress</Text>
      <View style={styles.subjectsList}>
        {subjects.map((subject, index) => (
          <Animated.View
            key={subject.id}
            style={[
              styles.animatedWrapper,
              {
                opacity: fadeAnims[index] || 0,
                transform: [{ scale: scaleAnims[index] || 1 }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.subjectCard}
              onPress={() => handlePress(subject, index)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <View style={styles.subjectHeader}>
                  <View style={styles.subjectInfo}>
                    <LinearGradient
                      colors={['#3B82F6', '#1E40AF']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.iconContainer}
                    >
                      <Ionicons
                        name={subject.icon}
                        size={24}
                        color="#FFFFFF"
                      />
                    </LinearGradient>
                    <View style={styles.subjectDetails}>
                      <Text style={styles.subjectName}>{subject.name}</Text>
                      <Text style={styles.subjectChapter}>{subject.chapter}</Text>
                    </View>
                  </View>
                  <View style={styles.progressContainer}>
                    <Text style={styles.progressPercentage}>
                      {subject.progress}%
                    </Text>
                    <View style={styles.progressCircle}>
                      <Ionicons name="trending-up" size={16} color="#3B82F6" />
                    </View>
                  </View>
                </View>
                
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBackground}>
                    <Animated.View
                      style={[
                        styles.progressBarFill,
                        {
                          width: progressAnims[index] ? progressAnims[index].interpolate({
                            inputRange: [0, 100],
                            outputRange: ['0%', '100%'],
                            extrapolate: 'clamp',
                          }) : '0%',
                        },
                      ]}
                    >
                      <LinearGradient
                        colors={['#3B82F6', '#1E40AF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.progressGradient}
                      />
                    </Animated.View>
                  </View>
                </View>

                {/* Decorative elements */}
                <View style={styles.decorativeShape} />
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
    paddingBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  subjectsList: {
    gap: SPACING.md,
  },
  animatedWrapper: {
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  subjectCard: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: SPACING.md,
    position: 'relative',
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  subjectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  subjectDetails: {
    flex: 1,
  },
  subjectName: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  subjectChapter: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  progressContainer: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  progressPercentage: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#3B82F6',
  },
  progressCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarContainer: {
    width: '100%',
  },
  progressBarBackground: {
    width: '100%',
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressGradient: {
    flex: 1,
    borderRadius: 6,
  },
  decorativeShape: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    top: -15,
    right: -15,
  },
});
