import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function OverviewCards({ items }) {
  return (
    <View style={styles.grid}>
      {items.map((it) => (
        <View key={it.id} style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: it.iconBg }]}>
              <Text style={[styles.icon, { color: it.iconColor }]}>{it.icon}</Text>
            </View>
            <Text style={[styles.badge, { color: it.badgeColor }]}>{it.badge}</Text>
          </View>
          <Text style={styles.value}>{it.value}</Text>
          <Text style={styles.label}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 12,
    width: '48%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 14,
  },
  badge: {
    fontSize: 10,
    fontWeight: '600',
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: '#4B5563',
  },
});


