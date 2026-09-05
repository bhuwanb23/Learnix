import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../constants/theme';

const stats = [
  { label: 'Upcoming Events', value: '6', sub: '2 this week', color: '#2563eb', icon: 'calendar-outline' },
  { label: 'Active Teams', value: '12', sub: '6 sports', color: '#059669', icon: 'people-outline' },
  { label: 'Registrations', value: '1,284', sub: '23 pending', color: '#d97706', icon: 'person-add-outline' },
  { label: 'Equipment Out', value: '47', sub: '9 overdue', color: '#dc2626', icon: 'basketball-outline' },
];

const todayEvents = [
  { id: '1', name: 'Cricket Team Practice', time: '4:00 PM', venue: 'Main Ground', type: 'Sports' },
  { id: '2', name: 'Dance Crew Rehearsal', time: '5:30 PM', venue: 'Open Air Theatre', type: 'Cultural' },
  { id: '3', name: 'Football Friendly vs NIT', time: '6:30 PM', venue: 'Football Field', type: 'Sports' },
];

const pendingApprovals = [
  { id: '1', name: 'Cultural Night 2026', student: 'Sneha Patel', reg: 'CSE-23-014', event: 'Cultural Night 2026', time: '1 hr ago' },
  { id: '2', name: 'Hackathon: CodeSprint', student: 'Rahul Verma', reg: 'IT-22-031', event: 'Hackathon: CodeSprint', time: '3 hrs ago' },
  { id: '3', name: 'Annual Sports Meet', student: 'Aarav Mehta', reg: 'CSE-22-045', event: 'Annual Sports Meet', time: '5 hrs ago' },
];

const modules = [
  { id: 'Tournaments', title: 'Tournaments', icon: 'trophy-outline', color: '#d97706' },
  { id: 'Venues', title: 'Venues', icon: 'location-outline', color: '#0891b2' },
  { id: 'Notifications', title: 'Notify', icon: 'megaphone-outline', color: '#2563eb' },
];

const activity = [
  { text: 'Registration approved — Aarav Mehta for Annual Sports Meet', time: '20 min ago', icon: 'checkmark-circle-outline', color: '#059669' },
  { text: 'Venue booked: Main Auditorium for Tech Fest Nov 21', time: '2 hrs ago', icon: 'location-outline', color: '#2563eb' },
  { text: 'Football team announced — 18 players, captain Vikram Nair', time: '4 hrs ago', icon: 'people-outline', color: '#0891b2' },
  { text: 'Cricket kit issued to Karan Singh (return Nov 20)', time: '6 hrs ago', icon: 'basketball-outline', color: '#d97706' },
];

export default function SportsDashboard({ navigation }) {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
        <Text style={styles.heroLabel}>SPORTS & CULTURAL SEASON 2026-27</Text>
        <Text style={styles.heroTitle}>Events Overview</Text>
        <View style={styles.heroProgress}>
          <View style={[styles.heroProgressFill, { width: '68%' }]} />
        </View>
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.heroValue}>68%</Text>
            <Text style={styles.heroSub}>of the season calendar filled</Text>
          </View>
          <View style={styles.heroBadge}>
            <Ionicons name="trophy-outline" size={14} color="#fff" />
            <Text style={styles.heroBadgeText}>3 fests planned</Text>
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
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          <TouchableOpacity onPress={() => navigation.switchTab('Events')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        {todayEvents.map((e) => (
          <View key={e.id} style={styles.listCard}>
            <View
              style={[
                styles.eventIcon,
                { backgroundColor: e.type === 'Sports' ? '#dcfce7' : '#fef3c7' },
              ]}
            >
              <Ionicons
                name={e.type === 'Sports' ? 'football-outline' : 'musical-notes-outline'}
                size={16}
                color={e.type === 'Sports' ? '#059669' : '#d97706'}
              />
            </View>
            <View style={styles.listBody}>
              <Text style={styles.listTitle}>{e.name}</Text>
              <Text style={styles.listSub}>{e.venue}</Text>
            </View>
            <Text style={styles.listTime}>{e.time}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pending Approvals</Text>
          <TouchableOpacity onPress={() => navigation.switchTab('Events')}>
            <Text style={styles.seeAll}>Review</Text>
          </TouchableOpacity>
        </View>
        {pendingApprovals.map((p) => (
          <View key={p.id} style={styles.listCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{p.student.charAt(0)}</Text>
            </View>
            <View style={styles.listBody}>
              <Text style={styles.listTitle}>{p.student}</Text>
              <Text style={styles.listSub}>
                {p.event} · {p.reg}
              </Text>
            </View>
            <View style={styles.pendingChip}>
              <Text style={styles.pendingText}>Pending</Text>
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
  eventIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
  listTime: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  pendingChip: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pendingText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    color: '#d97706',
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