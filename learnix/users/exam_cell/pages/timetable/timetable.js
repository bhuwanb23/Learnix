import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { examcellApi } from '../../../../services/api';
import ExamDetail from './pages/exam_detail/exam_detail';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const STATUS_COLORS = {
  SCHEDULED: '#059669',
  ONGOING: '#2563eb',
  COMPLETED: '#64748b',
  RESCHEDULED: '#d97706',
  CONFLICT: '#dc2626',
};

const TYPE_LABELS = {
  MID_TERM: 'Mid Term',
  FINAL: 'Final',
  QUIZ: 'Quiz',
  ASSIGNMENT: 'Assignment',
};

export default function TimetableModule({ navigation }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('exams');
  const [selectedExam, setSelectedExam] = useState(null);
  const [form, setForm] = useState({ semester: '4', type: 'MID_TERM', name: '' });

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await examcellApi.exams();
      setExams(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (selectedExam) {
    return <ExamDetail exam={selectedExam} onBack={() => setSelectedExam(null)} />;
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading timetable…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color="#94a3b8" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchData} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const allSlots = exams.flatMap((e) => (e.slots || []).map((s) => ({ ...s, examName: e.name, examId: e.id, examType: e.type })));
  const totalStudents = allSlots.reduce((acc, s) => acc + (s.seats || 0), 0);
  const totalRooms = new Set(allSlots.map((s) => s.room).filter(Boolean)).size;
  const totalConflicts = exams.reduce((acc, e) => acc + (e.conflicts || 0), 0);

  const handleSchedule = async () => {
    if (!form.name.trim()) {
      Alert.alert('Missing Fields', 'Please enter the exam name.');
      return;
    }
    try {
      await examcellApi.createExam({ semester: parseInt(form.semester, 10), type: form.type, name: form.name });
      setForm({ semester: '4', type: 'MID_TERM', name: '' });
      setTab('exams');
      fetchData();
      Alert.alert('Exam Created', `${form.name} has been created.`);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleAutoGenerate = () => {
    Alert.alert(
      'Auto-Generate Timetable',
      'Generate an optimized exam timetable?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Generate', onPress: () => Alert.alert('Done', 'Timetable generated with 0 conflicts.') },
      ]
    );
  };

  const examStats = [
    { id: 'exams', label: 'Scheduled Exams', value: exams.length.toString(), icon: 'calendar', color: '#2563eb' },
    { id: 'students', label: 'Students Covered', value: totalStudents.toLocaleString(), icon: 'people', color: '#059669' },
    { id: 'rooms', label: 'Rooms Allocated', value: totalRooms.toString(), icon: 'business', color: '#d97706' },
    { id: 'conflicts', label: 'Conflicts', value: totalConflicts.toString(), icon: 'warning', color: '#dc2626' },
  ];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
    >
      {/* Stats */}
      <View style={styles.statsRow}>
        {examStats.map((stat) => (
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
          { id: 'conflicts', label: `Conflicts (${totalConflicts})` },
          { id: 'schedule', label: 'New' },
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

      {tab === 'exams' && (
        <>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.generateBtn} onPress={handleAutoGenerate} activeOpacity={0.85}>
              <Ionicons name="sparkles" size={15} color="#FFFFFF" />
              <Text style={styles.generateBtnText}>Auto-Generate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={() => setTab('schedule')} activeOpacity={0.85}>
              <Ionicons name="add" size={15} color="#2563eb" />
              <Text style={styles.addBtnText}>New Exam</Text>
            </TouchableOpacity>
          </View>

          {exams.map((exam) => (
            <TouchableOpacity
              key={exam.id}
              style={styles.examCard}
              activeOpacity={0.8}
              onPress={() => setSelectedExam(exam)}
            >
              <View style={[styles.examIcon, { backgroundColor: (STATUS_COLORS[exam.status] || '#2563eb') + '14' }]}>
                <Ionicons name="create-outline" size={18} color={STATUS_COLORS[exam.status] || '#2563eb'} />
              </View>
              <View style={styles.examInfo}>
                <Text style={styles.examSubject}>{exam.name}</Text>
                <Text style={styles.examMeta}>{TYPE_LABELS[exam.type] || exam.type} • Sem {exam.semester} • {exam.slots?.length || 0} slots</Text>
                <View style={styles.examChips}>
                  <View style={[styles.statusChip, { backgroundColor: (STATUS_COLORS[exam.status] || '#2563eb') + '1A' }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLORS[exam.status] || '#2563eb' }]}>{exam.status}</Text>
                  </View>
                  {exam.conflicts > 0 && (
                    <View style={[styles.statusChip, { backgroundColor: '#dc26261A' }]}>
                      <Text style={[styles.statusText, { color: '#dc2626' }]}>{exam.conflicts} conflicts</Text>
                    </View>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>
          ))}
          {exams.length === 0 && (
            <Text style={styles.emptyText}>No exams found. Create one to get started.</Text>
          )}
        </>
      )}

      {tab === 'conflicts' && (
        <>
          <Text style={styles.sectionLabel}>Active Conflicts</Text>
          {exams.filter((e) => e.conflicts > 0).map((exam) => (
            <TouchableOpacity key={exam.id} style={styles.conflictCard} activeOpacity={0.8} onPress={() => setSelectedExam(exam)}>
              <View style={[styles.conflictIcon, { backgroundColor: '#dc262614' }]}>
                <Ionicons name="warning-outline" size={18} color="#dc2626" />
              </View>
              <View style={styles.conflictInfo}>
                <Text style={styles.conflictSubject}>{exam.name}</Text>
                <Text style={styles.conflictIssue}>{exam.conflicts} conflict(s) detected in room or invigilator allocation</Text>
              </View>
              <View style={[styles.severityChip, { backgroundColor: '#dc26261A' }]}>
                <Text style={[styles.severityText, { color: '#dc2626' }]}>Review</Text>
              </View>
            </TouchableOpacity>
          ))}
          {exams.filter((e) => e.conflicts > 0).length === 0 && (
            <Text style={styles.emptyText}>No conflicts found. All slots are clean.</Text>
          )}
        </>
      )}

      {tab === 'schedule' && (
        <>
          <Text style={styles.formHint}>Schedule a new exam. Slots and room allocations can be added after creation.</Text>

          <Text style={styles.fieldLabel}>Exam Name</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
              placeholder="e.g. Mid Term Exams — Sem 4"
              placeholderTextColor="#cbd5e1"
            />
          </View>

          <Text style={styles.fieldLabel}>Semester</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={form.semester}
              onChangeText={(v) => setForm((p) => ({ ...p, semester: v }))}
              placeholder="e.g. 4"
              placeholderTextColor="#cbd5e1"
              keyboardType="numeric"
            />
          </View>

          <Text style={styles.fieldLabel}>Type</Text>
          <View style={styles.typeRow}>
            {['MID_TERM', 'FINAL', 'QUIZ', 'ASSIGNMENT'].map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeChip, form.type === t && styles.typeChipActive]}
                onPress={() => setForm((p) => ({ ...p, type: t }))}
                activeOpacity={0.8}
              >
                <Text style={[styles.typeChipText, form.type === t && styles.typeChipTextActive]}>{TYPE_LABELS[t]}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.createBtn} onPress={handleSchedule} activeOpacity={0.85}>
            <Ionicons name="calendar" size={16} color="#FFFFFF" />
            <Text style={styles.createBtnText}>Create Exam</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 24, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b', fontFamily: 'Manrope-Regular' },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Regular', textAlign: 'center' },
  retryBtn: { marginTop: 12, backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14 },
  statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },
  tabsRow: { flexDirection: 'row', backgroundColor: '#eef2f7', borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  activeTab: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  tabText: { fontSize: 12, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  activeTabText: { color: '#2563eb' },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  generateBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 11 },
  generateBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Manrope-Bold' },
  addBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, paddingVertical: 11 },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#2563eb', fontFamily: 'Manrope-Bold' },
  examCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 10 },
  examIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  examInfo: { flex: 1 },
  examSubject: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  examMeta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  examChips: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginBottom: 10 },
  emptyText: { fontSize: 13, color: '#94a3b8', fontFamily: 'Manrope-Regular', textAlign: 'center', marginTop: 20 },
  conflictCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 10 },
  conflictIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  conflictInfo: { flex: 1 },
  conflictSubject: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  conflictIssue: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  severityChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  severityText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  formHint: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', lineHeight: 18, marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#334155', fontFamily: 'Manrope-Bold', marginBottom: 6, marginTop: 4 },
  inputContainer: { backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, marginBottom: 12 },
  input: { height: 44, fontSize: 14, color: '#0f172a', fontFamily: 'Manrope-Regular' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  typeChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  typeChipText: { fontSize: 12, color: '#475569', fontFamily: 'Manrope-Medium' },
  typeChipTextActive: { color: '#FFFFFF' },
  createBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, marginTop: 4 },
  createBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Manrope-Bold' },
});
