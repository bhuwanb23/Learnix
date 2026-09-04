import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function PerformanceFilters({ filters, activeFilter, onChange }) {
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
          style={[styles.filter, activeFilter === filter.id && styles.filterActive]}
          activeOpacity={0.85}
          onPress={() => onChange(filter.id)}
        >
          <Text style={[styles.filterText, activeFilter === filter.id && styles.filterTextActive]}>
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  content: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filter: {
    backgroundColor: '#eef1f3',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
  },
  filterActive: {
    backgroundColor: '#0050d4',
  },
  filterText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 12,
    fontWeight: '600',
    color: '#2c2f31',
  },
  filterTextActive: {
    color: '#ffffff',
  },
});