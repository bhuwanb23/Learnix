import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function RecentActivity({ items }) {
  return (
    <View style={styles.card}>
      <Text style={styles.header}>Recent Activity</Text>
      <View style={styles.list}>
        {items.map((it) => (
          <View key={it.id} style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: it.tint }]}>
              <Text style={[styles.icon, { color: it.text }]}>{it.icon}</Text>
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.title} numberOfLines={1}>{it.title}</Text>
              <Text style={styles.time}>{it.time}</Text>
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
  header: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  list: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 12,
    fontWeight: '700',
  },
  rowBody: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '600',
    marginBottom: 2,
  },
  time: {
    fontSize: 11,
    color: '#6B7280',
  },
});


