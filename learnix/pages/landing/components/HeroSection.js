import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import BlurView from '../../../components/BlurView';

import { COLORS, TYPOGRAPHY, ANIMATIONS } from '../constants/theme';

const { width, height } = Dimensions.get('window');

export default function HeroSection({ onGetStarted }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered animations
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const floatInterpolation = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(59, 130, 246, 0.1)', 'rgba(147, 51, 234, 0.1)']}
        style={styles.gradientOverlay}
      />
      
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        {/* Logo and Brand */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ translateY: floatInterpolation }],
            },
          ]}
        >
          <View style={styles.logo}>
            <Text style={styles.logoText}>Learnix</Text>
            <View style={styles.logoAccent} />
          </View>
        </Animated.View>

        {/* Main Heading */}
        <Text style={styles.mainTitle}>
          Upgrade Your{'\n'}
          <Text style={styles.accentText}>Campus Life</Text>
        </Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          AI-driven campus ERP that transforms how students, teachers, and administrators connect, learn, and grow together.
        </Text>

        {/* Floating Tech Icons */}
        <View style={styles.floatingIcons}>
          <Animated.View
            style={[
              styles.techIcon,
              styles.icon1,
              {
                transform: [
                  { translateY: floatInterpolation },
                  { rotate: floatAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  })},
                ],
              },
            ]}
          >
            <Text style={styles.iconText}>🤖</Text>
          </Animated.View>
          
          <Animated.View
            style={[
              styles.techIcon,
              styles.icon2,
              {
                transform: [
                  { translateY: floatInterpolation },
                  { rotate: floatAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['360deg', '0deg'],
                  })},
                ],
              },
            ]}
          >
            <Text style={styles.iconText}>📚</Text>
          </Animated.View>
          
          <Animated.View
            style={[
              styles.techIcon,
              styles.icon3,
              {
                transform: [
                  { translateY: floatInterpolation },
                  { rotate: floatAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  })},
                ],
              },
            ]}
          >
            <Text style={styles.iconText}>🎓</Text>
          </Animated.View>
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={onGetStarted}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[COLORS.accent, COLORS.accentLight]}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.buttonText}>Get Started</Text>
            <Text style={styles.buttonIcon}>→</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: height * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    position: 'relative',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    alignItems: 'center',
    zIndex: 2,
  },
  logoContainer: {
    marginBottom: 30,
  },
  logo: {
    alignItems: 'center',
    position: 'relative',
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    letterSpacing: 2,
  },
  logoAccent: {
    width: 60,
    height: 4,
    backgroundColor: COLORS.accent,
    borderRadius: 2,
    marginTop: 8,
  },
  mainTitle: {
    fontSize: 42,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 50,
    marginBottom: 20,
  },
  accentText: {
    color: COLORS.accent,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  floatingIcons: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  techIcon: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  icon1: {
    top: '20%',
    right: '10%',
  },
  icon2: {
    top: '60%',
    left: '5%',
  },
  icon3: {
    top: '40%',
    left: '15%',
  },
  iconText: {
    fontSize: 24,
  },
  ctaButton: {
    marginTop: 20,
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 16,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
  buttonIcon: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
});
