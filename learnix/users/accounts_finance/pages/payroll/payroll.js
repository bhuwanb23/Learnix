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

import { PAYROLL_STATS, STAFF } from './constants/payrollData';
import PayrollDetail from './pages/payroll_detail/payroll_detail';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const STATUS_COLORS = {
  Processed: '#059669',
  Processing: '#d97706',
  Pending: '#64748b',
};

export default function PayrollModule({ navigation }) {
  const [selectedStaff, setSelectedStaff] = useState(null);

  if (selectedStaff) {
    return <PayrollDetail staff={selectedStaff} onBack={() => setSelectedStaff(null)} />;
  }

  const handleRunPayroll = () => {
    Alert.alert(
      'Process Monthly Payroll',
      'Process November payroll for all 142 staff? PF, ESI, and TDS will be computed and bank transfer initiated.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Process', onPress: () => Alert.alert('Payroll Initiated', 'Salaries are being processed. Staff notified on completion.') },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Stats */}
      <View style={styles.statsRow}>
        {PAYROLL_STATS.map((stat) => (
          <View key={stat.id} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: stat.color + '14' }]}>
              <Ionicons name={stat.icon} size={18} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Run payroll */}
      <TouchableOpacity style={styles.runBtn} onPress={handleRunPayroll} activeOpacity={0.85}>
        <Ionicons name="flash" size={16} color="#FFFFFF" />
        <Text style={styles.runBtnText}>Process November Payroll</Text>
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>Staff Payroll</Text>
      {STAFF.map((staff) => (
        <TouchableOpacity
          key={staff.id}
          style={styles.staffCard}
          activeOpacity={0.8}
          onPress={() => setSelectedStaff(staff)}
        >
          <View style={[styles.avatar, { backgroundColor: staff.color + '14' }]}>
            <Text style={[styles.initial, { color: staff.color }]}>{staff.name.replace('Dr. ', '').replace('Prof. ', '').replace('Mr. ', '').replace('Ms. ', '').charAt(0)}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.staffName}>{staff.name}</Text>
            <Text style={styles.staffRole}>{staff.role}</Text>
            <View style={styles.staffChips}>
              <View style={[styles.typeChip, { backgroundColor: '#eff6ff' }]}>
                <Text style={[styles.typeText, { color: '#2563eb' }]}>{staff.type}</Text>
              </View>
              <View style={[styles.statusChip, { backgroundColor: STATUS_COLORS[staff.status] + '1A' }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[staff.status] }]}>{staff.status}</Text>
              </View>
            </View>
          </View>
          <View style={styles.right}>
            <Text style={styles.net}>{staff.net}</Text>
            <Text style={styles.gross}>Gross {staff.gross}</Text>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" style={{ marginTop: 4 }} />
          </View>
        </TouchableOpacity>
      ))}
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
    marginBottom: 16,
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
  runBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 13,
    marginBottom: 20,
  },
  runBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Manrope-Bold',
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 10,
  },
  staffCard: {
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
  staffName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  staffRole: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  staffChips: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  typeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
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
  right: {
    alignItems: 'flex-end',
  },
  net: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
    fontFamily: 'Manrope-Bold',
  },
  gross: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
  },
});