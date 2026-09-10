import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { hodApi } from '../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonCard, SkeletonStatRow } from '../../../../components/ui';
import CourseDetail from './pages/course_detail/course_detail';

const COLORS = ['#2563eb', '#059669', '#0891b2', '#d97706', '#dc2626', '#7c3aed'];

const syllabusStyle = (s) => {
  if (s === 'HOD_APPROVED' || s === 'ADMIN_APPROVED') return { bg: '#dcfce7', color: '#059669', label: 'Approved' };
  if (s === 'SUBMITTED') return { bg: '#fef3c7', color: '#d97706', label: 'Pending' };
  if (s === 'CHANGES_REQUESTED') return { bg: '#fee2e2', color: '#dc2626', label: 'Changes Req.' };
  return { bg: '#e0e7ff', color: '#4f46e5', label: 'Draft' };
};

export default function CoursesModule({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setError(null);
      const d = await hodApi.courses();
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

  if (selectedId) {
    return <CourseDetail courseId={selectedId} onBack={() => setSelectedId(null)} />;
  }

  if (loading && !data) {
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

  const courses = data?.courses ?? [];
  const stats = data?.stats ?? { total: 0, approved: 0, pending: 0 };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Courses</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.approved}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Department Courses</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => Alert.alert('New Course', 'Course creation is handled by Admin — courses appear here once added to your department.')}
        >
          <Ionicons name="add" size={15} color="#fff" />
          <Text style={styles.addText}>New Course</Text>
        </TouchableOpacity>
      </View>

      {courses.map((c, idx) => {
        const color = COLORS[idx % COLORS.length];
        const st = syllabusStyle(c.syllabusStatus);
        return (
          <AnimatedCard
            key={c.id}
            onPress={() => setSelectedId(c.id)}
            delay={idx * 40}
            style={styles.card}
          >
            <View style={[styles.courseIcon, { backgroundColor: color + '1a' }]}>
              <Text style={[styles.courseCode, { color }]}>{c.code}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.name}>{c.name}</Text>
              <Text style={styles.meta}>
                Sem {c.semester} · {c.credits} credits · {c.offerings.reduce((s, o) => s + o.students, 0)} students
              </Text>
              <Text style={styles.teacher} numberOfLines={1}>
                {[...new Set(c.offerings.map((o) => o.teacher))].join(', ') || 'Not offered this year'}
              </Text>
            </View>
            <View style={[styles.syllabusChip, { backgroundColor: st.bg }]}>
              <Text style={[styles.syllabusText, { color: st.color }]}>{st.label}</Text>
            </View>
          </AnimatedCard>
        );
      })}
      {courses.length === 0 && (
        <EmptyState icon="book-outline" title="No courses yet" subtitle="Courses will appear here once added to your department" color="#4f46e5" />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  courseIcon: {
    width: 46,
    height: 46,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  courseCode: {
    fontSize: 10,
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
  teacher: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.primary,
    marginTop: 3,
  },
  syllabusChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  syllabusText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
  },
});
