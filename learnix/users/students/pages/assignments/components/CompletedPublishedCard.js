import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../constants/theme';

export default function CompletedPublishedCard({ assignment, onPress }) {
  const getGradeColor = (grade) => {
    const gradeNum = parseInt(grade);
    if (gradeNum >= 90) return '#10b981';
    if (gradeNum >= 80) return '#0050d4';
    if (gradeNum >= 70) return '#f59e0b';
    return '#ef4444';
  };

  const gradeColor = getGradeColor(assignment.grade);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress?.(assignment)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={[styles.gradeContainer, { backgroundColor: `${gradeColor}15` }]}>
          <Text style={[styles.gradeText, { color: gradeColor }]}>{assignment.grade}</Text>
        </View>
        
        <View style={styles.infoSection}>
          <View style={styles.badgeRow}>
            <View style={[styles.publishedBadge, { backgroundColor: `${gradeColor}15` }]}>
              <MaterialIcons name="emoji-events" size={10} color={gradeColor} />
              <Text style={[styles.publishedText, { color: gradeColor }]}>Results Published</Text>
            </View>
            <Text style={styles.subjectText}>{assignment.subject}</Text>
          </View>

          <Text style={styles.title}>{assignment.title}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MaterialIcons name="event-available" size={13} color={COLORS.gray500} />
              <Text style={styles.metaText}>Completed {assignment.completedDate}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.feedbackMessage}>
          <MaterialIcons name="comment" size={13} color={COLORS.primary} />
          <Text style={styles.feedbackText}>View Feedback</Text>
        </View>
        <MaterialIcons name="chevron-right" size={18} color={COLORS.gray400} />
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
  gradeContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  gradeText: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
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
  publishedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    flexShrink: 0,
  },
  publishedText: {
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: 'Manrope-Bold',
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
  feedbackMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  feedbackText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.primary,
    fontFamily: 'Manrope-Medium',
  },
});
