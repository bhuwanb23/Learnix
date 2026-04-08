import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../constants/theme';

export default function StatsCardsRow({ stats }) {
  return (
    <View style={styles.container}>
      {stats.map((stat) => (
        <View key={stat.id} style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: stat.bgColor }]}>
            <MaterialIcons name={stat.icon.replace('_', '-')} size={20} color={stat.color} />
          </View>
          <View style={styles.textContainer}>
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
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-condensed',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.gray500,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
});
