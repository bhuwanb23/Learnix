// Course / Semester Dues — the book grouped by cohort (docs/users/06 §3.3).
//
// A bill list answers "who owes me?". This answers "WHERE are they not paying?",
// which is the question a HOD or a principal actually asks, and the one that
// turns a recovery problem into an academic-department problem.
//
// The grouping is program × semester × academic year. Semester comes from the
// student's current semester — fees are raised per program per year and carry no
// semester of their own — so an institution with two running batches of the same
// program sees them apart instead of merged into one meaningless total.
//
// `recoveryPercent` is the headline: of everything billed to a cohort, how much
// actually came back. It is deliberately NOT `collectionPercent`; where the two
// disagree, the gap is money that is waived or on a plan, and both are shown so
// the difference is explainable rather than mysterious.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonStatRow, SkeletonCard } from '../../../../../../components/ui';
import { THEME, rupees, compactRupees, overduePhrase } from '../../duesMeta';

export default function CourseDues({ navigation, route }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [yearId, setYearId] = useState(route?.params?.academicYearId ?? '');

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setData(await accountsApi.duesCourses(yearId ? { academicYearId: yearId } : {}));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [yearId]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

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

  const { stats, years, groups } = data;

  // The stacked bar is drawn from the server's rupees, not from percentages that
  // might each round to a slightly different share of the track. Overdue is
  // capped at whatever is left unrecovered, so the segments can never overflow.
  const recPct = Math.min(100, stats.recoveryPercent);
  const overPct = stats.billedRupees > 0
    ? Math.min(100 - recPct, Math.round((stats.overdueRupees / stats.billedRupees) * 100))
    : 0;

  // Groups are sorted worst-overdue-money first by the server, so the top of the
  // list is where the desk should start without re-sorting anything.
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
      >
        <AnimatedCard delay={0} style={styles.card}>
          <Text style={styles.heroLabel}>Recovery across the book</Text>
          <View style={styles.heroTop}>
            <Text style={styles.heroValue}>{stats.recoveryPercent}%</Text>
            <View style={styles.heroRight}>
              <Text style={styles.heroAmount}>{compactRupees(stats.paidRupees)}</Text>
              <Text style={styles.heroAmountMeta}>of {compactRupees(stats.billedRupees)} billed</Text>
            </View>
          </View>

          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${recPct}%` }]} />
            <View style={[styles.barOverdue, { width: `${overPct}%` }]} />
          </View>
          <Text style={styles.heroLegend}>
            <Text style={{ color: '#059669' }}>■</Text> {recPct}% recovered ·{' '}
            <Text style={{ color: '#dc2626' }}>■</Text> {overPct}% overdue ·{' '}
            <Text style={{ color: '#e2e8f0' }}>■</Text> {Math.max(0, 100 - recPct - overPct)}% within term
          </Text>

          <View style={styles.divider} />

          <View style={styles.statRow}>
            <StatCell label="Outstanding" value={compactRupees(stats.outstandingRupees)} color="#dc2626" meta={`${stats.groupCount} cohorts`} />
            <View style={styles.statDivider} />
            <StatCell label="Overdue" value={compactRupees(stats.overdueRupees)} color="#dc2626" meta={`${stats.studentCount} students`} />
            <View style={styles.statDivider} />
            <StatCell label="Late fines" value={compactRupees(stats.lateFeeRupees)} color="#d97706" meta={`${stats.installmentCount} in plans`} />
          </View>
        </AnimatedCard>

        {/* Year filter — the server sends the years that exist, and marks which
            ones actually carry dues, so a filter never produces a silent zero. */}
        {years.length > 0 && (
          <>
            <Text style={styles.label}>Academic year</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <TouchableOpacity
                style={[styles.chip, !yearId && styles.chipActive]}
                onPress={() => setYearId('')}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, !yearId && styles.chipTextActive]}>All years</Text>
              </TouchableOpacity>
              {years.map((y) => (
                <TouchableOpacity
                  key={y.id}
                  style={[styles.chip, yearId === y.id && styles.chipActive, !y.hasDues && styles.chipEmpty]}
                  onPress={() => setYearId(y.id)}
                  activeOpacity={0.8}
                >
                  {y.isCurrent && <Ionicons name="ellipse" size={6} color={yearId === y.id ? '#fff' : '#059669'} />}
                  <Text style={[styles.chipText, yearId === y.id && styles.chipTextActive]}>{y.name}</Text>
                  {!y.hasDues && <Text style={styles.chipEmptyText}>no dues</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <Text style={styles.label}>
          Programme · semester · year
        </Text>

        {groups.length === 0 ? (
          <>
            <EmptyState
              icon="school-outline"
              title="Nothing billed in this year"
              subtitle="No cohort has a fee raised against it for the selected academic year."
            />
          </>
        ) : (
          groups.map((g, i) => (
            <GroupCard key={g.key} group={g} index={i} navigation={navigation} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function GroupCard({ group: g, index, navigation }) {
  const recovery = Math.min(100, g.recoveryPercent);
  // A cohort that has paid nothing at all is the finding; one that has paid
  // most of it is just a normal term.
  const tone = g.billedRupees === 0 ? 'idle' : recovery < 40 ? 'bad' : recovery < 75 ? 'warn' : 'ok';
  const toneColor = { idle: '#94a3b8', bad: '#dc2626', warn: '#d97706', ok: '#059669' }[tone];
  const toneBg = { idle: '#f1f5f9', bad: '#fef2f2', warn: '#fffbeb', ok: '#f0fdf4' }[tone];

  return (
    <AnimatedCard delay={80 + index * 30} style={styles.group}>
      <View style={styles.groupTop}>
        <View style={styles.groupHead}>
          <Text style={styles.groupTitle} numberOfLines={1}>
            {g.programName}
            {g.semester ? ` · Sem ${g.semester}` : ''}
          </Text>
          <Text style={styles.groupMeta}>
            {g.academicYearName}
            {g.isCurrentYear ? ' · current' : ''}
            {g.departmentName ? ` · ${g.departmentName}` : ''}
          </Text>
        </View>
        <View style={[styles.recoveryBadge, { backgroundColor: toneBg }]}>
          <Text style={[styles.recoveryPct, { color: toneColor }]}>{g.recoveryPercent}%</Text>
          <Text style={[styles.recoveryLabel, { color: toneColor }]}>recovered</Text>
        </View>
      </View>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${recovery}%`, backgroundColor: toneColor }]} />
      </View>

      <View style={styles.groupStats}>
        <MiniStat label="Students" value={String(g.studentCount)} />
        <MiniStat label="Billed" value={compactRupees(g.billedRupees)} />
        <MiniStat label="Outstanding" value={compactRupees(g.outstandingRupees)} color="#dc2626" />
        <MiniStat label="Overdue" value={compactRupees(g.overdueRupees)} color={g.overdueRupees > 0 ? '#dc2626' : undefined} />
      </View>

      {/* Money that is deliberately NOT owed is itemised, so the outstanding
          figure can always be reconciled against the billed figure. */}
      {(g.waivedCount > 0 || g.supersededCount > 0 || g.installmentCount > 0) && (
        <View style={styles.groupFlags}>
          {g.waivedCount > 0 && <Flag icon="gift-outline" text={`${g.waivedCount} waived`} color="#7c3aed" />}
          {g.supersededCount > 0 && <Flag icon="layers-outline" text={`${g.supersededCount} split into plans`} color="#64748b" />}
          {g.installmentCount > 0 && <Flag icon="git-branch-outline" text={`${g.installmentCount} instalments`} color="#7c3aed" />}
          {g.lateFeeRupees > 0 && <Flag icon="alert-circle-outline" text={`${compactRupees(g.lateFeeRupees)} in fines`} color="#d97706" />}
        </View>
      )}

      <View style={styles.groupFoot}>
        <View style={styles.groupFootText}>
          <Text style={styles.groupFootMain}>
            {g.openCount} open · {g.clearedCount} cleared
            {g.oldestOverdueDays > 0 ? ` · oldest ${overduePhrase(g.oldestOverdueDays)}` : ''}
          </Text>
          {g.overdueStudentCount > 0 && (
            <Text style={styles.groupFootSub}>
              {g.overdueStudentCount} of {g.studentCount} students have something overdue
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
      </View>
    </AnimatedCard>
  );
}

