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

import { TIMETABLE_STATS, EXAMS, ROOMS, INVIGILATORS, CONFLICTS } from './constants/timetableData';
import ExamDetail from './pages/exam_detail/exam_detail';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const STATUS_COLORS = {
  Scheduled: '#059669',
  Conflict: '#dc2626',
  Completed: '#0284c7',
};

export default function TimetableModule({ navigation }) {
  const [tab, setTab] = useState('exams');
  const [selectedExam, setSelectedExam] = useState(null);
  const [form, setForm] = useState({
    subject: '',
    code: '',
    date: '',
    time: '',
    room: '',
  });

  if (selectedExam) {
    return <ExamDetail exam={selectedExam} onBack={() => setSelectedExam(null)} />;
  }

  const handleSchedule = () => {
    if (!form.subject.trim() || !form.date.trim()) {
      Alert.alert('Missing Fields', 'Please enter the subject and exam date.');
      return;
    }
    Alert.alert(
      'Schedule Exam',
      `Schedule ${form.subject} (${form.date})? Room and invigilators will be auto-allocated.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Schedule',
          onPress: () => {
            setForm({ subject: '', code: '', date: '', time: '', room: '' });
            setTab('exams');
            Alert.alert('Exam Scheduled', `${form.subject} added to the timetable with 0 conflicts.`);
          },
        },
      ]
    );
  };

  const handleAutoGenerate = () => {
    Alert.alert(
      'Auto-Generate Timetable',
      'Generate an optimized exam timetable for Semester 4 finals?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Generate', onPress: () => Alert.alert('Done', 'Timetable generated with 0 conflicts.') },
      ]
    );
  };

  const handleResolveConflict = (conflict) => {
    Alert.alert(
      'Resolve Conflict',
      conflict.issue,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Auto-Fix', onPress: () => Alert.alert('Fixed', 'Conflict resolved — slot reassigned automatically.') },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Stats */}
      <View style={styles.statsRow}>
        {TIMETABLE_STATS.map((stat) => (
          <View key={stat.id} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: stat.color + '14' }]}>
              <Ionicons name={stat.icon} size={18} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {[
          { id: 'exams', label: 'Exams' },
          { id: 'rooms', label: 'Rooms' },
          { id: 'invigilators', label: 'Invigilators' },
          { id: 'conflicts', label: `Conflicts (${CONFLICTS.length})` },
        ].map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, tab === t.id && styles.activeTab]}
            onPress={() => setTab(t.id)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, tab === t.id && styles.activeTabText]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'exams' ? (
        <>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.generateBtn} onPress={handleAutoGenerate} activeOpacity={0.85}>
              <Ionicons name="sparkles" size={15} color="#FFFFFF" />
              <Text style={styles.generateBtnText}>Auto-Generate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={() => setTab('schedule')} activeOpacity={0.85}>
              <Ionicons name="add" size={15} color="#2563eb" />
              <Text style={styles.addBtnText}>Schedule Exam</Text>
            </TouchableOpacity>
          </View>

          {EXAMS.map((exam) => (
            <TouchableOpacity
              key={exam.id}
              style={styles.examCard}
              activeOpacity={0.8}
              onPress={() => setSelectedExam(exam)}
            >
              <View style={[styles.examIcon, { backgroundColor: exam.color + '14' }]}>
                <Ionicons name="create-outline" size={18} color={exam.color} />
              </View>
              <View style={styles.examInfo}>
                <Text style={styles.examSubject}>{exam.subject}</Text>
                <Text style={styles.examMeta}>{exam.code} • {exam.sem} • {exam.date}</Text>
                <Text style={styles.examTime}>{exam.time}</Text>
                <View style={styles.examChips}>
                  <View style={[styles.statusChip, { backgroundColor: STATUS_COLORS[exam.status] + '1A' }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLORS[exam.status] }]}>{exam.status}</Text>
                  </View>
                  <Text style={styles.examStudents}>{exam.students} students • {exam.invigilators} invigilators</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>
          ))}
        </>
      ) : null}

      {tab === 'rooms' ? (
        <>
          <Text style={styles.sectionLabel}>Room Allocation</Text>
          {ROOMS.map((room) => (
            <View key={room.id} style={styles.roomCard}>
              <View style={[styles.roomIcon, { backgroundColor: room.color + '14' }]}>
                <Ionicons name="business-outline" size={18} color={room.color} />
              </View>
              <View style={styles.roomInfo}>
                <Text style={styles.roomName}>{room.name}</Text>
                <Text style={styles.roomMeta}>Capacity {room.capacity}</Text>
              </View>
              <View style={[styles.roomStatusChip, { backgroundColor: (room.status === 'Allocated' ? '#2563eb' : '#64748b') + '1A' }]}>
                <Text style={[styles.roomStatusText, { color: room.status === 'Allocated' ? '#2563eb' : '#64748b' }]}>{room.status}</Text>
              </View>
            </View>
          ))}
        </>
      ) : null}

      {tab === 'invigilators' ? (
        <>
          <Text style={styles.sectionLabel}>Invigilation Duty</Text>
          {INVIGILATORS.map((inv) => (
            <View key={inv.id} style={styles.roomCard}>
              <View style={[styles.roomIcon, { backgroundColor: inv.color + '14' }]}>
                <Ionicons name="person-outline" size={18} color={inv.color} />
              </View>
              <View style={styles.roomInfo}>
                <Text style={styles.roomName}>{inv.name}</Text>
                <Text style={styles.roomMeta}>{inv.department} Department</Text>
              </View>
              <View style={styles.dutyBox}>
                <Text style={[styles.dutyValue, { color: inv.color }]}>{inv.exams}</Text>
                <Text style={styles.dutyLabel}>exams</Text>
              </View>
            </View>
          ))}
        </>
      ) : null}

      {tab === 'conflicts' ? (
        <>
          <Text style={styles.sectionLabel}>Conflict Check</Text>
          {CONFLICTS.map((conflict) => (
            <TouchableOpacity
              key={conflict.id}
              style={styles.conflictCard}
              activeOpacity={0.8}
              onPress={() => handleResolveConflict(conflict)}
            >
              <View style={[styles.conflictIcon, { backgroundColor: (conflict.severity === 'High' ? '#dc2626' : '#d97706') + '14' }]}>
                <Ionicons name="warning-outline" size={18} color={conflict.severity === 'High' ? '#dc2626' : '#d97706'} />
              </View>
              <View style={styles.conflictInfo}>
                <Text style={styles.conflictSubject}>{conflict.subject}</Text>
                <Text style={styles.conflictIssue}>{conflict.issue}</Text>
              </View>
              <View style={[styles.severityChip, { backgroundColor: (conflict.severity === 'High' ? '#dc2626' : '#d97706') + '1A' }]}>
                <Text style={[styles.severityText, { color: conflict.severity === 'High' ? '#dc2626' : '#d97706' }]}>{conflict.severity}</Text>
              </View>
            </TouchableOpacity>
          ))}
          <Text style={styles.conflictNote}>Tap a conflict to auto-fix the slot allocation.</Text>
        </>
      ) : null}

      {tab === 'schedule' ? (
        <>
          <Text style={styles.formHint}>Schedule a new exam. Rooms and invigilators are auto-allocated with conflict checking.</Text>

          <Text style={styles.fieldLabel}>Subject</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={form.subject}
              onChangeText={(v) => setForm((p) => ({ ...p, subject: v }))}
              placeholder="e.g. Data Structures"
              placeholderTextColor="#cbd5e1"
            />
          </View>

          <Text style={styles.fieldLabel}>Subject Code</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={form.code}
              onChangeText={(v) => setForm((p) => ({ ...p, code: v }))}
              placeholder="e.g. CS301"
              placeholderTextColor="#cbd5e1"
            />
          </View>

          <Text style={styles.fieldLabel}>Date</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={form.date}
              onChangeText={(v) => setForm((p) => ({ ...p, date: v }))}
              placeholder="e.g. Dec 20, 2026"
              placeholderTextColor="#cbd5e1"
            />
          </View>

          <Text style={styles.fieldLabel}>Time Slot</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={form.time}
              onChangeText={(v) => setForm((p) => ({ ...p, time: v }))}
              placeholder="e.g. 9:00 AM - 12:00 PM"
              placeholderTextColor="#cbd5e1"
            />
          </View>

          <Text style={styles.fieldLabel}>Preferred Room</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={form.room}
              onChangeText={(v) => setForm((p) => ({ ...p, room: v }))}
              placeholder="e.g. Block A • Rooms 101-104"
              placeholderTextColor="#cbd5e1"
            />
          </View>

          <TouchableOpacity style={styles.createBtn} onPress={handleSchedule} activeOpacity={0.85}>
            <Ionicons name="calendar" size={16} color="#FFFFFF" />
            <Text style={styles.createBtnText}>Schedule Exam</Text>
          </TouchableOpacity>
        </>
      ) : null}
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
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#eef2f7',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    fontFamily: 'Manrope-SemiBold',
  },
  activeTabText: {
    color: '#2563eb',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  generateBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 11,
  },
  generateBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Manrope-Bold',
  },
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    paddingVertical: 11,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
    fontFamily: 'Manrope-Bold',
  },
  examCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 10,
  },
  examIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  examInfo: {
    flex: 1,
  },
  examSubject: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  examMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  examTime: {
    fontSize: 11,
    color: '#475569',
    fontFamily: 'Manrope-Medium',
    marginTop: 1,
  },
  examChips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
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
  examStudents: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 10,
  },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 10,
  },
  roomIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  roomMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  roomStatusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roomStatusText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  dutyBox: {
    alignItems: 'center',
  },
  dutyValue: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  dutyLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
  },
  conflictCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 10,
  },
  conflictIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  conflictInfo: {
    flex: 1,
  },
  conflictSubject: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  conflictIssue: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  severityChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  conflictNote: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 4,
  },
  formHint: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    lineHeight: 18,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    fontFamily: 'Manrope-Bold',
    marginBottom: 6,
    marginTop: 4,
  },
  inputContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  input: {
    height: 44,
    fontSize: 14,
    color: '#0f172a',
    fontFamily: 'Manrope-Regular',
  },
  createBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  createBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Manrope-Bold',
  },
});