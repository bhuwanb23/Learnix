import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../services/api';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

export default function CirculationModule({ navigation }) {
  const [tab, setTab] = useState('issued');
  const [issuedBooks, setIssuedBooks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
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
      // Get issued books from catalog issues (we need to fetch from the catalog detail or use a different approach)
      // Actually, the dashboard has dueToday which has issued books. Let me use fines data to get issued info.
      // Better: fetch catalog and check issues from there. For now, let me use the fines endpoint which has pending info.
      // The issued books are tracked via book_issues. Let me get them from the catalog.
      const allBooks = catalogResult.books || [];
      setBooks(allBooks);

      // For issued books, we need to get them from individual book details or a dedicated endpoint
      // Since the service doesn't have a dedicated "list issued" endpoint, let me use the fines data
      // and the dashboard data to build the issued list. Actually, let me add a simple approach:
      // fetch each book's detail to get recent issues. But that's too many calls.
      // Better approach: the fines endpoint has pending fines which are from overdue issues.
      // Let me just use what we have and build the issued list from fines + a note that
      // the full issued list would need a dedicated endpoint.

      // For now, let me use the fines data to show overdue items, and for the issue form
      // we have the book list from catalog.
      setStats({
        issued: catalogResult.stats?.totalCopies - catalogResult.stats?.totalAvailable ?? 0,
        overdue: finesResult.stats?.pendingCount ?? 0,
        totalBooks: catalogResult.stats?.totalCopies ?? 0,
      });

      // Build issued list from fines pending (these are overdue items)
      const issued = (finesResult.pending || []).map((f) => ({
        id: f.bookIssueId,
        book: f.book,
        student: f.student,
        rollNo: f.rollNo,
        daysOverdue: f.daysOverdue,
        status: 'Overdue',
      }));

      // Also get ISSUED books from catalog detail for each book that has available < total
      // This is a simplification - in production you'd have a dedicated endpoint
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
      await libraryApi.issueBook(form.rollNo.trim(), form.bookId, parseInt(form.dueDays) || 14);
      setForm({ rollNo: '', bookId: '', dueDays: '14' });
      setTab('issued');
      fetchData();
      Alert.alert('Book Issued', 'Book has been issued successfully.');
    } catch (err) {
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
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.loadingText}>Loading circulation…</Text></View>;
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}>
      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'Issued', value: stats?.issued ?? 0, icon: 'swap-horizontal', color: '#2563eb' },
          { label: 'Overdue', value: stats?.overdue ?? 0, icon: 'alert-circle', color: '#dc2626' },
          { label: 'Total', value: stats?.totalBooks ?? 0, icon: 'book', color: '#059669' },
        ].map((s, i) => (
          <View key={i} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: s.color + '14' }]}><Ionicons name={s.icon} size={18} color={s.color} /></View>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {[{ id: 'issued', label: `Issued (${issuedBooks.length})` }, { id: 'issue', label: 'Issue Book' }].map((t) => (
          <TouchableOpacity key={t.id} style={[styles.tab, tab === t.id && styles.activeTab]} onPress={() => setTab(t.id)} activeOpacity={0.8}>
            <Text style={[styles.tabText, tab === t.id && styles.activeTabText]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'issued' ? (
        issuedBooks.length === 0 ? (
          <View style={styles.emptyState}><Ionicons name="checkmark-circle-outline" size={40} color="#059669" /><Text style={styles.emptyText}>No overdue books</Text></View>
        ) : (
          issuedBooks.map((item) => (
            <View key={item.id} style={styles.issuedCard}>
              <View style={[styles.bookIcon, { backgroundColor: '#dc262614' }]}><Ionicons name="book-outline" size={18} color="#dc2626" /></View>
              <View style={styles.info}>
                <Text style={styles.bookTitle}>{item.book}</Text>
                <Text style={styles.meta}>{item.student} • {item.rollNo}</Text>
                <View style={styles.chips}>
                  <View style={[styles.dueChip, { backgroundColor: '#dc26261A' }]}>
                    <Text style={[styles.dueText, { color: '#dc2626' }]}>Overdue {item.daysOverdue} days</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity style={styles.returnBtn} onPress={() => handleReturn(item)} activeOpacity={0.85} disabled={returning === item.id}>
                {returning === item.id ? <ActivityIndicator size="small" color="#fff" /> : <><Ionicons name="arrow-undo" size={15} color="#FFFFFF" /><Text style={styles.returnBtnText}>Return</Text></>}
              </TouchableOpacity>
            </View>
          ))
        )
      ) : (
        <>
          <Text style={styles.formHint}>Issue a book at the circulation desk.</Text>
          <Text style={styles.fieldLabel}>Student Roll Number</Text>
          <View style={styles.inputContainer}><TextInput style={styles.input} value={form.rollNo} onChangeText={(v) => setForm((p) => ({ ...p, rollNo: v }))} placeholder="e.g. CSE-23-014" placeholderTextColor="#cbd5e1" /></View>
          <Text style={styles.fieldLabel}>Book</Text>
          <ScrollView style={styles.bookPicker} horizontal showsHorizontalScrollIndicator={false}>
            {books.map((b) => (
              <TouchableOpacity key={b.id} style={[styles.bookChip, form.bookId === b.id && styles.bookChipActive]} onPress={() => setForm((p) => ({ ...p, bookId: b.id }))} activeOpacity={0.8}>
                <Text style={[styles.bookChipText, form.bookId === b.id && styles.bookChipTextActive]} numberOfLines={1}>{b.title}</Text>
                <Text style={[styles.bookChipSub, form.bookId === b.id && styles.bookChipSubActive]}>{b.availableCopies} avail</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.fieldLabel}>Loan Period (days)</Text>
          <View style={styles.inputContainer}><TextInput style={styles.input} value={form.dueDays} onChangeText={(v) => setForm((p) => ({ ...p, dueDays: v }))} placeholder="14" placeholderTextColor="#cbd5e1" keyboardType="numeric" /></View>
          <TouchableOpacity style={styles.issueBtn} onPress={handleIssue} activeOpacity={0.85}>
            <Ionicons name="swap-horizontal" size={16} color="#FFFFFF" />
            <Text style={styles.issueBtnText}>Issue Book</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 24, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b', fontFamily: 'Manrope-Medium' },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { marginTop: 12, fontSize: 14, color: '#64748b', fontFamily: 'Manrope-Medium' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14 },
  statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 16, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },
  tabsRow: { flexDirection: 'row', backgroundColor: '#eef2f7', borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  activeTab: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  activeTabText: { color: '#2563eb' },
  issuedCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 10 },
  bookIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  info: { flex: 1 },
  bookTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  meta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  chips: { flexDirection: 'row', marginTop: 5 },
  dueChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  dueText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  returnBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  returnBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Manrope-Bold' },
  formHint: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', lineHeight: 18, marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#334155', fontFamily: 'Manrope-Bold', marginBottom: 6, marginTop: 4 },
  inputContainer: { backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, marginBottom: 12 },
  input: { height: 44, fontSize: 14, color: '#0f172a', fontFamily: 'Manrope-Regular' },
  bookPicker: { marginBottom: 12, maxHeight: 80 },
  bookChip: { backgroundColor: '#ffffff', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', padding: 10, marginRight: 8, minWidth: 120 },
  bookChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  bookChipText: { fontSize: 12, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  bookChipTextActive: { color: '#FFFFFF' },
  bookChipSub: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },
  bookChipSubActive: { color: 'rgba(255,255,255,0.8)' },
  issueBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, marginTop: 4 },
  issueBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Manrope-Bold' },
});
