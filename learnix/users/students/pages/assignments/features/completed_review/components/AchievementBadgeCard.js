import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COMPLETED_REVIEW_COLORS } from '../constants/completedReviewData';

export default function AchievementBadgeCard({ assignment }) {
  return (
    <View style={styles.container}>
      <View style={styles.badgeHeader}>
        <View style={styles.badgeIcon}>
          <MaterialIcons name="military-tech" size={20} color={COMPLETED_REVIEW_COLORS.onPrimary} />
        </View>
        {assignment.achievementBadge.locked && (
          <View style={styles.lockedBadge}>
            <Text style={styles.lockedText}>Locked</Text>
          </View>
        )}
      </View>
      <Text style={styles.badgeTitle}>{assignment.achievementBadge.title}</Text>
      <Text style={styles.badgeDescription}>{assignment.achievementBadge.description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COMPLETED_REVIEW_COLORS.secondary,
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 20,
  },
  badgeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  lockedText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 9,
    fontWeight: '700',
    color: COMPLETED_REVIEW_COLORS.onPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  badgeTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: COMPLETED_REVIEW_COLORS.onPrimary,
    marginTop: 16,
  },
  badgeDescription: {
    fontFamily: 'Manrope-Medium',
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
});
