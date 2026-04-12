import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ACTIVE_ASSIGNMENT_COLORS } from '../constants/activeAssignmentData';

export default function BottomActionBar({ onContinueWork, onSubmit }) {
  return (
    <View style={styles.container}>
      <View style={styles.gradient} />
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.continueButton} onPress={onContinueWork} activeOpacity={0.7}>
          <MaterialIcons name="edit" size={18} color={ACTIVE_ASSIGNMENT_COLORS.primary} />
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.submitButton} onPress={onSubmit} activeOpacity={0.8}>
          <MaterialIcons name="cloud-upload" size={18} color={ACTIVE_ASSIGNMENT_COLORS.onPrimary} />
          <Text style={styles.submitButtonText}>Submit</Text>
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
    backgroundColor: ACTIVE_ASSIGNMENT_COLORS.surface,
  },
  actionBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  continueButton: {
    flex: 1,
    backgroundColor: ACTIVE_ASSIGNMENT_COLORS.surfaceContainerLowest,
    borderWidth: 1.5,
    borderColor: `${ACTIVE_ASSIGNMENT_COLORS.primary}30`,
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueButtonText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: ACTIVE_ASSIGNMENT_COLORS.primary,
  },
  submitButton: {
    flex: 1.3,
    backgroundColor: ACTIVE_ASSIGNMENT_COLORS.primary,
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: ACTIVE_ASSIGNMENT_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: ACTIVE_ASSIGNMENT_COLORS.onPrimary,
  },
});
