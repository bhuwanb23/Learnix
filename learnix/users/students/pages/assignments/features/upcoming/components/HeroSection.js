import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { UPCOMING_ASSIGNMENT_COLORS } from '../constants/upcomingAssignmentData';

export default function HeroSection({ data }) {
  return (
    <View style={styles.container}>
      {/* Main Info Card */}
      <View style={styles.mainCard}>
        <View style={styles.subjectBadge}>
          <Text style={styles.subjectText}>{data.subject} • {data.instructor}</Text>
        </View>
        
        <Text style={styles.title}>{data.title}</Text>
        
        <View style={styles.metadata}>
          <View style={styles.metaItem}>
            <MaterialIcons name="calendar-today" size={18} color={UPCOMING_ASSIGNMENT_COLORS.primary} />
            <Text style={styles.metaText}>Due {data.dueDate}</Text>
          </View>
          
          <View style={styles.timeLeftBadge}>
            <MaterialIcons name="schedule" size={18} color={UPCOMING_ASSIGNMENT_COLORS.error} />
            <Text style={styles.timeLeftText}>{data.timeLeft}</Text>
          </View>
        </View>
      </View>

      {/* Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <MaterialIcons name="play-arrow" size={36} color={`${UPCOMING_ASSIGNMENT_COLORS.onPrimary}CC`} />
          <Text style={styles.statusLabel}>Status: {data.status}</Text>
        </View>
        
        <View style={styles.statusFooter}>
          <Text style={styles.statusFooterLabel}>Current Progress</Text>
          <Text style={styles.statusFooterValue}>{data.progress}% Completed</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  mainCard: {
    backgroundColor: UPCOMING_ASSIGNMENT_COLORS.surfaceContainerLowest,
    borderRadius: 12,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  subjectBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${UPCOMING_ASSIGNMENT_COLORS.primaryContainer}33`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 10,
  },
  subjectText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
    color: UPCOMING_ASSIGNMENT_COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: UPCOMING_ASSIGNMENT_COLORS.onSurface,
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
    paddingTop: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold',
    color: UPCOMING_ASSIGNMENT_COLORS.onSurfaceVariant,
  },
  timeLeftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: `${UPCOMING_ASSIGNMENT_COLORS.errorContainer}1A`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  timeLeftText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: UPCOMING_ASSIGNMENT_COLORS.error,
  },
  statusCard: {
    backgroundColor: UPCOMING_ASSIGNMENT_COLORS.primary,
    borderRadius: 12,
    padding: 18,
    justifyContent: 'space-between',
    minHeight: 120,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
    color: `${UPCOMING_ASSIGNMENT_COLORS.onPrimary}B3`,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  statusFooter: {
    gap: 3,
  },
  statusFooterLabel: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: `${UPCOMING_ASSIGNMENT_COLORS.onPrimary}E6`,
    marginBottom: 3,
  },
  statusFooterValue: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: UPCOMING_ASSIGNMENT_COLORS.onPrimary,
    letterSpacing: -0.3,
  },
});
