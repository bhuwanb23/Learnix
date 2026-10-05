// F-08 Scholarships — the applications list (docs/users/06 §3.7).
// Sub-page 6 levels deep from `users/`, so every relative import is `../../../../../../`.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import { AnimatedCard, EmptyState, SearchBar, SkeletonCard, StatusChip } from '../../../../../../components/ui';
import { THEME, AMBER, RED, rupees, statusMeta, bandMeta } from '../../scholarshipsMeta';

const FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'APPLIED', label: 'Applied' },
  { id: 'UNDER_REVIEW', label: 'Review' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'DISBURSED', label: 'Disbursed' },
  { id: 'REJECTED', label: 'Rejected' },
];

export default function ScholarshipApplications({ navigation, route }) {
  const [filter, setFilter] = useState(route?.params?.status ?? 'ALL');
  const [q, setQ] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setData(await accountsApi.scholarshipApplications({ status: filter, q: q || undefined }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, q]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) return <View style={styles.wrap}><SkeletonCard /><SkeletonCard /></View>;

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color={RED} />
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity style={styles.retry} onPress={fetchData}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
      </View>
    );
  }

  const stats = data?.stats ?? { total: 0, counts: {}, requestedRupees: 0, grantedRupees: 0, disbursedRupees: 0, awaitingRupees: 0 };
  const rows = data?.applications ?? [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
    >
      <SearchBar placeholder="Search by student name" onSearch={setQ} />

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Asked</Text>
          <Text style={styles.summaryValue}>{rupees(stats.requestedRupees)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Approved</Text>
          <Text style={styles.summaryValue}>{rupees(stats.grantedRupees)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Paid out</Text>
          <Text style={[styles.summaryValue, { color: '#059669' }]}>{rupees(stats.disbursedRupees)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Awaiting</Text>
          <Text style={[styles.summaryValue, { color: AMBER }]}>{rupees(stats.awaitingRupees)}</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.chip, filter === f.id && styles.chipActive]}
            onPress={() => setFilter(f.id)}
          >
            <Text style={[styles.chipText, filter === f.id && styles.chipTextActive]}>
              {f.label}{f.id !== 'ALL' && stats.counts?.[f.id] ? ` ${stats.counts[f.id]}` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {rows.length === 0 ? (
        <EmptyState icon="document-text-outline" title="No applications" message="Nothing matches this filter yet." />
      ) : (
        rows.map((a) => {
          const sm = statusMeta(a.status);
          const bm = bandMeta(a.disbursement);
          return (
            <AnimatedCard
              key={a.id}
              style={styles.card}
              onPress={() => navigation.openModule('ScholarshipApplication', { applicationId: a.id })}
            >
              <View style={styles.row}>
                <View style={[styles.avatar, { backgroundColor: sm.bg }]}>
                  <Text style={[styles.initial, { color: sm.color }]}>{a.student.name.charAt(0)}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{a.student.name}</Text>
                  <Text style={styles.meta}>{a.student.rollNo}</Text>
                </View>
                <StatusChip label={sm.label} color={sm.color} backgroundColor={sm.bg} />
              </View>

              <Text style={styles.scheme}>{a.scholarship.name}</Text>

              <View style={styles.foot}>
                <Text style={styles.amount}>
                  {a.grantedRupees > 0 ? rupees(a.grantedRupees) : `${rupees(a.requestedRupees)} asked`}
                </Text>
                <View style={[styles.band, { backgroundColor: bm.bg }]}>
                  <Text style={[styles.bandText, { color: bm.color }]}>{bm.label}</Text>
                </View>
              </View>

              {a.balanceRupees > 0 && a.status === 'APPROVED' ? (
                <View style={styles.warnRow}>
                  <Ionicons name="alert-circle-outline" size={12} color={AMBER} />
                  <Text style={styles.warnText}>{rupees(a.balanceRupees)} approved but not yet released</Text>
                </View>
              ) : null}
              {a.status === 'DISBURSED' && a.disbursedAt ? (
                <Text style={styles.footNote}>Credited against dues on {a.disbursedAt}</Text>
              ) : null}
            </AnimatedCard>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 16, paddingBottom: 40 },
  wrap: { flex: 1, backgroundColor: '#f5f7f9', padding: 16, gap: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#f5f7f9' },
  error: { marginTop: 12, color: RED, textAlign: 'center' },
  retry: { marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700' },
  summary: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#eef2f7', padding: 12, marginTop: 12, marginBottom: 12 },
  summaryItem: { flex: 1 },
  summaryLabel: { fontSize: 10, color: '#64748b' },
  summaryValue: { fontSize: 13, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 12 },
  chip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 9, backgroundColor: '#eef2f7' },
  chipActive: { backgroundColor: THEME },
  chipText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  chipTextActive: { color: '#fff' },
  card: { marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 15, fontWeight: '800' },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  meta: { fontSize: 11, color: '#64748b', marginTop: 1 },
  scheme: { fontSize: 12, color: '#475569', marginTop: 8 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  amount: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  band: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7 },
  bandText: { fontSize: 10, fontWeight: '700' },
  warnRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  warnText: { fontSize: 10, color: AMBER, fontWeight: '600' },
  footNote: { fontSize: 10, color: '#94a3b8', marginTop: 6 },
});