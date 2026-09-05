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

import { FINE_STATS, FINE_LIST, COLLECTED } from './constants/finesData';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

export default function FinesModule({ navigation }) {
  const [tab, setTab] = useState('unpaid');
  const [unpaidFines, setUnpaidFines] = useState(FINE_LIST);

  const handleCollect = (item) => {
    Alert.alert(
      'Collect Fine',
      `Collect ${item.fine} from ${item.student} for "${item.book}"? A receipt is generated and the amount posts to the library account.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Collect',
          onPress: () => {
            setUnpaidFines((prev) => prev.filter((f) => f.id !== item.id));
            Alert.alert('Collected', `${item.fine} received from ${item.student}.`);
          },
        },
      ]
    );
  };

  const handleWaive = (item) => {
    Alert.alert(
      'Waive Fine',
      `Waive the ${item.fine} fine for ${item.student}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Waive',
          onPress: () => {
            setUnpaidFines((prev) => prev.filter((f) => f.id !== item.id));
            Alert.alert('Waived', `${item.fine} fine waived for ${item.student}.`);
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Stats */}
      <View style={styles.statsRow}>
        {FINE_STATS.map((stat) => (
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
          { id: 'unpaid', label: `Pending (${unpaidFines.length})` },
          { id: 'collected', label: 'Collected' },
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

      {tab === 'unpaid' ? (
        <>
          {unpaidFines.map((item) => (
            <View key={item.id} style={styles.fineCard}>
              <View style={[styles.fineIcon, { backgroundColor: item.color + '14' }]}>
                <Ionicons name="cash-outline" size={18} color={item.color} />
              </View>
              <View style={styles.info}>
                <Text style={styles.studentName}>{item.student}</Text>
                <Text style={styles.meta}>{item.book} • {item.daysOverdue} days overdue</Text>
                <Text style={[styles.fineAmount, { color: item.color }]}>{item.fine}</Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.collectBtn} onPress={() => handleCollect(item)} activeOpacity={0.85}>
                  <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                  <Text style={styles.collectBtnText}>Collect</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.waiveBtn} onPress={() => handleWaive(item)} activeOpacity={0.7}>
                  <Ionicons name="gift-outline" size={15} color="#059669" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      ) : (
        <>
          <Text style={styles.sectionLabel}>Recently Collected</Text>
          {COLLECTED.map((item) => (
            <View key={item.id} style={styles.collectedCard}>
              <View style={[styles.collectedIcon, { backgroundColor: '#05966914' }]}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#059669" />
              </View>
              <View style={styles.info}>
                <Text style={styles.studentName}>{item.student}</Text>
                <Text style={styles.meta}>{item.method} • {item.date}</Text>
              </View>
              <Text style={styles.collectedAmount}>₹{item.fine.replace('₹', '')}</Text>
            </View>
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
  fineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 10,
  },
  fineIcon: {
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
  studentName: {
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
  fineAmount: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  collectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  collectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Manrope-Bold',
  },
  waiveBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 10,
  },
  collectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 10,
  },
  collectedIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  collectedAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
    fontFamily: 'Manrope-Bold',
  },
});