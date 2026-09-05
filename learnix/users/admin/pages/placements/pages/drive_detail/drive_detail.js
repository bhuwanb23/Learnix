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

import ActionButton from '../../../../components/ui/ActionButton';
import SectionHeader from '../../../../components/ui/SectionHeader';
import FilterChips from '../../../../components/ui/FilterChips';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../../constants/theme';

const PROCESS_STEPS = [
  { id: '1', name: 'Registration', date: 'Nov 20-30', status: 'Open', applicants: 287, color: '#059669' },
  { id: '2', name: 'Online Test', date: 'Dec 5', status: 'Scheduled', applicants: 210, color: '#d97706' },
  { id: '3', name: 'Technical Interview', date: 'Dec 8', status: 'Scheduled', applicants: 85, color: '#d97706' },
  { id: '4', name: 'HR Interview', date: 'Dec 9', status: 'Pending', applicants: 0, color: '#dc2626' },
];

export default function DriveDetail({ drive, onBack }) {
  const [tab, setTab] = useState('process');

  const handleNotify = () => {
    Alert.alert('Notification Sent', `Reminder sent to ${drive.applications} applicants for ${drive.company} drive.`);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#7c3aed" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{drive.company} Drive</Text>
            <Text style={styles.headerSubtitle}>{drive.role} • {drive.package}</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={[styles.companyIcon, { backgroundColor: drive.color + '1A' }]}>
            <Text style={[styles.companyInitial, { color: drive.color }]}>{drive.company.charAt(0)}</Text>
          </View>
          <Text style={styles.companyName}>{drive.company}</Text>
          <Text style={styles.roleName}>{drive.role}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Ionicons name="cash-outline" size={12} color="#059669" />
              <Text style={[styles.badgeText, { color: '#059669' }]}>{drive.package}</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="calendar-outline" size={12} color="#7c3aed" />
              <Text style={[styles.badgeText, { color: '#7c3aed' }]}>{drive.date}</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="videocam-outline" size={12} color="#d97706" />
              <Text style={[styles.badgeText, { color: '#d97706' }]}>{drive.mode}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{drive.eligible}</Text>
            <Text style={styles.statLabel}>Eligible</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{drive.applications}</Text>
            <Text style={styles.statLabel}>Applied</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {drive.applications ? Math.round((drive.applications / drive.eligible) * 100) : 0}%
            </Text>
            <Text style={styles.statLabel}>Conversion</Text>
          </View>
        </View>

        <View style={styles.tabsRow}>
          {['process', 'applicants'].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.activeTab]}
              onPress={() => setTab(t)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, tab === t && styles.activeTabText]}>
                {t === 'process' ? 'Process' : 'Applicants'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'process' ? (
          <>
            <SectionHeader title="Selection Process" />
            {PROCESS_STEPS.map((step, index) => (
              <View key={step.id} style={styles.stepCard}>
                <View style={[styles.stepNumber, { backgroundColor: step.status === 'Open' ? '#0596691A' : step.status === 'Scheduled' ? '#d977061A' : '#f1f5f9' }]}>
                  <Text style={[styles.stepNumberText, { color: step.status === 'Open' ? '#059669' : step.status === 'Scheduled' ? '#d97706' : '#94a3b8' }]}>
                    {index + 1}
                  </Text>
                </View>
                <View style={styles.stepInfo}>
                  <Text style={styles.stepName}>{step.name}</Text>
                  <Text style={styles.stepDate}>{step.date} • {step.applicants} applicants</Text>
                </View>
                <View style={[styles.stepStatus, { backgroundColor: step.status === 'Open' ? '#0596691A' : step.status === 'Scheduled' ? '#d977061A' : '#f1f5f9' }]}>
                  <Text style={[styles.stepStatusText, { color: step.status === 'Open' ? '#059669' : step.status === 'Scheduled' ? '#d97706' : '#94a3b8' }]}>
                    {step.status}
                  </Text>
                </View>
              </View>
            ))}
            <ActionButton label="Notify Applicants" icon="megaphone" onPress={handleNotify} />
          </>
        ) : null}

        {tab === 'applicants' ? (
          <>
            <SectionHeader title={`Applicants (${drive.applications})`} actionLabel="Export List" actionIcon="download" onAction={() => Alert.alert('Exported', 'Applicant list downloaded as Excel.')} />
            {['Ananya Reddy', 'Aarav Mehta', 'Priya Sharma', 'Isha Gupta', 'Kabir Joshi'].map((name, i) => (
              <TouchableOpacity
                key={name}
                style={styles.applicantRow}
                activeOpacity={0.8}
                onPress={() => Alert.alert(name, `CSE-2${i + 1}-00${i + 1}\nCGPA: ${(8.1 + i * 0.2).toFixed(1)}\nApplied: 3 days ago`)}
              >
                <View style={[styles.appAvatar, { backgroundColor: ['#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'][i] + '1A' }]}>
                  <Text style={[styles.appInitial, { color: ['#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'][i] }]}>
                    {name.split(' ').map((w) => w[0]).join('')}
                  </Text>
                </View>
                <View style={styles.appInfo}>
                  <Text style={styles.appName}>{name}</Text>
                  <Text style={styles.appMeta}>CGPA {(8.1 + i * 0.2).toFixed(1)} • Backlogs 0</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
              </TouchableOpacity>
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7c3aed1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 2,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  companyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  companyInitial: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  companyName: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  roleName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: '#64748b',
    fontFamily: 'Manrope-Medium',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: '#f1f5f9',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: 'Manrope-SemiBold',
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  statValue: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 2,
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
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  stepNumberText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  stepInfo: {
    flex: 1,
  },
  stepName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  stepDate: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  stepStatus: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  stepStatusText: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: 'Manrope-SemiBold',
  },
  applicantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  appAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  appInitial: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  appMeta: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
});