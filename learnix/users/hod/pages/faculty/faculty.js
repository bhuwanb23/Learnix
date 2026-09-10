import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { hodApi } from '../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonCard, SkeletonStatRow } from '../../../../components/ui';
import FacultyDetail from './pages/faculty_detail/faculty_detail';

const COLORS = ['#2563eb', '#d97706', '#dc2626', '#059669', '#0891b2', '#7c3aed'];

export default function FacultyModule({ navigation }) {
  const [faculty, setFaculty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setError(null);
      const list = await hodApi.faculty();
      setFaculty(list);
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

  if (selectedId) {
    return (
      <FacultyDetail
        facultyId={selectedId}
        facultyList={faculty ?? []}
        onBack={() => {
          setSelectedId(null);
          load(false);
        }}
      />
    );
  }

  if (loading && !faculty) {
    return (
      <View style={styles.center}>
        <SkeletonStatRow style={{ marginTop: 16 }} />
        <View style={{ marginTop: 14 }}>
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} style={{ marginBottom: 8 }} />
          ))}
        </View>
      </View>
    );
  }

  if (error && !faculty) {
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

  const list = faculty ?? [];
  const active = list.filter((f) => f.status === 'ACTIVE').length;
  const avgPct = list.length === 0 ? 0 : Math.round(list.reduce((s, f) => s + f.utilizationPct, 0) / list.length);

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{list.length}</Text>
            <Text style={styles.statLabel}>Faculty</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{active}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{avgPct}%</Text>
            <Text style={styles.statLabel}>Avg Workload</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Department Faculty</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => Alert.alert('Add Faculty', 'Faculty onboarding is handled by Admin — new staff appear here once assigned to your department.')}
          >
            <Ionicons name="add" size={15} color="#fff" />
            <Text style={styles.addText}>Add</Text>
          </TouchableOpacity>
        </View>

        {list.map((f, idx) => {
          const color = COLORS[idx % COLORS.length];
          const st = f.status === 'ACTIVE'
            ? { bg: '#dcfce7', color: '#059669', label: 'Active' }
            : { bg: '#fef3c7', color: '#d97706', label: 'On Leave' };
          const pct = Math.min(f.utilizationPct, 100);
          return (
            <AnimatedCard
              key={f.id}
              onPress={() => setSelectedId(f.id)}
              delay={idx * 40}
              style={styles.card}
            >
              <View style={[styles.avatar, { backgroundColor: color + '1a' }]}>
                <Text style={[styles.avatarText, { color }]}>{f.name.charAt(0)}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.name} numberOfLines={1}>
                  {f.name}{f.isHod ? ' · HOD' : ''}
                </Text>
                <Text style={styles.meta}>
                  {f.designation} · {f.classes.length} classes
                </Text>
                <View style={styles.workloadRow}>
                  <View style={styles.workloadTrack}>
                    <View
                      style={[
                        styles.workloadFill,
                        { width: pct + '%', backgroundColor: pct > 90 ? '#dc2626' : pct > 75 ? '#d97706' : '#2563eb' },
                      ]}
                    />
                  </View>
                  <Text style={styles.workloadText}>{f.workload}/{f.maxWorkload}</Text>
                </View>
              </View>
              <View style={[styles.statusChip, { backgroundColor: st.bg }]}>
                <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
              </View>
            </AnimatedCard>
          );
        })}
        {list.length === 0 && (
          <EmptyState icon="people-outline" title="No faculty yet" subtitle="Faculty will appear here once assigned to your department" color="#4f46e5" />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  errorText: { marginTop: 12, fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { marginTop: 16, backgroundColor: '#4f46e5', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 13 },
  emptyText: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 24 },
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  addText: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    marginLeft: 3,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
  },
  cardBody: { flex: 1, marginRight: 8 },
  name: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  meta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  workloadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  workloadTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
    marginRight: 8,
  },
  workloadFill: { height: 5, borderRadius: 3 },
  workloadText: {
    fontSize: 10,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
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
