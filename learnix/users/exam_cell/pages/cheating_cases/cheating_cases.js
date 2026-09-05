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

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const CASES = [
  {
    id: '1',
    studentName: 'Rohan Verma',
    rollNo: 'CSE-22-008',
    subject: 'DBMS Final',
    issue: 'Copy-paste detected',
    riskLevel: 'High Risk',
    riskColor: '#ef4444',
    evidence: 'Code blocks match an online repository byte-for-byte.',
  },
  {
    id: '2',
    studentName: 'Isha Gupta',
    rollNo: 'ECE-23-019',
    subject: 'Chemistry Mid-term',
    issue: 'Suspicious timing pattern',
    riskLevel: 'High Risk',
    riskColor: '#ef4444',
    evidence: 'Submitted in 4 min for a 45-min exam. 3 tab-switch events logged.',
  },
  {
    id: '3',
    studentName: 'Aarav Mehta',
    rollNo: 'CSE-21-001',
    subject: 'Physics Mid-term',
    issue: 'Answer similarity detected',
    riskLevel: 'Medium Risk',
    riskColor: '#d97706',
    evidence: '94% answer overlap with student at adjacent IP range.',
  },
  {
    id: '4',
    studentName: 'Dev Patel',
    rollNo: 'ECE-22-003',
    subject: 'Mathematics Quiz',
    issue: 'Rapid response pattern',
    riskLevel: 'Low Risk',
    riskColor: '#eab308',
    evidence: 'Answer times consistently under 5 seconds across 12 questions.',
  },
];

const RISK_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'High Risk', value: 'High Risk' },
  { label: 'Medium Risk', value: 'Medium Risk' },
  { label: 'Low Risk', value: 'Low Risk' },
];

export default function CheatingCasesModule({ navigation }) {
  const [filter, setFilter] = useState('all');
  const [resolvedIds, setResolvedIds] = useState([]);

  const filteredCases = CASES.filter((c) => {
    if (filter !== 'all' && c.riskLevel !== filter) return false;
    return !resolvedIds.includes(c.id);
  });

  const handleAction = (item, action) => {
    if (action === 'warn') {
      Alert.alert(
        'Issue Warning',
        `Send a formal warning to ${item.studentName}? The incident will be recorded on their academic profile.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Warn',
            onPress: () => {
              setResolvedIds((prev) => [...prev, item.id]);
              Alert.alert('Warning Issued', `${item.studentName} has been notified.`);
            },
          },
        ]
      );
    } else if (action === 'void') {
      Alert.alert(
        'Void Paper',
        `Void ${item.studentName}'s ${item.subject} paper? They will need to retake the exam.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Void Paper',
            style: 'destructive',
            onPress: () => {
              setResolvedIds((prev) => [...prev, item.id]);
              Alert.alert('Paper Voided', `${item.studentName} must retake the exam.`);
            },
          },
        ]
      );
    } else if (action === 'escalate') {
      Alert.alert(
        'Escalate Case',
        `Escalate ${item.studentName}'s case to the disciplinary committee?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Escalate', onPress: () => Alert.alert('Escalated', 'Case forwarded to the disciplinary committee.') },
        ]
      );
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#ef444414' }]}>
            <Ionicons name="warning" size={18} color="#ef4444" />
          </View>
          <Text style={styles.statValue}>5</Text>
          <Text style={styles.statLabel}>Total Alerts</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#ef444414' }]}>
            <Ionicons name="flame" size={18} color="#ef4444" />
          </View>
          <Text style={styles.statValue}>2</Text>
          <Text style={styles.statLabel}>High Risk</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#05966914' }]}>
            <Ionicons name="shield-checkmark" size={18} color="#059669" />
          </View>
          <Text style={styles.statValue}>{resolvedIds.length}</Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {RISK_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
            onPress={() => setFilter(f.value)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.listLabel}>{filteredCases.length} cases to review</Text>

      {filteredCases.map((item) => (
        <View key={item.id} style={styles.caseCard}>
          <View style={styles.caseHeader}>
            <View style={[styles.caseAvatar, { backgroundColor: item.riskColor + '14' }]}>
              <Text style={[styles.caseInitial, { color: item.riskColor }]}>{item.studentName.charAt(0)}</Text>
            </View>
            <View style={styles.caseInfo}>
              <Text style={styles.caseName}>{item.studentName}</Text>
              <Text style={styles.caseMeta}>{item.rollNo} • {item.subject}</Text>
            </View>
            <View style={[styles.riskChip, { backgroundColor: item.riskColor + '1A' }]}>
              <Text style={[styles.riskText, { color: item.riskColor }]}>{item.riskLevel}</Text>
            </View>
          </View>
          <View style={styles.evidenceBox}>
            <Ionicons name="analytics-outline" size={14} color="#64748b" />
            <Text style={styles.evidenceText}>{item.evidence}</Text>
          </View>
          <View style={styles.caseActions}>
            <TouchableOpacity style={styles.warnBtn} onPress={() => handleAction(item, 'warn')} activeOpacity={0.8}>
              <Ionicons name="alert-circle-outline" size={14} color="#d97706" />
              <Text style={styles.warnBtnText}>Issue Warning</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.voidBtn} onPress={() => handleAction(item, 'void')} activeOpacity={0.8}>
              <Ionicons name="close-circle-outline" size={14} color="#dc2626" />
              <Text style={styles.voidBtnText}>Void Paper</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.escalateBtn} onPress={() => handleAction(item, 'escalate')} activeOpacity={0.8}>
              <Ionicons name="arrow-up-circle-outline" size={14} color="#2563eb" />
              <Text style={styles.escalateBtnText}>Escalate</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Manrope-Medium',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: 'Manrope-Medium',
    marginBottom: 10,
  },
  caseCard: {
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 12,
  },
  caseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  caseAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  caseInitial: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  caseInfo: {
    flex: 1,
  },
  caseName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  caseMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  riskChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  riskText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  evidenceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  evidenceText: {
    flex: 1,
    fontSize: 11,
    color: '#475569',
    fontFamily: 'Manrope-Regular',
    lineHeight: 16,
    marginLeft: 8,
  },
  caseActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  warnBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 10,
    paddingVertical: 8,
  },
  warnBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#d97706',
    fontFamily: 'Manrope-Bold',
  },
  voidBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    paddingVertical: 8,
  },
  voidBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
    fontFamily: 'Manrope-Bold',
  },
  escalateBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    paddingVertical: 8,
  },
  escalateBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
    fontFamily: 'Manrope-Bold',
  },
});