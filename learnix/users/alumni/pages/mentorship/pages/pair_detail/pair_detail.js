import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../../constants/theme';
import { alumniApi } from '../../../../../services/api';
import { SkeletonCard } from '../../../../../components/ui';
import {
  Avatar,
  StatusChip,
  ProgressBar,
  SessionCard,
  GoalCard,
  RatingRow,
  StarPicker,
  NoData,
} from '../../../components/MentorCard';
import { pairStatusMeta, fmtDate, fmtDateTime, fmtDuration, SESSION_MODES } from '../../../mentorshipMeta';

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'information-circle-outline' },
  { id: 'sessions', label: 'Sessions', icon: 'calendar-outline' },
  { id: 'goals', label: 'Goals', icon: 'flag-outline' },
  { id: 'feedback', label: 'Feedback', icon: 'star-outline' },
];

/**
 * One mentorship pair.
 *
 * Every action is gated on `viewerContext` from the server — never on "am I the
 * mentor", guessed from the data that happens to be on screen. The old screen
 * rendered Approve/Remind buttons based on client-side guessing, which is how a
 * mentee ended up being offered "Remind mentor" about themselves.
 */
export default function PairDetail({ pairId, navigation, onChanged }) {
  const [pair, setPair] = useState(null);
  const [progress, setProgress] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [sessionModal, setSessionModal] = useState(null); // 'schedule' | 'log'
  const [sessionForm, setSessionForm] = useState({ sessionDate: '', mode: 'VIDEO', durationMinutes: '45', agenda: '', notes: '', outcome: '' });
  const [goalModal, setGoalModal] = useState(null); // goal object | 'new'
  const [goalForm, setGoalForm] = useState({ title: '', detail: '', targetDate: '', progressPct: '0', status: 'PENDING' });
  const [feedbackModal, setFeedbackModal] = useState(false);
  const [fbForm, setFbForm] = useState({ rating: 0, comment: '' });
  // `Alert.prompt` is iOS-only in React Native, so it silently did nothing on
  // Android — the two places it was used (end a mentorship, cancel a booking) got
  // a modal instead rather than a button that appears dead on half the platforms.
  const [reasonModal, setReasonModal] = useState(null); // { kind, sessionId? }
  const [reasonText, setReasonText] = useState('');

  const load = useCallback(
    async (showSpinner = true) => {
      try {
        if (showSpinner) setLoading(true);
        setError(null);
        const p = await alumniApi.mentorshipPair(pairId);
        setPair(p);
        // Progress and feedback have their own routes; fetched together so the
        // goals tab never renders an empty bar before its real number arrives.
        const [pr, fb] = await Promise.all([
          alumniApi.mentorshipProgress(pairId).catch(() => null),
          alumniApi.mentorshipFeedback(pairId).catch(() => null),
        ]);
        setProgress(pr);
        setFeedback(fb);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [pairId],
  );

  useEffect(() => {
    load();
  }, [load]);

  const ctx = pair?.viewerContext ?? {};

  // ── Actions ──
  const completePair = () => {
    setReasonText('');
    setReasonModal({ kind: 'complete' });
  };

  const confirmReason = async () => {
    try {
      setBusy(true);
      if (reasonModal.kind === 'complete') {
        await alumniApi.completePair(pair.id, reasonText.trim() || undefined);
        Alert.alert('Ended', 'The mentorship is closed. Open goals were marked dropped.');
        onChanged?.();
      } else {
        await alumniApi.cancelMentorshipSession(reasonModal.sessionId, reasonText.trim() || undefined);
      }
      setReasonModal(null);
      load(false);
    } catch (e) {
      Alert.alert('Cannot save', e.message);
    } finally {
      setBusy(false);
    }
  };

  const submitSession = async () => {
    const planned = sessionModal === 'schedule';
    if (!sessionForm.sessionDate) {
      Alert.alert('Pick a date', 'A session needs a date.');
      return;
    }
    try {
      setBusy(true);
      await alumniApi.logMentorshipSession(pair.id, {
        sessionDate: new Date(sessionForm.sessionDate).toISOString(),
        mode: sessionForm.mode || undefined,
        durationMinutes: planned ? undefined : Number(sessionForm.durationMinutes) || undefined,
        agenda: sessionForm.agenda || undefined,
        notes: sessionForm.notes || undefined,
        outcome: planned ? undefined : sessionForm.outcome || undefined,
        planned,
      });
      setSessionModal(null);
      setSessionForm({ sessionDate: '', mode: 'VIDEO', durationMinutes: '45', agenda: '', notes: '', outcome: '' });
      Alert.alert(planned ? 'Booked' : 'Logged', planned ? 'The session is on the calendar.' : 'The session is now part of the record.');
      load(false);
    } catch (e) {
      Alert.alert('Cannot save session', e.message);
    } finally {
      setBusy(false);
    }
  };

  const cancelSession = (session) => {
    setReasonText('');
    setReasonModal({ kind: 'cancel', sessionId: session.id });
  };

  const openGoal = (goal) => {
    if (goal === 'new') {
      setGoalForm({ title: '', detail: '', targetDate: '', progressPct: '0', status: 'PENDING' });
    } else {
      setGoalForm({
        title: goal.title,
        detail: goal.detail ?? '',
        targetDate: goal.targetDate ? new Date(goal.targetDate).toISOString().slice(0, 10) : '',
        progressPct: String(goal.progressPct),
        status: goal.status,
      });
    }
    setGoalModal(goal);
  };

  const submitGoal = async () => {
    if (!goalForm.title.trim()) {
      Alert.alert('Give it a title', 'A goal needs a title.');
      return;
    }
    try {
      setBusy(true);
      const payload = {
        title: goalForm.title.trim(),
        detail: goalForm.detail.trim() || undefined,
        targetDate: goalForm.targetDate || undefined,
        progressPct: Number(goalForm.progressPct) || 0,
        status: goalForm.status,
      };
      if (goalModal === 'new') {
        await alumniApi.createMentorshipGoal(pair.id, payload);
      } else {
        await alumniApi.updateMentorshipGoal(goalModal.id, payload);
      }
      setGoalModal(null);
      load(false);
    } catch (e) {
      Alert.alert('Cannot save goal', e.message);
    } finally {
      setBusy(false);
    }
  };

  const deleteGoal = (goal) => {
    Alert.alert('Remove this goal?', goal.title, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);
            await alumniApi.deleteMentorshipGoal(goal.id);
            load(false);
          } catch (e) {
            Alert.alert('Cannot remove', e.message);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const submitFeedback = async () => {
    if (fbForm.rating === 0) {
      Alert.alert('Give a rating', 'Pick a star rating first.');
      return;
    }
    try {
      setBusy(true);
      // Which column is written depends on which side of the pair the viewer is.
      // The server decides; sending the right one keeps the screen honest.
      const payload = ctx.isMentee
        ? { mentorRating: fbForm.rating, comment: fbForm.comment.trim() || undefined }
        : { menteeRating: fbForm.rating, comment: fbForm.comment.trim() || undefined };
      await alumniApi.submitMentorshipFeedback(pair.id, payload);
      setFeedbackModal(false);
      setFbForm({ rating: 0, comment: '' });
      Alert.alert('Thank you', 'Your review was recorded.');
      load(false);
    } catch (e) {
      Alert.alert('Cannot submit review', e.message);
    } finally {
      setBusy(false);
    }
  };

  const deleteFeedback = () => {
    Alert.alert('Remove your review?', 'You can write it again later.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);
            await alumniApi.deleteMentorshipFeedback(pair.id);
            load(false);
          } catch (e) {
            Alert.alert('Cannot remove', e.message);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  if (loading && !pair) {
    return (
      <View style={styles.container}>
        <Header navigation={navigation} title="Mentorship" />
        <View style={{ paddingHorizontal: 16 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </View>
    );
  }

  if (error || !pair) {
    return (
      <View style={styles.container}>
        <Header navigation={navigation} title="Mentorship" />
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={38} color={theme.colors.textMuted} />
          <Text style={styles.errorText}>{error ?? 'Not found'}</Text>
          <TouchableOpacity style={styles.retry} onPress={() => load()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const st = pairStatusMeta(pair.status);
  const myReview = (feedback?.reviews ?? []).find((r) => r.isMine);
  const otherName = ctx.isMentee ? pair.mentor.name : pair.mentee.name;

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title={ctx.isMentee ? 'My mentorship' : ctx.isMentor ? 'Mentoring' : 'Mentorship'} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(false);
            }}
          />
        }
      >
        <LinearGradient colors={[st.color + '18', st.color + '05']} style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Avatar name={otherName} size={48} />
            <View style={{ flex: 1, marginLeft: 11 }}>
              <Text style={styles.heroName} numberOfLines={1}>
                {otherName}
              </Text>
              <Text style={styles.heroMeta} numberOfLines={1}>
                {ctx.isMentee ? 'Mentor' : 'Mentee'}
                {pair.mentor.batch ? ` · batch ${pair.mentor.batch}` : ''}
                {pair.mentor.role ? ` · ${pair.mentor.role}` : ''}
              </Text>
              <View style={styles.heroChipRow}>
                <StatusChip status={pair.status} />
                <View style={styles.fieldChip}>
                  <Text style={styles.fieldChipText}>{pair.field}</Text>
                </View>
                {pair.mentee.kind === 'STUDENT' ? (
                  <View style={[styles.fieldChip, { backgroundColor: '#fdf2f8' }]}>
                    <Text style={[styles.fieldChipText, { color: '#be185d' }]}>student mentee</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {pair.matchScore != null ? (
            <View style={styles.matchBox}>
              <Ionicons name="sparkles" size={13} color="#059669" />
              <View style={{ flex: 1, marginLeft: 6 }}>
                <Text style={styles.matchScore}>{pair.matchScore}% match</Text>
                {pair.matchReasons.length > 0 ? (
                  <Text style={styles.matchReasons}>{pair.matchReasons.join(' · ')}</Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {pair.status === 'DECLINED' && pair.declinedReason ? (
            <View style={styles.declinedBox}>
              <Ionicons name="information-circle-outline" size={13} color="#dc2626" />
              <Text style={styles.declinedText}>{pair.declinedReason}</Text>
            </View>
          ) : null}

          {pair.status === 'COMPLETED' ? (
            <Text style={styles.completedText}>
              Completed {pair.completedAt ? fmtDate(pair.completedAt) : ''}
            </Text>
          ) : null}
        </LinearGradient>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <TouchableOpacity key={t.id} style={[styles.tab, active && styles.tabActive]} onPress={() => setTab(t.id)}>
                <Ionicons name={t.icon} size={12} color={active ? '#fff' : theme.colors.textMuted} />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {tab === 'overview' ? (
          <>
            <View style={styles.statCard}>
              <StatCell value={String(pair.sessions.held)} label="sessions held" />
              <StatCell value={fmtDuration(pair.sessions.totalMinutes) ?? '—'} label="time together" />
              <StatCell value={pair.goals.percent != null ? `${pair.goals.percent}%` : '—'} label="goals done" />
            </View>

            {pair.goals.percent !== null ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Goal progress</Text>
                <ProgressBar percent={progress?.averageProgress ?? pair.goals.percent} color="#059669" />
                <Text style={styles.cardHint}>
                  {pair.goals.achieved}/{pair.goals.total} achieved
                  {progress?.goals?.overdue ? ` · ${progress.goals.overdue} overdue` : ''}
                  {progress?.goals?.dropped ? ` · ${progress.goals.dropped} dropped` : ''}
                </Text>
              </View>
            ) : null}

            {pair.nextSessionAt ? (
              <View style={styles.nextBox}>
                <Ionicons name="calendar" size={15} color="#2563eb" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.nextLabel}>Next session</Text>
                  <Text style={styles.nextValue}>{fmtDateTime(pair.nextSessionAt)}</Text>
                </View>
              </View>
            ) : pair.status === 'ACTIVE' ? (
              <View style={[styles.nextBox, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
                <Ionicons name="alert-circle-outline" size={15} color="#d97706" />
                <Text style={[styles.nextLabel, { color: '#92400e', flex: 1 }]}>No session scheduled — book one so this does not quietly stall</Text>
              </View>
            ) : null}

            {/* Actions, gated server-side */}
            {ctx.canLogSession || ctx.canScheduleSession || ctx.canEndPair || ctx.canRemind ? (
              <View style={styles.actionRow}>
                {ctx.canScheduleSession ? (
                  <ActionBtn icon="calendar-outline" label="Book session" onPress={() => setSessionModal('schedule')} color="#2563eb" />
                ) : null}
                {ctx.canLogSession ? (
                  <ActionBtn icon="create-outline" label="Log a session" onPress={() => setSessionModal('log')} color="#059669" />
                ) : null}
                {ctx.canRemind ? (
                  <ActionBtn
                    icon="notifications-outline"
                    label="Remind"
                    color="#0891b2"
                    onPress={async () => {
                      try {
                        setBusy(true);
                        await alumniApi.remindMentor(pair.id);
                        Alert.alert('Reminder sent');
                      } catch (e) {
                        Alert.alert('Cannot send reminder', e.message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  />
                ) : null}
                {ctx.canEndPair ? (
                  <ActionBtn icon="flag-outline" label="End mentorship" onPress={completePair} color="#dc2626" />
                ) : null}
              </View>
            ) : null}

            {!ctx.isParticipant && !ctx.isOffice ? (
              <Text style={styles.viewerNote}>You are viewing this mentorship as the office. Participants alone can log sessions and leave reviews.</Text>
            ) : null}
          </>
        ) : null}

        {tab === 'sessions' ? (
          <>
            {ctx.canScheduleSession || ctx.canLogSession ? (
              <View style={styles.actionRow}>
                {ctx.canScheduleSession ? (
                  <ActionBtn icon="calendar-outline" label="Book" onPress={() => setSessionModal('schedule')} color="#2563eb" />
                ) : null}
                {ctx.canLogSession ? (
                  <ActionBtn icon="create-outline" label="Log one that happened" onPress={() => setSessionModal('log')} color="#059669" />
                ) : null}
              </View>
            ) : null}

            {(pair.sessions.log ?? []).map((s) => (
              <SessionCard key={s.id} session={{ ...s, loggedByName: s.planned ? 'you' : null }} onCancel={ctx.canScheduleSession ? () => cancelSession(s) : undefined} />
            ))}

            {(pair.sessions.log ?? []).length === 0 ? (
              <NoData
                icon="calendar-outline"
                title="No sessions yet"
                subtitle="A mentorship with no logged sessions is indistinguishable from one that never happened."
              />
            ) : null}
          </>
        ) : null}

        {tab === 'goals' ? (
          <>
            {ctx.canManageGoals ? (
              <ActionBtn icon="add" label="Add a goal" onPress={() => openGoal('new')} color="#2563eb" />
            ) : null}

            {(pair.goals ?? []).map((g) => (
              <GoalCard key={g.id} goal={g} onEdit={ctx.canManageGoals ? () => openGoal(g) : undefined} onDelete={ctx.canManageGoals ? () => deleteGoal(g) : undefined} />
            ))}

            {(pair.goals ?? []).length === 0 ? (
              <NoData
                icon="flag-outline"
                title="No goals set"
                subtitle="One sentence each — “get my CV reviewed”, “ship one side project”. That is what progress is measured against."
              />
            ) : null}
          </>
        ) : null}

        {tab === 'feedback' ? (
          <>
            {feedback ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Ratings</Text>
                <RatingRow label="Of the mentor" rating={feedback.ofMentor} count={feedback.count} />
                <RatingRow label="Of the mentee" rating={feedback.ofMentee} />
              </View>
            ) : null}

            {feedback && feedback.mayReadComments === false ? (
              <Text style={styles.viewerNote}>
                Ratings are visible to the office; the written comments are between the two of them.
              </Text>
            ) : null}

            {(feedback?.reviews ?? [])
              .filter((r) => r.comment)
              .map((r) => (
                <View key={r.id} style={styles.card}>
                  <View style={styles.reviewHead}>
                    <Text style={styles.reviewAuthor}>{r.authorName}{r.isMine ? ' (you)' : ''}</Text>
                    <Text style={styles.reviewDate}>{fmtDate(r.createdAt)}</Text>
                  </View>
                  {r.mentorRating ? <Text style={styles.reviewMeta}>Rated the mentor {r.mentorRating}/5</Text> : null}
                  {r.menteeRating ? <Text style={styles.reviewMeta}>Rated the mentee {r.menteeRating}/5</Text> : null}
                  <Text style={styles.reviewComment}>“{r.comment}”</Text>
                </View>
              ))}

            {/* Only a participant on an active pair may review. The server enforces
                this too, but showing a button that is guaranteed to fail is worse
                than showing none. */}
            {ctx.canLeaveFeedback ? (
              myReview ? (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Your review</Text>
                  <StarPicker value={myReview.mentorRating ?? myReview.menteeRating} size={18} />
                  {myReview.comment ? <Text style={styles.reviewComment}>“{myReview.comment}”</Text> : null}
                  <View style={styles.actionRow}>
                    <ActionBtn icon="create-outline" label="Edit" color="#2563eb" onPress={() => {
                      setFbForm({ rating: myReview.mentorRating ?? myReview.menteeRating ?? 0, comment: myReview.comment ?? '' });
                      setFeedbackModal(true);
                    }} />
                    <ActionBtn icon="trash-outline" label="Remove" color="#dc2626" onPress={deleteFeedback} />
                  </View>
                </View>
              ) : (
                <ActionBtn icon="star-outline" label="Review this mentorship" color="#f59e0b" onPress={() => setFeedbackModal(true)} />
              )
            ) : pair.status !== 'ACTIVE' ? (
              <Text style={styles.viewerNote}>Reviews close when the mentorship ends.</Text>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {/* ── Session modal ── */}
      <Modal visible={!!sessionModal} transparent animationType="slide" onRequestClose={() => setSessionModal(null)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.modalCard} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{sessionModal === 'schedule' ? 'Book a session' : 'Log a session that happened'}</Text>
              <TouchableOpacity onPress={() => setSessionModal(null)}>
                <Ionicons name="close" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Date & time</Text>
            <TextInput
              style={styles.field}
              value={sessionForm.sessionDate}
              onChangeText={(t) => setSessionForm((s) => ({ ...s, sessionDate: t }))}
              placeholder="2026-03-14T17:00"
              placeholderTextColor="#94a3b8"
            />
            <Text style={styles.fieldHint}>Format: YYYY-MM-DDTHH:mm. A booking must be in the future.</Text>

            <Text style={styles.fieldLabel}>Mode</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {SESSION_MODES.map((m) => (
                <TouchableOpacity key={m.id} style={[styles.chip, sessionForm.mode === m.id && styles.chipActive]} onPress={() => setSessionForm((s) => ({ ...s, mode: m.id }))}>
                  <Ionicons name={m.icon} size={11} color={sessionForm.mode === m.id ? '#fff' : theme.colors.textMuted} />
                  <Text style={[styles.chipText, sessionForm.mode === m.id && styles.chipTextActive]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {sessionModal === 'log' ? (
              <>
                <Text style={styles.fieldLabel}>Duration (minutes)</Text>
                <TextInput
                  style={styles.field}
                  value={sessionForm.durationMinutes}
                  onChangeText={(t) => setSessionForm((s) => ({ ...s, durationMinutes: t }))}
                  keyboardType="number-pad"
                  placeholder="45"
                  placeholderTextColor="#94a3b8"
                />
              </>
            ) : (
              <>
                <Text style={styles.fieldLabel}>Agenda</Text>
                <TextInput
                  style={[styles.field, styles.fieldMultiline]}
                  value={sessionForm.agenda}
                  onChangeText={(t) => setSessionForm((s) => ({ ...s, agenda: t }))}
                  multiline
                  textAlignVertical="top"
                  placeholder="What will you cover?"
                  placeholderTextColor="#94a3b8"
                />
              </>
            )}

            <Text style={styles.fieldLabel}>{sessionModal === 'log' ? 'Outcome' : 'Notes'}</Text>
            <TextInput
              style={[styles.field, styles.fieldMultiline]}
              value={sessionModal === 'log' ? sessionForm.outcome : sessionForm.notes}
              onChangeText={(t) => setSessionForm((s) => (sessionModal === 'log' ? { ...s, outcome: t } : { ...s, notes: t }))}
              multiline
              textAlignVertical="top"
              placeholder={sessionModal === 'log' ? 'What changed?' : 'Anything to remember'}
              placeholderTextColor="#94a3b8"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setSessionModal(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={submitSession} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalSubmitText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Goal modal ── */}
      <Modal visible={!!goalModal} transparent animationType="slide" onRequestClose={() => setGoalModal(null)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.modalCard} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{goalModal === 'new' ? 'New goal' : 'Update goal'}</Text>
              <TouchableOpacity onPress={() => setGoalModal(null)}>
                <Ionicons name="close" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Goal</Text>
            <TextInput
              style={styles.field}
              value={goalForm.title}
              onChangeText={(t) => setGoalForm((s) => ({ ...s, title: t }))}
              placeholder="Get my CV reviewed by someone senior"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.fieldLabel}>Detail (optional)</Text>
            <TextInput
              style={[styles.field, styles.fieldMultiline]}
              value={goalForm.detail}
              onChangeText={(t) => setGoalForm((s) => ({ ...s, detail: t }))}
              multiline
              textAlignVertical="top"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.fieldLabel}>Target date (optional)</Text>
            <TextInput
              style={styles.field}
              value={goalForm.targetDate}
              onChangeText={(t) => setGoalForm((s) => ({ ...s, targetDate: t }))}
              placeholder="2026-06-30"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.fieldLabel}>Progress — {goalForm.progressPct}%</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {[0, 25, 50, 75, 100].map((p) => (
                <TouchableOpacity key={p} style={[styles.chip, Number(goalForm.progressPct) === p && styles.chipActive]} onPress={() => setGoalForm((s) => ({ ...s, progressPct: String(p) }))}>
                  <Text style={[styles.chipText, Number(goalForm.progressPct) === p && styles.chipTextActive]}>{p}%</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {['PENDING', 'IN_PROGRESS', 'ACHIEVED', 'DROPPED'].map((s) => (
                <TouchableOpacity key={s} style={[styles.chip, goalForm.status === s && styles.chipActive]} onPress={() => setGoalForm((f) => ({ ...f, status: s, progressPct: s === 'ACHIEVED' ? '100' : f.progressPct }))}>
                  <Text style={[styles.chipText, goalForm.status === s && styles.chipTextActive]}>{s.replace('_', ' ').toLowerCase()}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setGoalModal(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={submitGoal} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalSubmitText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Feedback modal ── */}
      <Modal visible={feedbackModal} transparent animationType="slide" onRequestClose={() => setFeedbackModal(false)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.modalCard} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Review this mentorship</Text>
              <TouchableOpacity onPress={() => setFeedbackModal(false)}>
                <Ionicons name="close" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>
              {ctx.isMentee ? 'How was your mentor?' : 'How was your mentee?'}
            </Text>
            <StarPicker value={fbForm.rating} onChange={(n) => setFbForm((s) => ({ ...s, rating: n }))} size={32} />

            <Text style={styles.fieldLabel}>Comment (optional)</Text>
            <TextInput
              style={[styles.field, styles.fieldMultiline]}
              value={fbForm.comment}
              onChangeText={(t) => setFbForm((s) => ({ ...s, comment: t }))}
              multiline
              textAlignVertical="top"
              placeholder="Concrete beats kind-but-vague."
              placeholderTextColor="#94a3b8"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setFeedbackModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSubmit, { backgroundColor: '#f59e0b' }]} onPress={submitFeedback} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalSubmitText}>Submit</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Reason modal (end a mentorship / cancel a booking) ── */}
      <Modal visible={!!reasonModal} transparent animationType="slide" onRequestClose={() => setReasonModal(null)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.modalCard} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{reasonModal?.kind === 'complete' ? 'End this mentorship' : 'Cancel this booking'}</Text>
              <TouchableOpacity onPress={() => setReasonModal(null)}>
                <Ionicons name="close" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldHint}>
              {reasonModal?.kind === 'complete'
                ? 'Goals still open are marked dropped, not deleted — the record survives.'
                : 'The booking stays in the session log, marked cancelled.'}
            </Text>

            <TextInput
              style={[styles.field, styles.fieldMultiline]}
              value={reasonText}
              onChangeText={setReasonText}
              multiline
              textAlignVertical="top"
              placeholder="Optional, but it is what the other person reads"
              placeholderTextColor="#94a3b8"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setReasonModal(null)}>
                <Text style={styles.modalCancelText}>Go back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmit, { backgroundColor: reasonModal?.kind === 'complete' ? '#dc2626' : '#2563eb' }]}
                onPress={confirmReason}
                disabled={busy}
              >
                {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalSubmitText}>Confirm</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function Header({ navigation, title }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backBtn} onPress={navigation.goBack}>
        <Ionicons name="arrow-back" size={18} color={theme.colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

function StatCell({ value, label }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionBtn({ icon, label, onPress, color = '#2563eb' }) {
  return (
    <TouchableOpacity style={[styles.actionBtn, { borderColor: color + '55', backgroundColor: color + '0f' }]} onPress={onPress}>
      <Ionicons name={icon} size={13} color={color} />
      <Text style={[styles.actionBtnText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  errorText: { marginTop: 10, fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center' },
  retry: { marginTop: 14, backgroundColor: '#0891b2', paddingHorizontal: 22, paddingVertical: 9, borderRadius: 10, alignSelf: 'center' },
  retryText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 12 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, gap: 12 },
  backBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  headerTitle: { fontSize: 17, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  list: { padding: 16, paddingBottom: 28 },

  heroCard: { borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: '#fff' },
  heroTop: { flexDirection: 'row', alignItems: 'center' },
  heroName: { fontSize: 15, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  heroMeta: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },
  heroChipRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5, marginTop: 7 },
  fieldChip: { backgroundColor: '#eff6ff', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  fieldChipText: { fontSize: 9, fontFamily: 'Manrope-Bold', color: '#2563eb' },
  matchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ecfdf5', borderRadius: 10, padding: 10, marginTop: 11 },
  matchScore: { fontSize: 11, fontFamily: 'Manrope-Bold', color: '#065f46' },
  matchReasons: { fontSize: 9, fontFamily: 'Manrope-Medium', color: '#047857', marginTop: 2, lineHeight: 14 },
  declinedBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fef2f2', borderRadius: 10, padding: 10, marginTop: 11 },
  declinedText: { flex: 1, fontSize: 10, fontFamily: 'Manrope-Medium', color: '#991b1b', lineHeight: 15 },
  completedText: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 11 },

  tabRow: { gap: 6, marginBottom: 12 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderRadius: 13, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 11, paddingVertical: 7 },
  tabActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  tabText: { fontSize: 11, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  tabTextActive: { color: '#fff' },

  statCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, padding: 12, marginBottom: 10 },
  statCell: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 16, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  statLabel: { fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, padding: 14, marginBottom: 10 },
  cardTitle: { fontSize: 12, fontFamily: 'Manrope-Bold', color: theme.colors.text, marginBottom: 8 },
  cardHint: { fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 6 },
  nextBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', borderRadius: 12, borderWidth: 1, borderColor: '#bfdbfe', padding: 12, marginBottom: 10 },
  nextLabel: { fontSize: 10, fontFamily: 'Manrope-Bold', color: '#1d4ed8' },
  nextValue: { fontSize: 11, fontFamily: 'Manrope-SemiBold', color: theme.colors.text, marginTop: 1 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 9 },
  actionBtnText: { fontSize: 11, fontFamily: 'Manrope-Bold' },
  viewerNote: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, lineHeight: 15, marginTop: 4, marginBottom: 10 },

  reviewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewAuthor: { fontSize: 11, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  reviewDate: { fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },
  reviewMeta: { fontSize: 9, fontFamily: 'Manrope-SemiBold', color: '#b45309', marginTop: 3 },
  reviewComment: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.text, lineHeight: 16, marginTop: 6, fontStyle: 'italic' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 15, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  fieldLabel: { fontSize: 10, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5, marginTop: 12 },
  field: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.text },
  fieldMultiline: { minHeight: 76 },
  fieldHint: { fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 4 },
  chipRow: { gap: 6, alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 13, paddingHorizontal: 10, paddingVertical: 6 },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 10, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  chipTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  modalCancel: { flex: 1, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted },
  modalSubmit: { flex: 1, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  modalSubmitText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
});
