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

export default function UpcomingAssignmentCard({ assignment, onPress }) {
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
          <MaterialIcons name="calendar-today" size={isCompact ? 18 : 20} color={COLORS.primary} />
        </View>
        
        <View style={styles.infoSection}>
          <View style={styles.badgeRow}>
            <View style={[styles.statusBadge, { backgroundColor: assignment.priorityBg }]}>
              <Text style={[styles.statusText, { color: assignment.priorityColor }]}>
                {assignment.priority}
              </Text>
            </View>
            <Text style={styles.subjectText}>{assignment.subject}</Text>
          </View>

          <Text style={styles.title}>{assignment.title}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MaterialIcons name="event" size={13} color={COLORS.gray500} />
              <Text style={styles.metaText}>Due {assignment.dueDate}</Text>
            </View>
            {assignment.teamTask && (
              <View style={styles.metaItem}>
                <MaterialIcons name="group" size={13} color={COLORS.gray500} />
                <Text style={styles.metaText}>Team Task</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={[styles.footer, isCompact && styles.footerCompact]}>
        <View style={styles.notStartedBadge}>
          <MaterialIcons name="radio-button-unchecked" size={isCompact ? 12 : 14} color={COLORS.gray400} />
          <Text style={styles.notStartedText}>Not Started</Text>
        </View>
        <MaterialIcons name="chevron-right" size={isCompact ? 16 : 18} color={COLORS.gray400} />
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
    backgroundColor: 'rgba(0, 80, 212, 0.1)',
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
  statusBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    flexShrink: 0,
  },
  statusText: {
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
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  notStartedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  notStartedText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.gray400,
    fontFamily: 'Manrope-Medium',
  },
});
