import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonStatRow, SkeletonCard } from '../../../../../components/ui';
import { THEME, formatDateTime, relativeTime } from '../notificationMeta';

/** Visual treatment per reminder stage. Offset decides the urgency colour. */
function stageMeta(stage) {
  const days = stage.offsetDays;
  if (days < 0) {
    const daysOut = Math.abs(days);
    return {
      color: daysOut >= 3 ? '#2563eb' : '#0891b2',
      bg: daysOut >= 3 ? '#eff6ff' : '#ecfeff',
      icon: 'time-outline',
      urgency: 'Heads up',
    };
  }
  if (days === 0) {
    return { color: '#d97706', bg: '#fffbeb', icon: 'today-outline', urgency: 'Due today' };
  }
  return { color: '#dc2626', bg: '#fef2f2', icon: 'alert-circle-outline', urgency: 'Escalation' };
}

export default function ReminderSchedule({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await libraryApi.reminderSchedule();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <SkeletonStatRow />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color="#dc2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stages = data?.stages || [];
  const totalReachable = data?.totalReachable ?? 0;
  const automated = !!data?.automationEnabled;
  const activeStages = stages.filter((s) => s.matchedNow > 0);
  const peak = stages.reduce((max, s) => Math.max(max, s.matchedNow), 0);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
    >
      {/* Reach */}
      <AnimatedCard delay={0} style={[styles.block, styles.reachCard]}>
        <View style={styles.reachRow}>
          <View style={[styles.reachIcon, { backgroundColor: automated ? '#f0fdf4' : '#fffbeb' }]}>
            <Ionicons
              name={automated ? 'checkmark-circle' : 'alarm'}
              size={22}
              color={automated ? '#059669' : '#d97706'}
            />
          </View>
          <View style={styles.reachBody}>
            <Text style={styles.reachValue}>{totalReachable}</Text>
            <Text style={styles.reachLabel}>
              student{totalReachable === 1 ? '' : 's'} fall into a reminder stage right now
            </Text>
          </View>
        </View>
        <View style={styles.reachMetaRow}>
          <Ionicons name="pulse-outline" size={13} color="#94a3b8" />
          <Text style={styles.reachMeta}>Checked {relativeTime(data?.checkedAt)}</Text>
          {data?.nextRunAt ? (
            <>
              <View style={styles.reachMetaDot} />
              <Text style={styles.reachMeta}>Next run {formatDateTime(data.nextRunAt)}</Text>
            </>
          ) : null}
        </View>
      </AnimatedCard>

      {/* Automation status — honest about what actually runs */}
      <AnimatedCard delay={60} style={[styles.block, styles.statusCard]}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: automated ? '#059669' : '#d97706' }]} />
          <Text style={styles.statusTitle}>
            {automated ? 'Automatic delivery is on' : 'Automatic delivery is off'}
          </Text>
        </View>
        <Text style={styles.statusText}>
          {automated
            ? 'Reminders are delivered to each student automatically when their stage is reached.'
            : data?.note
              || 'Reminders are not sent automatically yet — broadcast manually to reach these students.'}
        </Text>
        {!automated && (
          <TouchableOpacity
            style={styles.statusBtn}
            onPress={() => navigation.openModule('ComposeBroadcast')}
            activeOpacity={0.85}
          >
            <Ionicons name="megaphone-outline" size={14} color="#fff" />
            <Text style={styles.statusBtnText}>Broadcast a reminder now</Text>
          </TouchableOpacity>
        )}
      </AnimatedCard>

      {/* Stages */}
      <View style={styles.listHeader}>
        <Text style={styles.sectionLabel}>Reminder Stages</Text>
        <Text style={styles.countLabel}>{stages.length} stage{stages.length === 1 ? '' : 's'}</Text>
      </View>

      {stages.length === 0 ? (
        <EmptyState
          icon="alarm-outline"
          title="No reminder stages configured"
          subtitle="This institution has not defined a due-date reminder policy yet."
          color={THEME}
        />
      ) : (
        stages.map((s, idx) => {
          const meta = stageMeta(s);
          const width = peak ? Math.max(4, Math.round((s.matchedNow / peak) * 100)) : 0;
          const empty = s.matchedNow === 0;
          return (
            <AnimatedCard key={s.key} delay={120 + idx * 50} style={styles.block}>
              <View style={styles.stageRow}>
                <View style={[styles.stageIcon, { backgroundColor: meta.bg }]}>
                  <Ionicons name={meta.icon} size={19} color={meta.color} />
                </View>
                <View style={styles.stageBody}>
                  <View style={styles.stageTop}>
                    <Text style={styles.stageTitle}>{s.title}</Text>
                    <View style={[styles.stageTag, { backgroundColor: meta.bg }]}>
                      <Text style={[styles.stageTagText, { color: meta.color }]}>{meta.urgency}</Text>
                    </View>
                  </View>
                  <Text style={styles.stageDesc}>{s.description} · {s.channel === 'IN_APP' ? 'in-app' : s.channel}</Text>
                </View>
                <Text style={[styles.stageCount, { color: empty ? '#cbd5e1' : meta.color }]}>
                  {s.matchedNow}
                </Text>
              </View>

              <View style={styles.track}>
                <View style={[styles.fill, { width: `${empty ? 0 : width}%`, backgroundColor: meta.color }]} />
              </View>

              <Text style={styles.stageHint}>
                {empty
                  ? 'Nobody matches this stage today — it will populate as loans approach their due date.'
                  : `Broadcast now to reach these ${s.matchedNow} student${s.matchedNow === 1 ? '' : 's'}.`}
              </Text>

              {!empty && (
                <TouchableOpacity
                  style={styles.stageBtn}
                  onPress={() => navigation.openModule('ComposeBroadcast')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="paper-plane-outline" size={13} color={THEME} />
                  <Text style={styles.stageBtnText}>Send a reminder to these students</Text>
                </TouchableOpacity>
              )}
            </AnimatedCard>
          );
        })
      )}

      {activeStages.length === 0 && stages.length > 0 ? (
        <AnimatedCard delay={340} style={styles.block}>
          <View style={styles.noteRow}>
            <Ionicons name="checkmark-done-outline" size={16} color="#059669" />
            <Text style={styles.noteText}>
              Every stage is empty right now — no loan is within 3 days of its due date and nothing is overdue.
            </Text>
          </View>
        </AnimatedCard>
      ) : null}

      <AnimatedCard delay={380} style={styles.block}>
        <View style={styles.noteRow}>
          <Ionicons name="information-circle-outline" size={16} color="#2563eb" />
          <Text style={styles.noteText}>
            Counts are resolved live from open loans each time this screen loads, so they always match what the
            circulation desk sees — there is no cached figure to go stale.
          </Text>
        </View>
      </AnimatedCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 24, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9', padding: 24 },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  block: { marginBottom: 10 },

  // Reach card
  reachCard: { padding: 16 },
  reachRow: { flexDirection: 'row', alignItems: 'center' },
  reachIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 13 },
  reachBody: { flex: 1 },
  reachValue: { fontSize: 28, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -1 },
  reachLabel: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  reachMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 13 },
  reachMetaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#cbd5e1' },
  reachMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium' },

  // Automation status
  statusCard: { padding: 14, backgroundColor: '#fffdf7', borderColor: '#fde68a' },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 9 },
  statusTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  statusText: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', lineHeight: 16, marginTop: 6 },
  statusBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 13, paddingVertical: 10, borderRadius: 11, backgroundColor: THEME },
  statusBtnText: { color: '#fff', fontSize: 12, fontWeight: '700', fontFamily: 'Manrope-Bold' },

  // Stages
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  countLabel: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Medium' },

  stageRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  stageIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  stageBody: { flex: 1 },
  stageTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  stageTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold', flexShrink: 1 },
  stageTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7 },
  stageTagText: { fontSize: 9, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  stageDesc: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 2 },
  stageCount: { fontSize: 20, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold', marginLeft: 10 },

  track: { height: 7, borderRadius: 4, backgroundColor: '#eef2f7', marginHorizontal: 14, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  stageHint: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 10, marginHorizontal: 14, lineHeight: 14 },
  stageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 12, marginHorizontal: 14, marginBottom: 14, paddingVertical: 10, borderRadius: 11, backgroundColor: THEME + '12', borderWidth: 1, borderColor: THEME + '33' },
  stageBtnText: { fontSize: 12, fontWeight: '700', color: THEME, fontFamily: 'Manrope-Bold' },

  noteRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14 },
  noteText: { flex: 1, fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium', lineHeight: 16, marginLeft: 9 },
});
