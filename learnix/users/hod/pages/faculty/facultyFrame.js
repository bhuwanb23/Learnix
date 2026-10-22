/**
 * HD-02 — The HOD's Faculty desk: the screen frame.
 * Docs: 11-hod.md §3.2
 *
 * THE FRAME AND THE FETCH HOOK
 * ----------------------------
 * They are the two things EVERY Faculty screen does, and they are the two things that must be
 * right for a screen to be usable at all: load it, show it, and show the failure INSTEAD of the
 * content.
 *
 * The error is shown IN PLACE OF the content, not as a toast. A desk that fails quietly and shows
 * zeroes is dangerous: "0 overloaded" and "0 because the request failed" look identical, and the
 * first one gets read out in a meeting.
 *
 * `useFaculty` tracks `ALIVE`, which is what stops the setState-after-unmount warning — a request
 * that resolves after the screen is gone calls `setState` on a dead component, which is a warning
 * on some platforms and a crash on others.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { SkeletonCard, SkeletonStatRow } from '../../../../components/ui';
import { styles } from './facultyStyles';

// ── The fetch hook ─────────────────────────────────────────────────────────

export function useFaculty(loader, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [alive, setAlive] = useState(true);

  useEffect(() => () => setAlive(false), []);

  const run = useCallback(
    async (mode) => {
      try {
        if (mode === 'refresh') setRefreshing(true);
        else setLoading(true);
        setError(null);
        const result = await loader();
        if (alive) setData(result);
      } catch (e) {
        if (alive) setError(e.message || 'Something went wrong');
      } finally {
        if (alive) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alive, ...deps],
  );

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refreshing, reload: () => run('refresh'), refetch: run };
}

// ── The screen frame ───────────────────────────────────────────────────────

export function FacultyScreen({
  loading,
  refreshing,
  error,
  onRetry,
  onRefresh,
  children,
}) {
  if (loading) {
    return (
      <ScrollView style={styles.wrap} contentContainerStyle={styles.pad}>
        <SkeletonStatRow />
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.error} />
        <Text style={styles.errorText}>
          {error || 'The faculty could not be loaded.'}
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={styles.pad}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {children}
    </ScrollView>
  );
}
