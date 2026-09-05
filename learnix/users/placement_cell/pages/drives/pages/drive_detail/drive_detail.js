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

import { PIPELINE_STEPS, DRIVE_APPLICANTS } from '../../constants/drivesData';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../../constants/theme';

export default function DriveDetail({ drive, onBack }) {
  const [tab, setTab] = useState('pipeline');
  const [applicants, setApplicants] = useState(DRIVE_APPLICANTS);

  const handleShortlist = (app) => {
    Alert.alert(
      'Shortlist Candidate',
      `Move ${app.name} (${app.rollNo}) to the next round?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Shortlist',
          onPress: () => {
            setApplicants((prev) =>
              prev.map((a) =>
                a.id === app.id
                  ? { ...a, status: 'Shortlisted', round: PIPELINE_STEPS[PIPELINE_STEPS.findIndex((s) => s.id === 'tech') + 1] ? 'HR Interview' : 'Tech Interview' }
                  : a
              )
            );
            Alert.alert('Shortlisted', `${app.name} moved to the next round.`);
          },
        },
      ]
    );
  };

  const handleReject = (app) => {
    Alert.alert(
      'Reject Candidate',
      `Reject ${app.name}'s application for ${drive.company}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => {
            setApplicants((prev) =>
              prev.map((a) => (a.id === app.id ? { ...a, status: 'Rejected', round: 'Rejected' } : a))
            );
            Alert.alert('Rejected', `${app.name} has been notified.`);
          },
        },
      ]
    );
  };

  const handleNotify = () => {
    Alert.alert(
      'Notify Students',
      `Send an update about the ${drive.company} drive to ${drive.applications || drive.eligible} students?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', onPress: () => Alert.alert('Sent', 'Update broadcast to all applicants.') },
      ]
    );
  };

  const handleAdvanceRound = (step) => {
    if (step.id === 'registration') return;
    Alert.alert(
      `Advance to ${step.label}`,
      `Move all ${drive.applications} applicants to the ${step.label} round?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Advance', onPress: () => Alert.alert('Updated', `Drive advanced to ${step.label}. Students notified.`) },
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
            <Text style={styles.headerTitle}>{drive.company} Drive</Text>
            <Text style={styles.headerSubtitle}>{drive.role} • {drive.package}</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={[styles.companyIcon, { backgroundColor: drive.color + '14' }]}>
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
              <Ionicons name="calendar-outline" size={12} color="#2563eb" />
              <Text style={[styles.badgeText, { color: '#2563eb' }]}>{drive.date}</Text>
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

        <TouchableOpacity style={styles.notifyBtn} onPress={handleNotify} activeOpacity={0.85}>
          <Ionicons name="megaphone-outline" size={16} color="#FFFFFF" />
          <Text style={styles.notifyBtnText}>Notify Applicants</Text>
        </TouchableOpacity>

        <View style={styles.tabsRow}>
          {[
            { id: 'pipeline', label: 'Pipeline' },
            { id: 'applicants', label: `Applicants (${applicants.length})` },
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

        {tab === 'pipeline' ? (
          <>
            <Text style={styles.sectionLabel}>Hiring Pipeline</Text>
            {PIPELINE_STEPS.map((step, idx) => (
              <TouchableOpacity
                key={step.id}
                style={styles.stepCard}
                activeOpacity={0.8}
                onPress={() => handleAdvanceRound(step)}
              >
                <View style={styles.stepLeft}>
                  <View style={[styles.stepIcon, { backgroundColor: step.color + '14' }]}>
                    <Ionicons name={step.icon} size={18} color={step.color} />
                  </View>
                  <View style={styles.stepInfo}>
                    <Text style={styles.stepName}>{step.label}</Text>
                    <Text style={styles.stepMeta}>
                      {idx === 0 ? `${drive.applications} registered` : idx === 1 ? 'Scheduled Dec 5' : idx === 2 ? 'Scheduled Dec 8' : idx === 3 ? 'Scheduled Dec 9' : 'To be announced'}
                    </Text>
                  </View>
                </View>
                <View style={styles.stepRight}>
                  {idx === 0 ? (
                    <View style={[styles.roundChip, { backgroundColor: '#0596691A' }]}>
                      <Text style={[styles.roundText, { color: '#059669' }]}>Open</Text>
                    </View>
                  ) : (
                    <View style={[styles.roundChip, { backgroundColor: '#d977061A' }]}>
                      <Text style={[styles.roundText, { color: '#d97706' }]}>Scheduled</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
                </View>
              </TouchableOpacity>
            ))}
            <Text style={styles.pipelineNote}>Tap a round to advance all applicants to that stage.</Text>
          </>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Applicants</Text>
            {applicants.map((app) => (
              <View key={app.id} style={styles.applicantCard}>
                <View style={[styles.appAvatar, { backgroundColor: app.color + '14' }]}>
                  <Text style={[styles.appInitial, { color: app.color }]}>{app.name.charAt(0)}</Text>
                </View>
                <View style={styles.appInfo}>
                  <Text style={styles.appName}>{app.name}</Text>
                  <Text style={styles.appMeta}>{app.rollNo} • {app.branch} • CGPA {app.cgpa}</Text>
                  <View style={[styles.appStatusChip, { backgroundColor: (app.status === 'Rejected' ? '#dc2626' : app.status === 'Shortlisted' ? '#059669' : '#2563eb') + '1A' }]}>
                    <Text style={[styles.appStatusText, { color: app.status === 'Rejected' ? '#dc2626' : app.status === 'Shortlisted' ? '#059669' : '#2563eb' }]}>
                      {app.status} • {app.round}
                    </Text>
                  </View>
                </View>
                {app.status === 'Applied' ? (
                  <View style={styles.appActions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleShortlist(app)} activeOpacity={0.7}>
                      <Ionicons name="checkmark" size={16} color="#059669" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleReject(app)} activeOpacity={0.7}>
                      <Ionicons name="close" size={16} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                ) : null}
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
  roleName: {
    fontSize: 13,
    color: '#64748b',
    fontFamily: 'Manrope-Medium',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
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
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
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
  notifyBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 20,
  },
  notifyBtnText: {
    fontSize: 14,
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
  stepCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 10,
  },
  stepLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepInfo: {
    flex: 1,
  },
  stepName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  stepMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  stepRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roundChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roundText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  pipelineNote: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 4,
  },
  applicantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 10,
  },
  appAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appInitial: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  appMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  appStatusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 5,
  },
  appStatusText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  appActions: {
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
});