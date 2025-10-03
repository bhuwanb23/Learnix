import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function QuickActions({ actions, onPress }) {
  return (
    <View style={styles.card}>
      <Text style={styles.header}>Quick Actions</Text>
      <View style={styles.grid}>
        {actions.map((a) => (
          <TouchableOpacity
            key={a.id}
            style={[styles.action, { backgroundColor: a.bg }]}
            activeOpacity={0.85}
            onPress={() => onPress && onPress(a.id)}
          >
            <Text style={styles.icon}>{a.icon}</Text>
            <Text style={styles.label} numberOfLines={1} ellipsizeMode="tail">{a.label}</Text>
          </TouchableOpacity>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  action: {
    width: '48%',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  icon: {
    fontSize: 16,
    marginBottom: 6,
  },
  label: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});


