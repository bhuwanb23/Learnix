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

import { PLACEMENT_STATS, PLACEMENT_DRIVES, RECENT_APPLICATIONS, COMPANIES } from './constants/placementsData';

import StatCard from '../../components/ui/StatCard';
import SectionHeader from '../../components/ui/SectionHeader';

import DriveDetail from './pages/drive_detail/drive_detail';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const TABS = [
  { id: 'drives', label: 'Drives' },
  { id: 'applications', label: 'Applications' },
  { id: 'companies', label: 'Companies' },
];

export default function PlacementsModule({ navigation }) {
  const [tab, setTab] = useState('drives');
  const [selectedDrive, setSelectedDrive] = useState(null);

  if (selectedDrive) {
    return <DriveDetail drive={selectedDrive} onBack={() => setSelectedDrive(null)} />;
  }

  const handleCreateDrive = () => {
    Alert.alert('Create Drive', 'Schedule a new placement drive (company, role, date, mode).');
  };

  const handleApproveDrive = (drive) => {
    Alert.alert(
      'Approve Drive',
      `Approve ${drive.company} campus drive scheduled for ${drive.date}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: () => Alert.alert('Approved', 'Drive approved and student notifications sent.') },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Stats */}
      <View style={styles.statsRow}>
        {PLACEMENT_STATS.map((stat) => (
          <StatCard key={stat.id} icon={stat.icon} value={stat.value} label={stat.label} color={stat.color} />
        ))}
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

      {tab === 'drives' ? (
        <>
          <SectionHeader title="Placement Drives" actionLabel="New Drive" actionIcon="add" onAction={handleCreateDrive} />
          {PLACEMENT_DRIVES.map((drive) => (
            <TouchableOpacity
              key={drive.id}
              style={styles.driveCard}
              onPress={() => setSelectedDrive(drive)}
              activeOpacity={0.8}
            >
              <View style={[styles.companyIcon, { backgroundColor: drive.color + '1A' }]}>
                <Text style={[styles.companyInitial, { color: drive.color }]}>{drive.company.charAt(0)}</Text>
              </View>
              <View style={styles.driveInfo}>
                <Text style={styles.companyName}>{drive.company}</Text>
                <Text style={styles.driveRole}>{drive.role} • {drive.package}</Text>
                <Text style={styles.driveMeta}>{drive.date} • {drive.mode} • {drive.applications} applied</Text>
              </View>
              <View style={styles.driveRight}>
                <View style={[styles.driveStatus, { backgroundColor: drive.status === 'Approved' ? '#0596691A' : drive.status === 'Pending' ? '#d977061A' : '#7c3aed1A' }]}>
                  <Text style={[styles.driveStatusText, { color: drive.status === 'Approved' ? '#059669' : drive.status === 'Pending' ? '#d97706' : '#7c3aed' }]}>
                    {drive.status}
                  </Text>
                </View>
                {drive.status === 'Pending' ? (
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => handleApproveDrive(drive)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="checkmark" size={14} color="#ffffff" />
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </>
      ) : null}

      {tab === 'applications' ? (
        <>
          <SectionHeader title="Recent Applications" actionLabel="Export" actionIcon="download" onAction={() => Alert.alert('Export', 'Application log downloaded as Excel.')} />
          {RECENT_APPLICATIONS.map((app) => (
            <TouchableOpacity
              key={app.id}
              style={styles.applicationCard}
              activeOpacity={0.8}
              onPress={() => Alert.alert(app.student, `${app.role} at ${app.company}\nApplied ${app.appliedAt} • ${app.status}`)}
            >
              <View style={[styles.appAvatar, { backgroundColor: app.color + '1A' }]}>
                <Text style={[styles.appInitial, { color: app.color }]}>{app.student.charAt(0)}</Text>
              </View>
              <View style={styles.appInfo}>
                <Text style={styles.appName}>{app.student}</Text>
                <Text style={styles.appMeta}>{app.company} • {app.role}</Text>
                <Text style={styles.appTime}>{app.appliedAt}</Text>
              </View>
              <View style={[styles.appStatus, { backgroundColor: app.status === 'Shortlisted' ? '#0596691A' : '#7c3aed1A' }]}>
                <Text style={[styles.appStatusText, { color: app.status === 'Shortlisted' ? '#059669' : '#7c3aed' }]}>
                  {app.status}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </>
      ) : null}

      {tab === 'companies' ? (
        <>
          <SectionHeader title="Partner Companies" actionLabel="Add Company" actionIcon="add" onAction={() => Alert.alert('Add Company', 'Register a new recruiting partner.')} />
          {COMPANIES.map((company) => (
            <TouchableOpacity
              key={company.id}
              style={styles.companyCard}
              activeOpacity={0.8}
              onPress={() => Alert.alert(company.name, `${company.sector}\n${company.jobs} active job postings • ${company.hires} hired this year`)}
            >
              <View style={[styles.companyIcon, { backgroundColor: company.color + '1A' }]}>
                <Text style={[styles.companyInitial, { color: company.color }]}>{company.name.charAt(0)}</Text>
              </View>
              <View style={styles.companyInfo}>
                <Text style={styles.companyName}>{company.name}</Text>
                <Text style={styles.companySector}>{company.sector}</Text>
              </View>
              <View style={styles.companyStats}>
                <Text style={styles.companyJobs}>{company.jobs} jobs</Text>
                <Text style={styles.companyHires}>{company.hires} hired</Text>
              </View>
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
  driveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  companyIcon: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  companyInitial: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  driveInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  driveRole: {
    fontSize: 11,
    color: '#7c3aed',
    fontFamily: 'Manrope-SemiBold',
    marginTop: 1,
  },
  driveMeta: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  driveRight: {
    alignItems: 'flex-end',
    gap: 4,
    marginLeft: SPACING.sm,
  },
  driveStatus: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  driveStatusText: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: 'Manrope-SemiBold',
  },
  approveBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  applicationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  appAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  appInitial: {
    fontSize: TYPOGRAPHY.fontSize.base,
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
  appTime: {
    fontSize: 9,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  appStatus: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    marginLeft: SPACING.sm,
  },
  appStatusText: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: 'Manrope-SemiBold',
  },
  companyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  companyInfo: {
    flex: 1,
  },
  companySector: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  companyStats: {
    alignItems: 'flex-end',
  },
  companyJobs: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  companyHires: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
  },
});