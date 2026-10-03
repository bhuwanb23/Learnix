import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../../services/api';
import { AnimatedCard, SkeletonStatRow, SkeletonCard } from '../../../../../components/ui';
import { THEME, audienceMeta, formatDate } from '../notificationMeta';

export default function AudienceInsights({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await libraryApi.notificationInsights();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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

  const lib = data?.library || {};
  const audiences = data?.audiences || [];
  const totalStudents = lib.totalStudents || 0;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
    >
      {/* Coverage */}
      <AnimatedCard delay={0} style={styles.block}>
        <Text style={styles.cardLabel}>Overdue Coverage</Text>
        <View style={styles.coverageRow}>
          <Text style={styles.coverageValue}>{lib.overdueCoveragePct ?? 0}%</Text>
          <Text style={styles.coverageSub}>
            {lib.overdueLoans ?? 0} of {lib.activeLoans ?? 0} active loans are overdue
          </Text>
        </View>
        <View style={styles.track}>
          <View style={[
            styles.fill,
            { width: `${Math.min(100, lib.overdueCoveragePct ?? 0)}%`, backgroundColor: '#dc2626' },
          ]} />
        </View>
      </AnimatedCard>

      {/* Library pulse */}
      <AnimatedCard delay={60} style={[styles.block, styles.statsRow]}>
        {[
          { label: 'Students', value: totalStudents, icon: 'people', color: THEME },
          { label: 'On Loan', value: lib.activeLoans ?? 0, icon: 'book', color: '#2563eb' },
          { label: 'Requests', value: lib.pendingRequests ?? 0, icon: 'cart', color: '#d97706' },
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

      {/* Audiences */}
      <Text style={styles.sectionLabel}>Broadcast Audiences</Text>
      {audiences.map((a, idx) => {
        const meta = audienceMeta(a.id);
        const pct = totalStudents ? Math.round((a.recipients / totalStudents) * 100) : 0;
        return (
          <AnimatedCard key={a.id} delay={120 + idx * 50} style={styles.block}>
            <View style={styles.audRow}>
              <View style={[styles.audIcon, { backgroundColor: meta.bg }]}>
                <Ionicons name={meta.icon} size={19} color={meta.color} />
              </View>
              <View style={styles.audBody}>
                <Text style={styles.audLabel}>{a.label}</Text>
                <Text style={styles.audDesc}>{a.description}</Text>
              </View>
              <View style={styles.audCount}>
                <Text style={[styles.audValue, { color: a.recipients === 0 ? '#cbd5e1' : meta.color }]}>
                  {a.recipients}
                </Text>
                <Text style={styles.audPct}>{pct}%</Text>
              </View>
            </View>

            <View style={styles.track}>
              <View style={[styles.fill, { width: `${pct}%`, backgroundColor: meta.color }]} />
            </View>

            <TouchableOpacity
              style={[styles.broadcastBtn, a.recipients === 0 && styles.broadcastBtnDisabled]}
              onPress={() => navigation.openModule('ComposeBroadcast', { audience: a.id })}
              activeOpacity={0.85}
              disabled={a.recipients === 0}
            >
              <Ionicons name="megaphone-outline" size={14} color={THEME} />
              <Text style={styles.broadcastBtnText}>
                {a.recipients === 0 ? 'No recipients right now' : `Broadcast to ${a.label}`}
              </Text>
            </TouchableOpacity>
          </AnimatedCard>
        );
      })}

      <AnimatedCard delay={280} style={styles.block}>
        <View style={styles.noteRow}>
          <Ionicons name="information-circle-outline" size={16} color="#2563eb" />
          <Text style={styles.noteText}>
            Counts are resolved live from the circulation data. Overdue members are computed from loans past their due date, so this stays accurate without a nightly job.
          </Text>
        </View>
      </AnimatedCard>
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

  cardLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 },
  coverageRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  coverageValue: { fontSize: 30, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -1 },
  coverageSub: { flex: 1, fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular' },
  track: { height: 7, borderRadius: 4, backgroundColor: '#eef2f7', marginTop: 12, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },

  statsRow: { flexDirection: 'row', marginTop: 10 },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6 },
  statDivider: { width: 1, backgroundColor: '#eef2f7', marginVertical: 8 },
  statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 16, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  statLabel: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },

  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginTop: 18, marginBottom: 10 },

  audRow: { flexDirection: 'row', alignItems: 'center' },
  audIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  audBody: { flex: 1 },
  audLabel: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  audDesc: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  audCount: { alignItems: 'flex-end' },
  audValue: { fontSize: 18, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold' },
  audPct: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium' },

  broadcastBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 14, paddingVertical: 10, borderRadius: 11, backgroundColor: THEME + '12', borderWidth: 1, borderColor: THEME + '33' },
  broadcastBtnDisabled: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' },
  broadcastBtnText: { fontSize: 12, fontWeight: '700', color: THEME, fontFamily: 'Manrope-Bold' },

  noteRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14 },
  noteText: { flex: 1, fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium', lineHeight: 16, marginLeft: 9 },
});