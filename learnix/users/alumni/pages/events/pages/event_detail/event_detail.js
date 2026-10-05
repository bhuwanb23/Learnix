import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../../../constants/theme';
import { alumniApi } from '../../../../../../services/api';
import { SkeletonCard } from '../../../../../../components/ui';
import { typeMeta, eventStatusMeta, fmtDate, fmtTime, stars } from '../../eventMeta';
import { Fact, Meter } from '../../components/EventCard';
import EventAgenda from '../event_agenda/event_agenda';
import EventAttendees from '../event_attendees/event_attendees';
import EventFeedback from '../event_feedback/event_feedback';
import EventMemories from '../event_memories/event_memories';

/**
 * Event detail — a tab host.
 *
 * The four heavy tabs are separate screens that receive `event` (already loaded
 * by this hub) plus a `reload` callback, so switching tabs never refetches and
 * the hub owns the single source of truth for the event. Keeping Agenda,
 * Attendees, Feedback and Memories in their own files is what stops this file
 * becoming the 900-line screen the previous version was.
 *
 * EVERY action button is rendered from the server's `viewerContext`. Deciding
 * "is this person an officer?" here would put buttons on screen that the API
 * then answers with 403, which reads as a broken app rather than a locked one.
 */
const TABS = [
  { id: 'about', label: 'About', icon: 'information-circle-outline' },
  { id: 'agenda', label: 'Agenda', icon: 'list-outline' },
  { id: 'attendees', label: 'Attendees', icon: 'people-outline' },
  { id: 'feedback', label: 'Reviews', icon: 'star-outline' },
  { id: 'memories', label: 'Memories', icon: 'images-outline' },
];

