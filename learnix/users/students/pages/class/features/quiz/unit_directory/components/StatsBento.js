import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UNIT_DIRECTORY_COLORS } from '../constants/unitDirectoryData';

export default function StatsBento({ stats }) {
  return (
    <View style={styles.container}>
      {stats.map((stat) => (
        <View key={stat.id} style={styles.statCard}>
          <View style={styles.statHeader}>
            <Ionicons name={stat.icon} size={20} color={stat.color} />
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
          <Text style={styles.statValue}>{stat.value}</Text>
          <Text style={styles.statDescription}>{stat.description}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  statCard: {
    backgroundColor: UNIT_DIRECTORY_COLORS.surfaceContainerLow,
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: UNIT_DIRECTORY_COLORS.onSurfaceVariant,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: UNIT_DIRECTORY_COLORS.onSurface,
    marginBottom: 4,
  },
  statDescription: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: UNIT_DIRECTORY_COLORS.onSurfaceVariant,
  },
});
