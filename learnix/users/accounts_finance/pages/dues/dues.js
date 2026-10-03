// F-04 Dues & Recovery — the recovery desk hub (docs/users/06 §3.3).
//
// The screen this replaces listed every due in one undifferentiated block, with
// two unlabelled icon buttons per row, and its headline "Unpaid" card counted
// BILLED amounts rather than what was still owed — so a part-paid bill read as
// fully outstanding. It also offered no way to find a specific family, no sense
// of how old the debt was, and no record of whether anyone had chased it.
//
// Everything here comes from the server, and the server derives it:
//   · the headline is the sum of open BALANCES, not billed amounts
//   · each row's status is derived from what was actually paid against it
//   · the aging strip shows where the whole book sits, filter-independent
//   · a row that has been chased says so, so the next action can be a phone call
//     rather than another notification
//
// The headline and aging deliberately ignore the active filter — a summary that
// jumps around as you narrow a list is worse than useless. The filter's own
// totals are reported in the list header instead.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../services/api';
import {
  AnimatedCard, EmptyState, SearchBar, SkeletonStatRow, SkeletonCard,
} from '../../../../components/ui';
import {
  THEME, AGING_FILTERS, STATUS_FILTERS, SORTS, dueStatusMeta, overduePhrase, chaseLabel,
  rupees, compactRupees,
} from './duesMeta';