export default function EventDetail({ eventId, navigation }) {
  const [event, setEvent] = useState(null);
  const [tab, setTab] = useState('about');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (showSpinner = true) => {
      try {
        if (showSpinner) setLoading(true);
        setError(null);
        setEvent(await alumniApi.eventDetail(eventId));
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [eventId],
  );

  useEffect(() => {
    load();
  }, [load]);

  const reload = useCallback(() => load(false), [load]);

  // ── Registration ──
  const onRegister = async () => {
    try {
      setBusy(true);
      const res = await alumniApi.registerForEvent(eventId);
      Alert.alert(res.waitlisted ? 'Added to waitlist' : 'Registered', res.message);
      load(false);
    } catch (e) {
      Alert.alert('Cannot register', e.message);
    } finally {
      setBusy(false);
    }
  };

  const onCancelRegistration = () => {
    Alert.alert('Cancel your registration?', 'Your seat is released to the next person on the waitlist.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel registration',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);
            const res = await alumniApi.cancelEventRegistration(eventId);
            Alert.alert('Cancelled', res.message);
            load(false);
          } catch (e) {
            Alert.alert('Cannot cancel', e.message);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const onJoin = () => {
    // A webinar link is only useful if you can actually open it, so this is
    // handled explicitly rather than relying on Linking silently doing nothing.
    Alert.alert('Join', 'The joining link will open in your browser.', [
      { text: 'Not now', style: 'cancel' },
      {
        text: 'Open link',
        onPress: async () => {
          try {
            await Linking.openURL(event.meetingUrl);
          } catch (e) {
            Alert.alert('Cannot open link', e.message);
          }
        },
      },
    ]);
  };

  if (loading && !event) {
    return (
      <View style={styles.container}>
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} style={{ marginHorizontal: 16, marginBottom: 8 }} />
        ))}
      </View>
    );
  }

  if (error && !event) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retry} onPress={() => load()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.backLinkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const t = typeMeta(event.eventType);
  const st = eventStatusMeta(event.status);
  const vc = event.viewerContext ?? {};
  const stats = event.stats ?? {};

  const badges = (id) => {
    switch (id) {
      case 'agenda':
        return event.agenda?.length ?? 0;
      case 'attendees':
        return stats.registered ?? 0;
      case 'feedback':
        return stats.feedbackCount ?? 0;
      case 'memories':
        return stats.photoCount ?? 0;
      default:
        return 0;
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[t.color, '#0f172a']} style={styles.hero}>
        <View style={styles.heroTop}>
          <TouchableOpacity style={styles.circleBtn} onPress={navigation.goBack}>
            <Ionicons name="arrow-back" size={17} color="#fff" />
          </TouchableOpacity>
          <View style={styles.heroChips}>
            <View style={styles.heroChip}>
              <Ionicons name={t.icon} size={10} color="#fff" />
              <Text style={styles.heroChipText}>{t.label}</Text>
            </View>
            {event.isOnline ? (
              <View style={styles.heroChip}>
                <Ionicons name="globe-outline" size={10} color="#fff" />
                <Text style={styles.heroChipText}>Online</Text>
              </View>
            ) : null}
            {vc.isWaitlisted ? (
              <View style={[styles.heroChip, { backgroundColor: '#d97706' }]}>
                <Text style={styles.heroChipText}>Waitlisted</Text>
              </View>
            ) : null}
            {vc.hasCheckedIn ? (
              <View style={[styles.heroChip, { backgroundColor: '#059669' }]}>
                <Ionicons name="checkmark" size={10} color="#fff" />
                <Text style={styles.heroChipText}>Attended</Text>
              </View>
            ) : null}
          </View>
        </View>

        <Text style={styles.heroTitle}>{event.title}</Text>

        <View style={styles.heroMeta}>
          <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.85)" />
          <Text style={styles.heroMetaText}>
            {fmtDate(event.startDate)}
            {fmtTime(event.startDate) ? ` · ${fmtTime(event.startDate)}` : ''}
          </Text>
        </View>
        <View style={styles.heroMeta}>
          <Ionicons name={event.isOnline ? 'globe-outline' : 'location-outline'} size={12} color="rgba(255,255,255,0.85)" />
          <Text style={styles.heroMetaText} numberOfLines={1}>
            {event.isOnline ? 'Online event' : (event.venue?.name ?? 'Venue to be announced')}
            {event.chapter ? ` · ${event.chapter.city} chapter` : ''}
          </Text>
        </View>

        <View style={styles.heroStats}>
          <HeroStat value={stats.registered ?? 0} label="registered" />
          <HeroStat value={stats.confirmed ?? 0} label="going" />
          <HeroStat value={stats.checkedIn ?? 0} label="attended" />
          <HeroStat
            value={stats.avgRating ?? '—'}
            label={stats.avgRating != null ? `★ ${stats.avgRating}` : 'no reviews'}
          />
        </View>
      </LinearGradient>

      {/* The single most important control on the screen. Exactly one of
          Register / Cancel is ever offered, per viewerContext. */}
      {!vc.isOffice && !event.isPast && (vc.canRegister || vc.canCancel) ? (
        <View style={styles.actionBar}>
          {vc.canRegister ? (
            <TouchableOpacity
              style={[styles.primaryBtn, vc.seatsLeft === 0 && styles.primaryBtnFull]}
              onPress={onRegister}
              disabled={busy}
            >
              <Ionicons
                name={vc.seatsLeft === 0 ? 'hourglass-outline' : 'add-circle-outline'}
                size={16}
                color="#fff"
              />
              <Text style={styles.primaryBtnText}>
                {busy ? 'Working…' : vc.seatsLeft === 0 ? 'Join the waitlist' : 'Register'}
              </Text>
            </TouchableOpacity>
          ) : null}
          {vc.canCancel ? (
            <TouchableOpacity style={styles.secondaryBtn} onPress={onCancelRegistration} disabled={busy}>
              <Ionicons name="close-circle-outline" size={16} color="#dc2626" />
              <Text style={styles.secondaryBtnText}>Cancel my spot</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {vc.hasCheckedIn && event.meetingUrl && event.isOnline ? (
        <TouchableOpacity style={styles.joinBar} onPress={onJoin}>
          <Ionicons name="videocam-outline" size={15} color="#fff" />
          <Text style={styles.joinText}>Join the webinar</Text>
        </TouchableOpacity>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabWrap}
        contentContainerStyle={styles.tabRow}
      >
        {TABS.map((x) => {
          const active = tab === x.id;
          const n = badges(x.id);
          return (
            <TouchableOpacity
              key={x.id}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(x.id)}
            >
              <Ionicons name={x.icon} size={13} color={active ? '#fff' : theme.colors.textMuted} />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{x.label}</Text>
              {n > 0 && x.id !== 'about' ? (
                <Text style={[styles.tabCount, active && styles.tabCountActive]}>{n}</Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              reload();
            }}
          />
        }
      >
        {tab === 'about' ? (
          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Details</Text>
              <Fact label="Status" value={st.label} valueColor={st.color} />
              <Fact label="Type" value={t.label} />
              <Fact label="Starts" value={`${fmtDate(event.startDate)} · ${fmtTime(event.startDate)}`} />
              <Fact label="Ends" value={`${fmtDate(event.endDate)} · ${fmtTime(event.endDate)}`} />
              <Fact label="Where" value={event.isOnline ? 'Online' : (event.venue?.name ?? 'TBC')} />
              {event.chapter ? <Fact label="Chapter" value={event.chapter.city} /> : null}
              <Fact label="Capacity" value={`${stats.confirmed ?? 0} / ${event.capacity}`} />
              {stats.pending > 0 ? <Fact label="Waitlist" value={`${stats.pending} waiting`} /> : null}
            </View>

            {event.description ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>About this event</Text>
                <Text style={styles.body}>{event.description}</Text>
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Turnout</Text>
              <Meter
                label="Registered"
                value={
                  event.capacity > 0
                    ? Math.round(((stats.registered ?? 0) / event.capacity) * 100)
                    : null
                }
                color="#2563eb"
                hint={`${stats.registered ?? 0} of ${event.capacity} places taken`}
              />
              <Meter
                label="Confirmed"
                value={
                  stats.registered > 0
                    ? Math.round(((stats.confirmed ?? 0) / stats.registered) * 100)
                    : null
                }
                color="#0891b2"
                hint="Of everyone who registered"
              />
              {/* The number that used to be fiction. */}
              <Meter
                label="Actually attended"
                value={stats.attendanceRate}
                color="#059669"
                hint={
                  stats.confirmed > 0
                    ? `${stats.checkedIn} of ${stats.confirmed} confirmed turned up`
                    : 'Nothing confirmed yet'
                }
              />
            </View>

            {stats.avgRating != null ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Rating</Text>
                <View style={styles.ratingRow}>
                  <Text style={styles.ratingBig}>{stats.avgRating}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={styles.starRow}>
                      {stars(stats.avgRating, 14).map((s) => (
                        <Ionicons
                          key={s.n}
                          name={s.icon}
                          size={14}
                          color={s.filled ? '#f59e0b' : '#cbd5e1'}
                        />
                      ))}
                    </View>
                    <Text style={styles.muted}>{stats.feedbackCount} attendee review(s)</Text>
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {tab === 'agenda' ? <EventAgenda event={event} reload={reload} /> : null}
        {tab === 'attendees' ? <EventAttendees event={event} reload={reload} /> : null}
        {tab === 'feedback' ? <EventFeedback event={event} reload={reload} /> : null}
        {tab === 'memories' ? <EventMemories event={event} reload={reload} /> : null}
      </ScrollView>
    </View>
  );
}

function HeroStat({ value, label }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, backgroundColor: theme.colors.background },
  errorText: { marginTop: 10, fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center' },
  retry: { marginTop: 14, backgroundColor: '#2563eb', paddingHorizontal: 22, paddingVertical: 9, borderRadius: 10 },
  retryText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 12 },
  backLink: { marginTop: 14 },
  backLinkText: { color: theme.colors.textMuted, fontFamily: 'Manrope-SemiBold', fontSize: 12 },

  hero: { padding: 18, paddingTop: 14 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  circleBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroChips: { flexDirection: 'row', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' },
  heroChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  heroChipText: { color: '#fff', fontSize: 9, fontFamily: 'Manrope-Bold' },
  heroTitle: { color: '#fff', fontSize: 20, fontFamily: 'Manrope-ExtraBold', lineHeight: 26 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  heroMetaText: { color: 'rgba(255,255,255,0.88)', fontSize: 11, fontFamily: 'Manrope-Medium', flex: 1 },
  heroStats: { flexDirection: 'row', gap: 7, marginTop: 14 },
  heroStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 11, paddingHorizontal: 8, paddingVertical: 7 },
  heroStatValue: { color: '#fff', fontSize: 14, fontFamily: 'Manrope-ExtraBold' },
  heroStatLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 8, fontFamily: 'Manrope-Medium' },

  actionBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  primaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#059669', borderRadius: 12, paddingVertical: 12 },
  primaryBtnFull: { backgroundColor: '#d97706' },
  primaryBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Manrope-Bold' },
  secondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, paddingVertical: 12 },
  secondaryBtnText: { color: '#dc2626', fontSize: 13, fontFamily: 'Manrope-Bold' },
  joinBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#7c3aed', marginHorizontal: 16, marginTop: 10, borderRadius: 12, paddingVertical: 12 },
  joinText: { color: '#fff', fontSize: 13, fontFamily: 'Manrope-Bold' },

  tabWrap: { flexGrow: 0, marginTop: 12 },
  tabRow: { paddingHorizontal: 16, gap: 6 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 10, paddingVertical: 8 },
  tabActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  tabText: { fontSize: 11, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  tabTextActive: { color: '#fff' },
  tabCount: { fontSize: 9, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted, backgroundColor: theme.colors.surfaceMuted, borderRadius: 7, paddingHorizontal: 5, paddingVertical: 1 },
  tabCountActive: { color: '#fff', backgroundColor: 'rgba(255,255,255,0.22)' },

  section: { padding: 16, paddingBottom: 28 },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, padding: 14, marginBottom: 10 },
  cardTitle: { fontSize: 10, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  body: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.text, lineHeight: 18 },
  muted: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 3 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ratingBig: { fontSize: 34, fontFamily: 'Manrope-ExtraBold', color: '#f59e0b' },
  starRow: { flexDirection: 'row', gap: 2 },
});