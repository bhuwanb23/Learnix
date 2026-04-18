import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function StatsGrid({ stats }) {
  return (
    <View style={styles.container}>
      {stats.map((stat) => (
        <View key={stat.id} style={[styles.card, { backgroundColor: `${stat.color}08` }]}>
          <View style={styles.header}>
            <View style={[styles.iconBox, { backgroundColor: stat.bg }]}>
              <MaterialIcons name={stat.icon} size={28} color={stat.color} />
            </View>
            <Text style={styles.headerLabel}>{stat.header}</Text>
          </View>
          <View style={styles.content}>
            <Text style={styles.value}>
              {stat.value}
              {stat.suffix && <Text style={styles.suffix}>{stat.suffix}</Text>}
            </Text>
            <Text style={styles.label}>{stat.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginBottom: 48,
    gap: 16,
  },
  card: {
    borderRadius: 12,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconBox: {
    padding: 12,
    borderRadius: 8,
  },
  headerLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    fontWeight: '700',
    color: '#595c5e',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  content: {
    marginTop: 24,
  },
  value: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 40,
    fontWeight: '800',
    color: '#2c2f31',
    letterSpacing: -1,
  },
  suffix: {
    fontSize: 20,
  },
  label: {
    fontFamily: 'Manrope-Medium',
    fontSize: 13,
    fontWeight: '500',
    color: '#595c5e',
    marginTop: 4,
  },
});
