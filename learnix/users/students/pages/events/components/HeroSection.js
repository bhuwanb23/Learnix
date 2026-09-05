import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, useWindowDimensions, Platform, Animated, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../constants/theme';

export default function HeroSection() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  return (
    <View style={[styles.heroContainer, { height: isTablet ? 520 : 400 }]}>
      <Image 
        source={{ uri: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop' }} 
        style={styles.heroImage} 
      />
      <LinearGradient 
        colors={['rgba(15, 23, 42, 0.85)', 'rgba(15, 23, 42, 0.4)', 'rgba(15, 23, 42, 0.95)']} 
        style={styles.heroGradient} 
      />
      
      <Animated.View style={[
        styles.heroContent, 
        { 
          paddingHorizontal: isDesktop ? 120 : (isTablet ? 60 : 20),
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}>
        <View style={styles.heroBadge}>
          <View style={styles.badgeDot} />
          <Text style={styles.heroBadgeText}>LIVE NOW</Text>
        </View>
        
        <Text style={[
          styles.heroTitle, 
          { fontSize: isDesktop ? 56 : (isTablet ? 42 : 28) }
        ]}>
          Innovate-X{'\n'}2024 Tech Symposium
        </Text>
        
        <Text style={[
          styles.heroDescription, 
          { fontSize: isTablet ? 16 : 13 }
        ]}>
          Join the brightest minds on campus for three days of AI workshops, hardware hacks, and keynote speeches.
        </Text>
        
        <View style={styles.heroButtons}>
          <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.8} onPress={() => Alert.alert('Reserve Spot', 'Registration for Innovate-X 2024 opens below — scroll to the event cards to join.')}>
            <Text style={styles.primaryBtnText}>Reserve Spot</Text>
            <MaterialIcons name="arrow-forward" size={20} color={COLORS.white} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.8} onPress={() => Alert.alert('Explore Schedule', 'The full 3-day symposium schedule will open here.')}>
            <Text style={styles.secondaryBtnText}>Explore Schedule</Text>
          </TouchableOpacity>
        </View>
        
        {/* Social Proof / Stats */}
        <View style={styles.heroStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>1.2k+</Text>
            <Text style={styles.statLabel}>Attendees</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>45</Text>
            <Text style={styles.statLabel}>Speakers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Workshops</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroContainer: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: COLORS.black,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.7,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 24,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.full,
    alignSelf: 'flex-start',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
    marginRight: 8,
  },
  heroBadgeText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: 'Manrope-Bold',
  },
  heroTitle: {
    fontWeight: '800',
    color: COLORS.white,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    marginBottom: 10,
    letterSpacing: -1,
  },
  heroDescription: {
    color: COLORS.gray300,
    fontFamily: 'Manrope-Regular',
    marginBottom: SPACING.md,
    maxWidth: 600,
    lineHeight: 20,
  },
  heroButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: BORDER_RADIUS.xl,
    gap: 8,
    flexShrink: 1,
  },
  primaryBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  secondaryBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    flexShrink: 1,
  },
  secondaryBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 13,
    fontFamily: 'Manrope-SemiBold',
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 14,
    borderRadius: BORDER_RADIUS.xxl,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  statLabel: {
    color: COLORS.gray400,
    fontSize: 10,
    marginTop: 3,
    fontFamily: 'Manrope-Medium',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 24,
  },
  registerBtn: {
    backgroundColor: '#0050d4',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  registerBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
    fontFamily: 'Manrope-Bold',
  },
  scheduleBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  scheduleBtnText: {
    color: '#2c2f31',
    fontWeight: '700',
    fontSize: 16,
    fontFamily: 'Manrope-Bold',
  },
});