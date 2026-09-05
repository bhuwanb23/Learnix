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

import { ATTENDANCE_STATS, CLASS_ATTENDANCE, RECENT_ABSENT } from './constants/attendanceData';

import StatCard from '../../components/ui/StatCard';
import SectionHeader from '../../components/ui/SectionHeader';
import ActionButton from '../../components/ui/ActionButton';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'classes', label: 'Classes' },
  { id: 'absent', label: 'Absentees' },
];

export default function AttendanceModule({ navigation }) {
  const [tab, setTab] = useState('today');

  const handleMarkAttendance = () => {
    Alert.alert('Mark Attendance', 'Bulk-mark attendance for all classes of today.');
  };

  const handleSendNotice = (student) => {
    Alert.alert(
      'Send Attendance Notice',
      `Send a warning notice to ${student.name} (${student.daysAbsent} days absent)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', onPress: () => Alert.alert('Sent', 'Notice sent to student and guardian via SMS & email.') },
      ]
    );
  };

  const handleExport = () => {
    Alert.alert('Export', 'Monthly attendance report downloaded as Excel.');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Stats */}
      <View style={styles.statsRow}>
        {ATTENDANCE_STATS.map((stat) => (
          <StatCard key={stat.id} icon={stat.icon} value={stat.value} label={stat.label} subtitle={stat.trend} color={stat.color} />
        ))}
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {TABS.map((t) => (
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

      {tab === 'today' ? (
        <>
          <SectionHeader title="Today's Summary" actionLabel="Mark Attendance" actionIcon="checkmark-done" onAction={handleMarkAttendance} />
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryIcon}>
                <Ionicons name="checkmark-done" size={18} color="#059669" />
              </View>
              <Text style={styles.summaryLabel}>Present</Text>
              <Text style={[styles.summaryValue, { color: '#059669' }]}>1,162</Text>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryIcon}>
                <Ionicons name="time" size={18} color="#d97706" />
              </View>
              <Text style={styles.summaryLabel}>Late</Text>
              <Text style={[styles.summaryValue, { color: '#d97706' }]}>18</Text>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryIcon}>
                <Ionicons name="person-remove" size={18} color="#dc2626" />
              </View>
              <Text style={styles.summaryLabel}>Absent</Text>
              <Text style={[styles.summaryValue, { color: '#dc2626' }]}>72</Text>
            </View>
          </View>

          <SectionHeader title="Weekly Trend" />
          <View style={styles.trendCard}>
            {[
              { day: 'Mon', pct: 96 },
              { day: 'Tue', pct: 94 },
              { day: 'Wed', pct: 97 },
              { day: 'Thu', pct: 93 },
              { day: 'Fri', pct: 95 },
              { day: 'Sat', pct: 90 },
            ].map((d) => (
              <View key={d.day} style={styles.barColumn}>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: `${d.pct}%`, backgroundColor: d.pct >= 90 ? '#059669' : '#d97706' }]} />
                </View>
                <Text style={styles.barLabel}>{d.day}</Text>
              </View>
            ))}
          </View>
          <ActionButton label="Export Monthly Report" icon="download-outline" variant="secondary" onPress={handleExport} />
        </>
      ) : null}

      {tab === 'classes' ? (
        <>
          <SectionHeader title="Class-wise Attendance" />
          {CLASS_ATTENDANCE.map((cls) => (
            <TouchableOpacity
              key={cls.id}
              style={styles.classCard}
              activeOpacity={0.8}
              onPress={() => Alert.alert(cls.name, `${cls.present}/${cls.students} present today`)}
            >
              <View style={[styles.classIcon, { backgroundColor: cls.color + '14' }]}>
                <Ionicons name="people" size={18} color={cls.color} />
              </View>
              <View style={styles.classInfo}>
                <Text style={styles.className}>{cls.name}</Text>
                <Text style={styles.classMeta}>{cls.present}/{cls.students} present</Text>
                <View style={styles.classTrack}>
                  <View style={[styles.classFill, { width: `${cls.pct}%`, backgroundColor: cls.color }]} />
                </View>
              </View>
              <Text style={[styles.classPct, { color: cls.pct >= 90 ? '#059669' : '#d97706' }]}>{cls.pct}%</Text>
            </TouchableOpacity>
          ))}
        </>
      ) : null}

      {tab === 'absent' ? (
        <>
          <SectionHeader title="Frequent Absentees" actionLabel="Send All Notices" actionIcon="megaphone" onAction={() => Alert.alert('Notices Sent', 'Warning notices sent to all frequent absentees.')} />
          {RECENT_ABSENT.map((student) => (
            <View key={student.id} style={styles.absentCard}>
              <View style={[styles.absentAvatar, { backgroundColor: student.color + '14' }]}>
                <Text style={[styles.absentInitial, { color: student.color }]}>{student.name.charAt(0)}</Text>
              </View>
              <View style={styles.absentInfo}>
                <Text style={styles.absentName}>{student.name}</Text>
                <Text style={styles.absentMeta}>{student.rollNo} • {student.class}</Text>
                <Text style={[styles.absentDays, { color: student.daysAbsent >= 5 ? '#dc2626' : '#d97706' }]}>
                  {student.daysAbsent} days absent this month
                </Text>
              </View>
              <TouchableOpacity
                style={styles.noticeBtn}
                onPress={() => handleSendNotice(student)}
                activeOpacity={0.8}
              >
                <Ionicons name="megaphone-outline" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ))}
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
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
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
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Manrope-SemiBold',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#ffffff',
  },
  summaryCard: {
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
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#eef1f3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  summaryLabel: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: '#475569',
    fontFamily: 'Manrope-Medium',
  },
  summaryValue: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  trendCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160,
    marginBottom: SPACING.md,
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
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  classMeta: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginBottom: 4,
  },
  classTrack: {
    height: 6,
    backgroundColor: '#eef1f3',
    borderRadius: 3,
    overflow: 'hidden',
  },
  classFill: {
    height: '100%',
    borderRadius: 3,
  },
  classPct: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: 'PlusJakartaSans-Bold',
    marginLeft: SPACING.md,
  },
  absentCard: {
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
  absentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  absentInitial: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  absentInfo: {
    flex: 1,
  },
  absentName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  absentMeta: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
  },
  absentDays: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    fontFamily: 'Manrope-Medium',
    marginTop: 2,
  },
  noticeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
});