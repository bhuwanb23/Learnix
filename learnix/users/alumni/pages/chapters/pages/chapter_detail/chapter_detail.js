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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../../../constants/theme';
import { alumniApi } from '../../../../../../services/api';
import { EmptyState, SearchBar, SkeletonCard } from '../../../../../../components/ui';

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'information-circle-outline' },
  { id: 'leadership', label: 'Team', icon: 'ribbon-outline' },
  { id: 'members', label: 'Members', icon: 'people-outline' },
  { id: 'initiatives', label: 'Initiatives', icon: 'rocket-outline' },
  { id: 'events', label: 'Events', icon: 'calendar-outline' },
  { id: 'announcements', label: 'Notices', icon: 'megaphone-outline' },
  { id: 'performance', label: 'Performance', icon: 'stats-chart-outline' },
  { id: 'activity', label: 'Activity', icon: 'pulse-outline' },
];

const ACTIVITY_STYLE = {
  EVENT: { icon: 'calendar-outline', color: '#2563eb' },
  ANNOUNCEMENT: { icon: 'megaphone-outline', color: '#d97706' },
  MEMBER: { icon: 'person-add-outline', color: '#059669' },
  INITIATIVE: { icon: 'rocket-outline', color: '#7c3aed' },
  LEADERSHIP: { icon: 'ribbon-outline', color: '#0891b2' },
};

const OFFICER_ROLE = [
  'PRESIDENT',
  'VICE_PRESIDENT',
  'SECRETARY',
  'TREASURER',
  'COORDINATOR',
];
const OFFICER_LABEL = {
  PRESIDENT: 'President',
  VICE_PRESIDENT: 'Vice President',
  SECRETARY: 'Secretary',
  TREASURER: 'Treasurer',
  COORDINATOR: 'Coordinator',
};
const OFFICER_COLOR = {
  PRESIDENT: '#7c3aed',
  VICE_PRESIDENT: '#2563eb',
  SECRETARY: '#0891b2',
  TREASURER: '#059669',
  COORDINATOR: '#d97706',
};

const INITIATIVE_CATEGORY = {
  MENTORSHIP: { icon: 'hand-left-outline', color: '#2563eb' },
  SCHOLARSHIP: { icon: 'school-outline', color: '#7c3aed' },
  OUTREACH: { icon: 'globe-outline', color: '#059669' },
  FUNDRAISING: { icon: 'gift-outline', color: '#d97706' },
  SOCIAL: { icon: 'people-outline', color: '#0891b2' },
};

const STATUS_COLOR = { PLANNED: '#64748b', ACTIVE: '#2563eb', COMPLETED: '#059669', CANCELLED: '#94a3b8' };

