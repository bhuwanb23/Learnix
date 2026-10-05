// F-08 Scholarships — documents (docs/users/06 §3.7).
// Sub-page 6 levels deep from `users/`, so every relative import is `../../../../../../`.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonCard } from '../../../../../../components/ui';
import { THEME, AMBER, RED, rupees, statusMeta } from '../../scholarshipsMeta';

// Every application that has a document still to verify or fix. This is the
// chase list — the screen a desk actually works from, rather than one row at a
// time inside an application.
export default function ScholarshipDocuments({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setData(await accountsApi.scholarshipApplications());
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

  const rows = (data?.applications ?? []).filter((a) => !['DISBURSED', 'REJECTED', 'WITHDRAWN'].includes(a.status));
  const pendingTotal = rows.reduce((n, a) => n + a.requestedRupees, 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
    >
      <AnimatedCard style={styles.hero}>
        <Text style={styles.heroTitle}>Open applications</Text>
        <Text style={styles.heroValue}>{rows.length}</Text>
        <Text style={styles.heroSub}>{rupees(pendingTotal)} still under consideration</Text>
      </AnimatedCard>

      {rows.length === 0 ? (
        <EmptyState icon="checkmark-done-outline" title="Nothing outstanding" message="Every application has been decided." />
      ) : (
        rows.map((a) => {
          const sm = statusMeta(a.status);
          return (
            <AnimatedCard
              key={a.id}
              style={styles.card}
              onPress={() => navigation.openModule('ScholarshipApplication', { applicationId: a.id })}
            >
              <View style={styles.rowTop}>
                <View style={[styles.avatar, { backgroundColor: sm.bg }]}>
                  <Text style={[styles.initial, { color: sm.color }]}>{a.student.name.charAt(0)}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{a.student.name}</Text>
                  <Text style={styles.meta}>{a.student.rollNo} · {a.scholarship.name}</Text>
                </View>
                <View style={[styles.pill, { backgroundColor: sm.bg }]}>
                  <Text style={[styles.pillText, { color: sm.color }]}>{sm.label}</Text>
                </View>
              </View>
              <View style={styles.ctaRow}>
                <Ionicons name="folder-open-outline" size={13} color={AMBER} />
                <Text style={styles.ctaText}>Open to verify documents and decide</Text>
                <Ionicons name="chevron-forward" size={14} color="#94a3b8" />
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
  content: { padding: 16, paddingBottom: 40 },
  wrap: { flex: 1, backgroundColor: '#f5f7f9', padding: 16, gap: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#f5f7f9' },
  error: { marginTop: 12, color: RED, textAlign: 'center' },
  retry: { marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700' },
  hero: { marginBottom: 14 },
  heroTitle: { fontSize: 12, color: '#64748b' },
  heroValue: { fontSize: 30, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  heroSub: { fontSize: 11, color: AMBER, marginTop: 4 },
  card: { marginBottom: 10 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 15, fontWeight: '800' },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  meta: { fontSize: 11, color: '#64748b', marginTop: 1 },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7 },
  pillText: { fontSize: 10, fontWeight: '700' },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  ctaText: { flex: 1, fontSize: 11, color: AMBER, fontWeight: '600' },
});
