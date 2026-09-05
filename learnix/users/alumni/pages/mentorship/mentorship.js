import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';

const stats = [
  { label: 'Active Pairs', value: '36', icon: 'hand-left-outline', color: '#2563eb' },
  { label: 'Mentors', value: '52', icon: 'people-outline', color: '#059669' },
  { label: 'Sessions (Nov)', value: '148', icon: 'videocam-outline', color: '#d97706' },
];

const initialPairs = [
  { id: 'P1', mentor: 'Sneha Iyer', mentorRole: 'Product Manager, Microsoft', mentee: 'Aarav Mehta', field: 'Product Management', sessions: 4, next: 'Dec 4, 5:00 PM', color: '#2563eb' },
  { id: 'P2', mentor: 'Rohit Malhotra', mentorRole: 'Software Engineer, Google', mentee: 'Priya Reddy', field: 'Software Engineering', sessions: 6, next: 'Dec 6, 6:30 PM', color: '#059669' },
  { id: 'P3', mentor: 'Ananya Joshi', mentorRole: 'Consultant, Deloitte', mentee: 'Rahul Verma', field: 'Consulting & Analytics', sessions: 2, next: 'Dec 9, 4:00 PM', color: '#0891b2' },
  { id: 'P4', mentor: 'Arjun Nair', mentorRole: 'Founder, Nova Labs', mentee: 'Kavya Rao', field: 'Entrepreneurship', sessions: 8, next: 'Dec 11, 11:00 AM', color: '#d97706' },
];

const initialRequests = [
  { id: 'R1', mentor: 'Vikram Singh', mentorRole: 'SDE-II, Flipkart', mentee: 'Ishaan Gupta', batch: '2025', field: 'Software Engineering', status: 'Pending', color: '#7c3aed' },
  { id: 'R2', mentor: 'Divya Sharma', mentorRole: 'M.Tech Scholar, IIT Madras', mentee: 'Tanvi Kulkarni', batch: '2025', field: 'Higher Education', status: 'Pending', color: '#0d9488' },
  { id: 'R3', mentor: 'Karthik Menon', mentorRole: 'Sr. Solutions Architect, Amazon', mentee: 'Aditya Jain', batch: '2024', field: 'Cloud Architecture', status: 'Pending', color: '#dc2626' },
];

const sessions = [
  { id: 'S1', mentor: 'Rohit Malhotra', mentee: 'Priya Reddy', topic: 'DSA & Interview Prep', date: 'Nov 29', done: true },
  { id: 'S2', mentor: 'Sneha Iyer', mentee: 'Aarav Mehta', topic: 'Resume Review', date: 'Nov 27', done: true },
  { id: 'S3', mentor: 'Ananya Joshi', mentee: 'Rahul Verma', topic: 'Case Interview Practice', date: 'Nov 25', done: true },
];

const tabs = ['Active Pairs', 'Requests'];

