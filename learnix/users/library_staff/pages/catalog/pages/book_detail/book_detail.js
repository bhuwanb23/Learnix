import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../../constants/theme';

const HOLDERS = [
  { id: 'H1', student: 'Aarav Mehta', rollNo: 'CSE-21-001', due: 'Dec 12', status: 'Issued', color: '#2563eb' },
  { id: 'H2', student: 'Ananya Reddy', rollNo: 'CSE-23-005', due: 'Dec 8', status: 'Issued', color: '#059669' },
  { id: 'H3', student: 'Rohan Verma', rollNo: 'CSE-22-008', due: 'Nov 28', status: 'Overdue', color: '#dc2626' },
];

export default function BookDetail({ book, onBack }) {
  const [tab, setTab] = useState('copies');

  const handleAction = () => {
    Alert.alert(
      'Manage Book',
      `${book.title} — ${book.available} of ${book.copies} copies available`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add Copies', onPress: () => Alert.alert('Copies Added', 'New copies added to the catalog.') },
        { text: 'Remove Copies', style: 'destructive', onPress: () => Alert.alert('Removed', 'Selected copies removed from circulation.') },
      ]
    );
  };

  const handleCollect = (holder) => {
    Alert.alert(
      'Collect Book',
      `Send a return reminder to ${holder.student} for "${book.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remind', onPress: () => Alert.alert('Reminder Sent', `${holder.student} notified about the due book.`) },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#2563eb" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Book Details</Text>
            <Text style={styles.headerSubtitle}>{book.category}</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={[styles.bookIcon, { backgroundColor: book.color + '14' }]}>
            <Ionicons name="book" size={24} color={book.color} />
          </View>
          <Text style={styles.bookTitle}>{book.title}</Text>
          <Text style={styles.bookAuthor}>{book.author}</Text>
          <Text style={styles.bookIsbn}>ISBN {book.isbn}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Ionicons name="copy-outline" size={12} color="#2563eb" />
              <Text style={[styles.badgeText, { color: '#2563eb' }]}>{book.copies} copies</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: (book.available > 0 ? '#0596691A' : '#dc26261A') }]}>
              <Ionicons name="checkmark-circle-outline" size={12} color={book.available > 0 ? '#059669' : '#dc2626'} />
              <Text style={[styles.badgeText, { color: book.available > 0 ? '#059669' : '#dc2626' }]}>
                {book.available} available
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.manageBtn} onPress={handleAction} activeOpacity={0.85}>
            <Ionicons name="settings-outline" size={15} color="#FFFFFF" />
            <Text style={styles.manageBtnText}>Manage Copies</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{book.copies}</Text>
            <Text style={styles.statLabel}>Total Copies</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{book.copies - book.available}</Text>
            <Text style={styles.statLabel}>On Loan</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{book.available}</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Current Holders</Text>
        {HOLDERS.map((holder) => (
          <View key={holder.id} style={styles.holderCard}>
            <View style={[styles.holderAvatar, { backgroundColor: holder.color + '14' }]}>
              <Text style={[styles.holderInitial, { color: holder.color }]}>{holder.student.charAt(0)}</Text>
            </View>
            <View style={styles.holderInfo}>
              <Text style={styles.holderName}>{holder.student}</Text>
              <Text style={styles.holderMeta}>{holder.rollNo} • Due {holder.due}</Text>
            </View>
            <View style={[styles.holderStatusChip, { backgroundColor: (holder.status === 'Overdue' ? '#dc2626' : '#2563eb') + '1A' }]}>
              <Text style={[styles.holderStatusText, { color: holder.status === 'Overdue' ? '#dc2626' : '#2563eb' }]}>{holder.status}</Text>
            </View>
            {holder.status === 'Overdue' ? (
              <TouchableOpacity style={styles.remindBtn} onPress={() => handleCollect(holder)} activeOpacity={0.7}>
                <Ionicons name="megaphone-outline" size={15} color="#2563eb" />
              </TouchableOpacity>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    padding: 4,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  bookIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  bookTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
    textAlign: 'center',
  },
  bookAuthor: {
    fontSize: 13,
    color: '#64748b',
    fontFamily: 'Manrope-Medium',
    marginTop: 2,
  },
  bookIsbn: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold',
  },
  manageBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 20,
    marginTop: 14,
  },
  manageBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Manrope-Bold',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    paddingVertical: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
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
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 10,
  },
  holderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 10,
  },
  holderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  holderInitial: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  holderInfo: {
    flex: 1,
  },
  holderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  holderMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  holderStatusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  holderStatusText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  remindBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});