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
import BlurView from '../../../components/BlurView';

import { COLORS, TYPOGRAPHY } from '../constants/theme';

const { width } = Dimensions.get('window');

const testimonials = [
  {
    id: 1,
    name: 'Sarah Chen',
    role: 'Computer Science Student',
    university: 'MIT',
    content: 'Learnix has completely transformed how I manage my academic life. The AI scheduling is incredible!',
    rating: 5,
    avatar: '👩‍💻',
  },
  {
    id: 2,
    name: 'Dr. Michael Rodriguez',
    role: 'Professor',
    university: 'Stanford',
    content: 'The analytics dashboard gives me insights I never had before. My students are more engaged than ever.',
    rating: 5,
    avatar: '👨‍🏫',
  },
  {
    id: 3,
    name: 'Jennifer Park',
    role: 'Campus Administrator',
    university: 'Harvard',
    content: 'Finally, a system that actually works for everyone. The automation has saved us countless hours.',
    rating: 5,
    avatar: '👩‍💼',
  },
  {
    id: 4,
    name: 'Alex Thompson',
    role: 'Graduate Student',
    university: 'Berkeley',
    content: 'The mobile experience is flawless. I can access everything I need, anywhere on campus.',
    rating: 5,
    avatar: '👨‍🎓',
  },
];

export default function TestimonialsSection() {
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
        <Text style={styles.title}>What Our Users Say</Text>
        <Text style={styles.subtitle}>
          Real feedback from students, teachers, and administrators
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={width * 0.85}
        snapToAlignment="center"
      >
        {testimonials.map((testimonial, index) => (
          <TestimonialCard key={testimonial.id} testimonial={testimonial} index={index} />
        ))}
      </ScrollView>
    </Animated.View>
  );
}

function TestimonialCard({ testimonial, index }) {
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 600,
      delay: index * 150,
      useNativeDriver: true,
    }).start();
  }, [index]);

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Text key={i} style={styles.star}>
        {i < rating ? '⭐' : '☆'}
      </Text>
    ));
  };

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
          <View style={styles.quoteContainer}>
            <Text style={styles.quote}>"</Text>
          </View>
          
          <Text style={styles.content}>{testimonial.content}</Text>
          
          <View style={styles.rating}>
            {renderStars(testimonial.rating)}
          </View>
          
          <View style={styles.author}>
            <Text style={styles.avatar}>{testimonial.avatar}</Text>
            <View style={styles.authorInfo}>
              <Text style={styles.name}>{testimonial.name}</Text>
              <Text style={styles.role}>{testimonial.role}</Text>
              <Text style={styles.university}>{testimonial.university}</Text>
            </View>
          </View>
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
    width: width * 0.8,
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
  },
  quoteContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  quote: {
    fontSize: 48,
    color: COLORS.accent,
    fontWeight: 'bold',
  },
  content: {
    fontSize: 16,
    color: COLORS.textLight,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  rating: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  star: {
    fontSize: 16,
    marginHorizontal: 2,
  },
  author: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    fontSize: 32,
    marginRight: 16,
  },
  authorInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  university: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '600',
  },
});
