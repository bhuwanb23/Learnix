import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { TOPIC_TRACKER_COLORS } from '../constants/topicTrackerData';

export default function QuizCard({ data, onPress }) {
  return (
    <View style={styles.container}>
      <View>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="analytics" size={24} color={TOPIC_TRACKER_COLORS.primary} />
          </View>
          <Text style={styles.title}>{data.title}</Text>
        </View>

        <View style={styles.stats}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Average Score</Text>
            <Text style={styles.statValue}>{data.averageScore}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Attempts</Text>
            <Text style={styles.statValueSecondary}>{data.totalAttempts}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Accuracy</Text>
            <Text style={[styles.statValueSecondary, styles.accuracyText]}>{data.accuracy}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.button}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>{data.buttonText}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: TOPIC_TRACKER_COLORS.surfaceContainerLow,
    borderRadius: 12,
    padding: 20,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  iconContainer: {
    padding: 10,
    backgroundColor: `${TOPIC_TRACKER_COLORS.primary}1A`,
    borderRadius: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: TOPIC_TRACKER_COLORS.onSurface,
    letterSpacing: -0.3,
  },
  stats: {
    gap: 18,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: TOPIC_TRACKER_COLORS.onSurfaceVariant,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: TOPIC_TRACKER_COLORS.primary,
    letterSpacing: -0.5,
  },
  statValueSecondary: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
    color: TOPIC_TRACKER_COLORS.onSurface,
  },
  accuracyText: {
    color: TOPIC_TRACKER_COLORS.secondary,
  },
  button: {
    backgroundColor: TOPIC_TRACKER_COLORS.surfaceContainerHigh,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 24,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
    color: TOPIC_TRACKER_COLORS.onSurface,
  },
});
