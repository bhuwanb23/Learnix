import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import BlurView from '../../components/BlurView';

// Import components
import HeroSection from './components/HeroSection';
import FeaturesSection from './components/FeaturesSection';
import BenefitsSection from './components/BenefitsSection';
import TestimonialsSection from './components/TestimonialsSection';
import CTAButton from './components/CTAButton';
import AnimatedBackground from './components/AnimatedBackground';
import FloatingParticles from './components/FloatingParticles';

// Import constants
import { COLORS, GRADIENTS, TYPOGRAPHY, ANIMATIONS } from './constants/theme';

const { width, height } = Dimensions.get('window');

export default function LandingScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Initial animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGetStarted = () => {
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Animated Background */}
      <AnimatedBackground />
      
      {/* Floating Particles */}
      <FloatingParticles />
      
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Hero Section */}
          <HeroSection onGetStarted={handleGetStarted} />
          
          {/* Features Section */}
          <FeaturesSection />
          
          {/* Benefits Section */}
          <BenefitsSection />
          
          {/* Testimonials Section */}
          <TestimonialsSection />
          
          {/* CTA Section */}
          <View style={styles.ctaSection}>
            <CTAButton onPress={handleGetStarted} />
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  ctaSection: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    paddingBottom: 60, // Extra padding for bottom navigation bar
    alignItems: 'center',
  },
});
