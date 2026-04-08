import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

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
    <View style={styles.searchFilterWrapper}>
      <View style={[styles.searchFilterContainer, { flexDirection: isTablet ? 'row' : 'column' }]}>
        <View style={[styles.searchInputContainer, isTablet && { flex: 1 }]}>
          <MaterialIcons name="search" size={24} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events, workshops, or clubs..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.filterScroll}
          style={[styles.filterScrollWrapper, isTablet && { width: 'auto', flex: 0 }]}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.filterPill,
                activeCategory === cat.id ? styles.filterPillActive : styles.filterPillInactive
              ]}
              onPress={() => setActiveCategory(cat.id)}
            >
              <Text style={[
                styles.filterPillText,
                activeCategory === cat.id ? styles.filterPillTextActive : styles.filterPillTextInactive
              ]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  searchFilterWrapper: {
    paddingHorizontal: 24,
    marginTop: -40,
    zIndex: 20,
    alignItems: 'center',
  },
  searchFilterContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    gap: 16,
    width: '100%',
    maxWidth: 1152,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef1f3',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2c2f31',
    fontFamily: 'Manrope-Medium',
  },
  filterScrollWrapper: {
    width: '100%',
  },
  filterScroll: {
    gap: 12,
    paddingBottom: 4,
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