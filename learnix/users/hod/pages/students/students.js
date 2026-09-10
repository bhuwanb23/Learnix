import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { hodApi } from '../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonCard, SkeletonStatRow } from '../../../../components/ui';

const COLORS = ['#059669', '#2563eb', '#0891b2', '#d97706', '#dc2626', '#7c3aed'];

export default function StudentsModule({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [year, setYear] = useState(null); // null = All

  const load = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setError(null);
      const d = await hodApi.students(year ?? undefined);
      setData(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [year]);

  React.useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(false);
  };

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <SkeletonStatRow style={{ marginTop: 16 }} />
        <View style={{ marginTop: 14 }}>
          {[1, 2, 3, 4].map((i) => (
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

  const stats = data?.stats ?? { total: 0, bySemester: [] };
  const students = data?.students ?? [];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Students</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.bySemester.length}</Text>
          <Text style={styles.statLabel}>Semesters</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{students.filter((s) => s.status !== 'ACTIVE').length}</Text>
          <Text style={styles.statLabel}>Inactive</Text>
        </View>
      </View>

      {stats.bySemester.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
          {[null, ...stats.bySemester.map((s) => s.semester)].map((y) => (
            <TouchableOpacity
              key={y ?? 'all'}
              style={[styles.chip, year === y && styles.chipActive]}
              onPress={() => setYear(y)}
            >
              <Text style={[styles.chipText, year === y && styles.chipTextActive]}>
                {y === null ? 'All Years' : `Sem ${y}`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance by Semester</Text>
        {stats.bySemester.map((s, idx) => {
          const color = COLORS[idx % COLORS.length];
          return (
            <View key={s.semester} style={styles.yearCard}>
              <Text style={styles.yearLabel}>Semester {s.semester}</Text>
              <View style={styles.yearMeta}>
                <Text style={styles.yearSub}>{s.count} students</Text>
              </View>
              <View style={styles.yearBarRow}>
                <Text style={styles.yearBarLabel}>Share</Text>
                <View style={styles.yearTrack}>
                  <View
                    style={[
                      styles.yearFill,
                      {
                        width: `${stats.total === 0 ? 0 : Math.round((s.count / stats.total) * 100)}%`,
                        backgroundColor: color,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.yearValue}>
                  {stats.total === 0 ? 0 : Math.round((s.count / stats.total) * 100)}%
                </Text>
              </View>
            </View>
          );
        })}
        {stats.bySemester.length === 0 && (
          <EmptyState icon="school-outline" title="No students enrolled" subtitle="Students will appear here once enrolled" color="#4f46e5" />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Student List</Text>
        {students.map((s, idx) => {
          const color = COLORS[idx % COLORS.length];
          return (
            <AnimatedCard key={s.id} delay={idx * 30} style={styles.card}>
              <View style={[styles.avatar, { backgroundColor: color + '1a' }]}>
                <Text style={[styles.avatarText, { color }]}>{s.name.charAt(0)}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.name}>{s.name}</Text>
                <Text style={styles.meta}>
                  {s.rollNo}
                  {s.section ? ` · Section ${s.section}` : ''}
                  {s.semester ? ` · Sem ${s.semester}` : ''}
                </Text>
              </View>
              <View
                style={[
                  styles.statusChip,
                  { backgroundColor: s.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9' },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: s.status === 'ACTIVE' ? '#059669' : '#64748b' },
                  ]}
                >
                  {s.status}
                </Text>
              </View>
            </AnimatedCard>
          );
        })}
        {students.length === 0 && (
          <EmptyState icon="people-outline" title="No students found" subtitle="Try a different semester filter" color="#4f46e5" />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  errorText: { marginTop: 12, fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { marginTop: 16, backgroundColor: '#4f46e5', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 13 },
  emptyText: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 16 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Manrope-ExtraBold',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  chipsRow: { flexGrow: 0, marginTop: 14 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceMuted,
    marginRight: 8,
  },
  chipActive: { backgroundColor: theme.colors.primary },
  chipText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  chipTextActive: { color: '#fff' },
  section: { marginTop: 18 },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginBottom: 10,
  },
  yearCard: {
    padding: 12,
    marginBottom: 8,
  },
  yearLabel: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  yearMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  yearSub: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
  },
  yearBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  yearBarLabel: {
    width: 40,
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
  },
  yearTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
    marginRight: 8,
  },
  yearFill: { height: 6, borderRadius: 3 },
  yearValue: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
  },
  cardBody: { flex: 1 },
  name: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  meta: {
    fontSize: 11,
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
});
