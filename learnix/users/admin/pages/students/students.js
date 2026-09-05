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
          color="#2563eb"
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
        <View style={styles.block}>
          <SectionHeader title="Pending Enrollments" subtitle="Approve or reject new student applications" actionLabel="Review all" onAction={() => navigation.openModule('Notifications')} />
          <View style={styles.approvalsCard}>
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
        </View>
      ) : null}

      {/* Search + Filter */}
      <View style={styles.block}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search by name, roll no, email..." />
        <FilterChips options={DEPARTMENT_FILTERS} selected={department} onSelect={setDepartment} />

        <SectionHeader
          title="Students"
          subtitle={`${filteredStudents.length} of ${STUDENTS.length} shown`}
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
              activeOpacity={0.85}
            >
              <View style={[styles.avatar, { backgroundColor: student.avatarColor + '14' }]}>
                <Text style={[styles.avatarText, { color: student.avatarColor }]}>
                  {student.name.split(' ').map((w) => w[0]).join('')}
                </Text>
              </View>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.studentMeta}>{student.rollNo} • {student.program}</Text>
                <View style={styles.chipRow}>
                  <View style={[styles.statusChip, { backgroundColor: student.status === 'Active' ? '#05966914' : '#d9770614' }]}>
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
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  block: {
    marginTop: 24,
  },
  approvalsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  approvalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(171, 173, 175, 0.08)',
  },
  approvalAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb14',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  approvalInitial: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2563eb',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  approvalContent: {
    flex: 1,
  },
  approvalName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: 'PlusJakartaSans-Bold',
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
    gap: 10,
  },
  approveBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  studentInfo: {
    flex: 1,
    marginRight: 10,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: 'PlusJakartaSans-Bold',
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
    gap: 10,
    marginTop: 4,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  cgpaText: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
  },
});