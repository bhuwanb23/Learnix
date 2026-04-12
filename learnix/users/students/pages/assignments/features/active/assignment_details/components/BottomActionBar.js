import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ACTIVE_ASSIGNMENT_COLORS } from '../constants/activeAssignmentData';

export default function BottomActionBar({ onContinueWork, onSubmit }) {
  return (
    <View style={styles.container}>
      <View style={styles.gradient} />
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.continueButton} onPress={onContinueWork}>
          <MaterialIcons name="edit" size={20} color={ACTIVE_ASSIGNMENT_COLORS.onSurface} />
          <Text style={styles.continueButtonText}>Continue Work</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.submitButton} onPress={onSubmit}>
          <MaterialIcons name="cloud-upload" size={20} color={ACTIVE_ASSIGNMENT_COLORS.onPrimary} />
          <Text style={styles.submitButtonText}>Submit Assignment</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  gradient: {
    height: 80,
    backgroundColor: ACTIVE_ASSIGNMENT_COLORS.surface,
  },
  actionBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  continueButton: {
    flex: 1,
    backgroundColor: ACTIVE_ASSIGNMENT_COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: `${ACTIVE_ASSIGNMENT_COLORS.outlineVariant}30`,
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  continueButtonText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: ACTIVE_ASSIGNMENT_COLORS.onSurface,
  },
  submitButton: {
    flex: 1.5,
    backgroundColor: ACTIVE_ASSIGNMENT_COLORS.primary,
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitButtonText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: ACTIVE_ASSIGNMENT_COLORS.onPrimary,
  },
});