const initials = (name) =>
  (name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const tenure = (days) => {
  if (days == null) return '—';
  if (days >= 730) return `${Math.round(days / 365)} yr`;
  if (days >= 365) return '1 yr';
  if (days >= 60) return `${Math.round(days / 30)} mo`;
  return `${days} d`;
};

/**
 * Chapter detail — overview, leadership, members, initiatives, events,
 * announcements, performance, activity.
 *
 * Every permission on this screen comes from the server's `viewerContext`.
 * Deciding "am I an officer?" here would let the UI show an Assign button that
 * the backend rejects with a 403 — the kind of thing that makes a role-based app
 * feel broken rather than locked down.
 */
export default function ChapterDetail({ chapterId, navigation }) {
  const [tab, setTab] = useState('overview');
  const [chapter, setChapter] = useState(null);
  const [members, setMembers] = useState(null);
  const [activity, setActivity] = useState(null);
  const [officers, setOfficers] = useState(null);
  const [initiatives, setInitiatives] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [memberQuery, setMemberQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  // Non-null opens the compose sheet: { kind: 'initiative' | 'announcement', ... }
  const [composer, setComposer] = useState(null);

  const load = useCallback(
    async (showSpinner = true) => {
      try {
        if (showSpinner) setLoading(true);
        setError(null);
        const [detail, mem, act, off, init, perf] = await Promise.all([
          alumniApi.chapterDetail(chapterId),
          alumniApi.chapterMembers(chapterId, { q: memberQuery || undefined, sort: 'seniority' }),
          alumniApi.chapterActivity(chapterId),
          alumniApi.chapterOfficers(chapterId, true),
          alumniApi.chapterInitiatives(chapterId),
          alumniApi.chapterPerformance(chapterId),
        ]);
        setChapter(detail);
        setMembers(mem);
        setActivity(act);
        setOfficers(off);
        setInitiatives(init);
        setPerformance(perf);
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

  const vc = chapter?.viewerContext ?? {};
  const canManage = !!vc.canManageOfficers || !!vc.canManageInitiatives;

  // ── Membership actions ──
  const onJoin = async () => {
    try {
      setBusy(true);
      const res = await alumniApi.joinChapter(chapterId);
      Alert.alert('Joined', `You are now a member of the ${res.city} chapter (${res.memberCount} members).`);
      load(false);
    } catch (e) {
      // The server refuses a second chapter with a message naming the current
      // one, which is far more useful than a generic failure.
      Alert.alert('Cannot join', e.message);
    } finally {
      setBusy(false);
    }
  };

  const onLeave = () => {
    Alert.alert('Leave chapter?', 'You will stop receiving chapter announcements and events.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);
            const res = await alumniApi.leaveChapter(chapterId);
            Alert.alert('Left', `You have left the ${res.city} chapter.`);
            load(false);
          } catch (e) {
            Alert.alert('Cannot leave', e.message);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  // ── Officer actions (office only) ──
  const onAssignOfficer = () => {
    const options = (members?.members ?? []).map((m) => `${m.name} (${m.graduationYear ?? '—'})`);
    if (options.length === 0) {
      Alert.alert('No members', 'A member must join the chapter before holding office.');
      return;
    }
    Alert.alert('Appoint officer', 'Choose a member. They will be notified.', [
      ...OFFICER_ROLE.map((role) => ({
        text: `Appoint ${OFFICER_LABEL[role]}`,
        onPress: () => {
          Alert.alert(`Appoint ${OFFICER_LABEL[role]}`, 'Select the member', [
            ...options.slice(0, 12).map((label, i) => ({
              text: label,
              onPress: async () => {
                try {
                  setBusy(true);
                  const res = await alumniApi.assignChapterOfficer(chapterId, {
                    profileId: members.members[i].id,
                    role,
                  });
                  Alert.alert(
                    'Appointed',
                    `${res.officer} is now ${OFFICER_LABEL[role]}${
                      res.replaced ? `, replacing ${res.replaced}` : ''
                    }.`,
                  );
                  load(false);
                } catch (e) {
                  Alert.alert('Cannot appoint', e.message);
                } finally {
                  setBusy(false);
                }
              },
            })),
            { text: 'Cancel', style: 'cancel' },
          ]);
        },
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const onResign = (officer) => {
    Alert.alert(`Resign ${OFFICER_LABEL[officer.role]}?`, `${officer.person.name} will step down.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Resign',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);
            await alumniApi.resignChapterOfficer(chapterId, officer.id, 'Stepped down from the committee.');
            Alert.alert('Resigned', `${officer.person.name} is no longer ${OFFICER_LABEL[officer.role]}.`);
            load(false);
          } catch (e) {
            Alert.alert('Cannot resign', e.message);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  // ── Initiative actions ──
  // ── Compose sheet ──
  // A modal rather than Alert.prompt: prompt() only exists on iOS, so on Android
  // "New initiative" and "Post an announcement" had no way to collect text at all
  // and fell through to an apology telling the user to go elsewhere.
  const onCreateInitiative = () =>
    setComposer({ kind: 'initiative', title: '', body: '', category: 'SOCIAL', target: '10' });

  const onAnnounce = () =>
    setComposer({ kind: 'announcement', title: `${chapter.city} Chapter notice`, body: '' });

  const submitComposer = async () => {
    const c = composer;
    // Mirrors the server's min(3) so an obviously-too-short title is caught
    // before the round trip; the server still has the final say.
    if (!c.title || c.title.trim().length < 3) {
      Alert.alert('Check the title', 'A title of at least 3 characters is required.');
      return;
    }
    try {
      setBusy(true);
      if (c.kind === 'initiative') {
        const target = parseInt(c.target, 10);
        await alumniApi.createChapterInitiative(chapterId, {
          title: c.title.trim(),
          description: c.body.trim() || undefined,
          category: c.category,
          // Blank target means open-ended, which the UI renders without a bar.
          targetCount: Number.isFinite(target) && target > 0 ? target : undefined,
        });
        Alert.alert('Created', 'The initiative was added as PLANNED.');
      } else {
        if (!c.body || c.body.trim().length < 3) {
          Alert.alert('Check the message', 'Write at least 3 characters.');
          setBusy(false);
          return;
        }
        const res = await alumniApi.announceToChapter(chapterId, {
          title: c.title.trim(),
          body: c.body.trim(),
        });
        Alert.alert('Posted', `Delivered to ${res.recipients} chapter members.`);
      }
      setComposer(null);
      load(false);
    } catch (e) {
      Alert.alert('Cannot save', e.message);
    } finally {
      setBusy(false);
    }
  };

  const onAdvanceInitiative = async (init) => {
    const next =
      init.status === 'PLANNED' ? 'ACTIVE' : init.status === 'ACTIVE' ? 'COMPLETED' : null;
    if (!next) return;
    try {
      setBusy(true);
      // Bump the count alongside the status so a completed initiative actually
      // reads as complete.
      const patch = { status: next };
      if (next === 'COMPLETED' && init.targetCount) patch.achievedCount = init.targetCount;
      else if (next === 'ACTIVE') patch.achievedCount = Math.max(1, init.achievedCount);
      await alumniApi.updateChapterInitiative(chapterId, init.id, patch);
      load(false);
    } catch (e) {
      Alert.alert('Cannot update', e.message);
    } finally {
      setBusy(false);
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
  const p = performance ?? {};
  const eng = p.engagement ?? {};

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0891b2', '#0e7490']} style={styles.hero}>
        <View style={styles.heroTop}>
          <TouchableOpacity style={styles.backBtn} onPress={navigation.goBack}>
            <Ionicons name="arrow-back" size={18} color="#fff" />
          </TouchableOpacity>
          <View style={styles.heroActions}>
            {vc.canPost && (
              <TouchableOpacity style={styles.backBtn} onPress={onAnnounce} disabled={busy}>
                <Ionicons name="megaphone-outline" size={17} color="#fff" />
              </TouchableOpacity>
            )}
            {/* Membership: exactly one of these is offered, per viewerContext. */}
            {vc.canJoin && (
              <TouchableOpacity style={[styles.heroBtn, styles.heroJoin]} onPress={onJoin} disabled={busy}>
                <Ionicons name="add-circle-outline" size={14} color="#fff" />
                <Text style={styles.heroBtnText}>{busy ? 'Joining…' : 'Join'}</Text>
              </TouchableOpacity>
            )}
            {vc.canLeave && (
              <TouchableOpacity style={[styles.heroBtn, styles.heroLeave]} onPress={onLeave} disabled={busy}>
                <Ionicons name="exit-outline" size={14} color="#fff" />
                <Text style={styles.heroBtnText}>Leave</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.cityRow}>
          <Text style={styles.heroCity}>{chapter.city}</Text>
          <View style={styles.heroTier}>
            <Text style={styles.heroTierText}>
              {chapter.tier === 'REGIONAL' ? 'Regional' : 'Local'}
            </Text>
          </View>
        </View>
        {chapter.region ? <Text style={styles.heroRegion}>{chapter.region}</Text> : null}
        <View style={styles.heroStats}>
          <HeroStat value={chapter.memberCount} label="members" />
          <HeroStat value={s.upcomingEvents ?? 0} label="upcoming" />
          <HeroStat value={chapter.initiativeCount ?? 0} label="initiatives" />
          <HeroStat value={`${eng.score ?? 0}`} label="engagement" />
        </View>
      </LinearGradient>

      {vc.isMember && (
        <View style={styles.memberBanner}>
          <Ionicons name="checkmark-circle" size={14} color="#059669" />
          <Text style={styles.memberBannerText}>
            {vc.isOfficer ? `You are ${vc.officerRoles.map((r) => OFFICER_LABEL[r]).join(', ')}` : 'You are a member'}
          </Text>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabRowWrap}
        contentContainerStyle={styles.tabRow}
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          const badge = badgeFor(t.id, { chapter, members, initiatives, activity, officers, performance });
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
        {/* ── Overview ── */}
        {tab === 'overview' && (
          <View style={styles.section}>
            {chapter.description ? <Text style={styles.description}>{chapter.description}</Text> : null}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Chapter facts</Text>
              <FactRow label="Region" value={chapter.region ?? '—'} />
              <FactRow label="Type" value={chapter.tier === 'REGIONAL' ? 'Regional hub' : 'Local chapter'} />
              <FactRow label="Meets" value={chapter.meetingFrequency ?? '—'} />
              <FactRow label="Committee" value={`${chapter.leadership?.count ?? 0} officer(s)`} />
              <FactRow label="Next event" value={fmtDate(chapter.nextEventAt)} />
            </View>

            {chapter.president ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Chapter president</Text>
                <View style={styles.personRow}>
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
            ) : (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Chapter president</Text>
                <Text style={styles.muted}>No president appointed.</Text>
              </View>
            )}

            {chapter.upcomingEvents?.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Next event</Text>
                {chapter.upcomingEvents.slice(0, 2).map((e) => (
                  <View key={e.id} style={styles.eventRow}>
                    <Ionicons name="calendar" size={15} color="#0891b2" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{e.title}</Text>
                      <Text style={styles.meta}>
                        {fmtDate(e.startDate)}
                        {e.venue ? ` · ${e.venue}` : ''}
                      </Text>
                      <Text style={styles.meta}>
                        {e.rsvps}/{e.capacity} registered
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {chapter.announcements?.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Latest notice</Text>
                <Text style={styles.name}>{chapter.announcements[0].title}</Text>
                <Text style={styles.body}>{chapter.announcements[0].body}</Text>
                <Text style={styles.meta}>{fmtDate(chapter.announcements[0].sentAt)}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Leadership ── */}
        {tab === 'leadership' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.subTitle}>Committee</Text>
              {vc.canManageOfficers && (
                <TouchableOpacity onPress={onAssignOfficer} disabled={busy}>
                  <Text style={styles.linkAction}>Appoint</Text>
                </TouchableOpacity>
              )}
            </View>

            {(officers?.officers ?? []).filter((o) => o.isCurrent).map((o) => (
              <View key={o.id} style={styles.card}>
                <View style={styles.personRow}>
                  <View style={[styles.avatar, { backgroundColor: (OFFICER_COLOR[o.role] ?? '#0891b2') + '18' }]}>
                    <Text style={[styles.avatarText, { color: OFFICER_COLOR[o.role] ?? '#0891b2' }]}>
                      {initials(o.person.name)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{o.person.name}</Text>
                    <Text style={styles.meta}>
                      {o.person.role ?? '—'}
                      {o.person.company ? ` · ${o.person.company}` : ''}
                    </Text>
                  </View>
                  <View style={styles.officerRight}>
                    <View style={[styles.roleChip, { backgroundColor: (OFFICER_COLOR[o.role] ?? '#0891b2') + '18' }]}>
                      <Text style={[styles.roleChipText, { color: OFFICER_COLOR[o.role] ?? '#0891b2' }]}>
                        {OFFICER_LABEL[o.role] ?? o.role}
                      </Text>
                    </View>
                    <Text style={styles.meta}>{tenure(o.tenureDays)}</Text>
                  </View>
                </View>
                {vc.canManageOfficers && o.role !== 'PRESIDENT' && (
                  <TouchableOpacity style={styles.resignBtn} onPress={() => onResign(o)} disabled={busy}>
                    <Text style={styles.resignText}>Resign from role</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {(officers?.vacantRoles ?? []).length > 0 && (
              <View style={[styles.card, styles.vacantCard]}>
                <Text style={styles.cardTitle}>Vacant seats</Text>
                <View style={styles.chipWrap}>
                  {(officers?.vacantRoles ?? []).map((r) => (
                    <View key={r} style={styles.vacantChip}>
                      <Text style={styles.vacantText}>{OFFICER_LABEL[r] ?? r}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {(officers?.counts?.past ?? 0) > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Previous committee</Text>
                {(officers?.officers ?? [])
                  .filter((o) => !o.isCurrent)
                  .map((o) => (
                    <View key={o.id} style={styles.pastRow}>
                      <Ionicons name="time-outline" size={14} color="#94a3b8" />
                      <Text style={styles.pastText}>
                        {o.person.name} — {OFFICER_LABEL[o.role] ?? o.role}, until {fmtDate(o.until)}
                      </Text>
                    </View>
                  ))}
              </View>
            )}
          </View>
        )}

        {/* ── Members ── */}
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
                      {m.skills.map((x) => x.skill).join(', ')}
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

        {/* ── Initiatives ── */}
        {tab === 'initiatives' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.subTitle}>Initiatives & activities</Text>
              {vc.canManageInitiatives && (
                <TouchableOpacity onPress={onCreateInitiative} disabled={busy}>
                  <Text style={styles.linkAction}>New</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.miniStats}>
              <MiniStat label="Active" value={initiatives?.stats?.active ?? 0} />
              <MiniStat label="Planned" value={initiatives?.stats?.planned ?? 0} />
              <MiniStat label="Completed" value={initiatives?.stats?.completed ?? 0} />
              <MiniStat
                label="Avg progress"
                value={initiatives?.stats?.avgCompletion === null || initiatives?.stats?.avgCompletion === undefined ? '—' : `${initiatives.stats.avgCompletion}%`}
              />
            </View>

            {(initiatives?.initiatives ?? []).map((i) => {
              const cat = INITIATIVE_CATEGORY[i.category] ?? INITIATIVE_CATEGORY.SOCIAL;
              return (
                <View key={i.id} style={styles.card}>
                  <View style={styles.personRow}>
                    <View style={[styles.avatarSmall, { backgroundColor: cat.color + '18' }]}>
                      <Ionicons name={cat.icon} size={16} color={cat.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{i.title}</Text>
                      <Text style={styles.meta} numberOfLines={2}>
                        {i.description ?? ''}
                      </Text>
                    </View>
                    <View style={[styles.roleChip, { backgroundColor: (STATUS_COLOR[i.status] ?? '#64748b') + '18' }]}>
                      <Text style={[styles.roleChipText, { color: STATUS_COLOR[i.status] ?? '#64748b' }]}>
                        {i.status}
                      </Text>
                    </View>
                  </View>

                  {/* percent is null for open-ended initiatives — no bar, and the
                      reason is shown instead of a misleading 0%. */}
                  {i.percent !== null && i.percent !== undefined ? (
                    <View style={styles.progressBlock}>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${i.percent}%`, backgroundColor: cat.color }]} />
                      </View>
                      <Text style={styles.progressText}>
                        {i.achievedCount}/{i.targetCount} · {i.percent}%
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.meta}>Open-ended · {i.achievedCount} so far</Text>
                  )}

                  <View style={styles.initiativeFooter}>
                    {i.owner ? <Text style={styles.meta}>Owner: {i.owner.name}</Text> : null}
                    {i.targetDate ? (
                      <Text style={[styles.meta, i.isOverdue && { color: '#dc2626' }]}>
                        {i.isOverdue ? 'Overdue · ' : 'Due '}
                        {fmtDate(i.targetDate)}
                      </Text>
                    ) : null}
                  </View>

                  {i.campaign ? (
                    <View style={styles.campaignBox}>
                      <Text style={styles.meta}>
                        Linked campaign: {i.campaign.name} — ₹{i.campaign.raisedRupees.toLocaleString('en-IN')} of ₹
                        {i.campaign.targetRupees.toLocaleString('en-IN')} ({i.campaign.percent}%)
                      </Text>
                    </View>
                  ) : null}

                  {vc.canManageInitiatives && i.status !== 'COMPLETED' && i.status !== 'CANCELLED' && (
                    <TouchableOpacity style={styles.resignBtn} onPress={() => onAdvanceInitiative(i)} disabled={busy}>
                      <Text style={styles.linkAction}>
                        {i.status === 'PLANNED' ? 'Start initiative' : 'Mark complete'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
            {(initiatives?.initiatives ?? []).length === 0 && (
              <EmptyState icon="rocket-outline" title="No initiatives yet" color="#7c3aed" />
            )}
          </View>
        )}

        {/* ── Events ── */}
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

        {/* ── Announcements ── */}
        {tab === 'announcements' && (
          <View style={styles.section}>
            {vc.canPost && (
              <TouchableOpacity style={styles.announceBtn} onPress={onAnnounce} disabled={busy}>
                <Ionicons name="megaphone-outline" size={15} color="#fff" />
                <Text style={styles.announceBtnText}>{busy ? 'Posting…' : 'Post an announcement'}</Text>
              </TouchableOpacity>
            )}
            {(chapter.announcements ?? []).map((a) => (
              <View key={a.id} style={styles.card}>
                <Text style={styles.name}>{a.title}</Text>
                <Text style={styles.body}>{a.body}</Text>
                <Text style={styles.meta}>{fmtDate(a.sentAt)}</Text>
              </View>
            ))}
            {(chapter.announcements ?? []).length === 0 && (
              <EmptyState icon="megaphone-outline" title="No announcements yet" color="#d97706" />
            )}
          </View>
        )}

        {/* ── Performance ── */}
        {tab === 'performance' && (
          <View style={styles.section}>
            <View style={styles.scoreCard}>
              <Text style={styles.scoreValue}>{eng.score ?? 0}</Text>
              <Text style={styles.scoreLabel}>ENGAGEMENT SCORE</Text>
              <Text style={styles.scoreNote}>{eng.note}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Participation</Text>
              <Bar label="Members who attended (12 mo)" value={p.participation?.rate ?? 0} />
              <Bar label="Event fill rate" value={p.participation?.avgFillRate ?? 0} />
              <Bar label="Attendance vs sign-ups" value={p.participation?.attendanceRate ?? 0} />
              <View style={styles.factGrid}>
                <FactChip label="Unique attendees" value={String(p.participation?.uniqueAttendees12mo ?? 0)} />
                <FactChip label="Active in 90 days" value={String(p.participation?.participants90d ?? 0)} />
                <FactChip label="Events (12 mo)" value={String(p.participation?.events12mo ?? 0)} />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Membership</Text>
              <FactRow label="Total members" value={String(p.members?.total ?? 0)} />
              <FactRow label="New in 12 months" value={String(p.members?.newIn12Months ?? 0)} />
              <FactRow
                label="Members per officer"
                value={p.members?.perOfficer === null || p.members?.perOfficer === undefined ? '—' : String(p.members.perOfficer)}
              />
              <FactRow label="Officers" value={String(p.leadership?.officers ?? 0)} />
              <FactRow label="Vacant seats" value={String(p.leadership?.vacantRoles ?? 0)} />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Contribution</Text>
              <FactRow
                label="Received"
                value={`₹${(p.giving?.receivedRupees ?? 0).toLocaleString('en-IN')}`}
              />
              <FactRow
                label="Pledged"
                value={`₹${(p.giving?.pledgedRupees ?? 0).toLocaleString('en-IN')}`}
              />
              <FactRow
                label="Per member"
                value={`₹${(p.giving?.perMemberRupees ?? 0).toLocaleString('en-IN')}`}
              />
              <FactRow label="Active mentors" value={String(p.mentoring?.mentors ?? 0)} />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Event breakdown</Text>
              {(p.eventBreakdown ?? []).map((e) => (
                <View key={e.eventId} style={styles.breakRow}>
                  <Text style={styles.name} numberOfLines={1}>
                    {e.title}
                  </Text>
                  <Text style={styles.meta}>
                    {fmtDate(e.startDate)} · {e.confirmed}/{e.capacity}
                  </Text>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${e.fillRate}%`, backgroundColor: e.isPast ? '#64748b' : '#0891b2' },
                      ]}
                    />
                  </View>
                </View>
              ))}
              {(p.eventBreakdown ?? []).length === 0 && <Text style={styles.muted}>No events yet.</Text>}
            </View>
          </View>
        )}

        {/* ── Activity ── */}
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
                    <Text style={styles.meta}>{fmtDate(a.at)}</Text>
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

      {busy && (
        <View style={styles.busyOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#0891b2" />
        </View>
      )}

      <Modal visible={!!composer} transparent animationType="slide" onRequestClose={() => setComposer(null)}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {composer?.kind === 'initiative' ? 'New initiative' : 'New announcement'}
              </Text>
              <TouchableOpacity onPress={() => setComposer(null)}>
                <Ionicons name="close" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.field}
              value={composer?.title ?? ''}
              onChangeText={(t) => setComposer((c) => ({ ...c, title: t }))}
              placeholder={composer?.kind === 'initiative' ? 'Mentor 50 first-year students' : 'Notice title'}
              placeholderTextColor="#94a3b8"
            />

            {composer?.kind === 'initiative' && (
              <>
                <Text style={styles.fieldLabel}>Category</Text>
                <View style={styles.chipWrap}>
                  {Object.keys(INITIATIVE_CATEGORY).map((k) => {
                    const active = composer.category === k;
                    return (
                      <TouchableOpacity
                        key={k}
                        style={[styles.pickChip, active && styles.pickChipActive]}
                        onPress={() => setComposer((c) => ({ ...c, category: k }))}
                      >
                        <Text style={[styles.pickChipText, active && styles.pickChipTextActive]}>
                          {k}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.fieldLabel}>Target count</Text>
                <TextInput
                  style={styles.field}
                  value={composer?.target ?? ''}
                  onChangeText={(t) => setComposer((c) => ({ ...c, target: t.replace(/[^0-9]/g, '') }))}
                  keyboardType="number-pad"
                  placeholder="Leave blank for open-ended"
                  placeholderTextColor="#94a3b8"
                />
                <Text style={styles.fieldHint}>
                  Blank means open-ended — no progress bar is shown for those.
                </Text>
              </>
            )}

            <Text style={styles.fieldLabel}>
              {composer?.kind === 'initiative' ? 'Description' : 'Message'}
            </Text>
            <TextInput
              style={[styles.field, styles.fieldMultiline]}
              value={composer?.body ?? ''}
              onChangeText={(t) => setComposer((c) => ({ ...c, body: t }))}
              multiline
              textAlignVertical="top"
              placeholder={composer?.kind === 'initiative' ? 'What does done look like?' : 'Write to the chapter…'}
              placeholderTextColor="#94a3b8"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setComposer(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={submitComposer} disabled={busy}>
                <Text style={styles.modalSubmitText}>{busy ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function badgeFor(id, d) {
  switch (id) {
    case 'leadership':
      return d.officers?.officers?.filter((o) => o.isCurrent).length ?? 0;
    case 'members':
      return d.chapter?.memberCount ?? 0;
    case 'initiatives':
      return d.initiatives?.initiatives?.length ?? 0;
    case 'events':
      return (d.chapter?.upcomingEvents?.length ?? 0) + (d.chapter?.pastEvents?.length ?? 0);
    case 'announcements':
      return d.chapter?.announcements?.length ?? 0;
    case 'activity':
      return d.activity?.count ?? 0;
    default:
      return 0;
  }
}

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

function HeroStat({ value, label }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function MiniStat({ label, value }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatValue}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

function FactChip({ label, value }) {
  return (
    <View style={styles.factChip}>
      <Text style={styles.factChipValue}>{value}</Text>
      <Text style={styles.factChipLabel}>{label}</Text>
    </View>
  );
}

function FactRow({ label, value }) {
  return (
    <View style={styles.factRow}>
      <Text style={styles.factRowLabel}>{label}</Text>
      <Text style={styles.factRowValue}>{value}</Text>
    </View>
  );
}

function Bar({ label, value }) {
  return (
    <View style={styles.barBlock}>
      <View style={styles.barHeader}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={styles.barValue}>{value}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.min(100, value)}%`, backgroundColor: '#0891b2' }]} />
      </View>
    </View>
  );
}

function EventRow({ e, accent }) {
  return (
    <View style={styles.card}>
      <View style={styles.eventRow}>
        <Ionicons name="calendar" size={15} color={accent} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{e.title}</Text>
          <Text style={styles.meta}>
            {fmtDate(e.startDate)}
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
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 11, paddingVertical: 7, gap: 4 },
  heroJoin: { backgroundColor: '#059669' },
  heroLeave: { backgroundColor: 'rgba(255,255,255,0.25)' },
  heroBtnText: { color: '#fff', fontSize: 11, fontFamily: 'Manrope-Bold' },
  cityRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  heroCity: { color: '#fff', fontSize: 24, fontFamily: 'Manrope-ExtraBold' },
  heroTier: { marginLeft: 8, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  heroTierText: { color: '#fff', fontSize: 9, fontFamily: 'Manrope-Bold' },
  heroRegion: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontFamily: 'Manrope-Medium', marginTop: 2 },
  heroStats: { flexDirection: 'row', marginTop: 14, gap: 8 },
  heroStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  heroStatValue: { color: '#fff', fontSize: 15, fontFamily: 'Manrope-ExtraBold' },
  heroStatLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 9, fontFamily: 'Manrope-Medium' },

  memberBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ecfdf5', paddingHorizontal: 16, paddingVertical: 7 },
  memberBannerText: { fontSize: 11, fontFamily: 'Manrope-SemiBold', color: '#047857' },

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
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subTitle: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.text, marginBottom: 8 },
  cardTitle: { fontSize: 11, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  countText: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, padding: 14, marginBottom: 10 },
  vacantCard: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  description: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.text, lineHeight: 18, marginBottom: 12 },
  muted: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },
  body: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.text, lineHeight: 18, marginTop: 4 },

  name: { fontSize: 12, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  meta: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },
  batch: { fontSize: 11, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eventRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 4 },
  pastRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  pastText: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },
  avatar: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#cffafe', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontFamily: 'Manrope-ExtraBold', color: '#0891b2' },
  avatarSmall: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  avatarTextSmall: { fontSize: 12, fontFamily: 'Manrope-ExtraBold', color: '#2563eb' },
  officerRight: { alignItems: 'flex-end' },
  roleChip: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  roleChipText: { fontSize: 8, fontFamily: 'Manrope-Bold' },
  resignBtn: { marginTop: 10, alignSelf: 'flex-start' },
  resignText: { fontSize: 11, fontFamily: 'Manrope-SemiBold', color: '#dc2626' },
  linkAction: { fontSize: 12, fontFamily: 'Manrope-Bold', color: '#0891b2' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  vacantChip: { backgroundColor: '#fef3c7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  vacantText: { fontSize: 10, fontFamily: 'Manrope-SemiBold', color: '#b45309' },

  memberRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, padding: 12, marginBottom: 8 },
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, padding: 12, marginBottom: 8 },
  activityIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },

  miniStats: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  miniStat: { flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, padding: 10, alignItems: 'center' },
  miniStatValue: { fontSize: 14, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  miniStatLabel: { fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },

  progressBlock: { marginTop: 10 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: theme.colors.surfaceMuted, overflow: 'hidden', marginTop: 6 },
  progressFill: { height: 6, borderRadius: 3 },
  progressText: { fontSize: 10, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted, marginTop: 4 },
  initiativeFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  campaignBox: { backgroundColor: '#fffbeb', borderRadius: 8, padding: 8, marginTop: 8 },
  breakRow: { marginBottom: 12 },

  scoreCard: { backgroundColor: '#0891b2', borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 12 },
  scoreValue: { color: '#fff', fontSize: 40, fontFamily: 'Manrope-ExtraBold' },
  scoreLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 9, fontFamily: 'Manrope-Bold', letterSpacing: 1.2, marginTop: 2 },
  scoreNote: { color: 'rgba(255,255,255,0.9)', fontSize: 10, fontFamily: 'Manrope-Medium', textAlign: 'center', marginTop: 8, lineHeight: 15 },

  barBlock: { marginBottom: 12 },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  barLabel: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.text },
  barValue: { fontSize: 11, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  factRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  factRowLabel: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },
  factRowValue: { fontSize: 11, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  factGrid: { flexDirection: 'row', gap: 8, marginTop: 10 },
  factChip: { flex: 1, backgroundColor: theme.colors.surfaceMuted, borderRadius: 10, padding: 8, alignItems: 'center' },
  factChipValue: { fontSize: 13, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  factChipLabel: { fontSize: 8, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', marginTop: 2 },

  announceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0891b2', borderRadius: 12, paddingVertical: 12, gap: 6, marginBottom: 12 },
  announceBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Manrope-Bold' },

  busyOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 28 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 15, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  fieldLabel: { fontSize: 10, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5, marginTop: 10 },
  fieldHint: { fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 4 },
  field: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.text, backgroundColor: '#fff' },
  fieldMultiline: { minHeight: 88 },
  pickChip: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  pickChipActive: { backgroundColor: '#0891b2', borderColor: '#0891b2' },
  pickChipText: { fontSize: 10, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted },
  pickChipTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  modalCancel: { flex: 1, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted },
  modalSubmit: { flex: 1, backgroundColor: '#0891b2', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  modalSubmitText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
});
