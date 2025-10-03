import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function PendingTasks({ data }) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>        
        <Text style={styles.header}>Pending Tasks</Text>
        <View style={styles.badge}><Text style={styles.badgeText}>{data.count}</Text></View>
      </View>
      <View style={styles.list}>
        {data.items.map((t) => (
          <View key={t.id} style={[styles.task, { borderLeftColor: t.color }]}>
            <Text style={styles.taskTitle} numberOfLines={1}>{t.title}</Text>
            <Text style={styles.taskDue}>Due: {t.due}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 16,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  header: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991B1B',
  },
  badge: {
    marginLeft: 'auto',
    backgroundColor: '#EF4444',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  list: {
    gap: 8,
  },
  task: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderLeftWidth: 4,
  },
  taskTitle: {
    color: '#1F2937',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  taskDue: {
    color: '#6B7280',
    fontSize: 11,
  },
});


