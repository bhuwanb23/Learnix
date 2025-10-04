import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getAttendanceStatus } from '../constants/attendanceData';

const ClassCard = ({ 
  classItem, 
  onPress, 
  onMarkAttendance, 
  onViewReports,
  navigation 
}) => {
  const attendanceStatus = getAttendanceStatus(classItem.attendanceRate);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(classItem.id)}
      activeOpacity={0.95}
    >
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.classInfo}>
          <Text style={styles.className}>{classItem.className}</Text>
          <Text style={styles.classDetails}>
            {classItem.grade} - {classItem.semester}
          </Text>
        </View>
        
        <View style={[styles.attendanceBadge, { backgroundColor: attendanceStatus.bgColor }]}>
          <Text style={[styles.attendanceRate, { color: attendanceStatus.color }]}>
            {classItem.attendanceRate}%
          </Text>
        </View>
      </View>

      {/* Card Details */}
      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>🕐</Text>
            <Text style={styles.detailText}>{classItem.time}</Text>
          </View>
          
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>👥</Text>
            <Text style={styles.detailText}>{classItem.totalStudents} students</Text>
          </View>
        </View>
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => {
          if (navigation && navigation.navigate) {
            navigation.navigate('AttendanceMarks');
          } else {
            onMarkAttendance(classItem.id);
          }
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.actionButtonText}>Take Attendance</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  classInfo: {
    flex: 1
  },
  className: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4
  },
  classDetails: {
    fontSize: 14,
    color: '#6B7280'
  },
  attendanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20
  },
  attendanceRate: {
    fontSize: 12,
    fontWeight: '600'
  },
  cardDetails: {
    marginBottom: 16
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  detailIcon: {
    fontSize: 14,
    marginRight: 6,
    color: '#2563EB'
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280'
  },
  actionButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  }
});

export default ClassCard;
