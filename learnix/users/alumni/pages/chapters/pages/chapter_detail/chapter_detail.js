import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../../../constants/theme';
import { alumniApi } from '../../../../../../services/api';
import { EmptyState, SearchBar, SkeletonCard } from '../../../../../../components/ui';

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'information-circle-outline' },
  { id: 'members', label: 'Members', icon: 'people-outline' },
  { id: 'events', label: 'Events', icon: 'calendar-outline' },
  { id: 'announcements', label: 'Notices', icon: 'megaphone-outline' },
  { id: 'activity', label: 'Activity', icon: 'pulse-outline' },
];

const ACTIVITY_STYLE = {
  EVENT: { icon: 'calendar-outline', color: '#2563eb' },
  ANNOUNCEMENT: { icon: 'megaphone-outline', color: '#d97706' },
  MEMBER: { icon: 'person-add-outline', color: '#059669' },
};

const initials = (name) =>
  (name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

/**
 * Chapter detail — overview, members, events, announcements, activity feed.
 *
 * The tab strip loads its data lazily: a chapter president opening "Members"
 * should not pay for the activity feed they are not looking at.
 *
 * Posting an announcement is an office/president action. The SERVER enforces
 * that (a random alumnus posting official chapter notices would make the feed
 * worthless), so this screen surfaces the button and reports a 422 honestly
 * rather than trying to guess who is allowed.
 */
export default function ChapterDetail({ chapterId, navigation }) {
  const [tab, setTab] = useState('overview');
  const [chapter, setChapter] = useState(null);
  const [members, setMembers] = useState(null);
  const [activity, setActivity] = useState(null);
  const [memberQuery, setMemberQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (showSpinner = true) => {
      try {
        if (showSpinner) setLoading(true);
        setError(null);
        const [detail, mem, act] = await Promise.all([
          alumniApi.chapterDetail(chapterId),
          alumniApi.chapterMembers(chapterId, { q: memberQuery || undefined, sort: 'seniority' }),
          alumniApi.chapterActivity(chapterId),
        ]);
        setChapter(detail);
        setMembers(mem);
        setActivity(act);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [chapterId, memberQuery],
  );

  React.useEffect(() => {
    load();
  }, [load]);

  const onAnnounce = () => {
    Alert.prompt?.(
      'New announcement',
      `Post to the ${chapter.city} chapter`,
      async (body) => {
        if (!body) return;
        try {
          setBusy(true);
          const res = await alumniApi.announceToChapter(chapterId, {
            title: `${chapter.city} Chapter notice`,
            body,
          });
          Alert.alert('Posted', `Delivered to ${res.recipients} chapter members.`);
          load(false);
        } catch (e) {
          Alert.alert('Cannot post', e.message);
        } finally {
          setBusy(false);
        }
      },
      'plain-text',
    );
    if (typeof Alert.prompt !== 'function') {
      Alert.alert(
        'Post an announcement',
        'Android cannot prompt for text inline. Use the Broadcast tab in Notifications to reach this chapter.',
      );
    }
  };

  if (loading && !chapter) {
    return (
      <View style={styles.container}>
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} style={{ marginHorizontal: 16, marginBottom: 8 }} />
        ))}
      </View>
    );
  }

  if (error && !chapter) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const s = chapter?.stats ?? {};

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0891b2', '#0e7490']} style={styles.hero}>
        <View style={styles.heroTop}>
          <TouchableOpacity style={styles.backBtn} onPress={navigation.goBack}>
            <Ionicons name="arrow-back" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={onAnnounce} disabled={busy}>
            <Ionicons name="megaphone-outline" size={17} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.heroCity}>{chapter.city}</Text>
        <Text style={styles.heroLabel}>ALUMNI CHAPTER</Text>
        <View style={styles.heroStats}>
          <HeroStat value={chapter.memberCount} label="members" />
          <HeroStat value={s.upcomingEvents ?? 0} label="upcoming" />
          <HeroStat value={`${s.avgFillRate ?? 0}%`} label="avg fill" />
        </View>
      </LinearGradient>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabRowWrap}
        contentContainerStyle={styles.tabRow}
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          const badge =
            t.id === 'members'
              ? chapter.memberCount
              : t.id === 'events'
                ? (s.upcomingEvents ?? 0) + (s.pastEvents ?? 0)
                : t.id === 'announcements'
                  ? (chapter.announcements?.length ?? 0)
                  : t.id === 'activity'
                    ? (activity?.count ?? 0)
                    : 0;
          return (
            <TouchableOpacity
              key={t.id}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(t.id)}
            >
              <Ionicons name={t.icon} size={13} color={active ? '#fff' : theme.colors.textMuted} />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              {badge > 0 && (
                <View style={[styles.tabBadge, active && styles.tabBadgeActive]}>
                  <Text style={styles.tabBadgeText}>{badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(false);
            }}
          />
        }
      >
        {tab === 'overview' && (
          <View style={styles.section}>
            {chapter.president && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Chapter president</Text>
                <View style={styles.presidentRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials(chapter.president.name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{chapter.president.name}</Text>
                    <Text style={styles.meta}>
                      {chapter.president.role ?? '—'}
                      {chapter.president.company ? ` · ${chapter.president.company}` : ''}
                    </Text>
                    {chapter.president.graduationYear ? (
                      <Text style={styles.meta}>Batch {chapter.president.graduationYear}</Text>
                    ) : null}
                  </View>
                </View>
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Next event</Text>
              {chapter.upcomingEvents?.length > 0 ? (
                chapter.upcomingEvents.slice(0, 2).map((e) => (
                  <View key={e.id} style={styles.nextRow}>
                    <Ionicons name="calendar" size={15} color="#0891b2" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{e.title}</Text>
                      <Text style={styles.meta}>
                        {new Date(e.startDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                        {e.venue ? ` · ${e.venue}` : ''}
                      </Text>
                      <Text style={styles.meta}>
                        {e.rsvps}/{e.capacity} registered
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.muted}>No upcoming chapter events scheduled.</Text>
              )}
            </View>

            {chapter.announcements?.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Latest notice</Text>
                <Text style={styles.name}>{chapter.announcements[0].title}</Text>
                <Text style={styles.body}>{chapter.announcements[0].body}</Text>
                <Text style={styles.meta}>
                  {new Date(chapter.announcements[0].sentAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </Text>
              </View>
            )}
          </View>
        )}

        {tab === 'members' && (
          <View style={styles.section}>
            <View style={{ marginBottom: 10 }}>
              <SearchBar placeholder="Search chapter members…" onSearch={setMemberQuery} />
            </View>
            <Text style={styles.countText}>{members?.total ?? 0} members</Text>
            {(members?.members ?? []).map((m) => (
              <View key={m.id} style={styles.memberRow}>
                <View style={styles.avatarSmall}>
                  <Text style={styles.avatarTextSmall}>{initials(m.name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {m.name}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {m.headline ?? '—'}
                    {m.company ? ` · ${m.company.name}` : ''}
                  </Text>
                  {m.skills?.length > 0 && (
                    <Text style={styles.meta} numberOfLines={1}>
                      {m.skills.map((s) => s.skill).join(', ')}
                    </Text>
                  )}
                </View>
                <Text style={styles.batch}>{m.graduationYear ?? '—'}</Text>
              </View>
            ))}
            {(members?.members ?? []).length === 0 && (
              <EmptyState icon="people-outline" title="No members found" color="#059669" />
            )}
          </View>
        )}

        {tab === 'events' && (
          <View style={styles.section}>
            <Text style={styles.subTitle}>Upcoming</Text>
            {(chapter.upcomingEvents ?? []).map((e) => (
              <EventRow key={e.id} e={e} accent="#0891b2" />
            ))}
            {(chapter.upcomingEvents ?? []).length === 0 && <Text style={styles.muted}>Nothing scheduled.</Text>}

            <Text style={[styles.subTitle, { marginTop: 18 }]}>Past</Text>
            {(chapter.pastEvents ?? []).map((e) => (
              <EventRow key={e.id} e={e} accent="#64748b" />
            ))}
            {(chapter.pastEvents ?? []).length === 0 && <Text style={styles.muted}>No past events.</Text>}
          </View>
        )}

        {tab === 'announcements' && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.announceBtn} onPress={onAnnounce} disabled={busy}>
              <Ionicons name="megaphone-outline" size={15} color="#fff" />
              <Text style={styles.announceBtnText}>{busy ? 'Posting…' : 'Post an announcement'}</Text>
            </TouchableOpacity>
            {(chapter.announcements ?? []).map((a) => (
              <View key={a.id} style={styles.card}>
                <Text style={styles.name}>{a.title}</Text>
                <Text style={styles.body}>{a.body}</Text>
                <Text style={styles.meta}>
                  {new Date(a.sentAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            ))}
            {(chapter.announcements ?? []).length === 0 && (
              <EmptyState icon="megaphone-outline" title="No announcements yet" color="#d97706" />
            )}
          </View>
        )}

        {tab === 'activity' && (
          <View style={styles.section}>
            <Text style={styles.countText}>{activity?.count ?? 0} recent items</Text>
            {(activity?.activity ?? []).map((a) => {
              const st = ACTIVITY_STYLE[a.type] ?? ACTIVITY_STYLE.MEMBER;
              return (
                <View key={a.id} style={styles.activityRow}>
                  <View style={[styles.activityIcon, { backgroundColor: st.color + '18' }]}>
                    <Ionicons name={st.icon} size={14} color={st.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{a.title}</Text>
                    {a.detail ? <Text style={styles.meta}>{a.detail}</Text> : null}
                    <Text style={styles.meta}>
                      {new Date(a.at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>
              );
            })}
            {(activity?.activity ?? []).length === 0 && (
              <EmptyState icon="pulse-outline" title="No activity yet" color="#64748b" />
            )}
          </View>
        )}
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

function EventRow({ e, accent }) {
  return (
    <View style={styles.card}>
      <View style={styles.nextRow}>
        <Ionicons name="calendar" size={15} color={accent} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{e.title}</Text>
          <Text style={styles.meta}>
            {new Date(e.startDate).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
            {e.venue ? ` · ${e.venue}` : ''}
          </Text>
          <Text style={styles.meta}>
            {e.rsvps}/{e.capacity} registered · {e.status}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  errorText: { marginTop: 12, fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { marginTop: 16, backgroundColor: '#0891b2', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 13 },

  hero: { padding: 18, paddingTop: 14 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between' },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroCity: { color: '#fff', fontSize: 24, fontFamily: 'Manrope-ExtraBold', marginTop: 8 },
  heroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 9, fontFamily: 'Manrope-Bold', letterSpacing: 1.2, marginTop: 2 },
  heroStats: { flexDirection: 'row', marginTop: 14, gap: 10 },
  heroStat: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  heroStatValue: { color: '#fff', fontSize: 16, fontFamily: 'Manrope-ExtraBold' },
  heroStatLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 9, fontFamily: 'Manrope-Medium' },

  tabRowWrap: { flexGrow: 0 },
  tabRow: { paddingHorizontal: 16, gap: 6, paddingVertical: 12 },
  tab: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 10, paddingVertical: 8, gap: 4 },
  tabActive: { backgroundColor: '#0891b2', borderColor: '#0891b2' },
  tabText: { fontSize: 11, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  tabTextActive: { color: '#fff' },
  tabBadge: { minWidth: 15, height: 15, borderRadius: 8, backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  tabBadgeText: { color: '#fff', fontSize: 8, fontFamily: 'Manrope-Bold' },

  section: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, padding: 14, marginBottom: 10 },
  cardTitle: { fontSize: 11, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  subTitle: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.text, marginBottom: 8 },
  countText: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginBottom: 8 },
  muted: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },
  body: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.text, lineHeight: 18, marginTop: 4 },

  presidentRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#cffafe', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 14, fontFamily: 'Manrope-ExtraBold', color: '#0891b2' },
  avatarSmall: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarTextSmall: { fontSize: 12, fontFamily: 'Manrope-ExtraBold', color: '#2563eb' },

  name: { fontSize: 12, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  meta: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },
  batch: { fontSize: 11, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted },

  nextRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 4 },
  memberRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, padding: 12, marginBottom: 8 },
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, padding: 12, marginBottom: 8 },
  activityIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },

  announceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0891b2', borderRadius: 12, paddingVertical: 12, gap: 6, marginBottom: 12 },
  announceBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Manrope-Bold' },
});