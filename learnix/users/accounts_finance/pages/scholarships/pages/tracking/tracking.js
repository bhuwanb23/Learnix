// F-08 Scholarships — tracking (docs/users/06 §3.7).
// Sub-page 6 levels deep from `users/`, so every relative import is `../../../../../../`.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonCard } from '../../../../../../components/ui';
import { THEME, AMBER, GREEN, RED, rupees, compactRupees, typeMeta, amountLabel, utilisationTone } from '../../scholarshipsMeta';

export default function ScholarshipTracking({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setData(await accountsApi.scholarshipTracking());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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

  const totals = data?.totals ?? {};
  const schemes = data?.schemes ?? [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
    >
      {/* Promised vs released is the whole question this screen answers: how much
          has the institution actually given away, and how much is still only a
          promise on paper? */}
      <AnimatedCard style={styles.hero}>
        <Text style={styles.heroLabel}>Total released to students</Text>
        <Text style={styles.heroValue}>{rupees(totals.disbursedRupees ?? 0)}</Text>
        <View style={styles.heroGrid}>
          <Cell label="Total funds" value={compactRupees(totals.budgetRupees ?? 0)} />
          <Cell label="Promised" value={compactRupees(totals.awardedRupees ?? 0)} />
          <Cell label="Still to release" value={compactRupees((totals.awardedRupees ?? 0) - (totals.disbursedRupees ?? 0))} tone={AMBER} />
          <Cell label="Unspent fund" value={compactRupees(totals.headroomRupees ?? 0)} tone={GREEN} />
        </View>
      </AnimatedCard>

      {schemes.length === 0 ? (
        <EmptyState icon="stats-chart-outline" title="Nothing to track" message="Create a scholarship scheme first." />
      ) : (
        schemes.map((s) => {
          const t = typeMeta[s.type] ?? {};
          const releasedPct = s.disbursementPercent ?? 0;
          return (
            <AnimatedCard key={s.schemeId} style={styles.card} onPress={() => navigation.openModule('ScholarshipDetail', { schemeId: s.schemeId })}>
              <View style={styles.rowTop}>
                <View style={[styles.icon, { backgroundColor: (t.color ?? THEME) + '14' }]}>
                  <Ionicons name={t.icon ?? 'ribbon-outline'} size={17} color={t.color ?? THEME} />
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{s.name}</Text>
                  <Text style={styles.meta}>{t.label} · {amountLabel(s)} · {s.academicYear}</Text>
                </View>
              </View>

              {s.budgetRupees !== null ? (
                <>
                  <View style={styles.bar}>
                    <View style={[styles.fill, { width: `${Math.min(100, s.utilisationPercent ?? 0)}%`, backgroundColor: utilisationTone(s.utilisationPercent) }]} />
                  </View>
                  <View style={styles.barLabels}>
                    <Text style={styles.barLabel}>{s.utilisationPercent ?? 0}% of fund committed</Text>
                    <Text style={styles.barLabel}>{releasedPct}% released</Text>
                  </View>
                </>
              ) : (
                <Text style={styles.muted}>Uncapped fund</Text>
              )}

              <View style={styles.grid}>
                <Cell label="Promised" value={compactRupees(s.committedRupees)} />
                <Cell label="Released" value={compactRupees(s.disbursedRupees)} tone={GREEN} />
                <Cell label="Headroom" value={s.headroomRupees !== null ? compactRupees(s.headroomRupees) : '—'} tone={THEME} />
                <Cell label="Awards" value={String(s.awardsCount)} />
              </View>

              {releasedPct > 0 && releasedPct < 100 ? (
                <View style={styles.warnRow}>
                  <Ionicons name="alert-circle-outline" size={13} color={AMBER} />
                  <Text style={styles.warnText}>{100 - releasedPct}% approved but not yet released</Text>
                </View>
              ) : null}
            </AnimatedCard>
          );
        })
      )}
    </ScrollView>
  );
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
  hero: { marginBottom: 14 },
  heroLabel: { fontSize: 12, color: '#64748b' },
  heroValue: { fontSize: 30, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  heroGrid: { flexDirection: 'row', marginTop: 12 },
  card: { marginBottom: 10 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  meta: { fontSize: 11, color: '#64748b', marginTop: 1 },
  bar: { height: 7, borderRadius: 4, backgroundColor: '#eef2f7', overflow: 'hidden', marginTop: 10 },
  fill: { height: 7, borderRadius: 4 },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  barLabel: { fontSize: 10, color: '#64748b' },
  grid: { flexDirection: 'row', marginTop: 12 },
  cell: { width: '25%' },
  cellLabel: { fontSize: 10, color: '#64748b' },
  cellValue: { fontSize: 13, fontWeight: '800', color: '#0f172a', marginTop: 1 },
  warnRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  warnText: { fontSize: 11, color: AMBER, fontWeight: '600' },
});
