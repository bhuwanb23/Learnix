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
    company: 'Google',
    title: 'Career Summit 2024',
    date: '24',
    month: 'OCT',
    day: 'Thursday',
    time: '09:00 AM',
    location: 'Main Auditorium',
    status: 'Registering Now',
    statusColor: '#10B981',
    statusBg: 'rgba(16, 185, 129, 0.1)',
    spots: 420,
    totalSpots: 500,
  },
  {
    id: '2',
    company: 'Microsoft',
    title: 'Fintech Innovators Recruitment',
    date: '28',
    month: 'OCT',
    day: 'Monday',
    time: '11:30 AM',
    location: 'Conference Hall B',
    status: 'Invitation Only',
    statusColor: '#F59E0B',
    statusBg: 'rgba(245, 158, 11, 0.1)',
    spots: null,
    totalSpots: null,
  },
  {
    id: '3',
    company: 'Amazon',
    title: 'SDE Intern Program 2025',
    date: '02',
    month: 'NOV',
    day: 'Saturday',
    time: '10:00 AM',
    location: 'Virtual Event',
    status: 'Coming Soon',
    statusColor: '#6366F1',
    statusBg: 'rgba(99, 102, 241, 0.1)',
    spots: 250,
    totalSpots: 300,
  },
];

export default function UpcomingDrives() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Upcoming Campus Drives</Text>
          <Text style={styles.subtitle}>Don't miss your dream opportunity</Text>
        </View>
        <TouchableOpacity style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>See All</Text>
          <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.drivesList}>
        {drives.map((drive) => (
          <TouchableOpacity key={drive.id} style={styles.driveCard} activeOpacity={0.85}>
            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: drive.statusBg }]}>
              <View style={[styles.statusDot, { backgroundColor: drive.statusColor }]} />
              <Text style={[styles.statusText, { color: drive.statusColor }]}>
                {drive.status}
              </Text>
            </View>

            {/* Date Section */}
            <View style={styles.dateSection}>
              <View style={styles.dateBox}>
                <Text style={styles.monthText}>{drive.month}</Text>
                <Text style={styles.dateText}>{drive.date}</Text>
              </View>
              <Text style={styles.dayText}>{drive.day}</Text>
            </View>

            {/* Company & Title */}
            <View style={styles.infoSection}>
              <Text style={styles.companyName}>{drive.company}</Text>
              <Text style={styles.driveTitle}>{drive.title}</Text>
              
              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.detailText}>{drive.time}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.detailText}>{drive.location}</Text>
                </View>
              </View>
            </View>

            {/* Spots Progress */}
            {drive.spots !== null && (
              <View style={styles.spotsSection}>
                <View style={styles.spotsHeader}>
                  <Text style={styles.spotsLabel}>Available Spots</Text>
                  <Text style={styles.spotsCount}>{drive.spots}/{drive.totalSpots}</Text>
                </View>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        width: `${(drive.spots / drive.totalSpots) * 100}%`,
                        backgroundColor: drive.statusColor 
                      }
                    ]} 
                  />
                </View>
              </View>
            )}

            {/* Arrow Icon */}
            <View style={styles.arrowContainer}>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    color: COLORS.textSecondary,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  drivesList: {
    gap: SPACING.md,
  },
  driveCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    position: 'relative',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.md,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  dateBox: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  monthText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  dateText: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.extraBold,
    color: COLORS.textPrimary,
    lineHeight: 28,
  },
  dayText: {
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    color: COLORS.textSecondary,
  },
  infoSection: {
    marginBottom: SPACING.md,
  },
  companyName: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  driveTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    lineHeight: 24,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: COLORS.textSecondary,
  },
  spotsSection: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  spotsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  spotsLabel: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  spotsCount: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.full,
  },
  arrowContainer: {
    position: 'absolute',
    right: SPACING.lg,
    top: '50%',
    marginTop: -10,
  },
});
