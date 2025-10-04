import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { getStatusColor, getStatusIcon } from '../constants/attendanceData';

const StudentList = ({ 
  students, 
  onStudentStatusChange 
}) => {
  const handleStatusChange = (studentId, newStatus) => {
    onStudentStatusChange(studentId, newStatus);
  };

  const renderStudentItem = (student) => {
    const statusColors = getStatusColor(student.status);
    const statusIcon = getStatusIcon(student.status);

    return (
      <View key={student.id} style={styles.studentItem}>
        <View style={styles.studentContent}>
          <View style={styles.studentLeft}>
            <Image 
              source={{ uri: student.avatar }} 
              style={styles.studentAvatar}
            />
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>{student.name}</Text>
              <Text style={styles.studentRoll}>Roll: {student.rollNumber}</Text>
            </View>
          </View>
          
          <View style={styles.studentActions}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                student.status === 'present' ? styles.presentButtonActive : styles.presentButtonInactive
              ]}
              onPress={() => handleStatusChange(student.id, 'present')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.actionButtonIcon,
                student.status === 'present' ? styles.presentIconActive : styles.presentIconInactive
              ]}>
                ✓
              </Text>
              <Text style={[
                styles.actionButtonText,
                student.status === 'present' ? styles.presentTextActive : styles.presentTextInactive
              ]}>
                Present
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.actionButton,
                student.status === 'absent' ? styles.absentButtonActive : styles.absentButtonInactive
              ]}
              onPress={() => handleStatusChange(student.id, 'absent')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.actionButtonIcon,
                student.status === 'absent' ? styles.absentIconActive : styles.absentIconInactive
              ]}>
                ✕
              </Text>
              <Text style={[
                styles.actionButtonText,
                student.status === 'absent' ? styles.absentTextActive : styles.absentTextInactive
              ]}>
                Absent
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Student List</Text>
      <View style={styles.studentsList}>
        {students.map(renderStudentItem)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 80 // Space for bottom action bar
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16
  },
  studentsList: {
    gap: 12
  },
  studentItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  studentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  studentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12
  },
  studentInfo: {
    flex: 1
  },
  studentName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2
  },
  studentRoll: {
    fontSize: 14,
    color: '#6B7280'
  },
  studentActions: {
    flexDirection: 'row',
    gap: 8
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1
  },
  // Present button styles
  presentButtonActive: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981'
  },
  presentButtonInactive: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB'
  },
  presentIconActive: {
    color: '#059669',
    marginRight: 4
  },
  presentIconInactive: {
    color: '#6B7280',
    marginRight: 4
  },
  presentTextActive: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '500'
  },
  presentTextInactive: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500'
  },
  // Absent button styles
  absentButtonActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444'
  },
  absentButtonInactive: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB'
  },
  absentIconActive: {
    color: '#DC2626',
    marginRight: 4
  },
  absentIconInactive: {
    color: '#6B7280',
    marginRight: 4
  },
  absentTextActive: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500'
  },
  absentTextInactive: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500'
  }
});

export default StudentList;
