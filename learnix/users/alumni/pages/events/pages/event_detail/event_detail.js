import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../../../constants/theme';

const schedule = [
  { id: '1', time: '5:00 PM', title: 'Registration & Welcome', detail: 'Networking over tea', done: true },
  { id: '2', time: '5:30 PM', title: 'Speed Networking Rounds', detail: '6 rounds · 5 min each', done: false },
  { id: '3', time: '6:30 PM', title: 'Panel — Careers in AI', detail: '4 senior alumni on stage', done: false },
  { id: '4', time: '7:30 PM', title: 'Dinner & Open Networking', detail: 'Buffet · Seminar Hall lawn', done: false },
];

const initialRsvps = [
  { id: 'R1', name: 'Rohit Malhotra', batch: '2021', company: 'Google', status: 'Confirmed', color: '#2563eb' },
  { id: 'R2', name: 'Sneha Iyer', batch: '2020', company: 'Microsoft', status: 'Confirmed', color: '#059669' },
  { id: 'R3', name: 'Arjun Nair', batch: '2019', company: 'Nova Labs', status: 'Pending', color: '#d97706' },
  { id: 'R4', name: 'Divya Sharma', batch: '2021', company: 'IIT Madras', status: 'Pending', color: '#0891b2' },
  { id: 'R5', name: 'Karthik Menon', batch: '2018', company: 'Amazon', status: 'Declined', color: '#dc2626' },
];

export default function EventDetail({ event, navigation }) {
  const [rsvps, setRsvps] = useState(initialRsvps);

  const updateStatus = (id, status) => {
    setRsvps((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );
  };

  const confirmed = rsvps.filter((r) => r.status === 'Confirmed').length;
  const pending = rsvps.filter((r) => r.status === 'Pending').length;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroBadge}>
            <Ionicons name="calendar-outline" size={12} color="#fff" />
            <Text style={styles.heroBadgeText}>{event.date}</Text>
          </View>
          <View style={styles.heroBadge}>
            <Ionicons name="time-outline" size={12} color="#fff" />
            <Text style={styles.heroBadgeText}>{event.time}</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>{event.name}</Text>
        <Text style={styles.heroVenue}>
          <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.85)" /> {event.venue}
        </Text>
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{event.rsvps}</Text>
            <Text style={styles.heroStatLabel}>RSVPs</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{event.capacity}</Text>
            <Text style={styles.heroStatLabel}>Capacity</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{Math.round((event.rsvps / event.capacity) * 100)}%</Text>
            <Text style={styles.heroStatLabel}>Filled</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => Alert.alert('Announcement', 'Event announcement broadcast to all alumni.')}
        >
          <Ionicons name="megaphone-outline" size={16} color="#2563eb" />
          <Text style={styles.actionText}>Announce</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => Alert.alert('Reminder', 'RSVP reminder sent to unconfirmed alumni.')}
        >
          <Ionicons name="notifications-outline" size={16} color="#2563eb" />
          <Text style={styles.actionText}>Remind</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.desc}>{event.desc}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Schedule</Text>
        {schedule.map((s, idx) => (
          <View key={s.id} style={styles.scheduleRow}>
            <View style={styles.timelineCol}>
              <View style={[styles.timelineDot, s.done && styles.timelineDotDone]}>
                {s.done && <Ionicons name="checkmark" size={10} color="#fff" />}
              </View>
              {idx < schedule.length - 1 && <View style={styles.timelineLine} />}
            </View>
            <View style={styles.scheduleBody}>
              <Text style={styles.scheduleTime}>{s.time}</Text>
              <Text style={styles.scheduleTitle}>{s.title}</Text>
              <Text style={styles.scheduleDetail}>{s.detail}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>RSVP List</Text>
          <Text style={styles.rsvpSummary}>
            {confirmed} confirmed · {pending} pending
          </Text>
        </View>
        {rsvps.map((r) => (
          <View key={r.id} style={styles.rsvpCard}>
            <View style={[styles.avatar, { backgroundColor: r.color + '1a' }]}>
              <Text style={[styles.avatarText, { color: r.color }]}>
                {r.name.split(' ').map((n) => n[0]).join('')}
              </Text>
            </View>
            <View style={styles.rsvpBody}>
              <Text style={styles.rsvpName}>{r.name}</Text>
              <Text style={styles.rsvpMeta}>
                Batch {r.batch} · {r.company}
              </Text>
            </View>
            {r.status === 'Confirmed' && (
              <View style={styles.confirmedChip}>
                <Text style={styles.confirmedText}>Confirmed</Text>
              </View>
            )}
            {r.status === 'Pending' && (
              <View style={styles.pendingActions}>
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={() => updateStatus(r.id, 'Confirmed')}
                >
                  <Ionicons name="checkmark" size={13} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.declineBtn}
                  onPress={() => updateStatus(r.id, 'Declined')}
                >
                  <Ionicons name="close" size={13} color="#dc2626" />
                </TouchableOpacity>
              </View>
            )}
            {r.status === 'Declined' && (
              <View style={styles.declinedChip}>
                <Text style={styles.declinedText}>Declined</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  hero: {
    margin: 16,
    borderRadius: 20,
    padding: 18,
  },
  heroTop: {
    flexDirection: 'row',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
  },
  heroBadgeText: {
    fontSize: 10,
    fontFamily: 'Manrope-SemiBold',
    color: '#fff',
    marginLeft: 4,
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
    marginTop: 12,
  },
  heroVenue: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 5,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 14,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 16,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
  },
  heroStatLabel: {
    fontSize: 9,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 10,
    flex: 1,
    marginHorizontal: 4,
  },
  actionText: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: '#2563eb',
    marginLeft: 5,
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
  desc: {
    fontSize: 12,
    fontFamily: 'Manrope-Regular',
    color: theme.colors.textMuted,
    lineHeight: 19,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
  },
  scheduleRow: {
    flexDirection: 'row',
  },
  timelineCol: {
    alignItems: 'center',
    width: 20,
    marginRight: 10,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotDone: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: theme.colors.border,
    marginVertical: 2,
  },
  scheduleBody: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 8,
  },
  scheduleTime: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.primary,
  },
  scheduleTitle: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginTop: 3,
  },
  scheduleDetail: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  rsvpSummary: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  rsvpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    marginBottom: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 11,
    fontFamily: 'Manrope-ExtraBold',
  },
  rsvpBody: { flex: 1 },
  rsvpName: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  rsvpMeta: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  confirmedChip: {
    backgroundColor: '#dcfce7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  confirmedText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    color: '#059669',
  },
  declinedChip: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  declinedText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    color: '#dc2626',
  },
  pendingActions: {
    flexDirection: 'row',
  },
  confirmBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  declineBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
});