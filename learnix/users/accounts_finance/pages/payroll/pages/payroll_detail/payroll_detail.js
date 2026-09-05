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

import { SALARY_BREAKDOWN, DEDUCTIONS } from '../../constants/payrollData';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../../constants/theme';

const HISTORY = [
  { id: 'H1', month: 'October 2026', net: '₹1,42,380', status: 'Paid', color: '#059669' },
  { id: 'H2', month: 'September 2026', net: '₹1,42,380', status: 'Paid', color: '#059669' },
  { id: 'H3', month: 'August 2026', net: '₹1,40,210', status: 'Paid', color: '#059669' },
];

export default function PayrollDetail({ staff, onBack }) {
  const [tab, setTab] = useState('breakdown');

  const handleAction = () => {
    if (staff.status === 'Pending') {
      Alert.alert(
        'Process Salary',
        `Process ${staff.name}'s salary for November?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Process', onPress: () => Alert.alert('Processed', `Salary of ${staff.net} initiated to ${staff.name}'s bank account.`) },
        ]
      );
    } else {
      Alert.alert(
        'Payslip',
        `${staff.name} — November 2026 payslip\nNet pay: ${staff.net}\nPayslip PDF emailed and available in the staff portal.`,
        [
          { text: 'Close', style: 'cancel' },
          { text: 'Resend', onPress: () => Alert.alert('Resent', 'Payslip re-sent via email.') },
        ]
      );
    }
  };

  const totalEarnings = SALARY_BREAKDOWN.reduce((sum, s) => sum + parseInt(s.amount.replace(/[^0-9]/g, '')), 0);
  const totalDeductions = DEDUCTIONS.reduce((sum, d) => sum + parseInt(d.amount.replace(/[^0-9]/g, '')), 0);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#2563eb" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Payroll Detail</Text>
            <Text style={styles.headerSubtitle}>{staff.role}</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={[styles.avatar, { backgroundColor: staff.color + '14' }]}>
            <Text style={[styles.initial, { color: staff.color }]}>{staff.name.replace('Dr. ', '').replace('Prof. ', '').replace('Mr. ', '').replace('Ms. ', '').charAt(0)}</Text>
          </View>
          <Text style={styles.staffName}>{staff.name}</Text>
          <Text style={styles.staffRole}>{staff.role} • {staff.type}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Ionicons name="card-outline" size={12} color="#2563eb" />
              <Text style={[styles.badgeText, { color: '#2563eb' }]}>Gross {staff.gross}</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="checkmark-circle-outline" size={12} color="#059669" />
              <Text style={[styles.badgeText, { color: '#059669' }]}>Net {staff.net}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.actionBtn} onPress={handleAction} activeOpacity={0.85}>
          <Ionicons name={staff.status === 'Pending' ? 'flash' : 'document-text'} size={16} color="#FFFFFF" />
          <Text style={styles.actionBtnText}>
            {staff.status === 'Pending' ? 'Process Salary' : 'View / Resend Payslip'}
          </Text>
        </TouchableOpacity>

        <View style={styles.tabsRow}>
          {[
            { id: 'breakdown', label: 'Breakdown' },
            { id: 'history', label: 'History' },
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

        {tab === 'breakdown' ? (
          <>
            <Text style={styles.sectionLabel}>Earnings (November)</Text>
            <View style={styles.card}>
              {SALARY_BREAKDOWN.map((item) => (
                <View key={item.id} style={styles.row}>
                  <View style={[styles.rowIcon, { backgroundColor: item.color + '14' }]}>
                    <Ionicons name="add-circle-outline" size={14} color={item.color} />
                  </View>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  <Text style={styles.rowValue}>{item.amount}</Text>
                </View>
              ))}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Earnings</Text>
                <Text style={styles.totalValue}>₹{totalEarnings.toLocaleString('en-IN')}</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>Deductions</Text>
            <View style={styles.card}>
              {DEDUCTIONS.map((item) => (
                <View key={item.id} style={styles.row}>
                  <View style={[styles.rowIcon, { backgroundColor: item.color + '14' }]}>
                    <Ionicons name="remove-circle-outline" size={14} color={item.color} />
                  </View>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  <Text style={[styles.rowValue, { color: '#dc2626' }]}>{item.amount}</Text>
                </View>
              ))}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Deductions</Text>
                <Text style={[styles.totalValue, { color: '#dc2626' }]}>₹{totalDeductions.toLocaleString('en-IN')}</Text>
              </View>
            </View>

            <View style={styles.netCard}>
              <Text style={styles.netLabel}>Net Pay — November</Text>
              <Text style={styles.netValue}>{staff.net}</Text>
              <Text style={styles.netNote}>Credited to account •• 4321 on the 1st of December</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Salary History</Text>
            {HISTORY.map((item) => (
              <View key={item.id} style={styles.historyCard}>
                <View style={[styles.historyIcon, { backgroundColor: item.color + '14' }]}>
                  <Ionicons name="calendar-outline" size={18} color={item.color} />
                </View>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyMonth}>{item.month}</Text>
                  <Text style={styles.historyNet}>{item.net}</Text>
                </View>
                <View style={[styles.historyStatusChip, { backgroundColor: item.color + '1A' }]}>
                  <Text style={[styles.historyStatusText, { color: item.color }]}>{item.status}</Text>
                </View>
              </View>
            ))}
          </>
        )}
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
    marginBottom: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  initial: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  staffName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  staffRole: {
    fontSize: 13,
    color: '#64748b',
    fontFamily: 'Manrope-Medium',
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
  actionBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 20,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Manrope-Bold',
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
  card: {
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 16,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rowIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rowLabel: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    fontFamily: 'Manrope-Regular',
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Manrope-Bold',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563eb',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  netCard: {
    backgroundColor: '#2563eb',
    borderRadius: BORDER_RADIUS.lg,
    padding: 20,
    alignItems: 'center',
    marginTop: 4,
  },
  netLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Manrope-Medium',
  },
  netValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: -1,
    marginTop: 4,
  },
  netNote: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Manrope-Regular',
    marginTop: 6,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 10,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyMonth: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  historyNet: {
    fontSize: 12,
    color: '#059669',
    fontFamily: 'Manrope-Bold',
    marginTop: 1,
  },
  historyStatusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
});