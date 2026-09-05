import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { JOB_STATS, JOBS } from './constants/jobsData';
import JobDetail from './pages/job_detail/job_detail';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const STATUS_COLORS = {
  Open: '#059669',
  'Closing Soon': '#d97706',
  Closed: '#64748b',
};

export default function JobsModule({ navigation }) {
  const [tab, setTab] = useState('list');
  const [selectedJob, setSelectedJob] = useState(null);
  const [form, setForm] = useState({
    company: '',
    title: '',
    location: '',
    package: '',
    deadline: '',
  });

  if (selectedJob) {
    return <JobDetail job={selectedJob} onBack={() => setSelectedJob(null)} />;
  }

  const handleCreateJob = () => {
    if (!form.company.trim() || !form.title.trim()) {
      Alert.alert('Missing Fields', 'Please enter the company and job title.');
      return;
    }
    Alert.alert(
      'Post Job',
      `Post ${form.title} at ${form.company}? Students will see it in their job board.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Post',
          onPress: () => {
            setForm({ company: '', title: '', location: '', package: '', deadline: '' });
            setTab('list');
            Alert.alert('Job Posted', `${form.title} at ${form.company} is now live for students.`);
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Stats */}
      <View style={styles.statsRow}>
        {JOB_STATS.map((stat) => (
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
          { id: 'list', label: 'Openings' },
          { id: 'create', label: 'Post Job' },
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

      {tab === 'list' ? (
        <>
          {JOBS.map((job) => (
            <TouchableOpacity
              key={job.id}
              style={styles.jobCard}
              activeOpacity={0.8}
              onPress={() => setSelectedJob(job)}
            >
              <View style={[styles.companyIcon, { backgroundColor: job.color + '14' }]}>
                <Text style={[styles.companyInitial, { color: job.color }]}>{job.company.charAt(0)}</Text>
              </View>
              <View style={styles.jobInfo}>
                <Text style={styles.jobTitle}>{job.title}</Text>
                <Text style={styles.jobCompany}>{job.company} • {job.location}</Text>
                <View style={styles.jobChips}>
                  <View style={[styles.statusChip, { backgroundColor: STATUS_COLORS[job.status] + '1A' }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLORS[job.status] }]}>{job.status}</Text>
                  </View>
                  <Text style={styles.jobMeta}>{job.type} • {job.package} • {job.applications} applied</Text>
                </View>
              </View>
              <View style={styles.jobRight}>
                <Text style={styles.deadlineText}>Due {job.deadline}</Text>
                <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
              </View>
            </TouchableOpacity>
          ))}
        </>
      ) : (
        <>
          <Text style={styles.formHint}>Post a job opening. It appears instantly on the student job board.</Text>

          <Text style={styles.fieldLabel}>Company</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={form.company}
              onChangeText={(v) => setForm((p) => ({ ...p, company: v }))}
              placeholder="e.g. TCS"
              placeholderTextColor="#cbd5e1"
            />
          </View>

          <Text style={styles.fieldLabel}>Job Title</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={form.title}
              onChangeText={(v) => setForm((p) => ({ ...p, title: v }))}
              placeholder="e.g. Software Engineer"
              placeholderTextColor="#cbd5e1"
            />
          </View>

          <Text style={styles.fieldLabel}>Location</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={form.location}
              onChangeText={(v) => setForm((p) => ({ ...p, location: v }))}
              placeholder="e.g. Bengaluru / Remote"
              placeholderTextColor="#cbd5e1"
            />
          </View>

          <Text style={styles.fieldLabel}>Package</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={form.package}
              onChangeText={(v) => setForm((p) => ({ ...p, package: v }))}
              placeholder="e.g. ₹7.5 LPA"
              placeholderTextColor="#cbd5e1"
            />
          </View>

          <Text style={styles.fieldLabel}>Application Deadline</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={form.deadline}
              onChangeText={(v) => setForm((p) => ({ ...p, deadline: v }))}
              placeholder="e.g. Dec 25, 2026"
              placeholderTextColor="#cbd5e1"
            />
          </View>

          <TouchableOpacity style={styles.createBtn} onPress={handleCreateJob} activeOpacity={0.85}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.createBtnText}>Post Job</Text>
          </TouchableOpacity>
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
  jobCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 10,
  },
  companyIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  companyInitial: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  jobCompany: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  jobChips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  jobMeta: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    flexShrink: 1,
  },
  jobRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  deadlineText: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
  },
  formHint: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    lineHeight: 18,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    fontFamily: 'Manrope-Bold',
    marginBottom: 6,
    marginTop: 4,
  },
  inputContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  input: {
    height: 44,
    fontSize: 14,
    color: '#0f172a',
    fontFamily: 'Manrope-Regular',
  },
  createBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  createBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Manrope-Bold',
  },
});