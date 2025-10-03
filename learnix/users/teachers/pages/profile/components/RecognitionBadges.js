import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../constants/theme';

export default function RecognitionBadges({ items }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recent Recognition</Text>
      <View style={styles.grid}>
        {items.map((b, idx) => (
          <View key={b.id} style={[styles.badge, { backgroundColor: b.bgStart }, idx % 2 === 1 && { opacity: 0.95 }]}>
            <Text style={styles.badgeIcon}>{b.icon}</Text>
            <Text style={styles.badgeTitle}>{b.title}</Text>
            <Text style={styles.badgeSubtitle}>{b.subtitle}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.lg },
  title: { fontSize: TYPOGRAPHY.sizes.md, fontWeight: TYPOGRAPHY.weights.semibold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  badge: { flexBasis: '48%', borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, ...SHADOWS.sm },
  badgeIcon: { fontSize: 18, color: COLORS.white, marginBottom: 6 },
  badgeTitle: { color: COLORS.white, fontWeight: TYPOGRAPHY.weights.semibold },
  badgeSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: TYPOGRAPHY.sizes.xs },
});


