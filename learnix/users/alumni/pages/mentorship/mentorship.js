import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { alumniApi } from '../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonCard, SkeletonStatRow } from '../../../../components/ui';

const COLORS = ['#2563eb', '#059669', '#0891b2', '#d97706', '#7c3aed', '#dc2626'];
const tabs = ['Active Pairs', 'Requests'];

export default function MentorshipModule({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Active Pairs');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setError(null);
      const d = await alumniApi.mentorship();
      setData(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(false);
  };

  const act = async (pairId, action, successMsg) => {
    setBusyId(pairId);
    try {
      await alumniApi.mentorshipAction(pairId, action);
      await load(false);
      Alert.alert('Done', successMsg);
    } catch (e) {
      Alert.alert('Cannot update pair', e.message);
    } finally {
      setBusyId(null);
    }
  };

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <SkeletonStatRow count={3} style={{ paddingHorizontal: 16 }} />
        <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} style={{ marginBottom: 8 }} />
          ))}
        </View>
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
      </View>
    );
  }

  const pairs = activeTab === 'Active Pairs' ? (data?.active ?? []) : (data?.pending ?? []);
  const sessions = data?.recentSessions ?? [];
  const stats = [
    { label: 'Active Pairs', value: String((data?.active ?? []).length), icon: 'hand-left-outline', color: '#2563eb' },
    { label: 'Pending', value: String((data?.pending ?? []).length), icon: 'hourglass-outline', color: '#d97706' },
    { label: 'Sessions Logged', value: String(sessions.length), icon: 'videocam-outline', color: '#059669' },
  ];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.statsRow}>
        {stats.map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Ionicons name={s.icon} size={14} color={s.color} />
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.tabsWrap}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === t && styles.tabActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t}</Text>
            {t === 'Requests' && (data?.pending ?? []).length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{data.pending.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'Active Pairs' && (
        <>
          {pairs.map((p, idx) => {
            const color = COLORS[idx % COLORS.length];
            return (
              <AnimatedCard key={p.id} delay={idx * 50} style={styles.pairCard}>
                <View style={styles.pairRow}>
                  <View style={[styles.mentorAvatar, { backgroundColor: color + '1a' }]}>
                    <Text style={[styles.initials, { color }]}>
                      {p.mentor.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </Text>
                  </View>
                  <View style={styles.pairBody}>
                    <Text style={styles.pairTitle} numberOfLines={1}>
                      {p.mentor.name} → {p.mentee}
                    </Text>
                    <Text style={styles.pairMeta}>
                      {p.field}{p.mentor.batch ? ` · Batch ${p.mentor.batch}` : ''}
                      {p.mentor.role ? ` · ${p.mentor.role}` : ''}
                    </Text>
                  </View>
                </View>
                <View style={styles.pairFooter}>
                  <View style={styles.sessionChip}>
                    <Ionicons name="videocam-outline" size={11} color={color} />
                    <Text style={[styles.sessionText, { color }]}>{p.sessions} sessions</Text>
                  </View>
                  <Text style={styles.nextSession}>
                    Requested {new Date(p.requestedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.remindBtn}
                  disabled={busyId === p.id}
                  onPress={() => act(p.id, 'remind', `Session reminder sent to ${p.mentor.name}.`)}
                >
                  {busyId === p.id ? (
                    <ActivityIndicator size="small" color="#2563eb" />
                  ) : (
                    <Ionicons name="notifications-outline" size={13} color="#2563eb" />
                  )}
                  <Text style={styles.remindText}>Send Reminder</Text>
                </TouchableOpacity>
              </AnimatedCard>
            );
          })}
          {pairs.length === 0 && (
            <EmptyState
              icon="hand-left-outline"
              title="No active pairs yet"
              subtitle="Approve requests or add mentors from the directory"
              color="#2563eb"
            />
          )}

          {sessions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Sessions</Text>
              {sessions.map((s) => (
                <View key={s.id} style={styles.sessionRow}>
                  <View style={styles.sessionIcon}>
                    <Ionicons name="checkmark-circle" size={16} color="#059669" />
                  </View>
                  <View style={styles.sessionBody}>
                    <Text style={styles.sessionTopic} numberOfLines={1}>
                      {s.field}{s.notes ? ` — ${s.notes}` : ''}
                    </Text>
                    <Text style={styles.sessionMeta}>
                      {s.mentor} ↔ {s.mentee} · {new Date(s.sessionDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {activeTab === 'Requests' && (
        <>
          {pairs.length === 0 && (
            <EmptyState
              icon="checkmark-done-outline"
              title="All caught up!"
              subtitle="No pending mentorship requests"
              color="#059669"
            />
          )}
          {pairs.map((r, idx) => {
            const color = COLORS[idx % COLORS.length];
            return (
              <AnimatedCard key={r.id} delay={idx * 50} style={styles.requestCard}>
                <View style={[styles.mentorAvatar, { backgroundColor: color + '1a' }]}>
                  <Text style={[styles.initials, { color }]}>
                    {r.mentor.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </Text>
                </View>
                <View style={styles.pairBody}>
                  <Text style={styles.pairTitle} numberOfLines={1}>
                    {r.mentor.name} → {r.mentee}
                  </Text>
                  <Text style={styles.pairMeta}>
                    {r.field} · Batch {r.mentor.batch ?? '—'}
                  </Text>
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      disabled={busyId === r.id}
                      onPress={() => act(r.id, 'approve', `${r.mentor.name} ↔ ${r.mentee} is now active.`)}
                    >
                      {busyId === r.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Ionicons name="checkmark" size={13} color="#fff" />
                      )}
                      <Text style={styles.approveText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      disabled={busyId === r.id}
                      onPress={() => act(r.id, 'decline', `${r.mentor.name} ↔ ${r.mentee} pairing declined.`)}
                    >
                      <Ionicons name="close" size={13} color="#dc2626" />
                      <Text style={styles.rejectText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </AnimatedCard>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  errorText: { marginTop: 12, fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { marginTop: 16, backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 13 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 15,
    fontFamily: 'Manrope-ExtraBold',
    color: theme.colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  tabsWrap: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  tabTextActive: {
    color: '#fff',
  },
  tabBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 9999,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 5,
  },
  tabBadgeText: {
    fontSize: 9,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
  },
  pairCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 10,
  },
  pairRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mentorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  initials: {
    fontSize: 12,
    fontFamily: 'Manrope-ExtraBold',
  },
  pairBody: { flex: 1 },
  pairTitle: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  pairMeta: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  pairFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  sessionChip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    marginLeft: 4,
  },
  nextSession: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
  },
  remindBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 9,
    paddingVertical: 7,
    marginTop: 10,
  },
  remindText: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: '#2563eb',
    marginLeft: 5,
  },
  section: { paddingHorizontal: 16, marginTop: 18 },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginBottom: 10,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    marginBottom: 8,
  },
  sessionIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sessionBody: { flex: 1 },
  sessionTopic: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  sessionMeta: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginTop: 8,
  },
  emptySub: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 3,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 10,
  },
  requestActions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
  },
  approveText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    marginLeft: 4,
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rejectText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    color: '#dc2626',
    marginLeft: 4,
  },
});
