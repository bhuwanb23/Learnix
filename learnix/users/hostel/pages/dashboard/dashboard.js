import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../constants/theme';

const stats = [
  { label: 'Occupancy', value: '1,248/1,320', sub: '94%', color: '#2563eb', icon: 'bed-outline' },
  { label: 'Pending Passes', value: '14', sub: '5 urgent', color: '#d97706', icon: 'exit-outline' },
  { label: 'Complaints', value: '23', sub: '8 open', color: '#dc2626', icon: 'construct-outline' },
  { label: 'Mess Rating', value: '4.1★', sub: 'this week', color: '#059669', icon: 'restaurant-outline' },
];

const todayPasses = [
  { id: '1', name: 'Arjun Mehta', room: 'B-204', time: '5:00 PM', reason: 'Weekend home visit', status: 'Approved' },
  { id: '2', name: 'Sneha Reddy', room: 'A-118', time: '6:30 PM', reason: 'Medical appointment', status: 'Pending' },
  { id: '3', name: 'Karan Singh', room: 'C-312', time: '7:00 PM', reason: 'Sibling visit', status: 'Pending' },
];

const complaints = [
  { id: '1', title: 'Water leakage in B-210 bathroom', room: 'B-210', type: 'Plumbing', age: '2 days', severity: 'High' },
  { id: '2', title: 'Wi-Fi down on Floor 3', room: 'C-Floor 3', type: 'Network', age: '1 day', severity: 'Medium' },
  { id: '3', title: 'Broken window grill', room: 'A-105', type: 'Maintenance', age: '3 days', severity: 'Low' },
];

const modules = [
  { id: 'GatePasses', title: 'Gate Passes', icon: 'exit-outline', color: '#2563eb' },
  { id: 'Complaints', title: 'Complaints', icon: 'construct-outline', color: '#dc2626' },
  { id: 'Visitors', title: 'Visitors', icon: 'people-outline', color: '#0891b2' },
  { id: 'Notifications', title: 'Notify', icon: 'megaphone-outline', color: '#d97706' },
];

const activity = [
  { text: 'Gate pass approved for Priya Sharma (A-102)', time: '10 min ago', icon: 'checkmark-circle-outline', color: '#059669' },
  { text: 'Complaint #214 resolved — AC repair in B-308', time: '1 hr ago', icon: 'hammer-outline', color: '#2563eb' },
  { text: 'Room C-115 allotted to new resident Vikram Nair', time: '3 hrs ago', icon: 'bed-outline', color: '#0891b2' },
  { text: 'Mess feedback: dinner rating 4.3 — best this week', time: '5 hrs ago', icon: 'restaurant-outline', color: '#d97706' },
];

export default function HostelDashboard({ navigation }) {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
        <Text style={styles.heroLabel}>RESIDENTIAL YEAR 2026-27</Text>
        <Text style={styles.heroTitle}>Hostel Overview</Text>
        <View style={styles.heroProgress}>
          <View style={[styles.heroProgressFill, { width: '94%' }]} />
        </View>
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.heroValue}>94%</Text>
            <Text style={styles.heroSub}>Beds occupied across 3 blocks</Text>
          </View>
          <View style={styles.heroBadge}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#fff" />
            <Text style={styles.heroBadgeText}>All clear</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.statsGrid}>
        {stats.map((s) => (
          <View key={s.label} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: s.color + '1a' }]}>
              <Ionicons name={s.icon} size={16} color={s.color} />
            </View>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
            <Text style={[styles.statSub, { color: s.color }]}>{s.sub}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Gate Passes</Text>
          <TouchableOpacity onPress={() => navigation.openModule('GatePasses')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        {todayPasses.map((p) => (
          <View key={p.id} style={styles.listCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{p.name.charAt(0)}</Text>
            </View>
            <View style={styles.listBody}>
              <Text style={styles.listTitle}>{p.name} · {p.room}</Text>
              <Text style={styles.listSub}>{p.reason} · {p.time}</Text>
            </View>
            <View
              style={[
                styles.statusChip,
                { backgroundColor: p.status === 'Approved' ? '#dcfce7' : '#fef3c7' },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: p.status === 'Approved' ? '#059669' : '#d97706' },
                ]}
              >
                {p.status}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Open Complaints</Text>
          <TouchableOpacity onPress={() => navigation.openModule('Complaints')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        {complaints.map((c) => (
          <View key={c.id} style={styles.listCard}>
            <View style={[styles.complaintIcon, { backgroundColor: '#fee2e2' }]}>
              <Ionicons name="construct-outline" size={16} color="#dc2626" />
            </View>
            <View style={styles.listBody}>
              <Text style={styles.listTitle} numberOfLines={1}>{c.title}</Text>
              <Text style={styles.listSub}>{c.room} · {c.type} · {c.age} ago</Text>
            </View>
            <View
              style={[
                styles.statusChip,
                { backgroundColor: c.severity === 'High' ? '#fee2e2' : '#fef3c7' },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: c.severity === 'High' ? '#dc2626' : '#d97706' },
                ]}
              >
                {c.severity}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Tools</Text>
        <View style={styles.moduleGrid}>
          {modules.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={styles.moduleCard}
              onPress={() => navigation.openModule(m.id)}
            >
              <View style={[styles.moduleIcon, { backgroundColor: m.color + '1a' }]}>
                <Ionicons name={m.icon} size={20} color={m.color} />
              </View>
              <Text style={styles.moduleTitle}>{m.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {activity.map((a, idx) => (
          <View key={idx} style={styles.activityRow}>
            <View style={[styles.activityIcon, { backgroundColor: a.color + '1a' }]}>
              <Ionicons name={a.icon} size={14} color={a.color} />
            </View>
            <View style={styles.activityBody}>
              <Text style={styles.activityText}>{a.text}</Text>
              <Text style={styles.activityTime}>{a.time}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 0 },
  hero: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 18,
  },
  heroLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
    marginTop: 4,
  },
  heroProgress: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: 14,
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 14,
  },
  heroValue: {
    fontSize: 26,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
  },
  heroSub: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255,255,255,0.8)',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroBadgeText: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: '#fff',
    marginLeft: 5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 14,
  },
  statCard: {
    width: '48.5%',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 10,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 17,
    fontFamily: 'Manrope-ExtraBold',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  statSub: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    marginTop: 4,
  },
  section: { paddingHorizontal: 16, marginTop: 18 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginBottom: 10,
  },
  seeAll: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.primary,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: '#2563eb',
  },
  complaintIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listBody: { flex: 1, marginRight: 8 },
  listTitle: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  listSub: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  statusChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
  },
  moduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moduleCard: {
    width: '48.5%',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 10,
  },
  moduleIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  moduleTitle: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  activityIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  activityBody: { flex: 1 },
  activityText: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.text,
  },
  activityTime: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 1,
  },
});