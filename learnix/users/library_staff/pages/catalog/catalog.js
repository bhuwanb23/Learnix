import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../services/api';
import { AnimatedCard, SearchBar, EmptyState, SkeletonStatRow, SkeletonCard } from '../../../../components/ui';

const THEME = '#b45309';

export default function CatalogModule({ navigation }) {
  const [tab, setTab] = useState('list');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [books, setBooks] = useState([]);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', author: '', category: '', copies: '' });

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const params = {};
      if (search) params.q = search;
      if (category !== 'all') params.category = category;
      const result = await libraryApi.catalog(params);
      setBooks(result.books || []);
      setStats(result.stats || null);
      const allResult = await libraryApi.catalog({});
      const cats = [...new Set((allResult.books || []).map((b) => b.category).filter(Boolean))];
      setCategories(cats);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, category]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleAddBook = async () => {
    if (!form.title.trim() || !form.author.trim()) {
      Alert.alert('Missing Fields', 'Please enter the book title and author.');
      return;
    }
    try {
      setSaving(true);
      const title = form.title.trim();
      await libraryApi.addBook({
        title,
        author: form.author.trim(),
        category: form.category.trim() || undefined,
        totalCopies: parseInt(form.copies) || 1,
      });
      setForm({ title: '', author: '', category: '', copies: '' });
      setTab('list');
      setSaving(false);
      fetchData();
      Alert.alert('Book Added', `"${title}" added to the catalog.`);
    } catch (err) {
      setSaving(false);
      Alert.alert('Error', err.message);
    }
  };

  const filteredBooks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return books.filter((b) => {
      if (category !== 'all' && b.category !== category) return false;
      if (q && !(b.title || '').toLowerCase().includes(q) && !(b.author || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [books, category, search]);

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
          { label: 'Titles', value: stats?.totalTitles ?? 0, icon: 'book', color: THEME },
          { label: 'Copies', value: stats?.totalCopies ?? 0, icon: 'copy', color: '#059669' },
          { label: 'Available', value: stats?.totalAvailable ?? 0, icon: 'checkmark-circle', color: '#0284c7' },
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
        {[{ id: 'list', label: 'Catalog' }, { id: 'add', label: 'Add Book' }].map((t) => (
          <TouchableOpacity key={t.id} style={[styles.tab, tab === t.id && styles.activeTab]} onPress={() => setTab(t.id)} activeOpacity={0.8}>
            <Text style={[styles.tabText, tab === t.id && styles.activeTabText]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'list' ? (
        <>
          <AnimatedCard delay={60} style={styles.block}>
            <View style={styles.searchWrap}>
              <SearchBar placeholder="Search by title or author" onSearch={setSearch} />
            </View>
          </AnimatedCard>

          {categories.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
              {[{ value: 'all', label: 'All' }, ...categories.map((c) => ({ value: c, label: c }))].map((c) => (
                <TouchableOpacity key={c.value} style={[styles.filterChip, category === c.value && styles.filterChipActive]} onPress={() => setCategory(c.value)} activeOpacity={0.8}>
                  <Text style={[styles.filterText, category === c.value && styles.filterTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <Text style={styles.listLabel}>{filteredBooks.length} {filteredBooks.length === 1 ? 'title' : 'titles'}</Text>

          {filteredBooks.length === 0 ? (
            <EmptyState
              icon="book-outline"
              title="No books found"
              subtitle={search ? `Nothing matches "${search}". Try a different search or category.` : 'No books in this category yet. Add one from the Add Book tab.'}
              color={THEME}
            />
          ) : (
            filteredBooks.map((book, idx) => {
              const inStock = book.availableCopies > 0;
              return (
                <AnimatedCard key={book.id} delay={100 + idx * 50} style={styles.block}>
                  <View style={styles.bookRow}>
                    <View style={styles.bookIcon}>
                      <Ionicons name="book-outline" size={18} color={THEME} />
                    </View>
                    <View style={styles.bookInfo}>
                      <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
                      <Text style={styles.bookMeta} numberOfLines={1}>{book.author || 'Unknown'} · {book.category || 'General'}</Text>
                      <View style={styles.bookChips}>
                        <View style={[styles.stockChip, { backgroundColor: (inStock ? '#059669' : '#dc2626') + '1A' }]}>
                          <Text style={[styles.stockText, { color: inStock ? '#059669' : '#dc2626' }]}>
                            {book.availableCopies}/{book.totalCopies} available
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </AnimatedCard>
              );
            })
          )}
        </>
      ) : (
        <AnimatedCard delay={60}>
          <Text style={styles.formHint}>Add a new book to the catalog. It becomes available for circulation immediately.</Text>
          <Text style={styles.fieldLabel}>Title</Text>
          <View style={styles.inputContainer}><TextInput style={styles.input} value={form.title} onChangeText={(v) => setForm((p) => ({ ...p, title: v }))} placeholder="e.g. Machine Learning Yearning" placeholderTextColor="#cbd5e1" /></View>
          <Text style={styles.fieldLabel}>Author</Text>
          <View style={styles.inputContainer}><TextInput style={styles.input} value={form.author} onChangeText={(v) => setForm((p) => ({ ...p, author: v }))} placeholder="e.g. Andrew Ng" placeholderTextColor="#cbd5e1" /></View>
          <Text style={styles.fieldLabel}>Category</Text>
          <View style={styles.inputContainer}><TextInput style={styles.input} value={form.category} onChangeText={(v) => setForm((p) => ({ ...p, category: v }))} placeholder="e.g. Computer Science" placeholderTextColor="#cbd5e1" /></View>
          <Text style={styles.fieldLabel}>Number of Copies</Text>
          <View style={styles.inputContainer}><TextInput style={styles.input} value={form.copies} onChangeText={(v) => setForm((p) => ({ ...p, copies: v }))} placeholder="e.g. 5" placeholderTextColor="#cbd5e1" keyboardType="numeric" /></View>
          <TouchableOpacity style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]} onPress={handleAddBook} activeOpacity={0.85} disabled={saving}>
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>{saving ? 'Adding…' : 'Add to Catalog'}</Text>
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

  // Search
  searchWrap: { padding: 8 },
  filterScroll: { marginBottom: 12 },
  filterRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  filterChipActive: { backgroundColor: THEME, borderColor: THEME },
  filterText: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Medium' },
  filterTextActive: { color: '#FFFFFF' },
  listLabel: { fontSize: 12, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginBottom: 10 },

  // Book rows
  bookRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  bookIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: THEME + '14', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  bookInfo: { flex: 1 },
  bookTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  bookMeta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  bookChips: { flexDirection: 'row', gap: 8, marginTop: 6 },
  stockChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  stockText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },

  // Form
  formHint: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', lineHeight: 18, marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#334155', fontFamily: 'Manrope-Bold', marginBottom: 6, marginTop: 4 },
  inputContainer: { backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, marginBottom: 12 },
  input: { height: 44, fontSize: 14, color: '#0f172a', fontFamily: 'Manrope-Regular' },
  primaryBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: THEME, borderRadius: 12, paddingVertical: 14, marginTop: 4 },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Manrope-Bold' },
});
