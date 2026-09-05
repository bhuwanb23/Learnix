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

const RECENT_DRIVES = [
  { id: 'RD1', role: 'Software Engineer', date: 'Dec 10, 2026', status: 'In Progress', color: '#2563eb' },
  { id: 'RD2', role: 'Systems Engineer', date: 'Oct 2026', status: 'Completed', color: '#059669' },
  { id: 'RD3', role: 'Digital Specialist', date: 'Jul 2026', status: 'Completed', color: '#059669' },
];

export default function CompanyDetail({ company, onBack }) {
  const [tab, setTab] = useState('overview');

  const handleContactPoc = () => {
    Alert.alert(
      'Contact POC',
      `${company.poc} (${company.pocRole})`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Message', onPress: () => Alert.alert('Message', `Opening chat with ${company.poc}...`) },
      ]
    );
  };

  const handleScheduleDrive = () => {
    Alert.alert(
      'Schedule Drive',
      `Schedule a new campus drive with ${company.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Schedule', onPress: () => Alert.alert('Draft Created', 'Drive request sent to the company for confirmation.') },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#2563eb" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Company Profile</Text>
            <Text style={styles.headerSubtitle}>{company.sector}</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={[styles.companyIcon, { backgroundColor: company.color + '14' }]}>
            <Text style={[styles.companyInitial, { color: company.color }]}>{company.name.charAt(0)}</Text>
          </View>
          <Text style={styles.companyName}>{company.name}</Text>
          <Text style={styles.companySector}>{company.sector}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Ionicons name="newspaper-outline" size={12} color="#2563eb" />
              <Text style={[styles.badgeText, { color: '#2563eb' }]}>{company.jobs} open jobs</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="briefcase-outline" size={12} color="#059669" />
              <Text style={[styles.badgeText, { color: '#059669' }]}>{company.drives} drives</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="people-outline" size={12} color="#d97706" />
              <Text style={[styles.badgeText, { color: '#d97706' }]}>{company.hires} hires</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.scheduleBtn} onPress={handleScheduleDrive} activeOpacity={0.85}>
            <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
            <Text style={styles.scheduleBtnText}>Schedule Drive</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabsRow}>
          {['overview', 'drives'].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.activeTab]}
              onPress={() => setTab(t)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, tab === t && styles.activeTabText]}>
                {t === 'overview' ? 'Overview' : 'Hiring History'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'overview' ? (
          <>
            <Text style={styles.sectionLabel}>Point of Contact</Text>
            <View style={styles.pocCard}>
              <View style={[styles.pocAvatar, { backgroundColor: company.color + '14' }]}>
                <Text style={[styles.pocInitial, { color: company.color }]}>{company.poc.charAt(0)}</Text>
              </View>
              <View style={styles.pocInfo}>
                <Text style={styles.pocName}>{company.poc}</Text>
                <Text style={styles.pocRole}>{company.pocRole}</Text>
                <Text style={styles.pocMeta}>TCS Campus Relations • Bengaluru</Text>
              </View>
              <TouchableOpacity style={styles.messageBtn} onPress={handleContactPoc} activeOpacity={0.7}>
                <Ionicons name="chatbubble-outline" size={18} color="#2563eb" />
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>Company Details</Text>
            <View style={styles.infoCard}>
              {[
                { label: 'Sector', value: company.sector, icon: 'business-outline' },
                { label: 'Partner Since', value: '2022', icon: 'calendar-outline' },
                { label: 'Season Drives', value: company.drives.toString(), icon: 'briefcase-outline' },
                { label: 'Season Hires', value: company.hires.toString(), icon: 'people-outline' },
                { label: 'Open Jobs', value: company.jobs.toString(), icon: 'newspaper-outline' },
              ].map((row) => (
                <View key={row.label} style={styles.infoRow}>
                  <Ionicons name={row.icon} size={16} color="#2563eb" />
                  <Text style={styles.infoLabel}>{row.label}</Text>
                  <Text style={styles.infoValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Recent Drives</Text>
            {RECENT_DRIVES.map((drive) => (
              <View key={drive.id} style={styles.driveCard}>
                <View style={[styles.driveIcon, { backgroundColor: drive.color + '14' }]}>
                  <Ionicons name="briefcase-outline" size={18} color={drive.color} />
                </View>
                <View style={styles.driveInfo}>
                  <Text style={styles.driveRole}>{drive.role}</Text>
                  <Text style={styles.driveDate}>{drive.date}</Text>
                </View>
                <View style={[styles.driveStatusChip, { backgroundColor: drive.color + '1A' }]}>
                  <Text style={[styles.driveStatusText, { color: drive.color }]}>{drive.status}</Text>
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
    marginBottom: 16,
  },
  companyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  companyInitial: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  companyName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  companySector: {
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
  scheduleBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 20,
    marginTop: 14,
  },
  scheduleBtnText: {
    fontSize: 13,
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
  pocCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 20,
  },
  pocAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pocInitial: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  pocInfo: {
    flex: 1,
  },
  pocName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  pocRole: {
    fontSize: 12,
    color: '#475569',
    fontFamily: 'Manrope-Medium',
    marginTop: 1,
  },
  pocMeta: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  messageBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 16,
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
  driveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 10,
  },
  driveIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  driveInfo: {
    flex: 1,
  },
  driveRole: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  driveDate: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  driveStatusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  driveStatusText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
});