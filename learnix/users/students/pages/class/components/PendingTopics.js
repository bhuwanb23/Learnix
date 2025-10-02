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

export default function PendingTopics({ topics, onStudyPress }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const topicAnims = useRef([]).current;

  useEffect(() => {
    if (!topics || topics.length === 0) return;

    // Initialize topic animations
    topics.forEach((_, index) => {
      if (!topicAnims[index]) {
        topicAnims[index] = new Animated.Value(0);
      }
    });

    // Main card animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Stagger topic animations
      const topicAnimations = topics.map((_, index) =>
        Animated.timing(topicAnims[index], {
          toValue: 1,
          duration: 200,
          delay: index * 50,
          useNativeDriver: true,
        })
      );
      Animated.parallel(topicAnimations).start();
    });
  }, [topics]);

  const handleStudyPress = (topic) => {
    // Add a small bounce animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    onStudyPress(topic);
  };

  if (!topics || topics.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Pending Topics</Text>
      <Animated.View
        style={[
          styles.animatedWrapper,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: slideAnim },
            ],
          },
        ]}
      >
        <View style={styles.topicsCard}>
          <LinearGradient
            colors={['#FFFFFF', '#F8FAFC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <View style={styles.topicsList}>
              {topics.map((topic, index) => (
                <Animated.View
                  key={topic.id}
                  style={[
                    styles.topicItemWrapper,
                    {
                      opacity: topicAnims[index] || 0,
                      transform: [
                        {
                          translateX: topicAnims[index] ? topicAnims[index].interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0],
                          }) : 0,
                        },
                      ],
                    },
                  ]}
                >
                  <View style={styles.topicItem}>
                    <View style={styles.topicInfo}>
                      <View style={styles.topicIconContainer}>
                        <Ionicons
                          name="ellipse"
                          size={12}
                          color="#3B82F6"
                        />
                      </View>
                      <Text style={styles.topicTitle}>{topic.title}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.studyButton}
                      onPress={() => handleStudyPress(topic)}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={['#3B82F6', '#1E40AF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.buttonGradient}
                      >
                        <Ionicons name="play" size={12} color="#FFFFFF" />
                        <Text style={styles.studyButtonText}>Study</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              ))}
            </View>
            
            {/* Decorative elements */}
            <View style={styles.decorativeShape1} />
            <View style={styles.decorativeShape2} />
          </LinearGradient>
        </View>
      </Animated.View>
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
  topicsCard: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: SPACING.lg,
    position: 'relative',
  },
  topicsList: {
    gap: SPACING.md,
    zIndex: 1,
  },
  topicItemWrapper: {
    // Wrapper for individual topic animations
  },
  topicItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
  },
  topicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  topicIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  topicTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textPrimary,
    flex: 1,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  studyButton: {
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  studyButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  decorativeShape1: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    top: -10,
    right: -10,
  },
  decorativeShape2: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    bottom: 10,
    left: 10,
  },
});
