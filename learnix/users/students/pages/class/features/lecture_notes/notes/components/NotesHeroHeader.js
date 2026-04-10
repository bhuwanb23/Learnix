import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NOTES_COLORS } from '../constants/notesData';

export default function NotesHeroHeader({ data }) {
  return (
    <View style={styles.container}>
      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{data.category}</Text>
        </View>
        <View style={styles.readTime}>
          <Ionicons name="time-outline" size={14} color={NOTES_COLORS.onSurfaceVariant} />
          <Text style={styles.readTimeText}>{data.readTime}</Text>
        </View>
      </View>

      <Text style={styles.title}>{data.title}</Text>
      <Text style={styles.description}>{data.description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: `${NOTES_COLORS.primaryContainer}4D`,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: NOTES_COLORS.primary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  readTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readTimeText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Manrope-Regular',
    color: NOTES_COLORS.onSurfaceVariant,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: NOTES_COLORS.onSurface,
    lineHeight: 36,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'Manrope-Regular',
    color: NOTES_COLORS.onSurfaceVariant,
    lineHeight: 24,
  },
});
