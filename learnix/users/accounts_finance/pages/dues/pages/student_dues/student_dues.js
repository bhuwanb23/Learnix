// Student Dues — one family's whole position, from the dues side
// (docs/users/06 §3.3).
//
// The collections desk already has a statement, but it is built around money
// that came IN. This screen is built around money that is OWED, so it leads with
// what is still outstanding, how old the oldest of it is, and how much of the
// bill is already late — which is the number that decides whether to offer a
// payment plan or keep chasing.
//
// Every figure here is derived server-side. The screen in particular does not
// re-derive overdue days or balances from dates: `daysOverdue` is computed at
// start-of-day in the server's timezone, and a client-side guess silently
// disagrees by one on either side of midnight.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import { AnimatedCard, SkeletonStatRow, SkeletonCard, StatusChip } from '../../../../../../components/ui';
import {
  THEME, rupees, compactRupees, formatDate, dueStatusMeta, overduePhrase, fineLabel,
} from '../duesMeta';

export default function StudentDues({ navigation, route }) {
  const studentProfileId = route?.params?.studentProfileId;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!studentProfileId) {
      setError('No student selected');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      setData(await accountsApi.studentDues(studentProfileId));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [studentProfileId]);

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
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData} activeOpacity={0.85}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { student, totals, dues } = data;
  const open = dues.filter((d) => d.collectible);
  const settled = dues.filter((d) => !d.collectible);

  // The overdue share is the decision number: a family 100% late needs a plan,
  // a family 20% late needs a nudge, and the screen should say which.
  const shareTone =
    totals.overdueSharePercent >= 60 ? 'bad' : totals.overdueSharePercent >= 25 ? 'warn' : 'ok';
  const shareCopy =
    shareTone === 'bad'
      ? 'Most of this is already late — consider agreeing a payment plan.'
      : shareTone === 'warn'
        ? 'Part of this is late. Worth a reminder before it ages further.'
        : open.length
          ? 'Almost all of this is still within its due date.'
          : 'Nothing outstanding.';

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
      >
        {/* ── Who ── */}
        <AnimatedCard delay={0} style={styles.card}>
          <View style={styles.personRow}>
            <View style={styles.avatar}>
              <Text style={styles.initial}>{(student.name || '?').charAt(0)}</Text>
            </View>
            <View style={styles.personBody}>
              <Text style={styles.name}>{student.name}</Text>
              <Text style={styles.meta}>
                {student.rollNo}
                {student.programName ? ` · ${student.programName}` : ''}
                {student.semester ? ` · Sem ${student.semester}` : ''}
              </Text>
              <Text style={styles.meta}>{student.email}</Text>
            </View>
          </View>
        </AnimatedCard>

        {/* ── Position ── */}
        <AnimatedCard delay={40} style={styles.card}>
          <Text style={styles.heroLabel}>Outstanding</Text>
          <Text style={styles.heroValue}>{rupees(totals.outstandingRupees)}</Text>
          <Text style={styles.heroSub}>
            {totals.openCount} open bill{totals.openCount === 1 ? '' : 's'}
            {totals.overdueCount > 0 ? ` · ${totals.overdueCount} already late` : ''}
          </Text>

          <View style={styles.divider} />

          <View style={styles.statRow}>
            <StatCell
              label="Overdue"
              value={compactRupees(totals.overdueRupees)}
              color={totals.overdueRupees > 0 ? '#dc2626' : '#64748b'}
              meta={totals.oldestOverdueDays > 0 ? `oldest ${totals.oldestOverdueDays}d` : 'none late'}
            />
            <View style={styles.statDivider} />
            <StatCell
              label="Late fines"
              value={compactRupees(totals.lateFeeRupees)}
              color={totals.lateFeeRupees > 0 ? '#d97706' : '#64748b'}
              meta="assessed"
            />
            <View style={styles.statDivider} />
            <StatCell
              label="Paid to date"
              value={compactRupees(totals.paidRupees)}
              color="#059669"
              meta={`of ${compactRupees(totals.billedRupees)}`}
            />
          </View>

          {/* The overdue share gets an explicit verdict, because "how late is
              late" is the judgement the desk is actually making here. */}
          {open.length > 0 && (
            <View style={styles.shareRow}>
              <View style={[styles.shareBar, { backgroundColor: '#e2e8f0' }]}>
                <View style={[styles.shareFill, { width: `${Math.min(100, totals.overdueSharePercent)}%` }]} />
              </View>
              <Text style={styles.shareText}>
                <Text style={styles.sharePct}>{totals.overdueSharePercent}%</Text> of what is owed is
                already past its due date. {shareCopy}
              </Text>
            </View>
          )}

          {totals.installmentCount > 0 && (
            <View style={styles.planNote}>
              <Ionicons name="git-branch-outline" size={13} color="#7c3aed" />
              <Text style={styles.planNoteText}>
                {totals.installmentCount} bill{totals.installmentCount === 1 ? '' : 's'} on this account
                {totals.installmentCount === 1 ? ' is' : ' are'} part of an agreed payment plan. Those
                instalments are chased on their own schedule.
              </Text>
            </View>
          )}
        </AnimatedCard>

        {/* ── Cross-links ── */}
        <AnimatedCard delay={70} style={[styles.card, styles.linkCard]}>
          <LinkRow
            icon="document-text-outline"
            title="Full statement"
            subtitle="Payments received, receipts and running position"
            onPress={() => navigation.openModule('StudentStatement', {
              studentProfileId: student.id,
              rollNo: student.rollNo,
            })}
          />
          <LinkRow
            icon="add-circle-outline"
            title="Collect a payment"
            subtitle="Take money against these bills"
            onPress={() => navigation.openModule('CollectPayment', { studentProfileId: student.id })}
          />
        </AnimatedCard>

        {/* ── Open bills ── */}
        <Text style={styles.label}>Outstanding bills</Text>
        {open.length === 0 ? (
          <AnimatedCard delay={100} style={styles.card}>
            <View style={styles.emptyRow}>
              <Ionicons name="checkmark-done-outline" size={17} color="#059669" />
              <Text style={styles.emptyText}>
                Nothing is outstanding for this student. Everything billed has been settled or written off.
              </Text>
            </View>
          </AnimatedCard>
        ) : (
          open.map((d, i) => (
            <DueRow
              key={d.id}
              item={d}
              index={i}
              onPress={() => navigation.openModule('DueDetail', { dueId: d.id })}
            />
          ))
        )}

        {/* ── Settled / written off ── */}
        {settled.length > 0 && (
          <>
            <Text style={styles.label}>
              Settled &amp; written off · {totals.clearedCount} cleared, {totals.waivedCount} waived
            </Text>
            {settled.map((d, i) => (
              <DueRow
                key={d.id}
                item={d}
                index={i}
                onPress={() => navigation.openModule('DueDetail', { dueId: d.id })}
              />
            ))}
          </>
        )}

        {/* ── What the desk can do ── */}
        {open.length > 0 && (
          <>
            <Text style={styles.label}>Next actions</Text>
            <AnimatedCard delay={200} style={[styles.card, styles.linkCard]}>
              <LinkRow
                icon="megaphone-outline"
                title="Chase the oldest bill first"
                subtitle={oldestOf(open)?.title ?? 'No bill is late yet'}
                onPress={() => {
                  const worst = oldestOf(open);
                  if (worst) navigation.openModule('DueDetail', { dueId: worst.id });
                }}
              />
              <LinkRow
                icon="school-outline"
                title="See how this cohort is doing"
                subtitle="Recovery by programme, semester and year"
                onPress={() => navigation.openModule('CourseDues', { studentProfileId: student.id })}
              />
            </AnimatedCard>
          </>
        )}

        {open.length > 0 && totals.overdueSharePercent >= 60 && (
          <Text style={styles.footnote}>
            A waiver is often the fairer answer at this point, and it can be reinstated later if
            the money arrives anyway. Every waiver is audited against the officer who approved it.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

function oldestOf(open) {
  return open.slice().sort((a, b) => (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0))[0] ?? null;
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

function LinkRow({ icon, title, subtitle, onPress }) {
  return (
    <TouchableOpacity style={styles.linkRow} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.linkIcon, { backgroundColor: THEME + '12' }]}>
        <Ionicons name={icon} size={16} color={THEME} />
      </View>
      <View style={styles.linkBody}>
        <Text style={styles.linkTitle}>{title}</Text>
        <Text style={styles.linkSub}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
    </TouchableOpacity>
  );
}

function DueRow({ item, index, onPress }) {
  const meta = dueStatusMeta(item.status);
  const fine = fineLabel(item);
  const progress = item.amountRupees > 0 ? item.paidRupees / item.amountRupees : 0;

  return (
    <AnimatedCard delay={120 + index * 25} onPress={onPress} style={styles.card}>
      <View style={styles.dueTop}>
        <View style={[styles.dueIcon, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={16} color={meta.color} />
        </View>
        <View style={styles.dueBody}>
          <View style={styles.dueTitleLine}>
            <Text style={styles.dueTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={[styles.dueAmount, { color: item.collectible ? '#dc2626' : '#64748b' }]}>
              {rupees(item.balanceRupees)}
            </Text>
          </View>
          <Text style={styles.dueMeta}>
            {item.academicYear ? `${item.academicYear} · ` : ''}
            {item.collectible
              ? item.daysOverdue > 0
                ? overduePhrase(item.daysOverdue)
                : `due ${formatDate(item.dueDate)}`
              : meta.label}
          </Text>

          {item.status === 'PARTIAL' && (
            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.min(100, Math.round(progress * 100))}%` }]} />
              </View>
              <Text style={styles.progressText}>{rupees(item.paidRupees)} of {rupees(item.amountRupees)} paid</Text>
            </View>
          )}

          <View style={styles.dueChips}>
            <StatusChip label={meta.label} color={meta.color} />
            {fine && (
              <View style={styles.fineTag}>
                <Ionicons name="alert-circle-outline" size={9} color="#d97706" />
                <Text style={styles.fineText}>{fine}</Text>
              </View>
            )}
            {item.isInstallment && item.installmentSequence && (
              <View style={styles.instTag}>
                <Ionicons name="git-branch-outline" size={9} color="#7c3aed" />
                <Text style={styles.instText}>Instalment {item.installmentSequence}</Text>
              </View>
            )}
            {item.reminderCount > 0 && (
              <View style={styles.chaseTag}>
                <Ionicons name="megaphone-outline" size={9} color={THEME} />
                <Text style={styles.chaseText}>chased {item.reminderCount}×</Text>
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
  card: { marginBottom: 9 },
  label: { fontSize: 11, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 14, marginBottom: 9 },

  // Person
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: THEME + '14', justifyContent: 'center', alignItems: 'center' },
  initial: { fontSize: 18, fontWeight: '800', color: THEME, fontFamily: 'PlusJakartaSans-Bold' },
  personBody: { flex: 1 },
  name: { fontSize: 15, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  meta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 2 },

  // Position
  heroLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: 14, paddingTop: 14 },
  heroValue: { fontSize: 28, fontWeight: '800', color: '#dc2626', fontFamily: 'PlusJakartaSans-Bold', paddingHorizontal: 14, marginTop: 3, letterSpacing: -1 },
  heroSub: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', paddingHorizontal: 14, marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 13 },
  statRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  statCell: { flex: 1 },
  statDivider: { width: 1, height: 30, backgroundColor: '#f1f5f9' },
  statLabel: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium' },
  statValue: { fontSize: 15, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold', marginTop: 2 },
  statMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },
  shareRow: { paddingHorizontal: 14, paddingTop: 14 },
  shareBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  shareFill: { height: '100%', backgroundColor: '#dc2626', borderRadius: 3 },
  shareText: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 7, lineHeight: 16 },
  sharePct: { fontWeight: '800', color: '#dc2626' },
  planNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 14, marginTop: 12, padding: 11, borderRadius: 11, backgroundColor: '#f5f3ff' },
  planNoteText: { flex: 1, fontSize: 11, color: '#5b21b6', fontFamily: 'Manrope-Medium', lineHeight: 16 },

  // Links
  linkCard: { paddingVertical: 2 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13 },
  linkIcon: { width: 34, height: 34, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  linkBody: { flex: 1 },
  linkTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  linkSub: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1, lineHeight: 14 },

  // Due row
  dueTop: { flexDirection: 'row', alignItems: 'flex-start', padding: 13 },
  dueIcon: { width: 34, height: 34, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginRight: 11 },
  dueBody: { flex: 1 },
  dueTitleLine: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  dueTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  dueAmount: { fontSize: 14, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold' },
  dueMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 2 },
  progressWrap: { marginTop: 7 },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: '#e2e8f0', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#d97706', borderRadius: 3 },
  progressText: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 3 },
  dueChips: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  fineTag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, backgroundColor: '#fffbeb' },
  fineText: { fontSize: 10, color: '#d97706', fontFamily: 'Manrope-Medium' },
  instTag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, backgroundColor: '#f5f3ff' },
  instText: { fontSize: 10, color: '#7c3aed', fontFamily: 'Manrope-Medium' },
  chaseTag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, backgroundColor: THEME + '10' },
  chaseText: { fontSize: 10, color: THEME, fontFamily: 'Manrope-Medium' },

  emptyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14 },
  emptyText: { flex: 1, fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', lineHeight: 17 },
  footnote: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 16, lineHeight: 15 },
});
