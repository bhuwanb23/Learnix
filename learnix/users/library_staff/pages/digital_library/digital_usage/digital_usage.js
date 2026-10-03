import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonCard, SkeletonStatRow } from '../../../../../components/ui';
import { THEME, typeMeta } from '../resourceMeta';

const ACCESS_ICONS = { OPEN: 'eye-outline', DOWNLOAD: 'download-outline', VIEW: 'browse-outline' };
const ACCESS_LABELS = { OPEN: 'Opens', DOWNLOAD: 'Downloads', VIEW: 'Views' };

export default function DigitalUsage({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await libraryApi.digitalUsage();
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

  const stats = data || {};
  const bySubject = stats.bySubject || [];
  const topResources = stats.topResources || [];
  const maxSubject = bySubject.length ? bySubject[0].accesses : 0;
  const maxTop = topResources.length ? topResources[0].accessCount : 0;
  const accessEntries = Object.entries(stats.byType || {}).filter(([, v]) => v > 0);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
    >
      <AnimatedCard delay={0} style={[styles.block, styles.statsRow]}>
        {[
          { label: 'Opens', value: stats.totalAccesses ?? 0, icon: 'eye', color: THEME },
          { label: 'Avg/Resource', value: stats.averagePerResource ?? 0, icon: 'calculator', color: '#2563eb' },
          { label: 'Unused', value: stats.unusedResources ?? 0, icon: 'alert-circle', color: '#dc2626' },
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

      <AnimatedCard delay={60} style={[styles.block, styles.scopeCard]}>
        <View style={styles.scopeRow}>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>{stats.resourceCount ?? 0} resources tracked</Text>
            <Text style={styles.rowSub}>
              {accessEntries.length
                ? accessEntries.map(([k, v]) => `${v} ${ACCESS_LABELS[k]?.toLowerCase() ?? k.toLowerCase()}`).join(' · ')
                : 'No access recorded yet'}
            </Text>
          </View>
        </View>
      </AnimatedCard>

      {/* By subject */}
      <Text style={styles.sectionLabel}>Access by Subject</Text>
      {bySubject.length === 0 ? (
        <EmptyState
          icon="bar-chart-outline"
          title="No usage data yet"
          subtitle="Opens and downloads will appear here once students start reading."
          color={THEME}
        />
      ) : (
        <AnimatedCard delay={120} style={styles.block}>
          {bySubject.map((s, i) => (
            <View key={s.subject} style={styles.barRow}>
              <Text style={styles.barLabel} numberOfLines={1}>{s.subject}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${maxSubject ? Math.max(8, (s.accesses / maxSubject) * 100) : 0}%`,
                      backgroundColor: i === 0 ? THEME : THEME + '80',
                    },
                  ]}
                />
              </View>
              <Text style={styles.barValue}>{s.accesses}</Text>
            </View>
          ))}
        </AnimatedCard>
      )}

      {/* Top resources */}
      {topResources.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Most Used</Text>
          {topResources.map((r, idx) => {
            const meta = typeMeta(r.type);
            return (
              <AnimatedCard
                key={r.id}
                delay={160 + idx * 40}
                style={styles.block}
                onPress={() => navigation.openModule('ResourceDetail', { resourceId: r.id })}
              >
                <View style={styles.topRow}>
                  <Text style={[styles.rank, idx < 3 && { color: meta.color }]}>{idx + 1}</Text>
                  <View style={[styles.topIcon, { backgroundColor: meta.color + '14' }]}>
                    <Ionicons name={meta.icon} size={16} color={meta.color} />
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{r.title}</Text>
                    <View style={styles.topTrack}>
                      <View
                        style={[
                          styles.topFill,
                          { width: `${maxTop ? Math.max(6, (r.accessCount / maxTop) * 100) : 0}%`, backgroundColor: meta.color },
                        ]}
                      />
                    </View>
                  </View>
                  <Text style={[styles.topCount, r.accessCount === 0 && { color: '#cbd5e1' }]}>{r.accessCount}</Text>
                </View>
              </AnimatedCard>
            );
          })}
        </>
      )}

      {stats.unusedResources > 0 && (
        <AnimatedCard delay={260} style={[styles.block, styles.warnBox]}>
          <View style={styles.warnRow}>
            <Ionicons name="alert-circle-outline" size={18} color="#d97706" />
            <Text style={styles.warnText}>
              {stats.unusedResources} resource{stats.unusedResources === 1 ? ' has' : 's have'} never been opened. Review whether they belong on the shelf or need better visibility.
            </Text>
          </View>
        </AnimatedCard>
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
  rowBody: { flex: 1 },

  statsRow: { flexDirection: 'row' },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6 },
  statDivider: { width: 1, backgroundColor: '#eef2f7', marginVertical: 8 },
  statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 16, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },

  scopeCard: { padding: 14 },
  scopeRow: { flexDirection: 'row', alignItems: 'center' },
  rowTitle: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  rowSub: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },

  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginTop: 18, marginBottom: 10 },

  // Bars
  barRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  barLabel: { width: 96, fontSize: 11, fontWeight: '600', color: '#475569', fontFamily: 'Manrope-SemiBold' },
  barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: '#eef2f7', marginHorizontal: 10, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  barValue: { width: 30, textAlign: 'right', fontSize: 11, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },

  // Top list
  topRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  rank: { width: 20, fontSize: 13, fontWeight: '800', color: '#cbd5e1', fontFamily: 'PlusJakartaSans-Bold' },
  topIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginHorizontal: 10 },
  topTrack: { height: 5, borderRadius: 3, backgroundColor: '#eef2f7', marginTop: 6, overflow: 'hidden' },
  topFill: { height: '100%', borderRadius: 3 },
  topCount: { fontSize: 14, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginLeft: 10, minWidth: 28, textAlign: 'right' },

  warnBox: { padding: 12, marginTop: 8 },
  warnRow: { flexDirection: 'row', alignItems: 'flex-start' },
  warnText: { flex: 1, fontSize: 11, color: '#92400e', fontFamily: 'Manrope-Medium', lineHeight: 16, marginLeft: 9 },
});