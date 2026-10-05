import React, { useCallback, useEffect, useState } from 'react';
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
import { theme } from '../../../../constants/theme';
import { alumniApi } from '../../../../services/api';
import { SkeletonCard, SkeletonStatRow } from '../../../../components/ui';
import { PairCard, StatusChip, Avatar, NoData, ProgressBar } from './components/MentorCard';
import { pairStatusMeta, fmtDate, relativeDay, sessionModeMeta } from './mentorshipMeta';

import MentorshipDirectory from './pages/mentorship_directory/mentorship_directory';
import MentorshipRequests from './pages/mentorship_requests/mentorship_requests';
import PairDetail from './pages/pair_detail/pair_detail';

/**
 * Mentorship hub.
 *
 * Replaces a single 510-line screen that had no navigation at all, rendered no
 * status labels, and crashed on its own write path (`ActivityIndicator` was used
 * but never imported, so tapping Approve or Remind threw).
 *
 * Three scopes, which is the thing the old version got wrong: it showed ACTIVE
 * and PENDING only, so declining a pair made it VANISH with no record. History is
 * a first-class tab now, because the office has to be able to explain to a mentee
 * why nobody ever replied.
 */
const SCOPES = [
  { id: 'active', label: 'Active', icon: 'checkmark-circle-outline' },
  { id: 'pending', label: 'Requests', icon: 'hourglass-outline' },
  { id: 'history', label: 'History', icon: 'time-outline' },
];

