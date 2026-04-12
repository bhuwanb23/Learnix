import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COMPLETED_RESULTS_COLORS } from '../constants/completedResultsData';

const getColorForType = (color) => {
  switch (color) {
    case 'primary': return COMPLETED_RESULTS_COLORS.primary;
    case 'secondary': return COMPLETED_RESULTS_COLORS.secondary;
    case 'tertiary': return COMPLETED_RESULTS_COLORS.tertiary;
    default: return COMPLETED_RESULTS_COLORS.primary;
  }
};

const getBgColorForType = (color) => {
  switch (color) {
    case 'primary': return `${COMPLETED_RESULTS_COLORS.primaryContainer}30`;
    case 'secondary': return `${COMPLETED_RESULTS_COLORS.secondaryContainer}30`;
    case 'tertiary': return `${COMPLETED_RESULTS_COLORS.tertiaryContainer}30`;
    default: return `${COMPLETED_RESULTS_COLORS.primaryContainer}30`;
  }
};

export default function ImprovementSuggestionsCard({ results }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Actionable Improvements</Text>
      
      <View style={styles.grid}>
        {results.improvements.map((item, index) => {
          const color = getColorForType(item.color);
          const bgColor = getBgColorForType(item.color);
          
          return (
            <View key={index} style={styles.suggestionCard}>
              <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
                <MaterialIcons name={item.icon} size={16} color={color} />
              </View>
              <Text style={[styles.suggestionTitle, { color }]}>{item.title}</Text>
              <Text style={styles.suggestionDescription}>{item.description}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COMPLETED_RESULTS_COLORS.surfaceContainerLow,
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 24,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: COMPLETED_RESULTS_COLORS.onSurface,
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  suggestionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COMPLETED_RESULTS_COLORS.surfaceContainerLowest,
    padding: 20,
    borderRadius: 8,
    gap: 12,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  suggestionDescription: {
    fontFamily: 'Manrope-Medium',
    fontSize: 12,
    fontWeight: '500',
    color: COMPLETED_RESULTS_COLORS.onSurfaceVariant,
    lineHeight: 18,
  },
});
