import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { STUDENT_STATS, STUDENTS, BRANCH_FILTERS, STATUS_FILTERS } from './constants/studentsData';
import StudentDetail from './pages/student_detail/student_detail';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const STATUS_COLORS = {
  Placed: '#0284c7',
  'In Process': '#d97706',
  Eligible: '#059669',
};

export default function StudentsModule({ navigation }) {
  const [branchFilter, setBranchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  if (selectedStudent) {
    return <StudentDetail student={selectedStudent} onBack={() => setSelectedStudent(null)} />;
  }

  const filteredStudents = STUDENTS.filter((s) => {
    if (branchFilter !== 'all' && s.branch !== branchFilter) return false;
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.rollNo.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleShortlist = (student) => {
    Alert.alert(
      'Shortlist Student',
      `Shortlist ${student.name} (${student.rollNo}) for an upcoming drive?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Shortlist', onPress: () => Alert.alert('Shortlisted', `${student.name} added to the candidate pool.`) },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Stats */}
      <View style={styles.statsRow}>
        {STUDENT_STATS.map((stat) => (
          <View key={stat.id} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: stat.color + '14' }]}>
              <Ionicons name={stat.icon} size={18} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={16} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or roll no"
          placeholderTextColor="#94a3b8"
        />
      </View>

      {/* Branch filters */}
      <View style={styles.filterRow}>
        {BRANCH_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, branchFilter === f.value && styles.filterChipActive]}
            onPress={() => setBranchFilter(f.value)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, branchFilter === f.value && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Status filters */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, statusFilter === f.value && styles.filterChipActive]}
            onPress={() => setStatusFilter(f.value)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, statusFilter === f.value && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.listLabel}>{filteredStudents.length} students</Text>

      {filteredStudents.map((student) => (
        <TouchableOpacity
          key={student.id}
          style={styles.studentCard}
          activeOpacity={0.8}
          onPress={() => setSelectedStudent(student)}
        >
          <View style={[styles.studentAvatar, { backgroundColor: student.avatarColor + '14' }]}>
            <Text style={[styles.studentInitial, { color: student.avatarColor }]}>
              {student.name.split(' ').map((w) => w[0]).join('')}
            </Text>
          </View>
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{student.name}</Text>
            <Text style={styles.studentMeta}>{student.rollNo} • {student.branch} • {student.year} Year</Text>
            <View style={styles.studentChips}>
              <View style={[styles.cgpaChip, { backgroundColor: '#eff6ff' }]}>
                <Text style={[styles.cgpaText, { color: '#2563eb' }]}>CGPA {student.cgpa}</Text>
              </View>
              <View style={[styles.statusChip, { backgroundColor: STATUS_COLORS[student.status] + '1A' }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[student.status] }]}>{student.status}</Text>
              </View>
            </View>
          </View>
          <View style={styles.studentRight}>
            <Text style={styles.appliedText}>{student.applied} applied</Text>
            <TouchableOpacity
              style={styles.shortlistBtn}
              onPress={() => handleShortlist(student)}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-done" size={16} color="#2563eb" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Medium',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: '#0f172a',
    fontFamily: 'Manrope-Regular',
    marginLeft: 8,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Manrope-Medium',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: 'Manrope-Medium',
    marginBottom: 10,
    marginTop: 2,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 10,
  },
  studentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  studentInitial: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  studentMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  studentChips: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  cgpaChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cgpaText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  studentRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  appliedText: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
  },
  shortlistBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
});