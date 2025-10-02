import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';

import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../../../constants/theme';

export default function HeatmapSection({ heatmapData }) {
  if (!heatmapData) {
    return null;
  }

  const getColorForValue = (value) => {
    if (value >= 85) return '#22C55E'; // Green
    if (value >= 70) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  };

  const getOpacityForValue = (value) => {
    return Math.max(0.3, value / 100);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Weekly Performance Heatmap</Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.heatmapContainer}>
            {/* Days Header */}
            <View style={styles.daysHeader}>
              <View style={styles.subjectLabelSpace} />
              {heatmapData.days.map((day) => (
                <View key={day} style={styles.dayCell}>
                  <Text style={styles.dayText}>{day}</Text>
                </View>
              ))}
            </View>
            
            {/* Heatmap Grid */}
            {heatmapData.subjects.map((subject, subjectIndex) => (
              <View key={subject} style={styles.heatmapRow}>
                <View style={styles.subjectLabel}>
                  <Text style={styles.subjectText}>{subject}</Text>
                </View>
                {heatmapData.data[subjectIndex].map((value, dayIndex) => (
                  <View
                    key={`${subject}-${dayIndex}`}
                    style={[
                      styles.heatmapCell,
                      {
                        backgroundColor: getColorForValue(value),
                        opacity: getOpacityForValue(value),
                      },
                    ]}
                  >
                    <Text style={styles.cellValue}>{value}%</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
        
        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendText}>Weak</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.legendText}>Average</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#22C55E' }]} />
            <Text style={styles.legendText}>Strong</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md, // Reduced padding
    paddingBottom: SPACING.lg,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  heatmapContainer: {
    minWidth: 300,
  },
  daysHeader: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  subjectLabelSpace: {
    width: 80,
  },
  dayCell: {
    width: 35,
    alignItems: 'center',
    marginHorizontal: 1,
  },
  dayText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  heatmapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  subjectLabel: {
    width: 80,
    paddingRight: SPACING.sm,
  },
  subjectText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.weights.medium,
    textAlign: 'right',
  },
  heatmapCell: {
    width: 35,
    height: 35,
    borderRadius: BORDER_RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cellValue: {
    fontSize: 8,
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.lg,
    gap: SPACING.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
  },
});
