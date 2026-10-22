/**
 * HD-05 — The HOD's Students desk: the screen frame.
 * Docs: 11-hod.md §3.4
 *
 * THE FRAME AND THE FETCH HOOK
 * ----------------------------
 * They are the two things EVERY Students screen does, and they are the two things that must be
 * right for a screen to be usable at all: load it, show it, and show the failure INSTEAD of the
 * content.
 *
 * The error is shown IN PLACE OF the content, not as a toast. A desk that fails quietly and shows
 * zeroes is dangerous: "0 at risk" and "0 because the request failed" look identical, and the
 * first one gets read out in a meeting.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { SkeletonCard, SkeletonStatRow } from '../../../../components/ui';
import { styles } from './studentsStyles';

export function useStudents(loader, deps = []) {
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

export function StudentsScreen({
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
          {error || 'The students could not be loaded.'}
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
