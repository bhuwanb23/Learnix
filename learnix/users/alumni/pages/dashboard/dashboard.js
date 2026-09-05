import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../constants/theme';

const stats = [
  { label: 'Registered', value: '12,450', sub: 'across 14 chapters', color: '#2563eb', icon: 'people-outline' },
  { label: 'Events', value: '8', sub: '3 this month', color: '#059669', icon: 'calendar-outline' },
  { label: 'Donations', value: '₹24.5L', sub: 'FY 2026', color: '#d97706', icon: 'gift-outline' },
  { label: 'Mentors', value: '52', sub: '36 active pairs', color: '#0891b2', icon: 'hand-left-outline' },
];

const upcomingEvents = [
  { id: '1', name: 'Alumni Networking Meet', date: 'Dec 18, 2026', venue: 'Seminar Hall B', rsvps: 85, capacity: 150, color: '#0891b2' },
  { id: '2', name: 'Bengaluru Chapter Meet', date: 'Dec 6, 2026', venue: 'JW Marriott, Bengaluru', rsvps: 42, capacity: 60, color: '#2563eb' },
  { id: '3', name: 'GenAI in Industry — Webinar', date: 'Jan 9, 2027', venue: 'Online (Zoom)', rsvps: 120, capacity: 200, color: '#059669' },
];

const alerts = [
  { id: '1', title: '3 mentorship requests pending', detail: 'Batch 2024 alumni waiting for mentor assignment', severity: 'High' },
  { id: '2', title: 'Networking Meet at 57% RSVP', detail: '85 of 150 confirmed — send reminders to batch 2020-23', severity: 'Medium' },
];

const modules = [
  { id: 'Mentorship', title: 'Mentorship', icon: 'hand-left-outline', color: '#2563eb' },
  { id: 'Chapters', title: 'Chapters', icon: 'location-outline', color: '#059669' },
  { id: 'Notifications', title: 'Notify', icon: 'megaphone-outline', color: '#d97706' },
];

const activity = [
  { text: 'Donation received — ₹50,000 from Rohit Malhotra (2021)', time: '2 hrs ago', icon: 'gift-outline', color: '#059669' },
  { text: 'Mentorship request approved — Aarav Mehta ↔ Rajesh Iyer', time: '4 hrs ago', icon: 'hand-left-outline', color: '#2563eb' },
  { text: 'New chapter event — Mumbai Chapter Tech Talk scheduled', time: '6 hrs ago', icon: 'location-outline', color: '#0891b2' },
  { text: 'Newsletter sent to 12,450 alumni', time: 'Yesterday', icon: 'mail-outline', color: '#d97706' },
];

export default function AlumniDashboard({ navigation }) {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
        <Text style={styles.heroLabel}>ALUMNI RELATIONS OFFICE</Text>
        <Text style={styles.heroTitle}>Engagement Overview</Text>
        <View style={styles.heroProgress}>
          <View style={[styles.heroProgressFill, { width: '68%' }]} />
        </View>
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.heroValue}>68%</Text>
            <Text style={styles.heroSub}>FY engagement · 12,450 alumni</Text>
          </View>
          <View style={styles.heroBadge}>
            <Ionicons name="ribbon-outline" size={14} color="#fff" />
            <Text style={styles.heroBadgeText}>NAAC Ready</Text>
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
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          <TouchableOpacity onPress={() => navigation.switchTab('Events')}>
            <Text style={styles.seeAll}>View all</Text>
          </TouchableOpacity>
        </View>
        {upcomingEvents.map((e) => {
          const pct = Math.round((e.rsvps / e.capacity) * 100);
          return (
            <View key={e.id} style={styles.listCard}>
              <View style={[styles.typeIcon, { backgroundColor: e.color + '1a' }]}>
                <Ionicons name="calendar-outline" size={16} color={e.color} />
              </View>
              <View style={styles.listBody}>
                <Text style={styles.listTitle}>{e.name}</Text>
                <Text style={styles.listSub}>
                  {e.date} · {e.venue}
                </Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: e.color }]} />
                </View>
                <Text style={[styles.rsvpText, { color: e.color }]}>
                  {e.rsvps}/{e.capacity} RSVPs
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Office Alerts</Text>
        {alerts.map((a) => (
          <View key={a.id} style={styles.alertCard}>
            <View
              style={[
                styles.alertIcon,
                { backgroundColor: a.severity === 'High' ? '#fee2e2' : '#fef3c7' },
              ]}
            >
              <Ionicons
                name={a.severity === 'High' ? 'warning-outline' : 'alert-circle-outline'}
                size={16}
                color={a.severity === 'High' ? '#dc2626' : '#d97706'}
              />
            </View>
            <View style={styles.listBody}>
              <Text style={styles.listTitle}>{a.title}</Text>
              <Text style={styles.listSub}>{a.detail}</Text>
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
  typeIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  alertIcon: {
    width: 38,
    height: 38,
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
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.surfaceMuted,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  rsvpText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    marginTop: 4,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 8,
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