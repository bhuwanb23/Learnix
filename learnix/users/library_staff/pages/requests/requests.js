import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../services/api';
import { AnimatedCard, SearchBar, EmptyState, SkeletonStatRow, SkeletonCard } from '../../../../components/ui';
import { THEME, statusMeta, relativeTime, waitingLabel, demandLabel } from './requestMeta';

const STATUS_FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'PROCURED', label: 'On shelf' },
  { id: 'REJECTED', label: 'Declined' },
];

const SORTS = [
  { id: 'NEWEST', icon: 'time-outline', label: 'Newest first' },
  { id: 'OLDEST', icon: 'hourglass-outline', label: 'Oldest first' },
  { id: 'STUDENT', icon: 'person-outline', label: 'By roll number' },
  { id: 'TITLE', icon: 'text-outline', label: 'By title' },
];

export default function RequestsModule({ navigation }) {
  const [data, setData] = useState(null);
  const [procure, setProcure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('ALL');
  const [sort, setSort] = useState('NEWEST');
  const [sortOpen, setSortOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [r, p] = await Promise.all([
        libraryApi.requests({ q, status, sort }),
        libraryApi.procurements(),
      ]);
      setData(r);
      setProcure(p);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [q, status, sort]);

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
  const requests = data?.requests || [];
  const topDemand = data?.topDemand || [];
  const pStats = procure?.stats || {};

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
    >
      {/* Procurement shortcut — approvals are not the end of the line */}
      <TouchableOpacity
        style={styles.procureCard}
        onPress={() => navigation.openModule('ProcurementDesk')}
        activeOpacity={0.85}
      >
        <View style={styles.procureTop}>
          <View style={styles.procureIcon}>
            <Ionicons name="cube-outline" size={19} color="#2563eb" />
          </View>
          <View style={styles.procureBody}>
            <Text style={styles.procureTitle}>Procurement</Text>
            <Text style={styles.procureSub}>
              {pStats.ordered ?? 0} on order · {pStats.copiesOnOrder ?? 0} cop{(pStats.copiesOnOrder ?? 0) === 1 ? 'y' : 'ies'} incoming
              {(pStats.received ?? 0) > 0 ? ` · ${pStats.received} received` : ''}
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color="#2563eb" />
        </View>
        {(pStats.ordered ?? 0) > 0 ? (
          <TouchableOpacity
            style={styles.receiveBtn}
            onPress={() => navigation.openModule('ProcurementDesk', { filter: 'ORDERED' })}
            activeOpacity={0.85}
          >
            <Ionicons name="download-outline" size={14} color="#059669" />
            <Text style={styles.receiveText}>Receive a delivery</Text>
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>

      {/* Stats */}
      <AnimatedCard delay={0} style={[styles.block, styles.statsRow]}>
        {[
          { label: 'Pending', value: stats.pending ?? 0, color: '#d97706' },
          { label: 'Approved', value: stats.approved ?? 0, color: '#059669' },
          { label: 'On shelf', value: stats.procured ?? 0, color: '#2563eb' },
          { label: 'Declined', value: stats.rejected ?? 0, color: '#dc2626' },
        ].map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && <View style={styles.statDivider} />}
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: (stats[s.label === 'On shelf' ? 'procured' : s.label.toLowerCase()] ?? 0) === 0 ? '#cbd5e1' : s.color }]}>
                {s.value}
              </Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          </React.Fragment>
        ))}
      </AnimatedCard>

      {/* Demand signal */}
      {topDemand.length > 0 ? (
        <AnimatedCard delay={60} style={styles.block}>
          <Text style={styles.cardLabel}>Most requested</Text>
          {topDemand.map((d, i) => (
            <View key={d.title}>
              <View style={styles.demandRow}>
                <View style={[styles.demandIcon, { backgroundColor: d.inCatalog ? '#f0fdf4' : '#fffbeb' }]}>
                  <Ionicons
                    name={d.inCatalog ? 'library-outline' : 'trending-up-outline'}
                    size={16}
                    color={d.inCatalog ? '#059669' : '#d97706'}
                  />
                </View>
                <View style={styles.demandBody}>
                  <Text style={styles.demandTitle} numberOfLines={1}>{d.title}</Text>
                  <Text style={styles.demandSub}>
                    {d.count} request{d.count === 1 ? '' : 's'} · {d.pending} still pending ·{' '}
                    {d.inCatalog ? 'already stocked' : 'not in catalog'}
                  </Text>
                </View>
              </View>
              {i < topDemand.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </AnimatedCard>
      ) : null}

      {/* Search + filters */}
      <SearchBar placeholder="Search title, author or student" onSearch={setQ} style={styles.search} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
        <View style={styles.chipsRow}>
          {STATUS_FILTERS.map((f) => {
            const count =
              f.id === 'ALL'
                ? stats.total
                : stats[f.id === 'PROCURED' ? 'procured' : f.id.toLowerCase()];
            const meta = f.id === 'ALL' ? null : statusMeta(f.id);
            const active = status === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.chip,
                  active && {
                    backgroundColor: meta ? meta.color : THEME,
                    borderColor: meta ? meta.color : THEME,
                  },
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

      {/* Sort */}
      <View style={styles.sortRow}>
        <Text style={styles.sortCount}>
          {requests.length} request{requests.length === 1 ? '' : 's'}
          {status !== 'ALL' ? ` · ${STATUS_FILTERS.find((f) => f.id === status)?.label}` : ''}
        </Text>
        <View style={styles.sortButtons}>
          {SORTS.slice(0, 2).map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.sortBtn, sort === s.id && styles.sortBtnActive]}
              onPress={() => setSort(s.id)}
              activeOpacity={0.8}
            >
              <Ionicons name={s.icon} size={14} color={sort === s.id ? '#fff' : '#64748b'} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.sortBtn, styles.sortBtnMenu, sortOpen && styles.sortBtnActive]}
            onPress={() => setSortOpen((v) => !v)}
            activeOpacity={0.8}
          >
            <Ionicons name="swap-vertical" size={14} color={sortOpen ? '#fff' : '#64748b'} />
          </TouchableOpacity>
        </View>
      </View>
      {sortOpen ? (
        <View style={styles.sortMenu}>
          {SORTS.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={styles.sortMenuItem}
              onPress={() => { setSort(s.id); setSortOpen(false); }}
              activeOpacity={0.7}
            >
              <Ionicons name={s.icon} size={14} color={sort === s.id ? THEME : '#64748b'} />
              <Text style={[styles.sortMenuText, sort === s.id && { color: THEME, fontFamily: 'Manrope-Bold' }]}>
                {s.label}
              </Text>
              {sort === s.id && <Ionicons name="checkmark" size={14} color={THEME} />}
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {/* List */}
      {requests.length === 0 ? (
        <EmptyState
          icon={q || status !== 'ALL' ? 'funnel-outline' : 'cart-outline'}
          title={q || status !== 'ALL' ? 'Nothing matches' : 'No book requests'}
          subtitle={
            q || status !== 'ALL'
              ? 'Try a different search or status filter.'
              : 'When students ask for titles the library does not stock, they land here for a decision.'
          }
          color={THEME}
        />
      ) : (
        requests.map((r, idx) => {
          const meta = statusMeta(r.status);
          const waiting = waitingLabel(r.waitingDays);
          return (
            <AnimatedCard
              key={r.id}
              delay={100 + idx * 45}
              style={styles.block}
              onPress={() => navigation.openModule('RequestDetail', { requestId: r.id })}
            >
              <View style={styles.requestRow}>
                <View style={[styles.requestIcon, { backgroundColor: meta.bg }]}>
                  <Ionicons name="cart-outline" size={18} color={meta.color} />
                </View>
                <View style={styles.requestBody}>
                  <Text style={styles.bookTitle} numberOfLines={2}>{r.title}</Text>
                  {r.author ? <Text style={styles.bookAuthor} numberOfLines={1}>{r.author}</Text> : null}
                  <Text style={styles.meta} numberOfLines={1}>
                    {r.student} · {r.rollNo}
                  </Text>
                  <View style={styles.chipRow}>
                    <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
                      <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                    {waiting ? (
                      <View style={[styles.waitChip, { backgroundColor: r.waitingDays > 14 ? '#fef2f2' : '#f1f5f9' }]}>
                        <Ionicons name="time-outline" size={10} color={r.waitingDays > 14 ? '#dc2626' : '#64748b'} />
                        <Text style={[styles.waitText, { color: r.waitingDays > 14 ? '#dc2626' : '#64748b' }]}>{waiting}</Text>
                      </View>
                    ) : null}
                    {r.sameTitleRequests > 1 || r.inCatalog ? (
                      <View style={styles.demandChip}>
                        <Text style={styles.demandChipText}>{demandLabel(r.sameTitleRequests, r.inCatalog)}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <View style={styles.requestRight}>
                  {r.canDecide ? (
                    <View style={styles.decideDot}>
                      <Ionicons name="alert-circle" size={15} color="#d97706" />
                    </View>
                  ) : (
                    <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
                  )}
                  <Text style={styles.rowTime}>{relativeTime(r.createdAt)}</Text>
                </View>
              </View>
            </AnimatedCard>
          );
        })
      )}

      {(stats.oldestPendingDays ?? 0) > 0 ? (
        <AnimatedCard delay={400} style={styles.block}>
          <View style={styles.noteRow}>
            <Ionicons name="hourglass-outline" size={15} color="#d97706" />
            <Text style={styles.noteText}>
              Oldest pending request has waited {stats.oldestPendingDays} day
              {stats.oldestPendingDays === 1 ? '' : 's'}. Approving raises a purchase you then receive in Procurement;
              declining asks you for a reason the student will read.
            </Text>
          </View>
        </AnimatedCard>
      ) : null}
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

  // Procurement shortcut
  procureCard: { backgroundColor: '#eff6ff', borderRadius: 14, borderWidth: 1, borderColor: '#bfdbfe', padding: 13, marginBottom: 14 },
  procureTop: { flexDirection: 'row', alignItems: 'center' },
  procureIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  procureBody: { flex: 1 },
  procureTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  procureSub: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  receiveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 11, paddingVertical: 9, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#bfdbfe' },
  receiveText: { fontSize: 12, fontWeight: '700', color: '#059669', fontFamily: 'Manrope-Bold' },

  // Stats
  statsRow: { flexDirection: 'row' },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4 },
  statDivider: { width: 1, backgroundColor: '#eef2f7', marginVertical: 8 },
  statValue: { fontSize: 18, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold' },
  statLabel: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },

  // Demand
  cardLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, paddingHorizontal: 4 },
  demandRow: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  demandIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  demandBody: { flex: 1 },
  demandTitle: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  demandSub: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  divider: { height: 1, backgroundColor: '#eef2f7', marginLeft: 55 },

  // Search / filters
  search: { marginBottom: 12 },
  chipsScroll: { flexGrow: 0, marginHorizontal: -24 },
  chipsRow: { flexDirection: 'row', paddingHorizontal: 24 },
  chip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', marginRight: 8 },
  chipText: { fontSize: 12, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  chipTextActive: { color: '#fff' },

  // Sort
  sortRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 10 },
  sortCount: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Medium' },
  sortButtons: { flexDirection: 'row', gap: 6 },
  sortBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  sortBtnActive: { backgroundColor: THEME, borderColor: THEME },
  sortBtnMenu: { width: 36 },
  sortMenu: { backgroundColor: '#fff', borderRadius: 13, borderWidth: 1, borderColor: '#e2e8f0', paddingVertical: 6, marginBottom: 12 },
  sortMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
  sortMenuText: { flex: 1, fontSize: 13, fontFamily: 'Manrope-Medium', color: '#475569' },

  // Rows
  requestRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14 },
  requestIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  requestBody: { flex: 1 },
  bookTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  bookAuthor: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  meta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 7 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  statusText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  waitChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  waitText: { fontSize: 9, fontWeight: '600', fontFamily: 'Manrope-SemiBold' },
  demandChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, backgroundColor: '#f1f5f9' },
  demandChipText: { fontSize: 9, fontWeight: '600', color: '#475569', fontFamily: 'Manrope-SemiBold' },
  requestRight: { alignItems: 'flex-end', marginLeft: 8 },
  decideDot: { width: 26, height: 26, borderRadius: 9, backgroundColor: '#fffbeb', alignItems: 'center', justifyContent: 'center' },
  rowTime: { fontSize: 9, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 6 },

  noteRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14 },
  noteText: { flex: 1, fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium', lineHeight: 16, marginLeft: 9 },
});
