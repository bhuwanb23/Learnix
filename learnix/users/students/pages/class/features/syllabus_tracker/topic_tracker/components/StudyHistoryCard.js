import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { TOPIC_TRACKER_COLORS } from '../constants/topicTrackerData';

export default function StudyHistoryCard({ data, onPress }) {
  return (
    <View style={styles.container}>
      {/* Decorative Background Circles */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />
      
      {/* Content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="history" size={28} color={TOPIC_TRACKER_COLORS.onPrimary} />
            </View>
            <View>
              <Text style={styles.label}>Last Session</Text>
              <Text style={styles.date}>{data.lastSession}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Time Invested</Text>
            <Text style={styles.statValue}>{data.timeInvested}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Focus Streak</Text>
            <Text style={styles.statValue}>{data.focusStreak}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.button}
          onPress={onPress}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{data.buttonText}</Text>
          <MaterialIcons name="arrow-forward" size={16} color={TOPIC_TRACKER_COLORS.onPrimary} style={styles.buttonIcon} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: TOPIC_TRACKER_COLORS.primary,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  bgCircle1: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  bgCircle2: {
    position: 'absolute',
    left: -20,
    bottom: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  content: {
    padding: 20,
    position: 'relative',
    zIndex: 10,
  },
  header: {
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: `${TOPIC_TRACKER_COLORS.onPrimary}B3`,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  date: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: TOPIC_TRACKER_COLORS.onPrimary,
    letterSpacing: -0.3,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    gap: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: `${TOPIC_TRACKER_COLORS.onPrimary}B3`,
    marginBottom: 6,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: TOPIC_TRACKER_COLORS.onPrimary,
    letterSpacing: -0.5,
  },
  divider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
    color: TOPIC_TRACKER_COLORS.onPrimary,
  },
  buttonIcon: {
    marginLeft: 6,
  },
});
