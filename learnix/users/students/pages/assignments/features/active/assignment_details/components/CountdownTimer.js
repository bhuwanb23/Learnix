import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ACTIVE_ASSIGNMENT_COLORS } from '../constants/activeAssignmentData';

export default function CountdownTimer({ assignment }) {
  return (
    <View style={styles.container}>
      <View style={styles.backgroundIcon}>
        <MaterialIcons name="alarm" size={120} color={ACTIVE_ASSIGNMENT_COLORS.error} />
      </View>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.iconBadge}>
            <MaterialIcons name="access-time" size={16} color={ACTIVE_ASSIGNMENT_COLORS.error} />
          </View>
          <Text style={styles.label}>Time Remaining</Text>
        </View>
        <Text style={styles.time}>{assignment.timeRemaining}</Text>
        <Text style={styles.deadline}>Final deadline: {assignment.deadline}</Text>
      </View>
      <View style={styles.warningButton}>
        <MaterialIcons name="warning" size={18} color={ACTIVE_ASSIGNMENT_COLORS.onPrimary} />
        <Text style={styles.warningText}>Urgent</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: `${ACTIVE_ASSIGNMENT_COLORS.errorContainer}10`,
    borderWidth: 1.5,
    borderColor: `${ACTIVE_ASSIGNMENT_COLORS.error}25`,
    margin: 16,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundIcon: {
    position: 'absolute',
    top: -20,
    right: -20,
    opacity: 0.08,
    transform: [{ rotate: '15deg' }],
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  iconBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: `${ACTIVE_ASSIGNMENT_COLORS.error}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    fontWeight: '700',
    color: ACTIVE_ASSIGNMENT_COLORS.error,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  time: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 32,
    fontWeight: '800',
    color: ACTIVE_ASSIGNMENT_COLORS.error,
    marginBottom: 4,
    letterSpacing: -1,
  },
  deadline: {
    fontFamily: 'Manrope-Medium',
    fontSize: 12,
    fontWeight: '500',
    color: ACTIVE_ASSIGNMENT_COLORS.onSurfaceVariant,
  },
  warningButton: {
    backgroundColor: ACTIVE_ASSIGNMENT_COLORS.error,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 1,
    shadowColor: ACTIVE_ASSIGNMENT_COLORS.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  warningText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 12,
    fontWeight: '700',
    color: ACTIVE_ASSIGNMENT_COLORS.onPrimary,
  },
});
