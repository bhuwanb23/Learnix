import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../constants/theme';

export default function QuickAccess({ items }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick Access</Text>
      <View style={styles.stack}>
        {items.map(item => (
          <TouchableOpacity key={item.id} activeOpacity={0.9} style={[styles.row, { borderColor: item.borderColor }]}> 
            <View style={[styles.iconWrap, { backgroundColor: item.iconBg }]}>
              <Text style={[styles.iconText, { color: item.iconColor }]}>{item.icon}</Text>
            </View>
            <View style={styles.texts}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowMeta}>{item.subtitle}</Text>
            </View>
            <Text style={styles.chev}>{'>'}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.lg },
  title: { fontSize: TYPOGRAPHY.sizes.md, fontWeight: TYPOGRAPHY.weights.semibold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  stack: { gap: SPACING.sm },
  row: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, ...SHADOWS.sm, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 48, height: 48, borderRadius: BORDER_RADIUS.lg, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  iconText: { fontSize: 18, fontWeight: TYPOGRAPHY.weights.semibold },
  texts: { flex: 1 },
  rowTitle: { fontWeight: TYPOGRAPHY.weights.semibold, color: COLORS.textPrimary },
  rowMeta: { fontSize: TYPOGRAPHY.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  chev: { color: COLORS.textSecondary },
});


