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

import ActionButton from '../../../../components/ui/ActionButton';
import SectionHeader from '../../../../components/ui/SectionHeader';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../../constants/theme';

export default function EventDetail({ event, onBack }) {
  const [tab, setTab] = useState('overview');

  const handleNotify = () => {
    Alert.alert('Notification Sent', `Reminder sent to ${event.registrations} registered students.`);
  };

  const handleCloseRegistration = () => {
    Alert.alert(
      'Close Registration',
      'Close registration for this event? No new students will be able to register.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Close', onPress: () => Alert.alert('Closed', 'Registration window closed.') },
      ]
    );
  };

  const fillPct = Math.round((event.registrations / event.capacity) * 100);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#2563eb" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{event.name}</Text>
            <Text style={styles.headerSubtitle}>{event.category}</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={[styles.eventIcon, { backgroundColor: event.color + '14' }]}>
            <Ionicons name="calendar" size={26} color={event.color} />
          </View>
          <Text style={styles.eventName}>{event.name}</Text>
          <Text style={styles.eventMeta}>{event.date}</Text>
          <Text style={styles.eventVenue}>{event.venue}</Text>
        </View>

        {/* Capacity */}
        <View style={styles.capacityCard}>
          <View style={styles.capacityHeader}>
            <Text style={styles.capacityTitle}>Registration Capacity</Text>
            <Text style={[styles.capacityPct, { color: fillPct >= 85 ? '#dc2626' : fillPct >= 60 ? '#d97706' : '#059669' }]}>
              {fillPct}% full
            </Text>
          </View>
          <View style={styles.capacityTrack}>
            <View style={[styles.capacityFill, { width: `${fillPct}%`, backgroundColor: fillPct >= 85 ? '#dc2626' : fillPct >= 60 ? '#d97706' : '#059669' }]} />
          </View>
          <Text style={styles.capacityNote}>{event.registrations} of {event.capacity} seats taken</Text>
        </View>

        <View style={styles.tabsRow}>
          {['overview', 'registrations'].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.activeTab]}
              onPress={() => setTab(t)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, tab === t && styles.activeTabText]}>
                {t === 'overview' ? 'Overview' : 'Registrations'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'overview' ? (
          <>
            <SectionHeader title="Event Details" />
            <View style={styles.infoCard}>
              {[
                { label: 'Date', value: event.date },
                { label: 'Venue', value: event.venue },
                { label: 'Category', value: event.category },
                { label: 'Capacity', value: `${event.capacity} seats` },
                { label: 'Registrations', value: String(event.registrations) },
                { label: 'Status', value: event.status },
              ].map((row) => (
                <View key={row.label} style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{row.label}</Text>
                  <Text style={styles.infoValue}>{row.value}</Text>
                </View>
              ))}
            </View>
            <ActionButton label="Notify Registered Students" icon="megaphone" onPress={handleNotify} />
            <View style={styles.spacer} />
            <ActionButton label="Close Registration" icon="lock-closed" variant="danger" onPress={handleCloseRegistration} />
          </>
        ) : null}

        {tab === 'registrations' ? (
          <>
            <SectionHeader title={`Registered Students (${event.registrations})`} actionLabel="Export" actionIcon="download" onAction={() => Alert.alert('Exported', 'Registration list downloaded as Excel.')} />
            {['Aarav Mehta', 'Priya Sharma', 'Ananya Reddy', 'Kabir Joshi', 'Meghna Das', 'Rohan Gupta'].map((name, i) => (
              <View key={name} style={styles.studentRow}>
                <View style={[styles.studentAvatar, { backgroundColor: ['#2563eb', '#059669', '#d97706', '#dc2626', '#0891b2', '#2563eb'][i] + '14' }]}>
                  <Text style={[styles.studentInitial, { color: ['#2563eb', '#059669', '#d97706', '#dc2626', '#0891b2', '#2563eb'][i] }]}>
                    {name.split(' ').map((w) => w[0]).join('')}
                  </Text>
                </View>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{name}</Text>
                  <Text style={styles.studentMeta}>CSE-2{i + 1}-00{i + 1}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={18} color="#059669" />
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 2,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  eventIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  eventName: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
    textAlign: 'center',
  },
  eventMeta: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: '#64748b',
    fontFamily: 'Manrope-Medium',
    marginTop: 2,
  },
  eventVenue: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
  },
  capacityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  capacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  capacityTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  capacityPct: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  capacityTrack: {
    height: 8,
    backgroundColor: '#eef1f3',
    borderRadius: 4,
    overflow: 'hidden',
  },
  capacityFill: {
    height: '100%',
    borderRadius: 4,
  },
  capacityNote: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 4,
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
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  infoLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
  },
  infoValue: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  spacer: {
    height: SPACING.sm,
  },
  studentRow: {
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
  studentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  studentInitial: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  studentMeta: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
  },
});