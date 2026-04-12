import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../constants/theme';

export default function ActiveAssignmentCard({ assignment, onPress }) {
  const hexToRgba = (hex, opacity) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
      `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${opacity})` 
      : null;
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress?.(assignment)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.infoSection}>
          <View style={styles.badgeRow}>
            <View style={[styles.priorityBadge, { backgroundColor: assignment.priorityBg }]}>
              <Text style={[styles.priorityText, { color: assignment.priorityColor }]}>
                {assignment.priority}
              </Text>
            </View>
            <Text style={styles.subjectText}>{assignment.subject}</Text>
          </View>

          <Text style={styles.title}>{assignment.title}</Text>

          <View style={styles.metaRow}>
            {assignment.timeLeft && (
              <View style={styles.metaItem}>
                <MaterialIcons name="schedule" size={13} color={COLORS.gray500} />
                <Text style={styles.metaText}>{assignment.timeLeft}</Text>
              </View>
            )}
            {assignment.files && (
              <View style={styles.metaItem}>
                <MaterialIcons name="attach-file" size={13} color={COLORS.gray500} />
                <Text style={styles.metaText}>{assignment.files} Files</Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.progressCircle, { borderColor: hexToRgba(assignment.progressColor, 0.2) }]}>
          <Text style={[styles.progressText, { color: assignment.progressColor }]}>
            {assignment.progress}%
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <View style={styles.swipeHintContainer}>
          <MaterialIcons name="chevron-left" size={13} color={COLORS.gray400} />
          <Text style={styles.swipeHint}>Swipe to dismiss</Text>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: 'rgba(37, 99, 235, 0.1)' }]} activeOpacity={0.7}>
            <MaterialIcons name="done-all" size={15} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: 'rgba(14, 165, 233, 0.1)' }]} activeOpacity={0.7}>
            <MaterialIcons name="event-available" size={15} color={COLORS.accent} />
          </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  infoSection: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
    flexWrap: 'wrap',
  },
  priorityBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    flexShrink: 0,
  },
  priorityText: {
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: 'PlusJakartaSans-Bold',
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
  progressCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Medium',
  },
  actions: {
    marginTop: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray50,
  },
  swipeHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    opacity: 0.6,
  },
  swipeHint: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: 'Manrope-Regular',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
