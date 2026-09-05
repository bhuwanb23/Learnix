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

import { EVALUATION_STATS, SUBJECT_PROGRESS, DISPUTES } from './constants/evaluationsData';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const STATUS_META = {
  'On Track': { color: '#059669' },
  'At Risk': { color: '#d97706' },
  Overdue: { color: '#dc2626' },
};

export default function EvaluationsModule({ navigation }) {
  const [tab, setTab] = useState('subjects');

  const overallPct = Math.round(
    (EVALUATION_STATS.find((s) => s.id === 'completed').value / EVALUATION_STATS.find((s) => s.id === 'total').value) * 100
  );

  const handleSendReminder = (subject) => {
    Alert.alert(
      'Remind Evaluator',
      `Send a grading reminder to ${subject.evaluator} for ${subject.subject}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', onPress: () => Alert.alert('Sent', `Reminder sent to ${subject.evaluator}.`) },
      ]
    );
  };

  const handleDispute = (dispute) => {
    Alert.alert(
      'Resolve Dispute',
      `${dispute.student} — ${dispute.issue}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Escalate to HOD', onPress: () => Alert.alert('Escalated', 'Dispute forwarded to the department head for review.') },
        { text: 'Mark Resolved', onPress: () => Alert.alert('Resolved', 'Dispute closed and student notified.') },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Stats */}
      <View style={styles.statsRow}>
        {EVALUATION_STATS.map((stat) => (
          <View key={stat.id} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: stat.color + '14' }]}>
              <Ionicons name={stat.icon} size={18} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Overall progress */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Overall Grading Progress</Text>
          <Text style={styles.progressPct}>{overallPct}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${overallPct}%` }]} />
        </View>
        <Text style={styles.progressNote}>847 of 1,100 papers graded • {EVALUATION_STATS.find((s) => s.id === 'pending').value} still pending</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {[
          { id: 'subjects', label: 'Subjects' },
          { id: 'disputes', label: `Disputes (${DISPUTES.length})` },
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

      {tab === 'subjects' ? (
        <>
          {SUBJECT_PROGRESS.map((subject) => {
            const pct = Math.round((subject.graded / subject.total) * 100);
            const meta = STATUS_META[subject.status];
            return (
              <View key={subject.id} style={styles.subjectCard}>
                <View style={styles.subjectHeader}>
                  <View style={styles.subjectInfo}>
                    <Text style={styles.subjectName}>{subject.subject}</Text>
                    <Text style={styles.subjectMeta}>{subject.code} • {subject.evaluator}</Text>
                  </View>
                  <View style={[styles.statusChip, { backgroundColor: meta.color + '1A' }]}>
                    <Text style={[styles.statusText, { color: meta.color }]}>{subject.status}</Text>
                  </View>
                </View>
                <View style={styles.subjectTrack}>
                  <View style={[styles.subjectFill, { width: `${pct}%`, backgroundColor: meta.color }]} />
                </View>
                <View style={styles.subjectFooter}>
                  <Text style={styles.subjectCount}>{subject.graded}/{subject.total} graded • {pct}%</Text>
                  {subject.status !== 'On Track' ? (
                    <TouchableOpacity style={styles.remindBtn} onPress={() => handleSendReminder(subject)} activeOpacity={0.7}>
                      <Ionicons name="megaphone-outline" size={13} color="#2563eb" />
                      <Text style={styles.remindText}>Remind</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          })}
        </>
      ) : (
        <>
          <Text style={styles.sectionLabel}>Grade Disputes</Text>
          {DISPUTES.map((dispute) => (
            <TouchableOpacity
              key={dispute.id}
              style={styles.disputeCard}
              activeOpacity={0.8}
              onPress={() => handleDispute(dispute)}
            >
              <View style={[styles.disputeIcon, { backgroundColor: dispute.color + '14' }]}>
                <Ionicons name="git-compare-outline" size={18} color={dispute.color} />
              </View>
              <View style={styles.disputeInfo}>
                <Text style={styles.disputeStudent}>{dispute.student} • {dispute.subject}</Text>
                <Text style={styles.disputeIssue}>{dispute.issue}</Text>
                <Text style={styles.disputeDate}>Raised {dispute.date}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>
          ))}
          <Text style={styles.disputeNote}>Tap a dispute to resolve or escalate it.</Text>
        </>
      )}
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
    marginBottom: 16,
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
  progressCard: {
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 16,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  progressPct: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2563eb',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#eef2f7',
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
  progressNote: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 8,
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
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    fontFamily: 'Manrope-SemiBold',
  },
  activeTabText: {
    color: '#2563eb',
  },
  subjectCard: {
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 10,
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  subjectMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
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
  subjectTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#eef2f7',
    marginTop: 10,
    overflow: 'hidden',
  },
  subjectFill: {
    height: '100%',
    borderRadius: 3,
  },
  subjectFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  subjectCount: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
  },
  remindBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  remindText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
    fontFamily: 'Manrope-Bold',
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 10,
  },
  disputeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 10,
  },
  disputeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  disputeInfo: {
    flex: 1,
  },
  disputeStudent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  disputeIssue: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  disputeDate: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  disputeNote: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 4,
  },
});