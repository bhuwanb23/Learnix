import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonCard } from '../../../../../components/ui';

const THEME = '#b45309';

const FINE_COLORS = { PENDING: '#dc2626', PAID: '#059669', WAIVED: '#64748b' };

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function StudentProfile({ navigation, route }) {
  const presetStudentId = route?.params?.studentId;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(presetStudentId));
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (studentId) => {
    if (!studentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const result = await libraryApi.studentBorrowingProfile(studentId);
      setData(result);
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (presetStudentId) load(presetStudentId);
    else setLoading(false);
  }, [presetStudentId, load]);

  const search = async () => {
    const q = query.trim();
    if (q.length < 2) {
      Alert.alert('Enter a Query', 'Type at least 2 characters of roll number or name.');
      return;
    }
    setSearching(true);
    setNotFound(false);
    try {
      const result = await libraryApi.searchStudents(q);
      const list = result.students || [];
      if (list.length === 0) {
        setNotFound(true);
        setData(null);
      } else if (list.length === 1) {
        setQuery('');
        load(list[0].id);
      } else {
        Alert.alert(
          'Multiple Matches',
          'Select the student you meant:',
          list.slice(0, 5).map((s) => ({
            text: `${s.name} (${s.rollNo})`,
            onPress: () => { setQuery(''); load(s.id); },
          })).concat([{ text: 'Cancel', style: 'cancel' }]),
        );
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSearching(false);
    }
  };

  // ── Search state ──
  if (!data) {
    return (
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <AnimatedCard delay={0} style={styles.block}>
          <View style={styles.formHeader}>
            <View style={styles.formIcon}>
              <Ionicons name="people-outline" size={18} color={THEME} />
            </View>
            <View style={styles.formHeaderText}>
              <Text style={styles.formTitle}>Look up a student</Text>
              <Text style={styles.formSub}>Check borrowing standing before issuing.</Text>
            </View>
          </View>

          <View style={styles.searchRow}>
            <TextInput
              style={styles.input}
              value={query}
              onChangeText={setQuery}
              placeholder="Roll number or name"
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
              returnKeyType="search"
              onSubmitEditing={search}
            />
            <TouchableOpacity
              style={[styles.lookupBtn, searching && styles.btnDisabled]}
              onPress={search}
              activeOpacity={0.85}
              disabled={searching}
            >
              {searching
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="search" size={16} color="#fff" />}
            </TouchableOpacity>
          </View>

          {notFound && (
            <View style={styles.notFoundBox}>
              <Ionicons name="person-outline" size={16} color="#64748b" />
              <Text style={styles.notFoundText}>No student matches that query.</Text>
            </View>
          )}

          {error && <Text style={styles.errorInline}>{error}</Text>}
        </AnimatedCard>

        <AnimatedCard delay={60} style={styles.block}>
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#2563eb" />
            <Text style={styles.infoText}>
              Standing is computed live from active loans, overdue count and unpaid fines. It is the same check the issue desk applies.
            </Text>
          </View>
        </AnimatedCard>

        {loading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}
      </ScrollView>
    );
  }

  // ── Profile state ──
  const { student, stats, limits, blockers, activeLoans, fines, eligible } = data;
  const usagePct = Math.min(100, Math.round((stats.activeLoans / limits.maxActiveLoans) * 100));

  const onRefresh = () => {
    setRefreshing(true);
    load(student.id).finally(() => setRefreshing(false));
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />
      }
    >
      {/* Identity */}
      <AnimatedCard delay={0} style={styles.block}>
        <View style={styles.identity}>
          <View style={styles.bigAvatar}>
            <Text style={styles.bigAvatarText}>{student.name.charAt(0)}</Text>
          </View>
          <Text style={styles.identityName}>{student.name}</Text>
          <Text style={styles.identityRoll}>{student.rollNo}</Text>
          <View style={styles.identityMeta}>
            {[student.program, student.batch, student.section, student.semester ? `Sem ${student.semester}` : null]
              .filter(Boolean)
              .map((m) => (
                <View key={m} style={styles.metaChip}><Text style={styles.metaChipText}>{m}</Text></View>
              ))}
          </View>
        </View>
      </AnimatedCard>

      {/* Eligibility verdict */}
      <AnimatedCard delay={60} style={styles.block}>
        <View style={[
          styles.verdict,
          { backgroundColor: eligible ? '#f0fdf4' : '#fef2f2', borderColor: eligible ? '#bbf7d0' : '#fecaca' },
        ]}>
          <Ionicons
            name={eligible ? 'checkmark-circle' : 'close-circle'}
            size={22}
            color={eligible ? '#059669' : '#dc2626'}
          />
          <View style={styles.verdictBody}>
            <Text style={[styles.verdictTitle, { color: eligible ? '#047857' : '#991b1b' }]}>
              {eligible ? 'Eligible to borrow' : 'Blocked from borrowing'}
            </Text>
            <Text style={styles.verdictSub}>
              {eligible
                ? 'All checks pass at the circulation desk.'
                : `${blockers.length} issue(s) must be resolved first.`}
            </Text>
          </View>
        </View>

        {blockers.map((b) => (
          <View key={b.code} style={styles.blockerRow}>
            <Ionicons name="remove-circle" size={15} color="#dc2626" />
            <Text style={styles.blockerText}>{b.message}</Text>
          </View>
        ))}
      </AnimatedCard>

      {/* Limits */}
      <AnimatedCard delay={120} style={styles.block}>
        <Text style={styles.cardLabel}>Borrowing Standing</Text>

        <View style={styles.limitBlock}>
          <View style={styles.limitHeader}>
            <Text style={styles.limitLabel}>Active loans</Text>
            <Text style={styles.limitValue}>
              {stats.activeLoans} of {limits.maxActiveLoans}
            </Text>
          </View>
          <View style={styles.track}>
            <View style={[
              styles.fill,
              { width: `${usagePct}%`, backgroundColor: usagePct >= 100 ? '#dc2626' : THEME },
            ]} />
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, stats.overdueLoans > 0 && { color: '#dc2626' }]}>
              {stats.overdueLoans}
            </Text>
            <Text style={styles.statLabel}>Overdue</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{stats.totalBorrowed}</Text>
            <Text style={styles.statLabel}>All time</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={[styles.statValue, stats.pendingFineRupees > 0 && { color: '#dc2626' }]}>
              ₹{stats.pendingFineRupees}
            </Text>
            <Text style={styles.statLabel}>Unpaid</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{limits.maxRenewalsPerLoan}</Text>
            <Text style={styles.statLabel}>Max renewals</Text>
          </View>
        </View>
      </AnimatedCard>

      {/* Active loans */}
      <Text style={styles.sectionLabel}>Current Loans</Text>
      {activeLoans.length === 0 ? (
        <AnimatedCard delay={180} style={styles.block}>
          <View style={styles.emptyInline}>
            <Ionicons name="library-outline" size={20} color="#94a3b8" />
            <Text style={styles.emptyInlineText}>No books currently on loan.</Text>
          </View>
        </AnimatedCard>
      ) : (
        activeLoans.map((l, idx) => (
          <AnimatedCard
            key={l.id}
            delay={180 + idx * 40}
            style={styles.block}
            onPress={() => navigation.openModule('LoanDetail', { loanId: l.id })}
          >
            <View style={styles.loanRow}>
              <View style={[styles.loanIcon, { backgroundColor: l.isOverdue ? '#fef2f2' : '#f0fdf4' }]}>
                <Ionicons name="book-outline" size={17} color={l.isOverdue ? '#dc2626' : '#059669'} />
              </View>
              <View style={styles.loanBody}>
                <Text style={styles.loanTitle} numberOfLines={1}>{l.book.title}</Text>
                <Text style={styles.loanMeta}>
                  {l.isOverdue ? `${l.daysOverdue}d overdue` : `${l.daysLeft}d left`} · due {formatDate(l.dueDate)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color="#cbd5e1" />
            </View>
          </AnimatedCard>
        ))
      )}

      {/* Fines */}
      <View style={styles.listHeader}>
        <Text style={styles.sectionLabel}>Fine History</Text>
        <TouchableOpacity onPress={() => navigation.switchTab('Fines')} activeOpacity={0.8}>
          <Text style={styles.linkText}>Manage</Text>
        </TouchableOpacity>
      </View>

      {fines.length === 0 ? (
        <EmptyState
          icon="shield-checkmark-outline"
          title="No fines on record"
          subtitle="This student has never incurred an overdue fine."
          color="#059669"
        />
      ) : (
        fines.map((f, idx) => {
          const color = FINE_COLORS[f.status] ?? '#64748b';
          return (
            <AnimatedCard key={f.id} delay={220 + idx * 40} style={styles.block}>
              <View style={styles.fineRow}>
                <View style={[styles.loanIcon, { backgroundColor: color + '14' }]}>
                  <Ionicons name="cash-outline" size={17} color={color} />
                </View>
                <View style={styles.loanBody}>
                  <Text style={styles.loanTitle} numberOfLines={1}>{f.book}</Text>
                  <Text style={styles.loanMeta}>{f.daysOverdue}d overdue · {formatDate(f.createdAt)}</Text>
                </View>
                <View style={styles.fineRight}>
                  <Text style={[styles.fineAmount, { color }]}>₹{f.amountRupees}</Text>
                  <Text style={[styles.fineStatus, { color }]}>{f.status}</Text>
                </View>
              </View>
            </AnimatedCard>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 24, paddingBottom: 40 },
  block: { marginBottom: 10 },
  btnDisabled: { opacity: 0.5 },

  // Search
  formHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  formIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: THEME + '14', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  formHeaderText: { flex: 1 },
  formTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  formSub: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  searchRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, height: 46, fontSize: 14, color: '#0f172a', fontFamily: 'Manrope-Regular' },
  lookupBtn: { width: 46, height: 46, borderRadius: 12, backgroundColor: THEME, justifyContent: 'center', alignItems: 'center' },
  errorInline: { fontSize: 12, color: '#dc2626', fontFamily: 'Manrope-Medium', marginTop: 10 },
  notFoundBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, padding: 11, borderRadius: 10, backgroundColor: '#f8fafc' },
  notFoundText: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Medium', flex: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14 },
  infoText: { flex: 1, fontSize: 12, color: '#475569', fontFamily: 'Manrope-Medium', lineHeight: 18, marginLeft: 10 },

  // Identity
  identity: { alignItems: 'center', paddingVertical: 18 },
  bigAvatar: { width: 68, height: 68, borderRadius: 34, backgroundColor: THEME + '14', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  bigAvatarText: { fontSize: 26, fontWeight: '800', color: THEME, fontFamily: 'PlusJakartaSans-Bold' },
  identityName: { fontSize: 17, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  identityRoll: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },
  identityMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, justifyContent: 'center' },
  metaChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7, backgroundColor: '#f1f5f9' },
  metaChipText: { fontSize: 10, fontWeight: '600', color: '#475569', fontFamily: 'Manrope-SemiBold' },

  // Verdict
  verdict: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  verdictBody: { flex: 1 },
  verdictTitle: { fontSize: 14, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  verdictSub: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  blockerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 12 },
  blockerText: { fontSize: 11, color: '#991b1b', fontFamily: 'Manrope-Medium', flex: 1, lineHeight: 16 },

  // Limits
  cardLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 },
  limitBlock: { marginBottom: 16 },
  limitHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  limitLabel: { fontSize: 12, color: '#475569', fontFamily: 'Manrope-Medium' },
  limitValue: { fontSize: 12, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  track: { height: 8, borderRadius: 4, backgroundColor: '#eef2f7', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#eef2f7', paddingTop: 14 },
  statCell: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: '#eef2f7' },
  statValue: { fontSize: 15, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  statLabel: { fontSize: 9, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 2 },

  // Lists
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginTop: 8, marginBottom: 10 },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  linkText: { fontSize: 12, fontWeight: '700', color: THEME, fontFamily: 'Manrope-Bold' },
  loanRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  loanIcon: { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  loanBody: { flex: 1 },
  loanTitle: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  loanMeta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  fineRight: { alignItems: 'flex-end' },
  fineAmount: { fontSize: 13, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold' },
  fineStatus: { fontSize: 9, fontWeight: '700', fontFamily: 'Manrope-Bold', marginTop: 1 },
  emptyInline: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  emptyInlineText: { fontSize: 12, color: '#94a3b8', fontFamily: 'Manrope-Medium' },
});