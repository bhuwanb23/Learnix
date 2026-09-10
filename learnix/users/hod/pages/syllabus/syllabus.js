import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { hodApi } from '../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonCard } from '../../../../components/ui';

const COLORS = ['#059669', '#d97706', '#2563eb', '#0891b2', '#7c3aed', '#dc2626'];

export default function SyllabusModule({ navigation }) {
  const [versions, setVersions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('Pending');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setError(null);
      const list = await hodApi.syllabus();
      setVersions(list);
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

  const onApprove = async (v) => {
    setBusyId(v.id);
    try {
      await hodApi.approveSyllabus(v.id);
      await load(false);
      Alert.alert('Approved', `${v.courseCode} syllabus approved and forwarded to Admin.`);
    } catch (e) {
      Alert.alert('Cannot approve', e.message);
    } finally {
      setBusyId(null);
    }
  };

  const onRequestChanges = (v) => {
    Alert.prompt(
      'Request Changes',
      `Feedback for ${v.submittedBy} on ${v.courseCode}:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async (feedback) => {
            if (!feedback || feedback.trim().length < 3) {
              Alert.alert('Feedback required', 'Write at least a short note for the teacher.');
              return;
            }
            setBusyId(v.id);
            try {
              await hodApi.requestSyllabusChanges(v.id, feedback.trim());
              await load(false);
              Alert.alert('Sent', `Feedback sent to ${v.submittedBy}.`);
            } catch (e) {
              Alert.alert('Cannot send', e.message);
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
      'plain-text',
    );
  };

  if (loading && !versions) {
    return (
      <View style={styles.center}>
        <SkeletonCard style={{ marginTop: 16 }} />
        <SkeletonCard style={{ marginTop: 10 }} />
      </View>
    );
  }

  if (error && !versions) {
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

  const list = versions ?? [];
  const pending = list.filter((v) => v.status === 'SUBMITTED');
  const decided = list.filter((v) => v.status !== 'SUBMITTED');
  const visible = tab === 'Pending' ? pending : decided;

  return (
    <View style={styles.container}>
      <View style={styles.tabsRow}>
        {['Pending', 'Decided'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t}{t === 'Pending' && pending.length > 0 ? ` (${pending.length})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {visible.map((v, idx) => {
          const color = COLORS[idx % COLORS.length];
          const isPending = v.status === 'SUBMITTED';
          return (
            <AnimatedCard key={v.id} delay={idx * 40} style={styles.card}>
              <View style={[styles.syllabusIcon, { backgroundColor: color + '1a' }]}>
                <Ionicons name="document-text-outline" size={19} color={color} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.name}>{v.courseCode} — {v.courseName}</Text>
                <Text style={styles.meta}>
                  Sem {v.semester} · v{v.version} · {v.units} units
                </Text>
                <Text style={styles.submitted}>
                  by {v.submittedBy} · {new Date(v.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
              {isPending ? (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.changesBtn}
                    disabled={busyId === v.id}
                    onPress={() => onRequestChanges(v)}
                  >
                    <Ionicons name="create-outline" size={14} color="#d97706" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.approveBtn}
                    disabled={busyId === v.id}
                    onPress={() => onApprove(v)}
                  >
                    {busyId === v.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="checkmark-outline" size={14} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View
                  style={[
                    styles.approvedChip,
                    v.status === 'CHANGES_REQUESTED' && { backgroundColor: '#fee2e2' },
                  ]}
                >
                  <Ionicons
                    name={v.status === 'CHANGES_REQUESTED' ? 'alert-circle' : 'checkmark-circle'}
                    size={14}
                    color={v.status === 'CHANGES_REQUESTED' ? '#dc2626' : '#059669'}
                  />
                  <Text
                    style={[
                      styles.approvedText,
                      { color: v.status === 'CHANGES_REQUESTED' ? '#dc2626' : '#059669' },
                    ]}
                  >
                    {v.status === 'CHANGES_REQUESTED' ? 'Changes' : v.status === 'ADMIN_APPROVED' ? 'Admin' : 'Approved'}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.previewBtn}
                onPress={() =>
                  Alert.alert(
                    `${v.courseCode} v${v.version}`,
                    `${v.courseName}\nSem ${v.semester} · ${v.units} units · submitted by ${v.submittedBy}${v.feedback ? `\n\nFeedback: ${v.feedback}` : ''}`,
                  )
                }
              >
                <Ionicons name="eye-outline" size={14} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </AnimatedCard>
          );
        })}
        {visible.length === 0 && (
          <EmptyState
            icon="checkmark-done-outline"
            title={tab === 'Pending' ? 'All caught up!' : 'No decided versions'}
            subtitle={tab === 'Pending' ? 'No pending syllabus approvals' : 'Decided versions will appear here'}
            color="#4f46e5"
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  errorText: { marginTop: 12, fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { marginTop: 16, backgroundColor: '#4f46e5', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 13 },
  tabsRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceMuted,
    marginRight: 8,
  },
  tabActive: { backgroundColor: theme.colors.primary },
  tabText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  tabTextActive: { color: '#fff' },
  list: { paddingTop: 12, paddingBottom: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  syllabusIcon: {
    width: 42,
    height: 42,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardBody: { flex: 1, marginRight: 8 },
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
  submitted: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
  },
  changesBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  approveBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approvedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  approvedText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    marginLeft: 4,
  },
  previewBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 28,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 10,
    textAlign: 'center',
  },
});
