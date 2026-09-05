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

import { RESULT_STATS, RESULTS_PENDING, RESULTS_PUBLISHED, REVALUATION_REQUESTS } from './constants/resultsData';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const REVAL_COLORS = {
  Pending: '#2563eb',
  'In Review': '#d97706',
  Resolved: '#059669',
};

export default function ResultsModule({ navigation }) {
  const [tab, setTab] = useState('publish');

  const handlePublish = (result) => {
    Alert.alert(
      'Publish Results',
      `Publish ${result.subject} (${result.code}) results to ${result.total} students? Students will see grades immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Publish',
          onPress: () => Alert.alert('Published', `${result.subject} results are now live for students.`),
        },
      ]
    );
  };

  const handleModeration = (result) => {
    Alert.alert(
      'Review Moderation',
      `${result.subject} — check grade distribution before publishing?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Report', onPress: () => Alert.alert('Moderation', 'Grade distribution report opened for review.') },
      ]
    );
  };

  const handleRevaluation = (request) => {
    Alert.alert(
      'Revaluation Request',
      `${request.student} — ${request.reason}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve Revaluation', onPress: () => Alert.alert('Approved', 'Paper sent for re-evaluation. Student notified.') },
        { text: 'Reject', style: 'destructive', onPress: () => Alert.alert('Rejected', 'Request declined. Student notified with reason.') },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Stats */}
      <View style={styles.statsRow}>
        {RESULT_STATS.map((stat) => (
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
          { id: 'publish', label: `Publish (${RESULTS_PENDING.length})` },
          { id: 'published', label: 'Published' },
          { id: 'revaluation', label: `Revaluation (${REVALUATION_REQUESTS.length})` },
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

      {tab === 'publish' ? (
        <>
          <Text style={styles.sectionLabel}>Awaiting Publication</Text>
          {RESULTS_PENDING.map((result) => (
            <View key={result.id} style={styles.resultCard}>
              <View style={[styles.resultIcon, { backgroundColor: result.color + '14' }]}>
                <Ionicons name="trophy-outline" size={18} color={result.color} />
              </View>
              <View style={styles.resultInfo}>
                <Text style={styles.resultSubject}>{result.subject}</Text>
                <Text style={styles.resultMeta}>{result.code} • {result.sem} • Exam {result.examDate}</Text>
                <Text style={styles.resultGraded}>{result.graded}/{result.total} graded • Due {result.due}</Text>
              </View>
              <View style={styles.resultActions}>
                <TouchableOpacity style={styles.moderationBtn} onPress={() => handleModeration(result)} activeOpacity={0.7}>
                  <Ionicons name="analytics-outline" size={16} color="#d97706" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.publishBtn} onPress={() => handlePublish(result)} activeOpacity={0.7}>
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <Text style={styles.resultNote}>Tap the chart icon to review moderation, the check to publish.</Text>
        </>
      ) : null}

      {tab === 'published' ? (
        <>
          <Text style={styles.sectionLabel}>Published Results</Text>
          {RESULTS_PUBLISHED.map((result) => (
            <View key={result.id} style={styles.resultCard}>
              <View style={[styles.resultIcon, { backgroundColor: result.color + '14' }]}>
                <Ionicons name="checkmark-done-outline" size={18} color={result.color} />
              </View>
              <View style={styles.resultInfo}>
                <Text style={styles.resultSubject}>{result.subject}</Text>
                <Text style={styles.resultMeta}>{result.code} • {result.sem} • Published {result.published}</Text>
              </View>
              <View style={[styles.passChip, { backgroundColor: '#0596691A' }]}>
                <Text style={[styles.passText, { color: '#059669' }]}>{result.passRate} pass</Text>
              </View>
            </View>
          ))}
        </>
      ) : null}

      {tab === 'revaluation' ? (
        <>
          <Text style={styles.sectionLabel}>Revaluation Requests</Text>
          {REVALUATION_REQUESTS.map((request) => (
            <TouchableOpacity
              key={request.id}
              style={styles.revalCard}
              activeOpacity={0.8}
              onPress={() => handleRevaluation(request)}
            >
              <View style={[styles.revalIcon, { backgroundColor: REVAL_COLORS[request.status] + '14' }]}>
                <Ionicons name="refresh-outline" size={18} color={REVAL_COLORS[request.status]} />
              </View>
              <View style={styles.revalInfo}>
                <Text style={styles.revalStudent}>{request.student} • {request.subject}</Text>
                <Text style={styles.revalReason}>{request.reason}</Text>
                <Text style={styles.revalDate}>Requested {request.requested}</Text>
              </View>
              <View style={[styles.revalStatusChip, { backgroundColor: REVAL_COLORS[request.status] + '1A' }]}>
                <Text style={[styles.revalStatusText, { color: REVAL_COLORS[request.status] }]}>{request.status}</Text>
              </View>
            </TouchableOpacity>
          ))}
          <Text style={styles.resultNote}>Tap a request to approve or reject revaluation.</Text>
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
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 10,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 10,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultInfo: {
    flex: 1,
  },
  resultSubject: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  resultMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  resultGraded: {
    fontSize: 11,
    color: '#475569',
    fontFamily: 'Manrope-Medium',
    marginTop: 1,
  },
  resultActions: {
    flexDirection: 'row',
    gap: 8,
  },
  moderationBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  publishBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultNote: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 4,
  },
  passChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  passText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  revalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 10,
  },
  revalIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  revalInfo: {
    flex: 1,
  },
  revalStudent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  revalReason: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  revalDate: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  revalStatusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  revalStatusText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
});