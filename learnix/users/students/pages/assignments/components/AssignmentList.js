import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../constants/theme';

export default function AssignmentList({ assignments }) {
  const hexToRgba = (hex, opacity) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
      `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${opacity})` 
      : null;
  };

  return (
    <View style={styles.container}>
      {assignments.map((assignment) => (
        <TouchableOpacity
          key={assignment.id}
          style={styles.card}
          activeOpacity={0.7}
        >
          <View style={styles.header}>
            <View style={styles.infoSection}>
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.priorityBadge,
                    {
                      backgroundColor: assignment.priorityBg,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      { color: assignment.priorityColor },
                    ]}
                  >
                    {assignment.priority}
                  </Text>
                </View>
                <Text style={styles.subjectText}>{assignment.subject}</Text>
              </View>

              <Text style={styles.title}>{assignment.title}</Text>

              <View style={styles.metaRow}>
                {assignment.timeLeft && (
                  <View style={styles.metaItem}>
                    <MaterialIcons name="schedule" size={14} color={COLORS.gray500} />
                    <Text style={styles.metaText}>{assignment.timeLeft}</Text>
                  </View>
                )}
                {assignment.dueDate && (
                  <View style={styles.metaItem}>
                    <MaterialIcons name="event" size={14} color={COLORS.gray500} />
                    <Text style={styles.metaText}>{assignment.dueDate}</Text>
                  </View>
                )}
                {assignment.files && (
                  <View style={styles.metaItem}>
                    <MaterialIcons name="attach-file" size={14} color={COLORS.gray500} />
                    <Text style={styles.metaText}>{assignment.files} Files</Text>
                  </View>
                )}
                {assignment.teamTask && (
                  <View style={styles.metaItem}>
                    <MaterialIcons name="group" size={14} color={COLORS.gray500} />
                    <Text style={styles.metaText}>Team Task</Text>
                  </View>
                )}
                {assignment.grade && (
                  <View style={styles.metaItem}>
                    <MaterialIcons name="emoji-events" size={14} color={assignment.progressColor} />
                    <Text style={[styles.metaText, { color: assignment.progressColor, fontWeight: '700' }]}>
                      Grade: {assignment.grade}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View
              style={[
                styles.progressCircle,
                { borderColor: hexToRgba(assignment.progressColor, 0.2) },
              ]}
            >
              <Text
                style={[styles.progressText, { color: assignment.progressColor }]}
              >
                {assignment.progress}%
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <View style={styles.swipeHintContainer}>
              <MaterialIcons name="chevron-left" size={14} color={COLORS.gray400} />
              <Text style={styles.swipeHint}>Swipe to dismiss</Text>
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: 'rgba(37, 99, 235, 0.1)' }]}
                activeOpacity={0.7}
              >
                <MaterialIcons name="done-all" size={16} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: 'rgba(14, 165, 233, 0.1)' }]}
                activeOpacity={0.7}
              >
                <MaterialIcons name="event-available" size={16} color={COLORS.accent} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  infoSection: {
    flex: 1,
    marginRight: SPACING.md,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  subjectText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gray500,
    fontFamily: 'Manrope-Medium',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: 'Manrope-Regular',
    marginBottom: SPACING.sm,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.gray500,
    fontWeight: '500',
    fontFamily: 'Manrope-Regular',
  },
  progressCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope-Medium',
  },
  actions: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray50,
  },
  swipeHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    opacity: 0.6,
  },
  swipeHint: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.gray400,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'Manrope-Regular',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
