import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const engagementColors = {
  high: '#dcc9ff',
  mid: '#ff956a',
  low: '#fb5151',
};

export default function SubmissionHeatmap({ hero }) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>{hero.title}</Text>
          <Text style={styles.subtitle}>{hero.subtitle}</Text>
        </View>
        <View style={styles.legend}>
          {hero.legend.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendText}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Heatmap Grid */}
      <View style={styles.heatmapContainer}>
        <View style={styles.grid}>
          {hero.heatmap.map((cell, index) => (
            <View
              key={index}
              style={[styles.cell, { backgroundColor: engagementColors[cell.engagement] }]}
            />
          ))}
        </View>

        {/* Stats Footer */}
        <View style={styles.footer}>
          <View style={styles.stats}>
            {hero.stats.map((stat, index) => (
              <View key={index} style={styles.statItem}>
                <Text style={styles.statLabel}>{stat.label}</Text>
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.metricsButton} activeOpacity={0.7}>
            <Text style={styles.metricsText}>View Detailed Metrics</Text>
            <MaterialIcons name="trending-up" size={16} color="#0050d4" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 16,
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 28,
    fontWeight: '800',
    color: '#2c2f31',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'Manrope-Medium',
    fontSize: 15,
    fontWeight: '500',
    color: '#595c5e',
  },
  legend: {
    flexDirection: 'row',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dfe3e6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    fontWeight: '700',
    color: '#595c5e',
  },
  heatmapContainer: {
    backgroundColor: '#eef1f3',
    marginHorizontal: 24,
    borderRadius: 12,
    padding: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  cell: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  footer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#abadaf1a',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stats: {
    flexDirection: 'row',
    gap: 24,
  },
  statItem: {
    gap: 2,
  },
  statLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 9,
    fontWeight: '700',
    color: '#595c5e',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  statValue: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    fontWeight: '800',
  },
  metricsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricsText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#0050d4',
  },
});
