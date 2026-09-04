import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function NotificationCard({ notification, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.card, notification.unread && styles.cardUnread]}
      onPress={() => onPress?.(notification)}
      activeOpacity={0.85}
    >
      <View style={[styles.iconWrap, { backgroundColor: notification.color + '1a' }]}>
        <MaterialIcons name={notification.icon} size={20} color={notification.color} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {notification.title}
        </Text>
        <Text style={styles.message} numberOfLines={2}>
          {notification.message}
        </Text>
        <Text style={styles.time}>{notification.time}</Text>
      </View>
      <View style={styles.right}>
        {notification.unread && <View style={styles.dot} />}
        <MaterialIcons name="chevron-right" size={20} color="#c3c7cc" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e8ec',
    gap: 14,
  },
  cardUnread: {
    borderColor: '#bcd0ff',
    backgroundColor: '#f7faff',
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#2c2f31',
    marginBottom: 3,
  },
  message: {
    fontFamily: 'Manrope-Medium',
    fontSize: 12,
    fontWeight: '500',
    color: '#595c5e',
    lineHeight: 17,
    marginBottom: 6,
  },
  time: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  right: {
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0050d4',
  },
});