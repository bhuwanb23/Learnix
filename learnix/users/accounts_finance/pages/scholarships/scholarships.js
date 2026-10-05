// F-08 Scholarships — the desk hub (docs/users/06 §3.7).
//
// Every figure here comes from the server. The old hub rendered a hard-coded
// `SCHOLARSHIP_STATS` array ("8 schemes", "146 applications", "₹18.6 L") that
// nothing could change, and flattened awards out of the old award-shaped API.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../services/api';
import { AnimatedCard, EmptyState, StatusChip } from '../../../../components/ui';
import {
  THEME, AMBER, GREEN, RED, rupees, compactRupees, statusMeta, bandMeta, schemeStatusMeta,
  typeMeta, amountLabel, utilisationTone,
} from './scholarshipsMeta';

const FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'APPLIED', label: 'Applied' },
  { id: 'UNDER_REVIEW', label: 'Review' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'DISBURSED', label: 'Disbursed' },
];

export default function ScholarshipsModule({ navigation }) {
  const [schemes, setSchemes] = useState([]);
  const [apps, setApps] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL');

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [s, a, t] = await Promise.all([
        accountsApi.scholarships(),
        accountsApi.scholarshipApplications({ status: filter }),
        accountsApi.scholarshipTracking(),
      ]);
      setSchemes(s || []);
      setApps(a);
      setTracking(t);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME} />
        <Text style={styles.muted}>Loading the scholarship desk…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color={RED} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stats = apps?.stats ?? { total: 0, counts: {}, requestedRupees: 0, grantedRupees: 0, disbursedRupees: 0, awaitingRupees: 0 };
  const totals = tracking?.totals ?? { budgetRupees: 0, committedRupees: 0, disbursedRupees: 0, headroomRupees: 0 };
  const rows = apps?.applications ?? [];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
    >
      {/* The headline separates PROMISED money from PAID-OUT money. An award that
          has been approved but not disbursed is a promise, and showing it as
          "given" would overstate the aid this institution has delivered. */}
      <AnimatedCard style={styles.hero}>
        <Text style={styles.heroLabel}>Disbursed to students</Text>
        <Text style={styles.heroValue}>{rupees(totals.disbursedRupees)}</Text>
        <View style={styles.heroSplit}>
          <View style={styles.heroSplitItem}>
            <Text style={styles.heroSplitLabel}>Promised (approved)</Text>
            <Text style={styles.heroSplitValue}>{rupees(stats.grantedRupees)}</Text>
          </View>
          <View style={styles.heroSplitItem}>
            <Text style={styles.heroSplitLabel}>Awaiting release</Text>
            <Text style={[styles.heroSplitValue, { color: AMBER }]}>{rupees(stats.awaitingRupees)}</Text>
          </View>
          <View style={styles.heroSplitItem}>
            <Text style={styles.heroSplitLabel}>Fund headroom</Text>
            <Text style={styles.heroSplitValue}>{rupees(totals.headroomRupees)}</Text>
          </View>
        </View>
      </AnimatedCard>

      <View style={styles.deskBtns}>
        <TouchableOpacity style={styles.deskBtn} onPress={() => navigation.openModule('ScholarshipApplications', { status: filter })}>
          <Ionicons name="document-text-outline" size={16} color={THEME} />
          <Text style={styles.deskBtnText}>Applications</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deskBtn} onPress={() => navigation.openModule('ScholarshipTracking', {})}>
          <Ionicons name="stats-chart-outline" size={16} color={GREEN} />
          <Text style={styles.deskBtnText}>Amounts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.deskBtn, styles.deskBtnWarn]} onPress={() => navigation.openModule('ScholarshipDocuments', {})}>
          <Ionicons name="folder-open-outline" size={16} color={AMBER} />
          <Text style={[styles.deskBtnText, { color: AMBER }]}>Documents</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statRow}>
        {[
          { label: 'Schemes', value: schemes.length, icon: 'school-outline', color: THEME },
          { label: 'Applications', value: stats.total, icon: 'document-text-outline', color: '#0284c7' },
          { label: 'Awaiting review', value: (stats.counts?.APPLIED ?? 0) + (stats.counts?.UNDER_REVIEW ?? 0), icon: 'time-outline', color: AMBER },
        ].map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Ionicons name={s.icon} size={16} color={s.color} />
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Schemes ({schemes.length})</Text>
      {schemes.length === 0 ? (
        <EmptyState icon="ribbon-outline" title="No scholarship schemes" message="Create a scheme to start accepting applications." />
      ) : (
        schemes.map((s) => {
          const meta = schemeStatusMeta(s.status);
          const t = typeMeta[s.type] ?? {};
          return (
            <AnimatedCard key={s.id} style={styles.schemeCard} onPress={() => navigation.openModule('ScholarshipDetail', { schemeId: s.id })}>
              <View style={styles.rowTop}>
                <View style={[styles.icon, { backgroundColor: (t.color ?? THEME) + '14' }]}>
                  <Ionicons name={t.icon ?? 'ribbon-outline'} size={18} color={t.color ?? THEME} />
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle}>{s.name}</Text>
                  <Text style={styles.rowMeta}>{t.label} · {amountLabel(s)} · {s.academicYear}</Text>
                </View>
                <View style={[styles.pill, { backgroundColor: meta.bg }]}>
                  <Text style={[styles.pillText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>

              {s.budgetRupees !== null ? (
                <View style={styles.budgetRow}>
                  <View style={[styles.budgetBar, { backgroundColor: '#eef2f7' }]}>
                    <View style={[styles.budgetFill, { width: `${Math.min(100, s.utilisationPercent ?? 0)}%`, backgroundColor: utilisationTone(s.utilisationPercent) }]} />
                  </View>
                  <Text style={styles.budgetText}>
                    {compactRupees(s.disbursedRupees)} paid of {compactRupees(s.budgetRupees)} fund
                  </Text>
                </View>
              ) : null}

              <View style={styles.tagRow}>
                <Text style={styles.tagText}>{s.stats?.applications ?? 0} applications</Text>
                <Text style={styles.tagText}>·</Text>
                <Text style={styles.tagText}>{s.requiredDocumentCount} required docs</Text>
                <Text style={styles.tagText}>·</Text>
                <Text style={styles.tagText}>{s.ruleCount} rules</Text>
              </View>
            </AnimatedCard>
          );
        })
      )}

      <Text style={styles.sectionLabel}>Applications</Text>
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterChip, filter === f.id && styles.filterChipActive]}
            onPress={() => setFilter(f.id)}
          >
            <Text style={[styles.filterText, filter === f.id && styles.filterTextActive]}>
              {f.label}{f.id !== 'ALL' && stats.counts?.[f.id] ? ` ${stats.counts[f.id]}` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {rows.length === 0 ? (
        <EmptyState icon="document-text-outline" title="Nothing here" message="No application matches this filter." />
      ) : (
        rows.map((a) => {
          const sm = statusMeta(a.status);
          const bm = bandMeta(a.disbursement);
          return (
            <AnimatedCard key={a.id} style={styles.appCard} onPress={() => navigation.openModule('ScholarshipApplication', { applicationId: a.id })}>
              <View style={styles.rowTop}>
                <View style={[styles.icon, { backgroundColor: sm.bg }]}>
                  <Text style={[styles.initial, { color: sm.color }]}>{a.student.name.charAt(0)}</Text>
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle}>{a.student.name}</Text>
                  <Text style={styles.rowMeta}>{a.student.rollNo} · {a.scholarship.name}</Text>
                </View>
                <StatusChip label={sm.label} color={sm.color} backgroundColor={sm.bg} />
              </View>
              <View style={styles.appFoot}>
                <Text style={styles.appAmount}>
                  {a.grantedRupees > 0 ? rupees(a.grantedRupees) : `${rupees(a.requestedRupees)} asked`}
                </Text>
                <View style={[styles.pill, { backgroundColor: bm.bg }]}>
                  <Text style={[styles.pillText, { color: bm.color }]}>{bm.label}</Text>
                </View>
              </View>
              {a.balanceRupees > 0 && a.status === 'APPROVED' ? (
                <Text style={styles.appWarn}>{rupees(a.balanceRupees)} approved but not yet released</Text>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9', padding: 24 },
  muted: { marginTop: 12, fontSize: 14, color: '#64748b' },
  errorText: { marginTop: 12, fontSize: 14, color: RED, textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700' },
  hero: { marginBottom: 12 },
  heroLabel: { fontSize: 12, color: '#64748b' },
  heroValue: { fontSize: 30, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  heroSplit: { flexDirection: 'row', marginTop: 12, gap: 12 },
  heroSplitItem: { flex: 1 },
  heroSplitLabel: { fontSize: 10, color: '#64748b' },
  heroSplitValue: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginTop: 2 },
  deskBtns: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  deskBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#eef2f7', borderRadius: 12, paddingVertical: 11 },
  deskBtnWarn: { borderColor: '#fde68a', backgroundColor: '#fffbeb' },
  deskBtnText: { fontSize: 12, fontWeight: '700', color: THEME },
  statRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#eef2f7', padding: 12 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginTop: 6 },
  statLabel: { fontSize: 10, color: '#64748b', marginTop: 1 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 10, marginTop: 4 },
  schemeCard: { marginBottom: 10 },
  appCard: { marginBottom: 10 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 15, fontWeight: '800' },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  rowMeta: { fontSize: 11, color: '#64748b', marginTop: 1 },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7 },
  pillText: { fontSize: 10, fontWeight: '700' },
  budgetRow: { marginTop: 10 },
  budgetBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  budgetFill: { height: 6, borderRadius: 3 },
  budgetText: { fontSize: 10, color: '#64748b', marginTop: 5 },
  tagRow: { flexDirection: 'row', gap: 5, marginTop: 8 },
  tagText: { fontSize: 10, color: '#94a3b8' },
  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9, backgroundColor: '#eef2f7' },
  filterChipActive: { backgroundColor: THEME },
  filterText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  filterTextActive: { color: '#fff' },
  appFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  appAmount: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  appWarn: { fontSize: 10, color: AMBER, marginTop: 6 },
});