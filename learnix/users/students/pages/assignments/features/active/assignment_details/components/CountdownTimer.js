import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ACTIVE_ASSIGNMENT_COLORS } from '../constants/activeAssignmentData';

export default function CountdownTimer({ assignment }) {
  return (
    <View style={styles.container}>
      <View style={styles.backgroundIcon}>
        <MaterialIcons name="alarm" size={96} color={ACTIVE_ASSIGNMENT_COLORS.error} />
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>Time Remaining</Text>
        <View style={styles.timeRow}>
          <Text style={styles.time}>{assignment.timeRemaining}</Text>
          <Text style={styles.timeUnit}>hrs</Text>
        </View>
        <Text style={styles.deadline}>Final deadline: {assignment.deadline}</Text>
      </View>
      <View style={styles.warningButton}>
        <MaterialIcons name="warning" size={20} color={ACTIVE_ASSIGNMENT_COLORS.onPrimary} />
        <Text style={styles.warningText}>Submit before midnight</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: `${ACTIVE_ASSIGNMENT_COLORS.errorContainer}15`,
    borderWidth: 1,
    borderColor: `${ACTIVE_ASSIGNMENT_COLORS.error}15`,
    margin: 16,
    borderRadius: 12,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundIcon: {
    position: 'absolute',
    top: -10,
    right: -10,
    opacity: 0.1,
    transform: [{ rotate: '12deg' }],
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
  label: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    fontWeight: '700',
    color: ACTIVE_ASSIGNMENT_COLORS.error,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 4,
  },
  time: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 36,
    fontWeight: '800',
    color: ACTIVE_ASSIGNMENT_COLORS.error,
  },
  timeUnit: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
    fontWeight: '600',
    color: `${ACTIVE_ASSIGNMENT_COLORS.error}90`,
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
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    zIndex: 1,
  },
  warningText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: ACTIVE_ASSIGNMENT_COLORS.onPrimary,
  },
});
