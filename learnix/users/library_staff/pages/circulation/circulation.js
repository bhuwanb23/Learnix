import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonStatRow, SkeletonCard } from '../../../../components/ui';

const THEME = '#b45309';

export default function CirculationModule({ navigation }) {
  const [tab, setTab] = useState('issued');
  const [issuedBooks, setIssuedBooks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [form, setForm] = useState({ rollNo: '', bookId: '', dueDays: '14' });
  const [books, setBooks] = useState([]);
  const [returning, setReturning] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [finesResult, catalogResult] = await Promise.all([
        libraryApi.fines(),
        libraryApi.catalog(),
      ]);
      const allBooks = catalogResult.books || [];
      setBooks(allBooks);

      setStats({
        issued: catalogResult.stats?.totalCopies - catalogResult.stats?.totalAvailable ?? 0,
        overdue: finesResult.stats?.pendingCount ?? 0,
        totalBooks: catalogResult.stats?.totalCopies ?? 0,
      });

      const issued = (finesResult.pending || []).map((f) => ({
        id: f.bookIssueId,
        book: f.book,
        student: f.student,
        rollNo: f.rollNo,
        daysOverdue: f.daysOverdue,
        status: 'Overdue',
      }));
      setIssuedBooks(issued);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleIssue = async () => {
    if (!form.rollNo.trim() || !form.bookId.trim()) {
      Alert.alert('Missing Fields', 'Please enter the student roll number and select a book.');
      return;
    }
    try {
      setIssuing(true);
      await libraryApi.issueBook(form.rollNo.trim(), form.bookId, parseInt(form.dueDays) || 14);
      setForm({ rollNo: '', bookId: '', dueDays: '14' });
      setTab('issued');
      setIssuing(false);
      fetchData();
      Alert.alert('Book Issued', 'Book has been issued successfully.');
    } catch (err) {
      setIssuing(false);
      Alert.alert('Error', err.message);
    }
  };

  const handleReturn = async (item) => {
    setReturning(item.id);
    try {
      const result = await libraryApi.returnBook(item.id);
      const fineMsg = result.fine ? `\nFine: ₹${result.fine.amountRupees} (${result.fine.daysOverdue} days overdue)` : '\nNo fine.';
      fetchData();
      Alert.alert('Returned', `${item.book} checked in successfully.${fineMsg}`);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setReturning(null);
    }
  };

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
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}>
      {/* Stats */}
      <AnimatedCard delay={0} style={[styles.block, styles.statsRow]}>
        {[
          { label: 'Issued', value: stats?.issued ?? 0, icon: 'swap-horizontal', color: THEME },
          { label: 'Overdue', value: stats?.overdue ?? 0, icon: 'alert-circle', color: '#dc2626' },
          { label: 'Total', value: stats?.totalBooks ?? 0, icon: 'book', color: '#059669' },
        ].map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && <View style={styles.statDivider} />}
            <View style={styles.statCell}>
              <View style={[styles.statIcon, { backgroundColor: s.color + '14' }]}><Ionicons name={s.icon} size={18} color={s.color} /></View>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          </React.Fragment>
        ))}
      </AnimatedCard>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {[{ id: 'issued', label: `On Loan (${issuedBooks.length})` }, { id: 'issue', label: 'Issue Book' }].map((t) => (
          <TouchableOpacity key={t.id} style={[styles.tab, tab === t.id && styles.activeTab]} onPress={() => setTab(t.id)} activeOpacity={0.8}>
            <Text style={[styles.tabText, tab === t.id && styles.activeTabText]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'issued' ? (
        issuedBooks.length === 0 ? (
          <EmptyState
            icon="checkmark-circle-outline"
            title="No overdue books"
            subtitle="Every book is back on time. Issue a new one from the Issue Book tab."
            color="#059669"
          />
        ) : (
          issuedBooks.map((item, idx) => (
            <AnimatedCard key={item.id} delay={100 + idx * 60} style={styles.block}>
              <View style={styles.issueRow}>
                <View style={[styles.bookIcon, { backgroundColor: '#dc2626' + '14' }]}>
                  <Ionicons name="book-outline" size={18} color="#dc2626" />
                </View>
                <View style={styles.issueBody}>
                  <Text style={styles.bookTitle} numberOfLines={2}>{item.book}</Text>
                  <Text style={styles.meta} numberOfLines={1}>{item.student} · {item.rollNo}</Text>
                  <View style={styles.chips}>
                    <View style={[styles.dueChip, { backgroundColor: '#dc2626' + '1A' }]}>
                      <Text style={[styles.dueText, { color: '#dc2626' }]}>Overdue {item.daysOverdue} days</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.returnBtn, returning === item.id && styles.returnBtnBusy]}
                  onPress={() => handleReturn(item)}
                  activeOpacity={0.85}
                  disabled={returning === item.id}
                >
                  {returning === item.id
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <><Ionicons name="arrow-undo" size={15} color="#FFFFFF" /><Text style={styles.returnBtnText}>Return</Text></>}
                </TouchableOpacity>
              </View>
            </AnimatedCard>
          ))
        )
      ) : (
        <AnimatedCard delay={60}>
          <Text style={styles.formHint}>Issue a book at the circulation desk. Only titles with available copies can be selected.</Text>
          <Text style={styles.fieldLabel}>Student Roll Number</Text>
          <View style={styles.inputContainer}><TextInput style={styles.input} value={form.rollNo} onChangeText={(v) => setForm((p) => ({ ...p, rollNo: v }))} placeholder="e.g. CSE-23-014" placeholderTextColor="#cbd5e1" autoCapitalize="characters" /></View>
          <Text style={styles.fieldLabel}>Book</Text>
          {books.length === 0 ? (
            <Text style={styles.noBooks}>No books in the catalog yet. Add books from the Catalog tab first.</Text>
          ) : (
            <ScrollView style={styles.bookPicker} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bookPickerRow}>
              {books.map((b) => {
                const unavailable = b.availableCopies < 1;
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[styles.bookChip, form.bookId === b.id && styles.bookChipActive, unavailable && styles.bookChipDisabled]}
                    onPress={() => !unavailable && setForm((p) => ({ ...p, bookId: b.id }))}
                    activeOpacity={0.8}
                    disabled={unavailable}
                  >
                    <Text style={[styles.bookChipText, form.bookId === b.id && styles.bookChipTextActive]} numberOfLines={1}>{b.title}</Text>
                    <Text style={[styles.bookChipSub, form.bookId === b.id && styles.bookChipSubActive]}>{b.availableCopies} avail</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
          <Text style={styles.fieldLabel}>Loan Period (days)</Text>
          <View style={styles.inputContainer}><TextInput style={styles.input} value={form.dueDays} onChangeText={(v) => setForm((p) => ({ ...p, dueDays: v }))} placeholder="14" placeholderTextColor="#cbd5e1" keyboardType="numeric" /></View>
          <TouchableOpacity style={[styles.primaryBtn, issuing && styles.primaryBtnDisabled]} onPress={handleIssue} activeOpacity={0.85} disabled={issuing}>
            <Ionicons name="swap-horizontal" size={16} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>{issuing ? 'Issuing…' : 'Issue Book'}</Text>
          </TouchableOpacity>
        </AnimatedCard>
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

  // Stats
  statsRow: { flexDirection: 'row' },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6 },
  statDivider: { width: 1, backgroundColor: '#eef2f7', marginVertical: 8 },
  statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 16, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },

  // Tabs
  tabsRow: { flexDirection: 'row', backgroundColor: '#eef2f7', borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  activeTab: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  activeTabText: { color: THEME },

  // Issued rows
  issueRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  bookIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  issueBody: { flex: 1, paddingRight: 8 },
  bookTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  meta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  chips: { flexDirection: 'row', marginTop: 5 },
  dueChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  dueText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  returnBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  returnBtnBusy: { opacity: 0.7 },
  returnBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Manrope-Bold' },

  // Form
  formHint: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', lineHeight: 18, marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#334155', fontFamily: 'Manrope-Bold', marginBottom: 6, marginTop: 4 },
  inputContainer: { backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, marginBottom: 12 },
  input: { height: 44, fontSize: 14, color: '#0f172a', fontFamily: 'Manrope-Regular' },
  noBooks: { fontSize: 12, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginBottom: 12 },
  bookPicker: { marginBottom: 12, maxHeight: 84 },
  bookPickerRow: { gap: 8, paddingRight: 8 },
  bookChip: { backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', padding: 10, minWidth: 130, maxWidth: 170 },
  bookChipActive: { backgroundColor: THEME, borderColor: THEME },
  bookChipDisabled: { opacity: 0.45 },
  bookChipText: { fontSize: 12, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  bookChipTextActive: { color: '#FFFFFF' },
  bookChipSub: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },
  bookChipSubActive: { color: 'rgba(255,255,255,0.85)' },
  primaryBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: THEME, borderRadius: 12, paddingVertical: 14, marginTop: 4 },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Manrope-Bold' },
});
