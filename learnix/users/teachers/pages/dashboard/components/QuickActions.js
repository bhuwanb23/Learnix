import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../constants/theme';

export default function QuickActions({ actions, onPress }) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Ionicons name="flash" size={18} color={COLORS.textPrimary} style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={styles.dot} />
      </View>
      <View style={styles.grid}>
        {actions.map(action => (
          <TouchableOpacity key={action.id} style={styles.cardOuter} onPress={() => onPress(action.id)} activeOpacity={0.9}>
            <LinearGradient colors={action.gradient || ['#3B82F6', '#2563EB']} style={styles.card}>
              <View style={styles.iconCircle}>
                <Ionicons name={toIonIcon(action.icon)} size={20} color={action.iconColor || '#2563EB'} />
              </View>
              <Text style={styles.cardLabel}>{action.label}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const toIonIcon = (name) => {
  switch (name) {
    case 'play': return 'play';
    case 'checkmark-circle': return 'checkmark-circle';
    case 'cloud-upload': return 'cloud-upload';
    default: return 'flash';
  }
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    // marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  grid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'space-between',
  },
  cardOuter: { flex: 1 },
  card: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOWS.sm,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
    backgroundColor: COLORS.white,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
  },
  cardLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.weights.medium,
    textAlign: 'center',
  },
});


