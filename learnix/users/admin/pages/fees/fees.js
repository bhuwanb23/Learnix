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

import { FEE_STATS, RECENT_COLLECTIONS, FEE_DUES, FEE_STRUCTURE } from './constants/feesData';

import StatCard from '../../components/ui/StatCard';
import SectionHeader from '../../components/ui/SectionHeader';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const TABS = [
  { id: 'collections', label: 'Collections' },
  { id: 'dues', label: 'Dues' },
  { id: 'structure', label: 'Structure' },
];

export default function FeesModule({ navigation }) {
  const [tab, setTab] = useState('collections');

  const handleReminder = (student) => {
    Alert.alert(
      'Send Reminder',
      `Send fee reminder to ${student.student} (${student.due} due for ${student.daysOverdue} days)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', onPress: () => Alert.alert('Sent', 'Reminder sent via SMS, email, and app notification.') },
      ]
    );
  };

  const handleRecordPayment = () => {
    Alert.alert('Record Payment', 'Manually record an offline payment (cash/cheque).');
  };

  const handleEditStructure = () => {
    Alert.alert('Edit Structure', 'Update tuition or other fees for a program.');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Stats */}
      <View style={styles.statsRow}>
        {FEE_STATS.map((stat) => (
          <StatCard key={stat.id} icon={stat.icon} value={stat.value} label={stat.label} color={stat.color} />
        ))}
      </View>

      {/* Progress */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Collection Progress</Text>
          <Text style={styles.progressPct}>82%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '82%' }]} />
        </View>
        <Text style={styles.progressNote}>₹4.2 Cr collected of ₹5.1 Cr annual target</Text>
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

      {tab === 'collections' ? (
        <>
          <SectionHeader title="Recent Collections" actionLabel="Record Payment" actionIcon="add" onAction={handleRecordPayment} />
          {RECENT_COLLECTIONS.map((col) => (
            <TouchableOpacity
              key={col.id}
              style={styles.collectionCard}
              activeOpacity={0.8}
              onPress={() => Alert.alert(col.student, `${col.program}\n${col.amount} via ${col.method} • ${col.date}`)}
            >
              <View style={[styles.colAvatar, { backgroundColor: col.color + '1A' }]}>
                <Text style={[styles.colInitial, { color: col.color }]}>{col.student.charAt(0)}</Text>
              </View>
              <View style={styles.colInfo}>
                <Text style={styles.colName}>{col.student}</Text>
                <Text style={styles.colMeta}>{col.program} • {col.method} • {col.date}</Text>
              </View>
              <View style={styles.colRight}>
                <Text style={styles.colAmount}>{col.amount}</Text>
                <View style={[styles.colStatus, { backgroundColor: col.status === 'Cleared' ? '#0596691A' : '#d977061A' }]}>
                  <Text style={[styles.colStatusText, { color: col.status === 'Cleared' ? '#059669' : '#d97706' }]}>
                    {col.status}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </>
      ) : null}

      {tab === 'dues' ? (
        <>
          <SectionHeader title="Fee Defaulters" actionLabel="Remind All" actionIcon="megaphone" onAction={() => Alert.alert('Reminders Sent', 'Dues reminders sent to all 86 defaulters.')} />
          {FEE_DUES.map((due) => (
            <View key={due.id} style={styles.dueCard}>
              <View style={[styles.dueAvatar, { backgroundColor: due.color + '1A' }]}>
                <Text style={[styles.dueInitial, { color: due.color }]}>{due.student.charAt(0)}</Text>
              </View>
              <View style={styles.dueInfo}>
                <Text style={styles.dueName}>{due.student}</Text>
                <Text style={styles.dueMeta}>{due.rollNo} • {due.program} • {due.semester}</Text>
                <Text style={[styles.dueDays, { color: due.daysOverdue >= 15 ? '#dc2626' : '#d97706' }]}>
                  {due.daysOverdue} days overdue
                </Text>
              </View>
              <View style={styles.dueRight}>
                <Text style={styles.dueAmount}>{due.due}</Text>
                <TouchableOpacity
                  style={styles.remindBtn}
                  onPress={() => handleReminder(due)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="megaphone-outline" size={14} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      ) : null}

      {tab === 'structure' ? (
        <>
          <SectionHeader title="Fee Structure (Annual)" actionLabel="Edit" actionIcon="create" onAction={handleEditStructure} />
          {FEE_STRUCTURE.map((fee) => (
            <TouchableOpacity
              key={fee.id}
              style={styles.structureCard}
              activeOpacity={0.8}
              onPress={() => Alert.alert(fee.program, `Tuition: ${fee.tuition}\nOther fees: ${fee.other}\nTotal: ${fee.total}`)}
            >
              <View style={[styles.structureIcon, { backgroundColor: fee.color + '1A' }]}>
                <Ionicons name="school" size={18} color={fee.color} />
              </View>
              <View style={styles.structureInfo}>
                <Text style={styles.structureProgram}>{fee.program}</Text>
                <Text style={styles.structureMeta}>Tuition {fee.tuition} + Other {fee.other}</Text>
              </View>
              <Text style={styles.structureTotal}>{fee.total}</Text>
            </TouchableOpacity>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  progressCard: {
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  progressTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  progressPct: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#059669',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 4,
  },
  progressNote: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 4,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: BORDER_RADIUS.xl,
    padding: 4,
    marginBottom: SPACING.md,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
  },
  activeTab: {
    backgroundColor: '#ffffff',
  },
  tabText: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-SemiBold',
  },
  activeTabText: {
    color: '#7c3aed',
  },
  collectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  colAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  colInitial: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  colInfo: {
    flex: 1,
  },
  colName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  colMeta: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  colRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  colAmount: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  colStatus: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  colStatusText: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: 'Manrope-SemiBold',
  },
  dueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  dueAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  dueInitial: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  dueInfo: {
    flex: 1,
  },
  dueName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  dueMeta: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  dueDays: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    fontFamily: 'Manrope-Medium',
    marginTop: 1,
  },
  dueRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  dueAmount: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#dc2626',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  remindBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  structureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  structureIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  structureInfo: {
    flex: 1,
  },
  structureProgram: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  structureMeta: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  structureTotal: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#7c3aed',
    fontFamily: 'PlusJakartaSans-Bold',
  },
});