import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../constants/theme';

const screenWidth = Dimensions.get('window').width;

export default function PerformanceChart({ data }) {
  const maxValue = Math.max(...data.data);
  const minValue = Math.min(...data.data);
  const range = maxValue - minValue;

  const renderBar = (value, index) => {
    const height = ((value - minValue) / range) * 100 + 20; // Minimum height of 20
    const isHighest = value === maxValue;
    
    return (
      <View key={index} style={styles.barContainer}>
        <View style={styles.barWrapper}>
          <View 
            style={[
              styles.bar, 
              { 
                height: height,
                backgroundColor: isHighest ? COLORS.primary : COLORS.primaryLight
              }
            ]} 
          />
        </View>
        <Text style={styles.label}>{data.labels[index]}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Weekly Performance Trend</Text>
      <View style={styles.chartContainer}>
        <View style={styles.chart}>
          <View style={styles.barsContainer}>
            {data.data.map((value, index) => renderBar(value, index))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md
  },
  chartContainer: {
    alignItems: 'center'
  },
  chart: {
    width: screenWidth - (SPACING.md * 4),
    height: 180,
    justifyContent: 'flex-end',
    alignItems: 'center'
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    width: '100%',
    height: '100%',
    paddingBottom: 40
  },
  barContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%'
  },
  barWrapper: {
    justifyContent: 'flex-end',
    height: 120,
    marginBottom: SPACING.sm
  },
  bar: {
    width: 24,
    borderRadius: BORDER_RADIUS.sm,
    minHeight: 4
  },
  label: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs
  },
  value: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.weights.medium,
    marginTop: 2
  }
});
