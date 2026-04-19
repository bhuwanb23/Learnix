import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../constants/theme';

export default function StatsCardsRow({ stats }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768;
  const iconSize = isDesktop ? 22 : isTablet ? 21 : 18;
  const iconBox = isDesktop ? 40 : isTablet ? 38 : 34;
  const valueSize = isDesktop ? 22 : isTablet ? 21 : 19;
  const labelSize = isDesktop ? 11 : 10;

  return (
    <View style={styles.container}>
      {stats.map((stat) => (
        <View key={stat.id} style={styles.card}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: stat.bgColor,
                width: iconBox,
                height: iconBox,
                borderRadius: iconBox / 2,
              },
            ]}
          >
            <MaterialIcons name={stat.icon.replace('_', '-')} size={iconSize} color={stat.color} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.value, { fontSize: valueSize }]}>{stat.value}</Text>
            <Text style={[styles.label, { fontSize: labelSize }]}>{stat.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 0,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  value: {
    fontWeight: '800',
    color: COLORS.textPrimary,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  label: {
    fontWeight: '600',
    color: COLORS.gray500,
    fontFamily: 'Manrope-Regular',
  },
});
