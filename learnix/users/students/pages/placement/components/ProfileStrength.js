import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../../../../constants/theme';

export default function ProfileStrength() {
  const progress = 85;
  const circumference = 2 * Math.PI * 74;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={styles.container}>
      {/* Circular Progress - Centered */}
      <View style={styles.progressWrapper}>
        <View style={styles.progressCircle}>
          <View style={styles.progressBackground} />
          <View style={styles.progressOverlay} />
          <View style={styles.progressInner}>
            <Text style={styles.progressText}>{progress}%</Text>
            <Text style={styles.progressLabel}>Strength</Text>
          </View>
        </View>
      </View>

      {/* Heading */}
      <Text style={styles.title}>Profile Strength</Text>

      {/* Description */}
      <Text style={styles.subtitle}>
        Add 'Certifications' to reach 95% and unlock Premium roles.
      </Text>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Resume Score</Text>
          <Text style={[styles.statValue, { color: COLORS.secondary }]}>92/100</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Eligibility</Text>
          <Text style={[styles.statValue, { color: COLORS.tertiary }]}>Verified</Text>
        </View>
      </View>

      {/* CTA Card */}
      <TouchableOpacity style={styles.ctaCard} activeOpacity={0.9}>
        <Ionicons name="rocket-launch-outline" size={32} color={COLORS.white} />
        <Text style={styles.ctaTitle}>Ready for Direct Interview?</Text>
        <TouchableOpacity style={styles.ctaButton} activeOpacity={0.8}>
          <Text style={styles.ctaButtonText}>Update Availability</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.xl + 8,
  },
  progressWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  progressCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  progressBackground: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.background,
    opacity: 0.3,
  },
  progressOverlay: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.primary,
    opacity: 0.2,
  },
  progressInner: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressText: {
    fontSize: 32,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.extraBold,
    color: COLORS.primary,
  },
  progressLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    color: 'rgba(44, 47, 49, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 2,
  },
  title: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(44, 47, 49, 0.7)',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    color: 'rgba(44, 47, 49, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  ctaCard: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  ctaTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
    lineHeight: 24,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  ctaButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  ctaButtonText: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
});
