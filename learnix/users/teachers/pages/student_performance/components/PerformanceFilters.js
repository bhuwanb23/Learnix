import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function PerformanceFilters({ filters }) {
  const [activeFilter, setActiveFilter] = useState('all');

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {filters.map((filter) => (
        <TouchableOpacity
          key={filter.id}
          style={[
            styles.filter,
            activeFilter === filter.id && styles.filterActive,
          ]}
          activeOpacity={0.85}
          onPress={() => setActiveFilter(filter.id)}
        >
          <Text
            style={[
              styles.filterText,
              activeFilter === filter.id && styles.filterTextActive,
            ]}
          >
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  content: {
    paddingHorizontal: 24,
    gap: 12,
  },
  filter: {
    backgroundColor: '#eef1f3',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterActive: {
    backgroundColor: '#0050d4',
  },
  filterText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 13,
    fontWeight: '600',
    color: '#2c2f31',
    whiteSpace: 'nowrap',
  },
  filterTextActive: {
    color: '#ffffff',
  },
});
