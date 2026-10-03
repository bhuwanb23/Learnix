import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../../services/api';
import { AnimatedCard, SearchBar, EmptyState, SkeletonCard } from '../../../../../components/ui';

const THEME = '#b45309';

const DUE_PRESETS = [
  { days: 7, label: '1 week' },
  { days: 14, label: '2 weeks' },
  { days: 21, label: '3 weeks' },
  { days: 30, label: '1 month' },
];

export default function IssueBookDesk({ navigation }) {
  const [step, setStep] = useState(1);
  const [rollInput, setRollInput] = useState('');
  const [student, setStudent] = useState(null);
  const [searching, setSearching] = useState(false);
  const [lookupError, setLookupError] = useState('');

  const [books, setBooks] = useState([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [bookSearch, setBookSearch] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [dueDays, setDueDays] = useState(14);
  const [issuing, setIssuing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const result = await libraryApi.catalog();
        setBooks(result.books || []);
      } catch (err) {
        setLookupError(err.message);
      } finally {
        setBooksLoading(false);
      }
    })();
  }, []);

  const availableBooks = useMemo(
    () => books.filter((b) => b.availableCopies > 0),
    [books],
  );

  const filteredBooks = useMemo(() => {
    const q = bookSearch.trim().toLowerCase();
    if (!q) return availableBooks;
    return availableBooks.filter(
      (b) =>
        b.title?.toLowerCase().includes(q) ||
        b.author?.toLowerCase().includes(q) ||
        b.category?.toLowerCase().includes(q),
    );
  }, [availableBooks, bookSearch]);

  const lookupStudent = useCallback(async () => {
    const q = rollInput.trim();
    if (q.length < 2) {
      setLookupError('Enter at least 2 characters of roll number or name.');
      return;
    }
    setSearching(true);
    setLookupError('');
    try {
      const result = await libraryApi.searchStudents(q);
      const list = result.students || [];
      if (list.length === 0) {
        setLookupError(`No student found matching "${q}".`);
        setStudent(null);
      } else if (list.length === 1) {
        setStudent(list[0]);
        setStep(2);
      } else {
        Alert.alert(
          'Multiple Matches',
          'Select the student you meant:',
          list.slice(0, 5).map((s) => ({
            text: `${s.name} (${s.rollNo})`,
            onPress: () => { setStudent(s); setStep(2); },
          })).concat([{ text: 'Cancel', style: 'cancel' }]),
        );
      }
    } catch (err) {
      setLookupError(err.message);
    } finally {
      setSearching(false);
    }
  }, [rollInput]);

  const selectStudent = async (s) => {
    setStudent(s);
    try {
      const profile = await libraryApi.studentBorrowingProfile(s.id);
      setStudent((prev) => ({ ...prev, profile }));
      setStep(2);
    } catch (err) {
      setLookupError(err.message);
    }
  };

  const reset = () => {
    setStep(1);
    setStudent(null);
    setSelectedBook(null);
    setRollInput('');
    setLookupError('');
    setDueDays(14);
  };

  const submitIssue = async () => {
    if (!selectedBook) {
      Alert.alert('Select a Book', 'Choose an available title before issuing.');
      return;
    }
    setIssuing(true);
    try {
      const result = await libraryApi.issueBook(student.rollNo, selectedBook.id, dueDays);
      Alert.alert(
        'Book Issued',
        `"${result.book.title}" → ${result.student.name}\n\nDue ${new Date(result.dueDate).toLocaleDateString('en-IN')}\n${result.copiesRemaining} copy/copies left in stock.`,
        [{ text: 'Done', onPress: reset }],
      );
      reset();
    } catch (err) {
      Alert.alert('Cannot Issue', err.message);
    } finally {
      setIssuing(false);
    }
  };

  const profile = student?.profile;
  const blockers = profile?.blockers ?? [];
  const activeStep = step === 1 ? 1 : selectedBook ? 3 : 2;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Stepper — step 3 lights up once a title is selected, since the
          confirm panel is rendered inline rather than as its own screen. */}
      <View style={styles.stepper}>
        {[
          { n: 1, label: 'Student' },
          { n: 2, label: 'Book' },
          { n: 3, label: 'Confirm' },
        ].map((s, i) => (
          <React.Fragment key={s.n}>
            {i > 0 && <View style={[styles.stepLine, activeStep > s.n && styles.stepLineActive]} />}
            <View style={styles.stepItem}>
              <View style={[
                styles.stepDot,
                activeStep > s.n && styles.stepDotDone,
                activeStep === s.n && styles.stepDotActive,
              ]}>
                {activeStep > s.n
                  ? <Ionicons name="checkmark" size={12} color="#fff" />
                  : <Text style={[styles.stepNum, activeStep === s.n && styles.stepNumActive]}>{s.n}</Text>}
              </View>
              <Text style={[styles.stepLabel, activeStep >= s.n && styles.stepLabelActive]}>{s.label}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      {/* ── Step 1: student ── */}
      {step === 1 && (
        <>
          <AnimatedCard delay={0} style={styles.block}>
            <View style={styles.formHeader}>
              <View style={styles.formIcon}>
                <Ionicons name="person-outline" size={18} color={THEME} />
              </View>
              <View style={styles.formHeaderText}>
                <Text style={styles.formTitle}>Find the student</Text>
                <Text style={styles.formSub}>Search by roll number or name.</Text>
              </View>
            </View>

            <View style={styles.searchRow}>
              <TextInput
                style={styles.input}
                value={rollInput}
                onChangeText={setRollInput}
                placeholder="e.g. CSE-23-014"
                placeholderTextColor="#9ca3af"
                autoCapitalize="characters"
                returnKeyType="search"
                onSubmitEditing={lookupStudent}
              />
              <TouchableOpacity
                style={[styles.lookupBtn, searching && styles.btnDisabled]}
                onPress={lookupStudent}
                activeOpacity={0.85}
                disabled={searching}
              >
                {searching
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="search" size={16} color="#fff" />}
              </TouchableOpacity>
            </View>

            {lookupError ? <Text style={styles.errorInline}>{lookupError}</Text> : null}
          </AnimatedCard>

          <AnimatedCard delay={60} style={styles.block}>
            <View style={styles.infoRow}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#2563eb" />
              <Text style={styles.infoText}>
                Issuing is blocked when a student is inactive, already holds the maximum number of books, has overdue loans, or carries unpaid fines above the limit.
              </Text>
            </View>
          </AnimatedCard>
        </>
      )}

      {/* ── Step 2: student confirmed → pick a book ── */}
      {step >= 2 && student && (
        <>
          <AnimatedCard delay={0} style={styles.block}>
            <View style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{student.name.charAt(0)}</Text>
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{student.name}</Text>
                <Text style={styles.rowSub}>{student.rollNo}</Text>
              </View>
              <TouchableOpacity onPress={() => setStep(1)} activeOpacity={0.8}>
                <Text style={styles.changeLink}>Change</Text>
              </TouchableOpacity>
            </View>

            {profile ? (
              <View style={styles.quotaRow}>
                <View style={styles.quotaCell}>
                  <Text style={styles.quotaValue}>{profile.stats.activeLoans}/{profile.limits.maxActiveLoans}</Text>
                  <Text style={styles.quotaLabel}>On loan</Text>
                </View>
                <View style={styles.quotaDivider} />
                <View style={styles.quotaCell}>
                  <Text style={[styles.quotaValue, profile.stats.overdueLoans > 0 && { color: '#dc2626' }]}>
                    {profile.stats.overdueLoans}
                  </Text>
                  <Text style={styles.quotaLabel}>Overdue</Text>
                </View>
                <View style={styles.quotaDivider} />
                <View style={styles.quotaCell}>
                  <Text style={[styles.quotaValue, profile.stats.pendingFineRupees > 0 && { color: '#dc2626' }]}>
                    ₹{profile.stats.pendingFineRupees}
                  </Text>
                  <Text style={styles.quotaLabel}>Unpaid</Text>
                </View>
              </View>
            ) : null}

            {blockers.length > 0 && (
              <View style={styles.blockersBox}>
                {blockers.map((b) => (
                  <View key={b.code} style={styles.blockerRow}>
                    <Ionicons name="close-circle" size={14} color="#dc2626" />
                    <Text style={styles.blockerText}>{b.message}</Text>
                  </View>
                ))}
              </View>
            )}
          </AnimatedCard>

          <SearchBar
            placeholder="Search available titles…"
            onSearch={setBookSearch}
            style={styles.search}
          />

          <View style={styles.listHeader}>
            <Text style={styles.sectionLabel}>Available Titles</Text>
            <Text style={styles.countLabel}>{filteredBooks.length} in stock</Text>
          </View>

          {booksLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : filteredBooks.length === 0 ? (
            <EmptyState
              icon="library-outline"
              title={bookSearch ? 'No matching titles' : 'No copies available'}
              subtitle={
                bookSearch
                  ? 'Try a different title, author or category.'
                  : 'Every copy is out on loan. Check in a book or add stock from the Catalog tab.'
              }
              color={THEME}
            />
          ) : (
            filteredBooks.map((b, idx) => (
              <AnimatedCard
                key={b.id}
                delay={100 + idx * 40}
                style={styles.block}
                onPress={() => setSelectedBook(b)}
              >
                <View style={[styles.bookRow, selectedBook?.id === b.id && styles.bookRowActive]}>
                  <View style={[styles.bookIcon, selectedBook?.id === b.id && { backgroundColor: THEME }]}>
                    <Ionicons name="book-outline" size={18} color={selectedBook?.id === b.id ? '#fff' : THEME} />
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{b.title}</Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {[b.author, b.category, b.rackLocation ? `Rack ${b.rackLocation}` : null]
                        .filter(Boolean).join(' · ') || 'No author listed'}
                    </Text>
                  </View>
                  <View style={styles.stockBox}>
                    <Text style={styles.stockValue}>{b.availableCopies}</Text>
                    <Text style={styles.stockLabel}>of {b.totalCopies}</Text>
                  </View>
                  {selectedBook?.id === b.id && (
                    <Ionicons name="checkmark-circle" size={18} color={THEME} />
                  )}
                </View>
              </AnimatedCard>
            ))
          )}
        </>
      )}

      {/* ── Confirm bar ── */}
      {step >= 2 && student && (
        <AnimatedCard delay={200} style={[styles.block, styles.confirmCard]}>
          <Text style={styles.cardLabel}>Loan Period</Text>
          <View style={styles.presetRow}>
            {DUE_PRESETS.map((p) => (
              <TouchableOpacity
                key={p.days}
                style={[styles.preset, dueDays === p.days && styles.presetActive]}
                onPress={() => setDueDays(p.days)}
                activeOpacity={0.8}
              >
                <Text style={[styles.presetText, dueDays === p.days && styles.presetTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Book</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>
                {selectedBook ? selectedBook.title : 'Not selected'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Due date</Text>
              <Text style={styles.summaryValue}>
                {new Date(Date.now() + dueDays * 864e5).toLocaleDateString('en-IN')}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.issueBtn, (issuing || blockers.length > 0) && styles.btnDisabled]}
            onPress={submitIssue}
            activeOpacity={0.85}
            disabled={issuing || blockers.length > 0}
          >
            {issuing
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="arrow-forward-circle" size={18} color="#fff" />}
            <Text style={styles.issueBtnText}>
              {blockers.length > 0 ? 'Blocked — Resolve Issues' : issuing ? 'Issuing…' : 'Issue Book'}
            </Text>
          </TouchableOpacity>
        </AnimatedCard>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 24, paddingBottom: 40 },
  block: { marginBottom: 10 },
  btnDisabled: { opacity: 0.5 },

  // Stepper
  stepper: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  stepItem: { alignItems: 'center', width: 62 },
  stepDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  stepDotActive: { backgroundColor: THEME },
  stepDotDone: { backgroundColor: '#059669' },
  stepNum: { fontSize: 12, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold' },
  stepNumActive: { color: '#fff' },
  stepLabel: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 5 },
  stepLabelActive: { color: THEME, fontWeight: '700' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#e2e8f0', marginHorizontal: 4, marginBottom: 16 },
  stepLineActive: { backgroundColor: '#059669' },

  // Form
  formHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  formIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: THEME + '14', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  formHeaderText: { flex: 1 },
  formTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  formSub: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  searchRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, height: 46, fontSize: 14, color: '#0f172a', fontFamily: 'Manrope-Regular' },
  lookupBtn: { width: 46, height: 46, borderRadius: 12, backgroundColor: THEME, justifyContent: 'center', alignItems: 'center' },
  errorInline: { fontSize: 12, color: '#dc2626', fontFamily: 'Manrope-Medium', marginTop: 10 },

  infoRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14 },
  infoText: { flex: 1, fontSize: 12, color: '#475569', fontFamily: 'Manrope-Medium', lineHeight: 18, marginLeft: 10 },

  // Student card
  row: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: THEME + '14', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 16, fontWeight: '800', color: THEME, fontFamily: 'PlusJakartaSans-Bold' },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  rowSub: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  changeLink: { fontSize: 12, fontWeight: '700', color: THEME, fontFamily: 'Manrope-Bold' },

  quotaRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#eef2f7', paddingTop: 12 },
  quotaCell: { flex: 1, alignItems: 'center' },
  quotaDivider: { width: 1, backgroundColor: '#eef2f7' },
  quotaValue: { fontSize: 14, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  quotaLabel: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 1 },

  blockersBox: { marginTop: 12, padding: 12, borderRadius: 11, backgroundColor: '#fef2f2' },
  blockerRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  blockerText: { fontSize: 11, color: '#991b1b', fontFamily: 'Manrope-Medium', flex: 1, lineHeight: 16, marginTop: 3 },

  search: { marginBottom: 4 },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 10 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  countLabel: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Medium' },

  bookRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12 },
  bookRowActive: { backgroundColor: THEME + '08' },
  bookIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: THEME + '14', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  stockBox: { alignItems: 'center', marginRight: 8 },
  stockValue: { fontSize: 14, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  stockLabel: { fontSize: 9, color: '#94a3b8', fontFamily: 'Manrope-Medium' },

  // Confirm
  confirmCard: { padding: 16, marginTop: 16 },
  cardLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  presetRow: { flexDirection: 'row', gap: 8 },
  preset: { flex: 1, paddingVertical: 10, borderRadius: 11, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  presetActive: { backgroundColor: THEME, borderColor: THEME },
  presetText: { fontSize: 11, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  presetTextActive: { color: '#fff' },

  summaryBox: { marginTop: 14, padding: 12, borderRadius: 11, backgroundColor: '#f8fafc' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Medium' },
  summaryValue: { fontSize: 12, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold', flexShrink: 1, textAlign: 'right' },

  issueBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: THEME, borderRadius: 12, paddingVertical: 14, marginTop: 14 },
  issueBtnText: { fontSize: 15, fontWeight: '700', color: '#fff', fontFamily: 'Manrope-Bold' },
});