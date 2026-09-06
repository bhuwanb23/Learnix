import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../../../constants/theme';
import { alumniApi } from '../../../../../../services/api';

export default function AlumniDetail({ alumniId, navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [addingMentor, setAddingMentor] = useState(false);
  const [invited, setInvited] = useState(false);
  const [mentorPending, setMentorPending] = useState(false);

  const load = useCallback(
    async (showSpinner = true) => {
      try {
        if (showSpinner) setLoading(true);
        setError(null);
        const d = await alumniApi.alumniDetail(alumniId);
        setData(d);
        setInvited(false);
        setMentorPending(
          Array.isArray(d?.contributions?.mentorship) &&
            d.contributions.mentorship.some((m) => m.status === 'PENDING' || m.status === 'ACTIVE'),
        );
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [alumniId],
  );

  React.useEffect(() => {
    load();
  }, [load]);

  const onInvite = async () => {
    setInviting(true);
    try {
      const res = await alumniApi.inviteAlumni(alumniId);
      setInvited(true);
      Alert.alert('Invite Sent', `${res.invited} has been notified about upcoming alumni events.`);
    } catch (e) {
      Alert.alert('Cannot invite', e.message);
    } finally {
      setInviting(false);
    }
  };

  const onAddMentor = async () => {
    setAddingMentor(true);
    try {
      const res = await alumniApi.addMentor(alumniId);
      setMentorPending(true);
      Alert.alert(
        'Mentor Added',
        `${res.mentor} → ${res.mentee} (${res.status}). Approve it from the Mentorship tab to activate.`,
      );
    } catch (e) {
      Alert.alert('Cannot add mentor', e.message);
    } finally {
      setAddingMentor(false);
    }
  };

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={navigation.goBack}>
          <Text style={styles.backLinkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const initials = data.name.split(' ').map((n) => n[0]).join('').slice(0, 2);
  const c = data.contributions ?? {};

  const contributionRows = [
    ...(c.donations ?? []).map((d) => ({
      id: `don-${d.id}`,
      type: 'Donation',
      label: `₹${d.amountRupees.toLocaleString('en-IN')} — ${d.fund}`,
      time: `${d.status} · ${new Date(d.date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`,
      color: '#059669',
      icon: 'gift-outline',
    })),
    ...(c.events ?? []).map((r) => ({
      id: `evt-${r.id}-${r.title}`,
      type: 'Event',
      label: `${r.title} (${r.status})`,
      time: `${new Date(r.date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`,
      color: '#2563eb',
      icon: 'calendar-outline',
    })),
    ...(c.mentorship ?? []).map((m) => ({
      id: `men-${m.id}`,
      type: 'Mentoring',
      label: `${m.status} — ${m.mentee} (${m.field})`,
      time: m.field,
      color: '#0891b2',
      icon: 'hand-left-outline',
    })),
  ];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(false); }} />}
    >
      <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.heroName}>{data.name}</Text>
        <Text style={styles.heroRole}>
          {data.currentRole || '—'}{data.company ? ` · ${data.company}` : ''}
        </Text>
        <View style={styles.heroMetaRow}>
          <View style={styles.heroMetaChip}>
            <Ionicons name="school-outline" size={12} color="#fff" />
            <Text style={styles.heroMetaText}>Batch {data.graduationYear}</Text>
          </View>
          {data.location ? (
            <View style={styles.heroMetaChip}>
              <Ionicons name="location-outline" size={12} color="#fff" />
              <Text style={styles.heroMetaText}>{data.location}</Text>
            </View>
          ) : null}
          {data.chapter ? (
            <View style={styles.heroMetaChip}>
              <Ionicons name="people-outline" size={12} color="#fff" />
              <Text style={styles.heroMetaText}>{data.chapter.city} Chapter</Text>
            </View>
          ) : null}
        </View>
        {c.totalDonatedRupees ? (
          <Text style={styles.heroDonated}>
            ₹{c.totalDonatedRupees.toLocaleString('en-IN')} contributed
          </Text>
        ) : null}
      </LinearGradient>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionButton} disabled={inviting} onPress={onInvite}>
          {inviting ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : (
            <Ionicons name={invited ? 'checkmark-circle' : 'calendar-outline'} size={16} color="#2563eb" />
          )}
          <Text style={styles.actionText}>{invited ? 'Invited' : 'Invite'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, mentorPending && styles.actionButtonActive]}
          disabled={addingMentor || mentorPending}
          onPress={onAddMentor}
        >
          {addingMentor ? (
            <ActivityIndicator size="small" color={mentorPending ? '#fff' : '#2563eb'} />
          ) : (
            <Ionicons
              name={mentorPending ? 'hand-left' : 'hand-left-outline'}
              size={16}
              color={mentorPending ? '#fff' : '#2563eb'}
            />
          )}
          <Text style={[styles.actionText, mentorPending && styles.actionTextActive]}>
            {mentorPending ? 'Mentor' : 'Add Mentor'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => Alert.alert('Message', `Email: ${data.email}\n(Chat arrives with the messaging phase.)`)}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={16} color="#2563eb" />
          <Text style={styles.actionText}>Contact</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="briefcase-outline" size={15} color={theme.colors.textMuted} />
            <Text style={styles.infoLabel}>Current Role</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{data.currentRole || '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={15} color={theme.colors.textMuted} />
            <Text style={styles.infoLabel}>Company</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{data.company || '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="school-outline" size={15} color={theme.colors.textMuted} />
            <Text style={styles.infoLabel}>Graduation</Text>
            <Text style={styles.infoValue}>Batch {data.graduationYear}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={15} color={theme.colors.textMuted} />
            <Text style={styles.infoLabel}>Location</Text>
            <Text style={styles.infoValue}>{data.location || '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={15} color={theme.colors.textMuted} />
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{data.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="pulse-outline" size={15} color={theme.colors.textMuted} />
            <Text style={styles.infoLabel}>Engagement</Text>
            <Text style={[styles.infoValue, { color: data.engagementStatus === 'ACTIVE' ? '#059669' : '#d97706' }]}>
              {data.engagementStatus}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Engagement & Contributions</Text>
        {contributionRows.map((row) => (
          <View key={row.id} style={styles.contributionRow}>
            <View style={[styles.contributionIcon, { backgroundColor: row.color + '1a' }]}>
              <Ionicons name={row.icon} size={14} color={row.color} />
            </View>
            <View style={styles.contributionBody}>
              <Text style={styles.contributionLabel} numberOfLines={1}>{row.label}</Text>
              <Text style={styles.contributionTime}>{row.type} · {row.time}</Text>
            </View>
          </View>
        ))}
        {contributionRows.length === 0 && (
          <Text style={styles.emptyText}>No contributions recorded yet.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  errorText: { marginTop: 12, fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { marginTop: 16, backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 13 },
  backLink: { marginTop: 14 },
  backLinkText: { fontSize: 12, fontFamily: 'Manrope-SemiBold', color: '#2563eb' },
  emptyText: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, paddingVertical: 12 },
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
    textAlign: 'center',
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
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
    marginTop: 4,
  },
  heroMetaText: {
    fontSize: 10,
    fontFamily: 'Manrope-SemiBold',
    color: '#fff',
    marginLeft: 4,
  },
  heroDonated: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
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
});
