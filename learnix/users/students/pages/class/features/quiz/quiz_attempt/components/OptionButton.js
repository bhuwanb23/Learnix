import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { QUIZ_ATTEMPT_COLORS } from '../constants/quizAttemptData';

export default function OptionButton({ option, isSelected, onSelect }) {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        isSelected && styles.selected,
      ]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={[styles.optionLetter, isSelected && styles.selectedLetter]}>
          <Text style={[styles.letterText, isSelected && styles.selectedLetterText]}>
            {option.id}
          </Text>
        </View>
        <Text style={[styles.optionText, isSelected && styles.selectedOptionText]}>
          {option.text}
        </Text>
      </View>

      {isSelected && (
        <Ionicons name="checkmark-circle" size={20} color={QUIZ_ATTEMPT_COLORS.primary} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: QUIZ_ATTEMPT_COLORS.surfaceContainerLowest,
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selected: {
    borderColor: QUIZ_ATTEMPT_COLORS.primary,
    borderWidth: 2,
    shadowColor: QUIZ_ATTEMPT_COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  optionLetter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: QUIZ_ATTEMPT_COLORS.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedLetter: {
    backgroundColor: QUIZ_ATTEMPT_COLORS.primary,
  },
  letterText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: QUIZ_ATTEMPT_COLORS.onSurfaceVariant,
  },
  selectedLetterText: {
    color: '#ffffff',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: QUIZ_ATTEMPT_COLORS.onSurface,
    lineHeight: 20,
    flex: 1,
  },
  selectedOptionText: {
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
});
