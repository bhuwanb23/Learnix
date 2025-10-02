import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING } from '../../../../../../../constants/theme';

export default function FilterSection({ 
  totalCount = 127, 
  onFilterPress, 
  onSortPress 
}) {
  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={onFilterPress}
          activeOpacity={0.7}
        >
          <Ionicons name="filter-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.buttonText}>Filter</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.sortButton}
          onPress={onSortPress}
          activeOpacity={0.7}
        >
          <Ionicons name="swap-vertical-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.buttonText}>Sort</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.rightSection}>
        <Text style={styles.countText}>{totalCount} resources</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  buttonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  rightSection: {
    // Right section styling
  },
  countText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
});
