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

const APPLICATION_HISTORY = [
  { id: 'H1', company: 'TCS', role: 'Software Engineer', status: 'Test Round', date: 'Dec 10', color: '#2563eb' },
  { id: 'H2', company: 'Infosys', role: 'Systems Engineer', status: 'Interview', date: 'Dec 14', color: '#059669' },
  { id: 'H3', company: 'Wipro', role: 'Project Engineer', status: 'Applied', date: 'Dec 18', color: '#d97706' },
];

export default function StudentDetail({ student, onBack }) {
  const [tab, setTab] = useState('overview');

  const handleShortlist = () => {
    Alert.alert(
      'Shortlist Student',
      `Shortlist ${student.name} (${student.rollNo}) for upcoming drives?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Shortlist', onPress: () => Alert.alert('Shortlisted', `${student.name} added to the candidate pool.`) },
      ]
    );
  };

  const handleMessage = () => {
    Alert.alert('Message Student', `Opening chat with ${student.name}...`);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#2563eb" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Student Profile</Text>
            <Text style={styles.headerSubtitle}>{student.rollNo}</Text>
          </View>
        </View>

        {/* Header card */}
        <View style={styles.profileCard}>
          <View style={[styles.avatar, { backgroundColor: student.avatarColor + '14' }]}>
            <Text style={[styles.avatarText, { color: student.avatarColor }]}>
              {student.name.split(' ').map((w) => w[0]).join('')}
            </Text>
          </View>
          <Text style={styles.name}>{student.name}</Text>
          <Text style={styles.meta}>{student.branch} • {student.year} Year • CGPA {student.cgpa}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.statusChip, { backgroundColor: (student.status === 'Placed' ? '#0284c7' : student.status === 'In Process' ? '#d97706' : '#059669') + '1A' }]}>
              <Text style={[styles.statusText, { color: student.status === 'Placed' ? '#0284c7' : student.status === 'In Process' ? '#d97706' : '#059669' }]}>
                {student.status}
              </Text>
            </View>
            <View style={styles.statusChip}>
              <Text style={[styles.statusText, { color: '#2563eb' }]}>{student.applied} applications</Text>
            </View>
          </View>
          <View style={styles.profileActions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleShortlist} activeOpacity={0.85}>
              <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Shortlist</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleMessage} activeOpacity={0.85}>
              <Ionicons name="chatbubble-outline" size={16} color="#2563eb" />
              <Text style={styles.secondaryBtnText}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{student.cgpa}</Text>
            <Text style={styles.statLabel}>CGPA</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{student.applied}</Text>
            <Text style={styles.statLabel}>Applied</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {student.status === 'Placed' ? '1' : student.status === 'In Process' ? '2' : '0'}
            </Text>
            <Text style={styles.statLabel}>Shortlists</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          {['overview', 'applications'].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.activeTab]}
              onPress={() => setTab(t)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, tab === t && styles.activeTabText]}>
                {t === 'overview' ? 'Overview' : 'Applications'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'overview' ? (
          <>
            <Text style={styles.sectionLabel}>Personal Information</Text>
            <View style={styles.infoCard}>
              {[
                { label: 'Roll Number', value: student.rollNo, icon: 'card-outline' },
                { label: 'Branch', value: student.branch, icon: 'school-outline' },
                { label: 'Year', value: `${student.year} Year`, icon: 'calendar-outline' },
                { label: 'CGPA', value: student.cgpa.toString(), icon: 'stats-chart-outline' },
                { label: 'Backlogs', value: 'None', icon: 'checkmark-circle-outline' },
                { label: 'Placement Status', value: student.status, icon: 'ribbon-outline' },
              ].map((row) => (
                <View key={row.label} style={styles.infoRow}>
                  <Ionicons name={row.icon} size={16} color="#2563eb" />
                  <Text style={styles.infoLabel}>{row.label}</Text>
                  <Text style={styles.infoValue}>{row.value}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Eligibility</Text>
            <View style={styles.eligibilityCard}>
              {[
                { label: 'CGPA Threshold', value: 'Met (7.5+ required)', ok: true },
                { label: 'Backlogs', value: 'None — eligible', ok: true },
                { label: 'Year Restriction', value: 'Open to all eligible', ok: true },
              ].map((row) => (
                <View key={row.label} style={styles.eligibilityRow}>
                  <Ionicons name={row.ok ? 'checkmark-circle' : 'close-circle'} size={16} color={row.ok ? '#059669' : '#dc2626'} />
                  <Text style={styles.eligibilityLabel}>{row.label}</Text>
                  <Text style={styles.eligibilityValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Application History</Text>
            {APPLICATION_HISTORY.map((app) => (
              <View key={app.id} style={styles.appCard}>
                <View style={[styles.appIcon, { backgroundColor: app.color + '14' }]}>
                  <Ionicons name="briefcase-outline" size={18} color={app.color} />
                </View>
                <View style={styles.appInfo}>
                  <Text style={styles.appCompany}>{app.company} — {app.role}</Text>
                  <Text style={styles.appDate}>{app.date}</Text>
                </View>
                <View style={[styles.appStatusChip, { backgroundColor: app.color + '1A' }]}>
                  <Text style={[styles.appStatusText, { color: app.color }]}>{app.status}</Text>
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
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: -0.4,
  },
  meta: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  profileActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    width: '100%',
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Manrope-Bold',
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
    fontFamily: 'Manrope-Bold',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
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
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    fontFamily: 'Manrope-Regular',
    marginLeft: 10,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  eligibilityCard: {
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 16,
  },
  eligibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  eligibilityLabel: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    fontFamily: 'Manrope-Regular',
    marginLeft: 10,
  },
  eligibilityValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    fontFamily: 'Manrope-SemiBold',
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
  appIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appInfo: {
    flex: 1,
  },
  appCompany: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  appDate: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  appStatusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  appStatusText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
});