import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function StatsCardsRow({ stats }) {
  return (
    <View style={styles.container}>
      {stats.map((stat) => (
        <View key={stat.id} style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: stat.bgColor }]}>
            <MaterialIcons name={stat.icon.replace('_', '-')} size={24} color={stat.color} />
          </View>
          <View>
            <Text style={styles.value}>{stat.value}</Text>
            <Text style={styles.label}>{stat.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24, // px-6 from main
    marginTop: 24, // mt-6
    flexDirection: 'row',
    flexWrap: 'wrap', // grid-cols-2 md:grid-cols-4
    gap: 16, // gap-4
  },
  card: {
    width: '47%', // roughly half width minus gap for 2 cols mobile
    backgroundColor: '#eef1f3', // bg-surface-container-low
    borderRadius: 12, // rounded-xl
    padding: 20, // p-5
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16, // gap-4
  },
  iconContainer: {
    width: 40, // w-10
    height: 40, // h-10
    borderRadius: 20, // rounded-full
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: {
    fontSize: 24, // text-2xl
    fontWeight: '700', // font-bold
    color: '#2c2f31',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  label: {
    fontSize: 10, // text-[10px]
    fontWeight: '700', // font-bold
    color: '#595c5e', // text-on-surface-variant
    textTransform: 'uppercase',
    marginTop: 0,
    fontFamily: 'Manrope-Bold',
  },
});
