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

import { DRIVE_STATS, DRIVES } from './constants/drivesData';
import DriveDetail from './pages/drive_detail/drive_detail';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const STATUS_COLORS = {
  'In Progress': '#2563eb',
  'Registration Open': '#059669',
  Scheduled: '#d97706',
  Completed: '#0284c7',
};

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Completed', value: 'completed' },
];

const MODES = ['On-campus', 'Virtual'];

export default function DrivesModule({ navigation }) {
  const [tab, setTab] = useState('list');
  const [selectedDrive, setSelectedDrive] = useState(null);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({
    company: '',
    role: '',
    package: '',
    date: '',
    mode: 'On-campus',
    eligibility: '',
  });

  if (selectedDrive) {
    return <DriveDetail drive={selectedDrive} onBack={() => setSelectedDrive(null)} />;
  }

  const filteredDrives = DRIVES.filter((d) => {
    if (filter === 'all') return true;
    if (filter === 'active') return d.status === 'In Progress' || d.status === 'Registration Open';
    if (filter === 'upcoming') return d.status === 'Scheduled';
    if (filter === 'completed') return d.status === 'Completed';
    return true;
  });

  const handleCreateDrive = () => {
    if (!form.company.trim() || !form.role.trim() || !form.date.trim()) {
      Alert.alert('Missing Fields', 'Please enter company, role, and drive date.');
      return;
    }
    Alert.alert(
      'Create Drive',
      `Schedule ${form.company} — ${form.role} (${form.mode})? Students will be notified once approved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: () => {
            setForm({ company: '', role: '', package: '', date: '', mode: 'On-campus', eligibility: '' });
            setTab('list');
            Alert.alert('Drive Created', `${form.company} drive scheduled. Pending admin approval.`);
          },
        },
      ]
    );
  };

  const handleNotifyStudents = (drive) => {
    Alert.alert(
      'Notify Students',
      `Send a reminder to ${drive.eligible} eligible students about the ${drive.company} drive?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', onPress: () => Alert.alert('Sent', `Reminder sent to ${drive.eligible} eligible students.`) },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Stats */}
      <View style={styles.statsRow}>
        {DRIVE_STATS.map((stat) => (
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
          { id: 'list', label: 'All Drives' },
          { id: 'create', label: 'New Drive' },
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
          {/* Filters */}
          <View style={styles.filterRow}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.value}
                style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
                onPress={() => setFilter(f.value)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {filteredDrives.map((drive) => (
            <TouchableOpacity
              key={drive.id}
              style={styles.driveCard}
              activeOpacity={0.8}
              onPress={() => setSelectedDrive(drive)}
            >
              <View style={[styles.companyIcon, { backgroundColor: drive.color + '14' }]}>
                <Text style={[styles.companyInitial, { color: drive.color }]}>{drive.company.charAt(0)}</Text>
              </View>
              <View style={styles.driveInfo}>
                <Text style={styles.companyName}>{drive.company}</Text>
                <Text style={styles.driveRole}>{drive.role} • {drive.package}</Text>
                <Text style={styles.driveMeta}>{drive.date} • {drive.mode}</Text>
                <View style={styles.driveChips}>
                  <View style={[styles.statusChip, { backgroundColor: (STATUS_COLORS[drive.status] || '#2563eb') + '1A' }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLORS[drive.status] || '#2563eb' }]}>{drive.status}</Text>
                  </View>
                  <Text style={styles.appliedText}>{drive.applications} applied</Text>
                </View>
              </View>
              <View style={styles.driveRight}>
                <TouchableOpacity
                  style={styles.notifyBtn}
                  onPress={() => handleNotifyStudents(drive)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="megaphone-outline" size={16} color="#2563eb" />
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
              </View>
            </TouchableOpacity>
          ))}
        </>
      ) : (
        <>
          <Text style={styles.formHint}>Schedule a new campus drive. The admin reviews and approves it before students are notified.</Text>

          <Text style={styles.fieldLabel}>Company</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={form.company}
              onChangeText={(v) => setForm((p) => ({ ...p, company: v }))}
              placeholder="e.g. TCS, Infosys, Amazon"
              placeholderTextColor="#cbd5e1"
            />
          </View>

          <Text style={styles.fieldLabel}>Role</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={form.role}
              onChangeText={(v) => setForm((p) => ({ ...p, role: v }))}
              placeholder="e.g. Software Engineer"
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

          <Text style={styles.fieldLabel}>Drive Date</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={form.date}
              onChangeText={(v) => setForm((p) => ({ ...p, date: v }))}
              placeholder="e.g. Dec 20, 2026"
              placeholderTextColor="#cbd5e1"
            />
          </View>

          <Text style={styles.fieldLabel}>Mode</Text>
          <View style={styles.modeRow}>
            {MODES.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.modeChip, form.mode === m && styles.modeChipActive]}
                onPress={() => setForm((p) => ({ ...p, mode: m }))}
                activeOpacity={0.8}
              >
                <Text style={[styles.modeText, form.mode === m && styles.modeTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Eligibility</Text>
          <View style={[styles.inputContainer, styles.textAreaContainer]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.eligibility}
              onChangeText={(v) => setForm((p) => ({ ...p, eligibility: v }))}
              placeholder="e.g. CSE/ECE, CGPA 7.5+, no active backlogs"
              placeholderTextColor="#cbd5e1"
              multiline
            />
          </View>

          <TouchableOpacity style={styles.createBtn} onPress={handleCreateDrive} activeOpacity={0.85}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.createBtnText}>Create Drive</Text>
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
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Manrope-Medium',
  },
  filterTextActive: {
    color: '#FFFFFF',
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
  driveInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  driveRole: {
    fontSize: 12,
    color: '#475569',
    fontFamily: 'Manrope-Medium',
    marginTop: 1,
  },
  driveMeta: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  driveChips: {
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
  appliedText: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
  },
  driveRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifyBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
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
  textAreaContainer: {
    paddingVertical: 8,
  },
  textArea: {
    height: 72,
    textAlignVertical: 'top',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  modeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modeChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  modeText: {
    fontSize: 13,
    color: '#475569',
    fontFamily: 'Manrope-Medium',
  },
  modeTextActive: {
    color: '#FFFFFF',
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