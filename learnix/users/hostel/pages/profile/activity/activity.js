/**
 * Sign-in history and recent actions.
 *
 * TWO DIFFERENT QUESTIONS, and they are not the same thing:
 *
 *   · SESSIONS — "who is signed in RIGHT NOW". Revoking one ends it. A session is identified by
 *     its start time alone, because the platform stores no device information. That limitation is
 *     REPORTED by the server and shown here, rather than the screen implying it knows which device
 *     or which city a session came from.
 *   · ACTIVITY — "what did this person actually DO", from the audit log. A session says somebody is
 *     signed in; an activity entry says a complaint was assigned.
 *
 * Conflating them produces the classic nonsense — a list of "recent activity" that is really a list
 * of logins, which tells a warden nothing about their own work.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { AnimatedCard, SkeletonCard } from '../../../../components/ui';
import { hostelApi, authApi } from '../../../../services/api';

function when(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const h = Math.floor((Date.now() - d.getTime()) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default function Activity({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (mode) => {
    try {
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      setData(await hostelApi.profileActivity());
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

  const signOutEverywhere = () => {
    Alert.alert(
      'Sign out of every other device?',
      'Your own session stays signed in.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out everywhere',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await authApi.revokeAllSessions();
              Alert.alert('Done', res?.revoked ? `${res.revoked} session(s) ended.` : 'No other sessions were live.');
              load('refresh');
            } catch (e) {
              Alert.alert('Could not do that', e.message || 'Try again');
            }
          },
        },
      ],
    );
  };

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
        Last signed in {when(data?.lastLoginAt)}.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <AnimatedCard style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Live sessions</Text>
          <Text style={styles.count}>{data?.sessionCount ?? 0}</Text>
        </View>
        <Text style={styles.muted}>{data?.sessionNote}</Text>
        {(data?.sessions ?? []).slice(0, 8).map((s) => (
          <View key={s.id} style={styles.row}>
            <Ionicons name="phone-portrait-outline" size={15} color={theme.colors.textMuted} />
            <View style={styles.flex}>
              <Text style={styles.rowTitle}>Signed in {when(s.createdAt)}</Text>
              <Text style={styles.rowMeta}>Expires {new Date(s.expiresAt).toLocaleDateString()}</Text>
            </View>
          </View>
        ))}
        {(data?.sessions ?? []).length > 8 ? (
          <Text style={styles.muted}>and {data.sessions.length - 8} more.</Text>
        ) : null}
        <TouchableOpacity style={styles.dangerRow} onPress={signOutEverywhere}>
          <Ionicons name="log-out-outline" size={15} color={theme.colors.error} />
          <Text style={styles.dangerText}>Sign out of every other device</Text>
        </TouchableOpacity>
      </AnimatedCard>

      <AnimatedCard style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Recent actions</Text>
          <Text style={styles.count}>{data?.activityCount ?? 0}</Text>
        </View>
        {(data?.activity ?? []).length === 0 ? (
          <Text style={styles.muted}>Nothing recorded yet.</Text>
        ) : (
          (data?.activity ?? []).map((a) => (
            <View key={a.id} style={styles.row}>
              <Ionicons name="ellipse-outline" size={12} color={theme.colors.primary} />
              <View style={styles.flex}>
                <Text style={styles.rowTitle}>{a.action}</Text>
                <Text style={styles.rowMeta}>
                  {a.entityType}
                  {a.entityId ? ` · ${a.entityId.slice(0, 10)}…` : ''}
                </Text>
              </View>
              <Text style={styles.rowWhen}>{when(a.createdAt)}</Text>
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
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 14, color: theme.colors.primary, fontWeight: '600' },
  h1: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  sub: { fontSize: 13, color: theme.colors.textMuted },
  error: { color: theme.colors.error, fontSize: 13 },
  card: { gap: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  count: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
  muted: { fontSize: 12, color: theme.colors.textMuted, lineHeight: 17 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  rowTitle: { fontSize: 13, color: theme.colors.text, fontWeight: '500' },
  rowMeta: { fontSize: 11, color: theme.colors.textMuted },
  rowWhen: { fontSize: 11, color: theme.colors.textMuted },
  dangerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 8 },
  dangerText: { fontSize: 13, color: theme.colors.error, fontWeight: '600' },
});
