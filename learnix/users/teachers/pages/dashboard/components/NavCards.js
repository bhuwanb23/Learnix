import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../constants/theme';

export default function NavCards({ cards, onPress }) {
  return (
    <View style={styles.grid}>
      {cards.map(card => (
        <TouchableOpacity key={card.id} style={styles.card} onPress={() => onPress(card.id)} activeOpacity={0.85}>
          <View style={[styles.iconCircle, { backgroundColor: card.bg }]}>
            <Ionicons name={toIcon(card.icon)} size={22} color={card.color} />
          </View>
          <Text style={styles.title}>{card.title}</Text>
          <Text style={styles.subtitle}>{card.subtitle}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const toIcon = (name) => {
  switch (name) {
    case 'people': return 'people-outline';
    case 'clipboard': return 'clipboard-outline';
    case 'trending-up': return 'trending-up-outline';
    case 'person-circle': return 'person-circle-outline';
    default: return 'apps-outline';
  }
};

const styles = StyleSheet.create({
  grid: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  card: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});


