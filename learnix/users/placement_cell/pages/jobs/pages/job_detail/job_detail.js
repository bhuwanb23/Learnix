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

import { JOB_APPLICANTS } from '../../constants/jobsData';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../../constants/theme';

const STATUS_COLORS = {
  Shortlisted: '#059669',
  'Under Review': '#d97706',
  Rejected: '#dc2626',
};

export default function JobDetail({ job, onBack }) {
  const [applicants, setApplicants] = useState(JOB_APPLICANTS);

  const handleShortlist = (app) => {
    Alert.alert(
      'Shortlist Candidate',
      `Shortlist ${app.name} for ${job.title} at ${job.company}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Shortlist',
          onPress: () => {
            setApplicants((prev) =>
              prev.map((a) => (a.id === app.id ? { ...a, status: 'Shortlisted' } : a))
            );
            Alert.alert('Shortlisted', `${app.name} notified and moved to the next round.`);
          },
        },
      ]
    );
  };

  const handleReject = (app) => {
    Alert.alert(
      'Reject Candidate',
      `Reject ${app.name}'s application for ${job.title}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => {
            setApplicants((prev) =>
              prev.map((a) => (a.id === app.id ? { ...a, status: 'Rejected' } : a))
            );
            Alert.alert('Rejected', `${app.name} has been notified.`);
          },
        },
      ]
    );
  };

  const handleCloseJob = () => {
    Alert.alert(
      'Close Job Posting',
      `Close applications for ${job.title} at ${job.company}? No new applications will be accepted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Close', onPress: () => Alert.alert('Closed', 'Job posting closed. Applicants have been notified.') },
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
            <Text style={styles.headerTitle}>Job Detail</Text>
            <Text style={styles.headerSubtitle}>{job.company}</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={[styles.companyIcon, { backgroundColor: job.color + '14' }]}>
            <Text style={[styles.companyInitial, { color: job.color }]}>{job.company.charAt(0)}</Text>
          </View>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <Text style={styles.jobCompany}>{job.company}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Ionicons name="location-outline" size={12} color="#2563eb" />
              <Text style={[styles.badgeText, { color: '#2563eb' }]}>{job.location}</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="cash-outline" size={12} color="#059669" />
              <Text style={[styles.badgeText, { color: '#059669' }]}>{job.package}</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="time-outline" size={12} color="#d97706" />
              <Text style={[styles.badgeText, { color: '#d97706' }]}>Due {job.deadline}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{job.applications}</Text>
            <Text style={styles.statLabel}>Applications</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{applicants.filter((a) => a.status === 'Shortlisted').length}</Text>
            <Text style={styles.statLabel}>Shortlisted</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{job.type}</Text>
            <Text style={styles.statLabel}>Type</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.closeBtn} onPress={handleCloseJob} activeOpacity={0.85}>
          <Ionicons name="lock-closed-outline" size={16} color="#dc2626" />
          <Text style={styles.closeBtnText}>Close Job Posting</Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Applicants</Text>
        {applicants.map((app) => (
          <View key={app.id} style={styles.applicantCard}>
            <View style={[styles.appAvatar, { backgroundColor: (STATUS_COLORS[app.status] || '#2563eb') + '14' }]}>
              <Text style={[styles.appInitial, { color: STATUS_COLORS[app.status] || '#2563eb' }]}>{app.name.charAt(0)}</Text>
            </View>
            <View style={styles.appInfo}>
              <Text style={styles.appName}>{app.name}</Text>
              <Text style={styles.appMeta}>{app.rollNo} • CGPA {app.cgpa} • Applied {app.appliedAt}</Text>
              <View style={[styles.statusChip, { backgroundColor: STATUS_COLORS[app.status] + '1A' }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[app.status] }]}>{app.status}</Text>
              </View>
            </View>
            {app.status === 'Under Review' ? (
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
  jobTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  jobCompany: {
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
  closeBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 20,
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626',
    fontFamily: 'Manrope-Bold',
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 10,
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