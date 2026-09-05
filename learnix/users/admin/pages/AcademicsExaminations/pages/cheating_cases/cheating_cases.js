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

import FilterChips from '../../../../components/ui/FilterChips';
import EmptyState from '../../../../components/ui/EmptyState';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../../constants/theme';

const ALL_ALERTS = [
  {
    id: '1',
    studentName: 'John Smith',
    rollNo: 'CSE-21-007',
    subject: 'Chemistry Mid-term',
    issue: 'Suspicious timing pattern',
    riskLevel: 'High Risk',
    riskColor: '#ef4444',
    bgColor: '#fef2f2',
    evidence: 'Submitted in 4 min for a 45-min exam. 3 tab-switch events logged.',
  },
  {
    id: '2',
    studentName: 'Sarah Wilson',
    rollNo: 'ECE-22-014',
    subject: 'Physics Mid-term',
    issue: 'Answer similarity detected',
    riskLevel: 'Medium Risk',
    riskColor: '#d97706',
    bgColor: '#fffbeb',
    evidence: '94% answer overlap with student at adjacent IP range.',
  },
  {
    id: '3',
    studentName: 'Mike Johnson',
    rollNo: 'ME-23-002',
    subject: 'Mathematics Quiz',
    issue: 'Rapid response pattern',
    riskLevel: 'Low Risk',
    riskColor: '#eab308',
    bgColor: '#fefce8',
    evidence: 'Answer times consistently under 5 seconds across 12 questions.',
  },
  {
    id: '4',
    studentName: 'Emma Davis',
    rollNo: 'CSE-22-019',
    subject: 'DBMS Final',
    issue: 'Copy-paste detected',
    riskLevel: 'High Risk',
    riskColor: '#ef4444',
    bgColor: '#fef2f2',
    evidence: 'Code blocks match an online repository byte-for-byte.',
  },
  {
    id: '5',
    studentName: 'Alex Brown',
    rollNo: 'BBA-23-011',
    subject: 'Marketing Quiz',
    issue: 'Suspicious timing pattern',
    riskLevel: 'Medium Risk',
    riskColor: '#d97706',
    bgColor: '#fffbeb',
    evidence: 'Paused exam for 12 min, then completed remaining 20 questions in 90 seconds.',
  },
];

const RISK_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'High Risk', value: 'High Risk' },
  { label: 'Medium Risk', value: 'Medium Risk' },
  { label: 'Low Risk', value: 'Low Risk' },
];

export default function CheatingCases({ alerts, onBack }) {
  const [filter, setFilter] = useState('all');
  const [resolvedIds, setResolvedIds] = useState([]);

  const filteredAlerts = ALL_ALERTS.filter((a) => {
    if (filter !== 'all' && a.riskLevel !== filter) return false;
    return !resolvedIds.includes(a.id);
  });

  const handleAction = (alert, action) => {
    if (action === 'resolve') {
      Alert.alert(
        'Resolve Case',
        `Mark ${alert.studentName}'s case as resolved? A resolution note will be added.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Resolve',
            onPress: () => {
              setResolvedIds((prev) => [...prev, alert.id]);
              Alert.alert('Resolved', 'Case closed and archived.');
            },
          },
        ]
      );
    } else {
      Alert.alert('Review Evidence', alert.evidence);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#2563eb" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Cheating Cases</Text>
            <Text style={styles.headerSubtitle}>{filteredAlerts.length} active cases</Text>
          </View>
        </View>

        <FilterChips options={RISK_FILTERS} selected={filter} onSelect={setFilter} />

        {filteredAlerts.length === 0 ? (
          <EmptyState icon="shield-checkmark-outline" title="No active cases" message="All cases have been resolved." />
        ) : (
          filteredAlerts.map((alert) => (
            <View key={alert.id} style={[styles.alertCard, { borderLeftColor: alert.riskColor }]}>
              <View style={styles.alertHeader}>
                <View style={[styles.avatar, { backgroundColor: alert.bgColor }]}>
                  <Text style={[styles.avatarText, { color: alert.riskColor }]}>{alert.studentName.charAt(0)}</Text>
                </View>
                <View style={styles.alertInfo}>
                  <Text style={styles.alertName}>{alert.studentName}</Text>
                  <Text style={styles.alertMeta}>{alert.rollNo} • {alert.subject}</Text>
                </View>
                <View style={[styles.riskBadge, { backgroundColor: alert.bgColor }]}>
                  <Text style={[styles.riskText, { color: alert.riskColor }]}>{alert.riskLevel}</Text>
                </View>
              </View>
              <Text style={styles.alertIssue}>{alert.issue}</Text>
              <Text style={styles.alertEvidence} numberOfLines={2}>{alert.evidence}</Text>
              <View style={styles.alertActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.reviewBtn]}
                  onPress={() => handleAction(alert, 'review')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="search-outline" size={14} color="#2563eb" />
                  <Text style={styles.reviewBtnText}>Review Evidence</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.resolveBtn]}
                  onPress={() => handleAction(alert, 'resolve')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark" size={14} color="#ffffff" />
                  <Text style={styles.resolveBtnText}>Resolve</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb1A',
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
  alertCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  alertInfo: {
    flex: 1,
  },
  alertName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  alertMeta: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
  },
  riskBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  riskText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: 'Manrope-SemiBold',
  },
  alertIssue: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: '#0f172a',
    fontFamily: 'Manrope-Medium',
  },
  alertEvidence: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 2,
    lineHeight: 16,
  },
  alertActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.lg,
  },
  reviewBtn: {
    backgroundColor: '#2563eb1A',
  },
  reviewBtnText: {
    fontSize: 11,
    color: '#2563eb',
    fontFamily: 'Manrope-SemiBold',
  },
  resolveBtn: {
    backgroundColor: '#059669',
  },
  resolveBtnText: {
    fontSize: 11,
    color: '#ffffff',
    fontFamily: 'Manrope-SemiBold',
  },
});