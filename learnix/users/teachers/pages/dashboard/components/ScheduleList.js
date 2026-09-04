import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function ScheduleList({ items, onPressAll, onPressItem, onJoin }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Today's Schedule</Text>
        <TouchableOpacity onPress={onPressAll}>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.list}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            activeOpacity={0.9}
            onPress={() => onPressItem && onPressItem(item)}
          >
            <View style={styles.info}>
              <Text style={styles.time}>{item.time}</Text>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.location}>{item.location}</Text>
            </View>
            {item.canJoin && (
              <TouchableOpacity
                style={styles.joinButton}
                activeOpacity={0.8}
                onPress={() => onJoin && onJoin(item)}
              >
                <Text style={styles.joinText}>Join Live</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#eef1f3',
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#2c2f31',
  },
  viewAll: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
    color: '#0050d4',
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  info: {
    flex: 1,
  },
  time: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  location: {
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: '#64748b',
  },
  joinButton: {
    backgroundColor: '#0050d4',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    shadowColor: '#0050d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  joinText: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
    color: '#ffffff',
  },
});
