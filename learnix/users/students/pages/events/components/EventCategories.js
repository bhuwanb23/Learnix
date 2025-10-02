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
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../constants/theme';

export default function EventCategories({ activeCategory, onCategoryChange }) {
  const categories = [
    { id: 'all', label: 'All', icon: 'grid-outline', color: '#3B82F6' },
    { id: 'tech', label: 'Tech', icon: 'code-slash-outline', color: '#10B981' },
    { id: 'design', label: 'Design', icon: 'color-palette-outline', color: '#F59E0B' },
    { id: 'business', label: 'Business', icon: 'briefcase-outline', color: '#8B5CF6' },
    { id: 'education', label: 'Education', icon: 'school-outline', color: '#EF4444' },
    { id: 'health', label: 'Health', icon: 'fitness-outline', color: '#06B6D4' },
    { id: 'arts', label: 'Arts', icon: 'musical-notes-outline', color: '#EC4899' },
    { id: 'sports', label: 'Sports', icon: 'football-outline', color: '#84CC16' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Categories</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryCard,
              activeCategory === category.id && styles.activeCategory,
            ]}
            onPress={() => onCategoryChange(category.id)}
            activeOpacity={0.7}
          >
            <View style={[
              styles.iconContainer,
              { backgroundColor: activeCategory === category.id ? category.color : category.color + '20' }
            ]}>
            <Ionicons
              name={category.icon}
              size={16}
              color={activeCategory === category.id ? '#FFFFFF' : category.color}
            />
            </View>
            <Text
              style={[
                styles.categoryLabel,
                activeCategory === category.id && styles.activeLabel,
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    paddingHorizontal: 4,
  },
  scrollContent: {
    paddingHorizontal: 4,
    gap: 6,
  },
  categoryCard: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#FFFFFF',
    minWidth: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activeCategory: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  activeLabel: {
    color: '#3B82F6',
  },
});
