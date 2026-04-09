import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { COLORS } from '../constants/lectureNotesData';

export default function FilterChips({ filters, activeFilter, onFilterChange }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {filters.map((filter) => {
        const isActive = activeFilter === filter.id;
        return (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.chip,
              isActive && styles.chipActive,
            ]}
            onPress={() => onFilterChange(filter.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipText,
                isActive && styles.chipTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    gap: 10,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold',
    color: COLORS.onSurfaceVariant,
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
});
