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

import { ASSIGNMENT_STATS, RECENT_SUBMISSIONS, PLAGIARISM_CASES } from './constants/assignmentsData';

import StatCard from '../../components/ui/StatCard';
import SectionHeader from '../../components/ui/SectionHeader';
import FilterChips from '../../components/ui/FilterChips';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const STATUS_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Graded', value: 'Graded' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Flagged', value: 'Flagged' },
];

export default function AssignmentsModule({ navigation }) {
  const [tab, setTab] = useState('submissions');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredSubmissions = RECENT_SUBMISSIONS.filter(
    (s) => statusFilter === 'all' || s.status === statusFilter
  );

  const handleGrade = (submission) => {
    Alert.alert('Grade Submission', `Open ${submission.student}'s submission for grading (${submission.assignment}).`);
  };

  const handlePlagiarismAction = (caseItem, action) => {
    Alert.alert(
      action === 'dismiss' ? 'Dismiss Flag' : 'View Case',
      action === 'dismiss'
        ? `Dismiss plagiarism flag for ${caseItem.student} (${caseItem.similarity}% similarity)?`
        : `Full similarity report for ${caseItem.student}: ${caseItem.similarity}% match with ${caseItem.source}.`,
      action === 'dismiss'
        ? [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Dismiss', onPress: () => Alert.alert('Dismissed', 'Flag cleared and submission marked for manual review.') },
          ]
        : [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Stats */}
      <View style={styles.statsRow}>
        {ASSIGNMENT_STATS.map((stat) => (
          <StatCard key={stat.id} icon={stat.icon} value={stat.value} label={stat.label} color={stat.color} />
        ))}
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {['submissions', 'plagiarism'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.activeTab]}
            onPress={() => setTab(t)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, tab === t && styles.activeTabText]}>
              {t === 'submissions' ? 'Submissions' : 'Plagiarism Cases'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'submissions' ? (
        <>
          <FilterChips options={STATUS_FILTERS} selected={statusFilter} onSelect={setStatusFilter} />
          <SectionHeader
            title={`Recent Submissions (${filteredSubmissions.length})`}
            actionLabel="View All"
            actionIcon="eye"
            onAction={() => Alert.alert('All Submissions', 'Showing the complete submission log across all classes.')}
          />
          {filteredSubmissions.map((submission) => (
            <TouchableOpacity
              key={submission.id}
              style={styles.submissionCard}
              onPress={() => handleGrade(submission)}
              activeOpacity={0.8}
            >
              <View style={[styles.avatar, { backgroundColor: submission.color + '14' }]}>
                <Text style={[styles.avatarText, { color: submission.color }]}>{submission.student.charAt(0)}</Text>
              </View>
              <View style={styles.submissionInfo}>
                <Text style={styles.studentName}>{submission.student}</Text>
                <Text style={styles.assignmentName} numberOfLines={1}>{submission.assignment}</Text>
                <Text style={styles.submissionMeta}>{submission.submittedAt} • {submission.rollNo}</Text>
              </View>
              <View style={styles.submissionRight}>
                <View style={[styles.statusBadge, {
                  backgroundColor: submission.status === 'Graded' ? '#0596691A' : submission.status === 'Pending' ? '#d977061A' : '#dc26261A',
                }]}>
                  <Text style={[styles.statusText, {
                    color: submission.status === 'Graded' ? '#059669' : submission.status === 'Pending' ? '#d97706' : '#dc2626',
                  }]}>
                    {submission.status}
                  </Text>
                </View>
                {submission.score !== null ? (
                  <Text style={styles.scoreText}>{submission.score}/100</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
        </>
      ) : null}

      {tab === 'plagiarism' ? (
        <>
          <SectionHeader title="Plagiarism Detection" actionLabel="Run Scan" actionIcon="scan" onAction={() => Alert.alert('Scan Started', 'Scanning all pending submissions for similarity...')} />
          {PLAGIARISM_CASES.map((caseItem) => (
            <View key={caseItem.id} style={styles.plagiarismCard}>
              <View style={[styles.similarityCircle, { borderColor: caseItem.similarity >= 75 ? '#dc2626' : '#d97706' }]}>
                <Text style={[styles.similarityText, { color: caseItem.similarity >= 75 ? '#dc2626' : '#d97706' }]}>
                  {caseItem.similarity}%
                </Text>
              </View>
              <View style={styles.plagiarismInfo}>
                <Text style={styles.plagiarismName}>{caseItem.student}</Text>
                <Text style={styles.plagiarismMeta} numberOfLines={1}>{caseItem.assignment}</Text>
                <Text style={styles.plagiarismSource}>Source: {caseItem.source}</Text>
              </View>
              <View style={styles.plagiarismActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.viewBtn]}
                  onPress={() => handlePlagiarismAction(caseItem, 'view')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="eye-outline" size={14} color="#2563eb" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.dismissBtn]}
                  onPress={() => handlePlagiarismAction(caseItem, 'dismiss')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark" size={14} color="#059669" />
                </TouchableOpacity>
              </View>
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
  submissionCard: {
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  submissionInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  studentName: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  assignmentName: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  submissionMeta: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  submissionRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  statusText: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: 'Manrope-SemiBold',
  },
  scoreText: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  plagiarismCard: {
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
  similarityCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  similarityText: {
    fontSize: 12,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  plagiarismInfo: {
    flex: 1,
  },
  plagiarismName: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  plagiarismMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  plagiarismSource: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  plagiarismActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginLeft: SPACING.sm,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewBtn: {
    backgroundColor: '#2563eb1A',
  },
  dismissBtn: {
    backgroundColor: '#0596691A',
  },
});