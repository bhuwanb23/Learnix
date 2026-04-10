import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { QUIZ_SETUP_COLORS } from '../constants/quizSetupData';

export default function QuestionCount({ counts, selectedCount, onSelect }) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Question Volume</Text>
      <View style={styles.countsRow}>
        {counts.map((count) => {
          const isSelected = selectedCount === count.value;
          return (
            <TouchableOpacity
              key={count.value}
              style={[styles.countButton, isSelected && styles.selectedCount]}
              onPress={() => onSelect(count.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.countText, isSelected && styles.selectedCountText]}>
                {count.value}
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
  countsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  countButton: {
    flex: 1,
    height: 50,
    backgroundColor: QUIZ_SETUP_COLORS.surfaceContainerLowest,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${QUIZ_SETUP_COLORS.outlineVariant}26`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCount: {
    backgroundColor: QUIZ_SETUP_COLORS.primary,
    borderColor: QUIZ_SETUP_COLORS.primary,
  },
  countText: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: QUIZ_SETUP_COLORS.onSurface,
  },
  selectedCountText: {
    color: '#ffffff',
  },
});
