import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { TOPIC_COLORS } from '../constants/topicListData';

export default function UnitHeroSection({ unit }) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.leftContent}>
          <Text style={styles.subtitle}>{unit.subtitle}</Text>
          <Text style={styles.title}>Unit {unit.unitNumber}: {unit.title}</Text>
          <Text style={styles.description}>{unit.description}</Text>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{unit.totalTopics}</Text>
            <Text style={styles.statLabel}>Topics</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: TOPIC_COLORS.secondary }]}>{unit.progress}%</Text>
            <Text style={styles.statLabel}>Progress</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 16,
  },
  leftContent: {
    flex: 1,
    gap: 8,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: TOPIC_COLORS.primary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: TOPIC_COLORS.onSurface,
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Manrope-Regular',
    color: TOPIC_COLORS.onSurfaceVariant,
    lineHeight: 20,
    maxWidth: 320,
  },
  statsCard: {
    backgroundColor: TOPIC_COLORS.surfaceContainerLowest,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: TOPIC_COLORS.primary,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: TOPIC_COLORS.onSurfaceVariant,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: TOPIC_COLORS.outlineVariant,
    opacity: 0.3,
  },
});
