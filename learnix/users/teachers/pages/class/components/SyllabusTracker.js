import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SyllabusTracker({ data }) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Syllabus Progress</Text>
        <Text style={styles.percent}>{data.overall}%</Text>
      </View>

      <View style={styles.list}>
        {data.items.map((i, idx) => (
          <View key={i.id} style={styles.item}>
            <View style={styles.itemRow}>
              <Text style={styles.itemLabel} numberOfLines={1} ellipsizeMode="tail">{i.label}</Text>
              <Text style={[styles.itemPercent, { color: i.color }]}>{i.percent}%</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${i.percent}%`, backgroundColor: i.color }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  header: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  percent: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  list: {
    gap: 12,
  },
  item: {},
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  itemLabel: {
    fontSize: 12,
    color: '#374151',
    maxWidth: '70%',
  },
  itemPercent: {
    fontSize: 12,
    fontWeight: '600',
  },
  track: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});


