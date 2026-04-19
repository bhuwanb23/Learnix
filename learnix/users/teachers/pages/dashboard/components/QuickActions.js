import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function QuickActions({ actions, onPress }) {
  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[styles.card, { backgroundColor: action.color }]}
            activeOpacity={0.85}
            onPress={() => onPress && onPress(action.id)}
          >
            <MaterialIcons name={action.icon} size={32} color="#ffffff" />
            <Text style={styles.label} numberOfLines={2}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 28,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '48%',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    justifyContent: 'space-between',
    minHeight: 120,
  },
  label: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 20,
    marginTop: 8,
  },
});
