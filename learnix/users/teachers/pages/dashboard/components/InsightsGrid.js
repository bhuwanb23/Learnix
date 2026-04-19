import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function InsightsGrid({ insights }) {
  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {insights.map((insight, index) => (
          <View key={insight.id} style={styles.card}>
            <Text style={[styles.value, { color: insight.color }]}>{insight.value}</Text>
            <Text style={styles.label}>{insight.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#eef1f3',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 28,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '800',
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
    color: '#595c5e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
