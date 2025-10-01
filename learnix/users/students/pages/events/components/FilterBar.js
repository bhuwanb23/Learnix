import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../constants/theme';

export default function FilterBar({ filters, activeFilter, onFilterChange }) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterButton,
              activeFilter === filter.id && styles.activeFilter,
            ]}
            onPress={() => onFilterChange(filter.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={filter.icon}
              size={16}
              color={activeFilter === filter.id ? '#FFFFFF' : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.filterText,
                activeFilter === filter.id && styles.activeFilterText,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: SPACING.sm,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.gray100,
    gap: SPACING.xs,
    height: 36,
  },
  activeFilter: {
    backgroundColor: '#3B82F6',
  },
  filterText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textSecondary,
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
});