export default function MentorshipModule({ navigation }) {
  const [activeTab, setActiveTab] = useState('Active Pairs');
  const [pairs, setPairs] = useState(initialPairs);
  const [requests, setRequests] = useState(initialRequests);

  const approveRequest = (id) => {
    const req = requests.find((r) => r.id === id);
    setRequests((prev) => prev.filter((r) => r.id !== id));
    setPairs((prev) => [
      {
        id: `P${prev.length + 1}`,
        mentor: req.mentor,
        mentorRole: req.mentorRole,
        mentee: req.mentee,
        field: req.field,
        sessions: 0,
        next: 'Schedule first session',
        color: req.color,
      },
      ...prev,
    ]);
    Alert.alert('Pair Approved', `${req.mentor} ↔ ${req.mentee} added to the program.`);
  };

  const rejectRequest = (id) => {
    const req = requests.find((r) => r.id === id);
    setRequests((prev) => prev.filter((r) => r.id !== id));
    Alert.alert('Request Declined', `${req.mentor} ↔ ${req.mentee} pairing declined.`);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.statsRow}>
        {stats.map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Ionicons name={s.icon} size={14} color={s.color} />
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.tabsWrap}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === t && styles.tabActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t}</Text>
            {t === 'Requests' && requests.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{requests.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'Active Pairs' && (
        <>
          {pairs.map((p) => (
            <View key={p.id} style={styles.pairCard}>
              <View style={styles.pairRow}>
                <View style={[styles.mentorAvatar, { backgroundColor: p.color + '1a' }]}>
                  <Text style={[styles.initials, { color: p.color }]}>
                    {p.mentor.split(' ').map((n) => n[0]).join('')}
                  </Text>
                </View>
                <View style={styles.pairBody}>
                  <Text style={styles.pairTitle}>
                    {p.mentor} <Ionicons name="arrow-forward" size={11} color={theme.colors.textMuted} /> {p.mentee}
                  </Text>
                  <Text style={styles.pairMeta}>{p.field}</Text>
                </View>
              </View>
              <View style={styles.pairFooter}>
                <View style={styles.sessionChip}>
                  <Ionicons name="videocam-outline" size={11} color={p.color} />
                  <Text style={[styles.sessionText, { color: p.color }]}>{p.sessions} sessions</Text>
                </View>
                <Text style={styles.nextSession}>Next: {p.next}</Text>
              </View>
              <TouchableOpacity
                style={styles.remindBtn}
                onPress={() => Alert.alert('Reminder Sent', `Session reminder sent to ${p.mentor} and ${p.mentee}.`)}
              >
                <Ionicons name="notifications-outline" size={13} color="#2563eb" />
                <Text style={styles.remindText}>Send Reminder</Text>
              </TouchableOpacity>
            </View>
          ))}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Sessions</Text>
            {sessions.map((s) => (
              <View key={s.id} style={styles.sessionRow}>
                <View style={styles.sessionIcon}>
                  <Ionicons name="checkmark-circle" size={16} color="#059669" />
                </View>
                <View style={styles.sessionBody}>
                  <Text style={styles.sessionTopic}>{s.topic}</Text>
                  <Text style={styles.sessionMeta}>
                    {s.mentor} ↔ {s.mentee} · {s.date}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {activeTab === 'Requests' && (
        <>
          {requests.length === 0 && (
            <View style={styles.emptyCard}>
              <Ionicons name="checkmark-done-outline" size={28} color="#059669" />
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySub}>No pending mentorship requests.</Text>
            </View>
          )}
          {requests.map((r) => (
            <View key={r.id} style={styles.requestCard}>
              <View style={[styles.mentorAvatar, { backgroundColor: r.color + '1a' }]}>
                <Text style={[styles.initials, { color: r.color }]}>
                  {r.mentor.split(' ').map((n) => n[0]).join('')}
                </Text>
              </View>
              <View style={styles.pairBody}>
                <Text style={styles.pairTitle}>
                  {r.mentor} <Ionicons name="arrow-forward" size={11} color={theme.colors.textMuted} /> {r.mentee}
                </Text>
                <Text style={styles.pairMeta}>
                  {r.field} · {r.mentee} (Batch {r.batch})
                </Text>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => approveRequest(r.id)}
                  >
                    <Ionicons name="checkmark" size={13} color="#fff" />
                    <Text style={styles.approveText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => rejectRequest(r.id)}
                  >
                    <Ionicons name="close" size={13} color="#dc2626" />
                    <Text style={styles.rejectText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 15,
    fontFamily: 'Manrope-ExtraBold',
    color: theme.colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  tabsWrap: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  tabTextActive: {
    color: '#fff',
  },
  tabBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 9999,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 5,
  },
  tabBadgeText: {
    fontSize: 9,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
  },
  pairCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 10,
  },
  pairRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mentorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  initials: {
    fontSize: 12,
    fontFamily: 'Manrope-ExtraBold',
  },
  pairBody: { flex: 1 },
  pairTitle: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  pairMeta: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  pairFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  sessionChip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    marginLeft: 4,
  },
  nextSession: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
  },
  remindBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 9,
    paddingVertical: 7,
    marginTop: 10,
  },
  remindText: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: '#2563eb',
    marginLeft: 5,
  },
  section: { paddingHorizontal: 16, marginTop: 18 },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginBottom: 10,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    marginBottom: 8,
  },
  sessionIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sessionBody: { flex: 1 },
  sessionTopic: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  sessionMeta: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginTop: 8,
  },
  emptySub: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 3,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 10,
  },
  requestActions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
  },
  approveText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    marginLeft: 4,
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rejectText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    color: '#dc2626',
    marginLeft: 4,
  },
});