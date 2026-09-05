import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import EventDetail from './pages/event_detail/event_detail';

const stats = [
  { label: 'Upcoming', value: '4', icon: 'calendar-outline', color: '#2563eb' },
  { label: 'Total RSVPs', value: '326', icon: 'people-outline', color: '#059669' },
  { label: 'Completed', value: '12', icon: 'checkmark-done-outline', color: '#0891b2' },
];

const events = [
  {
    id: 'E1',
    name: 'Alumni Networking Meet',
    date: 'Dec 18, 2026',
    time: '5:00 PM - 8:00 PM',
    venue: 'Seminar Hall B',
    rsvps: 85,
    capacity: 150,
    status: 'Upcoming',
    color: '#0891b2',
    desc: 'Annual networking evening with industry leaders, startup founders and senior alumni. Speed-networking rounds followed by dinner.',
  },
  {
    id: 'E2',
    name: 'Bengaluru Chapter Meet',
    date: 'Dec 6, 2026',
    time: '11:00 AM - 2:00 PM',
    venue: 'JW Marriott, Bengaluru',
    rsvps: 42,
    capacity: 60,
    status: 'Upcoming',
    color: '#2563eb',
    desc: 'Quarterly meet of the Bengaluru chapter — guest talk by a Learnix alumna now at Microsoft, followed by lunch.',
  },
  {
    id: 'E3',
    name: 'GenAI in Industry — Webinar',
    date: 'Jan 9, 2027',
    time: '6:30 PM - 8:00 PM',
    venue: 'Online (Zoom)',
    rsvps: 120,
    capacity: 200,
    status: 'Upcoming',
    color: '#059669',
    desc: 'Panel discussion with alumni working on LLMs at top AI companies. Open to students and alumni.',
  },
  {
    id: 'E4',
    name: 'Mumbai Chapter Tech Talk',
    date: 'Jan 16, 2027',
    time: '4:00 PM - 6:00 PM',
    venue: 'WeWork BKC, Mumbai',
    rsvps: 24,
    capacity: 40,
    status: 'Upcoming',
    color: '#d97706',
    desc: 'Hands-on session on system design interviews led by senior alumni.',
  },
  {
    id: 'E5',
    name: 'Golden Jubilee Reunion',
    date: 'Aug 15, 2026',
    time: '10:00 AM - 5:00 PM',
    venue: 'Main Campus',
    rsvps: 210,
    capacity: 210,
    status: 'Completed',
    color: '#dc2626',
    desc: '50th anniversary reunion — 210 alumni from 1980-2020 batches attended campus tours and the grand dinner.',
  },
];

const tabs = ['Upcoming', 'Completed'];

export default function EventsModule({ navigation }) {
  const [activeTab, setActiveTab] = useState('Upcoming');
  const [selected, setSelected] = useState(null);

  const filtered = events.filter((e) => e.status === activeTab);

  if (selected) {
    return (
      <EventDetail
        event={selected}
        navigation={{
          goBack: () => setSelected(null),
          openModule: (key) => navigation.openModule(key),
        }}
      />
    );
  }

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
          </TouchableOpacity>
        ))}
      </View>

      {filtered.map((e) => {
        const pct = Math.round((e.rsvps / e.capacity) * 100);
        return (
          <TouchableOpacity
            key={e.id}
            style={styles.card}
            onPress={() => setSelected(e)}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.dateBadge, { backgroundColor: e.color + '1a' }]}>
                <Text style={[styles.dateBadgeText, { color: e.color }]}>{e.date}</Text>
              </View>
              <View style={styles.cardHeaderBody}>
                <Text style={styles.cardTitle}>{e.name}</Text>
                <Text style={styles.cardMeta}>
                  {e.time} · {e.venue}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </View>
            <View style={styles.progressRow}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: e.color }]} />
              </View>
              <Text style={[styles.rsvpText, { color: e.color }]}>{pct}%</Text>
            </View>
            <Text style={styles.rsvpCount}>
              {e.rsvps} of {e.capacity} RSVPs
            </Text>
          </TouchableOpacity>
        );
      })}
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 12,
  },
  dateBadgeText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
  },
  cardHeaderBody: { flex: 1 },
  cardTitle: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  cardMeta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 3,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
  },
  progressFill: {
    height: 5,
    borderRadius: 3,
  },
  rsvpText: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    marginLeft: 10,
  },
  rsvpCount: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 5,
  },
});