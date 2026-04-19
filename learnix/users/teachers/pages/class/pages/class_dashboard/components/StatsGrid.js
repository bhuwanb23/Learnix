import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function StatsGrid({ stats }) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {stats.slice(0, 2).map((stat) => (
          <View key={stat.id} style={styles.card}>
            <Text style={styles.label}>{stat.label}</Text>
            <View style={styles.valueRow}>
              <Text style={styles.value}>{stat.value}</Text>
              {stat.trend && (
                <Text style={[styles.trend, { color: stat.trendColor }]}>{stat.trend}</Text>
              )}
              {stat.suffix && (
                <Text style={styles.suffix}>{stat.suffix}</Text>
              )}
            </View>
            {stat.progress !== undefined && (
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${stat.progress}%`,
                      backgroundColor: stat.progressColor,
                    },
                  ]}
                />
              </View>
            )}
          </View>
        ))}
      </View>
      <View style={styles.row}>
        {stats.slice(2, 4).map((stat) => (
          <View key={stat.id} style={styles.card}>
            <Text style={styles.label}>{stat.label}</Text>
            <Text style={[styles.simpleValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={styles.note}>{stat.note}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#2c2f31',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  label: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#595c5e',
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 8,
  },
  value: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    fontWeight: '800',
    color: '#2c2f31',
  },
  trend: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  suffix: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 2,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e5e9eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  simpleValue: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  note: {
    fontFamily: 'Manrope-Medium',
    fontSize: 12,
    fontWeight: '500',
    color: '#595c5e',
  },
});
