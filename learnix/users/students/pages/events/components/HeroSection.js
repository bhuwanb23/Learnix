import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function HeroSection() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  return (
    <View style={[styles.heroContainer, { height: isTablet ? 618 : 530 }]}>
      <Image 
        source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB7YuFWevwcsyOM-rgIzJrYkxQq-Vtq9fETdgjJrpCBRvJcvFDi8v7HermZbPc46BD90XjxQcHSGyk0d6Ajd-UqasKRd4R6DgHmkXYc2CBptQAxidMSd5rssKWoKGTsWtMSCWJoWyFQQaSFmpjm9KnFLnm8Aqk1ApXfQC-RqUfbAT_iAKwpXPTtxKu7Zc0i0RjZjkWQW2BJdnpSJwxoJtb2FwvZYaqpxhwvXwtGAuhKeJx9VNxvYD4hpaOx0E6dN7f5tJsxHg5VKlY' }} 
        style={styles.heroImage} 
      />
      <LinearGradient 
        colors={['rgba(0, 30, 90, 0.8)', 'transparent']} 
        start={{ x: 0, y: 0 }} 
        end={{ x: 1, y: 0 }} 
        style={styles.heroGradient} 
      />
      <View style={[styles.heroContent, { paddingHorizontal: isTablet ? 80 : 32 }]}>
        <View style={styles.heroTag}>
          <Text style={styles.heroTagText}>FEATURED EVENT</Text>
        </View>
        <Text style={[styles.heroTitle, { fontSize: isTablet ? 72 : 36 }]}>
          Innovate-X: 2024 Tech Symposium
        </Text>
        <Text style={[styles.heroDescription, { fontSize: isTablet ? 20 : 18 }]}>
          Join the brightest minds on campus for three days of AI workshops, hardware hacks, and keynote speeches from industry giants.
        </Text>
        <View style={styles.heroButtons}>
          <TouchableOpacity style={styles.registerBtn} activeOpacity={0.9}>
            <Text style={styles.registerBtnText}>Register Now</Text>
            <MaterialIcons name="arrow-forward" size={20} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.scheduleBtn} activeOpacity={0.9}>
            <Text style={styles.scheduleBtnText}>View Schedule</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroContainer: {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: 1024,
  },
  heroTag: {
    backgroundColor: 'rgba(162, 56, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  heroTagText: {
    color: '#5a1c00',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: 'Manrope-Bold',
  },
  heroTitle: {
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: 'PlusJakartaSans-ExtraBold',
    marginBottom: 24,
    lineHeight: Platform.OS === 'ios' ? 0 : undefined,
  },
  heroDescription: {
    color: '#f1f2ff',
    fontFamily: 'Manrope-Medium',
    marginBottom: 32,
    opacity: 0.9,
    maxWidth: 672,
    lineHeight: 28,
  },
  heroButtons: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
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