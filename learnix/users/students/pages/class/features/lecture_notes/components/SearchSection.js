import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../../../constants/theme';

export default function SearchSection({ 
  searchQuery, 
  onSearchChange, 
  subjects, 
  onSubjectPress 
}) {
  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons 
          name="search-outline" 
          size={20} 
          color={COLORS.textSecondary} 
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search notes, topics, keywords..."
          placeholderTextColor={COLORS.textSecondary}
          value={searchQuery}
          onChangeText={onSearchChange}
        />
      </View>

      {/* Subject Filters */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {subjects.map((subject) => (
          <TouchableOpacity
            key={subject.id}
            style={[
              styles.filterChip,
              subject.active && styles.activeFilterChip
            ]}
            onPress={() => onSubjectPress(subject.id)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.filterText,
              subject.active && styles.activeFilterText
            ]}>
              {subject.name}
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
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: SPACING.md,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
  filtersContainer: {
    marginHorizontal: -SPACING.md,
  },
  filtersContent: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeFilterChip: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
  },
  filterText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textSecondary,
    whiteSpace: 'nowrap',
  },
  activeFilterText: {
    color: '#3B82F6',
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});
