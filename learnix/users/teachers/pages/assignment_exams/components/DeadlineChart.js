import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function DeadlineChart({ data }) {
  const max = Math.max(...data.series, 15);
  return (
    <View style={styles.card}>
      <Text style={styles.header}>Upcoming Deadlines</Text>
      <View style={styles.graph}>
        {data.series.map((v, idx) => (
          <View key={idx} style={styles.barWrap}>
            <View style={[styles.bar, { height: `${(v / max) * 100}%` }]} />
            <Text style={styles.label} numberOfLines={1}>{data.labels[idx]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6', padding: 16 },
  header: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 12 },
  graph: { height: 160, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  barWrap: { alignItems: 'center', width: 50 },
  bar: { width: 20, backgroundColor: '#8B5CF6', borderRadius: 6 },
  label: { marginTop: 6, fontSize: 10, color: '#374151', transform: [{ rotate: '-20deg' }] },
});


