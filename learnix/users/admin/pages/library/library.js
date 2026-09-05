import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { LIBRARY_STATS, BOOKS, ISSUED_BOOKS, BOOK_REQUESTS } from './constants/libraryData';

import StatCard from '../../components/ui/StatCard';
import SectionHeader from '../../components/ui/SectionHeader';
import SearchBar from '../../components/ui/SearchBar';
import EmptyState from '../../components/ui/EmptyState';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const TABS = [
  { id: 'catalog', label: 'Catalog' },
  { id: 'issued', label: 'Issued' },
  { id: 'requests', label: 'Requests' },
];

export default function LibraryModule({ navigation }) {
  const [tab, setTab] = useState('catalog');
  const [search, setSearch] = useState('');

  const filteredBooks = useMemo(() => {
    const q = search.toLowerCase();
    return BOOKS.filter(
      (b) => !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.category.toLowerCase().includes(q)
    );
  }, [search]);

  const handleAddBook = () => {
    Alert.alert('Add Book', 'Add a new book to the library catalog.');
  };

  const handleBookPress = (book) => {
    Alert.alert(
      book.title,
      `${book.author}\nCategory: ${book.category}\n${book.available} of ${book.copies} copies available`,
      [{ text: 'OK' }]
    );
  };

  const handleIssue = (issued) => {
    Alert.alert(
      issued.status === 'Overdue' ? 'Collect Book' : 'Book Details',
      `${issued.book}\nStudent: ${issued.student}\nDue: ${issued.dueDate}`,
      issued.status === 'Overdue'
        ? [{ text: 'OK' }]
        : [{ text: 'Cancel', style: 'cancel' }, { text: 'Mark Returned', onPress: () => Alert.alert('Returned', 'Book marked as returned.') }]
    );
  };

  const handleRequest = (request, action) => {
    Alert.alert(
      action === 'approve' ? 'Approve Request' : 'Reject Request',
      `${action === 'approve' ? 'Approve' : 'Reject'} ${request.book} request from ${request.student}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'approve' ? 'Approve' : 'Reject',
          onPress: () => Alert.alert('Done', action === 'approve' ? 'Book allocated and student notified.' : 'Request rejected.'),
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Stats */}
      <View style={styles.statsRow}>
        {LIBRARY_STATS.map((stat) => (
          <StatCard key={stat.id} icon={stat.icon} value={stat.value} label={stat.label} color={stat.color} />
        ))}
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {TABS.map((t) => (
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

      {tab === 'catalog' ? (
        <>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search books, authors, categories..." />
          <SectionHeader
            title={`Catalog (${filteredBooks.length})`}
            actionLabel="Add Book"
            actionIcon="add"
            onAction={handleAddBook}
          />
          {filteredBooks.length === 0 ? (
            <EmptyState icon="book-outline" title="No books found" message="Try a different search term." />
          ) : (
            filteredBooks.map((book) => (
              <TouchableOpacity
                key={book.id}
                style={styles.bookCard}
                onPress={() => handleBookPress(book)}
                activeOpacity={0.8}
              >
                <View style={[styles.bookIcon, { backgroundColor: book.color + '14' }]}>
                  <Ionicons name="book" size={20} color={book.color} />
                </View>
                <View style={styles.bookInfo}>
                  <Text style={styles.bookTitle} numberOfLines={1}>{book.title}</Text>
                  <Text style={styles.bookAuthor} numberOfLines={1}>{book.author}</Text>
                  <Text style={styles.bookCategory}>{book.category}</Text>
                </View>
                <View style={[styles.availability, { backgroundColor: book.available > 0 ? '#0596691A' : '#dc26261A' }]}>
                  <Text style={[styles.availabilityText, { color: book.available > 0 ? '#059669' : '#dc2626' }]}>
                    {book.available > 0 ? `${book.available} left` : 'Out'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </>
      ) : null}

      {tab === 'issued' ? (
        <>
          <SectionHeader title="Issued Books" actionLabel="Overdue Report" actionIcon="alert" onAction={() => Alert.alert('Overdue Report', '12 books overdue — total fines ₹4,820 pending.')} />
          {ISSUED_BOOKS.map((issued) => (
            <TouchableOpacity
              key={issued.id}
              style={styles.issuedCard}
              onPress={() => handleIssue(issued)}
              activeOpacity={0.8}
            >
              <View style={[styles.issuedAvatar, { backgroundColor: issued.color + '14' }]}>
                <Text style={[styles.issuedInitial, { color: issued.color }]}>{issued.student.charAt(0)}</Text>
              </View>
              <View style={styles.issuedInfo}>
                <Text style={styles.issuedStudent}>{issued.student}</Text>
                <Text style={styles.issuedBook} numberOfLines={1}>{issued.book}</Text>
                <Text style={[styles.issuedDue, { color: issued.status === 'Overdue' ? '#dc2626' : '#94a3b8' }]}>
                  Due: {issued.dueDate} {issued.status === 'Overdue' ? '• OVERDUE' : ''}
                </Text>
              </View>
              <View style={[styles.issuedStatus, { backgroundColor: issued.status === 'Overdue' ? '#dc26261A' : '#0596691A' }]}>
                <Text style={[styles.issuedStatusText, { color: issued.status === 'Overdue' ? '#dc2626' : '#059669' }]}>
                  {issued.status}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </>
      ) : null}

      {tab === 'requests' ? (
        <>
          <SectionHeader title="Book Requests" />
          {BOOK_REQUESTS.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={[styles.requestAvatar, { backgroundColor: request.color + '14' }]}>
                <Text style={[styles.requestInitial, { color: request.color }]}>{request.student.charAt(0)}</Text>
              </View>
              <View style={styles.requestInfo}>
                <Text style={styles.requestStudent}>{request.student}</Text>
                <Text style={styles.requestBook} numberOfLines={1}>{request.book}</Text>
                <Text style={styles.requestMeta}>{request.reason} • {request.requestedAt}</Text>
              </View>
              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={[styles.requestBtn, styles.approveBtn]}
                  onPress={() => handleRequest(request, 'approve')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark" size={14} color="#ffffff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.requestBtn, styles.rejectBtn]}
                  onPress={() => handleRequest(request, 'reject')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={14} color="#dc2626" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.15)',
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
  },
  activeTab: {
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  tabText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Manrope-SemiBold',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#ffffff',
  },
  bookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  bookIcon: {
    width: 42,
    height: 42,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  bookInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  bookTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  bookAuthor: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  bookCategory: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  availability: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  availabilityText: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: 'Manrope-SemiBold',
  },
  issuedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  issuedAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  issuedInitial: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  issuedInfo: {
    flex: 1,
  },
  issuedStudent: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  issuedBook: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  issuedDue: {
    fontSize: 10,
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  issuedStatus: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    marginLeft: SPACING.sm,
  },
  issuedStatusText: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: 'Manrope-SemiBold',
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  requestAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  requestInitial: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  requestInfo: {
    flex: 1,
  },
  requestStudent: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  requestBook: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  requestMeta: {
    fontSize: 9,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  requestActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginLeft: SPACING.sm,
  },
  requestBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveBtn: {
    backgroundColor: '#059669',
  },
  rejectBtn: {
    backgroundColor: '#fef2f2',
  },
});