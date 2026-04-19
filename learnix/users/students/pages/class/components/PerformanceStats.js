import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { STUDENT_HOME_FONT } from '../../../constants/studentHomeTypography';

export default function PerformanceStats({ stats }) {
  // Fixed heights based on HTML
  const barHeights = [32, 48, 24, 40, 56, 36];
  const barOpacities = [1, 0.8, 0.6, 1, 0.9, 0.7];

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.gpaLabel}>Current GPA</Text>
        <Text style={styles.gpaValue}>{stats.gpa.toFixed(2)}</Text>
        <View style={styles.trendContainer}>
          <MaterialIcons name="trending-up" size={16} color="#7b9cff" />
          <Text style={styles.trendText}>{stats.trend}</Text>
        </View>
      </View>

      <View style={styles.chartContainer}>
        {barHeights.map((height, index) => (
          <View
            key={index}
            style={[
              styles.bar,
              {
                height: height,
                opacity: barOpacities[index],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Removed margin since parent has padding
    borderRadius: 12, // rounded-xl
    padding: 24, // p-6
    backgroundColor: '#2c2f31', // bg-on-surface
    overflow: 'hidden',
  },
  content: {
    alignItems: 'center',
    marginBottom: 24, // mt-6 for the chart below means mb-6 here
  },
  gpaLabel: {
    fontSize: STUDENT_HOME_FONT.caption,
    fontWeight: '700',
    color: '#ffffff',
    opacity: 0.65,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
    fontFamily: 'Manrope-Bold',
  },
  gpaValue: {
    fontSize: STUDENT_HOME_FONT.bigStat,
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: 'PlusJakartaSans-ExtraBold',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, // gap-2
  },
  trendText: {
    fontSize: STUDENT_HOME_FONT.quickActionLabel,
    fontWeight: '700',
    color: '#7b9cff',
    fontFamily: 'Manrope-Bold',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 4, // gap-1 (1 * 4 = 4px)
    height: 56, // max height
  },
  bar: {
    width: 4, // w-1
    backgroundColor: '#0050d4', // bg-primary
    borderRadius: 999, // rounded-full
  },
});
