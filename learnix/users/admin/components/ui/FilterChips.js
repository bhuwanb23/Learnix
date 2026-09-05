import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../constants/theme';

export default function FilterChips({ options, selected, onSelect }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      {options.map((option) => {
        const isActive = selected === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.chip, isActive && styles.activeChip]}
            onPress={() => onSelect(option.value)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, isActive && styles.activeChipText]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginBottom: SPACING.md,
    flexGrow: 0,
  },
  content: {
    paddingRight: SPACING.md,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: '#f1f5f9',
    marginRight: SPACING.sm,
  },
  activeChip: {
    backgroundColor: '#7c3aed',
  },
  chipText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#475569',
    fontFamily: 'Manrope-SemiBold',
  },
  activeChipText: {
    color: '#ffffff',
  },
});