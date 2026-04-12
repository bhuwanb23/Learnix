import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { UPCOMING_ASSIGNMENT_COLORS } from '../constants/upcomingAssignmentData';

export default function BottomActionBar({ onReminder }) {
  return (
    <View style={styles.container}>
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.reminderButton}
          onPress={onReminder}
          activeOpacity={0.8}
        >
          <MaterialIcons name="alarm" size={18} color={UPCOMING_ASSIGNMENT_COLORS.onSurface} />
          <Text style={styles.reminderButtonText}>Set Reminder</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    zIndex: 100,
  },
  actionBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 10,
  },
  reminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: `${UPCOMING_ASSIGNMENT_COLORS.outlineVariant}4D`,
  },
  reminderButtonText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: UPCOMING_ASSIGNMENT_COLORS.onSurface,
  },
});
