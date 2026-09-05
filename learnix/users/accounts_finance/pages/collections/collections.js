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

import { COLLECTION_STATS, RECENT_COLLECTIONS, PAYMENT_METHODS } from './constants/collectionsData';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

export default function CollectionsModule({ navigation }) {
  const [tab, setTab] = useState('list');
  const [form, setForm] = useState({
    student: '',
    rollNo: '',
    amount: '',
    method: 'UPI',
    note: '',
  });

  const handleRecord = () => {
    if (!form.student.trim() || !form.amount.trim()) {
      Alert.alert('Missing Fields', 'Please enter the student name and amount.');
      return;
    }
    Alert.alert(
      'Record Payment',
      `Record ${form.amount} from ${form.student} via ${form.method}? A receipt will be generated and the ledger updated.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Record',
          onPress: () => {
            setForm({ student: '', rollNo: '', amount: '', method: 'UPI', note: '' });
            setTab('list');
            Alert.alert('Payment Recorded', `${form.amount} credited to ${form.student}. Receipt issued.`);
          },
        },
      ]
    );
  };

  const handleReceipt = (item) => {
    Alert.alert(
      'Receipt Issued',
      `${item.student} • ${item.amount} • ${item.method}\nReceipt #RC-${1000 + parseInt(item.id.replace('C', ''))} emailed to student.`,
      [
        { text: 'Close', style: 'cancel' },
        { text: 'Resend', onPress: () => Alert.alert('Resent', 'Receipt re-sent via email and SMS.') },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Stats */}
      <View style={styles.statsRow}>
        {COLLECTION_STATS.map((stat) => (
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
          { id: 'list', label: 'Collections' },
          { id: 'record', label: 'Record Payment' },
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
          <Text style={styles.sectionLabel}>Recent Collections</Text>
          {RECENT_COLLECTIONS.map((item) => (
            <View key={item.id} style={styles.collectionCard}>
              <View style={[styles.avatar, { backgroundColor: item.color + '14' }]}>
                <Text style={[styles.initial, { color: item.color }]}>{item.student.charAt(0)}</Text>
              </View>
              <View style={styles.collectionInfo}>
                <Text style={styles.studentName}>{item.student}</Text>
                <Text style={styles.collectionMeta}>{item.rollNo} • {item.program} • {item.sem}</Text>
                <View style={styles.collectionChips}>
                  <View style={[styles.methodChip, { backgroundColor: '#eff6ff' }]}>
                    <Text style={[styles.methodText, { color: '#2563eb' }]}>{item.method}</Text>
                  </View>
                  <View style={[styles.statusChip, { backgroundColor: (item.status === 'Cleared' ? '#059669' : '#d97706') + '1A' }]}>
                    <Text style={[styles.statusText, { color: item.status === 'Cleared' ? '#059669' : '#d97706' }]}>{item.status}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.collectionRight}>
                <Text style={styles.amount}>{item.amount}</Text>
                <Text style={styles.date}>{item.date}</Text>
                <TouchableOpacity style={styles.receiptBtn} onPress={() => handleReceipt(item)} activeOpacity={0.7}>
                  <Ionicons name="receipt-outline" size={15} color="#2563eb" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      ) : (
        <>
          <Text style={styles.formHint}>Record an offline or manual payment. The general ledger and student fee account update automatically.</Text>

          <Text style={styles.fieldLabel}>Student Name</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={form.student}
              onChangeText={(v) => setForm((p) => ({ ...p, student: v }))}
              placeholder="e.g. Aarav Mehta"
              placeholderTextColor="#cbd5e1"
            />
          </View>

          <Text style={styles.fieldLabel}>Roll Number</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={form.rollNo}
              onChangeText={(v) => setForm((p) => ({ ...p, rollNo: v }))}
              placeholder="e.g. CSE-21-001"
              placeholderTextColor="#cbd5e1"
            />
          </View>

          <Text style={styles.fieldLabel}>Amount (₹)</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={form.amount}
              onChangeText={(v) => setForm((p) => ({ ...p, amount: v }))}
              placeholder="e.g. 42000"
              placeholderTextColor="#cbd5e1"
              keyboardType="numeric"
            />
          </View>

          <Text style={styles.fieldLabel}>Payment Method</Text>
          <View style={styles.methodGrid}>
            {PAYMENT_METHODS.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[styles.methodChip, form.method === m.label && styles.methodChipActive]}
                onPress={() => setForm((p) => ({ ...p, method: m.label }))}
                activeOpacity={0.8}
              >
                <Ionicons name={m.icon} size={14} color={form.method === m.label ? '#FFFFFF' : '#475569'} />
                <Text style={[styles.methodLabel, form.method === m.label && styles.methodLabelActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.recordBtn} onPress={handleRecord} activeOpacity={0.85}>
            <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
            <Text style={styles.recordBtnText}>Record Payment</Text>
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
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 10,
  },
  collectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  initial: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  collectionInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  collectionMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  collectionChips: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  methodChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  methodText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  collectionRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
    fontFamily: 'Manrope-Bold',
  },
  date: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
  },
  receiptBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
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
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  methodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  methodChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  methodLabel: {
    fontSize: 12,
    color: '#475569',
    fontFamily: 'Manrope-Medium',
  },
  methodLabelActive: {
    color: '#FFFFFF',
  },
  recordBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
  },
  recordBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Manrope-Bold',
  },
});