import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
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

      <TouchableOpacity style={styles.actionBar} activeOpacity={0.7} onPress={() => Alert.alert(gap.title, `Launching ${gap.actionText.toLowerCase()} for this concept…`)}>
        <Text style={styles.actionText}>{gap.actionText}</Text>
        <Ionicons name={gap.actionIcon} size={20} color={WEAK_TOPICS_COLORS.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: WEAK_TOPICS_COLORS.surfaceContainerLow,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 30,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  content: {
    padding: 16,
    gap: 10,
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
    fontSize: 8,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  conceptId: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: WEAK_TOPICS_COLORS.onSurfaceVariant,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: WEAK_TOPICS_COLORS.onSurface,
    lineHeight: 22,
  },
  description: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Manrope-Regular',
    color: WEAK_TOPICS_COLORS.onSurfaceVariant,
    lineHeight: 19,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: `${WEAK_TOPICS_COLORS.outlineVariant}1A`,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold',
    color: WEAK_TOPICS_COLORS.onSurface,
  },
});
