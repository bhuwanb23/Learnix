import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

export default function PerformanceStats({ stats }) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.gpaLabel}>Current GPA</Text>
        <Text style={styles.gpaValue}>{stats.gpa.toFixed(2)}</Text>
        <View style={styles.trendContainer}>
          <Text style={styles.trendIcon}>📈</Text>
          <Text style={styles.trendText}>{stats.trend}</Text>
        </View>
      </View>

      <View style={styles.chartContainer}>
        {stats.chart.map((height, index) => (
          <View
            key={index}
            style={[
              styles.bar,
              {
                height: height * 2,
                opacity: 0.6 + (index % 3) * 0.2,
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
    marginHorizontal: 24,
    marginBottom: 100,
    borderRadius: 16,
    padding: 24,
    backgroundColor: '#2c2f31',
    overflow: 'hidden',
  },
  content: {
    alignItems: 'center',
    marginBottom: 24,
  },
  gpaLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
    fontFamily: 'Manrope',
  },
  gpaValue: {
    fontSize: 48,
    fontWeight: '900',
    color: '#ffffff',
    fontFamily: 'Plus Jakarta Sans',
    marginBottom: 8,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trendIcon: {
    fontSize: 16,
  },
  trendText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7b9cff',
    fontFamily: 'Manrope',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 4,
    height: 40,
  },
  bar: {
    width: 4,
    backgroundColor: '#0050d4',
    borderRadius: 2,
  },
});
