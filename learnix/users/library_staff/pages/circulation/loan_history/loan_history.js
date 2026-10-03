import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../../services/api';
import { AnimatedCard, EmptyState, SearchBar, SkeletonStatRow, SkeletonCard } from '../../../../../components/ui';

const THEME = '#b45309';

const RANGES = [
  { id: '', label: 'All Time' },
  { id: '7', label: 'Last 7 Days' },
  { id: '30', label: 'Last 30 Days' },
  { id: '90', label: 'Last 90 Days' },
];

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function LoanHistory({ navigation, route }) {
  const studentId = route?.params?.studentId;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState('');
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const params = {};
      if (studentId) params.studentId = studentId;
      if (search) params.q = search;
      if (range) {
        const from = new Date();
        from.setDate(from.getDate() - Number(range));
        params.from = from.toISOString().slice(0, 10);
      }
      const result = await libraryApi.loanHistory(params);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range, search, studentId]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <SkeletonStatRow />
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color="#dc2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stats = data?.stats || {};
  const history = data?.history || [];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
    >
      {studentId && (
        <AnimatedCard delay={0} style={styles.block}>
          <View style={styles.scopedRow}>
            <Ionicons name="funnel-outline" size={15} color={THEME} />
            <Text style={styles.scopedText}>Showing history for one student only</Text>
          </View>
        </AnimatedCard>
      )}

      <AnimatedCard delay={studentId ? 60 : 0} style={[styles.block, styles.statsRow]}>
        {[
          { label: 'Returned', value: stats.returned ?? 0, icon: 'checkmark-done', color: THEME },
          { label: 'On Time', value: stats.onTime ?? 0, icon: 'thumbs-up', color: '#059669' },
          { label: 'Late', value: stats.late ?? 0, icon: 'alert-circle', color: '#dc2626' },
        ].map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && <View style={styles.statDivider} />}
            <View style={styles.statCell}>
              <View style={[styles.statIcon, { backgroundColor: s.color + '14' }]}>
                <Ionicons name={s.icon} size={18} color={s.color} />
              </View>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          </React.Fragment>
        ))}
      </AnimatedCard>

      <AnimatedCard delay={120} style={[styles.block, styles.moneyCard]}>
        <View style={styles.moneyRow}>
          <View>
            <Text style={styles.moneyLabel}>Fines Collected</Text>
            <Text style={styles.moneyValue}>₹{stats.fineCollectedRupees ?? 0}</Text>
          </View>
          <View style={styles.moneyDivider} />
          <View>
            <Text style={styles.moneyLabel}>Fines Waived</Text>
            <Text style={styles.moneyValue}>{stats.fineWaivedCount ?? 0}</Text>
          </View>
        </View>
      </AnimatedCard>

      <SearchBar placeholder="Search book, roll number or student…" onSearch={setSearch} style={styles.search} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rangesScroll}>
        <View style={styles.rangesRow}>
          {RANGES.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={[styles.rangeChip, range === r.id && styles.rangeChipActive]}
              onPress={() => setRange(r.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.rangeText, range === r.id && styles.rangeTextActive]}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Text style={styles.sectionLabel}>
        {range ? `Returned in last ${range} days` : 'All Returned Loans'}
      </Text>

      {history.length === 0 ? (
        <EmptyState
          icon={search ? 'search-outline' : 'time-outline'}
          title={search ? 'No matching records' : 'No returns yet'}
          subtitle={
            search
              ? 'Try a different book title, roll number or student name.'
              : 'Completed check-ins will be archived here with their fine outcome.'
          }
          color={THEME}
        />
      ) : (
        history.map((h, idx) => {
          const color = h.wasOverdue ? '#dc2626' : '#059669';
          const bg = h.wasOverdue ? '#fef2f2' : '#f0fdf4';
          return (
            <AnimatedCard
              key={h.id}
              delay={160 + idx * 40}
              style={styles.block}
              onPress={() => navigation.openModule('LoanDetail', { loanId: h.id })}
            >
              <View style={styles.histRow}>
                <View style={[styles.histIcon, { backgroundColor: bg }]}>
                  <Ionicons name={h.wasOverdue ? 'alert-circle-outline' : 'checkmark-circle-outline'} size={18} color={color} />
                </View>

                <View style={styles.histBody}>
                  <Text style={styles.histTitle} numberOfLines={1}>{h.book.title}</Text>
                  <Text style={styles.histMeta} numberOfLines={1}>
                    {h.student.name} · {h.student.rollNo}
                  </Text>

                  <View style={styles.chipRow}>
                    <View style={[styles.statusChip, { backgroundColor: bg }]}>
                      <Text style={[styles.statusText, { color }]}>
                        {h.wasOverdue ? 'Returned late' : 'On time'}
                      </Text>
                    </View>
                    <View style={styles.daysChip}>
                      <Text style={styles.daysText}>{h.daysKept}d kept</Text>
                    </View>
                    {h.fine && (
                      <View style={[styles.fineChip, h.fine.status === 'PAID' && { backgroundColor: '#f0fdf4' }, h.fine.status === 'WAIVED' && { backgroundColor: '#f1f5f9' }]}>
                        <Text style={[styles.fineText, h.fine.status === 'PAID' && { color: '#059669' }, h.fine.status === 'WAIVED' && { color: '#64748b' }]}>
                          ₹{h.fine.amountRupees} {h.fine.status === 'WAIVED' ? 'waived' : h.fine.status === 'PAID' ? 'paid' : 'due'}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.histDates}>
                    {formatDate(h.issueDate)} → {formatDate(h.returnDate)}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={15} color="#cbd5e1" />
              </View>
            </AnimatedCard>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 24, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9', padding: 24 },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  block: { marginBottom: 10 },

  scopedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  scopedText: { fontSize: 12, color: THEME, fontFamily: 'Manrope-SemiBold', flex: 1 },

  statsRow: { flexDirection: 'row' },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6 },
  statDivider: { width: 1, backgroundColor: '#eef2f7', marginVertical: 8 },
  statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 16, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },

  moneyCard: { padding: 14 },
  moneyRow: { flexDirection: 'row', alignItems: 'center' },
  moneyDivider: { width: 1, height: 34, backgroundColor: '#eef2f7', marginHorizontal: 24 },
  moneyLabel: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium', textTransform: 'uppercase', letterSpacing: 0.5 },
  moneyValue: { fontSize: 18, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginTop: 3 },

  search: { marginTop: 12, marginBottom: 12 },
  rangesScroll: { flexGrow: 0, marginHorizontal: -24 },
  rangesRow: { flexDirection: 'row', paddingHorizontal: 24 },
  rangeChip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', marginRight: 8 },
  rangeChipActive: { backgroundColor: THEME, borderColor: THEME },
  rangeText: { fontSize: 12, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  rangeTextActive: { color: '#fff' },

  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginTop: 18, marginBottom: 10 },

  histRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  histIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  histBody: { flex: 1 },
  histTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  histMeta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, flexWrap: 'wrap' },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  daysChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: '#f1f5f9' },
  daysText: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium' },
  fineChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: '#fef2f2' },
  fineText: { fontSize: 10, fontWeight: '700', color: '#dc2626', fontFamily: 'Manrope-Bold' },
  histDates: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 5 },
});