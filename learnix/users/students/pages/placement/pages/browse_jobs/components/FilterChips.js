import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../../../../../../constants/theme';

const filters = [
  { id: 'All Roles', label: 'All Roles', icon: 'tune' },
  { id: 'Role: Design', label: 'Role: Design', icon: null },
  { id: 'Salary Range', label: 'Salary Range', icon: null },
  { id: 'Location: Remote', label: 'Location: Remote', icon: null },
  { id: 'Eligibility', label: 'Eligibility', icon: null },
];

export default function FilterChips({ activeFilters, onFilterPress }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.scrollView}
    >
      {filters.map((filter) => {
        const isActive = activeFilters.includes(filter.id);
        return (
          <TouchableOpacity
            key={filter.id}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => onFilterPress(filter.id)}
            activeOpacity={0.7}
          >
            {filter.icon && isActive && (
              <Ionicons name={filter.icon} size={16} color={COLORS.white} style={styles.chipIcon} />
            )}
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    marginBottom: SPACING.xl,
  },
  container: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingRight: SPACING.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md - 2,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  chipIcon: {
    marginRight: 4,
  },
  chipText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontWeight: TYPOGRAPHY.fontWeight.semiBold,
    color: COLORS.textPrimary,
  },
  chipTextActive: {
    color: COLORS.white,
  },
});