function StatCell({ label, value, color, meta }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statMeta}>{meta}</Text>
    </View>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <View style={styles.mini}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={[styles.miniValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

function Flag({ icon, text, color }) {
  return (
    <View style={styles.flag}>
      <Ionicons name={icon} size={10} color={color} />
      <Text style={[styles.flagText, { color }]}>{text}</Text>
    </View>
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
  card: { marginBottom: 10 },
  label: { fontSize: 11, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 14, marginBottom: 9 },

  heroLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 5 },
  heroValue: { fontSize: 32, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -1.2 },
  heroRight: { alignItems: 'flex-end' },
  heroAmount: { fontSize: 14, fontWeight: '800', color: '#059669', fontFamily: 'PlusJakartaSans-Bold' },
  heroAmountMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: '#e2e8f0', overflow: 'hidden', marginTop: 13, flexDirection: 'row' },
  barFill: { height: '100%', backgroundColor: '#059669' },
  barOverdue: { height: '100%', backgroundColor: '#dc2626' },
  heroLegend: { fontSize: 9, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 6 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 13 },
  statRow: { flexDirection: 'row', alignItems: 'center' },
  statCell: { flex: 1 },
  statDivider: { width: 1, height: 30, backgroundColor: '#f1f5f9' },
  statLabel: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium' },
  statValue: { fontSize: 15, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold', marginTop: 2 },
  statMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },

  chipRow: { gap: 8, paddingRight: 8, marginBottom: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  chipActive: { backgroundColor: THEME, borderColor: THEME },
  chipEmpty: { opacity: 0.6 },
  chipText: { fontSize: 12, fontWeight: '600', color: '#475569', fontFamily: 'Manrope-SemiBold' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  chipEmptyText: { fontSize: 9, color: '#94a3b8', fontFamily: 'Manrope-Regular' },

  group: { marginBottom: 10 },
  groupTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 13, paddingBottom: 8 },
  groupHead: { flex: 1 },
  groupTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  groupMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 2 },
  recoveryBadge: { alignItems: 'center', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 11 },
  recoveryPct: { fontSize: 15, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold' },
  recoveryLabel: { fontSize: 9, fontFamily: 'Manrope-Medium', marginTop: 1 },
  groupStats: { flexDirection: 'row', paddingHorizontal: 13, paddingTop: 12, paddingBottom: 6 },
  mini: { flex: 1 },
  miniLabel: { fontSize: 9, color: '#94a3b8', fontFamily: 'Manrope-Medium' },
  miniValue: { fontSize: 12, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold', marginTop: 2 },
  groupFlags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 13, paddingTop: 6, paddingBottom: 4 },
  flag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: '#f8fafc' },
  flagText: { fontSize: 10, fontFamily: 'Manrope-Medium' },
  groupFoot: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingHorizontal: 13, paddingVertical: 11, marginTop: 8 },
  groupFootText: { flex: 1 },
  groupFootMain: { fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium' },
  groupFootSub: { fontSize: 10, color: '#dc2626', fontFamily: 'Manrope-Medium', marginTop: 2 },
});
