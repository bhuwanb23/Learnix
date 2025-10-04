import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  ScrollView, 
  TouchableOpacity,
  TextInput,
  RefreshControl
} from 'react-native';

export default function AttendanceClassList() {
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Simple mock data
  const classes = [
    {
      id: '1',
      className: 'Mathematics 101',
      subject: 'Mathematics',
      classCode: 'MATH101',
      totalStudents: 45,
      presentToday: 42,
      attendanceRate: 93.3,
      room: 'Room 201',
      color: '#3B82F6'
    },
    {
      id: '2',
      className: 'Physics 201',
      subject: 'Physics',
      classCode: 'PHYS201',
      totalStudents: 38,
      presentToday: 35,
      attendanceRate: 92.1,
      room: 'Lab 105',
      color: '#1D4ED8'
    },
    {
      id: '3',
      className: 'Chemistry 101',
      subject: 'Chemistry',
      classCode: 'CHEM101',
      totalStudents: 52,
      presentToday: 48,
      attendanceRate: 92.3,
      room: 'Room 305',
      color: '#2563EB'
    }
  ];

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const filteredClasses = classes.filter(cls => 
    cls.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cls.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cls.classCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Attendance Classes</Text>
        <Text style={styles.subtitle}>Manage your class attendance</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search classes..."
          placeholderTextColor="#64748b"
        />
      </View>

      {/* Classes List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={["#3B82F6"]}
            tintColor="#3B82F6"
          />
        }
      >
        {filteredClasses.map((classItem) => (
          <View key={classItem.id} style={[styles.classCard, { borderLeftColor: classItem.color }]}>
            <View style={styles.classHeader}>
              <View>
                <Text style={styles.className}>{classItem.className}</Text>
                <Text style={styles.classCode}>{classItem.classCode}</Text>
              </View>
              <View style={[styles.iconContainer, { backgroundColor: classItem.color }]}>
                <Text style={styles.icon}>📊</Text>
              </View>
            </View>
            
            <View style={styles.classDetails}>
              <Text style={styles.detailText}>Subject: {classItem.subject}</Text>
              <Text style={styles.detailText}>Room: {classItem.room}</Text>
              <Text style={styles.detailText}>Students: {classItem.presentToday}/{classItem.totalStudents}</Text>
              <Text style={styles.detailText}>Attendance: {classItem.attendanceRate}%</Text>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.markButton}>
                <Text style={styles.markButtonText}>Mark Attendance</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.reportsButton}>
                <Text style={styles.reportsButtonText}>View Reports</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 16,
    color: '#475569'
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#ffffff'
  },
  searchInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16
  },
  classCard: {
    backgroundColor: '#ffffff',
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  className: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4
  },
  classCode: {
    fontSize: 14,
    color: '#475569',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start'
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  icon: {
    fontSize: 20
  },
  classDetails: {
    marginBottom: 12
  },
  detailText: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 4
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12
  },
  markButton: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  markButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600'
  },
  reportsButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  reportsButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600'
  }
});
