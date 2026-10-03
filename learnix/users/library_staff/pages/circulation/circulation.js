import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../services/api';
import { AnimatedCard, EmptyState, SearchBar, SkeletonStatRow, SkeletonCard } from '../../../../components/ui';

const THEME = '#b45309';

// Loan health is derived server-side; these map a filter id to its label + color.
const FILTERS = [
  { id: 'ACTIVE', label: 'All Active' },
  { id: 'DUE_TODAY', label: 'Due Today' },
  { id: 'DUE_SOON', label: 'Due Soon' },
  { id: 'OVERDUE', label: 'Overdue' },
  { id: 'ISSUED', label: 'On Time' },
];

function loanHealth(loan) {
  if (loan.isOverdue) {
    return {
      color: '#dc2626',
      icon: 'alert-circle',
      label: `${loan.daysOverdue}d overdue`,
      bg: '#fef2f2',
    };
  }
  if (loan.daysLeft === 0) {
    return { color: '#d97706', icon: 'today', label: 'Due today', bg: '#fffbeb' };
  }
  if (loan.daysLeft <= 3) {
    return {
      color: '#d97706',
      icon: 'time',
      label: `${loan.daysLeft}d left`,
      bg: '#fffbeb',
    };
  }
  return { color: '#059669', icon: 'checkmark-circle', label: `${loan.daysLeft}d left`, bg: '#f0fdf4' };
}

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function CirculationModule({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ACTIVE');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await libraryApi.loans({ status: filter, q: search });
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, search]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const stats = data?.stats || {};
  const loans = data?.loans || [];

  const activeFilterLabel = useMemo(
    () => FILTERS.find((f) => f.id === filter)?.label ?? 'Loans',
    [filter],
  );

  const handleReturn = async (loan) => {
    setBusyId(loan.id);
    try {
      const result = await libraryApi.returnBook(loan.id);
      const fineMsg = result.fine
        ? `\n\nFine raised: ₹${result.fine.amountRupees} for ${result.fine.daysOverdue} day(s) overdue.`
        : '\n\nReturned on time — no fine.';
      Alert.alert(
        'Returned',
        `"${result.book}" checked in after ${result.daysKept} day(s).${fineMsg}`,
        [{ text: 'Done', onPress: fetchData }],
      );
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleRenew = async (loan) => {
    setBusyId(loan.id);
    try {
      const result = await libraryApi.renewLoan(loan.id, 14);
      Alert.alert(
        'Renewed',
        `"${result.book}" extended by 14 days. New due date: ${formatDate(result.dueDate)}.\n${result.renewalsLeft} renewal(s) left.`,
        [{ text: 'Done', onPress: fetchData }],
      );
    } catch (err) {
      Alert.alert('Cannot Renew', err.message);
    } finally {
      setBusyId(null);
    }
  };

  const confirmRenew = (loan) => {
    Alert.alert(
      'Renew Loan?',
      `Extend "${loan.book.title}" by 14 days?\n\n${loan.renewalsLeft} renewal(s) remaining.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Renew', onPress: () => handleRenew(loan) },
      ],
    );
  };

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
      {/* Desk shortcuts */}
      <View style={styles.shortcutRow}>
        <TouchableOpacity style={styles.shortcut} onPress={() => navigation.openModule('IssueBook')} activeOpacity={0.85}>
          <View style={[styles.shortcutIcon, { backgroundColor: THEME }]}>
            <Ionicons name="arrow-forward-circle" size={20} color="#fff" />
          </View>
          <Text style={styles.shortcutLabel}>Issue Book</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shortcut} onPress={() => navigation.openModule('LoanHistory')} activeOpacity={0.85}>
          <View style={[styles.shortcutIcon, { backgroundColor: '#2563eb' }]}>
            <Ionicons name="time-outline" size={20} color="#fff" />
          </View>
          <Text style={styles.shortcutLabel}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shortcut} onPress={() => navigation.openModule('StudentLookup')} activeOpacity={0.85}>
          <View style={[styles.shortcutIcon, { backgroundColor: '#059669' }]}>
            <Ionicons name="people-outline" size={20} color="#fff" />
          </View>
          <Text style={styles.shortcutLabel}>Student</Text>
        </TouchableOpacity>
      </View>

      {/* Live stats */}
      <AnimatedCard delay={0} style={[styles.block, styles.statsRow]}>
        {[
          { label: 'Active', value: stats.active ?? 0, icon: 'swap-horizontal', color: THEME },
          { label: 'Overdue', value: stats.overdue ?? 0, icon: 'alert-circle', color: '#dc2626' },
          { label: 'Due Today', value: stats.dueToday ?? 0, icon: 'today', color: '#d97706' },
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

      <SearchBar placeholder="Search book, roll number or student…" onSearch={setSearch} style={styles.search} />

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
        <View style={styles.filtersRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterChip, filter === f.id && styles.filterChipActive]}
              onPress={() => setFilter(f.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterText, filter === f.id && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.listHeader}>
        <Text style={styles.sectionLabel}>{activeFilterLabel}</Text>
        <Text style={styles.countLabel}>{loans.length} loan{loans.length === 1 ? '' : 's'}</Text>
      </View>

      {loans.length === 0 ? (
        <EmptyState
          icon={search ? 'search-outline' : 'checkmark-circle-outline'}
          title={search ? 'No matching loans' : 'Nothing in this view'}
          subtitle={
            search
              ? 'Try a different book title, roll number or student name.'
              : 'No loans match this filter right now. Issue a book to get started.'
          }
          color={THEME}
        />
      ) : (
        loans.map((loan, idx) => {
          const health = loanHealth(loan);
          const busy = busyId === loan.id;
          const canRenew = !loan.isOverdue && loan.renewalsLeft > 0;
          return (
            <AnimatedCard
              key={loan.id}
              delay={100 + idx * 50}
              style={styles.block}
              onPress={() => navigation.openModule('LoanDetail', { loanId: loan.id })}
            >
              <View style={styles.loanRow}>
                <View style={[styles.bookIcon, { backgroundColor: health.bg }]}>
                  <Ionicons name="book-outline" size={18} color={health.color} />
                </View>

                <View style={styles.loanBody}>
                  <Text style={styles.bookTitle} numberOfLines={1}>{loan.book.title}</Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {loan.student.name} · {loan.student.rollNo}
                  </Text>

                  <View style={styles.chipRow}>
                    <View style={[styles.healthChip, { backgroundColor: health.bg }]}>
                      <Ionicons name={health.icon} size={10} color={health.color} />
                      <Text style={[styles.healthText, { color: health.color }]}>{health.label}</Text>
                    </View>
                    {loan.renewCount > 0 && (
                      <View style={styles.renewChip}>
                        <Ionicons name="refresh" size={10} color="#2563eb" />
                        <Text style={styles.renewText}>{loan.renewalsLeft} left</Text>
                      </View>
                    )}
                    {loan.fine?.status === 'PENDING' && (
                      <View style={styles.fineChip}>
                        <Text style={styles.fineText}>₹{loan.fine.amountRupees}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.dueText}>Due {formatDate(loan.dueDate)}</Text>
                </View>

                <View style={styles.actions}>
                  {canRenew && (
                    <TouchableOpacity
                      style={styles.renewBtn}
                      onPress={() => confirmRenew(loan)}
                      activeOpacity={0.85}
                      disabled={busy}
                    >
                      <Ionicons name="refresh" size={14} color="#2563eb" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.returnBtn, busy && styles.returnBtnBusy]}
                    onPress={() => handleReturn(loan)}
                    activeOpacity={0.85}
                    disabled={busy}
                  >
                    {busy
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Ionicons name="arrow-undo" size={15} color="#fff" />}
                  </TouchableOpacity>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9', padding: 24 },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  block: { marginBottom: 10 },

  // Shortcuts
  shortcutRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  shortcut: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 12,
    alignItems: 'center',
  },
  shortcutIcon: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  shortcutLabel: { fontSize: 11, fontWeight: '700', color: '#334155', fontFamily: 'Manrope-Bold' },

  // Stats
  statsRow: { flexDirection: 'row' },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6 },
  statDivider: { width: 1, backgroundColor: '#eef2f7', marginVertical: 8 },
  statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 16, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },

  search: { marginBottom: 12 },

  // Filters
  filtersScroll: { flexGrow: 0, marginHorizontal: -24 },
  filtersRow: { flexDirection: 'row', paddingHorizontal: 24 },
  filterChip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', marginRight: 8 },
  filterChipActive: { backgroundColor: THEME, borderColor: THEME },
  filterText: { fontSize: 12, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  filterTextActive: { color: '#fff' },

  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 10 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  countLabel: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Medium' },

  // Loan rows
  loanRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  bookIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  loanBody: { flex: 1, paddingRight: 8 },
  bookTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  meta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, flexWrap: 'wrap' },
  healthChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  healthText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  renewChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: '#eff6ff' },
  renewText: { fontSize: 10, fontWeight: '700', color: '#2563eb', fontFamily: 'Manrope-Bold' },
  fineChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: '#fef2f2' },
  fineText: { fontSize: 10, fontWeight: '700', color: '#dc2626', fontFamily: 'Manrope-Bold' },
  dueText: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 5 },

  actions: { flexDirection: 'row', gap: 6 },
  renewBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', justifyContent: 'center', alignItems: 'center' },
  returnBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: THEME, justifyContent: 'center', alignItems: 'center' },
  returnBtnBusy: { opacity: 0.7 },
});