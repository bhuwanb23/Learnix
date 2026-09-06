import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../../../constants/theme';
import { alumniApi } from '../../../../../../services/api';

const STATUS_META = {
  PENDING: { chip: 'Pending', bg: '#fef3c7', color: '#d97706' },
  APPROVED: { chip: 'Approved', bg: '#dbeafe', color: '#2563eb' },
  CONFIRMED: { chip: 'Confirmed', bg: '#dcfce7', color: '#059669' },
  DECLINED: { chip: 'Declined', bg: '#fee2e2', color: '#dc2626' },
  REJECTED: { chip: 'Rejected', bg: '#fee2e2', color: '#dc2626' },
};

export default function EventDetail({ eventId, navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [announcing, setAnnouncing] = useState(false);
  const [announced, setAnnounced] = useState(false);

  const load = useCallback(
    async (showSpinner = true) => {
      try {
        if (showSpinner) setLoading(true);
        setError(null);
        const d = await alumniApi.eventDetail(eventId);
        setData(d);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [eventId],
  );

  React.useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(false);
  };

  const decide = async (rsvpId, decision) => {
    setBusyId(rsvpId);
    try {
      await alumniApi.decideRsvp(rsvpId, decision);
      await load(false);
    } catch (e) {
      Alert.alert('Cannot update RSVP', e.message);
    } finally {
      setBusyId(null);
    }
  };

  const onAnnounce = async () => {
    setAnnouncing(true);
    try {
      await alumniApi.broadcast({
        audience: 'ALL_ALUMNI',
        templateKey: 'EVENT_INVITE',
        title: `${data.title} — you're invited!`,
        body: `Join us for ${data.title}${data.venue ? ` at ${data.venue}` : ''} on ${new Date(data.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}. RSVP from the Events tab.`,
      });
      setAnnounced(true);
      Alert.alert('Announcement Sent', 'All alumni have been notified about this event.');
    } catch (e) {
      Alert.alert('Cannot announce', e.message);
    } finally {
      setAnnouncing(false);
    }
  };

  const onRemind = () => {
    const pending = (data.rsvpList ?? []).filter((r) => r.status === 'PENDING').length;
    Alert.alert(
      'RSVP Reminders',
      pending > 0
        ? `${pending} alumni still haven't responded. Reminder notifications will go out from the notification worker.`
        : 'Every invited alumnus has responded — no reminders needed.',
    );
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

  const confirmed = (data.rsvpList ?? []).filter((r) => r.status === 'CONFIRMED').length;
  const pending = (data.rsvpList ?? []).filter((r) => r.status === 'PENDING').length;
  const pct = data.capacity > 0 ? Math.min(Math.round((data.rsvps / data.capacity) * 100), 100) : 0;
  const COLORS = ['#2563eb', '#059669', '#d97706', '#0891b2', '#dc2626', '#7c3aed'];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroBadge}>
            <Ionicons name="calendar-outline" size={12} color="#fff" />
            <Text style={styles.heroBadgeText}>
              {new Date(data.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
          <View style={styles.heroBadge}>
            <Ionicons name="time-outline" size={12} color="#fff" />
            <Text style={styles.heroBadgeText}>
              {new Date(data.startDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </Text>
          </View>
          <View style={styles.heroBadge}>
            <Ionicons name="information-circle-outline" size={12} color="#fff" />
            <Text style={styles.heroBadgeText}>{data.status}</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>{data.title}</Text>
        {data.venue ? (
          <Text style={styles.heroVenue}>
            <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.85)" /> {data.venue}
          </Text>
        ) : null}
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{data.rsvps}</Text>
            <Text style={styles.heroStatLabel}>RSVPs</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{data.capacity}</Text>
            <Text style={styles.heroStatLabel}>Capacity</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{pct}%</Text>
            <Text style={styles.heroStatLabel}>Filled</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionButton} disabled={announcing || announced} onPress={onAnnounce}>
          {announcing ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : (
            <Ionicons name={announced ? 'checkmark-circle' : 'megaphone-outline'} size={16} color="#2563eb" />
          )}
          <Text style={styles.actionText}>{announced ? 'Announced' : 'Announce'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={onRemind}>
          <Ionicons name="notifications-outline" size={16} color="#2563eb" />
          <Text style={styles.actionText}>Remind</Text>
        </TouchableOpacity>
      </View>

      {data.description ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.desc}>{data.description}</Text>
        </View>
      ) : null}

      {(data.schedule ?? []).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule</Text>
          {data.schedule.map((s, idx) => (
            <View key={`${s.day}-${s.order}`} style={styles.scheduleRow}>
              <View style={styles.timelineCol}>
                <View style={[styles.timelineDot, s.isDone && styles.timelineDotDone]}>
                  {s.isDone && <Ionicons name="checkmark" size={10} color="#fff" />}
                </View>
                {idx < data.schedule.length - 1 && <View style={styles.timelineLine} />}
              </View>
              <View style={styles.scheduleBody}>
                <Text style={styles.scheduleTime}>Day {s.day}</Text>
                <Text style={styles.scheduleTitle}>{s.item}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>RSVP List</Text>
          <Text style={styles.rsvpSummary}>
            {confirmed} confirmed · {pending} pending
          </Text>
        </View>
        {(data.rsvpList ?? []).map((r, idx) => {
          const meta = STATUS_META[r.status] ?? { chip: r.status, bg: '#f1f5f9', color: '#64748b' };
          const color = COLORS[idx % COLORS.length];
          const isPending = r.status === 'PENDING';
          return (
            <View key={r.id} style={styles.rsvpCard}>
              <View style={[styles.avatar, { backgroundColor: color + '1a' }]}>
                <Text style={[styles.avatarText, { color }]}>
                  {r.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </Text>
              </View>
              <View style={styles.rsvpBody}>
                <Text style={styles.rsvpName} numberOfLines={1}>{r.name}</Text>
                <Text style={styles.rsvpMeta}>
                  {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
              {isPending ? (
                <View style={styles.pendingActions}>
                  <TouchableOpacity
                    style={styles.confirmBtn}
                    disabled={busyId === r.id}
                    onPress={() => decide(r.id, 'CONFIRMED')}
                  >
                    {busyId === r.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="checkmark" size={13} color="#fff" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.declineBtn}
                    disabled={busyId === r.id}
                    onPress={() => decide(r.id, 'DECLINED')}
                  >
                    <Ionicons name="close" size={13} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
                  <Text style={[styles.statusText, { color: meta.color }]}>{meta.chip}</Text>
                </View>
              )}
            </View>
          );
        })}
        {(data.rsvpList ?? []).length === 0 && (
          <Text style={styles.emptyText}>No RSVPs yet — announce the event to reach alumni.</Text>
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
  emptyText: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 16 },
  hero: {
    margin: 16,
    borderRadius: 20,
    padding: 18,
  },
  heroTop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
    marginTop: 4,
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
  statusChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
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
