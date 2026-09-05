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

const SUBJECTS = [
  { id: '1', name: 'Data Structures', code: 'CS301', marks: 88, grade: 'A', attendance: 92 },
  { id: '2', name: 'Operating Systems', code: 'CS302', marks: 76, grade: 'B+', attendance: 88 },
  { id: '3', name: 'DBMS', code: 'CS303', marks: 91, grade: 'A', attendance: 95 },
  { id: '4', name: 'Computer Networks', code: 'CS304', marks: 69, grade: 'B', attendance: 81 },
];

export default function StudentDetail({ student, onBack, onEdit }) {
  const [activeSection, setActiveSection] = useState('overview');

  const handleMessage = () => {
    Alert.alert('Message Student', `Opening chat with ${student.name}...`);
  };

  const handleSuspend = () => {
    Alert.alert(
      'Suspend Student',
      `Are you sure you want to suspend ${student.name}? This will block login access.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Suspend', style: 'destructive', onPress: () => Alert.alert('Suspended', 'Student access has been revoked.') },
      ]
    );
  };

  const handleGenerateReport = () => {
    Alert.alert('Report Generated', `Student report for ${student.name} downloaded.`);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Header card */}
        <View style={styles.headerCard}>
          <View style={[styles.avatar, { backgroundColor: student.avatarColor + '1A' }]}>
            <Text style={[styles.avatarText, { color: student.avatarColor }]}>
              {student.name.split(' ').map((w) => w[0]).join('')}
            </Text>
          </View>
          <Text style={styles.name}>{student.name}</Text>
          <Text style={styles.meta}>{student.rollNo} • {student.program}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.statusChip, { backgroundColor: student.status === 'Active' ? '#0596691A' : '#d977061A' }]}>
              <Text style={[styles.statusText, { color: student.status === 'Active' ? '#059669' : '#d97706' }]}>
                {student.status}
              </Text>
            </View>
            <View style={styles.statusChip}>
              <Text style={[styles.statusText, { color: '#7c3aed' }]}>{student.batch}</Text>
            </View>
          </View>
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{student.attendance}%</Text>
            <Text style={styles.statLabel}>Attendance</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{student.cgpa}</Text>
            <Text style={styles.statLabel}>CGPA</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{SUBJECTS.filter((s) => s.marks >= 75).length}/{SUBJECTS.length}</Text>
            <Text style={styles.statLabel}>Distinctions</Text>
          </View>
        </View>

        {/* Section tabs */}
        <View style={styles.tabsRow}>
          {['overview', 'academics', 'fees'].map((tab) => (
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

        {activeSection === 'overview' ? (
          <>
            <SectionHeader title="Personal Information" />
            <View style={styles.infoCard}>
              {[
                { label: 'Email', value: student.email, icon: 'mail-outline' },
                { label: 'Phone', value: student.phone, icon: 'call-outline' },
                { label: 'Department', value: student.department, icon: 'business-outline' },
                { label: 'Semester', value: student.semester, icon: 'school-outline' },
              ].map((row) => (
                <View key={row.label} style={styles.infoRow}>
                  <Ionicons name={row.icon} size={16} color="#7c3aed" />
                  <Text style={styles.infoLabel}>{row.label}</Text>
                  <Text style={styles.infoValue}>{row.value}</Text>
                </View>
              ))}
            </View>

            <SectionHeader title="Attendance Trend" />
            <View style={styles.trendCard}>
              {[92, 88, 95, 81, 94, 97].map((val, i) => (
                <View key={i} style={styles.barColumn}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${val}%`,
                          backgroundColor: val >= 90 ? '#059669' : val >= 75 ? '#d97706' : '#dc2626',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel}>W{i + 1}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {activeSection === 'academics' ? (
          <>
            <SectionHeader title="Subject Performance" />
            {SUBJECTS.map((subject) => (
              <View key={subject.id} style={styles.subjectCard}>
                <View style={styles.subjectInfo}>
                  <Text style={styles.subjectName}>{subject.name}</Text>
                  <Text style={styles.subjectCode}>{subject.code} • Attendance {subject.attendance}%</Text>
                </View>
                <View style={styles.subjectRight}>
                  <Text style={[styles.gradeText, { color: subject.marks >= 75 ? '#059669' : subject.marks >= 60 ? '#d97706' : '#dc2626' }]}>
                    {subject.grade}
                  </Text>
                  <Text style={styles.marksText}>{subject.marks}/100</Text>
                </View>
              </View>
            ))}
            <ActionButton label="Generate Academic Report" icon="download-outline" variant="secondary" onPress={handleGenerateReport} />
          </>
        ) : null}

        {activeSection === 'fees' ? (
          <>
            <SectionHeader title="Fee Status" />
            <View style={styles.feeCard}>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Total Due (Sem 7)</Text>
                <Text style={styles.feeValue}>₹1,18,000</Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Paid</Text>
                <Text style={[styles.feeValue, { color: '#059669' }]}>₹1,00,000</Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Outstanding</Text>
                <Text style={[styles.feeValue, { color: '#dc2626' }]}>₹18,000</Text>
              </View>
              <View style={styles.feeProgressTrack}>
                <View style={[styles.feeProgressFill, { width: '85%' }]} />
              </View>
              <Text style={styles.feeNote}>85% of semester fees cleared. Next due: Nov 15, 2026.</Text>
            </View>
            <ActionButton label="View Fee Receipts" icon="receipt-outline" variant="secondary" onPress={() => Alert.alert('Receipts', 'Showing all fee receipts for this student.')} />
          </>
        ) : null}
      </ScrollView>

      {/* Bottom actions */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={handleMessage} activeOpacity={0.8}>
          <Ionicons name="chatbubble-outline" size={18} color="#7c3aed" />
          <Text style={styles.secondaryBtnText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.editBtn} onPress={onEdit} activeOpacity={0.8}>
          <Ionicons name="create-outline" size={18} color="#ffffff" />
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.suspendBtn} onPress={handleSuspend} activeOpacity={0.8}>
          <Ionicons name="ban-outline" size={18} color="#dc2626" />
        </TouchableOpacity>
      </View>
    </View>
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
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
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
    backgroundColor: '#f1f5f9',
  },
  statusText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: 'Manrope-SemiBold',
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  statValue: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: BORDER_RADIUS.xl,
    padding: 4,
    marginBottom: SPACING.md,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
  },
  activeTab: {
    backgroundColor: '#ffffff',
  },
  tabText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#64748b',
    fontFamily: 'Manrope-SemiBold',
  },
  activeTabText: {
    color: '#7c3aed',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
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
  },
  trendCard: {
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: 16,
    height: 80,
    backgroundColor: '#f1f5f9',
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
  subjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  subjectInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  subjectCode: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  subjectRight: {
    alignItems: 'flex-end',
  },
  gradeText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  marksText: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
  },
  feeCard: {
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  feeLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
  },
  feeValue: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  feeProgressTrack: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    marginTop: SPACING.sm,
    overflow: 'hidden',
  },
  feeProgressFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 3,
  },
  feeNote: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: SPACING.sm,
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
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: '#7c3aed1A',
  },
  secondaryBtnText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: '#7c3aed',
    fontFamily: 'Manrope-SemiBold',
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: '#7c3aed',
  },
  editBtnText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: '#ffffff',
    fontFamily: 'Manrope-SemiBold',
  },
  suspendBtn: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: '#fef2f2',
  },
});