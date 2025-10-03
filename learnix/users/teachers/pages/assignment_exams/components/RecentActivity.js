import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function RecentActivity({ items }) {
  return (
    <View style={styles.card}>
      <Text style={styles.header}>Recent Activity</Text>
      <View style={styles.list}>
        {items.map((it) => (
          <View key={it.id} style={[styles.row, { backgroundColor: it.tint }]}>            
            <View style={[styles.avatar, { backgroundColor: it.chipBg }]}>
              <Text style={styles.avatarIcon}>•</Text>
            </View>
            <View style={styles.body}>
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
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6', padding: 16 },
  header: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 12 },
  list: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 12, gap: 10 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarIcon: { color: '#fff', fontSize: 12, fontWeight: '700' },
  body: { flex: 1 },
  title: { fontSize: 12, fontWeight: '600', color: '#111827', marginBottom: 2 },
  time: { fontSize: 11, color: '#6B7280' },
});


