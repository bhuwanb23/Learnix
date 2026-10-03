import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonStatRow, SkeletonCard } from '../../../../../components/ui';
import { THEME, procurementMeta, formatDate, relativeTime } from '../requestMeta';

const FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'REQUESTED', label: 'To order' },
  { id: 'ORDERED', label: 'Ordered' },
  { id: 'RECEIVED', label: 'Received' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

export default function ProcurementDesk({ navigation, route }) {
  const initial = route?.params?.filter;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState(
    FILTERS.some((f) => f.id === initial) ? initial : 'ALL',
  );

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setData(await libraryApi.procurements({ status }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status]);

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
  const rows = data?.procurements || [];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
    >
      <AnimatedCard delay={0} style={[styles.block, styles.statsRow]}>
        {[
          { label: 'To order', value: stats.requested ?? 0, color: '#d97706' },
          { label: 'On order', value: stats.ordered ?? 0, color: '#2563eb' },
          { label: 'Received', value: stats.received ?? 0, color: '#059669' },
        ].map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && <View style={styles.statDivider} />}
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: s.value === 0 ? '#cbd5e1' : s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          </React.Fragment>
        ))}
      </AnimatedCard>

      {(stats.totalSpendRupees ?? 0) > 0 ? (
        <AnimatedCard delay={60} style={[styles.block, styles.spendCard]}>
          <View style={styles.spendRow}>
            <View style={styles.spendIcon}>
              <Ionicons name="wallet-outline" size={17} color="#059669" />
            </View>
            <View style={styles.spendBody}>
              <Text style={styles.spendValue}>₹{(stats.totalSpendRupees ?? 0).toLocaleString()}</Text>
              <Text style={styles.spendLabel}>
                recorded across {stats.total ?? 0} purchase{(stats.total ?? 0) === 1 ? '' : 's'} ·{' '}
                {stats.copiesReceived ?? 0} cop{(stats.copiesReceived ?? 0) === 1 ? 'y' : 'ies'} shelved
              </Text>
            </View>
          </View>
        </AnimatedCard>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
        <View style={styles.chipsRow}>
          {FILTERS.map((f) => {
            const count = f.id === 'ALL' ? stats.total : stats[f.id.toLowerCase()];
            const meta = f.id === 'ALL' ? null : procurementMeta(f.id);
            const active = status === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.chip,
                  active && { backgroundColor: meta ? meta.color : THEME, borderColor: meta ? meta.color : THEME },
                ]}
                onPress={() => setStatus(f.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {f.label} · {count ?? 0}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {rows.length === 0 ? (
        <EmptyState
          icon={status === 'ALL' ? 'cube-outline' : 'funnel-outline'}
          title={status === 'ALL' ? 'No purchases raised' : 'Nothing in this stage'}
          subtitle={
            status === 'ALL'
              ? 'Approving a student request raises a purchase you can order and then receive here.'
              : 'Change the filter to see other stages.'
          }
          color={THEME}
        />
      ) : (
        rows.map((p, idx) => {
          const meta = procurementMeta(p.status);
          return (
            <AnimatedCard
              key={p.id}
              delay={120 + idx * 45}
              style={styles.block}
              onPress={() => navigation.openModule('ProcurementDetail', { procurementId: p.id })}
            >
              <View style={styles.row}>
                <View style={[styles.rowIcon, { backgroundColor: meta.bg }]}>
                  <Ionicons name={meta.icon} size={18} color={meta.color} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{p.title}</Text>
                  {p.author ? <Text style={styles.rowAuthor} numberOfLines={1}>{p.author}</Text> : null}
                  <View style={styles.chipRow}>
                    <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
                      <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                    <View style={styles.plainChip}>
                      <Text style={styles.plainText}>
                        {p.copies} cop{p.copies === 1 ? 'y' : 'ies'}
                      </Text>
                    </View>
                    {p.costRupees > 0 ? (
                      <View style={styles.plainChip}>
                        <Text style={styles.plainText}>₹{p.costRupees.toLocaleString()}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.rowSub}>
                    {p.requestedBy ? `${p.requestedBy} (${p.requestedByRollNo})` : 'No linked request'}
                    {' · raised '}
                    {relativeTime(p.createdAt)}
                  </Text>
                </View>
                <View style={styles.rowRight}>
                  {p.nextStatus ? (
                    <View style={[styles.nextPill, { backgroundColor: meta.color + '14' }]}>
                      <Text style={[styles.nextText, { color: meta.color }]}>
                        {procurementMeta(p.nextStatus).label}
                      </Text>
                    </View>
                  ) : p.bookId ? (
                    <View style={[styles.nextPill, { backgroundColor: '#f0fdf4' }]}>
                      <Ionicons name="checkmark-circle" size={13} color="#059669" />
                    </View>
                  ) : null}
                </View>
              </View>
            </AnimatedCard>
          );
        })
      )}

      <AnimatedCard delay={400} style={styles.block}>
        <View style={styles.noteRow}>
          <Ionicons name="information-circle-outline" size={15} color="#2563eb" />
          <Text style={styles.noteText}>
            Receiving a purchase creates the catalog entry, shelves {stats.copiesReceived ?? 0} cop
            {(stats.copiesReceived ?? 0) === 1 ? 'y' : 'ies'} so far, tells the requesting student, and — if arrival
            announcements are switched on in Library Settings — broadcasts to all students.
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

  statsRow: { flexDirection: 'row' },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4 },
  statDivider: { width: 1, backgroundColor: '#eef2f7', marginVertical: 8 },
  statValue: { fontSize: 19, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold' },
  statLabel: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },

  spendCard: { padding: 14 },
  spendRow: { flexDirection: 'row', alignItems: 'center' },
  spendIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  spendBody: { flex: 1 },
  spendValue: { fontSize: 17, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  spendLabel: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },

  chipsScroll: { flexGrow: 0, marginHorizontal: -24, marginTop: 14, marginBottom: 12 },
  chipsRow: { flexDirection: 'row', paddingHorizontal: 24 },
  chip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', marginRight: 8 },
  chipText: { fontSize: 12, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  chipTextActive: { color: '#fff' },

  row: { flexDirection: 'row', alignItems: 'flex-start', padding: 14 },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  rowAuthor: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  rowSub: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 7 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  statusText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  plainChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, backgroundColor: '#f1f5f9' },
  plainText: { fontSize: 10, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  rowRight: { marginLeft: 8, alignItems: 'flex-end' },
  nextPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9 },
  nextText: { fontSize: 9, fontWeight: '700', fontFamily: 'Manrope-Bold' },

  noteRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14 },
  noteText: { flex: 1, fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium', lineHeight: 16, marginLeft: 9 },
});
