/**
 * X-10 — Sign-in history and recent actions.
 * Docs: 05-exam-cell.md §3.8
 *
 * TWO THINGS, and they are different questions:
 *
 *   · SESSIONS — the live sign-ins. A session says "somebody is signed in". They are identified by
 *     start time only, because the platform stores no device information, and the screen SAYS SO
 *     rather than dressing a timestamp up as "Chrome on Windows".
 *   · ACTIVITY — what this officer actually DID, from the audit log. An activity entry says "an exam
 *     was published", or "a cheating case was decided".
 *
 * Both come from `GET /examcell/profile/activity`, which is a separate endpoint because it changes
 * on every page of the history while the profile is read once a session.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import { AnimatedCard, EmptyState, SkeletonCard } from '../../../../../components/ui';
import { examcellApi } from '../../../../../services/api';

function when(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ExamActivity({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (mode) => {
    try {
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      setData(await examcellApi.profileActivity());
    } catch (e) {
      setError(e.message || 'Could not load your activity');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.pad}>
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.pad}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} />}
    >
      <TouchableOpacity style={styles.back} onPress={() => navigation?.goBack?.()}>
        <Ionicons name="chevron-back" size={18} color={theme.colors.primary} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.h1}>Sign-in history</Text>
      <Text style={styles.sub}>
        {data?.sessionCount ?? 0} live session(s). Last signed in{' '}
        {data?.lastLoginAt ? when(data.lastLoginAt) : 'never'}.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <AnimatedCard style={styles.card}>
        <Text style={styles.sectionTitle}>Live sessions</Text>
        {(data?.sessions ?? []).length === 0 ? (
          <Text style={styles.muted}>No live sessions.</Text>
        ) : (
          data.sessions.map((s) => (
            <View key={s.id} style={styles.row}>
              <Ionicons name="phone-portrait-outline" size={16} color={theme.colors.primary} />
              <View style={styles.flex}>
                <Text style={styles.rowTitle}>Started {when(s.createdAt)}</Text>
                <Text style={styles.rowMeta}>Expires {when(s.expiresAt)}</Text>
              </View>
            </View>
          ))
        )}
        {data?.sessionNote ? <Text style={styles.note}>{data.sessionNote}</Text> : null}
      </AnimatedCard>

      <AnimatedCard style={styles.card}>
        <Text style={styles.sectionTitle}>Recent actions</Text>
        {(data?.activity ?? []).length === 0 ? (
          <EmptyState
            icon="time-outline"
            title="Nothing recorded yet"
            message="Your actions in the examination office will be listed here."
          />
        ) : (
          data.activity.map((a) => (
            <View key={a.id} style={styles.row}>
              <Ionicons name="ellipse-outline" size={10} color={theme.colors.textMuted} />
              <View style={styles.flex}>
                <Text style={styles.rowTitle}>{a.action}</Text>
                <Text style={styles.rowMeta}>
                  {a.entityType}
                  {a.entityId ? ` · ${a.entityId}` : ''} · {when(a.createdAt)}
                </Text>
              </View>
            </View>
          ))
        )}
      </AnimatedCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  pad: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl, gap: theme.spacing.sm },
  flex: { flex: 1 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 14, color: theme.colors.primary, fontWeight: '600' },
  h1: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  sub: { fontSize: 13, color: theme.colors.textMuted, lineHeight: 18 },
  error: { color: theme.colors.error, fontSize: 13 },
  card: { gap: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  muted: { fontSize: 12, color: theme.colors.textMuted, lineHeight: 17 },
  note: { fontSize: 11, color: theme.colors.textMuted, fontStyle: 'italic', marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  rowTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  rowMeta: { fontSize: 11, color: theme.colors.textMuted },
});
