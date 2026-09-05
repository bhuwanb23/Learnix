import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { TEACHERS, TEACHER_DEPARTMENTS, LEAVE_REQUESTS } from './constants/teachersData';

import SearchBar from '../../components/ui/SearchBar';
import FilterChips from '../../components/ui/FilterChips';
import StatCard from '../../components/ui/StatCard';
import SectionHeader from '../../components/ui/SectionHeader';
import EmptyState from '../../components/ui/EmptyState';

import TeacherDetail from './pages/teacher_detail/teacher_detail';
import AddTeacher from './pages/add_teacher/add_teacher';

export default function TeachersModule({ navigation }) {
  const [screen, setScreen] = useState('list');
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('all');
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  const filteredTeachers = useMemo(() => {
    return TEACHERS.filter((t) => {
      const matchesDept = department === 'all' || t.department === department;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.department.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q);
      return matchesDept && matchesSearch;
    });
  }, [search, department]);

  const handleLeaveAction = (id, action) => {
    const request = LEAVE_REQUESTS.find((r) => r.id === id);
    Alert.alert(
      `${action} Leave Request`,
      `${action === 'Approve' ? 'Approve' : 'Reject'} ${request.teacherName}'s ${request.type} (${request.days} days)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action,
          onPress: () => Alert.alert('Done', `Leave request ${action.toLowerCase()}d successfully.`),
        },
      ]
    );
  };

  if (screen === 'detail' && selectedTeacher) {
    return (
      <TeacherDetail
        teacher={selectedTeacher}
        onBack={() => setScreen('list')}
        onEdit={() => setScreen('add')}
      />
    );
  }

  if (screen === 'add') {
    return (
      <AddTeacher
        teacher={selectedTeacher}
        onBack={() => setScreen(selectedTeacher ? 'detail' : 'list')}
        onSave={() => {
          setSelectedTeacher(null);
          setScreen('list');
        }}
      />
    );
  }

  const pendingLeaves = LEAVE_REQUESTS.filter((r) => r.status === 'Pending').length;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Stats */}
      <View style={styles.statsRow}>
        <StatCard icon="school" value="89" label="Total Teachers" color="#2563eb" />
        <StatCard icon="people" value="12" label="Departments" color="#059669" />
        <StatCard icon="briefcase" value="18.4" label="Avg Hours/Wk" color="#d97706" />
        <StatCard icon="alarm" value="2" label="On Leave" color="#dc2626" />
      </View>

      {/* Leave requests */}
      <View style={styles.block}>
        <SectionHeader
          title="Leave Requests"
          subtitle={`${pendingLeaves} awaiting approval`}
          actionLabel="Manage"
          actionIcon="time-outline"
          onAction={() => Alert.alert('Leave Requests', 'All pending leave requests are shown below.')}
        />
        {LEAVE_REQUESTS.map((request) => (
          <View key={request.id} style={styles.leaveCard}>
            <View style={[styles.leaveAvatar, { backgroundColor: request.avatarColor + '14' }]}>
              <Text style={[styles.leaveInitial, { color: request.avatarColor }]}>{request.teacherName.charAt(0)}</Text>
            </View>
            <View style={styles.leaveInfo}>
              <Text style={styles.leaveName}>{request.teacherName}</Text>
              <Text style={styles.leaveMeta}>{request.type} • {request.from} → {request.to}</Text>
              <Text style={styles.leaveReason} numberOfLines={1}>{request.reason}</Text>
            </View>
            {request.status === 'Pending' ? (
              <View style={styles.leaveActions}>
                <TouchableOpacity
                  style={[styles.leaveBtn, styles.approveBtn]}
                  onPress={() => handleLeaveAction(request.id, 'Approve')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark" size={14} color="#ffffff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.leaveBtn, styles.rejectBtn]}
                  onPress={() => handleLeaveAction(request.id, 'Reject')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={14} color="#dc2626" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.statusChip, { backgroundColor: '#05966914' }]}>
                <Text style={[styles.statusText, { color: '#059669' }]}>{request.status}</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Search + Filter */}
      <View style={styles.block}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search teachers by name, department..." />
        <FilterChips options={TEACHER_DEPARTMENTS} selected={department} onSelect={setDepartment} />

        <SectionHeader
          title="Faculty"
          subtitle={`${filteredTeachers.length} of ${TEACHERS.length} shown`}
          actionLabel="Add Teacher"
          actionIcon="add"
          onAction={() => {
            setSelectedTeacher(null);
            setScreen('add');
          }}
        />

        {filteredTeachers.length === 0 ? (
          <EmptyState icon="school-outline" title="No teachers found" message="Try a different search or filter." />
        ) : (
          filteredTeachers.map((teacher) => (
            <TouchableOpacity
              key={teacher.id}
              style={styles.teacherCard}
              onPress={() => {
                setSelectedTeacher(teacher);
                setScreen('detail');
              }}
              activeOpacity={0.85}
            >
              <View style={[styles.avatar, { backgroundColor: teacher.avatarColor + '14' }]}>
                <Text style={[styles.avatarText, { color: teacher.avatarColor }]}>
                  {teacher.name.split(' ').map((w) => w[0]).join('')}
                </Text>
              </View>
              <View style={styles.teacherInfo}>
                <Text style={styles.teacherName}>{teacher.name}</Text>
                <Text style={styles.teacherMeta}>{teacher.designation} • {teacher.department}</Text>
                <View style={styles.chipRow}>
                  <View style={[styles.statusChip, { backgroundColor: teacher.status === 'Active' ? '#05966914' : '#dc262614' }]}>
                    <Text style={[styles.statusText, { color: teacher.status === 'Active' ? '#059669' : '#dc2626' }]}>
                      {teacher.status}
                    </Text>
                  </View>
                  <Text style={styles.workloadText}>{teacher.workload}/{teacher.maxWorkload} hrs</Text>
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
  leaveCard: {
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
  leaveAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  leaveInitial: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  leaveInfo: {
    flex: 1,
    marginRight: 10,
  },
  leaveName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  leaveMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
  },
  leaveReason: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
  },
  leaveActions: {
    flexDirection: 'row',
    gap: 10,
  },
  leaveBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveBtn: {
    backgroundColor: '#059669',
  },
  rejectBtn: {
    backgroundColor: '#fef2f2',
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  teacherCard: {
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
  teacherInfo: {
    flex: 1,
    marginRight: 10,
  },
  teacherName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  teacherMeta: {
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
  workloadText: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
  },
});