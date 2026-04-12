import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SUBMISSION_COLORS } from '../constants/submissionData';

export default function InstructionsCard({ instructions }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Instructions</Text>
        <TouchableOpacity style={styles.flagButton}>
          <MaterialIcons name="flag" size={20} color={SUBMISSION_COLORS.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>{instructions.description}</Text>

        <View style={styles.objectivesBox}>
          <View style={styles.objectivesHeader}>
            <MaterialIcons name="lightbulb" size={20} color={SUBMISSION_COLORS.secondary} />
            <Text style={styles.objectivesTitle}>Key Objectives</Text>
          </View>
          <View style={styles.objectivesList}>
            {instructions.objectives.map((objective, index) => (
              <View key={index} style={styles.objectiveItem}>
                <View style={styles.bullet} />
                <Text style={styles.objectiveText}>{objective}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.additionalText}>{instructions.additional}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: SUBMISSION_COLORS.surfaceContainerLowest,
    borderRadius: 12,
    margin: 16,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 17,
    fontWeight: '700',
    color: SUBMISSION_COLORS.onSurface,
  },
  flagButton: {
    padding: 8,
    borderRadius: 8,
  },
  content: {
    gap: 16,
  },
  description: {
    fontFamily: 'Manrope-Medium',
    fontSize: 13,
    fontWeight: '500',
    color: SUBMISSION_COLORS.onSurfaceVariant,
    lineHeight: 20,
  },
  objectivesBox: {
    backgroundColor: SUBMISSION_COLORS.surfaceContainerLow,
    padding: 16,
    borderRadius: 10,
    gap: 12,
  },
  objectivesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  objectivesTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: SUBMISSION_COLORS.onSurface,
  },
  objectivesList: {
    marginLeft: 28,
    gap: 8,
  },
  objectiveItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: SUBMISSION_COLORS.onSurfaceVariant,
    marginTop: 6,
  },
  objectiveText: {
    flex: 1,
    fontFamily: 'Manrope-Medium',
    fontSize: 13,
    fontWeight: '500',
    color: SUBMISSION_COLORS.onSurfaceVariant,
    lineHeight: 20,
  },
  additionalText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 13,
    fontWeight: '500',
    color: SUBMISSION_COLORS.onSurfaceVariant,
    lineHeight: 20,
  },
});
