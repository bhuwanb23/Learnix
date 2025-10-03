import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function NavButtons({ items, onPress }) {
  return (
    <View style={styles.grid}>
      {items.map((it, idx) => (
        <TouchableOpacity
          key={it.id}
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => onPress && onPress(it.id)}
        >
          <View style={[styles.iconWrap, { backgroundColor: it.tint }]}>            
            <Text style={[styles.icon, { color: it.text }]}>{it.icon}</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>{it.title}</Text>
        </TouchableOpacity>
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
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    alignItems: 'center',
    width: '48%',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 18,
    fontWeight: '700',
  },
  title: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
});


