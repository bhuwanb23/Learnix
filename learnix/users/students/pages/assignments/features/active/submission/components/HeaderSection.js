import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SUBMISSION_COLORS } from '../constants/submissionData';

export default function HeaderSection({ assignment, onBack }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={SUBMISSION_COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assignment Title</Text>
      </View>
      <View style={styles.timerBadge}>
        <MaterialIcons name="schedule" size={16} color={SUBMISSION_COLORS.tertiary} />
        <Text style={styles.timerText}>00:45:00</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: SUBMISSION_COLORS.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: SUBMISSION_COLORS.primary,
    marginLeft: 12,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: SUBMISSION_COLORS.surfaceContainerLow,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: SUBMISSION_COLORS.primary,
  },
});