export default function DuesModule({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState('OPEN');
  const [bucket, setBucket] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('SEVERITY');
  const [sortOpen, setSortOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await accountsApi.dues({ status, bucket, q: search, sort, take: 50 });
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status, bucket, search, sort]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const stats = data?.stats || {};
  const aging = data?.aging || [];
  const dues = data?.dues || [];

  const filterActive = status !== 'OPEN' || bucket !== 'ALL' || search.trim().length > 0;
  const activeSort = useMemo(() => SORTS.find((s) => s.id === sort) ?? SORTS[0], [sort]);

  const clearFilters = () => { setStatus('OPEN'); setBucket('ALL'); setSearch(''); };

  if (loading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <SkeletonStatRow />
        <SkeletonCard />
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
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData} activeOpacity={0.85}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
      >
        {/* Headline — filter-independent on purpose. */}
        <AnimatedCard delay={0} style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroLabel}>Outstanding</Text>
              <Text style={styles.heroValue}>{rupees(stats.outstandingRupees ?? 0)}</Text>
              <Text style={styles.heroSub}>
                {stats.openCount ?? 0} open bill{(stats.openCount ?? 0) === 1 ? '' : 's'} across{' '}
                {stats.defaulterCount ?? 0} student{(stats.defaulterCount ?? 0) === 1 ? '' : 's'}
              </Text>
            </View>
            <View style={styles.heroIcon}>
              <Ionicons name="alert-circle-outline" size={22} color="#dc2626" />
            </View>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroRow}>
            <View style={styles.heroCell}>
              <Text style={styles.heroCellLabel}>Overdue</Text>
              <Text style={[styles.heroCellValue, { color: '#dc2626' }]}>
                {compactRupees(stats.overdueRupees ?? 0)}
              </Text>
              <Text style={styles.heroCellMeta}>{stats.overdueCount ?? 0} bills</Text>
            </View>
            <View style={styles.heroCellDivider} />
            <View style={styles.heroCell}>
              <Text style={styles.heroCellLabel}>Recovered 30d</Text>
              <Text style={[styles.heroCellValue, { color: '#059669' }]}>
                {compactRupees(stats.recoveredMonthRupees ?? 0)}
              </Text>
              <Text style={styles.heroCellMeta}>
                {stats.recoveredMonthCount ?? 0} allocation{(stats.recoveredMonthCount ?? 0) === 1 ? '' : 's'}
              </Text>
            </View>
          </View>

          {/* Part-paid and already-chased are the two states an officer is
              most likely to miss when scanning a long list. */}
          {(stats.partialCount > 0 || stats.chasedCount > 0) && (
            <View style={styles.heroFlags}>
              {stats.partialCount > 0 && (
                <View style={[styles.flag, { backgroundColor: '#fffbeb' }]}>
                  <Ionicons name="pie-chart" size={11} color="#d97706" />
                  <Text style={[styles.flagText, { color: '#d97706' }]}>
                    {stats.partialCount} part-paid
                  </Text>
                </View>
              )}
              {stats.chasedCount > 0 && (
                <View style={[styles.flag, { backgroundColor: '#eff6ff' }]}>
                  <Ionicons name="megaphone" size={11} color={THEME} />
                  <Text style={[styles.flagText, { color: THEME }]}>
                    {stats.chasedCount} already chased
                  </Text>
                </View>
              )}
            </View>
          )}
        </AnimatedCard>

        {/* Waived money is off the books — say so rather than silently omitting it. */}
        {stats.waivedCount > 0 && (
          <AnimatedCard delay={50} style={[styles.block, styles.waivedBanner]}>
            <View style={styles.reverseRow}>
              <Ionicons name="gift" size={16} color="#7c3aed" />
              <Text style={styles.waivedText}>
                {stats.waivedCount} waived bill{stats.waivedCount === 1 ? '' : 's'} worth{' '}
                <Text style={styles.waivedAmount}>{rupees(stats.waivedRupees)}</Text> excluded from
                outstanding. Every waiver can be reinstated.
              </Text>
            </View>
          </AnimatedCard>
        )}

        {/* Aging — where the whole book sits, regardless of filters. */}
        <View style={styles.agingHeader}>
          <Text style={styles.sectionLabel}>Receivables aging</Text>
          <Text style={styles.sectionMeta}>all open dues</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.agingRow}>
          {aging.map((b) => (
            <TouchableOpacity
              key={b.id}
              style={[styles.agingCard, bucket === b.id && { borderColor: b.color, backgroundColor: b.color + '0f' }]}
              onPress={() => setBucket(bucket === b.id ? 'ALL' : b.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.agingDot, { backgroundColor: b.color }]} />
              <Text style={styles.agingLabel}>{b.label}</Text>
              <Text style={[styles.agingValue, { color: b.count ? b.color : '#94a3b8' }]}>
                {compactRupees(b.rupees)}
              </Text>
              <Text style={styles.agingCount}>{b.count} bill{b.count === 1 ? '' : 's'}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Search */}
        <View style={styles.searchWrap}>
          <SearchBar placeholder="Search student, roll no or fee" onSearch={setSearch} />
        </View>

        {/* Status chips + sort */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {STATUS_FILTERS.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.chip, status === s.id && styles.chipActive]}
              onPress={() => setStatus(s.id)}
              activeOpacity={0.8}
            >
              <Ionicons name={s.icon} size={12} color={status === s.id ? '#fff' : '#475569'} />
              <Text style={[styles.chipText, status === s.id && styles.chipTextActive]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.sortRow}>
          <TouchableOpacity style={styles.sortBtn} onPress={() => setSortOpen((v) => !v)} activeOpacity={0.85}>
            <Ionicons name={activeSort.icon} size={14} color={THEME} />
            <Text style={styles.sortBtnText}>{activeSort.label}</Text>
            <Ionicons name={sortOpen ? 'chevron-up' : 'chevron-down'} size={12} color={THEME} />
          </TouchableOpacity>
          {filterActive && (
            <TouchableOpacity style={styles.resetBtn} onPress={clearFilters} activeOpacity={0.85}>
              <Ionicons name="refresh" size={13} color="#64748b" />
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>

        {sortOpen && (
          <View style={styles.sortPanel}>
            {SORTS.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.sortOption, sort === s.id && styles.sortOptionActive]}
                onPress={() => { setSort(s.id); setSortOpen(false); }}
                activeOpacity={0.8}
              >
                <Ionicons name={s.icon} size={14} color={sort === s.id ? THEME : '#94a3b8'} />
                <Text style={[styles.sortOptionText, sort === s.id && styles.sortOptionTextActive]}>
                  {s.label}
                </Text>
                {sort === s.id && <Ionicons name="checkmark" size={14} color={THEME} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* List header — the filter's own totals, so the hero is never mistaken
            for "what am I looking at right now". */}
        <View style={styles.listHeader}>
          <Text style={styles.sectionLabel}>
            {filterActive ? 'Matching dues' : 'Open dues'}
          </Text>
          <Text style={styles.listHeaderMeta}>
            {data?.filteredCount ?? dues.length} shown · {rupees(data?.filteredOpenRupees ?? 0)} outstanding
          </Text>
        </View>

        {dues.length === 0 ? (
          <>
            <EmptyState
              icon="checkmark-done-outline"
              title={filterActive ? 'Nothing matches' : 'Nothing outstanding'}
              subtitle={
                filterActive
                  ? 'Try a different name, roll number, or widen the filters.'
                  : 'Every bill raised for this institution has been settled.'
              }
            />
            {/* EmptyState's own action button is not pressable, so a real
                control has to be rendered out here. */}
            {filterActive && (
              <TouchableOpacity style={styles.clearBtn} onPress={clearFilters} activeOpacity={0.85}>
                <Ionicons name="refresh" size={15} color={THEME} />
                <Text style={styles.clearBtnText}>Clear filters</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          dues.map((item, i) => (
            <DueRow
              key={item.id}
              item={item}
              index={i}
              onPress={() => navigation.openModule('DueDetail', { dueId: item.id })}
            />
          ))
        )}

        {(data?.total ?? 0) > dues.length && (
          <Text style={styles.moreNote}>
            Showing the first {dues.length} of {data.total}. Narrow the filter to see more.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

function DueRow({ item, index, onPress }) {
  const meta = dueStatusMeta(item.status);
  const chase = chaseLabel(item);
  // A settled bill is not a problem, so it does not get the alarming red.
  const amountColor = item.collectible ? '#dc2626' : '#64748b';
  const progress = item.amountRupees > 0 ? item.paidRupees / item.amountRupees : 0;

  return (
    <AnimatedCard delay={120 + index * 30} onPress={onPress} style={styles.row}>
      <View style={styles.rowTop}>
        <View style={[styles.rowIcon, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={18} color={meta.color} />
        </View>

        <View style={styles.rowBody}>
          <View style={styles.rowTitleLine}>
            <Text style={styles.rowTitle} numberOfLines={1}>{item.student}</Text>
            <Text style={[styles.rowAmount, { color: amountColor }]}>{rupees(item.balanceRupees)}</Text>
          </View>

          <Text style={styles.rowSub} numberOfLines={1}>
            {item.rollNo}{item.semester ? ` · Sem ${item.semester}` : ''} · {item.title}
          </Text>

          {/* Part-paid bills get a progress bar — "₹1L of ₹2.25L" is the single
              most useful fact about a part-paid due, and the status pill alone
              does not convey it. */}
          {item.status === 'PARTIAL' && (
            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.min(100, Math.round(progress * 100))}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {rupees(item.paidRupees)} of {rupees(item.amountRupees)} paid
              </Text>
            </View>
          )}

          <View style={styles.rowChips}>
            <View style={[styles.pill, { backgroundColor: meta.bg }]}>
              <Text style={[styles.pillText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            {item.collectible && item.daysOverdue > 0 && (
              <Text style={[styles.overdueText, { color: meta.color }]}>{overduePhrase(item.daysOverdue)}</Text>
            )}
            {item.collectible && item.daysOverdue <= 0 && (
              <Text style={styles.notDueText}>due {new Date(item.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
            )}
            {chase && (
              <View style={styles.chaseTag}>
                <Ionicons name="megaphone-outline" size={9} color={THEME} />
                <Text style={styles.chaseText}>{chase}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </AnimatedCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  scroll: { flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9', padding: 24 },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  block: { marginBottom: 10 },

  // Hero
  heroCard: { marginBottom: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroLeft: { flex: 1 },
  heroLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6 },
  heroValue: { fontSize: 28, fontWeight: '800', color: '#dc2626', fontFamily: 'PlusJakartaSans-Bold', marginTop: 4, letterSpacing: -1 },
  heroSub: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 2 },
  heroIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center' },
  heroDivider: { height: 1, backgroundColor: '#eef2f7', marginVertical: 14 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroCell: { flex: 1 },
  heroCellDivider: { width: 1, height: 34, backgroundColor: '#eef2f7' },
  heroCellLabel: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium' },
  heroCellValue: { fontSize: 15, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold', marginTop: 2 },
  heroCellMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },
  heroFlags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  flag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7 },
  flagText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },

  // Waived banner
  waivedBanner: { backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#ddd6fe' },
  reverseRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 13 },
  waivedText: { flex: 1, fontSize: 11, color: '#5b21b6', fontFamily: 'Manrope-Medium', lineHeight: 17 },
  waivedAmount: { fontWeight: '800' },

  // Aging
  agingHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 9, marginTop: 4 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  sectionMeta: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Medium' },
  agingRow: { gap: 9, paddingRight: 8, paddingBottom: 4 },
  agingCard: { minWidth: 118, backgroundColor: '#fff', borderRadius: 13, borderWidth: 1, borderColor: '#e2e8f0', padding: 11 },
  agingDot: { width: 7, height: 7, borderRadius: 4, marginBottom: 7 },
  agingLabel: { fontSize: 10, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  agingValue: { fontSize: 15, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold', marginTop: 3, letterSpacing: -0.4 },
  agingCount: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },

  // Search / filters
  searchWrap: { marginTop: 16, marginBottom: 12 },
  chipRow: { gap: 8, paddingRight: 8, marginBottom: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  chipActive: { backgroundColor: THEME, borderColor: THEME },
  chipText: { fontSize: 12, fontWeight: '600', color: '#475569', fontFamily: 'Manrope-SemiBold' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: THEME + '10', borderWidth: 1, borderColor: THEME + '33' },
  sortBtnText: { fontSize: 12, fontWeight: '700', color: THEME, fontFamily: 'Manrope-Bold' },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  resetText: { fontSize: 12, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  sortPanel: { backgroundColor: '#fff', borderRadius: 13, borderWidth: 1, borderColor: '#e2e8f0', padding: 6, marginBottom: 14, marginTop: -6 },
  sortOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 9 },
  sortOptionActive: { backgroundColor: THEME + '0d' },
  sortOptionText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#475569', fontFamily: 'Manrope-SemiBold' },
  sortOptionTextActive: { color: THEME, fontWeight: '700' },

  // List header
  listHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 },
  listHeaderMeta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Medium' },

  // Row
  row: { marginBottom: 9 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', padding: 13 },
  rowIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 11 },
  rowBody: { flex: 1 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  rowTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  rowAmount: { fontSize: 15, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold' },
  rowSub: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 2 },
  progressWrap: { marginTop: 7 },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: '#e2e8f0', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#d97706', borderRadius: 3 },
  progressText: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 3 },
  rowChips: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 7, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  pillText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  overdueText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  notDueText: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium' },
  chaseTag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, backgroundColor: THEME + '10' },
  chaseText: { fontSize: 10, color: THEME, fontFamily: 'Manrope-Medium' },

  moreNote: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', textAlign: 'center', marginTop: 12 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: -16, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, backgroundColor: THEME + '10', borderWidth: 1, borderColor: THEME + '33' },
  clearBtnText: { fontSize: 13, fontWeight: '700', color: THEME, fontFamily: 'Manrope-Bold' },
});