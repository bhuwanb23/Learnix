import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { examcellApi } from '../../../../services/api';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const RISK_COLORS = {
  HIGH: '#ef4444',
  MEDIUM: '#d97706',
  LOW: '#eab308',
};

const RISK_LABELS = {
  HIGH: 'High Risk',
  MEDIUM: 'Medium Risk',
  LOW: 'Low Risk',
};

const RISK_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'High Risk', value: 'HIGH' },
  { label: 'Medium Risk', value: 'MEDIUM' },
  { label: 'Low Risk', value: 'LOW' },
];

export default function CheatingCasesModule({ navigation }) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [resolvedIds, setResolvedIds] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await examcellApi.cheatingCases();
      setCases(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const filteredCases = cases.filter((c) => {
    if (filter !== 'all' && c.riskLevel !== filter) return false;
    return !resolvedIds.includes(c.id);
  });

  const handleAction = async (item, decision) => {
    try {
      await examcellApi.decideCheatingCase(item.id, decision);
      setResolvedIds((prev) => [...prev, item.id]);
      Alert.alert(decision === 'CONFIRMED' ? 'Confirmed' : decision === 'DISMISSED' ? 'Dismissed' : 'Escalated',
        `${item.studentName}'s case has been ${decision.toLowerCase()}.`);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading cheating cases…</Text>
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

  const totalAlerts = cases.length;
  const highRisk = cases.filter((c) => c.riskLevel === 'HIGH').length;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
    >
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#ef444414' }]}>
            <Ionicons name="warning" size={18} color="#ef4444" />
          </View>
          <Text style={styles.statValue}>{totalAlerts}</Text>
          <Text style={styles.statLabel}>Total Alerts</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#ef444414' }]}>
            <Ionicons name="flame" size={18} color="#ef4444" />
          </View>
          <Text style={styles.statValue}>{highRisk}</Text>
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
            <View style={[styles.caseAvatar, { backgroundColor: (RISK_COLORS[item.riskLevel] || '#ef4444') + '14' }]}>
              <Text style={[styles.caseInitial, { color: RISK_COLORS[item.riskLevel] || '#ef4444' }]}>{item.studentName.charAt(0)}</Text>
            </View>
            <View style={styles.caseInfo}>
              <Text style={styles.caseName}>{item.studentName}</Text>
              <Text style={styles.caseMeta}>{item.rollNo} • {item.course}</Text>
            </View>
            <View style={[styles.riskChip, { backgroundColor: (RISK_COLORS[item.riskLevel] || '#ef4444') + '1A' }]}>
              <Text style={[styles.riskText, { color: RISK_COLORS[item.riskLevel] || '#ef4444' }]}>{RISK_LABELS[item.riskLevel] || item.riskLevel}</Text>
            </View>
          </View>
          <View style={styles.evidenceBox}>
            <Ionicons name="analytics-outline" size={14} color="#64748b" />
            <Text style={styles.evidenceText}>{item.issue}{item.evidence ? ` — ${JSON.stringify(item.evidence)}` : ''}</Text>
          </View>
          {item.status === 'UNDER_REVIEW' && (
            <View style={styles.caseActions}>
              <TouchableOpacity style={styles.confirmBtn} onPress={() => handleAction(item, 'CONFIRMED')} activeOpacity={0.8}>
                <Ionicons name="alert-circle-outline" size={14} color="#d97706" />
                <Text style={styles.confirmBtnText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dismissBtn} onPress={() => handleAction(item, 'DISMISSED')} activeOpacity={0.8}>
                <Ionicons name="close-circle-outline" size={14} color="#dc2626" />
                <Text style={styles.dismissBtnText}>Dismiss</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.escalateBtn} onPress={() => handleAction(item, 'ESCALATED')} activeOpacity={0.8}>
                <Ionicons name="arrow-up-circle-outline" size={14} color="#2563eb" />
                <Text style={styles.escalateBtnText}>Escalate</Text>
              </TouchableOpacity>
            </View>
          )}
          {item.status !== 'UNDER_REVIEW' && (
            <View style={[styles.statusBadge, { backgroundColor: item.status === 'CONFIRMED' ? '#dc26261A' : item.status === 'DISMISSED' ? '#0596691A' : '#2563eb1A' }]}>
              <Text style={[styles.statusBadgeText, { color: item.status === 'CONFIRMED' ? '#dc2626' : item.status === 'DISMISSED' ? '#059669' : '#2563eb' }]}>{item.status}</Text>
            </View>
          )}
        </View>
      ))}
      {filteredCases.length === 0 && <Text style={styles.emptyText}>No cases match this filter.</Text>}
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
  emptyText: { fontSize: 13, color: '#94a3b8', fontFamily: 'Manrope-Regular', textAlign: 'center', marginTop: 20 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14 },
  statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  filterChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterText: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Medium' },
  filterTextActive: { color: '#FFFFFF' },
  listLabel: { fontSize: 12, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginBottom: 10 },
  caseCard: { backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 12 },
  caseHeader: { flexDirection: 'row', alignItems: 'center' },
  caseAvatar: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  caseInitial: { fontSize: 16, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold' },
  caseInfo: { flex: 1 },
  caseName: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  caseMeta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  riskChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  riskText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  evidenceBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, marginTop: 12 },
  evidenceText: { flex: 1, fontSize: 11, color: '#475569', fontFamily: 'Manrope-Regular', lineHeight: 16, marginLeft: 8 },
  caseActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  confirmBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 10, paddingVertical: 8 },
  confirmBtnText: { fontSize: 11, fontWeight: '700', color: '#d97706', fontFamily: 'Manrope-Bold' },
  dismissBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, paddingVertical: 8 },
  dismissBtnText: { fontSize: 11, fontWeight: '700', color: '#dc2626', fontFamily: 'Manrope-Bold' },
  escalateBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 10, paddingVertical: 8 },
  escalateBtnText: { fontSize: 11, fontWeight: '700', color: '#2563eb', fontFamily: 'Manrope-Bold' },
  statusBadge: { marginTop: 12, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: 'flex-start' },
  statusBadgeText: { fontSize: 11, fontWeight: '700', fontFamily: 'Manrope-Bold' },
});
