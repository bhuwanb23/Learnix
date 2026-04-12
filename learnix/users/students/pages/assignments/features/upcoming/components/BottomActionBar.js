import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { UPCOMING_ASSIGNMENT_COLORS } from '../constants/upcomingAssignmentData';

export default function BottomActionBar({ onStart, onPreview, onReminder }) {
  return (
    <View style={styles.container}>
      <View style={styles.actionBar}>
        <View style={styles.leftActions}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onPreview}
            activeOpacity={0.8}
          >
            <MaterialIcons name="visibility" size={20} color={UPCOMING_ASSIGNMENT_COLORS.onSurface} />
            <Text style={styles.secondaryButtonText}>Preview</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onReminder}
            activeOpacity={0.8}
          >
            <MaterialIcons name="alarm" size={20} color={UPCOMING_ASSIGNMENT_COLORS.onSurface} />
            <Text style={styles.secondaryButtonText}>Reminder</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onStart}
          activeOpacity={0.8}
        >
          <MaterialIcons name="play-arrow" size={20} color={UPCOMING_ASSIGNMENT_COLORS.onPrimary} />
          <Text style={styles.primaryButtonText}>Start Assignment</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    zIndex: 100,
  },
  actionBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 10,
    gap: 12,
  },
  leftActions: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: `${UPCOMING_ASSIGNMENT_COLORS.outlineVariant}4D`,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: UPCOMING_ASSIGNMENT_COLORS.onSurface,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: UPCOMING_ASSIGNMENT_COLORS.primary,
    shadowColor: UPCOMING_ASSIGNMENT_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: UPCOMING_ASSIGNMENT_COLORS.onPrimary,
  },
});
