import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function TimetableSection({ data }) {
  return (
    <LinearGradient colors={["#2563eb", "#3b82f6"]} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.subtitle}>{data.dateLabel}</Text>
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
    marginBottom: 12,
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


