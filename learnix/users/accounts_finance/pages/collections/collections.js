// F-02 Collections — the money-IN desk hub (docs/users/06 §3.2).
//
// The old screen was a two-tab list/record form whose stats came from a
// different endpoint shape and whose "record" tab wrote a payment that never
// touched a single fee due. Both problems are gone: recording money now lives
// in CollectPayment (which allocates it onto balances), and everything below
// reads the same honest numbers the backend derived.
//
// Every figure here comes from the server. The headline cards deliberately
// ignore the active filter so the summary does not jump around as the officer
// narrows the list; the filter's own total is reported in the list header.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../services/api';
import {
  AnimatedCard, EmptyState, SearchBar, SkeletonStatRow, SkeletonCard,
} from '../../../../components/ui';
import {
  THEME, RANGE_FILTERS, SORTS, statusMeta, rupees, compactRupees, relativeTime,
  categoryMeta, methodMeta,
} from './collectionMeta';

export default function CollectionsModule({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('NEWEST');
  const [sortOpen, setSortOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await accountsApi.collections({ range, q: search, sort, take: 50 });
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range, search, sort]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const stats = data?.stats || {};
  const collections = data?.collections || [];

  // Reversals are money that came in and then went back out. Showing them as
  // green income is how a books desk ends up overstating a month, so the
  // headline is net and the reversed figure is called out on its own.
  const filterActive = range !== 'ALL' || search.trim().length > 0;

  const activeSort = useMemo(() => SORTS.find((s) => s.id === sort) ?? SORTS[0], [sort]);

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
        {/* Headline — these totals ignore the filters on purpose. */}
        <AnimatedCard delay={0} style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>Collected today</Text>
              <Text style={styles.heroValue}>{rupees(stats.todayRupees ?? 0)}</Text>
              <Text style={styles.heroSub}>{stats.todayCount ?? 0} receipt{stats.todayCount === 1 ? '' : 's'} issued today</Text>
            </View>
            <View style={styles.heroIcon}>
              <Ionicons name="wallet-outline" size={22} color={THEME} />
            </View>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroRow}>
            <View style={styles.heroCell}>
              <Text style={styles.heroCellLabel}>Last 30 days</Text>
              <Text style={styles.heroCellValue}>{compactRupees(stats.monthRupees ?? 0)}</Text>
            </View>
            <View style={styles.heroCellDivider} />
            <View style={styles.heroCell}>
              <Text style={styles.heroCellLabel}>All time</Text>
              <Text style={styles.heroCellValue}>{compactRupees(stats.allTimeRupees ?? 0)}</Text>
            </View>
          </View>
        </AnimatedCard>

        {/* Reversals — only when they exist, and never folded into the total. */}
        {stats.reversedCount > 0 && (
          <AnimatedCard delay={50} style={[styles.block, styles.reverseBanner]}>
            <View style={styles.reverseRow}>
              <Ionicons name="arrow-undo" size={16} color="#dc2626" />
              <Text style={styles.reverseText}>
                {stats.reversedCount} reversed payment{stats.reversedCount === 1 ? '' : 's'} worth{' '}
                <Text style={styles.reverseAmount}>{rupees(stats.reversedRupees)}</Text> excluded from collections.
              </Text>
            </View>
          </AnimatedCard>
        )}

        {/* Collect */}
        <AnimatedCard delay={100} style={[styles.block, styles.collectCard]}>
          <View style={styles.collectBody}>
            <View style={styles.collectIcon}>
              <Ionicons name="add-circle" size={20} color="#fff" />
            </View>
            <View style={styles.collectText}>
              <Text style={styles.collectTitle}>Collect a payment</Text>
              <Text style={styles.collectSub}>Allocate the money to the student&apos;s open dues</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </View>
        </AnimatedCard>

        {/* Search — SearchBar holds its own text and debounces into onSearch. */}
        <View style={styles.searchWrap}>
          <SearchBar
            placeholder="Search reference, receipt, roll no or name"
            onSearch={setSearch}
          />
        </View>

        {/* Range chips + sort */}
        <View style={styles.controlRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {RANGE_FILTERS.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[styles.chip, range === r.id && styles.chipActive]}
                onPress={() => setRange(r.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, range === r.id && styles.chipTextActive]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.sortBtn}
            onPress={() => setSortOpen((v) => !v)}
            activeOpacity={0.8}
          >
            <Ionicons name={activeSort.icon} size={14} color={THEME} />
            <Ionicons name={sortOpen ? 'chevron-up' : 'chevron-down'} size={12} color={THEME} />
          </TouchableOpacity>
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
                <Text style={[styles.sortOptionText, sort === s.id && styles.sortOptionTextActive]}>{s.label}</Text>
                {sort === s.id && <Ionicons name="checkmark" size={14} color={THEME} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* List header — says what the filter is showing, so the cards above
            never get mistaken for the filtered figure. */}
        <View style={styles.listHeader}>
          <Text style={styles.sectionLabel}>
            {filterActive ? 'Matching collections' : 'Recent collections'}
          </Text>
          <Text style={styles.listHeaderMeta}>
            {stats.filteredCount ?? collections.length} shown · {rupees(stats.filteredRupees ?? 0)}
          </Text>
        </View>

        {collections.length === 0 ? (
          <>
            <EmptyState
              icon="receipt-outline"
              title={filterActive ? 'Nothing matches' : 'No collections yet'}
              subtitle={
                filterActive
                  ? 'Try a different reference number, or widen the date range.'
                  : 'Money received at this desk will appear here.'
              }
            />
            {/* EmptyState's own action button is not pressable, so a real
                "clear filters" control has to be rendered out here. */}
            {filterActive && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => { setRange('ALL'); setSearch(''); }}
                activeOpacity={0.85}
              >
                <Ionicons name="refresh" size={15} color={THEME} />
                <Text style={styles.clearBtnText}>Clear filters</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          collections.map((c, i) => (
            <CollectionRow key={c.id} item={c} index={i} onPress={() => navigation.openModule('CollectionDetail', { paymentId: c.id })} />
          ))
        )}

        {(data?.total ?? 0) > collections.length && (
          <Text style={styles.moreNote}>
            Showing the first {collections.length} of {data.total}. Narrow the filter to see more.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

function CollectionRow({ item, index, onPress }) {
  const meta = statusMeta(item);
  const cat = categoryMeta(item.category);
  const method = methodMeta(item.method);

  return (
    <AnimatedCard delay={140 + index * 35} onPress={onPress} style={styles.row}>
      <View style={styles.rowMain}>
        <View style={[styles.rowIcon, { backgroundColor: meta.bg }]}>
          <Ionicons name={cat.icon} size={18} color={meta.color} />
        </View>

        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {item.student || 'Donation / misc'}
            </Text>
            <Text
              style={[styles.rowAmount, item.isReversed && styles.rowAmountStruck]}
              numberOfLines={1}
            >
              {rupees(item.amountRupees)}
            </Text>
          </View>

          <Text style={styles.rowSub} numberOfLines={1}>
            {item.rollNo ? `${item.rollNo} · ` : ''}{cat.label} · {method.label} · {relativeTime(item.createdAt)}
          </Text>

          <View style={styles.rowChips}>
            <View style={[styles.pill, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon} size={10} color={meta.color} />
              <Text style={[styles.pillText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            {item.receiptNo && (
              <Text style={styles.receiptNo}>{item.receiptNo}</Text>
            )}
            {item.allocatedCount > 0 && (
              <Text style={styles.allocNote} numberOfLines={1}>
                settled {item.allocatedCount} due{item.allocatedCount === 1 ? '' : 's'}
              </Text>
            )}
            {item.allocatedCount === 0 && !item.isReversed && (
              <Text style={styles.advanceNote}>advance</Text>
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
  heroLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6 },
  heroValue: { fontSize: 28, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginTop: 4, letterSpacing: -1 },
  heroSub: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 2 },
  heroIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: THEME + '12', justifyContent: 'center', alignItems: 'center' },
  heroDivider: { height: 1, backgroundColor: '#eef2f7', marginVertical: 14 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroCell: { flex: 1 },
  heroCellDivider: { width: 1, height: 28, backgroundColor: '#eef2f7' },
  heroCellLabel: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium' },
  heroCellValue: { fontSize: 15, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginTop: 2 },

  // Reversal banner
  reverseBanner: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  reverseRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 13 },
  reverseText: { flex: 1, fontSize: 11, color: '#991b1b', fontFamily: 'Manrope-Medium', lineHeight: 17 },
  reverseAmount: { fontWeight: '800' },

  // Collect CTA
  collectCard: { backgroundColor: THEME, borderWidth: 0 },
  collectBody: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15 },
  collectIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  collectText: { flex: 1 },
  collectTitle: { fontSize: 15, fontWeight: '700', color: '#fff', fontFamily: 'Manrope-Bold' },
  collectSub: { fontSize: 11, color: '#dbeafe', fontFamily: 'Manrope-Regular', marginTop: 1 },

  // Search / filters
  searchWrap: { marginTop: 16, marginBottom: 12 },
  controlRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  chipRow: { gap: 8, paddingRight: 8 },
  chip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  chipActive: { backgroundColor: THEME, borderColor: THEME },
  chipText: { fontSize: 12, fontWeight: '600', color: '#475569', fontFamily: 'Manrope-SemiBold' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: THEME + '10', borderWidth: 1, borderColor: THEME + '33' },
  sortPanel: { backgroundColor: '#fff', borderRadius: 13, borderWidth: 1, borderColor: '#e2e8f0', padding: 6, marginBottom: 14 },
  sortOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 9 },
  sortOptionActive: { backgroundColor: THEME + '0d' },
  sortOptionText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#475569', fontFamily: 'Manrope-SemiBold' },
  sortOptionTextActive: { color: THEME, fontWeight: '700' },

  // List header
  listHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  listHeaderMeta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Medium' },

  // Row
  row: { marginBottom: 9 },
  rowMain: { flexDirection: 'row', alignItems: 'flex-start', padding: 13 },
  rowIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 11 },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  rowTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  rowAmount: { fontSize: 15, fontWeight: '800', color: '#059669', fontFamily: 'PlusJakartaSans-Bold' },
  rowAmountStruck: { color: '#94a3b8', textDecorationLine: 'line-through' },
  rowSub: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 2 },
  rowChips: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 7, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  pillText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  receiptNo: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium' },
  allocNote: { fontSize: 10, color: '#059669', fontFamily: 'Manrope-Medium' },
  advanceNote: { fontSize: 10, color: '#d97706', fontFamily: 'Manrope-Medium', fontStyle: 'italic' },

  moreNote: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', textAlign: 'center', marginTop: 12 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: -16, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, backgroundColor: THEME + '10', borderWidth: 1, borderColor: THEME + '33' },
  clearBtnText: { fontSize: 13, fontWeight: '700', color: THEME, fontFamily: 'Manrope-Bold' },
});