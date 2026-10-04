// Monthly trends (docs/users/06 §3.6 §6).
//
// A number that goes up and down is not a trend — a trend needs the baseline it
// is being compared against, and this screen is built around that comparison:
//
//   · MONTH-ON-MONTH, stated in words. "+12%" means nothing alone; "up 12% on
//     last month" is a thing a finance head acts on. The server sends null when
//     there is no comparable prior month and that is rendered as "no prior month
//     to compare", never as "+0%" — a fabricated flat line reads as reassurance.
//   · THE BUDGET PACE, as a monthly figure. A budget is an annual number, so
//     comparing this month to it directly is how a department convinces itself
//     it is fine at 20% spent in month one. The server divides the fiscal-year
//     budget by 12 and labels it a pace, and the line on the chart is that pace.
//
// Bars are scaled against the largest month in the window, not against the
// budget — so the shape of the series is honest and the budget is drawn as a
// reference line the bars cross.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import {
  rupees, compactRupees, monthLabel, monthShort, changePhrase, categoryMeta,
  TREND_WINDOWS, THEME,
} from '../expensesMeta';

export default function Trends() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [months, setMonths] = useState(12);
  const [category, setCategory] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const result = await accountsApi.expenseTrends({
        months,
        ...(category && category !== 'ALL' ? { category } : {}),
      });
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [months, category]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  /**
   * The chart's scale.
   *
   * Bars are sized against the biggest month in the window so the SERIES is
   * readable — a chart scaled to the budget would render six quiet months as six
   * invisible stubs. The budget pace is then drawn as a line across the plot at
   * its own height, so "are we over pace" is still a visual comparison even
   * though it does not set the scale.
   */
  const chart = useMemo(() => {
    if (!data) return null;
    const rows = data.months;
    const peakMinor = Math.max(
      ...rows.map((r) => r.approvedRupees),
      data.totals.monthlyBudgetPaceRupees,
      1,
    );
    return {
      rows,
      peakRupees: peakMinor,
      // The pace line sits at this fraction of the plot height, or 0 when there
      // is no budget — a line pinned to the floor would imply "on pace".
      paceFraction: peakMinor > 0 && data.totals.monthlyBudgetPaceRupees > 0
        ? Math.min(1, data.totals.monthlyBudgetPaceRupees / peakMinor)
        : 0,
      heightFor: (rupeesValue) => `${Math.max(2, Math.round((rupeesValue / peakMinor) * 100))}%`,
    };
  }, [data]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color="#dc2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const t = data.totals;
  // Three states, not two: spend went up, spend went down, or there was nothing
  // to compare against. `changePercent` is null for the third, and treating that
  // as zero would draw a reassuring flat line that the data does not support.
  const hasChange = typeof t.changePercent === 'number';
  const changeUp = hasChange && t.changePercent > 0;
  const changeFlat = hasChange && t.changePercent === 0;
  const changeIcon = !hasChange ? 'remove' : changeUp ? 'trending-up' : changeFlat ? 'remove' : 'trending-down';
  const changeColor = !hasChange ? '#64748b' : changeUp ? '#dc2626' : '#059669';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
    >
      {/* ── Headline ──────────────────────────────────────────── */}
      <View style={styles.headline}>
        <Text style={styles.headlineLabel}>
          Approved spend, last {data.months.length} months
        </Text>
        <Text style={styles.headlineValue}>{compactRupees(t.approvedRupees)}</Text>

        <View style={[styles.changeChip, changeUp ? styles.changeUp : styles.changeDown]}>
          <Ionicons name={changeIcon} size={14} color={changeColor} />
          <Text style={[styles.changeText, { color: changeColor }]}>
            {changePhrase(t.changePercent)}
          </Text>
        </View>
      </View>

      {/* ── Stats ─────────────────────────────────────────────── */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Monthly average</Text>
          <Text style={styles.statValue}>{compactRupees(t.averageRupees)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Busiest</Text>
          <Text style={[styles.statValue, styles.statSmall]} numberOfLines={1}>
            {t.busiestMonth ?? '—'}
          </Text>
          {t.busiestMonthRupees > 0 && (
            <Text style={styles.statSub}>{compactRupees(t.busiestMonthRupees)}</Text>
          )}
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Claims</Text>
          <Text style={styles.statValue}>{t.claimCount}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Awaiting approval</Text>
          <Text style={[styles.statValue, t.pendingRupees > 0 && { color: '#d97706' }]}>
            {compactRupees(t.pendingRupees)}
          </Text>
        </View>
      </View>

      {/* ── Budget pace ───────────────────────────────────────── */}
      {t.monthlyBudgetPaceRupees > 0 ? (
        <View style={styles.paceCard}>
          <Ionicons name="speedometer-outline" size={17} color={THEME} />
          <View style={styles.paceInfo}>
            <Text style={styles.paceLabel}>Monthly budget pace</Text>
            <Text style={styles.paceValue}>
              {compactRupees(t.monthlyBudgetPaceRupees)} a month
            </Text>
            <Text style={styles.paceHint}>
              The fiscal-year budget spread over 12 months, not this month’s
              allowance. A quiet month is not a saving if the year is spent early.
            </Text>
          </View>
        </View>
      ) : (
        <View style={[styles.paceCard, styles.paceCardWarn]}>
          <Ionicons name="alert-circle-outline" size={17} color="#d97706" />
          <View style={styles.paceInfo}>
            <Text style={[styles.paceLabel, { color: '#92400e' }]}>No budget to pace against</Text>
            <Text style={styles.paceHint}>
              There is no budget line for {data.category === 'ALL' ? 'these categories' : categoryMeta(category).label},
              so this chart has nothing to compare against.
            </Text>
          </View>
        </View>
      )}

      {/* ── Chart ─────────────────────────────────────────────── */}
      <Text style={styles.section}>Month by month</Text>
      <View style={styles.chartCard}>
        {chart && chart.paceFraction > 0 && (
          <View style={styles.paceLineWrap} pointerEvents="none">
            <View style={[styles.paceLine, { bottom: `${chart.paceFraction * 100}%` }]} />
            <Text style={[styles.paceLabel2, { bottom: `${chart.paceFraction * 100}%` }]}>
              pace {compactRupees(t.monthlyBudgetPaceRupees)}
            </Text>
          </View>
        )}

        <View style={styles.bars}>
          {chart?.rows.map((r) => {
            const isLast = r.key === data.months[data.months.length - 1]?.key;
            const overPace = chart && chart.paceFraction > 0 && r.approvedRupees > t.monthlyBudgetPaceRupees;
            return (
              <View key={r.key} style={styles.barCol}>
                <Text style={styles.barAmount}>
                  {r.approvedRupees > 0 ? compactRupees(r.approvedRupees) : ''}
                </Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: chart?.heightFor(r.approvedRupees),
                        backgroundColor: overPace ? '#f59e0b' : isLast ? THEME : '#93c5fd',
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, isLast && styles.barLabelLast]}>
                  {monthShort(r.key)}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* ── Month detail ──────────────────────────────────────── */}
      <Text style={styles.section}>Breakdown</Text>
      {chart?.rows.slice().reverse().map((r) => (
        <View key={r.key} style={styles.monthRow}>
          <View style={styles.monthInfo}>
            <Text style={styles.monthName}>{monthLabel(r.key)}</Text>
            <Text style={styles.monthMeta}>
              {r.count} claim{r.count === 1 ? '' : 's'}
              {r.pendingRupees > 0 ? ` · ${compactRupees(r.pendingRupees)} pending` : ''}
              {r.rejectedRupees > 0 ? ` · ${compactRupees(r.rejectedRupees)} rejected` : ''}
            </Text>
            {r.topCategory && (
              <View style={styles.topCatRow}>
                <View style={[styles.topCatDot, { backgroundColor: categoryMeta(r.topCategory.id).color }]} />
                <Text style={styles.topCatText}>
                  mostly {r.topCategory.label} · {compactRupees(r.topCategory.rupees)}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.monthAmount}>{compactRupees(r.approvedRupees)}</Text>
        </View>
      ))}

      {/* ── Filters ───────────────────────────────────────────── */}
      <Text style={styles.section}>Window</Text>
      <View style={styles.filterRow}>
        {TREND_WINDOWS.map((w) => (
          <TouchableOpacity
            key={w.id}
            onPress={() => setMonths(w.id)}
            activeOpacity={0.8}
            style={[styles.filterChip, months === w.id && styles.filterChipOn]}
          >
            <Text style={[styles.filterText, months === w.id && styles.filterTextOn]}>{w.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.section}>Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
        <TouchableOpacity
          onPress={() => setCategory(null)}
          activeOpacity={0.8}
          style={[styles.filterChip, (!category || category === 'ALL') && styles.filterChipOn]}
        >
          <Text style={[styles.filterText, (!category || category === 'ALL') && styles.filterTextOn]}>
            All
          </Text>
        </TouchableOpacity>
        {data.categories.map((c) => {
          const on = category === c.id;
          return (
            <TouchableOpacity
              key={c.id}
              onPress={() => setCategory(on ? null : c.id)}
              activeOpacity={0.8}
              style={[styles.filterChip, on && { backgroundColor: c.color, borderColor: c.color }]}
            >
              <Text style={[styles.filterText, on && { color: '#fff' }]}>{c.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={styles.footnote}>
        {t.monthsWithSpend} of {data.months.length} months in this window had
        approved spend. Months with none are shown as empty rather than omitted,
        because a gap in the data is a fact about the institute.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 20, paddingBottom: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9' },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },

  headline: {
    backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#eef2f7', padding: 18,
  },
  headlineLabel: {
    fontSize: 11, fontWeight: '700', color: '#64748b', fontFamily: 'Manrope-Bold',
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  headlineValue: {
    fontSize: 28, fontWeight: '800', color: '#0f172a', marginTop: 6,
    fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -1,
  },
  changeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, marginTop: 10,
  },
  changeUp: { backgroundColor: '#fef2f2' },
  changeDown: { backgroundColor: '#f0fdf4' },
  changeText: { fontSize: 12, fontWeight: '600', fontFamily: 'Manrope-SemiBold' },

  statsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  statCard: {
    flex: 1, backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1,
    borderColor: '#eef2f7', padding: 14,
  },
  statLabel: {
    fontSize: 10, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 18, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold',
    marginTop: 4,
  },
  statSmall: { fontSize: 14 },
  statSub: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 2 },

  paceCard: {
    flexDirection: 'row', gap: 10, backgroundColor: '#eff6ff', borderRadius: 14, padding: 14,
    marginTop: 10, borderWidth: 1, borderColor: '#bfdbfe',
  },
  paceCardWarn: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  paceInfo: { flex: 1 },
  paceLabel: {
    fontSize: 10, fontWeight: '700', color: '#1e40af', fontFamily: 'Manrope-Bold',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  paceValue: {
    fontSize: 16, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginTop: 2,
  },
  paceHint: {
    fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 4, lineHeight: 15,
  },

  section: {
    fontSize: 11, fontWeight: '700', color: '#475569', fontFamily: 'Manrope-Bold',
    textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 24, marginBottom: 8,
  },
  chartCard: {
    backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#eef2f7',
    padding: 14, paddingTop: 18,
  },
  paceLineWrap: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  paceLine: {
    position: 'absolute', left: 0, right: 0, height: 1, borderTopWidth: 1,
    borderStyle: 'dashed', borderColor: '#d97706', opacity: 0.6,
  },
  paceLabel2: {
    position: 'absolute', right: 0, fontSize: 8, color: '#d97706', fontFamily: 'Manrope-Bold',
    backgroundColor: '#fff', paddingHorizontal: 2,
  },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 160 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barAmount: { fontSize: 7, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginBottom: 3 },
  barTrack: { width: '62%', height: 110, justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 3 },
  barLabel: { fontSize: 8, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 6 },
  barLabelLast: { color: THEME, fontWeight: '700', fontFamily: 'Manrope-Bold' },

  monthRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',
    borderRadius: 12, borderWidth: 1, borderColor: '#eef2f7', padding: 12, marginBottom: 8,
  },
  monthInfo: { flex: 1 },
  monthName: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  monthMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 2 },
  topCatRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  topCatDot: { width: 6, height: 6, borderRadius: 3 },
  topCatText: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Regular' },
  monthAmount: {
    fontSize: 14, fontWeight: '800', color: '#0f172a', fontFamily: 'Manrope-Bold', marginLeft: 8,
  },

  filterRow: { flexDirection: 'row', gap: 8 },
  catScroll: { marginHorizontal: -20, paddingHorizontal: 20 },
  filterChip: {
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 8,
  },
  filterChipOn: { backgroundColor: THEME, borderColor: THEME },
  filterText: { fontSize: 12, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  filterTextOn: { color: '#fff' },

  footnote: {
    fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 20,
    lineHeight: 17,
  },
});
