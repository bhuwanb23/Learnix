import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../../../constants/theme';
import { hodApi } from '../../../../../../services/api';

export default function CourseDetail({ courseId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const d = await hodApi.courseDetail(courseId);
      setData(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const onApprove = async () => {
    setBusy(true);
    try {
      await hodApi.approveSyllabus(data.syllabus.id);
      await load();
      Alert.alert('Approved', `${data.code} syllabus approved and forwarded to Admin.`);
    } catch (e) {
      Alert.alert('Cannot approve', e.message);
    } finally {
      setBusy(false);
    }
  };

  const onRequestChanges = () => {
    Alert.prompt(
      'Request Changes',
      'Feedback for the course teacher:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async (feedback) => {
            if (!feedback || feedback.trim().length < 3) {
              Alert.alert('Feedback required', 'Write at least a short note for the teacher.');
              return;
            }
            setBusy(true);
            try {
              await hodApi.requestSyllabusChanges(data.syllabus.id, feedback.trim());
              await load();
              Alert.alert('Sent', 'Feedback sent to the course teacher.');
            } catch (e) {
              Alert.alert('Cannot send', e.message);
            } finally {
              setBusy(false);
            }
          },
        },
      ],
      'plain-text',
    );
  };

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={onBack}>
          <Text style={styles.backLinkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const syllabusChip =
    data.syllabus?.status === 'HOD_APPROVED' || data.syllabus?.status === 'ADMIN_APPROVED'
      ? { bg: '#dcfce7', color: '#059669', label: 'Approved' }
      : data.syllabus?.status === 'SUBMITTED'
        ? { bg: '#fef3c7', color: '#d97706', label: 'Pending' }
        : data.syllabus?.status === 'CHANGES_REQUESTED'
          ? { bg: '#fee2e2', color: '#dc2626', label: 'Changes Requested' }
          : { bg: '#e0e7ff', color: '#4f46e5', label: 'Draft' };

  const canDecide = data.syllabus && data.syllabus.status === 'SUBMITTED';

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.heroTop}>
            <View style={styles.codeBadge}>
              <Text style={styles.codeText}>{data.code}</Text>
            </View>
            <Text style={styles.courseName}>{data.name}</Text>
            <Text style={styles.courseMeta}>
              Sem {data.semester} · {data.credits} credits · {data.type}
            </Text>
          </View>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{data.credits}</Text>
              <Text style={styles.heroStatLabel}>Credits</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{data.totalStudents}</Text>
              <Text style={styles.heroStatLabel}>Students</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{data.syllabus ? `v${data.syllabus.version}` : '—'}</Text>
              <Text style={styles.heroStatLabel}>Syllabus</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.teacherCard}>
          <View style={[styles.teacherAvatar, { backgroundColor: '#dbeafe' }]}>
            <Text style={styles.teacherAvatarText}>{(data.teachers[0] ?? '?').charAt(0)}</Text>
          </View>
          <View style={styles.teacherBody}>
            <Text style={styles.teacherLabel}>Course Teacher{data.teachers.length > 1 ? 's' : ''}</Text>
            <Text style={styles.teacherName}>{data.teachers.join(', ') || 'Unassigned'}</Text>
          </View>
        </View>

        {data.syllabus ? (
          <View style={styles.syllabusCard}>
            <View style={styles.syllabusTop}>
              <Text style={styles.syllabusTitle}>Syllabus Status</Text>
              <View style={[styles.syllabusChip, { backgroundColor: syllabusChip.bg }]}>
                <Text style={[styles.syllabusChipText, { color: syllabusChip.color }]}>{syllabusChip.label}</Text>
              </View>
            </View>
            {canDecide ? (
              <View style={styles.syllabusActions}>
                <TouchableOpacity style={styles.changesBtn} disabled={busy} onPress={onRequestChanges}>
                  <Ionicons name="create-outline" size={14} color="#d97706" />
                  <Text style={styles.changesText}>Request Changes</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.approveBtn} disabled={busy} onPress={onApprove}>
                  {busy ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="checkmark-outline" size={14} color="#fff" />
                  )}
                  <Text style={styles.approveText}>Approve</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {data.syllabus.feedback ? (
              <Text style={styles.feedbackText} numberOfLines={2}>
                Feedback: {data.syllabus.feedback}
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.syllabusCard}>
            <Text style={styles.syllabusTitle}>No syllabus submitted yet</Text>
          </View>
        )}

        {data.syllabus && data.syllabus.units.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Syllabus Units</Text>
            {data.syllabus.units.map((u) => {
              const done = u.topics > 0 && u.completed === u.topics;
              const started = u.completed > 0 && !done;
              return (
                <View key={u.id} style={styles.unitCard}>
                  <View
                    style={[
                      styles.unitDot,
                      { backgroundColor: done ? '#059669' : started ? '#d97706' : '#e5e7eb' },
                    ]}
                  />
                  <View style={styles.unitBody}>
                    <Text style={styles.unitTitle}>{u.title}</Text>
                    <Text style={styles.unitMeta}>
                      {u.completed}/{u.topics} topics completed
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.unitStatus,
                      { color: done ? '#059669' : started ? '#d97706' : '#9ca3af' },
                    ]}
                  >
                    {done ? 'Completed' : started ? 'In Progress' : 'Pending'}
                  </Text>
                </View>
              );
            })}
          </>
        )}

        <Text style={styles.sectionTitle}>Offerings</Text>
        {data.offerings.map((o) => (
          <View key={o.id} style={styles.unitCard}>
            <View style={[styles.unitDot, { backgroundColor: '#2563eb' }]} />
            <View style={styles.unitBody}>
              <Text style={styles.unitTitle}>{o.section}</Text>
              <Text style={styles.unitMeta}>
                {o.students} students · {o.weeklyHours} hrs/week
              </Text>
            </View>
          </View>
        ))}
        {data.offerings.length === 0 && (
          <Text style={styles.emptyText}>Not offered this academic year.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  errorText: { marginTop: 12, fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { marginTop: 16, backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 13 },
  backLink: { marginTop: 14 },
  backLinkText: { fontSize: 12, fontFamily: 'Manrope-SemiBold', color: '#2563eb' },
  emptyText: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 8, marginHorizontal: 16 },
  content: { paddingBottom: 32 },
  hero: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 18,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTop: { alignItems: 'flex-start' },
  codeBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  codeText: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
  },
  courseName: {
    fontSize: 22,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
    marginTop: 8,
  },
  courseMeta: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingVertical: 12,
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: {
    fontSize: 16,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
  },
  heroStatLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  heroStatDivider: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.2)' },
  teacherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
  },
  teacherAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  teacherAvatarText: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: '#2563eb',
  },
  teacherBody: { flex: 1 },
  teacherLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  teacherName: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginTop: 1,
  },
  syllabusCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
  },
  syllabusTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syllabusTitle: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  syllabusChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  syllabusChipText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
  },
  syllabusActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  changesBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    paddingVertical: 10,
    marginRight: 8,
  },
  changesText: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: '#d97706',
    marginLeft: 4,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
  },
  approveText: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    marginLeft: 4,
  },
  feedbackText: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginTop: 18,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  unitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  unitDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  unitBody: { flex: 1 },
  unitTitle: {
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.text,
  },
  unitMeta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  unitStatus: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
  },
});
