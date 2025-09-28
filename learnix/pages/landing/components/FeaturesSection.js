import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

import { COLORS, TYPOGRAPHY } from '../constants/theme';

const { width } = Dimensions.get('window');

const features = [
  {
    id: 1,
    icon: '🎯',
    title: 'Smart Scheduling',
    description: 'AI-powered class scheduling that optimizes resources and minimizes conflicts.',
  },
  {
    id: 2,
    icon: '📊',
    title: 'Analytics Dashboard',
    description: 'Real-time insights into academic performance and campus activities.',
  },
  {
    id: 3,
    icon: '💬',
    title: 'Communication Hub',
    description: 'Seamless messaging between students, teachers, and administrators.',
  },
  {
    id: 4,
    icon: '📱',
    title: 'Mobile First',
    description: 'Access everything on-the-go with our intuitive mobile interface.',
  },
  {
    id: 5,
    icon: '🔐',
    title: 'Secure & Private',
    description: 'Enterprise-grade security protecting all your academic data.',
  },
  {
    id: 6,
    icon: '🤖',
    title: 'AI Assistant',
    description: 'Intelligent chatbot to help with queries and campus navigation.',
  },
];

export default function FeaturesSection() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Powerful Features</Text>
        <Text style={styles.subtitle}>
          Everything you need to transform your campus experience
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={width * 0.8}
        snapToAlignment="center"
      >
        {features.map((feature, index) => (
          <FeatureCard key={feature.id} feature={feature} index={index} />
        ))}
      </ScrollView>
    </Animated.View>
  );
}

function FeatureCard({ feature, index }) {
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 600,
      delay: index * 100,
      useNativeDriver: true,
    }).start();
  }, [index]);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: cardAnim,
          transform: [
            {
              translateY: cardAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              }),
            },
          ],
        },
      ]}
    >
      <BlurView intensity={20} style={styles.cardBlur}>
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
          style={styles.cardGradient}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{feature.icon}</Text>
          </View>
          
          <Text style={styles.cardTitle}>{feature.title}</Text>
          <Text style={styles.cardDescription}>{feature.description}</Text>
          
          <View style={styles.cardAccent} />
        </LinearGradient>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  card: {
    width: width * 0.75,
    marginRight: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 24,
    position: 'relative',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 28,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 12,
  },
  cardDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  cardAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.accent,
  },
});
