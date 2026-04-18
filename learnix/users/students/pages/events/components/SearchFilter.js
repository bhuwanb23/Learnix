import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, useWindowDimensions, Platform, ActivityIndicator, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../constants/theme';

export default function SearchFilter({
  searchQuery,
  setSearchQuery,
  activeCategory,
  setActiveCategory,
  categories,
  events,
  setFilteredEvents
}) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [isSearching, setIsSearching] = useState(false);
  const searchPulse = useRef(new Animated.Value(1)).current;
  const searchTimer = useRef(null);

  useEffect(() => {
    if (isSearching) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(searchPulse, {
            toValue: 1.03,
            duration: 450,
            useNativeDriver: true,
          }),
          Animated.timing(searchPulse, {
            toValue: 1,
            duration: 450,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }

    searchPulse.setValue(1);
  }, [isSearching, searchPulse]);

  useEffect(() => {
    return () => {
      if (searchTimer.current) {
        clearTimeout(searchTimer.current);
      }
    };
  }, []);

  const handleSearch = (text) => {
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }

    setIsSearching(true);
    setSearchQuery(text);

    // Small delay gives smooth visual feedback for "searching/loading".
    searchTimer.current = setTimeout(() => {
      if (text.trim() === '') {
        setFilteredEvents(events);
      } else {
        const filtered = events.filter(event =>
          event.title.toLowerCase().includes(text.toLowerCase()) ||
          event.description.toLowerCase().includes(text.toLowerCase()) ||
          event.category.toLowerCase().includes(text.toLowerCase()) ||
          event.location.toLowerCase().includes(text.toLowerCase())
        );
        setFilteredEvents(filtered);
      }

      setIsSearching(false);
    }, 260);
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, isTablet && styles.containerTablet]}>
        <Animated.View
          style={[
            styles.searchSection,
            isTablet && styles.searchSectionTablet,
            isSearching && styles.searchSectionActive,
            { transform: [{ scale: searchPulse }] },
          ]}
        >
          <MaterialIcons name="search" size={18} color={COLORS.gray400} />
          <TextInput
            style={styles.input}
            placeholder="Search events, workshops..."
            placeholderTextColor={COLORS.gray400}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          <View style={styles.searchActionSlot}>
            {isSearching ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <MaterialIcons name="close" size={18} color={COLORS.gray400} />
              </TouchableOpacity>
            ) : null}
          </View>
        </Animated.View>

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
    marginTop: -24,
    zIndex: 50,
  },
  container: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: 10,
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
    paddingHorizontal: 10,
    height: 36,
    flex: 1,
    backgroundColor: COLORS.gray50,
    borderRadius: BORDER_RADIUS.lg,
    minWidth: 140,
  },
  searchSectionTablet: {
    flex: 0.82,
    maxWidth: 280,
  },
  searchSectionActive: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  input: {
    flex: 1,
    marginLeft: 6,
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '500',
    fontFamily: 'Manrope-Regular',
    ...Platform.select({
      web: { outlineStyle: 'none' }
    }),
  },
  searchActionSlot: {
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
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
    fontSize: 13,
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