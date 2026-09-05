import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ActionButton from '../../../../components/ui/ActionButton';
import SectionHeader from '../../../../components/ui/SectionHeader';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../../constants/theme';

const ASSIGNED_CLASSES = [
  { id: '1', name: 'CSE-A (Sem 5)', subject: 'Data Structures', schedule: 'Mon/Wed/Fri • 10:00 AM', students: 62 },
  { id: '2', name: 'CSE-B (Sem 5)', subject: 'Data Structures', schedule: 'Tue/Thu • 11:00 AM', students: 58 },
  { id: '3', name: 'CSE-A (Sem 3)', subject: 'Algorithms', schedule: 'Mon/Wed • 2:00 PM', students: 64 },
  { id: '4', name: 'CSE-B (Sem 3)', subject: 'Algorithms', schedule: 'Tue/Fri • 3:00 PM', students: 60 },
];

export default function TeacherDetail({ teacher, onBack, onEdit }) {
  const [activeSection, setActiveSection] = useState('classes');

  const handleMessage = () => {
    Alert.alert('Message Teacher', `Opening chat with ${teacher.name}...`);
  };

  const handleGenerateReport = () => {
    Alert.alert('Report Generated', `Performance report for ${teacher.name} downloaded.`);
  };

  const workloadPct = (teacher.workload / teacher.maxWorkload) * 100;
  const workloadColor = workloadPct >= 90 ? '#dc2626' : workloadPct >= 75 ? '#d97706' : '#059669';

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Header card */}
        <View style={styles.headerCard}>
          <View style={[styles.avatar, { backgroundColor: teacher.avatarColor + '14' }]}>
            <Text style={[styles.avatarText, { color: teacher.avatarColor }]}>
              {teacher.name.split(' ').map((w) => w[0]).join('')}
            </Text>
          </View>
          <Text style={styles.name}>{teacher.name}</Text>
          <Text style={styles.meta}>{teacher.designation} • {teacher.department}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.statusChip, { backgroundColor: teacher.status === 'Active' ? '#0596691A' : '#dc26261A' }]}>
              <Text style={[styles.statusText, { color: teacher.status === 'Active' ? '#059669' : '#dc2626' }]}>
                {teacher.status}
              </Text>
            </View>
            <View style={styles.statusChip}>
              <Text style={[styles.statusText, { color: '#2563eb' }]}>{teacher.subjects.length} Subjects</Text>
            </View>
          </View>
        </View>

        {/* Workload */}
        <View style={styles.workloadCard}>
          <View style={styles.workloadHeader}>
            <Text style={styles.workloadTitle}>Weekly Workload</Text>
            <Text style={[styles.workloadValue, { color: workloadColor }]}>
              {teacher.workload}/{teacher.maxWorkload} hrs
            </Text>
          </View>
          <View style={styles.workloadTrack}>
            <View style={[styles.workloadFill, { width: `${workloadPct}%`, backgroundColor: workloadColor }]} />
          </View>
          <Text style={styles.workloadNote}>
            {workloadPct >= 90 ? 'Near capacity — consider reassigning classes.' : 'Within acceptable limits.'}
          </Text>
        </View>

        {/* Section tabs */}
        <View style={styles.tabsRow}>
          {['classes', 'info', 'attendance'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeSection === tab && styles.activeTab]}
              onPress={() => setActiveSection(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeSection === tab && styles.activeTabText]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeSection === 'classes' ? (
          <>
            <SectionHeader title="Assigned Classes" actionLabel="Assign Class" actionIcon="add" onAction={onEdit} />
            {ASSIGNED_CLASSES.map((cls) => (
              <TouchableOpacity
                key={cls.id}
                style={styles.classCard}
                activeOpacity={0.8}
                onPress={() => Alert.alert('Class Details', `${cls.name} — ${cls.subject} (${cls.students} students)`)}
              >
                <View style={styles.classIcon}>
                  <Ionicons name="people" size={18} color="#2563eb" />
                </View>
                <View style={styles.classInfo}>
                  <Text style={styles.className}>{cls.name}</Text>
                  <Text style={styles.classSubject}>{cls.subject}</Text>
                  <Text style={styles.classSchedule}>{cls.schedule} • {cls.students} students</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
              </TouchableOpacity>
            ))}
          </>
        ) : null}

        {activeSection === 'info' ? (
          <>
            <SectionHeader title="Contact Information" />
            <View style={styles.infoCard}>
              {[
                { label: 'Email', value: teacher.email, icon: 'mail-outline' },
                { label: 'Phone', value: teacher.phone, icon: 'call-outline' },
                { label: 'Department', value: teacher.department, icon: 'business-outline' },
                { label: 'Designation', value: teacher.designation, icon: 'ribbon-outline' },
                { label: 'Subjects', value: teacher.subjects.join(', '), icon: 'book-outline' },
              ].map((row) => (
                <View key={row.label} style={styles.infoRow}>
                  <Ionicons name={row.icon} size={16} color="#2563eb" />
                  <Text style={styles.infoLabel}>{row.label}</Text>
                  <Text style={styles.infoValue}>{row.value}</Text>
                </View>
              ))}
            </View>
            <ActionButton label="Generate Performance Report" icon="download-outline" variant="secondary" onPress={handleGenerateReport} />
          </>
        ) : null}

        {activeSection === 'attendance' ? (
          <>
            <SectionHeader title="Monthly Attendance" />
            <View style={styles.attendanceCard}>
              {[
                { month: 'Jun', pct: 96 },
                { month: 'Jul', pct: 93 },
                { month: 'Aug', pct: 97 },
                { month: 'Sep', pct: 91 },
                { month: 'Oct', pct: 95 },
                { month: 'Nov', pct: 94 },
              ].map((m) => (
                <View key={m.month} style={styles.barColumn}>
                  <Text style={styles.barPct}>{m.pct}%</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { height: `${m.pct}%`, backgroundColor: m.pct >= 90 ? '#059669' : '#d97706' }]} />
                  </View>
                  <Text style={styles.barLabel}>{m.month}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.attendanceNote}>Average attendance: 94.3% — above department target of 90%.</Text>
          </>
        ) : null}
      </ScrollView>

      {/* Bottom actions */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={handleMessage} activeOpacity={0.8}>
          <Ionicons name="chatbubble-outline" size={18} color="#2563eb" />
          <Text style={styles.secondaryBtnText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.editBtn} onPress={onEdit} activeOpacity={0.8}>
          <Ionicons name="create-outline" size={18} color="#ffffff" />
          <Text style={styles.editBtnText}>Edit / Assign</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  avatarText: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  name: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  meta: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  statusChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: '#eef1f3',
  },
  statusText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: 'Manrope-SemiBold',
  },
  workloadCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  workloadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  workloadTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  workloadValue: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  workloadTrack: {
    height: 8,
    backgroundColor: '#eef1f3',
    borderRadius: 4,
    overflow: 'hidden',
  },
  workloadFill: {
    height: '100%',
    borderRadius: 4,
  },
  workloadNote: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: SPACING.sm,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.15)',
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
  },
  activeTab: {
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  tabText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#64748b',
    fontFamily: 'Manrope-SemiBold',
  },
  activeTabText: {
    color: '#2563eb',
  },
  classCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  classIcon: {
    width: 38,
    height: 38,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#2563eb1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  classSubject: {
    fontSize: 11,
    color: '#2563eb',
    fontFamily: 'Manrope-SemiBold',
    marginTop: 1,
  },
  classSchedule: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  infoLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginLeft: SPACING.sm,
    flex: 1,
  },
  infoValue: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
    flex: 1,
    textAlign: 'right',
  },
  attendanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barPct: {
    fontSize: 9,
    color: '#64748b',
    fontFamily: 'Manrope-Medium',
    marginBottom: 4,
  },
  barTrack: {
    width: 18,
    height: 100,
    backgroundColor: '#eef1f3',
    borderRadius: BORDER_RADIUS.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: BORDER_RADIUS.sm,
  },
  barLabel: {
    fontSize: 9,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 4,
  },
  attendanceNote: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginBottom: SPACING.md,
  },
  bottomBar: {
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#2563eb1A',
  },
  secondaryBtnText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: '#2563eb',
    fontFamily: 'Manrope-SemiBold',
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#2563eb',
  },
  editBtnText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: '#ffffff',
    fontFamily: 'Manrope-SemiBold',
  },
});