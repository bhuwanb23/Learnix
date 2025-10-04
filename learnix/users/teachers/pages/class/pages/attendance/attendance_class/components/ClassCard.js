import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../../../../constants/theme';
import { formatDate, getAttendanceStatus } from '../constants/attendanceData';

const ClassCard = ({ 
  classItem, 
  onPress, 
  onMarkAttendance, 
  onViewReports 
}) => {
  const attendanceStatus = getAttendanceStatus(classItem.attendanceRate);

  return (
    <TouchableOpacity 
      style={[styles.container, { borderLeftColor: classItem.color }]}
      onPress={() => onPress(classItem)}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.classInfo}>
          <Text style={styles.className}>{classItem.className}</Text>
          <Text style={styles.classCode}>{classItem.classCode}</Text>
        </View>
        <View style={[styles.iconContainer, { backgroundColor: classItem.color }]}>
          <Text style={styles.icon}>{classItem.icon}</Text>
        </View>
      </View>

      {/* Details */}
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Subject:</Text>
          <Text style={styles.detailValue}>{classItem.subject}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Room:</Text>
          <Text style={styles.detailValue}>{classItem.room}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Next Class:</Text>
          <Text style={styles.detailValue}>{formatDate(classItem.nextClass)}</Text>
        </View>
      </View>

      {/* Attendance Stats */}
      <View style={styles.attendanceContainer}>
        <View style={styles.attendanceStats}>
          <View style={styles.attendanceItem}>
            <Text style={styles.attendanceNumber}>{classItem.presentToday}</Text>
            <Text style={styles.attendanceLabel}>Present Today</Text>
          </View>
          <View style={styles.attendanceItem}>
            <Text style={styles.attendanceNumber}>{classItem.totalStudents}</Text>
            <Text style={styles.attendanceLabel}>Total Students</Text>
          </View>
          <View style={styles.attendanceItem}>
            <Text style={[styles.attendanceNumber, { color: attendanceStatus.color }]}>
              {classItem.attendanceRate}%
            </Text>
            <Text style={styles.attendanceLabel}>Attendance Rate</Text>
          </View>
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: attendanceStatus.color }]}>
          <Text style={styles.statusText}>{attendanceStatus.status}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.markButton]}
          onPress={() => onMarkAttendance(classItem)}
        >
          <Text style={styles.markButtonText}>Mark Attendance</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.reportsButton]}
          onPress={() => onViewReports(classItem)}
        >
          <Text style={styles.reportsButtonText}>View Reports</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderLeftWidth: 4,
    ...SHADOWS.md
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md
  },
  classInfo: {
    flex: 1
  },
  className: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs
  },
  classCode: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textSecondary,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: 'flex-start'
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm
  },
  icon: {
    fontSize: 24
  },
  details: {
    marginBottom: SPACING.md
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs
  },
  detailLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weights.medium
  },
  detailValue: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: 'right'
  },
  attendanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  attendanceStats: {
    flexDirection: 'row',
    flex: 1
  },
  attendanceItem: {
    flex: 1,
    alignItems: 'center'
  },
  attendanceNumber: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: '#3B82F6',
    marginBottom: SPACING.xs
  },
  attendanceLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
    textAlign: 'center'
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    marginLeft: SPACING.md
  },
  statusText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.weights.semibold
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm
  },
  actionButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center'
  },
  markButton: {
    backgroundColor: '#10B981'
  },
  markButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold
  },
  reportsButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  reportsButtonText: {
    color: '#3B82F6',
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold
  }
});

export default ClassCard;
