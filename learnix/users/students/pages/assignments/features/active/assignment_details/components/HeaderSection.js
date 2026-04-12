import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { ACTIVE_ASSIGNMENT_COLORS } from '../constants/activeAssignmentData';

export default function HeaderSection({ assignment, onBack }) {
  return (
    <View style={styles.header}>
      {/* <StatusBar style="dark" /> */}
      <View style={styles.headerContent}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={ACTIVE_ASSIGNMENT_COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assignment Details</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: ACTIVE_ASSIGNMENT_COLORS.surface,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: ACTIVE_ASSIGNMENT_COLORS.onSurface,
    marginLeft: 12,
    flex: 1,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: ACTIVE_ASSIGNMENT_COLORS.surfaceContainerHigh,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACTIVE_ASSIGNMENT_COLORS.tertiary,
  },
  priorityText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 11,
    fontWeight: '600',
    color: ACTIVE_ASSIGNMENT_COLORS.onSurfaceVariant,
  },
});
