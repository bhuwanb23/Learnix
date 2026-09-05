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

import { SCHOLARSHIP_STATS, APPLICATIONS, SCHEMES } from './constants/scholarshipsData';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const STATUS_COLORS = {
  Pending: '#2563eb',
  Approved: '#059669',
  Disbursed: '#0284c7',
  Rejected: '#dc2626',
};

export default function ScholarshipsModule({ navigation }) {
  const [tab, setTab] = useState('applications');

  const handleApplication = (app) => {
    const actions = [
      { text: 'Cancel', style: 'cancel' },
    ];
    if (app.status === 'Pending') {
      actions.push({ text: 'Approve', onPress: () => Alert.alert('Approved', `${app.student} approved for ${app.scheme}.`) });
      actions.push({ text: 'Reject', style: 'destructive', onPress: () => Alert.alert('Rejected', 'Application declined. Student notified.') });
    } else if (app.status === 'Approved') {
      actions.push({ text: 'Disburse', onPress: () => Alert.alert('Disbursed', `${app.amount} credited to ${app.student}'s fee account.`) });
    } else {
      actions.push({ text: 'OK', style: 'cancel' });
    }
    Alert.alert(
      'Scholarship Application',
      `${app.student} (${app.rollNo}) — ${app.scheme}\n${app.amount}`,
      actions
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Stats */}
      <View style={styles.statsRow}>
        {SCHOLARSHIP_STATS.map((stat) => (
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
          { id: 'applications', label: `Applications (${APPLICATIONS.length})` },
          { id: 'schemes', label: 'Schemes' },
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

      {tab === 'applications' ? (
        <>
          {APPLICATIONS.map((app) => (
            <TouchableOpacity
              key={app.id}
              style={styles.appCard}
              activeOpacity={0.8}
              onPress={() => handleApplication(app)}
            >
              <View style={[styles.avatar, { backgroundColor: app.color + '14' }]}>
                <Text style={[styles.initial, { color: app.color }]}>{app.student.charAt(0)}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.studentName}>{app.student}</Text>
                <Text style={styles.meta}>{app.rollNo} • {app.scheme} • {app.date}</Text>
                <View style={[styles.statusChip, { backgroundColor: STATUS_COLORS[app.status] + '1A' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[app.status] }]}>{app.status}</Text>
                </View>
              </View>
              <Text style={styles.amount}>{app.amount}</Text>
            </TouchableOpacity>
          ))}
        </>
      ) : (
        <>
          <Text style={styles.sectionLabel}>Active Schemes</Text>
          {SCHEMES.map((scheme) => (
            <View key={scheme.id} style={styles.schemeCard}>
              <View style={[styles.schemeIcon, { backgroundColor: scheme.color + '14' }]}>
                <Ionicons name="school-outline" size={18} color={scheme.color} />
              </View>
              <View style={styles.schemeInfo}>
                <Text style={styles.schemeName}>{scheme.name}</Text>
                <Text style={styles.schemeMeta}>{scheme.criteria} • {scheme.applicants} applicants</Text>
              </View>
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
  appCard: {
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
    color: '#059669',
    fontFamily: 'Manrope-Bold',
    marginLeft: 10,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 10,
  },
  schemeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 10,
  },
  schemeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  schemeInfo: {
    flex: 1,
  },
  schemeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  schemeMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
});