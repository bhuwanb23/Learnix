import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../services/api';
import { AnimatedCard, EmptyState, SearchBar, SkeletonStatRow, SkeletonCard } from '../../../../components/ui';
import { THEME, statusMeta, rupees, formatDate, urgency } from './fineMeta';

const STATUS_FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'PAID', label: 'Paid' },
  { id: 'WAIVED', label: 'Waived' },
];

const SORTS = [
  { id: 'NEWEST', label: 'Newest', icon: 'time-outline' },
  { id: 'AMOUNT', label: 'Amount', icon: 'cash-outline' },
  { id: 'DAYS', label: 'Overdue', icon: 'alert-circle-outline' },
];

export default function FinesModule({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('NEWEST');
  const [view, setView] = useState('fines');

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await libraryApi.fines({ status, q: search, sort });
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status, search, sort]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const stats = data?.stats || {};
  const fines = data?.fines || [];
  const debtors = data?.debtors || [];

  const collectionRate = useMemo(() => {
    const settled = stats.paidCount + stats.waivedCount;
    const total = settled + stats.pendingCount;
    return total ? Math.round((settled / total) * 100) : 0;
  }, [stats]);

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

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
    >
      {/* Outstanding */}
      <AnimatedCard delay={0} style={[styles.block, styles.heroCard]}>
        <Text style={styles.heroLabel}>Outstanding</Text>
        <Text style={styles.heroValue}>{rupees(stats.pendingAmountRupees)}</Text>
        <Text style={styles.heroSub}>
          {stats.pendingCount} pending fine{stats.pendingCount === 1 ? '' : 's'} across {stats.debtorCount} student{stats.debtorCount === 1 ? '' : 's'}
        </Text>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${collectionRate}%`, backgroundColor: '#059669' }]} />
        </View>
        <Text style={styles.progressLabel}>
          {collectionRate}% of all fines settled · {rupees(stats.paidAmountRupees)} collected, {rupees(stats.waivedAmountRupees)} waived
        </Text>
      </AnimatedCard>

      {/* Stats */}
      <AnimatedCard delay={60} style={[styles.block, styles.statsRow]}>
        {[
          { label: 'Pending', value: stats.pendingCount ?? 0, icon: 'time', color: '#dc2626' },
          { label: 'Collected', value: rupees(stats.paidAmountRupees ?? 0), icon: 'checkmark-circle', color: '#059669' },
          { label: 'Waived', value: stats.waivedCount ?? 0, icon: 'gift', color: '#d97706' },
        ].map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && <View style={styles.statDivider} />}
            <View style={styles.statCell}>
              <View style={[styles.statIcon, { backgroundColor: s.color + '14' }]}>
                <Ionicons name={s.icon} size={18} color={s.color} />
              </View>
              <Text style={[styles.statValue, typeof s.value === 'string' && styles.statValueMoney]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          </React.Fragment>
        ))}
      </AnimatedCard>

      {/* View switch */}
      <View style={styles.tabsRow}>
        {[
          { id: 'fines', label: `Fines (${fines.length})` },
          { id: 'debtors', label: `Debtors (${debtors.length})` },
        ].map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, view === t.id && styles.tabActive]}
            onPress={() => setView(t.id)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, view === t.id && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {view === 'fines' ? (
        <>
          <SearchBar placeholder="Search student, roll number or book…" onSearch={setSearch} style={styles.search} />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            <View style={styles.chipsRow}>
              {STATUS_FILTERS.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[
                    styles.chip,
                    status === s.id && {
                      backgroundColor: s.id === 'ALL' ? THEME : statusMeta(s.id).color,
                      borderColor: s.id === 'ALL' ? THEME : statusMeta(s.id).color,
                    },
                  ]}
                  onPress={() => setStatus(s.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, status === s.id && styles.chipTextActive]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.listHeader}>
            <Text style={styles.sectionLabel}>
              {search ? `Results for “${search}”` : status === 'ALL' ? 'All Fines' : `${statusMeta(status).label} Fines`}
            </Text>
            <View style={styles.sortRow}>
              {SORTS.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.sortBtn, sort === s.id && styles.sortBtnActive]}
                  onPress={() => setSort(s.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={s.icon} size={13} color={sort === s.id ? THEME : '#94a3b8'} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {fines.length === 0 ? (
            <EmptyState
              icon={search ? 'search-outline' : 'checkmark-circle-outline'}
              title={search ? 'No matching fines' : status === 'PENDING' ? 'Nothing outstanding' : 'No fines here'}
              subtitle={
                search
                  ? 'Try a different name, roll number or book title.'
                  : status === 'PENDING'
                    ? 'Every overdue fine has been collected or waived.'
                    : 'Settled fines will appear here once processed.'
              }
              color={status === 'PENDING' ? '#059669' : THEME}
            />
          ) : (
            fines.map((f, idx) => {
              const meta = statusMeta(f.status);
              const urgent = urgency(f.daysOverdue);
              return (
                <AnimatedCard
                  key={f.id}
                  delay={100 + idx * 45}
                  style={styles.block}
                  onPress={() => navigation.openModule('FineDetail', { fineId: f.id })}
                >
                  <View style={styles.fineRow}>
                    <View style={[styles.fineIcon, { backgroundColor: meta.bg }]}>
                      <Ionicons name={meta.icon} size={18} color={meta.color} />
                    </View>

                    <View style={styles.fineBody}>
                      <Text style={styles.studentName} numberOfLines={1}>{f.bookIssue.student.name}</Text>
                      <Text style={styles.meta} numberOfLines={1}>
                        {f.bookIssue.student.rollNo} · {f.bookIssue.book.title}
                      </Text>

                      <View style={styles.chipRow}>
                        <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
                          <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                        </View>
                        {f.status === 'PENDING' && (
                          <View style={[styles.daysChip, { backgroundColor: urgent.bg }]}>
                            <Text style={[styles.daysText, { color: urgent.color }]}>
                              {f.daysOverdue}d overdue
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.dateText}>Raised {formatDate(f.createdAt)}</Text>
                    </View>

                    <View style={styles.right}>
                      <Text style={[styles.amount, f.status === 'PENDING' ? { color: meta.color } : { color: '#64748b' }]}>
                        {rupees(f.amountRupees)}
                      </Text>
                      {f.status === 'PENDING' ? (
                        <TouchableOpacity
                          style={styles.collectBtn}
                          onPress={() => navigation.openModule('SettleFine', { fineId: f.id })}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="cash-outline" size={13} color="#fff" />
                        </TouchableOpacity>
                      ) : (
                        <Ionicons name="chevron-forward" size={15} color="#cbd5e1" />
                      )}
                    </View>
                  </View>
                </AnimatedCard>
              );
            })
          )}
        </>
      ) : (
        <>
          <Text style={styles.sectionLabel}>Outstanding by Student</Text>
          {debtors.length === 0 ? (
            <EmptyState
              icon="people-outline"
              title="No one owes anything"
              subtitle="Every student is clear on library fines."
              color="#059669"
            />
          ) : (
            debtors.map((d, idx) => (
              <AnimatedCard
                key={d.student.id}
                delay={80 + idx * 45}
                style={styles.block}
                onPress={() => navigation.openModule('StudentFines', { studentId: d.student.id })}
              >
                <View style={styles.debtorRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{d.student.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.debtorBody}>
                    <Text style={styles.studentName} numberOfLines={1}>{d.student.name}</Text>
                    <Text style={styles.meta}>{d.student.rollNo}</Text>
                    <View style={styles.debtorMeta}>
                      <View style={styles.countChip}>
                        <Text style={styles.countText}>
                          {d.fineCount} fine{d.fineCount === 1 ? '' : 's'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.right}>
                    <Text style={styles.amount}>{rupees(d.amountRupees)}</Text>
                    <Ionicons name="chevron-forward" size={15} color="#cbd5e1" />
                  </View>
                </View>
              </AnimatedCard>
            ))
          )}
        </>
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

  // Hero
  heroCard: { padding: 18 },
  heroLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6 },
  heroValue: { fontSize: 32, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginTop: 6, letterSpacing: -1 },
  heroSub: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 4 },
  progressTrack: { height: 7, borderRadius: 4, backgroundColor: '#eef2f7', marginTop: 16, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressLabel: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 7 },

  // Stats
  statsRow: { flexDirection: 'row', marginTop: 10 },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6 },
  statDivider: { width: 1, backgroundColor: '#eef2f7', marginVertical: 8 },
  statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 16, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.5 },
  statValueMoney: { fontSize: 14 },
  statLabel: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },

  // Tabs
  tabsRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 13, borderWidth: 1, borderColor: '#e2e8f0', padding: 4, marginTop: 16, marginBottom: 4 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: THEME + '14' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  tabTextActive: { color: THEME, fontWeight: '700' },

  search: { marginTop: 14, marginBottom: 12 },
  chipsScroll: { flexGrow: 0, marginHorizontal: -24 },
  chipsRow: { flexDirection: 'row', paddingHorizontal: 24 },
  chip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', marginRight: 8 },
  chipText: { fontSize: 12, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  chipTextActive: { color: '#fff' },

  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 10 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', flex: 1, marginRight: 10 },
  sortRow: { flexDirection: 'row', gap: 6 },
  sortBtn: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  sortBtnActive: { backgroundColor: THEME + '14', borderColor: THEME + '55' },

  // Fine rows
  fineRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  fineIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  fineBody: { flex: 1, paddingRight: 8 },
  studentName: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  meta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, flexWrap: 'wrap' },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  daysChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  daysText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  dateText: { fontSize: 10, color: '#cbd5e1', fontFamily: 'Manrope-Medium', marginTop: 5 },
  right: { alignItems: 'flex-end', gap: 6 },
  amount: { fontSize: 15, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  collectBtn: { width: 30, height: 30, borderRadius: 9, backgroundColor: THEME, justifyContent: 'center', alignItems: 'center' },

  // Debtors
  debtorRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: THEME + '14', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 16, fontWeight: '800', color: THEME, fontFamily: 'PlusJakartaSans-Bold' },
  debtorBody: { flex: 1, paddingRight: 8 },
  debtorMeta: { flexDirection: 'row', marginTop: 6 },
  countChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#fef2f2' },
  countText: { fontSize: 10, fontWeight: '700', color: '#dc2626', fontFamily: 'Manrope-Bold' },
});