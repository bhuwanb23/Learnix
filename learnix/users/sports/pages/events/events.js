import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import EventDetail from './pages/event_detail/event_detail';

const events = [
  { id: 'E1', name: 'Tech Fest 2026', category: 'Technical', date: 'Nov 21-22', venue: 'Main Auditorium', registrations: 420, capacity: 600, status: 'Approved', color: '#2563eb' },
  { id: 'E2', name: 'Annual Sports Meet', category: 'Sports', date: 'Nov 28-30', venue: 'Sports Ground', registrations: 350, capacity: 500, status: 'Approved', color: '#059669' },
  { id: 'E3', name: 'Cultural Night 2026', category: 'Cultural', date: 'Dec 5', venue: 'Open Air Theatre', registrations: 290, capacity: 450, status: 'Pending', color: '#d97706' },
  { id: 'E4', name: 'Hackathon: CodeSprint', category: 'Technical', date: 'Dec 12-13', venue: 'CS Labs', registrations: 120, capacity: 200, status: 'Approved', color: '#dc2626' },
  { id: 'E5', name: 'Basketball Inter-College', category: 'Sports', date: 'Dec 15-17', venue: 'Indoor Court', registrations: 96, capacity: 120, status: 'Planning', color: '#0891b2' },
];

const categories = ['All', 'Sports', 'Cultural', 'Technical'];

const statusStyle = (s) => {
  if (s === 'Approved') return { bg: '#dcfce7', color: '#059669' };
  if (s === 'Pending') return { bg: '#fef3c7', color: '#d97706' };
  return { bg: '#e0e7ff', color: '#4f46e5' };
};

export default function EventsModule({ navigation }) {
  const [category, setCategory] = useState('All');
  const [selectedEvent, setSelectedEvent] = useState(null);

  if (selectedEvent) {
    return <EventDetail event={selectedEvent} onBack={() => setSelectedEvent(null)} />;
  }

  const filtered = category === 'All' ? events : events.filter((e) => e.category === category);

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, category === cat && styles.chipActive]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {filtered.map((e) => {
          const st = statusStyle(e.status);
          const pct = Math.round((e.registrations / e.capacity) * 100);
          return (
            <TouchableOpacity
              key={e.id}
              style={styles.card}
              onPress={() => setSelectedEvent(e)}
            >
              <View style={[styles.eventIcon, { backgroundColor: e.color + '1a' }]}>
                <Ionicons
                  name={
                    e.category === 'Sports'
                      ? 'football-outline'
                      : e.category === 'Cultural'
                      ? 'musical-notes-outline'
                      : 'hardware-chip-outline'
                  }
                  size={19}
                  color={e.color}
                />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.name}>{e.name}</Text>
                <Text style={styles.meta}>
                  {e.date} · {e.venue}
                </Text>
                <View style={styles.progressRow}>
                  <View style={styles.progressTrack}>
                    <View
                      style={[styles.progressFill, { width: pct + '%', backgroundColor: e.color }]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {e.registrations}/{e.capacity}
                  </Text>
                </View>
              </View>
              <View style={[styles.statusChip, { backgroundColor: st.bg }]}>
                <Text style={[styles.statusText, { color: st.color }]}>{e.status}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16 },
  chipsRow: { flexGrow: 0, marginTop: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceMuted,
    marginRight: 8,
  },
  chipActive: { backgroundColor: theme.colors.primary },
  chipText: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    color: theme.colors.textMuted,
  },
  chipTextActive: { color: '#fff' },
  list: { paddingTop: 12, paddingBottom: 24 },
  card: {
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
    width: 42,
    height: 42,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardBody: { flex: 1, marginRight: 8 },
  name: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: theme.colors.text,
  },
  meta: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressFill: { height: 5, borderRadius: 3 },
  progressText: {
    fontSize: 10,
    fontFamily: 'Manrope_600SemiBold',
    color: theme.colors.textMuted,
  },
  statusChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
  },
});