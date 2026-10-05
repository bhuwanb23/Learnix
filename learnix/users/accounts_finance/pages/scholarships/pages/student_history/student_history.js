// F-08 Scholarships — student history (docs/users/06 §3.7).
// Sub-page 6 levels deep from `users/`, so every relative import is `../../../../../../`.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonCard, StatusChip } from '../../../../../../components/ui';
import { THEME, AMBER, GREEN, RED, rupees, statusMeta, bandMeta } from '../../scholarshipsMeta';

export default function ScholarshipStudentHistory({ navigation, route }) {
  const studentProfileId = route?.params?.studentProfileId;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setData(await accountsApi.studentScholarshipHistory(studentProfileId));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [studentProfileId]);

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
    return <EmptyState icon="person-outline" title="Not found" message="This student is not in your institution." />;
  }

  const t = data.totals ?? {};
  const apps = data.applications ?? [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
    >
      <AnimatedCard style={styles.hero}>
        <Text style={styles.heroName}>{data.student?.name}</Text>
        <Text style={styles.heroMeta}>{data.student?.rollNo} · semester {data.student?.currentSemester ?? '—'}</Text>
        <View style={styles.grid}>
          <Cell label="Awarded" value={rupees(t.awardedRupees ?? 0)} />
          <Cell label="Received" value={rupees(t.receivedRupees ?? 0)} tone={GREEN} />
          <Cell label="Awaiting" value={rupees(t.awaitingRupees ?? 0)} tone={AMBER} />
          <Cell label="Still owes" value={rupees(t.outstandingRupees ?? 0)} tone={RED} />
        </View>
      </AnimatedCard>

      <Text style={styles.sectionTitle}>Every application ({apps.length})</Text>
      {apps.length === 0 ? (
        <EmptyState icon="ribbon-outline" title="No applications" message="This student has never applied for a scholarship." />
      ) : (
        apps.map((a) => {
          const sm = statusMeta(a.status);
          const bm = bandMeta(a.awardedRupees > 0 && a.receivedRupees >= a.awardedRupees ? 'SETTLED' : a.receivedRupees > 0 ? 'PARTIAL' : a.awardedRupees > 0 ? 'PENDING' : 'NOT_STARTED');
          return (
            <AnimatedCard key={a.id} style={styles.card} onPress={() => navigation.openModule('ScholarshipApplication', { applicationId: a.id })}>
              <View style={styles.rowTop}>
                <View style={styles.info}>
                  <Text style={styles.name}>{a.scheme}</Text>
                  <Text style={styles.meta}>{a.academicYear} · applied {a.appliedAt ?? '—'}</Text>
                </View>
                <StatusChip label={sm.label} color={sm.color} backgroundColor={sm.bg} />
              </View>
              <View style={styles.foot}>
                <Text style={styles.amount}>
                  {a.receivedRupees > 0 ? `${rupees(a.receivedRupees)} received` : `${rupees(a.awardedRupees)} awarded`}
                </Text>
                <View style={[styles.pill, { backgroundColor: bm.bg }]}>
                  <Text style={[styles.pillText, { color: bm.color }]}>{bm.label}</Text>
                </View>
              </View>
              {a.creditedAgainst?.length ? (
                <Text style={styles.note}>
                  Credited against {a.creditedAgainst.map((c) => c.dueTitle).join(', ')}
                </Text>
              ) : null}
              {a.rejectedReason ? <Text style={styles.reject}>Rejected: {a.rejectedReason}</Text> : null}
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
  hero: { marginBottom: 14 },
  heroName: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  heroMeta: { fontSize: 11, color: '#64748b', marginTop: 2 },
  grid: { flexDirection: 'row', marginTop: 12 },
  cell: { width: '25%' },
  cellLabel: { fontSize: 10, color: '#64748b' },
  cellValue: { fontSize: 12, fontWeight: '800', color: '#0f172a', marginTop: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  card: { marginBottom: 10 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  info: { flex: 1 },
  name: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  meta: { fontSize: 11, color: '#64748b', marginTop: 1 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  amount: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7 },
  pillText: { fontSize: 10, fontWeight: '700' },
  note: { fontSize: 10, color: '#94a3b8', marginTop: 8 },
  reject: { fontSize: 11, color: RED, marginTop: 6 },
});
