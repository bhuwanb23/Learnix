import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ROLES, ACADEMIC_YEAR, SYSTEM_CONFIG, PERMISSION_GROUPS } from './constants/settingsData';

import SectionHeader from '../../components/ui/SectionHeader';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const TABS = [
  { id: 'roles', label: 'Roles & Permissions' },
  { id: 'year', label: 'Academic Year' },
  { id: 'config', label: 'System Config' },
];

export default function SettingsModule({ navigation }) {
  const [tab, setTab] = useState('roles');
  const [toggles, setToggles] = useState({
    notifications: true,
    autoBackup: true,
    maintenance: false,
  });

  const handleRolePress = (role) => {
    Alert.alert(
      role.name,
      `${role.desc}\n${role.users} users with this role\n${role.permissions} permissions`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit Permissions', onPress: () => Alert.alert('Edit Permissions', `Customize access for ${role.name} role.`) },
      ]
    );
  };

  const handleNewRole = () => {
    Alert.alert('Create Role', 'Create a custom role with selected permissions.');
  };

  const handleYearChange = () => {
    Alert.alert(
      'Change Academic Year',
      'Roll over to the next academic year? This will archive current data and create new batches.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Roll Over', onPress: () => Alert.alert('Rolled Over', 'New academic year 2027-28 created.') },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Tabs */}
      <View style={styles.tabsRow}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, tab === t.id && styles.activeTab]}
            onPress={() => setTab(t.id)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, tab === t.id && styles.activeTabText]}>
              {t.id === 'roles' ? 'Roles' : t.id === 'year' ? 'Year' : 'Config'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'roles' ? (
        <>
          <SectionHeader title="User Roles" actionLabel="New Role" actionIcon="add" onAction={handleNewRole} />
          <Text style={styles.hint}>Roles define what each user type can access — the foundation for non-admin staff (placement, exam cell, accounts).</Text>
          {ROLES.map((role) => (
            <TouchableOpacity
              key={role.id}
              style={styles.roleCard}
              onPress={() => handleRolePress(role)}
              activeOpacity={0.8}
            >
              <View style={[styles.roleIcon, { backgroundColor: role.color + '1A' }]}>
                <Ionicons name="shield-checkmark" size={18} color={role.color} />
              </View>
              <View style={styles.roleInfo}>
                <Text style={styles.roleName}>{role.name}</Text>
                <Text style={styles.roleDesc} numberOfLines={1}>{role.desc}</Text>
              </View>
              <View style={styles.roleRight}>
                <Text style={styles.roleUsers}>{role.users}</Text>
                <Text style={styles.roleUsersLabel}>users</Text>
              </View>
            </TouchableOpacity>
          ))}

          <SectionHeader title="Permission Groups" />
          {PERMISSION_GROUPS.map((group) => (
            <View key={group.id} style={styles.permissionCard}>
              <Text style={styles.permissionName}>{group.name}</Text>
              <View style={styles.permissionChips}>
                {group.permissions.map((p) => (
                  <View key={p} style={styles.permissionChip}>
                    <Text style={styles.permissionChipText}>{p}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </>
      ) : null}

      {tab === 'year' ? (
        <>
          <SectionHeader title="Academic Year" />
          <View style={styles.yearCard}>
            <View style={styles.yearHeader}>
              <View style={styles.yearIcon}>
                <Ionicons name="calendar" size={22} color="#7c3aed" />
              </View>
              <View>
                <Text style={styles.yearCurrent}>Current: {ACADEMIC_YEAR.current}</Text>
                <Text style={styles.yearRange}>{ACADEMIC_YEAR.startDate} — {ACADEMIC_YEAR.endDate}</Text>
              </View>
            </View>
            <View style={styles.yearDivider} />
            {[
              { label: 'Semesters', value: ACADEMIC_YEAR.semesters.join(' • ') },
              { label: 'Exam Weeks', value: ACADEMIC_YEAR.examWeeks },
            ].map((row) => (
              <View key={row.label} style={styles.yearRow}>
                <Text style={styles.yearLabel}>{row.label}</Text>
                <Text style={styles.yearValue}>{row.value}</Text>
              </View>
            ))}
            <TouchableOpacity
              style={styles.rolloverBtn}
              onPress={handleYearChange}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-forward" size={16} color="#ffffff" />
              <Text style={styles.rolloverText}>Roll Over to 2027-28</Text>
            </TouchableOpacity>
          </View>

          <SectionHeader title="Previous Years" />
          {ACADEMIC_YEAR.previousYears.map((year) => (
            <TouchableOpacity
              key={year}
              style={styles.prevYearCard}
              activeOpacity={0.8}
              onPress={() => Alert.alert(year, 'Archived academic data for this year.')}
            >
              <Ionicons name="archive-outline" size={18} color="#64748b" />
              <Text style={styles.prevYearText}>{year}</Text>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>
          ))}
        </>
      ) : null}

      {tab === 'config' ? (
        <>
          <SectionHeader title="System Configuration" actionLabel="Edit" actionIcon="create" onAction={() => Alert.alert('Edit Config', 'Update system-wide configuration values.')} />
          {SYSTEM_CONFIG.map((item) => (
            <View key={item.id} style={styles.configCard}>
              <View style={styles.configIcon}>
                <Ionicons name={item.icon} size={16} color="#7c3aed" />
              </View>
              <View style={styles.configInfo}>
                <Text style={styles.configLabel}>{item.label}</Text>
                <Text style={styles.configValue}>{item.value}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </View>
          ))}

          <SectionHeader title="Preferences" />
          <View style={styles.toggleCard}>
            {[
              { id: 'notifications', label: 'Push Notifications', desc: 'Send app notifications for approvals & alerts' },
              { id: 'autoBackup', label: 'Auto Backup', desc: 'Daily database backup at 2:00 AM' },
              { id: 'maintenance', label: 'Maintenance Mode', desc: 'Temporarily disable student/teacher login' },
            ].map((item) => (
              <View key={item.id} style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>{item.label}</Text>
                  <Text style={styles.toggleDesc}>{item.desc}</Text>
                </View>
                <Switch
                  value={toggles[item.id]}
                  onValueChange={(val) => {
                    setToggles((prev) => ({ ...prev, [item.id]: val }));
                    if (item.id === 'maintenance' && val) {
                      Alert.alert('Maintenance Mode', 'Student and teacher logins will be temporarily disabled.');
                    }
                  }}
                  trackColor={{ false: '#e2e8f0', true: '#7c3aed' }}
                  thumbColor="#ffffff"
                />
              </View>
            ))}
          </View>
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
  hint: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginBottom: SPACING.md,
    lineHeight: 16,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  roleIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  roleDesc: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  roleRight: {
    alignItems: 'flex-end',
  },
  roleUsers: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  roleUsersLabel: {
    fontSize: 9,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
  },
  permissionCard: {
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  permissionName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
    marginBottom: SPACING.sm,
  },
  permissionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  permissionChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: '#7c3aed1A',
  },
  permissionChipText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: '#7c3aed',
    fontFamily: 'Manrope-Medium',
  },
  yearCard: {
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  yearHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  yearIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7c3aed1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearCurrent: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  yearRange: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
  },
  yearDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: SPACING.md,
  },
  yearRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  yearLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
  },
  yearValue: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  rolloverBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: '#7c3aed',
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: 12,
    marginTop: SPACING.md,
  },
  rolloverText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: '#ffffff',
    fontFamily: 'Manrope-SemiBold',
  },
  prevYearCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
    ...SHADOWS.sm,
  },
  prevYearText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: '#475569',
    fontFamily: 'Manrope-Medium',
  },
  configCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  configIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#7c3aed1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  configInfo: {
    flex: 1,
  },
  configLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  configValue: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  toggleCard: {
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  toggleInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  toggleLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  toggleDesc: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
});