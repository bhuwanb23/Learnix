import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { CATALOG_STATS, BOOKS, CATEGORIES } from './constants/catalogData';
import BookDetail from './pages/book_detail/book_detail';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

export default function CatalogModule({ navigation }) {
  const [tab, setTab] = useState('list');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedBook, setSelectedBook] = useState(null);
  const [form, setForm] = useState({
    title: '',
    author: '',
    category: '',
    copies: '',
  });

  if (selectedBook) {
    return <BookDetail book={selectedBook} onBack={() => setSelectedBook(null)} />;
  }

  const filteredBooks = BOOKS.filter((b) => {
    if (category !== 'all' && b.category !== category) return false;
    if (search && !b.title.toLowerCase().includes(search.toLowerCase()) && !b.author.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleAddBook = () => {
    if (!form.title.trim() || !form.author.trim()) {
      Alert.alert('Missing Fields', 'Please enter the book title and author.');
      return;
    }
    Alert.alert(
      'Add Book',
      `Add "${form.title}" by ${form.author} to the catalog?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: () => {
            setForm({ title: '', author: '', category: '', copies: '' });
            setTab('list');
            Alert.alert('Book Added', `${form.title} added to the catalog with ${form.copies || 1} copies.`);
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Stats */}
      <View style={styles.statsRow}>
        {CATALOG_STATS.map((stat) => (
          <View key={stat.id} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: stat.color + '14' }]}>
              <Ionicons name={stat.icon} size={18} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {[
          { id: 'list', label: 'Catalog' },
          { id: 'add', label: 'Add Book' },
        ].map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, tab === t.id && styles.activeTab]}
            onPress={() => setTab(t.id)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, tab === t.id && styles.activeTabText]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'list' ? (
        <>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={16} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search by title or author"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.filterRow}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c.value}
                style={[styles.filterChip, category === c.value && styles.filterChipActive]}
                onPress={() => setCategory(c.value)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterText, category === c.value && styles.filterTextActive]}>
                  {c.label === 'Computer Science' ? 'CS' : c.label === 'Electronics' ? 'ECE' : c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.listLabel}>{filteredBooks.length} titles</Text>

          {filteredBooks.map((book) => (
            <TouchableOpacity
              key={book.id}
              style={styles.bookCard}
              activeOpacity={0.8}
              onPress={() => setSelectedBook(book)}
            >
              <View style={[styles.bookIcon, { backgroundColor: book.color + '14' }]}>
                <Ionicons name="book-outline" size={18} color={book.color} />
              </View>
              <View style={styles.bookInfo}>
                <Text style={styles.bookTitle}>{book.title}</Text>
                <Text style={styles.bookMeta}>{book.author} • {book.category}</Text>
                <View style={styles.bookChips}>
                  <View style={[styles.stockChip, { backgroundColor: (book.available > 0 ? '#059669' : '#dc2626') + '1A' }]}>
                    <Text style={[styles.stockText, { color: book.available > 0 ? '#059669' : '#dc2626' }]}>
                      {book.available}/{book.copies} available
                    </Text>
                  </View>
                  {book.available === 0 ? (
                    <View style={[styles.lowChip, { backgroundColor: '#dc26261A' }]}>
                      <Text style={[styles.lowText, { color: '#dc2626' }]}>Out of stock</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>
          ))}
        </>
      ) : (
        <>
          <Text style={styles.formHint}>Add a new book to the catalog. Barcode and shelf location are generated automatically.</Text>

          <Text style={styles.fieldLabel}>Title</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={form.title}
              onChangeText={(v) => setForm((p) => ({ ...p, title: v }))}
              placeholder="e.g. Machine Learning Yearning"
              placeholderTextColor="#cbd5e1"
            />
          </View>

          <Text style={styles.fieldLabel}>Author</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={form.author}
              onChangeText={(v) => setForm((p) => ({ ...p, author: v }))}
              placeholder="e.g. Andrew Ng"
              placeholderTextColor="#cbd5e1"
            />
          </View>

          <Text style={styles.fieldLabel}>Category</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={form.category}
              onChangeText={(v) => setForm((p) => ({ ...p, category: v }))}
              placeholder="e.g. Computer Science"
              placeholderTextColor="#cbd5e1"
            />
          </View>

          <Text style={styles.fieldLabel}>Number of Copies</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={form.copies}
              onChangeText={(v) => setForm((p) => ({ ...p, copies: v }))}
              placeholder="e.g. 5"
              placeholderTextColor="#cbd5e1"
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity style={styles.createBtn} onPress={handleAddBook} activeOpacity={0.85}>
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.createBtnText}>Add to Catalog</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Medium',
    marginTop: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#eef2f7',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    fontFamily: 'Manrope-SemiBold',
  },
  activeTabText: {
    color: '#2563eb',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: '#0f172a',
    fontFamily: 'Manrope-Regular',
    marginLeft: 8,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Manrope-Medium',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: 'Manrope-Medium',
    marginBottom: 10,
  },
  bookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 10,
  },
  bookIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  bookMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  bookChips: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  stockChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stockText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  lowChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  lowText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  formHint: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    lineHeight: 18,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    fontFamily: 'Manrope-Bold',
    marginBottom: 6,
    marginTop: 4,
  },
  inputContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  input: {
    height: 44,
    fontSize: 14,
    color: '#0f172a',
    fontFamily: 'Manrope-Regular',
  },
  createBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  createBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Manrope-Bold',
  },
});