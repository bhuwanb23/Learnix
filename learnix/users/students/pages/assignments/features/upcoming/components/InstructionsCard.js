import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { UPCOMING_ASSIGNMENT_COLORS } from '../constants/upcomingAssignmentData';

export default function InstructionsCard({ instructions }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Instructions</Text>
      <View style={styles.instructionsList}>
        {instructions.map((instruction, index) => (
          <View key={index} style={styles.instructionItem}>
            <View style={styles.numberCircle}>
              <Text style={styles.numberText}>{index + 1}</Text>
            </View>
            <Text style={styles.instructionText}>{instruction}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: UPCOMING_ASSIGNMENT_COLORS.surfaceContainerLowest,
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
    color: UPCOMING_ASSIGNMENT_COLORS.onSurface,
    marginBottom: 24,
  },
  instructionsList: {
    gap: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  numberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: UPCOMING_ASSIGNMENT_COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  numberText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
    color: UPCOMING_ASSIGNMENT_COLORS.primary,
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    fontFamily: 'Manrope-Regular',
    color: UPCOMING_ASSIGNMENT_COLORS.onSurfaceVariant,
    lineHeight: 22,
    paddingTop: 5,
  },
});
