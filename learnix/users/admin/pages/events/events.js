import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { EVENT_STATS, EVENTS, RECENT_REGISTRATIONS } from './constants/eventsData';

import StatCard from '../../components/ui/StatCard';
import SectionHeader from '../../components/ui/SectionHeader';

import EventDetail from './pages/event_detail/event_detail';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const TABS = [
  { id: 'events', label: 'Events' },
  { id: 'registrations', label: 'Registrations' },
];

export default function EventsModule({ navigation }) {
  const [tab, setTab] = useState('events');
  const [selectedEvent, setSelectedEvent] = useState(null);

  if (selectedEvent) {
    return <EventDetail event={selectedEvent} onBack={() => setSelectedEvent(null)} />;
  }

  const handleCreateEvent = () => {
    Alert.alert('Create Event', 'Create a new campus event (name, category, date, venue, capacity).');
  };

  const handleApprove = (event) => {
    Alert.alert(
      'Approve Event',
      `Approve "${event.name}" for ${event.date}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: () => Alert.alert('Approved', 'Event approved and published to students.') },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Stats */}
      <View style={styles.statsRow}>
        {EVENT_STATS.map((stat) => (
          <StatCard key={stat.id} icon={stat.icon} value={stat.value} label={stat.label} color={stat.color} />
        ))}
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {TABS.map((t) => (
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

      {tab === 'events' ? (
        <>
          <SectionHeader title="Campus Events" actionLabel="Create Event" actionIcon="add" onAction={handleCreateEvent} />
          {EVENTS.map((event) => (
            <TouchableOpacity
              key={event.id}
              style={styles.eventCard}
              onPress={() => setSelectedEvent(event)}
              activeOpacity={0.8}
            >
              <View style={[styles.eventIcon, { backgroundColor: event.color + '14' }]}>
                <Ionicons
                  name={event.category === 'Technical' ? 'hardware-chip' : event.category === 'Sports' ? 'fitness' : event.category === 'Cultural' ? 'musical-notes' : 'people'}
                  size={20}
                  color={event.color}
                />
              </View>
              <View style={styles.eventInfo}>
                <Text style={styles.eventName}>{event.name}</Text>
                <Text style={styles.eventMeta}>{event.category} • {event.date}</Text>
                <Text style={styles.eventVenue}>{event.venue} • {event.registrations}/{event.capacity} registered</Text>
              </View>
              <View style={styles.eventRight}>
                <View style={[styles.eventStatus, { backgroundColor: event.status === 'Approved' ? '#0596691A' : '#d977061A' }]}>
                  <Text style={[styles.eventStatusText, { color: event.status === 'Approved' ? '#059669' : '#d97706' }]}>
                    {event.status}
                  </Text>
                </View>
                {event.status === 'Pending' ? (
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => handleApprove(event)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="checkmark" size={14} color="#ffffff" />
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </>
      ) : null}

      {tab === 'registrations' ? (
        <>
          <SectionHeader title="Recent Registrations" actionLabel="Export" actionIcon="download" onAction={() => Alert.alert('Export', 'Registration list downloaded as Excel.')} />
          {RECENT_REGISTRATIONS.map((reg) => (
            <TouchableOpacity
              key={reg.id}
              style={styles.regCard}
              activeOpacity={0.8}
              onPress={() => Alert.alert(reg.student, `${reg.event}\nRegistered ${reg.registeredAt}`)}
            >
              <View style={[styles.regAvatar, { backgroundColor: reg.color + '14' }]}>
                <Text style={[styles.regInitial, { color: reg.color }]}>{reg.student.charAt(0)}</Text>
              </View>
              <View style={styles.regInfo}>
                <Text style={styles.regName}>{reg.student}</Text>
                <Text style={styles.regEvent}>{reg.event}</Text>
                <Text style={styles.regTime}>{reg.registeredAt}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.15)',
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
  },
  activeTab: {
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  tabText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Manrope-SemiBold',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#ffffff',
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  eventIcon: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  eventMeta: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  eventVenue: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  eventRight: {
    alignItems: 'flex-end',
    gap: 4,
    marginLeft: SPACING.sm,
  },
  eventStatus: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  eventStatusText: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: 'Manrope-SemiBold',
  },
  approveBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  regCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  regAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  regInitial: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  regInfo: {
    flex: 1,
  },
  regName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  regEvent: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  regTime: {
    fontSize: 9,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
});