export default function MentorshipModule({ navigation }) {
  const [scope, setScope] = useState('active');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  // Sub-screens, held as local state rather than pushed onto a router: this app
  // has no navigation stack, so a drill-down that could not be dismissed would
  // strand the user. `open`/`back` keeps the exit explicit.
  const [sub, setSub] = useState(null); // { kind, id }
  const [requests, setRequests] = useState(null);
  const [directory, setDirectory] = useState(null);

  const load = useCallback(
    async (showSpinner = true) => {
      try {
        if (showSpinner) setLoading(true);
        setError(null);
        setData(await alumniApi.mentorship({ scope }));
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [scope],
  );

  useEffect(() => {
    load();
  }, [load]);

  const reloadAll = useCallback(async () => {
    await load(false);
    if (requests) setRequests(null); // force the inbox to refetch on return
    if (directory) setDirectory(null);
  }, [load]);

  const onRemind = async (pair) => {
    try {
      setBusyId(pair.id);
      await alumniApi.remindMentor(pair.id);
      Alert.alert('Reminder sent', `${pair.mentor.name} has been nudged about the next session.`);
    } catch (e) {
      Alert.alert('Cannot send reminder', e.message);
    } finally {
      setBusyId(null);
    }
  };

  // ── Sub-screen routing ──
  if (sub?.kind === 'directory') {
    return (
      <MentorshipDirectory
        navigation={{ goBack: () => setSub(null) }}
        onRequested={() => {
          setSub(null);
          setScope('pending');
        }}
      />
    );
  }
  if (sub?.kind === 'requests') {
    return (
      <MentorshipRequests
        navigation={{ goBack: () => setSub(null), openDirectory: () => setSub({ kind: 'directory' }) }}
        onDecided={reloadAll}
      />
    );
  }
  if (sub?.kind === 'pair') {
    return (
      <PairDetail
        pairId={sub.id}
        navigation={{ goBack: () => setSub(null) }}
        onChanged={reloadAll}
      />
    );
  }

  const stats = data?.stats ?? {};
  const items = scope === 'active' ? data?.active ?? [] : scope === 'pending' ? data?.pending ?? [] : data?.history ?? [];

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0891b2', '#0e7490']} style={styles.hero}>
        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Mentorship</Text>
            <Text style={styles.heroSub}>
              {stats.active ?? 0} active · {stats.pending ?? 0} awaiting decision
            </Text>
          </View>
          <TouchableOpacity style={styles.circleBtn} onPress={() => setSub({ kind: 'requests' })}>
            <Ionicons name="mail-unread-outline" size={18} color="#fff" />
            {(stats.pending ?? 0) > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{stats.pending}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        <View style={styles.heroStats}>
          <HeroStat value={stats.active ?? 0} label="active pairs" />
          <HeroStat value={stats.alumniToAlumni ?? 0} label="a↔a" />
          <HeroStat value={stats.alumniToStudent ?? 0} label="a↔student" />
          <HeroStat value={stats.sessionsHeld ?? 0} label="sessions" />
        </View>
      </LinearGradient>

      {/* Quick actions. The old empty state told the user to "add mentors from the
          directory" while rendering no button that could take them there. */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setSub({ kind: 'requests' })}>
          <Ionicons name="mail-outline" size={15} color="#0891b2" />
          <Text style={styles.actionText}>Requests inbox</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setSub({ kind: 'directory' })}>
          <Ionicons name="people-outline" size={15} color="#7c3aed" />
          <Text style={styles.actionText}>Find a mentor</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabWrap} contentContainerStyle={styles.tabRow}>
        {SCOPES.map((s) => {
          const active = scope === s.id;
          const count =
            s.id === 'active' ? (data?.active?.length ?? 0) : s.id === 'pending' ? (data?.pending?.length ?? 0) : (data?.history?.length ?? 0);
          return (
            <TouchableOpacity key={s.id} style={[styles.tab, active && styles.tabActive]} onPress={() => setScope(s.id)}>
              <Ionicons name={s.icon} size={13} color={active ? '#fff' : theme.colors.textMuted} />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{s.label}</Text>
              <Text style={[styles.tabCount, active && styles.tabCountActive]}>{count}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading && !data ? (
        <View style={{ paddingHorizontal: 16 }}>
          <SkeletonStatRow count={4} />
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={38} color={theme.colors.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={() => load()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
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
          {/* Programme-level context. Only on the Active tab — a history tab that
              also showed programme totals was noise. */}
          {scope === 'active' && stats.active > 0 ? (
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <SummaryStat label="Goals achieved" value={String(stats.goalsAchieved ?? 0)} />
                <SummaryStat
                  label="Avg mentor rating"
                  value={stats.avgRatingOfMentors != null ? stats.avgRatingOfMentors.toFixed(1) : '—'}
                />
                <SummaryStat label="Sessions logged" value={String(stats.sessionsHeld ?? 0)} />
              </View>
            </View>
          ) : null}

          {items.map((p) => (
            <PairCard
              key={p.id}
              pair={p}
              busy={busyId === p.id}
              onOpen={() => setSub({ kind: 'pair', id: p.id })}
              onRemind={p.status === 'ACTIVE' ? () => onRemind(p) : undefined}
            />
          ))}

          {items.length === 0 ? (
            <NoData
              icon={scope === 'pending' ? 'mail-outline' : scope === 'history' ? 'time-outline' : 'people-outline'}
              title={
                scope === 'pending'
                  ? 'No requests waiting'
                  : scope === 'history'
                    ? 'Nothing in the history'
                    : 'No active mentorships'
              }
              subtitle={
                scope === 'pending'
                  ? 'New requests from mentees appear here with the reason they gave.'
                  : scope === 'history'
                    ? 'Declined and completed mentorships are kept here so decisions stay explainable.'
                    : 'Browse the mentor directory to request a mentor, or accept a request from the inbox.'
              }
              // An empty state with no way out is a dead end — offer the next step.
              actionLabel={scope === 'history' ? 'View active pairs' : 'Open requests inbox'}
              onAction={
                scope === 'history'
                  ? () => setScope('active')
                  : () => setSub({ kind: 'requests' })
              }
            />
          ) : null}

          {/* Recent sessions, scoped to ACTIVE pairs by the server. */}
          {scope === 'active' && (data?.recentSessions ?? []).length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Recent sessions</Text>
              {(data?.recentSessions ?? []).map((s) => (
                <TouchableOpacity key={s.id} style={styles.sessionRow} onPress={() => setSub({ kind: 'pair', id: s.pairId })}>
                  <Ionicons name={sessionModeMeta(s.mode).icon} size={14} color="#059669" />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.sessionTitle} numberOfLines={1}>
                      {s.mentor} → {s.mentee}
                    </Text>
                    <Text style={styles.sessionMeta} numberOfLines={1}>
                      {s.field} · {relativeDay(s.sessionDate)}
                      {s.mode ? ` · ${sessionModeMeta(s.mode).label.toLowerCase()}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.sessionDate}>{fmtDate(s.sessionDate)}</Text>
                </TouchableOpacity>
              ))}
            </>
          ) : null}
        </ScrollView>
      )}
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

function SummaryStat({ label, value }) {
  return (
    <View style={styles.summaryStat}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  errorText: { marginTop: 10, fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center' },
  retry: { marginTop: 14, backgroundColor: '#0891b2', paddingHorizontal: 22, paddingVertical: 9, borderRadius: 10 },
  retryText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 12 },

  hero: { padding: 18, paddingTop: 16 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroTitle: { color: '#fff', fontSize: 21, fontFamily: 'Manrope-ExtraBold' },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontFamily: 'Manrope-Medium', marginTop: 2 },
  circleBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 9, fontFamily: 'Manrope-Bold' },
  heroStats: { flexDirection: 'row', gap: 7, marginTop: 14 },
  heroStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 11, paddingHorizontal: 8, paddingVertical: 7 },
  heroStatValue: { color: '#fff', fontSize: 14, fontFamily: 'Manrope-ExtraBold' },
  heroStatLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 8, fontFamily: 'Manrope-Medium' },

  actionRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingVertical: 11 },
  actionText: { fontSize: 12, fontFamily: 'Manrope-Bold', color: theme.colors.text },

  tabWrap: { flexGrow: 0, marginTop: 12 },
  tabRow: { paddingHorizontal: 16, gap: 6 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 11, paddingVertical: 8 },
  tabActive: { backgroundColor: '#0891b2', borderColor: '#0891b2' },
  tabText: { fontSize: 11, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  tabTextActive: { color: '#fff' },
  tabCount: { fontSize: 9, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted, backgroundColor: theme.colors.surfaceMuted, borderRadius: 7, paddingHorizontal: 5, paddingVertical: 1 },
  tabCountActive: { color: '#fff', backgroundColor: 'rgba(255,255,255,0.22)' },

  list: { padding: 16, paddingBottom: 28 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, padding: 12, marginBottom: 12 },
  summaryRow: { flexDirection: 'row' },
  summaryStat: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 17, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  summaryLabel: { fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2, textAlign: 'center' },
  sectionTitle: { fontSize: 12, fontFamily: 'Manrope-Bold', color: theme.colors.text, marginTop: 6, marginBottom: 8 },
  sessionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, padding: 12, marginBottom: 8 },
  sessionTitle: { fontSize: 11, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  sessionMeta: { fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },
  sessionDate: { fontSize: 9, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
});
