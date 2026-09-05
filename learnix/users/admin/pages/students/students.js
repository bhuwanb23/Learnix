import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { STUDENTS, DEPARTMENT_FILTERS, BATCHES, PENDING_APPROVALS } from './constants/studentsData';

import SearchBar from '../../components/ui/SearchBar';
import FilterChips from '../../components/ui/FilterChips';
import StatCard from '../../components/ui/StatCard';
import SectionHeader from '../../components/ui/SectionHeader';
import EmptyState from '../../components/ui/EmptyState';

import StudentDetail from './pages/student_detail/student_detail';
import AddStudent from './pages/add_student/add_student';
import Batches from './pages/batches/batches';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

export default function StudentsModule({ navigation }) {
  const [screen, setScreen] = useState('list');
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const filteredStudents = useMemo(() => {
    return STUDENTS.filter((s) => {
      const matchesDept = department === 'all' || s.department === department;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.rollNo.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q);
      return matchesDept && matchesSearch;
    });
  }, [search, department]);

  const handleStudentPress = (student) => {
    setSelectedStudent(student);
    setScreen('detail');
  };

  const handleApprove = (id) => {
    // Approve pending enrollment
    navigation.openModule('Notifications');
  };

  if (screen === 'detail' && selectedStudent) {
    return (
      <StudentDetail
        student={selectedStudent}
        onBack={() => setScreen('list')}
        onEdit={() => setScreen('add')}
      />
    );
  }

  if (screen === 'add') {
    return (
      <AddStudent
        student={selectedStudent}
        onBack={() => setScreen(selectedStudent ? 'detail' : 'list')}
        onSave={() => {
          setSelectedStudent(null);
          setScreen('list');
        }}
      />
    );
  }

  if (screen === 'batches') {
    return <Batches onBack={() => setScreen('list')} />;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Stats */}
      <View style={styles.statsRow}>
        <StatCard
          icon="people"
          value="1,234"
          label="Total Students"
          color="#7c3aed"
          onPress={() => setScreen('batches')}
        />
        <StatCard
          icon="checkmark-done"
          value="94.2%"
          label="Avg Attendance"
          color="#059669"
        />
        <StatCard
          icon="hourglass"
          value="3"
          label="Pending Approvals"
          color="#d97706"
        />
        <StatCard
          icon="trending-up"
          value="8.1"
          label="Avg CGPA"
          color="#0284c7"
        />
      </View>

      {/* Pending approvals */}
      {PENDING_APPROVALS.length > 0 ? (
        <View style={styles.approvalsCard}>
          <SectionHeader title="Pending Enrollments" actionLabel="Review all" onAction={() => navigation.openModule('Notifications')} />
          {PENDING_APPROVALS.map((p) => (
            <View key={p.id} style={styles.approvalRow}>
              <View style={styles.approvalAvatar}>
                <Text style={styles.approvalInitial}>{p.name.charAt(0)}</Text>
              </View>
              <View style={styles.approvalContent}>
                <Text style={styles.approvalName}>{p.name}</Text>
                <Text style={styles.approvalMeta}>{p.program} • {p.rollNo}</Text>
                <Text style={styles.approvalTime}>{p.appliedAt}</Text>
              </View>
              <View style={styles.approvalActions}>
                <TouchableOpacity
                  style={[styles.approveBtn, styles.approvePrimary]}
                  onPress={() => handleApprove(p.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark" size={14} color="#ffffff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.approveBtn, styles.approveReject]}
                  onPress={() => handleApprove(p.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={14} color="#dc2626" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {/* Search + Filter */}
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search by name, roll no, email..." />
      <FilterChips options={DEPARTMENT_FILTERS} selected={department} onSelect={setDepartment} />

      {/* Student list */}
      <SectionHeader
        title={`Students (${filteredStudents.length})`}
        actionLabel="Add Student"
        actionIcon="add"
        onAction={() => {
          setSelectedStudent(null);
          setScreen('add');
        }}
      />

      {filteredStudents.length === 0 ? (
        <EmptyState icon="people-outline" title="No students found" message="Try a different search or filter." />
      ) : (
        filteredStudents.map((student) => (
          <TouchableOpacity
            key={student.id}
            style={styles.studentCard}
            onPress={() => handleStudentPress(student)}
            activeOpacity={0.8}
          >
            <View style={[styles.avatar, { backgroundColor: student.avatarColor + '1A' }]}>
              <Text style={[styles.avatarText, { color: student.avatarColor }]}>
                {student.name.split(' ').map((w) => w[0]).join('')}
              </Text>
            </View>
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>{student.name}</Text>
              <Text style={styles.studentMeta}>{student.rollNo} • {student.program}</Text>
              <View style={styles.chipRow}>
                <View style={[styles.statusChip, { backgroundColor: student.status === 'Active' ? '#0596691A' : '#d977061A' }]}>
                  <Text style={[styles.statusText, { color: student.status === 'Active' ? '#059669' : '#d97706' }]}>
                    {student.status}
                  </Text>
                </View>
                <Text style={styles.cgpaText}>CGPA {student.cgpa}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  approvalsCard: {
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  approvalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  approvalAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#7c3aed1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  approvalInitial: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#7c3aed',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  approvalContent: {
    flex: 1,
  },
  approvalName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  approvalMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
  },
  approvalTime: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
  },
  approvalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  approveBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approvePrimary: {
    backgroundColor: '#059669',
  },
  approveReject: {
    backgroundColor: '#fef2f2',
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  studentInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  studentName: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  studentMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: 4,
  },
  statusChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: 'Manrope-SemiBold',
  },
  cgpaText: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
  },
});