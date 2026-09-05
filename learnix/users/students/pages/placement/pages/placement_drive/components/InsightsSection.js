import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../../../../../../constants/theme';

export default function InsightsSection() {
  return (
    <View style={styles.container}>
      {/* Main CTA Card */}
      <View style={styles.mainCard}>
        <View style={styles.mainCardContent}>
          <Text style={styles.mainCardTitle}>Master Your Interviews</Text>
          <Text style={styles.mainCardSubtitle}>
            Access exclusive preparation materials, mock test links, and previous year interview experiences curated for the upcoming drives.
          </Text>
          <TouchableOpacity style={styles.mainCardButton} activeOpacity={0.8} onPress={() => Alert.alert('Interview Prep', 'Preparation materials, mock tests and interview experiences will open here.')}>
            <Text style={styles.mainCardButtonText}>Explore Resources</Text>
          </TouchableOpacity>
        </View>
        {/* Background Decoration */}
        <View style={styles.backgroundDecoration} />
      </View>

      {/* Stats Card */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Drive Stats</Text>
        
        <View style={styles.statItem}>
          <View style={styles.statHeader}>
            <Text style={styles.statLabel}>Total Vacancies</Text>
            <Text style={[styles.statValue, { color: COLORS.primary }]}>142</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '65%', backgroundColor: COLORS.primary }]} />
          </View>
        </View>

        <View style={styles.statItem}>
          <View style={styles.statHeader}>
            <Text style={styles.statLabel}>Avg. Package</Text>
            <Text style={[styles.statValue, { color: COLORS.secondary }]}>12.5L</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '45%', backgroundColor: COLORS.secondary }]} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  mainCard: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 220,
    justifyContent: 'space-between',
  },
  mainCardContent: {
    position: 'relative',
    zIndex: 10,
  },
  mainCardTitle: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
    marginBottom: SPACING.md,
  },
  mainCardSubtitle: {
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  mainCardButton: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    alignSelf: 'flex-start',
  },
  mainCardButtonText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.primary,
  },
  backgroundDecoration: {
    position: 'absolute',
    right: -40,
    bottom: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(123, 156, 255, 0.2)',
  },
  statsCard: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
  },
  statsTitle: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  statItem: {
    marginBottom: SPACING.lg,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    color: COLORS.textSecondary,
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.extraBold,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.full,
  },
});
