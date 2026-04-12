import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ACTIVE_ASSIGNMENT_COLORS } from '../constants/activeAssignmentData';

export default function GuidelinesCard({ assignment }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="checklist" size={22} color={ACTIVE_ASSIGNMENT_COLORS.onSurface} />
        <Text style={styles.title}>Submission Guidelines</Text>
      </View>

      <View style={styles.guidelinesList}>
        {assignment.guidelines.map((guideline, index) => (
          <View key={index} style={styles.guidelineItem}>
            <View style={styles.numberCircle}>
              <Text style={styles.numberText}>{index + 1}</Text>
            </View>
            <Text style={styles.guidelineText}>{guideline}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: ACTIVE_ASSIGNMENT_COLORS.surfaceContainerLow,
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: ACTIVE_ASSIGNMENT_COLORS.onSurface,
  },
  guidelinesList: {
    gap: 16,
  },
  guidelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  numberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${ACTIVE_ASSIGNMENT_COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  numberText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    fontWeight: '700',
    color: ACTIVE_ASSIGNMENT_COLORS.primary,
  },
  guidelineText: {
    flex: 1,
    fontFamily: 'Manrope-Medium',
    fontSize: 13,
    fontWeight: '500',
    color: ACTIVE_ASSIGNMENT_COLORS.onSurfaceVariant,
    lineHeight: 20,
  },
});
