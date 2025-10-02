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

export default function AIRecommendations({ recommendations, onRecommendationPress }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        delay: 400,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        delay: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Sparkle animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(sparkleAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
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
  };

  if (!recommendations || recommendations.length === 0) return null;

  return (
    <View style={styles.container}>
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
        <TouchableOpacity activeOpacity={0.9} onPress={handlePress}>
          <LinearGradient
            colors={['#3B82F6', '#1E40AF', '#1D4ED8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientCard}
          >
            {/* Decorative shapes */}
            <View style={styles.decorativeShapes}>
              <Animated.View 
                style={[
                  styles.sparkle1,
                  {
                    opacity: sparkleAnim,
                    transform: [
                      {
                        rotate: sparkleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <Animated.View 
                style={[
                  styles.sparkle2,
                  {
                    opacity: sparkleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 0],
                    }),
                  },
                ]}
              />
              <View style={styles.decorativeCircle} />
            </View>

            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons
                  name="bulb"
                  size={24}
                  color="#FFFFFF"
                />
              </View>
              <Text style={styles.headerTitle}>AI Study Recommendations</Text>
            </View>
            
            <Text style={styles.headerSubtitle}>
              Based on your performance, focus on these areas:
            </Text>
            
            <View style={styles.recommendationsList}>
              {recommendations.map((recommendation, index) => (
                <TouchableOpacity
                  key={recommendation.id}
                  style={styles.recommendationItem}
                  onPress={() => onRecommendationPress(recommendation)}
                  activeOpacity={0.8}
                >
                  <View style={styles.recommendationContent}>
                    <View style={styles.recommendationIcon}>
                      <Ionicons
                        name={recommendation.type === 'weak-topic' ? 'warning' : 'fitness'}
                        size={16}
                        color="#FFFFFF"
                      />
                    </View>
                    <View style={styles.recommendationText}>
                      <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
                      <Text style={styles.recommendationDescription}>
                        {recommendation.description}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.7)" />
                  </View>
                </TouchableOpacity>
              ))}
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
    paddingBottom: SPACING.sm,
  },
  animatedWrapper: {
    shadowColor: '#1E40AF',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
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
  sparkle1: {
    position: 'absolute',
    width: 20,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    top: 20,
    right: 30,
  },
  sparkle2: {
    position: 'absolute',
    width: 15,
    height: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 7.5,
    bottom: 30,
    left: 25,
  },
  decorativeCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: -20,
    right: -20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    zIndex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#FFFFFF',
    flexShrink: 1,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: SPACING.md,
    zIndex: 1,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    flexWrap: 'wrap',
  },
  recommendationsList: {
    gap: SPACING.sm,
    zIndex: 1,
  },
  recommendationItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  recommendationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  recommendationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recommendationText: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#FFFFFF',
    marginBottom: SPACING.xs,
    flexShrink: 1,
  },
  recommendationDescription: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 16,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
});
