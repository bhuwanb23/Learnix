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

import { DUES_STATS, DEFAULTERS, CONCESSION_REQUESTS } from './constants/duesData';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const REQUEST_COLORS = {
  Pending: '#2563eb',
  Approved: '#059669',
  Rejected: '#dc2626',
};

export default function DuesModule({ navigation }) {
  const [tab, setTab] = useState('defaulters');

  const handleReminder = (defaulter) => {
    Alert.alert(
      'Send Reminder',
      `Send fee reminder to ${defaulter.student} (${defaulter.due} due for ${defaulter.daysOverdue} days)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', onPress: () => Alert.alert('Sent', 'Reminder sent via SMS, email, and app notification.') },
      ]
    );
  };

  const handleConcession = (defaulter) => {
    Alert.alert(
      'Apply Concession',
      `Apply a concession for ${defaulter.student}? A formal request must be approved by the finance head.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Create Request', onPress: () => Alert.alert('Request Created', 'Concession request sent to the finance head for approval.') },
      ]
    );
  };

  const handleRequest = (request) => {
    Alert.alert(
      'Concession Request',
      `${request.student} — ${request.type} (${request.amount})`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: () => Alert.alert('Approved', 'Concession applied. Student fee account updated.') },
        { text: 'Reject', style: 'destructive', onPress: () => Alert.alert('Rejected', 'Request declined. Student notified with reason.') },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Stats */}
      <View style={styles.statsRow}>
        {DUES_STATS.map((stat) => (
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
          { id: 'defaulters', label: `Defaulters (${DEFAULTERS.length})` },
          { id: 'requests', label: `Concessions (${CONCESSION_REQUESTS.length})` },
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

      {tab === 'defaulters' ? (
        <>
          {DEFAULTERS.map((defaulter) => (
            <View key={defaulter.id} style={styles.defaulterCard}>
              <View style={[styles.avatar, { backgroundColor: defaulter.color + '14' }]}>
                <Text style={[styles.initial, { color: defaulter.color }]}>{defaulter.student.charAt(0)}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.studentName}>{defaulter.student}</Text>
                <Text style={styles.meta}>{defaulter.rollNo} • {defaulter.program} • {defaulter.semester}</Text>
                <View style={[styles.overdueChip, { backgroundColor: (defaulter.daysOverdue > 15 ? '#dc2626' : defaulter.daysOverdue > 7 ? '#d97706' : '#64748b') + '1A' }]}>
                  <Text style={[styles.overdueText, { color: defaulter.daysOverdue > 15 ? '#dc2626' : defaulter.daysOverdue > 7 ? '#d97706' : '#64748b' }]}>
                    {defaulter.daysOverdue} days overdue
                  </Text>
                </View>
              </View>
              <View style={styles.right}>
                <Text style={styles.due}>{defaulter.due}</Text>
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleReminder(defaulter)} activeOpacity={0.7}>
                    <Ionicons name="megaphone-outline" size={15} color="#2563eb" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleConcession(defaulter)} activeOpacity={0.7}>
                    <Ionicons name="gift-outline" size={15} color="#059669" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
          <Text style={styles.note}>Megaphone sends a reminder, gift opens a concession request.</Text>
        </>
      ) : (
        <>
          <Text style={styles.sectionLabel}>Concession Requests</Text>
          {CONCESSION_REQUESTS.map((request) => (
            <TouchableOpacity
              key={request.id}
              style={styles.requestCard}
              activeOpacity={0.8}
              onPress={() => handleRequest(request)}
            >
              <View style={[styles.requestIcon, { backgroundColor: REQUEST_COLORS[request.status] + '14' }]}>
                <Ionicons name="gift-outline" size={18} color={REQUEST_COLORS[request.status]} />
              </View>
              <View style={styles.requestInfo}>
                <Text style={styles.requestStudent}>{request.student} • {request.type}</Text>
                <Text style={styles.requestMeta}>{request.amount} • Requested {request.date}</Text>
              </View>
              <View style={[styles.requestStatusChip, { backgroundColor: REQUEST_COLORS[request.status] + '1A' }]}>
                <Text style={[styles.requestStatusText, { color: REQUEST_COLORS[request.status] }]}>{request.status}</Text>
              </View>
            </TouchableOpacity>
          ))}
          <Text style={styles.note}>Tap a request to approve or reject it.</Text>
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
  defaulterCard: {
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
  overdueChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 5,
  },
  overdueText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  right: {
    alignItems: 'flex-end',
    gap: 8,
  },
  due: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626',
    fontFamily: 'Manrope-Bold',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  note: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 10,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 10,
  },
  requestIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requestStudent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  requestMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  requestStatusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  requestStatusText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
});