import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function TimetableSection({ data, onNotificationPress }) {
  return (
    <LinearGradient colors={["#2563eb", "#3b82f6"]} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{data.title}</Text>
          <Text style={styles.subtitle}>{data.dateLabel}</Text>
        </View>
        
        <TouchableOpacity style={styles.notificationButton} onPress={onNotificationPress}>
          <Text style={styles.notificationIcon}>🔔</Text>
          <View style={styles.notificationBadge}>
            <Text style={styles.badgeText}>3</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.list}>
        {data.items.map((item) => (
          <View
            key={item.id}
            style={[
              styles.row,
              item.variant === 'highlight' ? styles.rowHighlight : styles.rowSubtle,
            ]}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.colorBar, { backgroundColor: item.color }]} />
              <View>
                <Text style={styles.rowTitle}>{item.subject}</Text>
                <Text style={styles.rowTime}>{item.time}</Text>
              </View>
            </View>

            {item.status && (
              <View style={[styles.statusChip, { backgroundColor: item.status.bg }]}>
                <Text style={[styles.statusText, { color: item.status.text }]}>
                  {item.status.label}
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    color: '#DBEAFE',
    fontSize: 12,
    fontWeight: '500',
  },
  notificationButton: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationIcon: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  list: {
    gap: 8,
  },
  row: {
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowHighlight: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  rowSubtle: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorBar: {
    width: 8,
    height: 32,
    borderRadius: 4,
  },
  rowTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rowTime: {
    color: '#DBEAFE',
    fontSize: 12,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
});


