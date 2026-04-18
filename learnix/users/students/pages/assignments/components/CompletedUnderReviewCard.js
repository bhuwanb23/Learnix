import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../constants/theme';

export default function CompletedUnderReviewCard({ assignment, onPress }) {
  const { width } = useWindowDimensions();
  const isCompact = width < 380;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress?.(assignment)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <MaterialIcons name="pending" size={isCompact ? 18 : 20} color={COLORS.accent} />
        </View>
        
        <View style={styles.infoSection}>
          <View style={styles.badgeRow}>
            <View style={styles.reviewBadge}>
              <MaterialIcons name="hourglass-top" size={isCompact ? 9 : 10} color={COLORS.accent} />
              <Text style={styles.reviewText}>Under Review</Text>
            </View>
            <Text style={styles.subjectText}>{assignment.subject}</Text>
          </View>

          <Text style={styles.title}>{assignment.title}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MaterialIcons name="check-circle" size={13} color={COLORS.gray500} />
              <Text style={styles.metaText}>Submitted {assignment.submittedDate}</Text>
            </View>
            {assignment.files && (
              <View style={styles.metaItem}>
                <MaterialIcons name="attach-file" size={13} color={COLORS.gray500} />
                <Text style={styles.metaText}>{assignment.files} Files</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={[styles.footer, isCompact && styles.footerCompact]}>
        <View style={styles.waitingMessage}>
          <MaterialIcons name="info-outline" size={isCompact ? 12 : 13} color={COLORS.accent} />
          <Text style={styles.waitingText}>Waiting for feedback</Text>
        </View>
        <View style={[styles.progressIndicator, isCompact && styles.progressIndicatorCompact]}>
          <Text style={styles.progressText}>100%</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    marginBottom: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoSection: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
    flexWrap: 'wrap',
  },
  reviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    flexShrink: 0,
  },
  reviewText: {
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: 'Manrope-Bold',
    color: COLORS.accent,
  },
  subjectText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.gray500,
    fontFamily: 'Manrope-Medium',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: 'Manrope-Regular',
    marginBottom: SPACING.xs,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    color: COLORS.gray500,
    fontWeight: '500',
    fontFamily: 'Manrope-Regular',
  },
  footer: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerCompact: {
    gap: SPACING.xs,
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  waitingMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  waitingText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.accent,
    fontFamily: 'Manrope-Medium',
  },
  progressIndicator: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
  },
  progressIndicatorCompact: {
    alignSelf: 'flex-start',
  },
  progressText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10b981',
    fontFamily: 'Manrope-Bold',
  },
});
