import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WEAK_TOPICS_COLORS } from '../constants/weakTopicsData';

export default function GapCard({ gap }) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: gap.severityColor }]}>
            <Text style={[styles.badgeText, { color: gap.severityTextColor }]}>{gap.severity}</Text>
          </View>
          <Text style={styles.conceptId}>{gap.conceptId}</Text>
        </View>

        <Text style={styles.title}>{gap.title}</Text>
        <Text style={styles.description}>{gap.description}</Text>

        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${gap.mastery}%`, backgroundColor: gap.progressColor }]} />
          </View>
          <Text style={[styles.masteryText, { color: gap.progressColor }]}>{gap.mastery}% Mastery</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.actionBar} activeOpacity={0.7}>
        <Text style={styles.actionText}>{gap.actionText}</Text>
        <Ionicons name={gap.actionIcon} size={20} color={WEAK_TOPICS_COLORS.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: WEAK_TOPICS_COLORS.surfaceContainerLow,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  conceptId: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: WEAK_TOPICS_COLORS.onSurfaceVariant,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: WEAK_TOPICS_COLORS.onSurface,
    lineHeight: 26,
  },
  description: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Manrope-Regular',
    color: WEAK_TOPICS_COLORS.onSurfaceVariant,
    lineHeight: 22,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 8,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: WEAK_TOPICS_COLORS.surfaceContainerHigh,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  masteryText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    minWidth: 70,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: WEAK_TOPICS_COLORS.surfaceContainerLowest,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: `${WEAK_TOPICS_COLORS.outlineVariant}1A`,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold',
    color: WEAK_TOPICS_COLORS.onSurface,
  },
});
