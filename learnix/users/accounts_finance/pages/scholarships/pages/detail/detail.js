// F-08 Scholarships — detail (docs/users/06 §3.7).
// Sub-page 6 levels deep from `users/`, so every relative import is `../../../../../../`.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonCard, StatusChip } from '../../../../../../components/ui';
import {
  THEME, GREEN, RED, rupees, compactRupees, statusMeta, typeMeta, amountLabel,
  schemeStatusMeta, utilisationTone,
} from '../../scholarshipsMeta';

export default function ScholarshipDetail({ navigation, route }) {
  const schemeId = route?.params?.schemeId;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setData(await accountsApi.scholarshipDetail(schemeId));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [schemeId]);

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

  if (!data) {
    return <EmptyState icon="ribbon-outline" title="Not found" message="This scheme is no longer available." />;
  }

  const t = typeMeta[data.type] ?? {};
  const ss = schemeStatusMeta(data.status);
  const apps = data.applications ?? [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
    >
      <AnimatedCard style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={[styles.icon, { backgroundColor: (t.color ?? THEME) + '14' }]}>
            <Ionicons name={t.icon ?? 'ribbon-outline'} size={20} color={t.color ?? THEME} />
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{data.name}</Text>
            <Text style={styles.meta}>{t.label} · {data.academicYear}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: ss.bg }]}>
            <Text style={[styles.pillText, { color: ss.color }]}>{ss.label}</Text>
          </View>
        </View>
        {data.description ? <Text style={styles.desc}>{data.description}</Text> : null}
        <View style={styles.modeRow}>
          <Ionicons name="cash-outline" size={14} color={THEME} />
          <Text style={styles.modeText}>{amountLabel(data)}</Text>
          {data.capacity !== null ? <Text style={styles.modeSub}>· max {data.capacity} awards</Text> : null}
        </View>
        {data.opensAt || data.closesAt ? (
          <Text style={styles.window}>Window: {data.opensAt ?? 'open'} → {data.closesAt ?? 'no close date'}</Text>
        ) : null}
      </AnimatedCard>

      {/* The fund: promised vs paid out, and what is left. */}
      <AnimatedCard style={styles.card}>
        <Text style={styles.sectionTitle}>The fund</Text>
        {data.budgetRupees !== null ? (
          <>
            <View style={styles.budgetBar}>
              <View style={[styles.budgetFill, { width: `${Math.min(100, data.utilisationPercent ?? 0)}%`, backgroundColor: utilisationTone(data.utilisationPercent) }]} />
            </View>
            <Text style={styles.budgetLine}>{data.utilisationPercent ?? 0}% committed</Text>
          </>
        ) : (
          <Text style={styles.muted}>No budget ceiling — this scheme is uncapped.</Text>
        )}
        <View style={styles.grid}>
          <Cell label="Fund" value={data.budgetRupees !== null ? compactRupees(data.budgetRupees) : '—'} />
          <Cell label="Promised" value={compactRupees(data.committedRupees)} />
          <Cell label="Paid out" value={compactRupees(data.disbursedRupees)} tone={GREEN} />
          <Cell label="Headroom" value={data.headroomRupees !== null ? compactRupees(data.headroomRupees) : '—'} tone={THEME} />
        </View>
      </AnimatedCard>

      <AnimatedCard style={styles.card}>
        <Text style={styles.sectionTitle}>Eligibility rules ({data.rules?.length ?? 0})</Text>
        {(data.rules ?? []).length === 0 ? (
          <Text style={styles.muted}>No rules — every eligible student qualifies.</Text>
        ) : (
          (data.rules ?? []).map((r, i) => (
            <View key={`${r.operator}-${i}`} style={styles.ruleRow}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#64748b" />
              <Text style={styles.ruleText}>{describeRule(r)}</Text>
            </View>
          ))
        )}
      </AnimatedCard>

      <AnimatedCard style={styles.card}>
        <Text style={styles.sectionTitle}>Required documents ({data.requiredDocuments?.length ?? 0})</Text>
        <View style={styles.docWrap}>
          {(data.requiredDocuments ?? []).map((c) => (
            <View key={c} style={styles.docChip}>
              <Text style={styles.docChipText}>{c.replace(/_/g, ' ').toLowerCase()}</Text>
            </View>
          ))}
        </View>
      </AnimatedCard>

      <Text style={styles.sectionTitle}>Applications ({apps.length})</Text>
      {apps.length === 0 ? (
        <EmptyState icon="document-text-outline" title="No applications" message="Nobody has applied to this scheme yet." />
      ) : (
        apps.map((a) => {
          const sm = statusMeta(a.status);
          return (
            <AnimatedCard key={a.id} style={styles.appRow} onPress={() => navigation.openModule('ScholarshipApplication', { applicationId: a.id })}>
              <View style={styles.info}>
                <Text style={styles.appName}>{a.student.name}</Text>
                <Text style={styles.appMeta}>{a.student.rollNo} · applied {a.appliedAt ?? '—'}</Text>
              </View>
              <View style={styles.appRight}>
                <Text style={styles.appAmount}>{a.grantedRupees > 0 ? rupees(a.grantedRupees) : rupees(a.requestedRupees)}</Text>
                <StatusChip label={sm.label} color={sm.color} backgroundColor={sm.bg} />
              </View>
            </AnimatedCard>
          );
        })
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.openModule('ScholarshipApply', { schemeId: data.id })}>
          <Ionicons name="add-circle-outline" size={16} color="#fff" />
          <Text style={styles.primaryText}>Record an application</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function describeRule(r) {
  switch (r.operator) {
    case 'MIN_PERCENT': return `Aggregate of at least ${r.value}%`;
    case 'MAX_FAMILY_INCOME': return `Declared family income at most ${rupees(r.value / 100)}`;
    case 'MIN_SEMESTER': return `From semester ${r.value}`;
    case 'MAX_SEMESTER': return `Up to semester ${r.value}`;
    case 'GENDER': return `Gender: ${(r.gender ?? 'ANY').toLowerCase()}`;
    case 'ACTIVE_STUDENT': return 'Must be an active student';
    default: return r.operator;
  }
}

function Cell({ label, value, tone }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.cellLabel}>{label}</Text>
      <Text style={[styles.cellValue, tone ? { color: tone } : null]}>{value}</Text>
    </View>
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
  muted: { fontSize: 11, color: '#64748b' },
  hero: { marginBottom: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  meta: { fontSize: 11, color: '#64748b', marginTop: 1 },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7 },
  pillText: { fontSize: 10, fontWeight: '700' },
  desc: { fontSize: 12, color: '#475569', marginTop: 10, lineHeight: 18 },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  modeText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  modeSub: { fontSize: 11, color: '#64748b' },
  window: { fontSize: 10, color: '#94a3b8', marginTop: 6 },
  card: { marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  budgetBar: { height: 7, borderRadius: 4, backgroundColor: '#eef2f7', overflow: 'hidden' },
  budgetFill: { height: 7, borderRadius: 4 },
  budgetLine: { fontSize: 10, color: '#64748b', marginTop: 5 },
  grid: { flexDirection: 'row', marginTop: 10 },
  cell: { width: '25%' },
  cellLabel: { fontSize: 10, color: '#64748b' },
  cellValue: { fontSize: 13, fontWeight: '800', color: '#0f172a', marginTop: 1 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  ruleText: { fontSize: 12, color: '#0f172a' },
  docWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  docChip: { backgroundColor: '#eef2f7', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  docChipText: { fontSize: 11, color: '#475569' },
  appRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  appName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  appMeta: { fontSize: 10, color: '#64748b', marginTop: 1 },
  appRight: { alignItems: 'flex-end', gap: 4 },
  appAmount: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  actions: { marginTop: 8 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: THEME, borderRadius: 12, paddingVertical: 13 },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
