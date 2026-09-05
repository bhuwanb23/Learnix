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

import { CIRCULATION_STATS, ISSUED } from './constants/circulationData';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

export default function CirculationModule({ navigation }) {
  const [tab, setTab] = useState('issued');
  const [form, setForm] = useState({
    student: '',
    book: '',
    dueDays: '14',
  });
  const [issuedBooks, setIssuedBooks] = useState(ISSUED);

  const handleIssue = () => {
    if (!form.student.trim() || !form.book.trim()) {
      Alert.alert('Missing Fields', 'Please enter the student and book.');
      return;
    }
    Alert.alert(
      'Issue Book',
      `Issue "${form.book}" to ${form.student} for ${form.dueDays} days?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Issue',
          onPress: () => {
            setForm({ student: '', book: '', dueDays: '14' });
            setTab('issued');
            Alert.alert('Book Issued', `"${form.book}" issued to ${form.student}. Due date set.`);
          },
        },
      ]
    );
  };

  const handleReturn = (item) => {
    const isOverdue = item.status === 'Overdue';
    const fine = isOverdue ? '₹60' : 'No fine';
    Alert.alert(
      'Return Book',
      `Return "${item.book}" from ${item.student}?\nFine: ${fine}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Returned',
          onPress: () => {
            setIssuedBooks((prev) => prev.filter((i) => i.id !== item.id));
            Alert.alert('Returned', `${item.book} checked in${isOverdue ? ' — fine of ₹60 collected' : ''}.`);
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Stats */}
      <View style={styles.statsRow}>
        {CIRCULATION_STATS.map((stat) => (
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
          { id: 'issued', label: `Issued (${issuedBooks.length})` },
          { id: 'issue', label: 'Issue Book' },
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

      {tab === 'issued' ? (
        <>
          {issuedBooks.map((item) => (
            <View key={item.id} style={styles.issuedCard}>
              <View style={[styles.bookIcon, { backgroundColor: item.color + '14' }]}>
                <Ionicons name="book-outline" size={18} color={item.color} />
              </View>
              <View style={styles.info}>
                <Text style={styles.bookTitle}>{item.book}</Text>
                <Text style={styles.meta}>{item.student} • {item.rollNo}</Text>
                <View style={styles.chips}>
                  <View style={[styles.dueChip, { backgroundColor: (item.status === 'Overdue' ? '#dc2626' : '#2563eb') + '1A' }]}>
                    <Text style={[styles.dueText, { color: item.status === 'Overdue' ? '#dc2626' : '#2563eb' }]}>
                      Due {item.due}{item.status === 'Overdue' ? ' • Overdue' : ''}
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity style={styles.returnBtn} onPress={() => handleReturn(item)} activeOpacity={0.85}>
                <Ionicons name="arrow-undo" size={15} color="#FFFFFF" />
                <Text style={styles.returnBtnText}>Return</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      ) : (
        <>
          <Text style={styles.formHint}>Issue a book at the circulation desk. The student's library record updates and a due-date reminder is scheduled.</Text>

          <Text style={styles.fieldLabel}>Student</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={form.student}
              onChangeText={(v) => setForm((p) => ({ ...p, student: v }))}
              placeholder="e.g. Aarav Mehta"
              placeholderTextColor="#cbd5e1"
            />
          </View>

          <Text style={styles.fieldLabel}>Book</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={form.book}
              onChangeText={(v) => setForm((p) => ({ ...p, book: v }))}
              placeholder="e.g. Introduction to Algorithms"
              placeholderTextColor="#cbd5e1"
            />
          </View>

          <Text style={styles.fieldLabel}>Loan Period (days)</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={form.dueDays}
              onChangeText={(v) => setForm((p) => ({ ...p, dueDays: v }))}
              placeholder="14"
              placeholderTextColor="#cbd5e1"
              keyboardType="numeric"
            />
          </View>

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
  issuedCard: {
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
  info: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  meta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  chips: {
    flexDirection: 'row',
    marginTop: 5,
  },
  dueChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dueText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  returnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  returnBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
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
  issueBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  issueBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Manrope-Bold',
  },
});