import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, useWindowDimensions, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../constants/theme';

export default function SearchFilter({
  searchQuery,
  setSearchQuery,
  activeCategory,
  setActiveCategory,
  categories
}) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, isTablet && styles.containerTablet]}>
        <View style={styles.searchSection}>
          <MaterialIcons name="search" size={20} color={COLORS.gray400} />
          <TextInput
            style={styles.input}
            placeholder="Search events, workshops..."
            placeholderTextColor={COLORS.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={20} color={COLORS.gray400} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.divider} />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setActiveCategory(cat.id)}
                style={[
                  styles.categoryPill,
                  isActive && styles.categoryPillActive
                ]}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.categoryText,
                  isActive && styles.categoryTextActive
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: SPACING.lg,
    marginTop: -28,
    zIndex: 50,
  },
  container: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: 12,
    ...SHADOWS.lg,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  containerTablet: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 52,
    flex: 1,
    backgroundColor: COLORS.gray50,
    borderRadius: BORDER_RADIUS.lg,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '500',
    fontFamily: 'Manrope-Regular',
    ...Platform.select({
      web: { outlineStyle: 'none' }
    }),
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.gray200,
    marginHorizontal: 12,
    display: Platform.OS === 'web' || Platform.OS === 'ios' ? 'flex' : 'none',
  },
  categoryList: {
    paddingVertical: 4,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.gray50,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  categoryPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray600,
    fontFamily: 'Manrope-SemiBold',
  },
  categoryTextActive: {
    color: COLORS.white,
    fontFamily: 'Manrope-Bold',
  },
  filterPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterPillActive: {
    backgroundColor: '#0050d4',
  },
  filterPillInactive: {
    backgroundColor: '#eef1f3',
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold',
  },
  filterPillTextActive: {
    color: '#f1f2ff',
  },
  filterPillTextInactive: {
    color: '#595c5e',
  },
});