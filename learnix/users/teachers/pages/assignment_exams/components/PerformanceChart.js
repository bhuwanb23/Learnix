import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Lightweight mock chart using bars/lines
export default function PerformanceChart({ data }) {
  const max = Math.max(...data.series, 100);
  return (
    <View style={styles.card}>
      <Text style={styles.header}>Performance Trends</Text>
      <View style={styles.graph}>
        {data.series.map((v, idx) => (
          <View key={idx} style={styles.pointWrap}>
            <View style={[styles.point, { bottom: `${(v / max) * 90}%` }]} />
            <Text style={styles.label}>{data.labels[idx]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6', padding: 16 },
  header: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 12 },
  graph: { height: 160, position: 'relative', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  pointWrap: { width: 40, alignItems: 'center', height: '100%', position: 'relative' },
  point: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#3B82F6' },
  label: { position: 'absolute', bottom: -16, fontSize: 10, color: '#374151' },
});


