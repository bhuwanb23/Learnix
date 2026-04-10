import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { QUIZ_SETUP_COLORS } from '../constants/quizSetupData';

export default function DifficultyLevel({ levels, selectedDifficulty, onSelect }) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Challenge Level</Text>
      <View style={styles.levelsContainer}>
        {levels.map((level) => {
          const isSelected = selectedDifficulty === level.value;
          return (
            <TouchableOpacity
              key={level.value}
              style={[styles.levelButton, isSelected && styles.selectedLevel]}
              onPress={() => onSelect(level.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.levelText, isSelected && styles.selectedLevelText]}>
                {level.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: QUIZ_SETUP_COLORS.surfaceContainerLow,
    borderRadius: 14,
    padding: 24,
    borderWidth: 1,
    borderColor: `${QUIZ_SETUP_COLORS.outlineVariant}0D`,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: QUIZ_SETUP_COLORS.onSurfaceVariant,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  levelsContainer: {
    flexDirection: 'row',
    backgroundColor: `${QUIZ_SETUP_COLORS.surfaceContainerHighest}4D`,
    borderRadius: 12,
    padding: 5,
    gap: 4,
  },
  levelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedLevel: {
    backgroundColor: '#ffffff',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  levelText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold',
    color: QUIZ_SETUP_COLORS.onSurfaceVariant,
  },
  selectedLevelText: {
    color: QUIZ_SETUP_COLORS.primary,
  },
});
