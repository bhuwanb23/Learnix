import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../constants/theme';

export default function SearchBar({ onSearch, onFilter }) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    onSearch(searchQuery);
  };

  const handleClear = () => {
    setSearchQuery('');
    onSearch('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={COLORS.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search events, workshops, groups..."
          placeholderTextColor={COLORS.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Ionicons name="close" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      
      <TouchableOpacity style={styles.filterButton} onPress={onFilter}>
        <Ionicons name="options-outline" size={18} color="#3B82F6" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: SPACING.sm,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    height: 40,
    justifyContent: 'center',
  },
  searchIcon: {
    marginRight: SPACING.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  clearButton: {
    padding: SPACING.xs,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
