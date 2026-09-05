import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

import { SPACING } from '../../../../constants/theme';

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
    marginBottom: 16,
    flexGrow: 0,
  },
  content: {
    paddingRight: SPACING.md,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 9999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.25)',
    marginRight: SPACING.sm,
  },
  activeChip: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  chipText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Manrope-SemiBold',
    fontWeight: '600',
  },
  activeChipText: {
    color: '#ffffff',
  },
});