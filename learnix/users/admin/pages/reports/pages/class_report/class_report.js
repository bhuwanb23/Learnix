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

const SUBJECT_RESULTS = [
  { id: '1', name: 'Data Structures', avg: 82, passRate: 94, color: '#7c3aed' },
  { id: '2', name: 'Operating Systems', avg: 76, passRate: 89, color: '#059669' },
  { id: '3', name: 'DBMS', avg: 84, passRate: 96, color: '#d97706' },
  { id: '4', name: 'Computer Networks', avg: 71, passRate: 85, color: '#0284c7' },
];

export default function ClassReport({ classReport, onBack }) {
  const [tab, setTab] = useState('overview');

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#7c3aed" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{classReport.name}</Text>
            <Text style={styles.headerSubtitle}>Academic Report 2025-26</Text>
          </View>
        </View>

        {/* Overview stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{classReport.attendance}%</Text>
            <Text style={styles.statLabel}>Attendance</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{classReport.passRate}%</Text>
            <Text style={styles.statLabel}>Pass Rate</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{classReport.avgCgpa}</Text>
            <Text style={styles.statLabel}>Avg CGPA</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          {['overview', 'subjects', 'students'].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.activeTab]}
              onPress={() => setTab(t)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, tab === t && styles.activeTabText]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'overview' ? (
          <>
            <SectionHeader title="Class Summary" />
            <View style={styles.summaryCard}>
              {[
                { label: 'Class Teacher', value: classReport.teacher },
                { label: 'Total Students', value: String(classReport.students) },
                { label: 'Attendance Target', value: '90% (met)' },
                { label: 'At-Risk Students', value: '4' },
                { label: 'Distinctions (9+ CGPA)', value: '8' },
              ].map((row) => (
                <View key={row.label} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{row.label}</Text>
                  <Text style={styles.summaryValue}>{row.value}</Text>
                </View>
              ))}
            </View>

            <SectionHeader title="Attendance Trend" />
            <View style={styles.trendCard}>
              {[96, 94, 97, 93, 95, 91, 94].map((val, i) => (
                <View key={i} style={styles.barColumn}>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { height: `${val}%`, backgroundColor: val >= 90 ? '#059669' : '#d97706' }]} />
                  </View>
                  <Text style={styles.barLabel}>{['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'][i]}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {tab === 'subjects' ? (
          <>
            <SectionHeader title="Subject Performance" />
            {SUBJECT_RESULTS.map((subject) => (
              <View key={subject.id} style={styles.subjectCard}>
                <View style={styles.subjectHeader}>
                  <Text style={styles.subjectName}>{subject.name}</Text>
                  <Text style={[styles.subjectPass, { color: subject.passRate >= 90 ? '#059669' : '#d97706' }]}>
                    {subject.passRate}% pass
                  </Text>
                </View>
                <View style={styles.subjectTrack}>
                  <View style={[styles.subjectFill, { width: `${subject.avg}%`, backgroundColor: subject.color }]} />
                </View>
                <Text style={styles.subjectAvg}>Class average: {subject.avg}/100</Text>
              </View>
            ))}
          </>
        ) : null}

        {tab === 'students' ? (
          <>
            <SectionHeader title="Top Students" />
            {[
              { name: 'Ananya Reddy', cgpa: 9.4, rank: 1 },
              { name: 'Aarav Mehta', cgpa: 9.1, rank: 2 },
              { name: 'Kabir Joshi', cgpa: 8.9, rank: 3 },
              { name: 'Meghna Das', cgpa: 8.7, rank: 4 },
              { name: 'Rohan Gupta', cgpa: 8.5, rank: 5 },
            ].map((student) => (
              <View key={student.name} style={styles.studentRow}>
                <View style={[styles.rankCircle, { backgroundColor: student.rank <= 3 ? '#fef3c7' : '#f1f5f9' }]}>
                  <Text style={[styles.rankText, { color: student.rank <= 3 ? '#d97706' : '#64748b' }]}>#{student.rank}</Text>
                </View>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{student.name}</Text>
                  <Text style={styles.studentMeta}>Roll: CSE-21-0{student.rank}</Text>
                </View>
                <Text style={styles.studentCgpa}>{student.cgpa}</Text>
              </View>
            ))}
            <ActionButton
              label="Export Full Class Report"
              icon="download-outline"
              variant="secondary"
              onPress={() => Alert.alert('Exported', `${classReport.name} report downloaded as PDF.`)}
            />
          </>
        ) : null}
      </ScrollView>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7c3aed1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 2,
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
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-SemiBold',
  },
  activeTabText: {
    color: '#7c3aed',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  summaryLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
  },
  summaryValue: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
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
    height: 160,
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
    width: 18,
    height: 100,
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
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  subjectName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  subjectPass: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: 'Manrope-SemiBold',
  },
  subjectTrack: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  subjectFill: {
    height: '100%',
    borderRadius: 4,
  },
  subjectAvg: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: SPACING.sm,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  rankCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  rankText: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  studentMeta: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
  },
  studentCgpa: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#7c3aed',
    fontFamily: 'PlusJakartaSans-Bold',
  },
});