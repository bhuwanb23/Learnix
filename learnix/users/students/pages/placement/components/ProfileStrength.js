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
      <View style={styles.mainCard}>
        {/* Circular Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressCircle}>
            <View style={[
              styles.circularProgress,
              {
                backgroundColor: `conic-gradient(${COLORS.primary} ${progress * 3.6}deg, #dfe3e6 0deg)`,
              }
            ]} />
            <View style={styles.progressInner}>
              <Text style={styles.progressText}>{progress}%</Text>
              <Text style={styles.progressLabel}>Strength</Text>
            </View>
          </View>
        </View>

        {/* Profile Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.title}>Profile Strength</Text>
          <Text style={styles.subtitle}>
            Add 'Certifications' to reach 95% and unlock Premium roles.
          </Text>

          {/* Stats Grid */}
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
  mainCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    flexDirection: 'row',
    gap: SPACING.xl,
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 3,
    marginBottom: SPACING.md,
  },
  progressContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  progressCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  circularProgress: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
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
  },
  progressText: {
    fontSize: 28,
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
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  title: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(44, 47, 49, 0.7)',
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    color: 'rgba(44, 47, 49, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  ctaCard: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
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
  },
  ctaButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  ctaButtonText: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
});
