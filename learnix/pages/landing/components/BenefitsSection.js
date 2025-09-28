import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import BlurView from '../../../components/BlurView';

import { COLORS, TYPOGRAPHY } from '../constants/theme';

const { width } = Dimensions.get('window');

const benefits = [
  {
    id: 1,
    title: 'For Students',
    items: [
      'Easy course registration',
      'Real-time grade tracking',
      'Campus event notifications',
      'Study group formation',
    ],
    gradient: ['rgba(59, 130, 246, 0.2)', 'rgba(147, 51, 234, 0.2)'],
  },
  {
    id: 2,
    title: 'For Teachers',
    items: [
      'Automated attendance',
      'Grade management tools',
      'Student progress analytics',
      'Resource scheduling',
    ],
    gradient: ['rgba(16, 185, 129, 0.2)', 'rgba(59, 130, 246, 0.2)'],
  },
  {
    id: 3,
    title: 'For Administrators',
    items: [
      'Campus-wide analytics',
      'Resource optimization',
      'Student engagement metrics',
      'Automated reporting',
    ],
    gradient: ['rgba(245, 101, 101, 0.2)', 'rgba(147, 51, 234, 0.2)'],
  },
];

export default function BenefitsSection() {
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
        <Text style={styles.title}>Benefits for Everyone</Text>
        <Text style={styles.subtitle}>
          Tailored solutions for every member of your campus community
        </Text>
      </View>

      <View style={styles.benefitsGrid}>
        {benefits.map((benefit, index) => (
          <BenefitCard key={benefit.id} benefit={benefit} index={index} />
        ))}
      </View>
    </Animated.View>
  );
}

function BenefitCard({ benefit, index }) {
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 600,
      delay: index * 200,
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
          colors={benefit.gradient}
          style={styles.cardGradient}
        >
          <Text style={styles.cardTitle}>{benefit.title}</Text>
          
          <View style={styles.itemsContainer}>
            {benefit.items.map((item, itemIndex) => (
              <View key={itemIndex} style={styles.item}>
                <View style={styles.bullet} />
                <Text style={styles.itemText}>{item}</Text>
              </View>
            ))}
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
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: (width - 60) / 3,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 16,
    textAlign: 'center',
  },
  itemsContainer: {
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
    marginRight: 12,
  },
  itemText: {
    fontSize: 14,
    color: COLORS.textLight,
    flex: 1,
    lineHeight: 18,
  },
});
