import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../../../../constants/theme';

const drives = [
  {
    id: '1',
    title: 'Google Career Summit 2024',
    date: 'Oct 24',
    time: '09:00 AM',
    location: 'Main Auditorium',
    status: 'Registering Now',
    statusColor: COLORS.tertiaryDim,
    slots: '420 slots left',
  },
  {
    id: '2',
    title: 'Fintech Innovators Recruitment',
    date: 'Oct 28',
    time: '11:30 AM',
    location: 'Conference Hall B',
    status: 'Invitation Only',
    statusColor: COLORS.textSecondary,
    slots: 'High Eligibility',
  },
];

export default function UpcomingDrives() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upcoming Campus Drives</Text>

      <View style={styles.drivesList}>
        {drives.map((drive) => (
          <TouchableOpacity key={drive.id} style={styles.driveCard} activeOpacity={0.8}>
            <View style={styles.driveContent}>
              <View style={styles.dateContainer}>
                <Text style={styles.monthText}>{drive.date.split(' ')[0]}</Text>
                <Text style={styles.dayText}>{drive.date.split(' ')[1]}</Text>
              </View>

              <View style={styles.driveInfo}>
                <Text style={styles.driveTitle}>{drive.title}</Text>
                <Text style={styles.driveLocation}>
                  {drive.location} • {drive.time}
                </Text>
              </View>
            </View>

            <View style={styles.driveAction}>
              <View style={styles.driveStatus}>
                <Text style={[styles.statusText, { color: drive.statusColor }]}>
                  {drive.status}
                </Text>
                <Text style={styles.slotsText}>{drive.slots}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={24}
                color={COLORS.textSecondary}
              />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  drivesList: {
    gap: SPACING.md,
  },
  driveCard: {
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driveContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    flex: 1,
  },
  dateContainer: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  monthText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayText: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.primary,
  },
  driveInfo: {
    flex: 1,
  },
  driveTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  driveLocation: {
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    color: COLORS.textSecondary,
  },
  driveAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  driveStatus: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  slotsText: {
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    color: COLORS.textSecondary,
  },
});
