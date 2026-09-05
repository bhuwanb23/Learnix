import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../../../../../../constants/theme';

export default function JobCard({
  company,
  title,
  location,
  type,
  package: pkg,
  eligibility,
  deadline,
  isUrgent = false,
  navigation,
}) {
  const [isBookmarked, setIsBookmarked] = useState(false);

  const handleApplyPress = () => {
    openJobDetails();
  };

  const openJobDetails = () => {
    if (navigation) {
      navigation.navigate('JobDetails', {
        job: { company, title, location, type, pkg, eligibility, deadline, isUrgent },
      });
    }
  };

  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.85} onPress={openJobDetails}>
      {/* Header: Company & Bookmark */}
      <View style={styles.header}>
        <View style={styles.companyBadge}>
          <Text style={styles.companyText}>{company}</Text>
        </View>
        <TouchableOpacity
          style={styles.bookmarkButton}
          onPress={() => setIsBookmarked(!isBookmarked)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={isBookmarked ? COLORS.primary : COLORS.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Job Title */}
      <Text style={styles.jobTitle}>{title}</Text>

      {/* Location & Type */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.metaText}>{location}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.metaItem}>
          <Ionicons name="briefcase-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.metaText}>{type}</Text>
        </View>
      </View>

      {/* Details Grid */}
      <View style={styles.detailsGrid}>
        <View style={styles.detailBox}>
          <Ionicons name="cash-outline" size={16} color={COLORS.primary} style={styles.detailIcon} />
          <Text style={styles.detailLabel}>Package</Text>
          <Text style={styles.detailValue}>{pkg}</Text>
        </View>
        <View style={styles.detailBox}>
          <Ionicons name="school-outline" size={16} color={COLORS.secondary} style={styles.detailIcon} />
          <Text style={styles.detailLabel}>Eligibility</Text>
          <Text style={styles.detailValue}>{eligibility}</Text>
        </View>
      </View>

      {/* Deadline & Apply */}
      <View style={styles.footer}>
        <View style={[styles.deadlineBadge, isUrgent && styles.deadlineBadgeUrgent]}>
          <Ionicons name="alarm-outline" size={14} color={isUrgent ? COLORS.error : COLORS.textSecondary} />
          <Text style={[styles.deadlineText, isUrgent && styles.deadlineTextUrgent]}>
            {deadline}
          </Text>
        </View>
        <TouchableOpacity style={styles.applyButton} activeOpacity={0.8} onPress={handleApplyPress}>
          <Text style={styles.applyButtonText}>Apply</Text>
          <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    gap: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  companyBadge: {
    backgroundColor: 'rgba(0, 80, 212, 0.08)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs - 2,
    borderRadius: BORDER_RADIUS.full,
    alignSelf: 'flex-start',
  },
  companyText: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  bookmarkButton: {
    padding: SPACING.xs,
  },
  jobTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    lineHeight: 24,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  divider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textSecondary,
    opacity: 0.3,
  },
  metaText: {
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: COLORS.textSecondary,
    flex: 1,
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  detailBox: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: 4,
  },
  detailIcon: {
    marginBottom: 2,
  },
  detailLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(171, 173, 175, 0.15)',
  },
  deadlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.full,
  },
  deadlineBadgeUrgent: {
    backgroundColor: 'rgba(179, 27, 37, 0.08)',
  },
  deadlineText: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: COLORS.textSecondary,
  },
  deadlineTextUrgent: {
    color: COLORS.error,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  applyButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.full,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  applyButtonText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
  },
});
