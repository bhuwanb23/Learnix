import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../../../constants/theme';

const initialRegistrations = [
  { id: '1', name: 'Aarav Mehta', roll: 'CSE-22-045', event: '100m Sprint', status: 'Approved' },
  { id: '2', name: 'Priya Sharma', roll: 'ECE-23-019', event: 'Classical Dance', status: 'Pending' },
  { id: '3', name: 'Rahul Verma', roll: 'IT-22-031', event: 'Coding Challenge', status: 'Pending' },
  { id: '4', name: 'Sneha Patel', roll: 'CSE-23-014', event: 'Cultural Night Performance', status: 'Approved' },
  { id: '5', name: 'Vikram Nair', roll: 'ME-23-054', event: 'Football', status: 'Pending' },
];

export default function EventDetail({ event, onBack }) {
  const [registrations, setRegistrations] = useState(initialRegistrations);

  const pending = registrations.filter((r) => r.status === 'Pending').length;

  const handleAction = (id, action) => {
    const reg = registrations.find((r) => r.id === id);
    setRegistrations(
      registrations.map((r) =>
        r.id === id ? { ...r, status: action === 'approve' ? 'Approved' : 'Rejected' } : r
      )
    );
    if (action === 'approve') {
      Alert.alert('Approved', `${reg.name}'s registration confirmed. They were notified.`);
    } else {
      Alert.alert('Rejected', `${reg.name}'s registration rejected and notified.`);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.categoryChip}>
            <Ionicons
              name={
                event.category === 'Sports'
                  ? 'football-outline'
                  : event.category === 'Cultural'
                  ? 'musical-notes-outline'
                  : 'hardware-chip-outline'
              }
              size={12}
              color="#fff"
            />
            <Text style={styles.categoryText}>{event.category}</Text>
          </View>
          <Text style={styles.eventName}>{event.name}</Text>
          <Text style={styles.eventMeta}>
            {event.date} · {event.venue}
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{event.registrations}</Text>
              <Text style={styles.heroStatLabel}>Registered</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{pending}</Text>
              <Text style={styles.heroStatLabel}>Pending</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{event.capacity}</Text>
              <Text style={styles.heroStatLabel}>Capacity</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              Alert.alert('Announce', `Push "${event.name}" announcement to all students.`)
            }
          >
            <Ionicons name="megaphone-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.actionText}>Announce</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              Alert.alert('Schedule', `Add a schedule slot for ${event.name} — date, time and venue.`)
            }
          >
            <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.actionText}>Schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              Alert.alert('Volunteers', `Assign student volunteers for ${event.name}.`)
            }
          >
            <Ionicons name="people-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.actionText}>Volunteers</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.scheduleCard}>
          <Text style={styles.scheduleTitle}>Schedule</Text>
          {[
            { time: 'Day 1 · 9:00 AM', item: 'Opening ceremony + registrations', done: true },
            { time: 'Day 1 · 11:00 AM', item: 'Preliminary rounds', done: true },
            { time: 'Day 2 · 10:00 AM', item: 'Finals', done: false },
            { time: 'Day 2 · 5:00 PM', item: 'Prize distribution', done: false },
          ].map((s, idx) => (
            <View key={idx} style={styles.scheduleRow}>
              <View
                style={[
                  styles.scheduleDot,
                  { backgroundColor: s.done ? '#059669' : '#fef3c7' },
                ]}
              >
                {s.done && <Ionicons name="checkmark" size={9} color="#fff" />}
              </View>
              <View style={styles.scheduleBody}>
                <Text style={styles.scheduleItem}>{s.item}</Text>
                <Text style={styles.scheduleTime}>{s.time}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Registrations</Text>
          <Text style={styles.sectionCount}>{pending} pending</Text>
        </View>

        {registrations.map((r) => (
          <View key={r.id} style={styles.regCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{r.name.charAt(0)}</Text>
            </View>
            <View style={styles.regBody}>
              <Text style={styles.regName}>{r.name} · {r.roll}</Text>
              <Text style={styles.regEvent}>{r.event}</Text>
            </View>
            {r.status === 'Pending' ? (
              <View style={styles.regActions}>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => handleAction(r.id, 'reject')}
                >
                  <Ionicons name="close-outline" size={14} color="#dc2626" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={() => handleAction(r.id, 'approve')}
                >
                  <Ionicons name="checkmark-outline" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View
                style={[
                  styles.approvedChip,
                  { backgroundColor: r.status === 'Approved' ? '#dcfce7' : '#fee2e2' },
                ]}
              >
                <Text
                  style={[
                    styles.approvedText,
                    { color: r.status === 'Approved' ? '#059669' : '#dc2626' },
                  ]}
                >
                  {r.status}
                </Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 32 },
  hero: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 18,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: '#fff',
    marginLeft: 4,
  },
  eventName: {
    fontSize: 22,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
    marginTop: 8,
  },
  eventMeta: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingVertical: 12,
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: {
    fontSize: 16,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
  },
  heroStatLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  heroStatDivider: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.2)' },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 11,
    marginHorizontal: 4,
  },
  actionText: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.primary,
    marginLeft: 4,
  },
  scheduleCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
  },
  scheduleTitle: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginBottom: 6,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  scheduleDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  scheduleBody: { flex: 1 },
  scheduleItem: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.text,
  },
  scheduleTime: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  sectionCount: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: '#d97706',
  },
  regCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginHorizontal: 16,
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
  regBody: { flex: 1, marginRight: 8 },
  regName: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  regEvent: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  regActions: {
    flexDirection: 'row',
  },
  rejectBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  approveBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approvedChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  approvedText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
  },
});