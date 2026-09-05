import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../../../constants/theme';

const contributions = [
  { id: '1', type: 'Donation', label: '₹50,000 — Scholarship Fund', time: 'Nov 2026', color: '#059669', icon: 'gift-outline' },
  { id: '2', type: 'Event', label: 'Alumni Networking Meet (RSVP)', time: 'Dec 2026', color: '#2563eb', icon: 'calendar-outline' },
  { id: '3', type: 'Mentoring', label: '3 sessions — Batch 2024 mentee', time: 'Oct-Nov 2026', color: '#0891b2', icon: 'hand-left-outline' },
];

export default function AlumniDetail({ alumni, navigation }) {
  const [isMentor, setIsMentor] = useState(false);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>
            {alumni.name.split(' ').map((n) => n[0]).join('')}
          </Text>
        </View>
        <Text style={styles.heroName}>{alumni.name}</Text>
        <Text style={styles.heroRole}>
          {alumni.role} · {alumni.company}
        </Text>
        <View style={styles.heroMetaRow}>
          <View style={styles.heroMetaChip}>
            <Ionicons name="school-outline" size={12} color="#fff" />
            <Text style={styles.heroMetaText}>Batch {alumni.batch}</Text>
          </View>
          <View style={styles.heroMetaChip}>
            <Ionicons name="location-outline" size={12} color="#fff" />
            <Text style={styles.heroMetaText}>{alumni.location}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => Alert.alert('Message', `Opening chat with ${alumni.name}...`)}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={16} color="#2563eb" />
          <Text style={styles.actionText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => Alert.alert('Event Invite', `Invite sent to ${alumni.name} for upcoming events.`)}
        >
          <Ionicons name="calendar-outline" size={16} color="#2563eb" />
          <Text style={styles.actionText}>Invite</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, isMentor && styles.actionButtonActive]}
          onPress={() => {
            setIsMentor(!isMentor);
            Alert.alert(
              isMentor ? 'Mentor Removed' : 'Mentor Added',
              `${alumni.name} ${isMentor ? 'removed from' : 'added to'} the mentorship program.`
            );
          }}
        >
          <Ionicons
            name={isMentor ? 'hand-left' : 'hand-left-outline'}
            size={16}
            color={isMentor ? '#fff' : '#2563eb'}
          />
          <Text style={[styles.actionText, isMentor && styles.actionTextActive]}>
            {isMentor ? 'Mentor' : 'Add Mentor'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="briefcase-outline" size={15} color={theme.colors.textMuted} />
            <Text style={styles.infoLabel}>Current Role</Text>
            <Text style={styles.infoValue}>{alumni.role}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={15} color={theme.colors.textMuted} />
            <Text style={styles.infoLabel}>Company</Text>
            <Text style={styles.infoValue}>{alumni.company}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="school-outline" size={15} color={theme.colors.textMuted} />
            <Text style={styles.infoLabel}>Graduation</Text>
            <Text style={styles.infoValue}>Batch {alumni.batch} · B.Tech CSE</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={15} color={theme.colors.textMuted} />
            <Text style={styles.infoLabel}>Location</Text>
            <Text style={styles.infoValue}>{alumni.location}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={15} color={theme.colors.textMuted} />
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>
              {alumni.name.toLowerCase().replace(/\s+/g, '.')}@alumni.learnix.edu
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Engagement & Contributions</Text>
        {contributions.map((c) => (
          <View key={c.id} style={styles.contributionRow}>
            <View style={[styles.contributionIcon, { backgroundColor: c.color + '1a' }]}>
              <Ionicons name={c.icon} size={14} color={c.color} />
            </View>
            <View style={styles.contributionBody}>
              <Text style={styles.contributionLabel}>{c.label}</Text>
              <Text style={styles.contributionTime}>{c.type} · {c.time}</Text>
            </View>
            <View style={[styles.contributionChip, { backgroundColor: c.color + '1a' }]}>
              <Text style={[styles.contributionChipText, { color: c.color }]}>Done</Text>
            </View>
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
    padding: 20,
    alignItems: 'center',
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 20,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
  },
  heroName: {
    fontSize: 20,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
  },
  heroRole: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 3,
  },
  heroMetaRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  heroMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginHorizontal: 4,
  },
  heroMetaText: {
    fontSize: 10,
    fontFamily: 'Manrope-SemiBold',
    color: '#fff',
    marginLeft: 4,
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
  actionButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  actionText: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: '#2563eb',
    marginLeft: 5,
  },
  actionTextActive: {
    color: '#fff',
  },
  section: { paddingHorizontal: 16, marginTop: 18 },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginBottom: 10,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceMuted,
  },
  infoLabel: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginLeft: 8,
  },
  infoValue: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    maxWidth: '55%',
    textAlign: 'right',
  },
  contributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    marginBottom: 8,
  },
  contributionIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  contributionBody: { flex: 1 },
  contributionLabel: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  contributionTime: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  contributionChip: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  contributionChipText: {
    fontSize: 9,
    fontFamily: 'Manrope-Bold',
  },
});