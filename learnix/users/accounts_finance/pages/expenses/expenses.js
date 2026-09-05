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

import { EXPENSE_STATS, CLAIMS, VENDOR_INVOICES } from './constants/expensesData';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const CLAIM_COLORS = {
  Pending: '#d97706',
  Approved: '#059669',
  Rejected: '#dc2626',
};

const INVOICE_COLORS = {
  'Awaiting Approval': '#2563eb',
  Approved: '#059669',
  Paid: '#0284c7',
};

export default function ExpensesModule({ navigation }) {
  const [tab, setTab] = useState('claims');

  const handleClaim = (claim) => {
    Alert.alert(
      'Expense Claim',
      `${claim.staff} — ${claim.item} (${claim.amount})`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: () => Alert.alert('Approved', 'Claim approved. Reimbursement scheduled.') },
        { text: 'Reject', style: 'destructive', onPress: () => Alert.alert('Rejected', 'Claim declined. Staff notified with reason.') },
      ]
    );
  };

  const handleInvoice = (invoice) => {
    Alert.alert(
      'Vendor Invoice',
      `${invoice.vendor} — ${invoice.item} (${invoice.amount})`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve & Pay', onPress: () => Alert.alert('Payment Initiated', `₹${invoice.amount.replace('₹', '')} scheduled to ${invoice.vendor}.`) },
        { text: 'Hold', onPress: () => Alert.alert('On Hold', 'Invoice flagged for review.') },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Stats */}
      <View style={styles.statsRow}>
        {EXPENSE_STATS.map((stat) => (
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
          { id: 'claims', label: `Claims (${CLAIMS.length})` },
          { id: 'vendors', label: `Vendors (${VENDOR_INVOICES.length})` },
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

      {tab === 'claims' ? (
        <>
          <Text style={styles.sectionLabel}>Staff Expense Claims</Text>
          {CLAIMS.map((claim) => (
            <TouchableOpacity
              key={claim.id}
              style={styles.expenseCard}
              activeOpacity={0.8}
              onPress={() => handleClaim(claim)}
            >
              <View style={[styles.avatar, { backgroundColor: CLAIM_COLORS[claim.status] + '14' }]}>
                <Text style={[styles.initial, { color: CLAIM_COLORS[claim.status] }]}>{claim.staff.replace('Dr. ', '').replace('Prof. ', '').replace('Mr. ', '').replace('Ms. ', '').charAt(0)}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.title}>{claim.item}</Text>
                <Text style={styles.meta}>{claim.staff} • {claim.dept} • {claim.date}</Text>
                <View style={[styles.statusChip, { backgroundColor: CLAIM_COLORS[claim.status] + '1A' }]}>
                  <Text style={[styles.statusText, { color: CLAIM_COLORS[claim.status] }]}>{claim.status}</Text>
                </View>
              </View>
              <Text style={styles.amount}>{claim.amount}</Text>
            </TouchableOpacity>
          ))}
        </>
      ) : (
        <>
          <Text style={styles.sectionLabel}>Vendor Invoices</Text>
          {VENDOR_INVOICES.map((invoice) => (
            <TouchableOpacity
              key={invoice.id}
              style={styles.expenseCard}
              activeOpacity={0.8}
              onPress={() => handleInvoice(invoice)}
            >
              <View style={[styles.avatar, { backgroundColor: INVOICE_COLORS[invoice.status] + '14' }]}>
                <Ionicons name="business-outline" size={18} color={INVOICE_COLORS[invoice.status]} />
              </View>
              <View style={styles.info}>
                <Text style={styles.title}>{invoice.vendor}</Text>
                <Text style={styles.meta}>{invoice.item} • Due {invoice.due}</Text>
                <View style={[styles.statusChip, { backgroundColor: INVOICE_COLORS[invoice.status] + '1A' }]}>
                  <Text style={[styles.statusText, { color: INVOICE_COLORS[invoice.status] }]}>{invoice.status}</Text>
                </View>
              </View>
              <Text style={styles.amount}>{invoice.amount}</Text>
            </TouchableOpacity>
          ))}
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
  expenseCard: {
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
  info: {
    flex: 1,
  },
  title: {
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
  statusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 5,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Manrope-Bold',
    marginLeft: 10,
  },
});